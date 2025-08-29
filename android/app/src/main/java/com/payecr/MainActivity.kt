package com.payecr

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    private var kioskModeEnabled = true // Set to true for POS kiosk mode

    override fun getMainComponentName(): String = "payecr"

    override fun onCreate(savedInstanceState: Bundle?) {
        // Passing null avoids restoring old fragments, needed for RN splash handling
        super.onCreate(null)
        
        // Enable sticky immersive full screen mode
        enableImmersiveMode()
        
        // Start kiosk mode if enabled
        if (kioskModeEnabled) {
            startKioskMode()
        }
        
        // Handle USB device attachment if app was started by USB intent
        handleUSBIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        if (intent != null) {
            handleUSBIntent(intent)
        }
    }

    override fun onResume() {
        super.onResume()
        // Ensure immersive mode is active when app resumes
        enableImmersiveMode()
        
        // Re-enable kiosk mode if it was enabled
        if (kioskModeEnabled) {
            startKioskMode()
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            // Re-enable immersive mode when app regains focus
            enableImmersiveMode()
            
            val host = (application as MainApplication).reactNativeHost
            val context = host.reactInstanceManager.currentReactContext
            if (host.hasInstance() && context != null) {
                handleWindowFocus(context)
            }
        }
    }

    private fun handleUSBIntent(intent: Intent) {
        if (UsbManager.ACTION_USB_DEVICE_ATTACHED == intent.action) {
            // App was opened by USB device attachment
            // USB management is handled by ECRSerialModule
        }
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object : DefaultReactActivityDelegate(
            this,
            mainComponentName,
            DefaultNewArchitectureEntryPoint.fabricEnabled,
        ) {
            // Using the updated constructor that doesn't include the deprecated concurrentReactEnabled parameter
        }
    }

    private fun handleWindowFocus(context: com.facebook.react.bridge.ReactContext) {
        // Safe to run React-context dependent code here
        // USB device status updates are handled by ECRSerialModule
    }
    
    private fun enableImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Use modern API for Android 11+ - Sticky immersive mode
            WindowCompat.setDecorFitsSystemWindows(window, false)
            val controller = WindowInsetsControllerCompat(window, window.decorView)
            
            // Hide system bars
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.hide(WindowInsetsCompat.Type.statusBars())
            controller.hide(WindowInsetsCompat.Type.navigationBars())
            
            // Use sticky behavior - bars appear on swipe but auto-hide
            controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            
            // For Android R and above, we don't need FLAG_FULLSCREEN as the WindowInsetsController handles it
            window.addFlags(
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS
            )
            
            // Set navigation bar color to transparent to ensure it's completely hidden
            window.navigationBarColor = android.graphics.Color.TRANSPARENT
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            
        } else {
            // Use legacy API for older Android versions
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
            
            window.addFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS
            )
            
            // Set navigation bar color to transparent to ensure it's completely hidden
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                window.navigationBarColor = android.graphics.Color.TRANSPARENT
                window.statusBarColor = android.graphics.Color.TRANSPARENT
            }
        }
        
        // Add a listener to re-hide system UI immediately when it appears
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.decorView.setOnApplyWindowInsetsListener { view, insets ->
                if (insets.isVisible(WindowInsetsCompat.Type.systemBars())) {
                    WindowCompat.getInsetsController(window, window.decorView).hide(
                        WindowInsetsCompat.Type.systemBars()
                    )
                }
                view.onApplyWindowInsets(insets)
            }
        }
    }

    private fun startKioskMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                
                // Check if already in lock task mode
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (activityManager.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_LOCKED) {
                        startLockTask()
                    }
                } else {
                    // For API < 23, always try to start lock task
                    @Suppress("DEPRECATION")
                    if (!activityManager.isInLockTaskMode) {
                        startLockTask()
                    }
                }
            } catch (e: Exception) {
                // Kiosk mode requires device admin permissions or system app status
                // Silently fail if permissions not available
                android.util.Log.w("MainActivity", "Could not start kiosk mode: ${e.message}")
            }
        }
    }

    fun stopKioskMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                stopLockTask()
            } catch (e: Exception) {
                android.util.Log.w("MainActivity", "Could not stop kiosk mode: ${e.message}")
            }
        }
    }

    // Emergency exit method (can be called from React Native)
    fun exitKioskMode() {
        kioskModeEnabled = false
        stopKioskMode()
    }

    override fun onBackPressed() {
        if (kioskModeEnabled) {
            // Disable back button in kiosk mode
            return
        }
        super.onBackPressed()
    }
}
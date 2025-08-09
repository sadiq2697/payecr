package com.payecr

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "payecr"

    override fun onCreate(savedInstanceState: Bundle?) {
        // Passing null avoids restoring old fragments, needed for RN splash handling
        super.onCreate(null)
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(
            this,
            mainComponentName,
            DefaultNewArchitectureEntryPoint.fabricEnabled,
            DefaultNewArchitectureEntryPoint.concurrentReactEnabled
        )
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            val host = (application as MainApplication).reactNativeHost
            val context = host.reactInstanceManager.currentReactContext
            if (host.hasInstance() && context != null) {
                // Place RN context-dependent code here
            }
        }
    }
}

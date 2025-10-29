package com.payecr;

import android.app.Activity;
import android.app.Presentation;
import android.content.Context;
import android.hardware.display.DisplayManager;
import android.os.Bundle;
import android.view.Display;
import android.view.WindowManager;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactRootView;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import androidx.annotation.NonNull;

public class PresentationDisplayModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "PresentationDisplay";
    private ReactApplicationContext reactContext;
    private CustomPresentation presentation;
    private DisplayManager displayManager;

    public PresentationDisplayModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        this.displayManager = (DisplayManager) context.getSystemService(Context.DISPLAY_SERVICE);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void getDisplays(Promise promise) {
        try {
            Display[] displays = displayManager.getDisplays();
            WritableArray displaysArray = Arguments.createArray();

            for (Display display : displays) {
                WritableMap displayMap = Arguments.createMap();
                displayMap.putInt("displayId", display.getDisplayId());
                displayMap.putString("name", display.getName());
                displayMap.putInt("width", display.getMode().getPhysicalWidth());
                displayMap.putInt("height", display.getMode().getPhysicalHeight());
                displaysArray.pushMap(displayMap);
            }

            promise.resolve(displaysArray);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get displays: " + e.getMessage());
        }
    }

    @ReactMethod
    public void showOnSecondaryDisplay(int displayId, Promise promise) {
        try {
            Activity currentActivity = reactContext.getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("ERROR", "No current activity");
                return;
            }

            if (!(currentActivity instanceof ReactActivity)) {
                promise.reject("ERROR", "Current activity is not a ReactActivity");
                return;
            }

            Display[] displays = displayManager.getDisplays();
            Display secondaryDisplay = null;

            // Find the secondary display
            for (Display display : displays) {
                if (display.getDisplayId() == displayId) {
                    secondaryDisplay = display;
                    break;
                }
            }

            if (secondaryDisplay == null) {
                promise.reject("ERROR", "Secondary display not found");
                return;
            }

            // Close existing presentation if any
            if (presentation != null) {
                presentation.dismiss();
            }

            // Create and show new presentation
            presentation = new CustomPresentation(currentActivity, secondaryDisplay, reactContext, (ReactActivity) currentActivity);
            presentation.show();

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putInt("displayId", displayId);
            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("ERROR", "Failed to show on secondary display: " + e.getMessage());
        }
    }

    @ReactMethod
    public void hideSecondaryDisplay(Promise promise) {
        try {
            if (presentation != null) {
                presentation.dismiss();
                presentation = null;
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to hide secondary display: " + e.getMessage());
        }
    }

    @ReactMethod
    public void updateSecondaryDisplay(String data, Promise promise) {
        try {
            if (presentation != null) {
                presentation.updateContent(data);
                promise.resolve(true);
            } else {
                promise.reject("ERROR", "No active presentation");
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to update secondary display: " + e.getMessage());
        }
    }

    private static class CustomPresentation extends Presentation {
        private ReactRootView reactRootView;
        private ReactApplicationContext reactContext;
        private ReactActivity reactActivity;

        public CustomPresentation(Context outerContext, Display display, ReactApplicationContext reactContext, ReactActivity reactActivity) {
            super(outerContext, display);
            this.reactContext = reactContext;
            this.reactActivity = reactActivity;
        }

        @Override
        protected void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);

            // Make it fullscreen
            getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            );

            // Create React Root View for customer display
            reactRootView = new ReactRootView(getContext());

            // Set initial props
            final Bundle initialProps = new Bundle();
            initialProps.putBoolean("isCustomerDisplay", true);

            // CRITICAL: Must run on UI thread and after view is attached
            final android.os.Handler mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());

            // Set a placeholder view first
            setContentView(reactRootView);

            // Post to UI thread to initialize React Native AFTER view hierarchy is set up
            mainHandler.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (reactContext != null) {
                            ReactApplication application = (ReactApplication) reactContext.getApplicationContext();
                            ReactInstanceManager reactInstanceManager = application.getReactNativeHost().getReactInstanceManager();

                            // Only start if React Instance is ready
                            if (reactInstanceManager.hasStartedCreatingInitialContext()) {
                                reactRootView.startReactApplication(
                                    reactInstanceManager,
                                    "CustomerDisplay",
                                    initialProps
                                );
                            } else {
                                // If React isn't ready, wait for it
                                reactInstanceManager.addReactInstanceEventListener(new ReactInstanceManager.ReactInstanceEventListener() {
                                    @Override
                                    public void onReactContextInitialized(com.facebook.react.bridge.ReactContext context) {
                                        mainHandler.post(new Runnable() {
                                            @Override
                                            public void run() {
                                                reactRootView.startReactApplication(
                                                    reactInstanceManager,
                                                    "CustomerDisplay",
                                                    initialProps
                                                );
                                            }
                                        });
                                        reactInstanceManager.removeReactInstanceEventListener(this);
                                    }
                                });

                                // Trigger React context creation if not started
                                if (!reactInstanceManager.hasStartedCreatingInitialContext()) {
                                    reactInstanceManager.createReactContextInBackground();
                                }
                            }
                        }
                    } catch (Exception e) {
                        android.util.Log.e("PresentationDisplay", "Failed to start React application: " + e.getMessage(), e);
                    }
                }
            });
        }

        public void updateContent(String data) {
            // Send event to React Native to update customer display
            if (reactContext != null) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("CustomerDisplayUpdate", data);
            }
        }

        @Override
        public void onStop() {
            super.onStop();
            if (reactRootView != null) {
                reactRootView.unmountReactApplication();
            }
        }
    }
}

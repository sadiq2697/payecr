package com.payecr;

import android.util.Log;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * ECR Package for React Native
 * Provides native modules for ECR terminal communication via Serial and TCP
 */
public class ECRPackage implements ReactPackage {

    private static final String TAG = "ECRPackage";

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        try {
            Log.i(TAG, "Creating ECR native modules");
            
            return Arrays.asList(
                new ECRSerialModule(reactContext),
                new ECRTcpModule(reactContext)
            );
            
        } catch (Exception e) {
            Log.e(TAG, "Error creating ECR native modules", e);
            // Return empty list to prevent app crash
            return Collections.emptyList();
        }
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        // No custom view managers needed for ECR functionality
        return Collections.emptyList();
    }
}
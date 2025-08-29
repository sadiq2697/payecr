package com.payecr;

import android.content.Context;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.hoho.android.usbserial.driver.UsbSerialDriver;
import com.hoho.android.usbserial.driver.UsbSerialPort;
import com.hoho.android.usbserial.driver.UsbSerialProber;
import com.hoho.android.usbserial.util.SerialInputOutputManager;
import com.facebook.react.bridge.LifecycleEventListener; // Import LifecycleEventListener

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.ArrayList;
import java.util.Set;
import java.util.HashSet;

import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

// Implement LifecycleEventListener
public class ECRSerialModule extends ReactContextBaseJavaModule implements SerialInputOutputManager.Listener, LifecycleEventListener {

    private static final String TAG = "ECRSerial";
    private static final String MODULE_NAME = "ECRSerial";
    private static final int READ_TIMEOUT = 1000;
    private static final int WRITE_TIMEOUT = 1000;
    private static final String PREFS_NAME = "ECRUSBDevices";
    private static final String DEVICES_KEY = "saved_devices";

    private UsbSerialPort serialPort;
    private SerialInputOutputManager usbIoManager;
    private final AtomicBoolean isConnected = new AtomicBoolean(false);
    private final StringBuilder receivedData = new StringBuilder();
    private final Object dataLock = new Object();
    private ExecutorService executorService;
    
    // USB Device Management - TODO: Implement when needed

    public ECRSerialModule(ReactApplicationContext reactContext) {
        super(reactContext);
        executorService = Executors.newSingleThreadExecutor();
        // Register this module as a LifecycleEventListener
        getReactApplicationContext().addLifecycleEventListener(this);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void getAvailablePorts(Promise promise) {
        try {
            UsbManager manager = getUsbManager();
            if (manager == null) {
                promise.reject("NO_USB_MANAGER", "USB Manager not available");
                return;
            }

            List<UsbSerialDriver> drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager);

            WritableMap result = Arguments.createMap();
            result.putInt("count", drivers.size());
            result.putString("message", drivers.isEmpty() ? "No USB serial devices found" :
                    drivers.size() + " USB serial device(s) found");

            if (!drivers.isEmpty()) {
                StringBuilder deviceInfo = new StringBuilder();
                for (int i = 0; i < drivers.size(); i++) {
                    UsbSerialDriver driver = drivers.get(i);
                    deviceInfo.append("Device ").append(i + 1).append(": ")
                            .append(driver.getDevice().getProductName())
                            .append(" (VID:").append(String.format("%04X", driver.getDevice().getVendorId()))
                            .append(" PID:").append(String.format("%04X", driver.getDevice().getProductId()))
                            .append(")");
                    if (i < drivers.size() - 1) deviceInfo.append(", ");
                }
                result.putString("devices", deviceInfo.toString());
            }

            promise.resolve(result);
        } catch (Exception e) {
            logAndReject(promise, "GET_PORTS_ERROR", "Error getting available ports", e);
        }
    }

    @ReactMethod
    public void openSerial(ReadableMap config, Promise promise) {
        executorService.execute(() -> {
            try {
                if (isConnected.get()) {
                    closeSerial(null);
                }

                UsbManager manager = getUsbManager();
                if (manager == null) {
                    promise.reject("NO_USB_MANAGER", "USB Manager not available");
                    return;
                }

                List<UsbSerialDriver> drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager);

                if (drivers.isEmpty()) {
                    promise.reject("NO_DEVICE", "No USB serial devices found");
                    return;
                }

                UsbSerialDriver driver = drivers.get(0);
                UsbDeviceConnection connection = manager.openDevice(driver.getDevice());

                if (connection == null) {
                    promise.reject("CONNECTION_FAILED", "Failed to open USB device connection. Check USB permissions.");
                    return;
                }

                List<UsbSerialPort> ports = driver.getPorts();
                if (ports.isEmpty()) {
                    connection.close();
                    promise.reject("NO_PORTS", "No serial ports available on device");
                    return;
                }

                serialPort = ports.get(0);
                serialPort.open(connection);

                int baudRate = getConfigInt(config, "baudRate", 9600);
                int dataBits = getConfigInt(config, "dataBits", 8);
                int stopBits = mapStopBits(getConfigInt(config, "stopBits", 1));
                int parity = mapParity(getConfigInt(config, "parity", 0));

                serialPort.setParameters(baudRate, dataBits, stopBits, parity);
                
                Thread.sleep(100);

                usbIoManager = new SerialInputOutputManager(serialPort, this);
                Executors.newSingleThreadExecutor().submit(usbIoManager);

                isConnected.set(true);
                
                synchronized (dataLock) {
                    receivedData.setLength(0);
                }

                Log.i(TAG, String.format("Serial connection opened: %d baud, %d data bits, %d stop bits, parity %d", 
                        baudRate, dataBits, stopBits, parity));

                promise.resolve(successResult("Serial connection opened successfully"));

            } catch (IOException e) {
                logAndReject(promise, "OPEN_ERROR", "Error opening serial connection", e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logAndReject(promise, "OPEN_ERROR", "Connection interrupted", e);
            } catch (Exception e) {
                logAndReject(promise, "OPEN_ERROR", "Unexpected error opening serial connection", e);
            }
        });
    }

    @ReactMethod
    public void closeSerial(Promise promise) {
        executorService.execute(() -> {
            try {
                isConnected.set(false);

                if (usbIoManager != null) {
                    usbIoManager.stop();
                    usbIoManager = null;
                }

                if (serialPort != null) {
                    try {
                        serialPort.close();
                    } catch (IOException e) {
                        Log.w(TAG, "Error closing serial port", e);
                    }
                    serialPort = null;
                }

                synchronized (dataLock) {
                    receivedData.setLength(0);
                }

                Log.i(TAG, "Serial connection closed");

                if (promise != null) {
                    promise.resolve(successResult("Serial connection closed"));
                }

            } catch (Exception e) {
                logAndReject(promise, "CLOSE_ERROR", "Error closing serial connection", e);
            }
        });
    }

    @ReactMethod
    public void writeData(String data, Promise promise) {
        if (!isConnected.get() || serialPort == null) {
            promise.reject("NOT_CONNECTED", "Serial port is not connected");
            return;
        }

        executorService.execute(() -> {
            try {
                byte[] bytes = data.getBytes(StandardCharsets.ISO_8859_1);
                
                serialPort.write(bytes, WRITE_TIMEOUT);
                
                Thread.sleep(10);

                Log.d(TAG, String.format("Written %d bytes: %s", bytes.length, bytesToHex(bytes)));

                WritableMap result = successResult("Data written successfully");
                result.putInt("bytesWritten", bytes.length);
                result.putString("hexData", bytesToHex(bytes));
                promise.resolve(result);

            } catch (IOException e) {
                logAndReject(promise, "WRITE_ERROR", "Error writing data", e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logAndReject(promise, "WRITE_ERROR", "Write operation interrupted", e);
            } catch (Exception e) {
                logAndReject(promise, "WRITE_ERROR", "Unexpected error writing data", e);
            }
        });
    }

    @ReactMethod
    public void readData(Promise promise) {
        if (!isConnected.get()) {
            promise.reject("NOT_CONNECTED", "Serial port is not connected");
            return;
        }

        try {
            String data;
            synchronized (dataLock) {
                data = receivedData.toString();
                receivedData.setLength(0);
            }

            WritableMap result = successResult("Data read successfully");
            result.putString("data", data);
            result.putInt("length", data.length());
            
            if (!data.isEmpty()) {
                result.putString("hexData", stringToHex(data));
                Log.d(TAG, String.format("Read %d bytes: %s", data.length(), stringToHex(data)));
            }
            
            promise.resolve(result);

        } catch (Exception e) {
            logAndReject(promise, "READ_ERROR", "Error reading data", e);
        }
    }

    @ReactMethod
    public void isConnected(Promise promise) {
        try {
            boolean connected = isConnected.get() && serialPort != null;
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("connected", connected);
            result.putString("status", connected ? "Connected and ready" : "Not connected");
            
            promise.resolve(result);
        } catch (Exception e) {
            logAndReject(promise, "STATUS_ERROR", "Error checking connection status", e);
        }
    }

    @ReactMethod
    public void flushBuffers(Promise promise) {
        if (!isConnected.get()) {
            promise.reject("NOT_CONNECTED", "Serial port is not connected");
            return;
        }

        try {
            synchronized (dataLock) {
                receivedData.setLength(0);
            }

            if (serialPort != null) {
                try {
                    serialPort.purgeHwBuffers(true, true);
                } catch (IOException e) {
                    Log.w(TAG, "Could not purge hardware buffers", e);
                }
            }

            promise.resolve(successResult("Buffers flushed"));

        } catch (Exception e) {
            logAndReject(promise, "FLUSH_ERROR", "Error flushing buffers", e);
        }
    }

    @Override
    public void onNewData(byte[] data) {
        try {
            String receivedString = new String(data, StandardCharsets.ISO_8859_1);
            
            synchronized (dataLock) {
                receivedData.append(receivedString);
                
                if (receivedData.length() > 10000) {
                    Log.w(TAG, "Receive buffer overflow, clearing old data");
                    receivedData.delete(0, receivedData.length() - 5000);
                }
            }

            Log.d(TAG, String.format("Received %d bytes: %s", data.length, bytesToHex(data)));

        } catch (Exception e) {
            Log.e(TAG, "Error processing received data", e);
        }
    }

    @Override
    public void onRunError(Exception e) {
        Log.e(TAG, "Serial communication error", e);
        isConnected.set(false);
        
        try {
            if (serialPort != null) {
                serialPort.close();
                serialPort = null;
            }
        } catch (IOException ioException) {
            Log.w(TAG, "Error closing port after run error", ioException);
        }
    }

    private UsbManager getUsbManager() {
        return (UsbManager) getReactApplicationContext().getSystemService(Context.USB_SERVICE);
    }

    private int getConfigInt(ReadableMap config, String key, int defaultValue) {
        return config.hasKey(key) ? config.getInt(key) : defaultValue;
    }

    private int mapStopBits(int stopBits) {
        switch (stopBits) {
            case 1: return UsbSerialPort.STOPBITS_1;
            case 2: return UsbSerialPort.STOPBITS_2;
            default: 
                Log.w(TAG, "Invalid stop bits value: " + stopBits + ", using 1");
                return UsbSerialPort.STOPBITS_1;
        }
    }

    private int mapParity(int parity) {
        switch (parity) {
            case 0: return UsbSerialPort.PARITY_NONE;
            case 1: return UsbSerialPort.PARITY_ODD;
            case 2: return UsbSerialPort.PARITY_EVEN;
            default:
                Log.w(TAG, "Invalid parity value: " + parity + ", using NONE");
                return UsbSerialPort.PARITY_NONE;
        }
    }

    private WritableMap successResult(String message) {
        WritableMap result = Arguments.createMap();
        result.putBoolean("success", true);
        result.putString("message", message);
        result.putLong("timestamp", System.currentTimeMillis());
        return result;
    }

    private void logAndReject(Promise promise, String code, String logMsg, Exception e) {
        Log.e(TAG, logMsg, e);
        if (promise != null) {
            promise.reject(code, e.getMessage());
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02X ", b));
        }
        return result.toString().trim();
    }

    private String stringToHex(String str) {
        return bytesToHex(str.getBytes(StandardCharsets.ISO_8859_1));
    }

    // ===== USB Device Persistence Helper Methods =====
    
    private SharedPreferences getUSBDevicePrefs() {
        return getReactApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private JSONArray loadSavedDevicesJSON() {
        SharedPreferences prefs = getUSBDevicePrefs();
        String json = prefs.getString(DEVICES_KEY, "[]");
        
        try {
            return new JSONArray(json);
        } catch (Exception e) {
            Log.w(TAG, "Error parsing saved devices JSON, returning empty array", e);
            return new JSONArray();
        }
    }

    private void saveSavedDevicesJSON(JSONArray devices) {
        SharedPreferences prefs = getUSBDevicePrefs();
        prefs.edit().putString(DEVICES_KEY, devices.toString()).apply();
    }

    private boolean isDeviceOnline(String deviceId) {
        try {
            UsbManager manager = getUsbManager();
            if (manager == null) return false;
            
            List<UsbSerialDriver> drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager);
            for (UsbSerialDriver driver : drivers) {
                if (driver.getDevice().getDeviceName().equals(deviceId)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean hasDevicePermission(String deviceId) {
        try {
            UsbManager manager = getUsbManager();
            if (manager == null) return false;
            
            List<UsbSerialDriver> drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager);
            for (UsbSerialDriver driver : drivers) {
                if (driver.getDevice().getDeviceName().equals(deviceId)) {
                    return manager.hasPermission(driver.getDevice());
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }
    
    // ===== USB Device Management Methods =====
    
    @ReactMethod
    public void scanForUSBDevices(Promise promise) {
        try {
            UsbManager manager = getUsbManager();
            if (manager == null) {
                promise.reject("NO_USB_MANAGER", "USB Manager not available");
                return;
            }

            List<UsbSerialDriver> drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager);
            WritableArray deviceArray = Arguments.createArray();

            for (int i = 0; i < drivers.size(); i++) {
                UsbSerialDriver driver = drivers.get(i);
                UsbDevice device = driver.getDevice();
                
                WritableMap deviceMap = Arguments.createMap();
                deviceMap.putString("deviceId", device.getDeviceName());
                deviceMap.putString("deviceName", device.getDeviceName());
                deviceMap.putString("displayName", device.getProductName() != null ? device.getProductName() : "USB Serial Device");
                deviceMap.putString("vendorId", String.format("%04X", device.getVendorId()));
                deviceMap.putString("productId", String.format("%04X", device.getProductId()));
                deviceMap.putBoolean("isOnline", true);
                deviceMap.putBoolean("hasPermission", manager.hasPermission(device));
                deviceMap.putInt("portCount", driver.getPorts().size());
                
                deviceArray.pushMap(deviceMap);
            }

            promise.resolve(deviceArray);
        } catch (Exception e) {
            logAndReject(promise, "SCAN_ERROR", "Error scanning for USB devices", e);
        }
    }
    
    @ReactMethod
    public void getSavedUSBDevices(Promise promise) {
        try {
            JSONArray devices = loadSavedDevicesJSON();
            WritableArray deviceArray = Arguments.createArray();
            
            for (int i = 0; i < devices.length(); i++) {
                JSONObject device = devices.getJSONObject(i);
                WritableMap deviceMap = Arguments.createMap();
                
                String deviceId = device.getString("deviceId");
                
                deviceMap.putString("deviceId", deviceId);
                deviceMap.putString("deviceName", device.getString("deviceName"));
                deviceMap.putString("displayName", device.getString("displayName"));
                deviceMap.putString("alias", device.getString("alias"));
                deviceMap.putString("vendorId", device.getString("vendorId"));
                deviceMap.putString("productId", device.getString("productId"));
                deviceMap.putInt("baudRate", device.getInt("baudRate"));
                deviceMap.putBoolean("autoReconnect", device.getBoolean("autoReconnect"));
                deviceMap.putDouble("savedTimestamp", device.getLong("savedTimestamp"));
                
                // Check current status
                deviceMap.putBoolean("isOnline", isDeviceOnline(deviceId));
                deviceMap.putBoolean("hasPermission", hasDevicePermission(deviceId));
                
                deviceArray.pushMap(deviceMap);
            }
            
            Log.i(TAG, "Loaded " + devices.length() + " saved USB devices");
            promise.resolve(deviceArray);
            
        } catch (Exception e) {
            logAndReject(promise, "LOAD_ERROR", "Error loading saved USB devices", e);
        }
    }
    
    @ReactMethod
    public void saveUSBDevice(ReadableMap deviceMap, int baudRate, String alias, Promise promise) {
        try {
            JSONArray devices = loadSavedDevicesJSON();
            String deviceId = deviceMap.getString("deviceId");
            
            // Check if device already exists and remove it
            JSONArray updatedDevices = new JSONArray();
            for (int i = 0; i < devices.length(); i++) {
                JSONObject device = devices.getJSONObject(i);
                if (!deviceId.equals(device.getString("deviceId"))) {
                    updatedDevices.put(device);
                }
            }
            
            // Create new device entry
            JSONObject newDevice = new JSONObject();
            newDevice.put("deviceId", deviceId);
            newDevice.put("deviceName", deviceMap.getString("deviceName"));
            newDevice.put("displayName", deviceMap.hasKey("displayName") ? deviceMap.getString("displayName") : alias);
            newDevice.put("alias", alias);
            newDevice.put("vendorId", deviceMap.getString("vendorId"));
            newDevice.put("productId", deviceMap.getString("productId"));
            newDevice.put("baudRate", baudRate);
            newDevice.put("autoReconnect", true);
            newDevice.put("savedTimestamp", System.currentTimeMillis());
            
            updatedDevices.put(newDevice);
            saveSavedDevicesJSON(updatedDevices);
            
            Log.i(TAG, "USB device saved: " + alias + " (" + deviceId + ")");
            promise.resolve(successResult("Device '" + alias + "' saved successfully"));
            
        } catch (Exception e) {
            logAndReject(promise, "SAVE_ERROR", "Error saving USB device", e);
        }
    }
    
    @ReactMethod 
    public void removeUSBDevice(String deviceId, Promise promise) {
        try {
            JSONArray devices = loadSavedDevicesJSON();
            JSONArray updatedDevices = new JSONArray();
            boolean removed = false;
            
            for (int i = 0; i < devices.length(); i++) {
                JSONObject device = devices.getJSONObject(i);
                if (!deviceId.equals(device.getString("deviceId"))) {
                    updatedDevices.put(device);
                } else {
                    removed = true;
                }
            }
            
            if (removed) {
                saveSavedDevicesJSON(updatedDevices);
                Log.i(TAG, "USB device removed: " + deviceId);
                promise.resolve(successResult("Device removed successfully"));
            } else {
                promise.resolve(successResult("Device not found"));
            }
            
        } catch (Exception e) {
            logAndReject(promise, "REMOVE_ERROR", "Error removing USB device", e);
        }
    }
    
    @ReactMethod
    public void requestUSBPermission(String deviceId, Promise promise) {
        // Stub implementation - will be implemented with USB permission management
        promise.resolve(successResult("Permission request sent (stub)"));
    }
    
    @ReactMethod
    public void connectToUSBDevice(String deviceId, Promise promise) {
        executorService.execute(() -> {
            try {
                if (isConnected.get()) {
                    closeSerial(null);
                }

                UsbManager manager = getUsbManager();
                if (manager == null) {
                    promise.reject("NO_USB_MANAGER", "USB Manager not available");
                    return;
                }

                List<UsbSerialDriver> drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager);
                UsbSerialDriver targetDriver = null;

                // Find the specific device by deviceId
                for (UsbSerialDriver driver : drivers) {
                    if (driver.getDevice().getDeviceName().equals(deviceId)) {
                        targetDriver = driver;
                        break;
                    }
                }

                if (targetDriver == null) {
                    promise.reject("DEVICE_NOT_FOUND", "USB device not found: " + deviceId);
                    return;
                }

                UsbDeviceConnection connection = manager.openDevice(targetDriver.getDevice());
                if (connection == null) {
                    promise.reject("CONNECTION_FAILED", "Failed to open USB device connection. Check USB permissions.");
                    return;
                }

                List<UsbSerialPort> ports = targetDriver.getPorts();
                if (ports.isEmpty()) {
                    connection.close();
                    promise.reject("NO_PORTS", "No serial ports available on device");
                    return;
                }

                serialPort = ports.get(0);
                serialPort.open(connection);

                // Use default serial configuration
                serialPort.setParameters(9600, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
                
                Thread.sleep(100);

                usbIoManager = new SerialInputOutputManager(serialPort, this);
                Executors.newSingleThreadExecutor().submit(usbIoManager);

                isConnected.set(true);
                
                synchronized (dataLock) {
                    receivedData.setLength(0);
                }

                Log.i(TAG, "Connected to USB device: " + deviceId);
                promise.resolve(successResult("Connected to USB device successfully"));

            } catch (IOException e) {
                logAndReject(promise, "CONNECT_ERROR", "Error connecting to USB device", e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logAndReject(promise, "CONNECT_ERROR", "Connection interrupted", e);
            } catch (Exception e) {
                logAndReject(promise, "CONNECT_ERROR", "Unexpected error connecting to USB device", e);
            }
        });
    }
    
    @ReactMethod
    public void toggleUSBAutoReconnect(String deviceId, boolean enabled, Promise promise) {
        try {
            JSONArray devices = loadSavedDevicesJSON();
            
            for (int i = 0; i < devices.length(); i++) {
                JSONObject device = devices.getJSONObject(i);
                if (deviceId.equals(device.getString("deviceId"))) {
                    device.put("autoReconnect", enabled);
                    break;
                }
            }
            
            saveSavedDevicesJSON(devices);
            
            Log.i(TAG, "Auto-reconnect " + (enabled ? "enabled" : "disabled") + " for device: " + deviceId);
            promise.resolve(successResult("Auto-reconnect setting updated"));
            
        } catch (Exception e) {
            logAndReject(promise, "TOGGLE_ERROR", "Error updating auto-reconnect setting", e);
        }
    }
    
    @ReactMethod
    public void refreshUSBDeviceStatus(Promise promise) {
        // Stub implementation - will be implemented with USB device monitoring
        promise.resolve(successResult("Device status refreshed (stub)"));
    }
    
    @ReactMethod
    public void getUSBDeviceStats(Promise promise) {
        // Return empty stats for now
        WritableMap statsMap = Arguments.createMap();
        statsMap.putInt("total", 0);
        statsMap.putInt("online", 0);
        statsMap.putInt("withPermission", 0);
        statsMap.putInt("autoReconnect", 0);
        promise.resolve(statsMap);
    }

    // Implementing LifecycleEventListener methods
    @Override
    public void onHostResume() {
        Log.i(TAG, "Host resumed");
        // Add any logic needed when the host activity resumes
    }

    @Override
    public void onHostPause() {
        Log.i(TAG, "Host paused");
        // Add any logic needed when the host activity pauses
    }

    @Override
    public void onHostDestroy() {
        Log.i(TAG, "Host destroying, cleaning up serial resources");
        isConnected.set(false);
        closeSerial(null); // Ensure resources are cleaned up
        
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
        }
    }
}

package com.asasiipos;

import android.app.PendingIntent;
import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
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
    private static final String ACTION_USB_PERMISSION = "com.payecr.USB_PERMISSION";

    private UsbSerialPort serialPort;
    private SerialInputOutputManager usbIoManager;
    private final AtomicBoolean isConnected = new AtomicBoolean(false);
    private final StringBuilder receivedData = new StringBuilder();
    private final Object dataLock = new Object();
    private ExecutorService executorService;
    private BroadcastReceiver usbReceiver;
    private Promise pendingPermissionPromise;
    private BroadcastReceiver usbPermissionReceiver;
    
    // USB Device Management

    public ECRSerialModule(ReactApplicationContext reactContext) {
        super(reactContext);
        executorService = Executors.newSingleThreadExecutor();
        // Register this module as a LifecycleEventListener
        getReactApplicationContext().addLifecycleEventListener(this);
        
        // Set up USB device broadcast receiver
        setupUSBReceiver();
        // Set up USB permission receiver
        setupUSBPermissionReceiver();
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
                
                // Validate bytes before writing
                if (bytes.length == 0) {
                    promise.resolve(successResult("No data to write"));
                    return;
                }
                
                serialPort.write(bytes, WRITE_TIMEOUT);
                
                Thread.sleep(10);

                Log.d(TAG, String.format("Written %d bytes: %s", bytes.length, bytesToHex(bytes)));

                WritableMap result = successResult("Data written successfully");
                result.putInt("bytesWritten", bytes.length);
                result.putString("hexData", bytesToHex(bytes));
                promise.resolve(result);

            } catch (IOException e) {
                isConnected.set(false);
                String errorMsg = "USB write error: " + e.getMessage();
                if (e.getMessage() != null && e.getMessage().contains("UsbEndpoint")) {
                    errorMsg = "USB endpoint error during write - device may be disconnected: " + e.getMessage();
                } else if (e.getMessage() != null && e.getMessage().contains("dead")) {
                    errorMsg = "USB connection is dead - device disconnected: " + e.getMessage();
                }
                logAndReject(promise, "USB_WRITE_ERROR", errorMsg, e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logAndReject(promise, "WRITE_INTERRUPTED", "Write operation interrupted", e);
            } catch (Exception e) {
                isConnected.set(false);
                String errorMsg = "Unexpected write error: " + e.getMessage();
                if (e.getMessage() != null && e.getMessage().contains("UsbEndpoint")) {
                    errorMsg = "USB endpoint null pointer during write - device disconnected: " + e.getMessage();
                }
                logAndReject(promise, "WRITE_ERROR", errorMsg, e);
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
        
        synchronized (this) {
            try {
                if (serialPort != null) {
                    serialPort.close();
                    serialPort = null;
                }
            } catch (IOException ioException) {
                Log.w(TAG, "Error closing port after run error", ioException);
            }
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
        try {
            Log.i(TAG, "Requesting USB permission for device: " + deviceId);
            
            UsbManager manager = getUsbManager();
            if (manager == null) {
                promise.reject("NO_USB_MANAGER", "USB Manager not available");
                return;
            }
            
            // Find the device by ID
            UsbDevice targetDevice = null;
            Map<String, UsbDevice> deviceList = manager.getDeviceList();
            
            for (Map.Entry<String, UsbDevice> entry : deviceList.entrySet()) {
                if (entry.getValue().getDeviceName().equals(deviceId)) {
                    targetDevice = entry.getValue();
                    break;
                }
            }
            
            if (targetDevice == null) {
                promise.reject("DEVICE_NOT_FOUND", "Device not found: " + deviceId);
                return;
            }
            
            // Check if permission already granted
            if (manager.hasPermission(targetDevice)) {
                Log.i(TAG, "USB permission already granted for: " + deviceId);
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("message", "USB permission already granted");
                result.putString("deviceName", targetDevice.getDeviceName());
                promise.resolve(result);
                return;
            }
            
            // Store promise for callback
            pendingPermissionPromise = promise;
            
            // Set up permission receiver if not already done
            if (usbPermissionReceiver == null) {
                setupUSBPermissionReceiver();
            }
            
            // Create pending intent for permission request
            ReactApplicationContext context = getReactApplicationContext();
            PendingIntent permissionIntent = PendingIntent.getBroadcast(
                context, 
                0, 
                new Intent(ACTION_USB_PERMISSION), 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Request permission
            Log.i(TAG, "Requesting USB permission via system dialog...");
            manager.requestPermission(targetDevice, permissionIntent);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to request USB permission", e);
            promise.reject("PERMISSION_REQUEST_FAILED", "Permission request failed: " + e.getMessage());
        }
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
                Log.i(TAG, "Found " + drivers.size() + " USB serial drivers");
                
                UsbSerialDriver targetDriver = null;

                // Find the specific device by deviceId
                for (UsbSerialDriver driver : drivers) {
                    String driverDeviceName = driver.getDevice().getDeviceName();
                    Log.i(TAG, "Checking driver device: " + driverDeviceName + " against target: " + deviceId);
                    if (driverDeviceName.equals(deviceId)) {
                        targetDriver = driver;
                        Log.i(TAG, "Found matching USB serial driver: " + driverDeviceName);
                        break;
                    }
                }

                if (targetDriver == null) {
                    StringBuilder availableDevices = new StringBuilder("Available devices: ");
                    for (UsbSerialDriver driver : drivers) {
                        availableDevices.append(driver.getDevice().getDeviceName()).append(", ");
                    }
                    String errorMsg = "USB device not found: " + deviceId + ". " + availableDevices.toString() + "Device may have been disconnected or requires different driver.";
                    promise.reject("DEVICE_NOT_FOUND", errorMsg);
                    return;
                }

                UsbDevice usbDevice = targetDriver.getDevice();
                
                // Log device information for debugging
                Log.i(TAG, "Target device info:");
                Log.i(TAG, "  Vendor ID: 0x" + Integer.toHexString(usbDevice.getVendorId()));
                Log.i(TAG, "  Product ID: 0x" + Integer.toHexString(usbDevice.getProductId()));
                Log.i(TAG, "  Device name: " + usbDevice.getDeviceName());
                Log.i(TAG, "  Manufacturer: " + (usbDevice.getManufacturerName() != null ? usbDevice.getManufacturerName() : "Unknown"));
                Log.i(TAG, "  Product: " + (usbDevice.getProductName() != null ? usbDevice.getProductName() : "Unknown"));
                Log.i(TAG, "  Driver class: " + targetDriver.getClass().getSimpleName());
                Log.i(TAG, "  Interface count: " + usbDevice.getInterfaceCount());
                
                // Validate USB permission before attempting connection
                if (!manager.hasPermission(usbDevice)) {
                    Log.w(TAG, "USB permission not granted for device: " + deviceId + ". Requesting permission...");
                    // Try requesting permission (this should be handled at a higher level)
                    promise.reject("PERMISSION_DENIED", "USB permission not granted for device: " + deviceId + ". Please grant USB permission in device settings or reconnect device.");
                    return;
                }

                // Validate device interfaces before opening connection
                if (usbDevice.getInterfaceCount() == 0) {
                    promise.reject("NO_INTERFACES", "USB device has no interfaces: " + deviceId);
                    return;
                }

                UsbDeviceConnection connection = manager.openDevice(usbDevice);
                if (connection == null) {
                    promise.reject("CONNECTION_FAILED", "Failed to open USB device connection. Device may be in use or disconnected: " + deviceId);
                    return;
                }

                // Validate connection file descriptor
                if (connection.getFileDescriptor() < 0) {
                    connection.close();
                    promise.reject("INVALID_CONNECTION", "Invalid USB connection file descriptor");
                    return;
                }

                List<UsbSerialPort> ports = targetDriver.getPorts();
                if (ports.isEmpty()) {
                    connection.close();
                    promise.reject("NO_PORTS", "No serial ports available on device: " + deviceId);
                    return;
                }

                serialPort = ports.get(0);
                
                // Additional validation before opening port
                try {
                    serialPort.open(connection);
                    Log.i(TAG, "Serial port opened successfully");
                } catch (IOException e) {
                    connection.close();
                    if (e.getMessage() != null && e.getMessage().contains("UsbEndpoint")) {
                        promise.reject("ENDPOINT_ERROR", "USB endpoint error - device may be malfunctioning or incompatible: " + e.getMessage());
                    } else {
                        promise.reject("PORT_OPEN_FAILED", "Failed to open serial port: " + e.getMessage());
                    }
                    return;
                }

                // Set parameters with error handling and different baud rate attempts
                boolean parametersSet = false;
                int[] baudRates = {9600, 115200, 38400, 19200, 57600}; // Try multiple baud rates
                
                for (int baudRate : baudRates) {
                    try {
                        serialPort.setParameters(baudRate, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
                        Log.i(TAG, "Serial parameters set: " + baudRate + " baud, 8N1");
                        parametersSet = true;
                        break;
                    } catch (IOException e) {
                        Log.w(TAG, "Failed to set parameters with baud rate " + baudRate + ": " + e.getMessage());
                        if (baudRate == baudRates[baudRates.length - 1]) {
                            // This was the last attempt
                            serialPort.close();
                            connection.close();
                            promise.reject("PARAMETER_ERROR", "Failed to set serial parameters with any baud rate. Last error: " + e.getMessage());
                            return;
                        }
                    }
                }
                
                if (!parametersSet) {
                    serialPort.close();
                    connection.close();
                    promise.reject("PARAMETER_ERROR", "Could not set serial parameters with any supported baud rate");
                    return;
                }
                
                // Wait for device to stabilize
                Thread.sleep(200);

                // Test the connection with a small operation
                synchronized (this) {
                    try {
                        if (serialPort != null) {
                            serialPort.purgeHwBuffers(true, true);
                            Log.i(TAG, "USB hardware buffers purged successfully");
                        } else {
                            Log.w(TAG, "Serial port became null, connection may have failed during setup");
                            promise.reject("PORT_NULL_ERROR", "Serial port became null during connection setup");
                            return;
                        }
                    } catch (IOException e) {
                        Log.w(TAG, "Could not purge hardware buffers (non-fatal): " + e.getMessage());
                    }

                    if (serialPort != null) {
                        usbIoManager = new SerialInputOutputManager(serialPort, this);
                        Executors.newSingleThreadExecutor().submit(usbIoManager);
                    } else {
                        Log.w(TAG, "Serial port is null, cannot create SerialInputOutputManager");
                        promise.reject("PORT_NULL_ERROR", "Serial port is null, cannot create I/O manager");
                        return;
                    }
                }

                isConnected.set(true);
                
                synchronized (dataLock) {
                    receivedData.setLength(0);
                }

                Log.i(TAG, "Successfully connected to USB device: " + deviceId + 
                      " (VID:" + String.format("%04X", usbDevice.getVendorId()) +
                      " PID:" + String.format("%04X", usbDevice.getProductId()) + ")");
                
                WritableMap result = successResult("Connected to USB device successfully");
                result.putString("deviceId", deviceId);
                result.putString("vendorId", String.format("%04X", usbDevice.getVendorId()));
                result.putString("productId", String.format("%04X", usbDevice.getProductId()));
                promise.resolve(result);

            } catch (IOException e) {
                String errorMsg = "USB I/O error: " + e.getMessage();
                if (e.getMessage() != null && e.getMessage().contains("UsbEndpoint")) {
                    errorMsg = "USB endpoint error - device hardware incompatible or malfunctioning: " + e.getMessage();
                }
                logAndReject(promise, "USB_IO_ERROR", errorMsg, e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logAndReject(promise, "CONNECT_INTERRUPTED", "Connection interrupted", e);
            } catch (SecurityException e) {
                logAndReject(promise, "PERMISSION_ERROR", "USB permission denied", e);
            } catch (Exception e) {
                String errorMsg = "Unexpected USB connection error: " + e.getMessage();
                if (e.getMessage() != null && e.getMessage().contains("UsbEndpoint")) {
                    errorMsg = "USB endpoint null pointer - device may be disconnected or driver incompatible: " + e.getMessage();
                }
                logAndReject(promise, "CONNECT_ERROR", errorMsg, e);
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
        try {
            // Force refresh the USB device list by re-scanning
            UsbManager manager = getUsbManager();
            if (manager == null) {
                promise.reject("NO_USB_MANAGER", "USB Manager not available");
                return;
            }
            
            // Get fresh list of all USB devices
            List<UsbSerialDriver> drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager);
            
            // Log current USB devices for debugging
            Log.i(TAG, "USB Device Status Refresh - Found " + drivers.size() + " USB serial devices");
            for (UsbSerialDriver driver : drivers) {
                UsbDevice device = driver.getDevice();
                Log.i(TAG, "USB Device: " + device.getDeviceName() + 
                      " VID:" + String.format("%04X", device.getVendorId()) + 
                      " PID:" + String.format("%04X", device.getProductId()));
            }
            
            // Update the device status in saved devices
            JSONArray savedDevices = loadSavedDevicesJSON();
            boolean hasChanges = false;
            
            for (int i = 0; i < savedDevices.length(); i++) {
                JSONObject savedDevice = savedDevices.getJSONObject(i);
                String deviceId = savedDevice.getString("deviceId");
                boolean wasOnline = savedDevice.optBoolean("isOnline", false);
                boolean isNowOnline = isDeviceOnline(deviceId);
                
                if (wasOnline != isNowOnline) {
                    Log.i(TAG, "Device status changed: " + deviceId + " " + 
                          (wasOnline ? "online" : "offline") + " -> " + 
                          (isNowOnline ? "online" : "offline"));
                    hasChanges = true;
                }
            }
            
            if (hasChanges) {
                Log.i(TAG, "USB device status changes detected");
            }
            
            promise.resolve(successResult("Device status refreshed - found " + drivers.size() + " devices"));
            
        } catch (Exception e) {
            Log.e(TAG, "Error refreshing USB device status", e);
            promise.reject("REFRESH_ERROR", "Failed to refresh device status: " + e.getMessage());
        }
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
        
        // Clean up serial connection and resources
        closeSerial(null);
        
        // Clean up USB permission receiver
        if (usbPermissionReceiver != null) {
            try {
                getReactApplicationContext().unregisterReceiver(usbPermissionReceiver);
                Log.i(TAG, "USB permission receiver unregistered");
            } catch (Exception e) {
                Log.w(TAG, "Error unregistering USB permission receiver", e);
            }
            usbPermissionReceiver = null;
        }
        
        // Clean up USB device receiver
        if (usbReceiver != null) {
            try {
                getReactApplicationContext().unregisterReceiver(usbReceiver);
                Log.i(TAG, "USB device receiver unregistered");
            } catch (Exception e) {
                Log.w(TAG, "Error unregistering USB device receiver", e);
            }
            usbReceiver = null;
        }
        
        // Shutdown executor service with proper timeout
        if (executorService != null && !executorService.isShutdown()) {
            try {
                executorService.shutdown();
                // Wait a bit for current tasks to finish
                if (!executorService.awaitTermination(1000, java.util.concurrent.TimeUnit.MILLISECONDS)) {
                    Log.w(TAG, "Executor did not terminate gracefully, forcing shutdown");
                    executorService.shutdownNow();
                }
                Log.i(TAG, "Executor service shut down");
            } catch (Exception e) {
                Log.w(TAG, "Error shutting down executor service", e);
                executorService.shutdownNow();
            }
        }
        
        // Clear pending permission promise
        pendingPermissionPromise = null;
        
        // Remove lifecycle listener to prevent memory leaks
        try {
            getReactApplicationContext().removeLifecycleEventListener(this);
        } catch (Exception e) {
            Log.w(TAG, "Error removing lifecycle listener", e);
        }
    }
    
    /**
     * Set up USB device broadcast receiver for real-time attach/detach detection
     */
    private void setupUSBReceiver() {
        usbReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                
                if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (device != null) {
                        Log.i(TAG, "USB device attached: " + device.getDeviceName());
                        emitUSBDeviceEvent("onUSBDeviceAttached", device);
                    }
                } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (device != null) {
                        Log.i(TAG, "USB device detached: " + device.getDeviceName());
                        emitUSBDeviceEvent("onUSBDeviceDetached", device);
                    }
                }
            }
        };
        
        // Register the receiver for USB attach/detach events
        IntentFilter filter = new IntentFilter();
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        
        try {
            getReactApplicationContext().registerReceiver(usbReceiver, filter);
            Log.i(TAG, "USB broadcast receiver registered");
        } catch (Exception e) {
            Log.e(TAG, "Failed to register USB broadcast receiver", e);
        }
    }
    
    /**
     * Set up USB permission broadcast receiver
     */
    private void setupUSBPermissionReceiver() {
        usbPermissionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (ACTION_USB_PERMISSION.equals(action)) {
                    synchronized (this) {
                        UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                        
                        if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                            Log.i(TAG, "USB permission granted for device: " + device.getDeviceName());
                            if (pendingPermissionPromise != null) {
                                WritableMap result = Arguments.createMap();
                                result.putBoolean("success", true);
                                result.putString("message", "USB permission granted");
                                result.putString("deviceName", device.getDeviceName());
                                pendingPermissionPromise.resolve(result);
                                pendingPermissionPromise = null;
                            }
                        } else {
                            Log.w(TAG, "USB permission denied for device: " + device.getDeviceName());
                            if (pendingPermissionPromise != null) {
                                WritableMap result = Arguments.createMap();
                                result.putBoolean("success", false);
                                result.putString("message", "USB permission denied by user");
                                result.putString("deviceName", device.getDeviceName());
                                pendingPermissionPromise.resolve(result);
                                pendingPermissionPromise = null;
                            }
                        }
                    }
                }
            }
        };
        
        // Register the permission receiver
        try {
            IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
            getReactApplicationContext().registerReceiver(usbPermissionReceiver, filter);
            Log.i(TAG, "USB permission receiver registered");
        } catch (Exception e) {
            Log.e(TAG, "Failed to register USB permission receiver", e);
        }
    }
    
    /**
     * Emit USB device event to JavaScript
     */
    private void emitUSBDeviceEvent(String eventName, UsbDevice device) {
        try {
            WritableMap deviceMap = Arguments.createMap();
            deviceMap.putString("deviceName", device.getDeviceName());
            deviceMap.putString("deviceId", device.getDeviceName());
            deviceMap.putString("vendorId", String.format("%04X", device.getVendorId()));
            deviceMap.putString("productId", String.format("%04X", device.getProductId()));
            deviceMap.putString("productName", device.getProductName());
            deviceMap.putString("manufacturerName", device.getManufacturerName());
            
            getReactApplicationContext()
                .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, deviceMap);
                
            Log.d(TAG, "Emitted USB event: " + eventName + " for device: " + device.getDeviceName());
        } catch (Exception e) {
            Log.e(TAG, "Error emitting USB device event", e);
        }
    }
}

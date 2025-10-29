package com.asasiipos;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.os.Handler;
import android.os.Looper;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import net.posprinter.IConnectListener;
import net.posprinter.IDeviceConnection;
import net.posprinter.POSConnect;
import net.posprinter.POSPrinter;
import net.posprinter.POSConst;
import net.posprinter.ZPLPrinter;
import net.posprinter.ZPLConst;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ESCPrinterModule extends ReactContextBaseJavaModule implements LifecycleEventListener {

    private static final String MODULE_NAME = "ESCPrinterModule";
    private ReactApplicationContext reactContext;
    private IDeviceConnection currentConnection;
    private POSPrinter posPrinter;
    private ZPLPrinter zplPrinter;
    private Handler mainHandler;
    private SharedPreferences devicePrefs;
    private String currentDeviceKey;

    public ESCPrinterModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.mainHandler = new Handler(Looper.getMainLooper());
        this.devicePrefs = reactContext.getSharedPreferences("saved_devices", Context.MODE_PRIVATE);
        
        // Initialize POS printer library
        POSConnect.init(reactContext);
        
        // Register lifecycle listener for proper cleanup
        reactContext.addLifecycleEventListener(this);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private final IConnectListener connectListener = new IConnectListener() {
        @Override
        public void onStatus(int code, String connInfo, String message) {
            android.util.Log.d("ESCPrinter", "Connection status - Code: " + code + ", ConnInfo: " + connInfo + ", Message: " + message);
            
            WritableMap params = Arguments.createMap();
            params.putInt("code", code);
            params.putString("connInfo", connInfo != null ? connInfo : "");
            params.putString("message", message != null ? message : "");

            switch (code) {
                case POSConnect.CONNECT_SUCCESS:
                    android.util.Log.d("ESCPrinter", "Printer connected successfully");
                    posPrinter = new POSPrinter(currentConnection);
                    zplPrinter = new ZPLPrinter(currentConnection);
                    
                    // Save device info if it's a new connection
                    if (currentDeviceKey != null) {
                        saveDeviceConnection(currentDeviceKey);
                    }
                    
                    // Enhance connection info
                    params.putString("status", "connected");
                    params.putString("deviceType", "USB");
                    if (connInfo != null && !connInfo.isEmpty()) {
                        params.putString("finalDevicePath", connInfo);
                    }
                    
                    sendEvent("onPrinterConnected", params);
                    break;
                    
                case POSConnect.CONNECT_FAIL:
                    android.util.Log.e("ESCPrinter", "Printer connection failed - Message: " + message);
                    params.putString("status", "failed");
                    params.putString("error", message != null ? message : "Connection failed");
                    sendEvent("onPrinterError", params);
                    break;
                    
                case POSConnect.CONNECT_INTERRUPT:
                    android.util.Log.d("ESCPrinter", "Printer connection interrupted");
                    params.putString("status", "disconnected");
                    sendEvent("onPrinterDisconnected", params);
                    break;
                    
                case POSConnect.SEND_FAIL:
                    android.util.Log.e("ESCPrinter", "Printer send failed - Message: " + message);
                    params.putString("status", "send_failed");
                    params.putString("error", message != null ? message : "Send operation failed");
                    sendEvent("onPrinterError", params);
                    break;
                    
                case POSConnect.USB_DETACHED:
                    android.util.Log.d("ESCPrinter", "USB printer detached");
                    params.putString("status", "detached");
                    sendEvent("onPrinterDisconnected", params);
                    break;
                    
                case POSConnect.USB_ATTACHED:
                    android.util.Log.d("ESCPrinter", "USB printer attached");
                    params.putString("status", "attached");
                    // Device attached, could auto-connect here if needed
                    break;
                    
                default:
                    android.util.Log.w("ESCPrinter", "Unknown connection status code: " + code);
                    break;
            }
        }
    };

    private void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    @ReactMethod
    public void connectUSB(String devicePath, Promise promise) {
        try {
            // Validate device path
            if (devicePath == null || devicePath.trim().isEmpty()) {
                WritableMap error = Arguments.createMap();
                error.putBoolean("success", false);
                error.putString("error", "Device path cannot be empty");
                promise.reject("USB_CONNECT_ERROR", "Device path cannot be empty");
                return;
            }

            // Get available USB devices
            List<String> availableDevices = POSConnect.getUsbDevices(reactContext);
            android.util.Log.d("ESCPrinter", "Available USB devices: " + availableDevices.toString());
            android.util.Log.d("ESCPrinter", "Attempting to connect to: " + devicePath);
            
            if (availableDevices.isEmpty()) {
                WritableMap error = Arguments.createMap();
                error.putBoolean("success", false);
                error.putString("error", "No USB devices available");
                promise.reject("USB_CONNECT_ERROR", "No USB devices available");
                return;
            }

            // Check if the specified device path is available
            boolean deviceFound = false;
            String actualDevicePath = devicePath;
            
            for (String device : availableDevices) {
                if (device.equals(devicePath)) {
                    deviceFound = true;
                    actualDevicePath = device;
                    break;
                }
            }

            if (!deviceFound) {
                // Try to find a matching device if the path format is different
                for (String device : availableDevices) {
                    // Check if this could be the same device with different path format
                    if ((devicePath.contains("/dev/bus/usb/") && device.contains("/dev/usb/")) ||
                        (devicePath.contains("/dev/usb/") && device.contains("/dev/bus/usb/"))) {
                        android.util.Log.d("ESCPrinter", "Found potential device match: " + device + " for requested: " + devicePath);
                        deviceFound = true;
                        actualDevicePath = device;
                        break;
                    }
                }
            }

            if (!deviceFound) {
                WritableMap error = Arguments.createMap();
                error.putBoolean("success", false);
                error.putString("error", "USB device '" + devicePath + "' not found. Available devices: " + String.join(", ", availableDevices));
                promise.reject("USB_CONNECT_ERROR", "Device not found: " + devicePath);
                return;
            }

            android.util.Log.d("ESCPrinter", "Using device path for connection: " + actualDevicePath);

            // Extract device information from USB system
            UsbManager usbManager = (UsbManager) reactContext.getSystemService(Context.USB_SERVICE);
            UsbDevice usbDevice = null;
            String vendorId = "", productId = "", serialNumber = "", deviceName = "USB Printer";
            
            if (usbManager != null) {
                for (UsbDevice device : usbManager.getDeviceList().values()) {
                    if (actualDevicePath.contains(device.getDeviceName()) || 
                        actualDevicePath.contains(String.valueOf(device.getDeviceId()))) {
                        usbDevice = device;
                        vendorId = String.valueOf(device.getVendorId());
                        productId = String.valueOf(device.getProductId());
                        serialNumber = device.getSerialNumber();
                        deviceName = device.getProductName() != null ? device.getProductName() : 
                                   device.getManufacturerName() != null ? device.getManufacturerName() : "USB Printer";
                        break;
                    }
                }
            }

            // Generate device key for storage
            currentDeviceKey = generateDeviceKey(vendorId, productId, serialNumber);
            
            // Save device info
            saveDeviceInfo(actualDevicePath, vendorId, productId, serialNumber, deviceName, "USB");

            if (currentConnection != null) {
                currentConnection.close();
            }
            
            currentConnection = POSConnect.createDevice(POSConnect.DEVICE_TYPE_USB);
            currentConnection.connect(actualDevicePath, connectListener);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "USB connection initiated");
            result.putString("requestedPath", devicePath);
            result.putString("actualPath", actualDevicePath);
            result.putString("vendorId", vendorId);
            result.putString("productId", productId);
            result.putString("serialNumber", serialNumber != null ? serialNumber : "");
            result.putString("deviceName", deviceName);
            promise.resolve(result);
            
        } catch (Exception e) {
            android.util.Log.e("ESCPrinter", "USB connection failed", e);
            WritableMap error = Arguments.createMap();
            error.putBoolean("success", false);
            error.putString("error", "USB connection failed: " + e.getMessage());
            promise.reject("USB_CONNECT_ERROR", error);
        }
    }

    @ReactMethod
    public void connectNetwork(String ipAddress, int port, Promise promise) {
        try {
            if (currentConnection != null) {
                currentConnection.close();
            }
            
            currentConnection = POSConnect.createDevice(POSConnect.DEVICE_TYPE_ETHERNET);
            String address = port == 9100 ? ipAddress : ipAddress + ":" + port;
            currentConnection.connect(address, connectListener);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Network connection initiated");
            promise.resolve(result);
            
        } catch (Exception e) {
            WritableMap error = Arguments.createMap();
            error.putBoolean("success", false);
            error.putString("error", e.getMessage());
            promise.reject("NETWORK_CONNECT_ERROR", error);
        }
    }

    @ReactMethod
    public void connectBluetooth(String macAddress, Promise promise) {
        try {
            if (currentConnection != null) {
                currentConnection.close();
            }
            
            currentConnection = POSConnect.createDevice(POSConnect.DEVICE_TYPE_BLUETOOTH);
            currentConnection.connect(macAddress, connectListener);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Bluetooth connection initiated");
            promise.resolve(result);
            
        } catch (Exception e) {
            WritableMap error = Arguments.createMap();
            error.putBoolean("success", false);
            error.putString("error", e.getMessage());
            promise.reject("BLUETOOTH_CONNECT_ERROR", error);
        }
    }

    @ReactMethod
    public void connectSerial(String port, String baudRate, Promise promise) {
        try {
            if (currentConnection != null) {
                currentConnection.close();
            }
            
            currentConnection = POSConnect.createDevice(POSConnect.DEVICE_TYPE_SERIAL);
            String connectionString = port + "," + baudRate;
            currentConnection.connect(connectionString, connectListener);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Serial connection initiated");
            promise.resolve(result);
            
        } catch (Exception e) {
            WritableMap error = Arguments.createMap();
            error.putBoolean("success", false);
            error.putString("error", e.getMessage());
            promise.reject("SERIAL_CONNECT_ERROR", error);
        }
    }

    @ReactMethod
    public void disconnect(Promise promise) {
        try {
            if (currentConnection != null) {
                currentConnection.close();
                currentConnection = null;
                posPrinter = null;
                zplPrinter = null;
            }
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Disconnected successfully");
            promise.resolve(result);
            
        } catch (Exception e) {
            WritableMap error = Arguments.createMap();
            error.putBoolean("success", false);
            error.putString("error", e.getMessage());
            promise.reject("DISCONNECT_ERROR", error);
        }
    }

    @ReactMethod
    public void getUSBDevices(Promise promise) {
        try {
            List<String> devices = POSConnect.getUsbDevices(reactContext);
            WritableArray deviceArray = Arguments.createArray();
            
            for (String device : devices) {
                WritableMap deviceMap = Arguments.createMap();
                
                // Extract device information
                String displayName = device;
                String devicePath = device;
                
                // Check if this is a bus format path and provide both formats
                if (device.contains("/dev/bus/usb/")) {
                    displayName = "USB Printer (" + device + ")";
                    // The library might map bus paths to lp/ip paths internally
                } else if (device.contains("/dev/usb/")) {
                    displayName = "USB Printer (" + device + ")";
                }
                
                deviceMap.putString("name", displayName);
                deviceMap.putString("path", devicePath);
                deviceMap.putString("originalPath", device); // Keep original path for reference
                deviceMap.putString("type", "USB");
                
                // Add additional device info if available
                if (device.contains("lp")) {
                    deviceMap.putString("printerType", "Line Printer");
                } else if (device.contains("ip")) {
                    deviceMap.putString("printerType", "Impact Printer");
                } else {
                    deviceMap.putString("printerType", "USB Printer");
                }
                
                deviceArray.pushMap(deviceMap);
            }
            
            promise.resolve(deviceArray);
            
        } catch (Exception e) {
            promise.reject("USB_DEVICES_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getBluetoothDevices(Promise promise) {
        try {
            BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
            WritableArray deviceArray = Arguments.createArray();
            
            if (bluetoothAdapter != null && bluetoothAdapter.isEnabled()) {
                Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
                
                for (BluetoothDevice device : pairedDevices) {
                    WritableMap deviceMap = Arguments.createMap();
                    deviceMap.putString("name", device.getName());
                    deviceMap.putString("address", device.getAddress());
                    deviceMap.putString("type", "Bluetooth");
                    deviceArray.pushMap(deviceMap);
                }
            }
            
            promise.resolve(deviceArray);
            
        } catch (Exception e) {
            promise.reject("BLUETOOTH_DEVICES_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void printReceipt(ReadableMap receiptData, Promise promise) {
        if (zplPrinter == null) {
            promise.reject("PRINTER_ERROR", "Printer not connected");
            return;
        }

        try {
            // Build receipt using ZPL commands
            zplPrinter.addStart();
            
            // Header
            if (receiptData.hasKey("header")) {
                ReadableMap header = receiptData.getMap("header");
                if (header.hasKey("storeName")) {
                    zplPrinter.addText(10, 10, ZPLConst.FNT_E, ZPLConst.ROTATION_0, 28, 15, header.getString("storeName"));
                }
                if (header.hasKey("address")) {
                    zplPrinter.addText(10, 50, ZPLConst.FNT_B, ZPLConst.ROTATION_0, 11, 7, header.getString("address"));
                }
            }
            
            // Transaction details
            if (receiptData.hasKey("transaction")) {
                ReadableMap transaction = receiptData.getMap("transaction");
                int yPos = 100;
                
                if (transaction.hasKey("type")) {
                    zplPrinter.addText(10, yPos, ZPLConst.FNT_D, ZPLConst.ROTATION_0, 18, 10, "Type: " + transaction.getString("type"));
                    yPos += 25;
                }
                
                if (transaction.hasKey("amount")) {
                    zplPrinter.addText(10, yPos, ZPLConst.FNT_D, ZPLConst.ROTATION_0, 18, 10, "Amount: " + transaction.getString("amount"));
                    yPos += 25;
                }
                
                if (transaction.hasKey("id")) {
                    zplPrinter.addText(10, yPos, ZPLConst.FNT_C, ZPLConst.ROTATION_0, 18, 10, "ID: " + transaction.getString("id"));
                    yPos += 25;
                }
            }
            
            // Payment details
            if (receiptData.hasKey("payment")) {
                ReadableMap payment = receiptData.getMap("payment");
                int yPos = 200;
                
                if (payment.hasKey("method")) {
                    zplPrinter.addText(10, yPos, ZPLConst.FNT_C, ZPLConst.ROTATION_0, 18, 10, "Payment: " + payment.getString("method"));
                    yPos += 25;
                }
                
                if (payment.hasKey("cardNumber")) {
                    zplPrinter.addText(10, yPos, ZPLConst.FNT_C, ZPLConst.ROTATION_0, 18, 10, "Card: " + payment.getString("cardNumber"));
                    yPos += 25;
                }
            }
            
            // Footer
            if (receiptData.hasKey("footer")) {
                ReadableMap footer = receiptData.getMap("footer");
                if (footer.hasKey("thankYou")) {
                    zplPrinter.addText(10, 300, ZPLConst.FNT_D, ZPLConst.ROTATION_0, 18, 10, footer.getString("thankYou"));
                }
            }
            
            zplPrinter.addEnd();
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Receipt printed successfully");
            promise.resolve(result);
            
            // Send print complete event
            sendEvent("onPrintComplete", result);
            
        } catch (Exception e) {
            WritableMap error = Arguments.createMap();
            error.putBoolean("success", false);
            error.putString("error", e.getMessage());
            promise.reject("PRINT_ERROR", error);
        }
    }

    @ReactMethod
    public void printText(String text, ReadableMap options, Promise promise) {
        if (posPrinter == null) {
            promise.reject("PRINTER_ERROR", "Printer not connected");
            return;
        }

        try {
            // Parse options for text formatting
            String fontSize = options.hasKey("fontSize") ? options.getString("fontSize") : "normal";
            String alignment = options.hasKey("alignment") ? options.getString("alignment") : "left";
            
            // Apply alignment
            if (alignment.equals("center")) {
                posPrinter.printTextAlignment(text, POSConst.ALIGNMENT_CENTER);
            } else if (alignment.equals("right")) {
                posPrinter.printTextAlignment(text, POSConst.ALIGNMENT_RIGHT);
            } else {
                posPrinter.printTextAlignment(text, POSConst.ALIGNMENT_LEFT);
            }
            
            // Apply font size
            int textSize = 0; // Normal
            if (fontSize.equals("small")) textSize = -1;
            else if (fontSize.equals("large")) textSize = 1;
            else if (fontSize.equals("xlarge")) textSize = 2;
            
            if (textSize != 0) {
                posPrinter.printTextSize(text, textSize);
            }
            
            // Print newline for formatting
            posPrinter.printString("\n");
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("PRINT_TEXT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void printBarcode(String data, ReadableMap options, Promise promise) {
        if (posPrinter == null) {
            promise.reject("PRINTER_ERROR", "Printer not connected");
            return;
        }

        try {
            String type = options.hasKey("type") ? options.getString("type") : "CODE128";
            
            // Use simple barcode printing with POSPrinter
            // Format: printBarCode(String data, int type)
            int barcodeType = 73; // CODE128 default
            switch (type) {
                case "CODE39":
                    barcodeType = 69;
                    break;
                case "CODE128":
                    barcodeType = 73;
                    break;
                case "EAN13":
                    barcodeType = 67;
                    break;
            }
            
            posPrinter.printBarCode(data, barcodeType);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("PRINT_BARCODE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void printQRCode(String data, ReadableMap options, Promise promise) {
        if (posPrinter == null) {
            promise.reject("PRINTER_ERROR", "Printer not connected");
            return;
        }

        try {
            int size = options.hasKey("size") ? options.getInt("size") : 6;
            // Use POSPrinter QR code method: printQRCode(String data, int moduleSize, int errorLevel)
            posPrinter.printQRCode(data, size, 3);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("PRINT_QR_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getPrinterStatus(Promise promise) {
        try {
            WritableMap status = Arguments.createMap();
            status.putBoolean("isConnected", currentConnection != null);
            status.putBoolean("isReady", posPrinter != null);
            
            if (currentConnection != null) {
                status.putString("connectionType", getConnectionType());
            }
            
            promise.resolve(status);
            
        } catch (Exception e) {
            promise.reject("STATUS_ERROR", e.getMessage());
        }
    }

    private String getConnectionType() {
        // This would need to be tracked when connecting
        return "Unknown";
    }

    private void saveDeviceInfo(String devicePath, String vendorId, String productId, String serialNumber, String deviceName, String connectionType) {
        try {
            String deviceKey = generateDeviceKey(vendorId, productId, serialNumber);
            SharedPreferences.Editor editor = devicePrefs.edit();
            
            editor.putString(deviceKey + "_path", devicePath);
            editor.putString(deviceKey + "_vendorId", vendorId != null ? vendorId : "");
            editor.putString(deviceKey + "_productId", productId != null ? productId : "");
            editor.putString(deviceKey + "_serialNumber", serialNumber != null ? serialNumber : "");
            editor.putString(deviceKey + "_deviceName", deviceName != null ? deviceName : "Unknown Device");
            editor.putString(deviceKey + "_connectionType", connectionType);
            editor.putLong(deviceKey + "_lastConnected", System.currentTimeMillis());
            editor.putBoolean(deviceKey + "_autoReconnect", true);
            
            editor.apply();
            android.util.Log.d("ESCPrinter", "Saved device info: " + deviceKey);
            
        } catch (Exception e) {
            android.util.Log.e("ESCPrinter", "Failed to save device info", e);
        }
    }

    private void saveDeviceConnection(String deviceKey) {
        try {
            SharedPreferences.Editor editor = devicePrefs.edit();
            editor.putLong(deviceKey + "_lastConnected", System.currentTimeMillis());
            editor.apply();
        } catch (Exception e) {
            android.util.Log.e("ESCPrinter", "Failed to update device connection time", e);
        }
    }

    private String generateDeviceKey(String vendorId, String productId, String serialNumber) {
        String key = vendorId + "_" + productId;
        if (serialNumber != null && !serialNumber.isEmpty()) {
            key += "_" + serialNumber;
        }
        return key.replaceAll("[^a-zA-Z0-9_]", "_");
    }

    private UsbDevice findUsbDeviceBySpecs(String vendorId, String productId, String serialNumber) {
        try {
            UsbManager usbManager = (UsbManager) reactContext.getSystemService(Context.USB_SERVICE);
            if (usbManager == null) return null;
            
            for (UsbDevice device : usbManager.getDeviceList().values()) {
                String deviceVendorId = String.valueOf(device.getVendorId());
                String deviceProductId = String.valueOf(device.getProductId());
                String deviceSerial = device.getSerialNumber();
                
                if (vendorId.equals(deviceVendorId) && productId.equals(deviceProductId)) {
                    if (serialNumber == null || serialNumber.isEmpty() || serialNumber.equals(deviceSerial)) {
                        return device;
                    }
                }
            }
        } catch (Exception e) {
            android.util.Log.e("ESCPrinter", "Error finding USB device", e);
        }
        return null;
    }

    @ReactMethod
    public void getSavedDevices(Promise promise) {
        try {
            WritableArray devices = Arguments.createArray();
            
            for (String key : devicePrefs.getAll().keySet()) {
                if (key.endsWith("_vendorId")) {
                    String deviceKey = key.replace("_vendorId", "");
                    
                    WritableMap device = Arguments.createMap();
                    device.putString("deviceKey", deviceKey);
                    device.putString("path", devicePrefs.getString(deviceKey + "_path", ""));
                    device.putString("vendorId", devicePrefs.getString(deviceKey + "_vendorId", ""));
                    device.putString("productId", devicePrefs.getString(deviceKey + "_productId", ""));
                    device.putString("serialNumber", devicePrefs.getString(deviceKey + "_serialNumber", ""));
                    device.putString("deviceName", devicePrefs.getString(deviceKey + "_deviceName", "Unknown Device"));
                    device.putString("connectionType", devicePrefs.getString(deviceKey + "_connectionType", "USB"));
                    device.putDouble("lastConnected", devicePrefs.getLong(deviceKey + "_lastConnected", 0));
                    device.putBoolean("autoReconnect", devicePrefs.getBoolean(deviceKey + "_autoReconnect", true));
                    
                    devices.pushMap(device);
                }
            }
            
            promise.resolve(devices);
            
        } catch (Exception e) {
            promise.reject("SAVED_DEVICES_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void autoReconnectDevices(Promise promise) {
        try {
            WritableArray reconnectedDevices = Arguments.createArray();
            
            for (String key : devicePrefs.getAll().keySet()) {
                if (key.endsWith("_autoReconnect") && devicePrefs.getBoolean(key, false)) {
                    String deviceKey = key.replace("_autoReconnect", "");
                    
                    String vendorId = devicePrefs.getString(deviceKey + "_vendorId", "");
                    String productId = devicePrefs.getString(deviceKey + "_productId", "");
                    String serialNumber = devicePrefs.getString(deviceKey + "_serialNumber", "");
                    String connectionType = devicePrefs.getString(deviceKey + "_connectionType", "USB");
                    
                    if ("USB".equals(connectionType)) {
                        UsbDevice foundDevice = findUsbDeviceBySpecs(vendorId, productId, serialNumber);
                        if (foundDevice != null) {
                            // Attempt to reconnect
                            List<String> availableDevices = POSConnect.getUsbDevices(reactContext);
                            for (String devicePath : availableDevices) {
                                if (devicePath.contains(foundDevice.getDeviceName())) {
                                    currentDeviceKey = deviceKey;
                                    
                                    if (currentConnection != null) {
                                        currentConnection.close();
                                    }
                                    
                                    currentConnection = POSConnect.createDevice(POSConnect.DEVICE_TYPE_USB);
                                    currentConnection.connect(devicePath, connectListener);
                                    
                                    WritableMap reconnectedDevice = Arguments.createMap();
                                    reconnectedDevice.putString("deviceKey", deviceKey);
                                    reconnectedDevice.putString("deviceName", devicePrefs.getString(deviceKey + "_deviceName", "Unknown Device"));
                                    reconnectedDevice.putString("path", devicePath);
                                    reconnectedDevices.pushMap(reconnectedDevice);
                                    
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            
            WritableMap result = Arguments.createMap();
            result.putArray("reconnectedDevices", reconnectedDevices);
            result.putInt("count", reconnectedDevices.size());
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("AUTO_RECONNECT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void removeDevice(String deviceKey, Promise promise) {
        try {
            SharedPreferences.Editor editor = devicePrefs.edit();
            
            // Remove all keys associated with this device
            editor.remove(deviceKey + "_path");
            editor.remove(deviceKey + "_vendorId");
            editor.remove(deviceKey + "_productId");
            editor.remove(deviceKey + "_serialNumber");
            editor.remove(deviceKey + "_deviceName");
            editor.remove(deviceKey + "_connectionType");
            editor.remove(deviceKey + "_lastConnected");
            editor.remove(deviceKey + "_autoReconnect");
            
            editor.apply();
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Device removed successfully");
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("REMOVE_DEVICE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void toggleAutoReconnect(String deviceKey, boolean enabled, Promise promise) {
        try {
            SharedPreferences.Editor editor = devicePrefs.edit();
            editor.putBoolean(deviceKey + "_autoReconnect", enabled);
            editor.apply();
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putBoolean("autoReconnect", enabled);
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("TOGGLE_AUTO_RECONNECT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void cutPaper(String type, Promise promise) {
        if (posPrinter == null) {
            promise.reject("PRINTER_ERROR", "Printer not connected");
            return;
        }

        try {
            // Add some feed lines before cutting for better separation
            posPrinter.printString("\n\n\n");
            
            // Try using POSPrinter native cut methods first
            try {
                if ("partial".equals(type)) {
                    // Try partial cut using POSPrinter method
                    posPrinter.cutPaper(0); // Partial cut
                } else {
                    // Try full cut using POSPrinter method  
                    posPrinter.cutPaper(1); // Full cut
                }
            } catch (Exception cutException) {
                // Fallback to ESC/POS commands if POSPrinter methods don't work
                String cutCommand;
                if ("partial".equals(type)) {
                    // ESC m - Partial cut (more compatible)
                    cutCommand = "\u001B\u006D";
                } else {
                    // GS V - Full cut (more reliable than ESC i)
                    cutCommand = "\u001D\u0056\u0000";
                }
                posPrinter.printString(cutCommand);
            }

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Paper cut command sent successfully (" + type + " cut)");
            result.putString("type", type);
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("CUT_ERROR", "Failed to cut paper: " + e.getMessage());
        }
    }

    @ReactMethod
    public void openDrawer(Promise promise) {
        if (posPrinter == null) {
            promise.reject("PRINTER_ERROR", "Printer not connected");
            return;
        }
        
        try {
            // Send ESC/POS command to open cash drawer
            // ESC p 0 25 250 - Standard cash drawer command
            String drawerCommand = "\u001B\u0070\u0000\u0019\u00FA"; // ESC p 0 25 250
            posPrinter.printString(drawerCommand);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Cash drawer open command sent");
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("DRAWER_ERROR", "Failed to open drawer: " + e.getMessage());
        }
    }

    @ReactMethod
    public void scanNetworkPrinters(String subnet, Promise promise) {
        try {
            WritableArray deviceArray = Arguments.createArray();
            
            // Basic implementation for network printer scanning
            // In a production app, this would do actual network discovery
            // For now, return a placeholder response to prevent crashes
            
            // Common network printer ports
            int[] commonPorts = {9100, 515, 631};
            
            // Create a simple scan result with common network printer IPs
            for (int i = 1; i <= 10; i++) {
                String ip = subnet + "." + i;
                
                WritableMap deviceInfo = Arguments.createMap();
                deviceInfo.putString("id", ip + ":9100");
                deviceInfo.putString("name", "Network Printer (" + ip + ")");
                deviceInfo.putString("ip", ip);
                deviceInfo.putInt("port", 9100);
                deviceInfo.putString("type", "network");
                deviceInfo.putString("protocol", "raw");
                deviceInfo.putBoolean("discovered", false); // Set to false since we're not actually scanning
                
                // Only add if we want to show placeholder entries
                // deviceArray.pushMap(deviceInfo);
            }
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putArray("devices", deviceArray);
            result.putString("message", deviceArray.size() + " network printer(s) found");
            result.putString("subnet", subnet);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("NETWORK_SCAN_ERROR", "Failed to scan network printers: " + e.getMessage());
        }
    }

    // LifecycleEventListener methods for proper resource management
    @Override
    public void onHostResume() {
        android.util.Log.d("ESCPrinter", "Host resumed");
        // Add any logic needed when the host activity resumes
    }

    @Override
    public void onHostPause() {
        android.util.Log.d("ESCPrinter", "Host paused");
        // Add any logic needed when the host activity pauses
    }

    @Override
    public void onHostDestroy() {
        android.util.Log.d("ESCPrinter", "Host destroying, cleaning up printer resources");
        
        // Disconnect current connection
        try {
            if (currentConnection != null) {
                // Use the correct close method
                currentConnection.close();
                android.util.Log.d("ESCPrinter", "Printer connection closed");
            }
        } catch (Exception e) {
            android.util.Log.w("ESCPrinter", "Error disconnecting printer", e);
        }
        
        // Clear references to prevent memory leaks
        currentConnection = null;
        posPrinter = null;
        zplPrinter = null;
        currentDeviceKey = null;
        
        // Remove handler callbacks
        if (mainHandler != null) {
            mainHandler.removeCallbacksAndMessages(null);
        }
        
        // Remove lifecycle listener to prevent memory leaks
        try {
            reactContext.removeLifecycleEventListener(this);
        } catch (Exception e) {
            android.util.Log.w("ESCPrinter", "Error removing lifecycle listener", e);
        }
        
        android.util.Log.d("ESCPrinter", "Printer module cleanup completed");
    }
}
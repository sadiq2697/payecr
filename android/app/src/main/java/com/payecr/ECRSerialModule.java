package com.payecr;

import android.content.Context;
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
import com.hoho.android.usbserial.driver.UsbSerialDriver;
import com.hoho.android.usbserial.driver.UsbSerialPort;
import com.hoho.android.usbserial.driver.UsbSerialProber;
import com.hoho.android.usbserial.util.SerialInputOutputManager;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicBoolean;

public class ECRSerialModule extends ReactContextBaseJavaModule implements SerialInputOutputManager.Listener {

    private static final String TAG = "ECRSerial";
    private static final String MODULE_NAME = "ECRSerial";
    private static final int READ_TIMEOUT = 1000;
    private static final int WRITE_TIMEOUT = 1000;

    private UsbSerialPort serialPort;
    private SerialInputOutputManager usbIoManager;
    private final AtomicBoolean isConnected = new AtomicBoolean(false);
    private final StringBuilder receivedData = new StringBuilder();
    private final Object dataLock = new Object();
    private ExecutorService executorService;

    public ECRSerialModule(ReactApplicationContext reactContext) {
        super(reactContext);
        executorService = Executors.newSingleThreadExecutor();
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

            // Add device details for debugging
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
                // Close existing connection if any
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

                // Use first available driver
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

                // Set serial parameters with validation
                int baudRate = getConfigInt(config, "baudRate", 9600);
                int dataBits = getConfigInt(config, "dataBits", 8);
                int stopBits = mapStopBits(getConfigInt(config, "stopBits", 1));
                int parity = mapParity(getConfigInt(config, "parity", 0));

                serialPort.setParameters(baudRate, dataBits, stopBits, parity);
                
                // Add small delay for hardware initialization
                Thread.sleep(100);

                // Start I/O manager for background reading
                usbIoManager = new SerialInputOutputManager(serialPort, this);
                Executors.newSingleThreadExecutor().submit(usbIoManager);

                isConnected.set(true);
                
                // Clear any existing data
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

                // Stop I/O manager first
                if (usbIoManager != null) {
                    usbIoManager.stop();
                    usbIoManager = null;
                }

                // Close serial port
                if (serialPort != null) {
                    try {
                        serialPort.close();
                    } catch (IOException e) {
                        Log.w(TAG, "Error closing serial port", e);
                    }
                    serialPort = null;
                }

                // Clear received data buffer
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
                
                // Write with timeout and validation
                int bytesWritten = serialPort.write(bytes, WRITE_TIMEOUT);
                
                if (bytesWritten != bytes.length) {
                    Log.w(TAG, String.format("Partial write: %d of %d bytes written", bytesWritten, bytes.length));
                }

                // Add small delay for ECR protocol timing
                Thread.sleep(10);

                Log.d(TAG, String.format("Written %d bytes: %s", bytesWritten, bytesToHex(bytes)));

                WritableMap result = successResult("Data written successfully");
                result.putInt("bytesWritten", bytesWritten);
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
            
            if (connected && serialPort != null) {
                result.putString("status", "Connected and ready");
            } else {
                result.putString("status", "Not connected");
            }
            
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

            // Flush hardware buffers if supported
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

    // SerialInputOutputManager.Listener implementation
    @Override
    public void onNewData(byte[] data) {
        try {
            String receivedString = new String(data, StandardCharsets.ISO_8859_1);
            
            synchronized (dataLock) {
                receivedData.append(receivedString);
                
                // Prevent buffer overflow
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
        
        // Clean up resources
        try {
            if (serialPort != null) {
                serialPort.close();
                serialPort = null;
            }
        } catch (IOException ioException) {
            Log.w(TAG, "Error closing port after run error", ioException);
        }
    }

    // Helper methods
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

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        
        // Clean shutdown
        isConnected.set(false);
        closeSerial(null);
        
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
        }
    }
}
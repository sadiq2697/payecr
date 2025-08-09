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

public class ECRSerialModule extends ReactContextBaseJavaModule implements SerialInputOutputManager.Listener {

    private static final String TAG = "ECRSerial";
    private static final String MODULE_NAME = "ECRSerial";

    private UsbSerialPort serialPort;
    private SerialInputOutputManager usbIoManager;
    private boolean isConnected = false;
    private final StringBuilder receivedData = new StringBuilder();

    public ECRSerialModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void getAvailablePorts(Promise promise) {
        try {
            UsbManager manager = getUsbManager();
            List<UsbSerialDriver> drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager);

            WritableMap result = Arguments.createMap();
            result.putInt("count", drivers.size());
            result.putString("message", drivers.isEmpty() ? "No USB serial devices found" :
                    drivers.size() + " USB serial device(s) found");

            promise.resolve(result);
        } catch (Exception e) {
            logAndReject(promise, "GET_PORTS_ERROR", "Error getting available ports", e);
        }
    }

    @ReactMethod
    public void openSerial(ReadableMap config, Promise promise) {
        try {
            if (isConnected) closeSerial(null);

            UsbManager manager = getUsbManager();
            List<UsbSerialDriver> drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager);

            if (drivers.isEmpty()) {
                promise.reject("NO_DEVICE", "No USB serial devices found");
                return;
            }

            UsbSerialDriver driver = drivers.get(0);
            UsbDeviceConnection connection = manager.openDevice(driver.getDevice());

            if (connection == null) {
                promise.reject("CONNECTION_FAILED", "Failed to open USB device connection");
                return;
            }

            serialPort = driver.getPorts().get(0);
            serialPort.open(connection);
            serialPort.setParameters(
                    getConfigInt(config, "baudRate", 9600),
                    getConfigInt(config, "dataBits", 8),
                    getConfigInt(config, "stopBits", UsbSerialPort.STOPBITS_1),
                    getConfigInt(config, "parity", UsbSerialPort.PARITY_NONE)
            );

            usbIoManager = new SerialInputOutputManager(serialPort, this);
            Executors.newSingleThreadExecutor().submit(usbIoManager);

            isConnected = true;
            promise.resolve(successResult("Serial connection opened successfully"));
        } catch (IOException e) {
            logAndReject(promise, "OPEN_ERROR", "Error opening serial connection", e);
        } catch (Exception e) {
            logAndReject(promise, "OPEN_ERROR", "Unexpected error opening serial connection", e);
        }
    }

    @ReactMethod
    public void closeSerial(Promise promise) {
        try {
            if (usbIoManager != null) {
                usbIoManager.stop();
                usbIoManager = null;
            }
            if (serialPort != null) {
                serialPort.close();
                serialPort = null;
            }
            isConnected = false;
            receivedData.setLength(0);

            if (promise != null) {
                promise.resolve(successResult("Serial connection closed"));
            }
        } catch (IOException e) {
            logAndReject(promise, "CLOSE_ERROR", "Error closing serial connection", e);
        }
    }

    @ReactMethod
    public void writeData(String data, Promise promise) {
        try {
            if (!isConnected || serialPort == null) {
                promise.reject("NOT_CONNECTED", "Serial port is not connected");
                return;
            }
            byte[] bytes = data.getBytes(StandardCharsets.ISO_8859_1);
            serialPort.write(bytes, 1000);

            WritableMap result = successResult("Data written successfully");
            result.putInt("bytesWritten", bytes.length);
            promise.resolve(result);
        } catch (IOException e) {
            logAndReject(promise, "WRITE_ERROR", "Error writing data", e);
        }
    }

    @ReactMethod
    public void readData(Promise promise) {
        if (!isConnected) {
            promise.reject("NOT_CONNECTED", "Serial port is not connected");
            return;
        }
        String data = receivedData.toString();
        receivedData.setLength(0);

        WritableMap result = successResult("Data read successfully");
        result.putString("data", data);
        result.putInt("length", data.length());
        promise.resolve(result);
    }

    @ReactMethod
    public void isConnected(Promise promise) {
        WritableMap result = Arguments.createMap();
        result.putBoolean("connected", isConnected);
        promise.resolve(result);
    }

    @Override
    public void onNewData(byte[] data) {
        try {
            String receivedString = new String(data, StandardCharsets.ISO_8859_1);
            receivedData.append(receivedString);
            Log.d(TAG, "Received data: " + receivedString);
        } catch (Exception e) {
            Log.e(TAG, "Error processing received data", e);
        }
    }

    @Override
    public void onRunError(Exception e) {
        Log.e(TAG, "Serial communication error", e);
        isConnected = false;
    }

    // Helpers
    private UsbManager getUsbManager() {
        return (UsbManager) getReactApplicationContext().getSystemService(Context.USB_SERVICE);
    }

    private int getConfigInt(ReadableMap config, String key, int defaultValue) {
        return config.hasKey(key) ? config.getInt(key) : defaultValue;
    }

    private WritableMap successResult(String message) {
        WritableMap result = Arguments.createMap();
        result.putBoolean("success", true);
        result.putString("message", message);
        return result;
    }

    private void logAndReject(Promise promise, String code, String logMsg, Exception e) {
        Log.e(TAG, logMsg, e);
        if (promise != null) promise.reject(code, e.getMessage());
    }
}

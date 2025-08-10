package com.payecr;

import android.util.Log;
import com.facebook.react.bridge.*;
import com.facebook.react.bridge.LifecycleEventListener; // Import LifecycleEventListener

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

// Implement LifecycleEventListener
public class ECRTcpModule extends ReactContextBaseJavaModule implements LifecycleEventListener { // Implements LifecycleEventListener

    private static final String TAG = "ECRTcp";
    private static final String MODULE_NAME = "ECRTcp";
    private static final int DEFAULT_BUFFER_SIZE = 1024;
    private static final int READ_TIMEOUT = 1000;

    private Socket socket;
    private OutputStream outputStream;
    private InputStream inputStream;
    private final AtomicBoolean isConnected = new AtomicBoolean(false);
    private final ExecutorService executorService;
    private final StringBuilder receivedData = new StringBuilder();
    private final Object dataLock = new Object();
    private volatile boolean shouldStopReading = false;

    public ECRTcpModule(ReactApplicationContext reactContext) {
        super(reactContext);
        executorService = Executors.newCachedThreadPool();
        // Register this module as a LifecycleEventListener
        getReactApplicationContext().addLifecycleEventListener(this);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void connect(ReadableMap config, Promise promise) {
        String host = config.getString("host");
        int port = config.hasKey("port") ? config.getInt("port") : 88;
        int timeout = config.hasKey("timeout") ? config.getInt("timeout") : 5000;

        if (host == null || host.trim().isEmpty()) {
            promise.reject("INVALID_HOST", "Host address is required");
            return;
        }

        executorService.execute(() -> {
            try {
                if (isConnected.get()) {
                    disconnect(null);
                }

                Log.i(TAG, String.format("Connecting to %s:%d with timeout %dms", host, port, timeout));

                socket = new Socket();
                socket.connect(new InetSocketAddress(host, port), timeout);
                
                socket.setSoTimeout(READ_TIMEOUT);
                socket.setTcpNoDelay(true);
                socket.setKeepAlive(true);

                outputStream = socket.getOutputStream();
                inputStream = socket.getInputStream();

                isConnected.set(true);
                shouldStopReading = false;

                synchronized (dataLock) {
                    receivedData.setLength(0);
                }

                Thread.sleep(100);

                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("message", "TCP connection established");
                result.putString("host", host);
                result.putInt("port", port);
                result.putLong("timestamp", System.currentTimeMillis());

                Log.i(TAG, String.format("TCP connection established to %s:%d", host, port));
                promise.resolve(result);

                startReading();

            } catch (ConnectException e) {
                String errorMsg = String.format("Connection refused to %s:%d - ECR terminal may be offline", host, port);
                Log.e(TAG, errorMsg, e);
                promise.reject("CONNECTION_REFUSED", errorMsg);
            } catch (SocketTimeoutException e) {
                String errorMsg = String.format("Connection timeout to %s:%d after %dms", host, port, timeout);
                Log.e(TAG, errorMsg, e);
                promise.reject("CONNECTION_TIMEOUT", errorMsg);
            } catch (UnknownHostException e) {
                String errorMsg = String.format("Unknown host: %s", host);
                Log.e(TAG, errorMsg, e);
                promise.reject("UNKNOWN_HOST", errorMsg);
            } catch (IOException e) {
                String errorMsg = String.format("IO error connecting to %s:%d", host, port);
                Log.e(TAG, errorMsg, e);
                promise.reject("CONNECT_ERROR", e.getMessage());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                promise.reject("CONNECT_INTERRUPTED", "Connection interrupted");
            } catch (Exception e) {
                Log.e(TAG, "Unexpected error during connection", e);
                promise.reject("CONNECT_ERROR", "Unexpected error: " + e.getMessage());
            }
        });
    }

    @ReactMethod
    public void disconnect(Promise promise) {
        executorService.execute(() -> {
            try {
                Log.i(TAG, "Disconnecting TCP connection");

                isConnected.set(false);
                shouldStopReading = true;

                closeResources();

                synchronized (dataLock) {
                    receivedData.setLength(0);
                }

                Log.i(TAG, "TCP connection closed");

                if (promise != null) {
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    result.putString("message", "TCP connection closed");
                    result.putLong("timestamp", System.currentTimeMillis());
                    promise.resolve(result);
                }

            } catch (Exception e) {
                Log.e(TAG, "Error disconnecting from TCP server", e);
                if (promise != null) {
                    promise.reject("DISCONNECT_ERROR", e.getMessage());
                }
            }
        });
    }

    @ReactMethod
    public void send(String data, Promise promise) {
        if (!isConnected.get() || outputStream == null) {
            promise.reject("NOT_CONNECTED", "TCP connection is not established");
            return;
        }

        if (data == null) {
            promise.reject("INVALID_DATA", "Data cannot be null");
            return;
        }

        executorService.execute(() -> {
            try {
                byte[] bytes = data.getBytes(StandardCharsets.ISO_8859_1);
                
                outputStream.write(bytes);
                outputStream.flush();

                Thread.sleep(10);

                Log.d(TAG, String.format("Sent %d bytes: %s", bytes.length, bytesToHex(bytes)));

                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("message", "Data sent successfully");
                result.putInt("bytesSent", bytes.length);
                result.putString("hexData", bytesToHex(bytes));
                result.putLong("timestamp", System.currentTimeMillis());
                promise.resolve(result);

            } catch (IOException e) {
                Log.e(TAG, "Error sending data", e);
                isConnected.set(false);
                promise.reject("SEND_ERROR", "IO error sending data: " + e.getMessage());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                promise.reject("SEND_INTERRUPTED", "Send operation interrupted");
            } catch (Exception e) {
                Log.e(TAG, "Unexpected error sending data", e);
                promise.reject("SEND_ERROR", "Unexpected error: " + e.getMessage());
            }
        });
    }

    @ReactMethod
    public void receive(Promise promise) {
        if (!isConnected.get()) {
            promise.reject("NOT_CONNECTED", "TCP connection is not established");
            return;
        }

        try {
            String data;
            synchronized (dataLock) {
                data = receivedData.toString();
                receivedData.setLength(0);
            }

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("data", data);
            result.putInt("length", data.length());
            result.putLong("timestamp", System.currentTimeMillis());
            
            if (!data.isEmpty()) {
                result.putString("hexData", stringToHex(data));
                Log.d(TAG, String.format("Received %d bytes: %s", data.length(), stringToHex(data)));
            }

            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error receiving data", e);
            promise.reject("RECEIVE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void isConnected(Promise promise) {
        try {
            boolean connected = isConnected.get() && socket != null && !socket.isClosed() && socket.isConnected();
            
            String status;
            if (connected) {
                try {
                    String remoteAddress = socket.getRemoteSocketAddress().toString();
                    status = "Connected to " + remoteAddress;
                } catch (Exception e) {
                    connected = false;
                    status = "Connection broken";
                    isConnected.set(false);
                }
            } else {
                status = "Not connected";
            }

            WritableMap result = Arguments.createMap();
            result.putBoolean("connected", connected);
            result.putString("status", status);
            result.putLong("timestamp", System.currentTimeMillis());
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error checking connection status", e);
            promise.reject("STATUS_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void testConnection(ReadableMap config, Promise promise) {
        String host = config.getString("host");
        int port = config.hasKey("port") ? config.getInt("port") : 88;
        int timeout = config.hasKey("timeout") ? config.getInt("timeout") : 3000;

        if (host == null || host.trim().isEmpty()) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("message", "Host address is required");
            promise.resolve(result);
            return;
        }

        executorService.execute(() -> {
            Socket testSocket = null;
            try {
                Log.d(TAG, String.format("Testing connection to %s:%d", host, port));

                testSocket = new Socket();
                long startTime = System.currentTimeMillis();
                testSocket.connect(new InetSocketAddress(host, port), timeout);
                long connectionTime = System.currentTimeMillis() - startTime;

                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("message", String.format("Connection test successful in %dms", connectionTime));
                result.putString("host", host);
                result.putInt("port", port);
                result.putLong("connectionTime", connectionTime);
                result.putLong("timestamp", System.currentTimeMillis());

                Log.i(TAG, String.format("Connection test successful to %s:%d in %dms", host, port, connectionTime));
                promise.resolve(result);

            } catch (ConnectException e) {
                String errorMsg = String.format("Connection refused to %s:%d", host, port);
                Log.w(TAG, errorMsg);
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", false);
                result.putString("message", errorMsg);
                promise.resolve(result);
            } catch (SocketTimeoutException e) {
                String errorMsg = String.format("Connection timeout to %s:%d after %dms", host, port, timeout);
                Log.w(TAG, errorMsg);
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", false);
                result.putString("message", errorMsg);
                promise.resolve(result);
            } catch (IOException e) {
                String errorMsg = String.format("Connection test failed to %s:%d: %s", host, port, e.getMessage());
                Log.w(TAG, errorMsg);
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", false);
                result.putString("message", errorMsg);
                promise.resolve(result);
            } finally {
                if (testSocket != null && !testSocket.isClosed()) {
                    try {
                        testSocket.close();
                    } catch (IOException e) {
                        Log.w(TAG, "Error closing test socket", e);
                    }
                }
            }
        });
    }

    @ReactMethod
    public void flushBuffers(Promise promise) {
        if (!isConnected.get()) {
            promise.reject("NOT_CONNECTED", "TCP connection is not established");
            return;
        }

        try {
            synchronized (dataLock) {
                receivedData.setLength(0);
            }

            if (outputStream != null) {
                outputStream.flush();
            }

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Buffers flushed");
            result.putLong("timestamp", System.currentTimeMillis());
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error flushing buffers", e);
            promise.reject("FLUSH_ERROR", e.getMessage());
        }
    }

    private void startReading() {
        executorService.execute(() -> {
            byte[] buffer = new byte[DEFAULT_BUFFER_SIZE];
            int bytesRead;

            Log.d(TAG, "Started TCP reading thread");

            while (isConnected.get() && !shouldStopReading && inputStream != null) {
                try {
                    bytesRead = inputStream.read(buffer);
                    
                    if (bytesRead > 0) {
                        String receivedString = new String(buffer, 0, bytesRead, StandardCharsets.ISO_8859_1);
                        
                        synchronized (dataLock) {
                            receivedData.append(receivedString);
                            
                            if (receivedData.length() > 10000) {
                                Log.w(TAG, "Receive buffer overflow, clearing old data");
                                receivedData.delete(0, receivedData.length() - 5000);
                            }
                        }

                        Log.d(TAG, String.format("Received %d bytes: %s", bytesRead, bytesToHex(buffer, bytesRead)));

                    } else if (bytesRead == -1) {
                        Log.i(TAG, "Connection closed by server");
                        isConnected.set(false);
                        break;
                    }
                    
                } catch (SocketTimeoutException e) {
                    continue;
                } catch (IOException e) {
                    if (isConnected.get()) {
                        Log.e(TAG, "Error reading from TCP connection", e);
                        isConnected.set(false);
                    }
                    break;
                } catch (Exception e) {
                    Log.e(TAG, "Unexpected error in reading thread", e);
                    break;
                }
            }

            Log.d(TAG, "TCP reading thread stopped");
        });
    }

    private void closeResources() {
        try {
            if (outputStream != null) {
                outputStream.close();
                outputStream = null;
            }
        } catch (IOException e) {
            Log.w(TAG, "Error closing output stream", e);
        }

        try {
            if (inputStream != null) {
                inputStream.close();
                inputStream = null;
            }
        } catch (IOException e) {
            Log.w(TAG, "Error closing input stream", e);
        }

        try {
            if (socket != null && !socket.isClosed()) {
                socket.close();
                socket = null;
            }
        } catch (IOException e) {
            Log.w(TAG, "Error closing socket", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        return bytesToHex(bytes, bytes.length);
    }

    private String bytesToHex(byte[] bytes, int length) {
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < length; i++) {
            result.append(String.format("%02X ", bytes[i]));
        }
        return result.toString().trim();
    }

    private String stringToHex(String str) {
        return bytesToHex(str.getBytes(StandardCharsets.ISO_8859_1));
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
        Log.i(TAG, "Host destroying, cleaning up TCP resources");
        
        shouldStopReading = true;
        isConnected.set(false);
        disconnect(null); // Ensure resources are cleaned up
        
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
        }
    }
}

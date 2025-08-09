package com.payecr;

import android.util.Log;
import com.facebook.react.bridge.*;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ECRTcpModule extends ReactContextBaseJavaModule {

    private static final String TAG = "ECRTcp";
    private static final String MODULE_NAME = "ECRTcp";

    private Socket socket;
    private PrintWriter writer;
    private BufferedReader reader;
    private boolean isConnected = false;
    private final ExecutorService executorService;
    private final StringBuilder receivedData = new StringBuilder();

    public ECRTcpModule(ReactApplicationContext reactContext) {
        super(reactContext);
        executorService = Executors.newSingleThreadExecutor();
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

        executorService.execute(() -> {
            try {
                if (isConnected) disconnect(null);

                socket = new Socket();
                socket.connect(new InetSocketAddress(host, port), timeout);
                socket.setSoTimeout(timeout);

                writer = new PrintWriter(
                        new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.ISO_8859_1),
                        true
                );
                reader = new BufferedReader(
                        new InputStreamReader(socket.getInputStream(), StandardCharsets.ISO_8859_1)
                );

                isConnected = true;

                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("message", "TCP connection established");
                result.putString("host", host);
                result.putInt("port", port);
                promise.resolve(result);

                startReading();

            } catch (IOException e) {
                Log.e(TAG, "Error connecting to TCP server", e);
                promise.reject("CONNECT_ERROR", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void disconnect(Promise promise) {
        executorService.execute(() -> {
            try {
                isConnected = false;
                closeResources();

                receivedData.setLength(0);

                if (promise != null) {
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    result.putString("message", "TCP connection closed");
                    promise.resolve(result);
                }

            } catch (IOException e) {
                Log.e(TAG, "Error disconnecting from TCP server", e);
                if (promise != null) {
                    promise.reject("DISCONNECT_ERROR", e.getMessage());
                }
            }
        });
    }

    @ReactMethod
    public void send(String data, Promise promise) {
        executorService.execute(() -> {
            try {
                if (!isConnected || writer == null) {
                    promise.reject("NOT_CONNECTED", "TCP connection is not established");
                    return;
                }

                writer.print(data);
                writer.flush();

                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("message", "Data sent successfully");
                result.putInt("bytesSent", data.length());
                promise.resolve(result);

            } catch (Exception e) {
                Log.e(TAG, "Error sending data", e);
                promise.reject("SEND_ERROR", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void receive(Promise promise) {
        try {
            if (!isConnected) {
                promise.reject("NOT_CONNECTED", "TCP connection is not established");
                return;
            }

            String data = receivedData.toString();
            receivedData.setLength(0);

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("data", data);
            result.putInt("length", data.length());
            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error receiving data", e);
            promise.reject("RECEIVE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void isConnected(Promise promise) {
        WritableMap result = Arguments.createMap();
        result.putBoolean("connected", isConnected && socket != null && !socket.isClosed());
        promise.resolve(result);
    }

    @ReactMethod
    public void testConnection(ReadableMap config, Promise promise) {
        String host = config.getString("host");
        int port = config.hasKey("port") ? config.getInt("port") : 88;
        int timeout = config.hasKey("timeout") ? config.getInt("timeout") : 3000;

        executorService.execute(() -> {
            try (Socket testSocket = new Socket()) {
                testSocket.connect(new InetSocketAddress(host, port), timeout);

                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("message", "Connection test successful");
                result.putString("host", host);
                result.putInt("port", port);
                promise.resolve(result);

            } catch (IOException e) {
                Log.e(TAG, "Connection test failed", e);
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", false);
                result.putString("message", "Connection test failed: " + e.getMessage());
                promise.resolve(result);
            }
        });
    }

    private void startReading() {
        executorService.execute(() -> {
            char[] buffer = new char[1024];
            int bytesRead;

            while (isConnected && reader != null) {
                try {
                    bytesRead = reader.read(buffer);
                    if (bytesRead > 0) {
                        String receivedString = new String(buffer, 0, bytesRead);
                        receivedData.append(receivedString);
                        Log.d(TAG, "Received data: " + receivedString);
                    } else if (bytesRead == -1) {
                        Log.d(TAG, "Connection closed by server");
                        isConnected = false;
                        break;
                    }
                } catch (SocketTimeoutException e) {
                    // ignore and continue
                } catch (IOException e) {
                    Log.e(TAG, "Error reading from TCP connection", e);
                    isConnected = false;
                    break;
                }
            }
        });
    }

    private void closeResources() throws IOException {
        if (writer != null) {
            writer.close();
            writer = null;
        }
        if (reader != null) {
            reader.close();
            reader = null;
        }
        if (socket != null && !socket.isClosed()) {
            socket.close();
            socket = null;
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        executorService.shutdown();
        disconnect(null);
    }
}

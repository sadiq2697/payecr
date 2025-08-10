import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert, // Keeping Alert for now as per the original code, but a custom modal is recommended for production
  Switch
} from 'react-native';
import { Card, Title, Divider, Button } from 'react-native-paper';

// --- IMPORTANT: This component is designed for React Native. ---
// --- It uses modules like 'react-native' and 'react-native-paper' ---
// --- which cannot be resolved or run in a standard web browser environment. ---
// --- To use this component, ensure you are running it within a React Native project. ---

// Defined CONNECTION_TYPES directly here to resolve the import error within this environment.
const CONNECTION_TYPES = {
  TCP: 'tcp',
  SERIAL: 'serial',
};

const ConnectionSetup = ({ ecrService, onConnectionChange }) => {
  const [connectionType, setConnectionType] = useState(CONNECTION_TYPES.TCP);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  // New state for refreshing serial ports
  const [isRefreshingPorts, setIsRefreshingPorts] = useState(false); 

  const [tcpConfig, setTcpConfig] = useState({
    host: '192.168.1.100',
    port: '88',
    timeout: '5000',
  });

  const [serialConfig, setSerialConfig] = useState({
    baudRate: '9600',
    availablePorts: 0,
    // If ecrService provides a list of port names, you might add a 'selectedPort' state here
  });

  const showAlert = (title, message) => Alert.alert(title, message);

  const checkConnectionStatus = useCallback(async () => {
    try {
      const connected = await ecrService.checkConnection();
      setIsConnected(connected);
      onConnectionChange?.(connected);
    } catch (error) { // Added error logging
      setIsConnected(false);
      onConnectionChange?.(false);
      console.error("Failed to check connection status:", error);
    }
  }, [ecrService, onConnectionChange]);

  const getAvailablePorts = useCallback(async () => {
    setIsRefreshingPorts(true); // Set loading state
    try {
      const { count = 0 } = await ecrService.getAvailableSerialPorts();
      setSerialConfig((prev) => ({ ...prev, availablePorts: count }));
    } catch (error) { // Added error logging
      setSerialConfig((prev) => ({ ...prev, availablePorts: 0 }));
      console.error("Failed to get available serial ports:", error);
      showAlert("Port Refresh Error", error.message || "Failed to get available serial ports.");
    } finally {
      setIsRefreshingPorts(false); // Clear loading state
    }
  }, [ecrService]);

  useEffect(() => {
    checkConnectionStatus();
    if (connectionType === CONNECTION_TYPES.SERIAL) {
      getAvailablePorts();
    }
  }, [connectionType, checkConnectionStatus, getAvailablePorts]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      let result;
      if (connectionType === CONNECTION_TYPES.TCP) {
        // --- Input Validation for TCP (Block 1) ---
        const host = tcpConfig.host.trim();
        const port = parseInt(tcpConfig.port);
        const timeout = parseInt(tcpConfig.timeout);

        if (!host) {
          showAlert('Input Error', 'Host cannot be empty.');
          return;
        }
        if (isNaN(port) || port <= 0 || port > 65535) {
          showAlert('Input Error', 'Port must be a valid number between 1 and 65535.');
          return;
        }
        if (isNaN(timeout) || timeout <= 0) {
          showAlert('Input Error', 'Timeout must be a positive number.');
          return;
        }

        result = await ecrService.connectTCP({ host, port, timeout });
      } else {
        // --- Input Validation for Serial (Block 1) ---
        const baudRate = parseInt(serialConfig.baudRate);

        if (isNaN(baudRate) || baudRate <= 0) {
          showAlert('Input Error', 'Baud Rate must be a positive number.');
          return;
        }
        // Add validation for selectedPort here if implemented
        
        result = await ecrService.connectSerial({ baudRate });
      }

      if (result.success) {
        setIsConnected(true);
        onConnectionChange?.(true);
        showAlert('Success', result.message);
      } else {
        showAlert('Connection Failed', result.message || 'Unknown error');
      }
    } catch (error) { // --- Error Logging (Block 2) ---
      showAlert('Connection Error', error.message);
      console.error('ECR Connection Error:', error); 
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await ecrService.disconnect();
      setIsConnected(false);
      onConnectionChange?.(false);
      showAlert('Disconnected', 'Connection closed successfully');
    } catch (error) { // --- Error Logging (Block 2) ---
      showAlert('Disconnect Error', error.message);
      console.error('ECR Disconnect Error:', error);
    }
  };

  const handleTestConnection = async () => {
    if (connectionType !== CONNECTION_TYPES.TCP) {
      return showAlert('Test Not Available', 'Only available for TCP connections');
    }
    setIsConnecting(true);
    try {
      // --- Input Validation for TCP Test (Block 1) ---
      const host = tcpConfig.host.trim();
      const port = parseInt(tcpConfig.port);
      const timeout = parseInt(tcpConfig.timeout);

      if (!host) {
        showAlert('Input Error', 'Host cannot be empty.');
        return;
      }
      if (isNaN(port) || port <= 0 || port > 65535) {
        showAlert('Input Error', 'Port must be a valid number between 1 and 65535.');
        return;
      }
      if (isNaN(timeout) || timeout <= 0) {
        showAlert('Input Error', 'Timeout must be a positive number.');
        return;
      }

      const result = await ecrService.testTCPConnection({ host, port, timeout });
      showAlert(result.success ? 'Test Successful' : 'Test Failed', result.message);
    } catch (error) { // --- Error Logging (Block 2) ---
      showAlert('Test Error', error.message);
      console.error('ECR Test Connection Error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const renderTcpConfig = () => (
    <View style={styles.configSection}>
      <Text style={styles.sectionTitle}>TCP Configuration</Text>
      <TextInput
        style={styles.textInput}
        value={tcpConfig.host}
        onChangeText={(v) => setTcpConfig({ ...tcpConfig, host: v })}
        placeholder="192.168.1.100"
        editable={!isConnected}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.textInput, {flex: 1}]} // Added flex for layout
          value={tcpConfig.port}
          onChangeText={(v) => setTcpConfig({ ...tcpConfig, port: v })}
          placeholder="88"
          keyboardType="numeric"
          editable={!isConnected}
        />
        <TextInput
          style={[styles.textInput, {flex: 1}]} // Added flex for layout
          value={tcpConfig.timeout}
          onChangeText={(v) => setTcpConfig({ ...tcpConfig, timeout: v })}
          placeholder="5000"
          keyboardType="numeric"
          editable={!isConnected}
        />
      </View>
      {!isConnected && (
        <Button mode="outlined" onPress={handleTestConnection} loading={isConnecting}>
          Test Connection
        </Button>
      )}
    </View>
  );

  const renderSerialConfig = () => (
    <View style={styles.configSection}>
      <Text style={styles.sectionTitle}>Serial Configuration</Text>
      <TextInput
        style={styles.textInput}
        value={serialConfig.baudRate}
        onChangeText={(v) => setSerialConfig({ ...serialConfig, baudRate: v })}
        placeholder="9600"
        keyboardType="numeric"
        editable={!isConnected}
      />
      <Text>Available USB Serial Devices: {serialConfig.availablePorts}</Text>
      <Text>Data Bits: 8, Parity: None, Stop Bits: 1</Text>
      <Button 
        mode="outlined" 
        onPress={getAvailablePorts} 
        loading={isRefreshingPorts} // --- User Feedback for Refresh Ports (Block 3) ---
      >
        Refresh Ports
      </Button>
    </View>
  );

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title>ECR Connection Setup</Title>

        {/* Status */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
          {isConnected && <Text>({connectionType.toUpperCase()})</Text>}
        </View>

        <Divider style={styles.divider} />

        {/* Connection Type */}
        <View style={styles.switchContainer}>
          <Text>Serial</Text>
          <Switch
            value={connectionType === CONNECTION_TYPES.TCP}
            onValueChange={(v) => setConnectionType(v ? CONNECTION_TYPES.TCP : CONNECTION_TYPES.SERIAL)}
            disabled={isConnected}
          />
          <Text>TCP/IP</Text>
        </View>

        <Divider style={styles.divider} />

        {connectionType === CONNECTION_TYPES.TCP ? renderTcpConfig() : renderSerialConfig()}

        <Divider style={styles.divider} />

        {/* Actions */}
        {!isConnected ? (
          <Button mode="contained" onPress={handleConnect} loading={isConnecting} disabled={isConnecting}>
            Connect
          </Button>
        ) : (
          <Button mode="contained" onPress={handleDisconnect} style={{ backgroundColor: '#F44336' }}>
            Disconnect
          </Button>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { margin: 16, elevation: 4 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  statusText: { fontWeight: 'bold' },
  divider: { marginVertical: 16 },
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  configSection: { marginBottom: 16 },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    // marginBottom: 12, // Removed as it's now in a row
    backgroundColor: '#fff',
  },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 }, // Added marginBottom
});

export default ConnectionSetup;

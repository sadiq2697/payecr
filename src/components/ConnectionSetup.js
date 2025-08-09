import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Switch
} from 'react-native';
import { Card, Title, Divider, Button } from 'react-native-paper';
import { CONNECTION_TYPES } from '../utils/Constants';

const ConnectionSetup = ({ ecrService, onConnectionChange }) => {
  const [connectionType, setConnectionType] = useState(CONNECTION_TYPES.TCP);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [tcpConfig, setTcpConfig] = useState({
    host: '192.168.1.100',
    port: '88',
    timeout: '5000',
  });

  const [serialConfig, setSerialConfig] = useState({
    baudRate: '9600',
    availablePorts: 0,
  });

  const showAlert = (title, message) => Alert.alert(title, message);

  const checkConnectionStatus = useCallback(async () => {
    try {
      const connected = await ecrService.checkConnection();
      setIsConnected(connected);
      onConnectionChange?.(connected);
    } catch {
      setIsConnected(false);
      onConnectionChange?.(false);
    }
  }, [ecrService, onConnectionChange]);

  const getAvailablePorts = useCallback(async () => {
    try {
      const { count = 0 } = await ecrService.getAvailableSerialPorts();
      setSerialConfig((prev) => ({ ...prev, availablePorts: count }));
    } catch {
      setSerialConfig((prev) => ({ ...prev, availablePorts: 0 }));
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
      const result = connectionType === CONNECTION_TYPES.TCP
        ? await ecrService.connectTCP({
            host: tcpConfig.host,
            port: parseInt(tcpConfig.port),
            timeout: parseInt(tcpConfig.timeout),
          })
        : await ecrService.connectSerial({
            baudRate: parseInt(serialConfig.baudRate),
          });

      if (result.success) {
        setIsConnected(true);
        onConnectionChange?.(true);
        showAlert('Success', result.message);
      } else {
        showAlert('Connection Failed', result.message || 'Unknown error');
      }
    } catch (error) {
      showAlert('Connection Error', error.message);
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
    } catch (error) {
      showAlert('Disconnect Error', error.message);
    }
  };

  const handleTestConnection = async () => {
    if (connectionType !== CONNECTION_TYPES.TCP) {
      return showAlert('Test Not Available', 'Only available for TCP connections');
    }
    setIsConnecting(true);
    try {
      const result = await ecrService.testTCPConnection({
        host: tcpConfig.host,
        port: parseInt(tcpConfig.port),
        timeout: parseInt(tcpConfig.timeout),
      });
      showAlert(result.success ? 'Test Successful' : 'Test Failed', result.message);
    } catch (error) {
      showAlert('Test Error', error.message);
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
          style={styles.textInput}
          value={tcpConfig.port}
          onChangeText={(v) => setTcpConfig({ ...tcpConfig, port: v })}
          placeholder="88"
          keyboardType="numeric"
          editable={!isConnected}
        />
        <TextInput
          style={styles.textInput}
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
      <Button mode="outlined" onPress={getAvailablePorts}>
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
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});

export default ConnectionSetup;

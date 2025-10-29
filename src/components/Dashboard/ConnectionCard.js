import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button, TextInput, SegmentedButtons } from 'react-native-paper';
import DashboardCard from '../UI/DashboardCard';

const ConnectionCard = ({ ecrService, onConnectionChange, isConnected }) => {
  const [connectionType, setConnectionType] = useState('serial');
  const [serialConfig, setSerialConfig] = useState({
    baudRate: '9600',
    dataBits: '8',
    stopBits: '1',
    parity: '0'
  });
  const [tcpConfig, setTcpConfig] = useState({
    host: '192.168.1.100',
    port: '8000'
  });
  const [connecting, setConnecting] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);

  useEffect(() => {
    if (connectionType === 'serial') {
      loadUSBDevices();
    }
  }, [connectionType]);

  const loadUSBDevices = async () => {
    try {
      const devices = await ecrService.getSavedUSBDevices();
      setAvailableDevices(devices || []);
    } catch (error) {
      console.error('Failed to load USB devices:', error);
    }
  };

  const handleConnect = async () => {
    if (isConnected) {
      await handleDisconnect();
      return;
    }

    setConnecting(true);
    try {
      let result;
      if (connectionType === 'serial') {
        if (availableDevices.length > 0) {
          result = await ecrService.connectToUSBDevice(availableDevices[0].deviceId);
        } else {
          result = await ecrService.connectSerial({
            baudRate: parseInt(serialConfig.baudRate),
            dataBits: parseInt(serialConfig.dataBits),
            stopBits: parseInt(serialConfig.stopBits),
            parity: parseInt(serialConfig.parity)
          });
        }
      } else {
        result = await ecrService.connectTCP({
          host: tcpConfig.host,
          port: parseInt(tcpConfig.port)
        });
      }

      if (result?.success) {
        onConnectionChange?.(true, {
          name: connectionType === 'serial' ? 
            (availableDevices[0]?.alias || 'USB Device') : 
            `${tcpConfig.host}:${tcpConfig.port}`,
          type: connectionType.toUpperCase(),
          port: connectionType === 'serial' ? serialConfig.baudRate : tcpConfig.port
        });
      }
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    try {
      await ecrService.disconnect();
      onConnectionChange?.(false, null);
    } catch (error) {
      console.error('Disconnect failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <DashboardCard
      title="ECR Connection"
      subtitle={isConnected ? 'Connected and ready' : 'Configure and connect to ECR terminal'}
      icon="ethernet-cable"
      cardType="action"
      status={isConnected ? 'success' : 'info'}
      fullWidth={true}
    >
      <View style={styles.connectionForm}>
        {/* Connection Type Selector */}
        <SegmentedButtons
          value={connectionType}
          onValueChange={setConnectionType}
          buttons={[
            { value: 'serial', label: 'USB/Serial' },
            { value: 'tcp', label: 'TCP/IP' }
          ]}
          style={styles.segmentedButtons}
          disabled={isConnected}
        />

        {/* Serial Configuration */}
        {connectionType === 'serial' && (
          <View style={styles.configSection}>
            {availableDevices.length > 0 ? (
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceLabel}>Available Device:</Text>
                <Text style={styles.deviceName}>
                  {availableDevices[0].alias || availableDevices[0].deviceName}
                </Text>
              </View>
            ) : (
              <View style={styles.configRow}>
                <TextInput
                  label="Baud Rate"
                  value={serialConfig.baudRate}
                  onChangeText={(value) => setSerialConfig(prev => ({ ...prev, baudRate: value }))}
                  mode="outlined"
                  style={styles.configInput}
                  disabled={isConnected}
                  dense
                />
                <TextInput
                  label="Data Bits"
                  value={serialConfig.dataBits}
                  onChangeText={(value) => setSerialConfig(prev => ({ ...prev, dataBits: value }))}
                  mode="outlined"
                  style={styles.configInput}
                  disabled={isConnected}
                  dense
                />
              </View>
            )}
          </View>
        )}

        {/* TCP Configuration */}
        {connectionType === 'tcp' && (
          <View style={styles.configSection}>
            <View style={styles.configRow}>
              <TextInput
                label="IP Address"
                value={tcpConfig.host}
                onChangeText={(value) => setTcpConfig(prev => ({ ...prev, host: value }))}
                mode="outlined"
                style={[styles.configInput, { flex: 2 }]}
                disabled={isConnected}
                dense
              />
              <TextInput
                label="Port"
                value={tcpConfig.port}
                onChangeText={(value) => setTcpConfig(prev => ({ ...prev, port: value }))}
                mode="outlined"
                style={[styles.configInput, { flex: 1 }]}
                disabled={isConnected}
                dense
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Connection Button */}
        <Button
          mode={isConnected ? "outlined" : "contained"}
          onPress={handleConnect}
          loading={connecting}
          disabled={connecting}
          style={styles.connectButton}
          buttonColor={isConnected ? undefined : "#2196F3"}
          textColor={isConnected ? "#F44336" : "white"}
        >
          {connecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
        </Button>

        {connectionType === 'serial' && availableDevices.length === 0 && (
          <Button
            mode="text"
            onPress={loadUSBDevices}
            style={styles.refreshButton}
            disabled={connecting || isConnected}
          >
            Refresh USB Devices
          </Button>
        )}
      </View>
    </DashboardCard>
  );
};

const styles = StyleSheet.create({
  connectionForm: {
    marginTop: 12,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  configSection: {
    marginBottom: 16,
  },
  configRow: {
    flexDirection: 'row',
    gap: 12,
  },
  configInput: {
    flex: 1,
  },
  deviceInfo: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceLabel: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },
  deviceName: {
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: '600',
    marginTop: 2,
  },
  connectButton: {
    marginTop: 8,
  },
  refreshButton: {
    marginTop: 4,
  },
});

export default ConnectionCard;
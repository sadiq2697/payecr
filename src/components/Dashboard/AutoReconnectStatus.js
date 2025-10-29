import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DashboardCard from '../UI/DashboardCard';

const AutoReconnectStatus = ({ ecrService, visible = true }) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!visible || !ecrService) return;

    const updateStatus = () => {
      const currentStatus = ecrService.getAutoReconnectStatus();
      setStatus(currentStatus);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [ecrService, visible]);

  const handleForceReconnect = async () => {
    try {
      await ecrService.forceReconnect();
    } catch (error) {
      console.error('Force reconnect failed:', error);
    }
  };

  if (!visible || !status || !status.enabled) {
    return null;
  }

  const getStatusColor = () => {
    if (status.isConnected) return '#4CAF50';
    if (status.isReconnecting) return '#FF9800';
    return '#F44336';
  };

  const getStatusIcon = () => {
    if (status.isConnected) return 'check-circle';
    if (status.isReconnecting) return 'sync';
    return 'alert-circle';
  };

  const getStatusText = () => {
    if (status.isConnected) return 'Connected';
    if (status.isReconnecting) return 'Reconnecting...';
    return `Disconnected (${status.reconnectionAttempts}/${status.maxAttempts})`;
  };

  return (
    <DashboardCard
      title="Auto-Reconnection"
      subtitle={status.lastDevice ? `Device: ${status.lastDevice.deviceId?.slice(-8)}` : 'No device configured'}
      icon="auto-fix"
      cardType="info"
      status={status.isConnected ? 'success' : status.isReconnecting ? 'info' : 'warning'}
    >
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Icon 
            name={getStatusIcon()} 
            size={18} 
            color={getStatusColor()} 
            style={status.isReconnecting ? styles.spinningIcon : null}
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        {status.lastDevice && (
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceLabel}>Last Connected:</Text>
            <Text style={styles.deviceTime}>
              {new Date(status.lastDevice.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}

        {!status.isConnected && !status.isReconnecting && status.lastDevice && (
          <Button
            mode="outlined"
            onPress={handleForceReconnect}
            style={styles.reconnectButton}
            compact
          >
            Force Reconnect
          </Button>
        )}

        {status.isReconnecting && (
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              Reconnecting... ({status.reconnectionAttempts}/{status.maxAttempts})
            </Text>
          </View>
        )}
      </View>
    </DashboardCard>
  );
};

const styles = StyleSheet.create({
  statusContainer: {
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  spinningIcon: {
    // Add rotation animation if needed
  },
  deviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  deviceLabel: {
    fontSize: 12,
    color: '#757575',
  },
  deviceTime: {
    fontSize: 12,
    color: '#424242',
    fontWeight: '500',
  },
  reconnectButton: {
    marginTop: 12,
  },
  progressInfo: {
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#F57C00',
    textAlign: 'center',
  },
});

export default AutoReconnectStatus;
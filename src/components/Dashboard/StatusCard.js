import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DashboardCard from '../UI/DashboardCard';

const StatusIndicator = ({ status, label }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FF9800';
      case 'disconnected': return '#F44336';
      case 'error': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return 'check-circle';
      case 'connecting': return 'clock-outline';
      case 'disconnected': return 'close-circle-outline';
      case 'error': return 'alert-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  return (
    <View style={styles.statusIndicator}>
      <Icon 
        name={getStatusIcon()} 
        size={16} 
        color={getStatusColor()} 
        style={styles.statusIcon}
      />
      <Text style={[styles.statusText, { color: getStatusColor() }]}>
        {label || status}
      </Text>
    </View>
  );
};

const StatusCard = ({ 
  connectionStatus = 'disconnected', 
  deviceInfo = null,
  onConnect,
  onDisconnect,
  lastActivity = null 
}) => {
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  return (
    <DashboardCard
      title="Connection Status"
      subtitle={deviceInfo ? `${deviceInfo.name || 'ECR Terminal'}` : 'No device connected'}
      icon="ethernet"
      cardType="status"
      status={isConnected ? 'success' : 'error'}
      headerAction={
        <StatusIndicator 
          status={connectionStatus} 
          label={connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
        />
      }
    >
      <View style={styles.statusDetails}>
        {isConnected && deviceInfo && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Device:</Text>
              <Text style={styles.detailValue}>{deviceInfo.name || 'ECR Terminal'}</Text>
            </View>
            
            {deviceInfo.type && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{deviceInfo.type}</Text>
              </View>
            )}
            
            {deviceInfo.port && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Port:</Text>
                <Text style={styles.detailValue}>{deviceInfo.port}</Text>
              </View>
            )}
          </>
        )}
        
        {!isConnected && !isConnecting && (
          <Text style={styles.disconnectedMessage}>
            No ECR terminal connected. Use the connection setup to establish a connection.
          </Text>
        )}
        
        {isConnecting && (
          <Text style={styles.connectingMessage}>
            Establishing connection to ECR terminal...
          </Text>
        )}
        
        {lastActivity && (
          <View style={[styles.detailRow, styles.lastActivityRow]}>
            <Text style={styles.detailLabel}>Last Activity:</Text>
            <Text style={styles.detailValue}>
              {new Date(lastActivity).toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>
    </DashboardCard>
  );
};

const styles = StyleSheet.create({
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lastActivityRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#212121',
    fontWeight: '400',
  },
  disconnectedMessage: {
    fontSize: 13,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
  },
  connectingMessage: {
    fontSize: 13,
    color: '#FF9800',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
  },
});

export default StatusCard;
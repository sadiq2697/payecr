import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DashboardCard from '../UI/DashboardCard';
import AnimatedStatusIndicator from '../AnimatedStatusIndicator';

const PrinterStatusCard = ({ 
  printerService, 
  onTestPrint, 
  onManagePrinters,
  visible = true 
}) => {
  const [printerStatus, setPrinterStatus] = useState(null);
  const [isTestPrinting, setIsTestPrinting] = useState(false);

  useEffect(() => {
    if (!visible || !printerService) return;

    const updateStatus = () => {
      const status = printerService.getConnectionStatus();
      setPrinterStatus(status);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 3000); // Update every 3 seconds

    // Listen for printer events
    const listeners = [];
    
    listeners.push(
      printerService.on('printerConnected', (data) => {
        updateStatus();
      })
    );
    
    listeners.push(
      printerService.on('printerDisconnected', (data) => {
        updateStatus();
      })
    );
    
    listeners.push(
      printerService.on('printComplete', (result) => {
        setIsTestPrinting(false);
      })
    );
    
    listeners.push(
      printerService.on('printerError', (error) => {
        setIsTestPrinting(false);
      })
    );

    return () => {
      clearInterval(interval);
      listeners.forEach(listener => listener.remove());
    };
  }, [printerService, visible]);

  const handleTestPrint = async () => {
    if (!printerStatus?.isConnected) {
      onManagePrinters?.();
      return;
    }

    setIsTestPrinting(true);
    
    try {
      const result = await printerService.printText(
        '=== PRINTER TEST ===\n\nPayECR System\n\nPrinter Status: Online\nTest Time: ' + 
        new Date().toLocaleString() + '\n\n--- Test Complete ---\n\n',
        {
          fontSize: 'normal',
          alignment: 'center'
        }
      );
      
      onTestPrint?.(result);
    } catch (error) {
      console.error('Test print failed:', error);
      onTestPrint?.({ success: false, error: error.message });
    }
  };

  if (!visible) {
    return null;
  }

  // Determine card status and styling
  const getStatusInfo = () => {
    if (!printerStatus) {
      return {
        status: 'warning',
        title: 'Printer Service',
        subtitle: 'Service not available',
        statusText: 'Unavailable',
        statusColor: '#f44336',
        statusIcon: 'printer-off',
        canTestPrint: false,
      };
    }

    // Check if there's an error even if status says connected
    if (printerStatus.lastError) {
      return {
        status: 'error',
        title: 'Printer Error',
        subtitle: 'Connection failed',
        statusText: 'Error',
        statusColor: '#f44336',
        statusIcon: 'printer-alert',
        canTestPrint: false,
      };
    }

    if (printerStatus.isConnected) {
      return {
        status: 'success',
        title: 'Printer Ready',
        subtitle: `${printerStatus.connectionType || 'Unknown'} printer connected`,
        statusText: 'Connected',
        statusColor: '#4CAF50',
        statusIcon: 'printer-check',
        canTestPrint: true,
      };
    }

    return {
      status: 'info',
      title: 'Printer Setup',
      subtitle: 'No printer connected',
      statusText: 'Disconnected',
      statusColor: '#FF9800',
      statusIcon: 'printer-alert',
      canTestPrint: false,
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <DashboardCard
      title={statusInfo.title}
      subtitle={statusInfo.subtitle}
      icon="printer"
      cardType="info"
      status={statusInfo.status}
      headerAction={
        <Button 
          mode="outlined" 
          onPress={onManagePrinters}
          compact
        >
          Manage
        </Button>
      }
    >
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Icon 
            name={statusInfo.statusIcon}
            size={18} 
            color={statusInfo.statusColor} 
          />
          <Text style={[styles.statusText, { color: statusInfo.statusColor }]}>
            {statusInfo.statusText}
          </Text>
          <AnimatedStatusIndicator 
            status={printerStatus?.isConnected ? 'connected' : 'disconnected'}
            size={12}
          />
        </View>

        {printerStatus?.isConnected && printerStatus.lastConnectedDevice && (
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceLabel}>Device:</Text>
            <Text style={styles.deviceValue}>
              {typeof printerStatus.lastConnectedDevice === 'string' 
                ? printerStatus.lastConnectedDevice 
                : printerStatus.lastConnectedDevice.type || printerStatus.lastConnectedDevice.name || 'Unknown Device'
              }
            </Text>
          </View>
        )}

        {printerStatus?.lastError && (
          <View style={styles.errorInfo}>
            <Icon name="alert-circle" size={14} color="#F44336" />
            <Text style={styles.errorText} numberOfLines={2}>
              {typeof printerStatus.lastError === 'string' 
                ? printerStatus.lastError 
                : printerStatus.lastError.message || 'Unknown printer error'
              }
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          mode={statusInfo.canTestPrint ? "contained" : "outlined"}
          onPress={statusInfo.canTestPrint ? handleTestPrint : onManagePrinters}
          loading={isTestPrinting}
          disabled={isTestPrinting}
          style={styles.actionButton}
          compact
        >
          {statusInfo.canTestPrint ? 'Test Print' : 'Connect Printer'}
        </Button>
      </View>

      {/* Quick stats */}
      {printerStatus?.isConnected && (
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Status</Text>
            <Chip 
              style={[styles.statusChip, { backgroundColor: statusInfo.statusColor + '20' }]}
              textStyle={{ color: statusInfo.statusColor, fontSize: 10 }}
              compact
            >
              READY
            </Chip>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Type</Text>
            <Text style={styles.statValue}>
              {String(printerStatus.connectionType || 'Unknown')}
            </Text>
          </View>
        </View>
      )}
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
    flex: 1,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  deviceLabel: {
    fontSize: 12,
    color: '#757575',
    marginRight: 8,
  },
  deviceValue: {
    fontSize: 12,
    color: '#424242',
    fontWeight: '500',
  },
  errorInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginLeft: 8,
    flex: 1,
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#757575',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 12,
    color: '#424242',
    fontWeight: '500',
  },
  statusChip: {
    height: 20,
  },
});

export default PrinterStatusCard;
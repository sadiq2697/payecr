import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  BackHandler,
} from 'react-native';
import { Card, Divider, Button, IconButton } from 'react-native-paper';
import { CONNECTION_TYPES, ECR_CONSTANTS } from '../../utils/Constants';
import useAlert from '../../hooks/useAlert';
import LazyInput from './LazyInput';
import VirtualizedList, { ListItem, Separator } from './VirtualizedList';
import SwipeableCard from './SwipeableCard';
import AnimatedStatusIndicator from '../AnimatedStatusIndicator';
import { useThrottledCallback } from '../../hooks/useThrottledCallback';

const OptimizedConnectionSetup = ({ ecrService, onConnectionChange }) => {
  const [connectionType, setConnectionType] = useState(CONNECTION_TYPES.SERIAL);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // USB Device Management State
  const [savedUSBDevices, setSavedUSBDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedUSBDevice, setSelectedUSBDevice] = useState(null);
  
  // Device state tracking for auto-connect optimization
  const previousDeviceStates = useRef({});
  const intervalRef = useRef(null);
  const lastAutoConnectAttempt = useRef(0);
  const AUTO_CONNECT_COOLDOWN = 10000;
  
  // Modal states
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [showExitModal, setShowExitModal] = useState(false);
  
  // Connection configs
  const [tcpConfig, setTcpConfig] = useState({
    host: '192.168.1.100',
    port: ECR_CONSTANTS.TCP_CONFIG.PORT.toString(),
    timeout: ECR_CONSTANTS.TIMEOUTS.COMMAND.toString(),
  });

  const [serialConfig, setSerialConfig] = useState({
    baudRate: ECR_CONSTANTS.SERIAL_CONFIG.BAUD_RATE.toString(),
  });
  
  // Centralized Alert System
  const {
    alertState,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showDelete,
    showConnectionStatus
  } = useAlert();

  // Throttled connection status check
  const checkConnectionStatus = useThrottledCallback(
    useCallback(async () => {
      try {
        const connected = await ecrService.checkConnection();
        setIsConnected(connected);
        onConnectionChange?.(connected);
      } catch (error) {
        setIsConnected(false);
        onConnectionChange?.(false);
        console.error("Connection status check failed:", error);
      }
    }, [ecrService, onConnectionChange]),
    1000
  );

  // Optimized USB device loading
  const loadSavedUSBDevices = useCallback(async () => {
    try {
      const devices = await ecrService.getSavedUSBDevices();
      setSavedUSBDevices(devices || []);
    } catch (error) {
      console.error('Error loading saved USB devices:', error);
    }
  }, [ecrService]);

  // Throttled device scanning
  const scanForUSBDevices = useThrottledCallback(
    useCallback(async () => {
      setIsScanning(true);
      try {
        const devices = await ecrService.scanForUSBDevices();
        
        if (devices.length === 0) {
          showWarning('No Devices Found', 'No USB devices detected. Please connect your ECR terminal.');
          return;
        }
        
        setScannedDevices(devices);
        setShowDeviceModal(true);
      } catch (error) {
        showError('Scan Error', error.message || 'Failed to scan for USB devices');
      } finally {
        setIsScanning(false);
      }
    }, [ecrService, showWarning, showError]),
    2000
  );

  // Optimized USB device connection
  const connectToUSBDevice = useCallback(async (device) => {
    if (!device.isOnline) {
      showWarning('Device Offline', `${device.displayName || device.deviceName} is not connected.`);
      return;
    }
    
    if (!device.hasPermission) {
      try {
        await ecrService.requestUSBPermission(device.deviceId);
        showWarning('Permission Required', 'Please grant USB permission for the device.');
        return;
      } catch (error) {
        showError('Permission Error', error.message || 'Failed to request USB permission');
        return;
      }
    }
    
    setIsConnecting(true);
    try {
      const result = await ecrService.connectToUSBDevice(device.deviceId);
      
      if (result.success) {
        setIsConnected(true);
        setSelectedUSBDevice(device);
        onConnectionChange?.(true);
        showConnectionStatus(true, device.displayName || device.deviceName);
      } else {
        showError('Connection Failed', result.message || 'Failed to connect to USB device');
      }
    } catch (error) {
      showError('Connection Error', error.message || 'Failed to connect to USB device');
    } finally {
      setIsConnecting(false);
    }
  }, [ecrService, onConnectionChange, showWarning, showError, showConnectionStatus]);

  // Optimized device removal
  const removeUSBDevice = useCallback((device) => {
    showDelete(
      'Remove Device',
      `Are you sure you want to remove "${device.displayName || device.deviceName}"?`,
      async () => {
        try {
          await ecrService.removeUSBDevice(device.deviceId);
          await loadSavedUSBDevices();
          showSuccess('Device Removed', `"${device.displayName || device.deviceName}" has been removed.`);
        } catch (error) {
          showError('Remove Error', error.message || 'Failed to remove USB device');
        }
      }
    );
  }, [ecrService, loadSavedUSBDevices, showDelete, showSuccess, showError]);

  // Auto-reconnect toggle
  const toggleAutoReconnect = useCallback(async (device) => {
    try {
      await ecrService.toggleUSBAutoReconnect(device.deviceId, !device.autoReconnect);
      await loadSavedUSBDevices();
    } catch (error) {
      showError('Error', 'Failed to update auto-reconnect setting');
    }
  }, [ecrService, loadSavedUSBDevices, showError]);

  // Optimized device monitoring with error handling
  useEffect(() => {
    let mounted = true;
    
    const initializeDevices = async () => {
      await checkConnectionStatus();
      await loadSavedUSBDevices();
    };

    initializeDevices();

    // Optimized device status monitoring
    intervalRef.current = setInterval(async () => {
      if (!mounted) return;
      
      try {
        const updatedDevices = await ecrService.getSavedUSBDevices();
        if (!updatedDevices || !mounted) return;

        // Detect status changes efficiently
        const statusChanges = [];
        for (const device of updatedDevices) {
          const previousState = previousDeviceStates.current[device.deviceId];
          if (previousState !== undefined && previousState !== device.isOnline) {
            statusChanges.push({
              device,
              justCameOnline: previousState === false && device.isOnline === true
            });
          }
          previousDeviceStates.current[device.deviceId] = device.isOnline;
        }

        if (statusChanges.length > 0) {
          setSavedUSBDevices(updatedDevices);
          
          // Handle auto-connect for newly online devices
          if (!isConnected && !isConnecting) {
            const autoConnectDevice = statusChanges.find(change => 
              change.justCameOnline && 
              change.device.autoReconnect && 
              change.device.hasPermission
            );
            
            if (autoConnectDevice) {
              const now = Date.now();
              if (now - lastAutoConnectAttempt.current > AUTO_CONNECT_COOLDOWN) {
                lastAutoConnectAttempt.current = now;
                await connectToUSBDevice(autoConnectDevice.device);
              }
            }
          }
        }
      } catch (error) {
        console.error('Device monitoring error:', error);
      }
    }, 3000);

    // Back button handler
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowExitModal(true);
      return true;
    });

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      backHandler.remove();
    };
  }, [checkConnectionStatus, loadSavedUSBDevices, connectToUSBDevice, isConnected, isConnecting, ecrService]);

  // Memoized device list renderer for performance
  const deviceListData = useMemo(() => savedUSBDevices.map(device => ({
    ...device,
    key: device.deviceId
  })), [savedUSBDevices]);

  const renderDeviceItem = useCallback(({ item: device }) => (
    <SwipeableCard
      leftAction={
        <View style={styles.swipeAction}>
          <IconButton icon="link" iconColor="#fff" size={24} />
          <Text style={styles.swipeText}>Connect</Text>
        </View>
      }
      rightAction={
        <View style={styles.swipeAction}>
          <IconButton icon="delete" iconColor="#fff" size={24} />
          <Text style={styles.swipeText}>Remove</Text>
        </View>
      }
      onSwipeLeft={() => connectToUSBDevice(device)}
      onSwipeRight={() => removeUSBDevice(device)}
      disabled={isConnecting}
    >
      <ListItem style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>
              {device.displayName || device.deviceName || 'Unknown Device'}
            </Text>
            <Text style={styles.deviceDetails}>
              {device.vendorId}:{device.productId} • {device.baudRate} bps
            </Text>
          </View>
          <AnimatedStatusIndicator
            status={device.isOnline ? 'online' : 'offline'}
            size={12}
          />
        </View>
        
        <View style={styles.deviceActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.connectButton]}
            onPress={() => connectToUSBDevice(device)}
            disabled={!device.isOnline || !device.hasPermission || isConnecting}
          >
            <Text style={styles.connectButtonText}>
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => toggleAutoReconnect(device)}
          >
            <Text style={[
              styles.toggleText,
              device.autoReconnect && styles.toggleTextActive
            ]}>
              Auto: {device.autoReconnect ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
      </ListItem>
    </SwipeableCard>
  ), [connectToUSBDevice, removeUSBDevice, toggleAutoReconnect, isConnecting]);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Connection Setup</Text>
          
          <VirtualizedList
            data={deviceListData}
            renderItem={renderDeviceItem}
            keyExtractor={(item) => item.key}
            ItemSeparatorComponent={() => <Separator height={8} color="transparent" />}
            estimatedItemSize={80}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No saved devices</Text>
              </View>
            }
            ListHeaderComponent={
              <View style={styles.header}>
                <Button
                  mode="contained"
                  onPress={scanForUSBDevices}
                  loading={isScanning}
                  disabled={isScanning}
                  style={styles.scanButton}
                >
                  {isScanning ? 'Scanning...' : 'Scan for Devices'}
                </Button>
              </View>
            }
          />
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  header: {
    marginBottom: 16,
  },
  scanButton: {
    marginVertical: 8,
  },
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceDetails: {
    fontSize: 12,
    color: '#666',
  },
  deviceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  connectButton: {
    backgroundColor: '#2196F3',
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toggleText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  toggleTextActive: {
    color: '#2196F3',
    fontWeight: '500',
  },
  swipeAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default OptimizedConnectionSetup;
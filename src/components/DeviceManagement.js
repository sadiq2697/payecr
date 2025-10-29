import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Button,
  Divider,
  Chip,
  IconButton,
  Searchbar,
  FAB,
  List,
  ProgressBar,
  Badge,
} from 'react-native-paper';
import { CONNECTION_TYPES } from '../utils/Constants';
import AnimatedStatusIndicator from './AnimatedStatusIndicator';
import useAlert from '../hooks/useAlert';
import ResponsiveGrid from './UI/ResponsiveGrid';
import DashboardCard from './UI/DashboardCard';

const DeviceManagement = ({ ecrService, onConnectionChange }) => {
  // Device state
  const [savedDevices, setSavedDevices] = useState([]);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionType, setConnectionType] = useState(CONNECTION_TYPES.USB);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const { showSuccess, showError, showWarning } = useAlert();

  const deviceTypes = [
    { key: CONNECTION_TYPES.USB, label: 'USB Devices', icon: 'usb' },
    { key: CONNECTION_TYPES.SERIAL, label: 'Serial Devices', icon: 'cable-data' },
    { key: CONNECTION_TYPES.TCP, label: 'Network Devices', icon: 'wifi' },
  ];

  useEffect(() => {
    loadSavedDevices();
    
    // Set up periodic device status updates - increased to 30 seconds to reduce polling
    const interval = setInterval(() => {
      updateDeviceStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [connectionType]);

  const loadSavedDevices = useCallback(async () => {
    try {
      let devices = [];
      
      switch (connectionType) {
        case CONNECTION_TYPES.USB:
          devices = await ecrService.getSavedUSBDevices();
          break;
        case CONNECTION_TYPES.SERIAL:
          // Serial devices would be loaded from configuration if implemented
          devices = [];
          break;
        case CONNECTION_TYPES.TCP:
          // TCP devices would be loaded from configuration if implemented
          devices = [];
          break;
        default:
          devices = [];
      }
      
      setSavedDevices(devices || []);
    } catch (error) {
      console.error('Failed to load saved devices:', error);
      showError('Load Error', 'Failed to load saved devices');
    }
  }, [connectionType, ecrService, showError]);

  const updateDeviceStatus = useCallback(async () => {
    if (connectionType === CONNECTION_TYPES.USB) {
      try {
        // Update USB device online status
        const updatedDevices = await ecrService.getSavedUSBDevices();
        setSavedDevices(updatedDevices || []);
      } catch (error) {
        console.error('Failed to update device status:', error);
      }
    }
  }, [connectionType, ecrService]);

  const scanForDevices = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      let devices = [];
      
      // Simulate scanning progress
      const progressInterval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + 0.1, 0.9));
      }, 100);
      
      switch (connectionType) {
        case CONNECTION_TYPES.USB:
          devices = await ecrService.scanForUSBDevices();
          break;
        case CONNECTION_TYPES.SERIAL:
          // Serial port scanning would need to be implemented
          devices = [];
          showWarning('Not Implemented', 'Serial port scanning is not yet implemented');
          break;
        case CONNECTION_TYPES.TCP:
          // Network device discovery would need to be implemented
          devices = [];
          showWarning('Not Implemented', 'Network device discovery is not yet implemented');
          break;
        default:
          devices = [];
      }
      
      clearInterval(progressInterval);
      setScanProgress(1);
      
      setTimeout(() => {
        setScannedDevices(devices);
        setShowScanModal(true);
        setIsScanning(false);
        setScanProgress(0);
      }, 500);
      
    } catch (error) {
      setIsScanning(false);
      setScanProgress(0);
      console.error('Error scanning for devices:', error);
      showError('Scan Error', error.message || 'Failed to scan for devices');
    }
  }, [connectionType, ecrService, showError]);

  const connectToDevice = useCallback(async (device) => {
    setIsConnecting(true);
    
    try {
      let result;
      
      switch (connectionType) {
        case CONNECTION_TYPES.USB:
          result = await ecrService.connectToUSBDevice?.(device);
          break;
        case CONNECTION_TYPES.SERIAL:
          result = await ecrService.connectSerial(device.config || {});
          break;
        case CONNECTION_TYPES.TCP:
          result = await ecrService.connectTCP(device.config || {});
          break;
        default:
          throw new Error('Unsupported connection type');
      }
      
      if (result?.success) {
        showSuccess('Connected', `Connected to ${device.displayName || device.deviceName}`);
        onConnectionChange?.(true);
        await loadSavedDevices();
      } else {
        showError('Connection Failed', result?.error || 'Failed to connect to device');
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      showError('Connection Error', error.message);
    } finally {
      setIsConnecting(false);
    }
  }, [connectionType, ecrService, showSuccess, showError, onConnectionChange, loadSavedDevices]);

  const disconnectFromDevice = useCallback(async (device) => {
    try {
      await ecrService.disconnect();
      showSuccess('Disconnected', `Disconnected from ${device.displayName || device.deviceName}`);
      onConnectionChange?.(false);
      await loadSavedDevices();
    } catch (error) {
      console.error('Disconnect error:', error);
      showError('Disconnect Error', error.message);
    }
  }, [ecrService, showSuccess, showError, onConnectionChange, loadSavedDevices]);

  const saveDevice = async (device) => {
    try {
      let result;
      
      switch (connectionType) {
        case CONNECTION_TYPES.USB:
          const alias = device.displayName || device.deviceName || `USB Device ${device.vendorId}:${device.productId}`;
          result = await ecrService.saveUSBDevice(device, 115200, alias);
          break;
        case CONNECTION_TYPES.SERIAL:
          // Serial device saving would need to be implemented
          showWarning('Not Implemented', 'Serial device saving is not yet implemented');
          return;
        case CONNECTION_TYPES.TCP:
          // TCP device saving would need to be implemented  
          showWarning('Not Implemented', 'TCP device saving is not yet implemented');
          return;
        default:
          throw new Error('Unsupported device type');
      }
      
      if (result?.success !== false) {
        showSuccess('Device Saved', `Device "${device.displayName || device.deviceName}" has been saved`);
        await loadSavedDevices();
        setShowScanModal(false);
      } else {
        showError('Save Error', result?.error || 'Failed to save device');
      }
      
    } catch (error) {
      console.error('Error saving device:', error);
      showError('Save Error', error.message);
    }
  };

  const deleteDevice = (device) => {
    Alert.alert(
      'Delete Device',
      `Are you sure you want to delete "${device.displayName || device.deviceName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ecrService.deleteUSBDevice?.(device.deviceId);
              showSuccess('Device Deleted', 'Device has been removed');
              await loadSavedDevices();
            } catch (error) {
              showError('Delete Error', error.message);
            }
          },
        },
      ]
    );
  };

  const viewDeviceDetails = (device) => {
    setSelectedDevice(device);
    setShowDeviceModal(true);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSavedDevices();
    setRefreshing(false);
  }, [loadSavedDevices]);

  const filteredDevices = savedDevices.filter(device =>
    (device.displayName || device.deviceName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (device.deviceId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDeviceItem = ({ item }) => {
    const isOnline = item.isOnline || item.status === 'connected';
    const hasPermission = item.hasPermission !== false;
    
    return (
      <Card style={styles.deviceCard}>
        <Card.Content>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceNameRow}>
                <AnimatedStatusIndicator
                  status={isOnline ? 'online' : 'offline'}
                  size={12}
                />
                <Text style={styles.deviceName}>
                  {item.displayName || item.deviceName || 'Unknown Device'}
                </Text>
                {!hasPermission && (
                  <Badge style={styles.permissionBadge} size={16}>
                    !
                  </Badge>
                )}
              </View>
              
              <Text style={styles.deviceId}>
                {item.deviceId || `${item.vendorId}:${item.productId}` || 'No ID'}
              </Text>
              
              {item.lastConnected && (
                <Text style={styles.lastConnected}>
                  Last connected: {new Date(item.lastConnected).toLocaleDateString()}
                </Text>
              )}
            </View>
            
            <View style={styles.deviceActions}>
              <Chip
                style={[styles.statusChip, {
                  backgroundColor: isOnline ? '#4CAF50' : '#f44336'
                }]}
                textStyle={{ color: 'white', fontSize: 12 }}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Chip>
              
              <View style={styles.actionButtons}>
                <IconButton
                  icon="information"
                  size={20}
                  onPress={() => viewDeviceDetails(item)}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => deleteDevice(item)}
                />
              </View>
            </View>
          </View>
        </Card.Content>
        
        <Card.Actions>
          {isOnline ? (
            <Button
              mode="contained"
              onPress={() => connectToDevice(item)}
              disabled={isConnecting}
              loading={isConnecting}
              style={styles.connectButton}
            >
              Connect
            </Button>
          ) : (
            <Button
              mode="outlined"
              onPress={() => connectToDevice(item)}
              disabled={true}
            >
              Device Offline
            </Button>
          )}
        </Card.Actions>
      </Card>
    );
  };

  const renderScannedDeviceItem = ({ item }) => (
    <List.Item
      title={item.displayName || item.deviceName || 'Unknown Device'}
      description={item.deviceId || `${item.vendorId}:${item.productId}` || 'No ID'}
      left={(props) => <List.Icon {...props} icon="devices" />}
      right={(props) => (
        <View style={styles.scannedDeviceActions}>
          <Button
            mode="contained"
            onPress={() => saveDevice(item)}
            compact
          >
            Add
          </Button>
        </View>
      )}
      style={styles.scannedDeviceItem}
    />
  );

  return (
    <ResponsiveGrid scrollable={true}>
      <DashboardCard
        title="Device Management"
        subtitle="Manage and configure your ECR devices"
        icon="devices"
        cardType="info"
        fullWidth={true}
      >
      
        {/* Device Type Selector */}
        <View style={styles.deviceTypeSelector}>
          {deviceTypes.map(type => (
            <Chip
              key={type.key}
              selected={connectionType === type.key}
              onPress={() => setConnectionType(type.key)}
              icon={type.icon}
              style={[styles.typeChip, {
                backgroundColor: connectionType === type.key ? '#2196F3' : 'transparent'
              }]}
              textStyle={{
                color: connectionType === type.key ? 'white' : '#2196F3'
              }}
            >
              {type.label}
            </Chip>
          ))}
        </View>
      </DashboardCard>

      {/* Search */}
      <DashboardCard
        title="Device Search"
        subtitle="Find and filter devices"
        icon="magnify"
        cardType="action"
      >
        <Searchbar
          placeholder="Search devices..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </DashboardCard>

      {/* Scanning Progress */}
      {isScanning && (
        <DashboardCard
          title="Device Scan"
          subtitle="Scanning for devices..."
          icon="radar"
          cardType="info"
          status="info"
        >
          <ProgressBar progress={scanProgress} style={styles.progressBar} />
        </DashboardCard>
      )}

      {/* Devices List */}
      <DashboardCard
        title="Saved Devices"
        subtitle={`${filteredDevices.length} device${filteredDevices.length !== 1 ? 's' : ''} found`}
        icon="content-save"
        cardType="default"
        fullWidth={true}
        headerAction={
          <FAB
            icon={isScanning ? "loading" : "radar"}
            onPress={scanForDevices}
            disabled={isScanning}
            label="Scan"
            size="small"
          />
        }
      >
        <FlatList
          data={filteredDevices}
          keyExtractor={(item) => item.deviceId || item.id}
          renderItem={renderDeviceItem}
          style={styles.devicesList}
          contentContainerStyle={styles.devicesListContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No saved devices</Text>
              <Text style={styles.emptySubtext}>
                Scan for devices to get started
              </Text>
            </View>
          }
        />
      </DashboardCard>


      {/* Device Details Modal */}
      <Modal
        visible={showDeviceModal}
        animationType="slide"
        onRequestClose={() => setShowDeviceModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Title>Device Details</Title>
            <IconButton
              icon="close"
              onPress={() => setShowDeviceModal(false)}
            />
          </View>

          {selectedDevice && (
            <FlatList
              data={[
                { label: 'Device Name', value: selectedDevice.displayName || selectedDevice.deviceName || 'Unknown' },
                { label: 'Device ID', value: selectedDevice.deviceId || 'N/A' },
                { label: 'Vendor ID', value: selectedDevice.vendorId || 'N/A' },
                { label: 'Product ID', value: selectedDevice.productId || 'N/A' },
                { label: 'Status', value: selectedDevice.isOnline ? 'Online' : 'Offline' },
                { label: 'Permission', value: selectedDevice.hasPermission ? 'Granted' : 'Required' },
                { label: 'Baud Rate', value: selectedDevice.baudRate?.toString() || 'N/A' },
                { label: 'Last Connected', value: selectedDevice.lastConnected ? new Date(selectedDevice.lastConnected).toLocaleString() : 'Never' },
                { label: 'Connection Count', value: selectedDevice.connectionCount?.toString() || '0' },
              ]}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{item.label}:</Text>
                  <Text style={styles.detailValue}>{item.value}</Text>
                </View>
              )}
              style={styles.modalContent}
            />
          )}
        </View>
      </Modal>

      {/* Scan Results Modal */}
      <Modal
        visible={showScanModal}
        animationType="slide"
        onRequestClose={() => setShowScanModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Title>Discovered Devices</Title>
            <IconButton
              icon="close"
              onPress={() => setShowScanModal(false)}
            />
          </View>

          <FlatList
            data={scannedDevices}
            keyExtractor={(item) => item.deviceId || item.id || Math.random().toString()}
            renderItem={renderScannedDeviceItem}
            style={styles.modalContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No devices found</Text>
                <Text style={styles.emptySubtext}>
                  Make sure your device is connected and powered on
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </ResponsiveGrid>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  deviceTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  typeChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  searchbar: {
    marginBottom: 16,
  },
  scanningCard: {
    marginBottom: 16,
    elevation: 2,
  },
  scanningText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
  },
  devicesList: {
    flex: 1,
  },
  devicesListContent: {
    paddingBottom: 80,
  },
  deviceCard: {
    marginBottom: 12,
    elevation: 2,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  permissionBadge: {
    backgroundColor: '#FF9800',
    marginLeft: 8,
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  lastConnected: {
    fontSize: 11,
    color: '#999',
  },
  deviceActions: {
    alignItems: 'flex-end',
  },
  statusChip: {
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  connectButton: {
    marginLeft: 8,
  },
  scannedDeviceItem: {
    backgroundColor: '#fff',
    marginBottom: 1,
  },
  scannedDeviceActions: {
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  scanFab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailValue: {
    flex: 2,
    fontSize: 14,
    color: '#666',
  },
});

export default DeviceManagement;
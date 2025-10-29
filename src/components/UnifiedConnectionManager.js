import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Button,
  Chip,
  IconButton,
  Searchbar,
  SegmentedButtons,
  FAB,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DashboardCard from './UI/DashboardCard';
import AnimatedStatusIndicator from './AnimatedStatusIndicator';

const UnifiedConnectionManager = ({ 
  ecrService, 
  printerService, 
  onECRConnectionChange,
  onPrinterConnectionChange 
}) => {
  // State for devices
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // Connection states
  const [ecrStatus, setECRStatus] = useState(null);
  const [printerStatus, setPrinterStatus] = useState(null);
  
  // UI state
  const [deviceType, setDeviceType] = useState('all');
  const [connectionType, setConnectionType] = useState('usb');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceConfig, setNewDeviceConfig] = useState({
    name: '',
    address: '',
    port: '',
  });

  useEffect(() => {
    loadDevices();
    checkConnectionStatuses();
  }, []);

  useEffect(() => {
    filterDevices();
  }, [devices, searchQuery, deviceType]);

  const loadDevices = async () => {
    try {
      // Load saved devices from AsyncStorage or other storage
      // For now, we'll start with empty array
      const savedDevices = [];
      setDevices(savedDevices);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const checkConnectionStatuses = () => {
    // Check ECR status
    if (ecrService) {
      const ecrConnected = ecrService.isConnected();
      setECRStatus({
        isConnected: ecrConnected,
        deviceInfo: ecrService.lastConnectedDevice || { name: 'ECR Terminal' },
        type: 'ECR Terminal'
      });
    }

    // Check Printer status  
    if (printerService) {
      const printerConnected = printerService.getConnectionStatus();
      setPrinterStatus(printerConnected);
    }
  };

  const filterDevices = () => {
    let filtered = devices;
    
    if (deviceType !== 'all') {
      filtered = filtered.filter(device => device.type.toLowerCase() === deviceType);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(device => 
        device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredDevices(filtered);
  };

  const scanForDevices = async () => {
    setIsScanning(true);
    try {
      const scannedDevices = [];
      
      // Scan for USB devices (both ECR and Printer)
      if (connectionType === 'usb') {
        // Get ECR USB devices
        // const ecrUSBDevices = await ecrService.getUSBDevices();
        // Get Printer USB devices
        if (printerService) {
          const printerUSBDevices = await printerService.getUSBDevices();
          
          printerUSBDevices.forEach(device => {
            scannedDevices.push({
              id: `printer_${device.path}`,
              name: device.name || device.path,
              address: device.path,
              type: 'printer',
              deviceType: 'USB Printer',
              connectionType: 'usb',
              isConnected: false,
              canConnect: true,
            });
          });
        }
      }
      
      // Scan for Bluetooth devices
      if (connectionType === 'bluetooth' && printerService) {
        const bluetoothDevices = await printerService.getBluetoothDevices();
        
        bluetoothDevices.forEach(device => {
          scannedDevices.push({
            id: `printer_bt_${device.address}`,
            name: device.name,
            address: device.address,
            type: 'printer',
            deviceType: 'Bluetooth Printer',
            connectionType: 'bluetooth',
            isConnected: false,
            canConnect: true,
          });
        });
      }
      
      // Add scanned devices to the list
      setDevices(prev => {
        const existingIds = prev.map(d => d.id);
        const newDevices = scannedDevices.filter(d => !existingIds.includes(d.id));
        return [...prev, ...newDevices];
      });
      
    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('Scan Failed', error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device) => {
    try {
      let result;
      
      if (device.type === 'ecr') {
        // Connect ECR
        if (device.connectionType === 'serial') {
          result = await ecrService.connect(device.address, parseInt(device.port || '9600'));
        } else {
          result = await ecrService.connect(device.address);
        }
        
        if (result.success) {
          onECRConnectionChange?.(true);
          checkConnectionStatuses();
        }
      } else if (device.type === 'printer') {
        // Connect Printer
        if (device.connectionType === 'usb') {
          result = await printerService.connectUSB(device.address);
        } else if (device.connectionType === 'bluetooth') {
          result = await printerService.connectBluetooth(device.address);
        } else if (device.connectionType === 'network') {
          result = await printerService.connectNetwork(device.address, parseInt(device.port || '9100'));
        }
        
        if (result.success) {
          onPrinterConnectionChange?.(true);
          checkConnectionStatuses();
        }
      }
      
      if (result && !result.success) {
        Alert.alert('Connection Failed', result.error || 'Unknown error');
      }
      
    } catch (error) {
      Alert.alert('Connection Error', error.message);
    }
  };

  const disconnectDevice = async (deviceType) => {
    try {
      if (deviceType === 'ecr' && ecrService) {
        await ecrService.disconnect();
        onECRConnectionChange?.(false);
      } else if (deviceType === 'printer' && printerService) {
        await printerService.disconnect();
        onPrinterConnectionChange?.(false);
      }
      
      checkConnectionStatuses();
    } catch (error) {
      Alert.alert('Disconnect Error', error.message);
    }
  };

  const addManualDevice = () => {
    const newDevice = {
      id: `manual_${Date.now()}`,
      name: newDeviceConfig.name,
      address: newDeviceConfig.address,
      port: newDeviceConfig.port,
      type: deviceType === 'all' ? 'printer' : deviceType,
      deviceType: connectionType === 'network' ? 'Network Device' : 'Manual Device',
      connectionType: connectionType,
      isConnected: false,
      canConnect: true,
      isManual: true,
    };
    
    setDevices(prev => [...prev, newDevice]);
    setNewDeviceConfig({ name: '', address: '', port: '' });
    setShowAddModal(false);
  };

  const renderConnectionStatus = () => (
    <DashboardCard
      title="Connection Status"
      subtitle="Current device connections"
      icon="connection"
      cardType="info"
    >
      <View style={styles.statusContainer}>
        {/* ECR Status */}
        <View style={styles.statusRow}>
          <Icon name="point-of-sale" size={24} color="#2196F3" />
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>ECR Terminal</Text>
            <Text style={styles.statusSubtitle}>
              {ecrStatus?.isConnected ? `Connected to ${ecrStatus.deviceInfo?.port || 'device'}` : 'Not connected'}
            </Text>
          </View>
          <AnimatedStatusIndicator 
            status={ecrStatus?.isConnected ? 'connected' : 'disconnected'}
            size={16}
          />
          {ecrStatus?.isConnected && (
            <Button mode="outlined" compact onPress={() => disconnectDevice('ecr')}>
              Disconnect
            </Button>
          )}
        </View>
        
        {/* Printer Status */}
        <View style={styles.statusRow}>
          <Icon name="printer" size={24} color="#4CAF50" />
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Printer</Text>
            <Text style={styles.statusSubtitle}>
              {printerStatus?.isConnected ? `Connected via ${printerStatus.connectionType}` : 'Not connected'}
            </Text>
          </View>
          <AnimatedStatusIndicator 
            status={printerStatus?.isConnected ? 'connected' : 'disconnected'}
            size={16}
          />
          {printerStatus?.isConnected && (
            <Button mode="outlined" compact onPress={() => disconnectDevice('printer')}>
              Disconnect
            </Button>
          )}
        </View>
      </View>
    </DashboardCard>
  );

  const renderDeviceItem = ({ item: device }) => (
    <Card style={styles.deviceCard}>
      <Card.Content>
        <View style={styles.deviceHeader}>
          <View style={styles.deviceIcon}>
            <Icon 
              name={device.type === 'ecr' ? 'point-of-sale' : 'printer'} 
              size={32} 
              color={device.isConnected ? '#4CAF50' : '#757575'} 
            />
          </View>
          
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceType}>{device.deviceType}</Text>
            <Text style={styles.deviceAddress}>{device.address}</Text>
            {device.port && <Text style={styles.devicePort}>Port: {device.port}</Text>}
          </View>
          
          <View style={styles.deviceActions}>
            <Chip
              style={[styles.statusChip, {
                backgroundColor: device.isConnected ? '#4CAF50' : '#757575'
              }]}
              textStyle={{ color: 'white', fontSize: 12 }}
            >
              {device.isConnected ? 'Connected' : 'Available'}
            </Chip>
            
            <Button
              mode={device.isConnected ? "outlined" : "contained"}
              compact
              onPress={() => device.isConnected ? disconnectDevice(device.type) : connectToDevice(device)}
              style={styles.connectButton}
            >
              {device.isConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderAddDeviceModal = () => (
    <Portal>
      <Modal
        visible={showAddModal}
        onDismiss={() => setShowAddModal(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Add Device Manually</Text>
        
        <TextInput
          label="Device Name"
          value={newDeviceConfig.name}
          onChangeText={(text) => setNewDeviceConfig(prev => ({ ...prev, name: text }))}
          style={styles.input}
        />
        
        <TextInput
          label="Address/Path"
          value={newDeviceConfig.address}
          onChangeText={(text) => setNewDeviceConfig(prev => ({ ...prev, address: text }))}
          style={styles.input}
        />
        
        {connectionType === 'network' && (
          <TextInput
            label="Port (optional)"
            value={newDeviceConfig.port}
            onChangeText={(text) => setNewDeviceConfig(prev => ({ ...prev, port: text }))}
            keyboardType="numeric"
            style={styles.input}
          />
        )}
        
        <View style={styles.modalButtons}>
          <Button mode="outlined" onPress={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={addManualDevice}
            disabled={!newDeviceConfig.name || !newDeviceConfig.address}
          >
            Add Device
          </Button>
        </View>
      </Modal>
    </Portal>
  );

  return (
    <View style={styles.container}>
      {renderConnectionStatus()}
      
      {/* Device Management */}
      <DashboardCard
        title="Device Management"
        subtitle={`${filteredDevices.length} device${filteredDevices.length !== 1 ? 's' : ''} available`}
        icon="devices"
        cardType="default"
        fullWidth={true}
      >
        {/* Controls */}
        <View style={styles.controls}>
          <SegmentedButtons
            value={deviceType}
            onValueChange={setDeviceType}
            buttons={[
              { value: 'all', label: 'All' },
              { value: 'ecr', label: 'ECR' },
              { value: 'printer', label: 'Printer' },
            ]}
            style={styles.segmentedButtons}
          />
          
          <SegmentedButtons
            value={connectionType}
            onValueChange={setConnectionType}
            buttons={[
              { value: 'usb', label: 'USB' },
              { value: 'bluetooth', label: 'Bluetooth' },
              { value: 'network', label: 'Network' },
              { value: 'serial', label: 'Serial' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>
        
        <Searchbar
          placeholder="Search devices..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={scanForDevices}
            loading={isScanning}
            disabled={isScanning}
            style={styles.scanButton}
          >
            {isScanning ? 'Scanning...' : 'Scan Devices'}
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            Add Manual
          </Button>
        </View>
        
        {/* Device List */}
        <FlatList
          data={filteredDevices}
          keyExtractor={(item) => item.id}
          renderItem={renderDeviceItem}
          style={styles.deviceList}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => {
                setRefreshing(true);
                checkConnectionStatuses();
                setRefreshing(false);
              }} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="devices" size={64} color="#E0E0E0" />
              <Text style={styles.emptyText}>No devices found</Text>
              <Text style={styles.emptySubtext}>Scan for devices or add manually</Text>
            </View>
          }
        />
      </DashboardCard>
      
      {renderAddDeviceModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  controls: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  searchbar: {
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  scanButton: {
    flex: 1,
  },
  addButton: {
    flex: 1,
  },
  deviceList: {
    maxHeight: 400,
  },
  deviceCard: {
    marginBottom: 8,
    elevation: 2,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  deviceType: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 2,
  },
  deviceAddress: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  devicePort: {
    fontSize: 12,
    color: '#757575',
  },
  deviceActions: {
    alignItems: 'flex-end',
  },
  statusChip: {
    marginBottom: 8,
  },
  connectButton: {
    minWidth: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#757575',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BDBDBD',
    marginTop: 4,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
});

export default UnifiedConnectionManager;
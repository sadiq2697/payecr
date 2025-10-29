import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal
} from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ResponsiveGrid from './UI/ResponsiveGrid';
import DashboardCard from './UI/DashboardCard';
import { CONNECTION_TYPES, ECR_CONSTANTS } from '../utils/Constants';
import AlertModal from './AlertModal';
import useAlert from '../hooks/useAlert';

const ConnectionSetup = ({ ecrService, printerService, onConnectionChange, onPrinterConnectionChange }) => {
  // Core connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Device management state
  const [savedUSBDevices, setSavedUSBDevices] = useState([]);
  const [selectedUSBDevice, setSelectedUSBDevice] = useState(null);
  const [savedPrinters, setSavedPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerConnectionType, setPrinterConnectionType] = useState(null);
  
  // Modal states
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [printerDevices, setPrinterDevices] = useState([]);
  const [connectionType, setConnectionType] = useState(null);
  
  // Alert system
  const {
    alertState,
    hideAlert,
    showSuccess,
    showError,
    showDelete,
  } = useAlert();
  
  // Prevent connection loops
  const connectionAttemptRef = React.useRef(false);

  // Load saved devices on mount
  useEffect(() => {
    loadSavedUSBDevices();
    loadSavedPrinters();
  }, [loadSavedUSBDevices, loadSavedPrinters]);

  const loadSavedUSBDevices = useCallback(async () => {
    try {
      const devices = await ecrService.getSavedUSBDevices();
      setSavedUSBDevices(devices || []);
    } catch (error) {
      console.error('Failed to load saved USB devices:', error);
      setSavedUSBDevices([]);
    }
  }, [ecrService]);

  const loadSavedPrinters = useCallback(() => {
    // Load from local state or storage
    // This is a simplified implementation
    const saved = [];
    setSavedPrinters(saved);
  }, []);

  const connectToUSBDevice = useCallback(async (device) => {
    if (connectionAttemptRef.current || isConnecting) {
      console.log('Connection already in progress');
      return;
    }
    
    connectionAttemptRef.current = true;
    setIsConnecting(true);
    
    try {
      const result = await ecrService.connectToUSBDevice(device);
      if (result?.success) {
        setIsConnected(true);
        setSelectedUSBDevice(device);
        onConnectionChange?.(true);
        showSuccess('Connected', `Connected to ${device.displayName || device.deviceName}`);
      } else {
        throw new Error(result?.message || 'Connection failed');
      }
    } catch (error) {
      console.error('Connection error:', error);
      showError('Connection Failed', error.message);
      setIsConnected(false);
      setSelectedUSBDevice(null);
      onConnectionChange?.(false);
    } finally {
      setIsConnecting(false);
      connectionAttemptRef.current = false;
    }
  }, [ecrService, isConnecting, onConnectionChange, showSuccess, showError]);

  const handleDisconnect = useCallback(async () => {
    try {
      await ecrService.disconnect();
      setIsConnected(false);
      setSelectedUSBDevice(null);
      onConnectionChange?.(false);
      showSuccess('Disconnected', 'Successfully disconnected from device');
    } catch (error) {
      showError('Disconnect Error', error.message);
    }
  }, [ecrService, onConnectionChange, showSuccess, showError]);

  const removeUSBDevice = useCallback((device) => {
    showDelete(
      'Remove Device',
      `Are you sure you want to remove "${device.displayName || device.deviceName}"?`,
      async () => {
        try {
          await ecrService.removeUSBDevice(device.deviceId);
          await loadSavedUSBDevices();
          showSuccess('Device Removed', 'Device has been removed successfully');
        } catch (error) {
          showError('Remove Error', error.message || 'Failed to remove device');
        }
      }
    );
  }, [ecrService, loadSavedUSBDevices, showDelete, showSuccess, showError]);

  const removeSavedPrinter = useCallback((printerId) => {
    showDelete(
      'Remove Printer',
      'Are you sure you want to remove this printer?',
      () => {
        setSavedPrinters(prev => prev.filter(p => p.id !== printerId));
        showSuccess('Printer Removed', 'Printer has been removed successfully');
      }
    );
  }, [showDelete, showSuccess]);

  const scanForUSBDevices = useCallback(async () => {
    try {
      const devices = await ecrService.scanForUSBDevices();
      if (devices && Array.isArray(devices) && devices.length > 0) {
        setScannedDevices(devices);
        setShowDeviceModal(true);
      } else {
        showError('No Devices Found', 'No USB devices detected. Please connect your device and try again.');
      }
    } catch (error) {
      showError('Scan Error', error.message || 'Failed to scan for devices');
    }
  }, [ecrService, showError]);

  const scanForPrinters = useCallback(async () => {
    if (!printerService) {
      showError('Service Error', 'Printer service not available');
      return;
    }
    
    try {
      let result;
      switch (printerConnectionType) {
        case 'usb':
          result = await printerService.getUSBDevices();
          break;
        case 'bluetooth':
          result = await printerService.getBluetoothDevices();
          break;
        case 'network':
          result = await printerService.scanNetworkPrinters();
          break;
        default:
          result = { success: false, error: 'Unknown connection type' };
      }
      
      if (result?.success && result.devices?.length > 0) {
        setPrinterDevices(result.devices);
        setShowPrinterModal(true);
      } else {
        showError('No Printers Found', `No ${printerConnectionType} printers detected.`);
      }
    } catch (error) {
      showError('Printer Scan Error', error.message || 'Failed to scan for printers');
    }
  }, [printerService, printerConnectionType, showError]);

  const connectToPrinter = useCallback(async (device) => {
    if (!printerService) {
      showError('Service Error', 'Printer service not available');
      return;
    }
    
    try {
      const result = await printerService.connectUSB(device.path || device.name);
      if (result?.success) {
        setPrinterConnected(true);
        setSelectedPrinter(device);
        onPrinterConnectionChange?.(true);
        showSuccess('Printer Connected', `Connected to ${device.name || device.path}`);
      } else {
        throw new Error(result?.error || 'Printer connection failed');
      }
    } catch (error) {
      showError('Printer Connection Error', error.message);
    }
  }, [printerService, onPrinterConnectionChange, showSuccess, showError]);

  const disconnectPrinter = useCallback(async () => {
    if (!printerService) return;
    
    try {
      await printerService.disconnect();
      setPrinterConnected(false);
      setSelectedPrinter(null);
      onPrinterConnectionChange?.(false);
      showSuccess('Printer Disconnected', 'Printer disconnected successfully');
    } catch (error) {
      showError('Printer Disconnect Error', error.message);
    }
  }, [printerService, onPrinterConnectionChange, showSuccess, showError]);

  const selectNewDevice = useCallback(async (device) => {
    try {
      const alias = device.displayName || device.deviceName || `USB Device ${device.vendorId}:${device.productId}`;
      await ecrService.saveUSBDevice(device, ECR_CONSTANTS.SERIAL_CONFIG.BAUD_RATE, alias);
      await loadSavedUSBDevices();
      setShowDeviceModal(false);
      showSuccess('Device Saved', `${device.displayName || device.deviceName} has been saved`);
      // Auto-connect to the new device
      connectToUSBDevice(device);
    } catch (error) {
      showError('Save Error', error.message || 'Failed to save device');
    }
  }, [ecrService, loadSavedUSBDevices, showSuccess, showError, connectToUSBDevice]);

  const savePrinterDevice = useCallback((device) => {
    const deviceToSave = {
      ...device,
      id: `${printerConnectionType}_${device.path || device.name}_${Date.now()}`,
      connectionType: printerConnectionType,
      dateAdded: new Date().toISOString(),
    };
    
    setSavedPrinters(prev => [...prev, deviceToSave]);
    showSuccess('Printer Saved', 'Printer has been saved successfully');
  }, [printerConnectionType, showSuccess]);

  const renderSavedDeviceCard = (device, deviceType) => {
    const isTerminal = deviceType === 'terminal';
    const isDeviceConnected = isTerminal ? 
      (device.deviceId === selectedUSBDevice?.deviceId && isConnected) :
      (device.path === selectedPrinter?.path && printerConnected);
    
    const deviceIcon = isTerminal ? 'credit-card' : 'printer';
    const deviceName = isTerminal ? 
      (device.displayName || device.deviceName || 'Payment Terminal') :
      (device.name || device.deviceName || 'Printer');
    
    const connectionInfo = isTerminal ? 
      `USB • ${device.deviceId || 'Unknown ID'}` :
      `${device.connectionType || 'USB'} • ${device.path || 'Unknown'}`;
    
    return (
      <View key={device.id || device.deviceId || device.path} style={[
        styles.savedDeviceCard,
        isDeviceConnected && styles.savedDeviceCardConnected
      ]}>
        <View style={styles.deviceCardHeader}>
          <View style={[
            styles.deviceIconContainer,
            isDeviceConnected && { backgroundColor: '#e8f5e8' }
          ]}>
            <Icon name={deviceIcon} size={24} color={isDeviceConnected ? "#4CAF50" : "#2196F3"} />
          </View>
          <View style={styles.deviceCardActions}>
            <TouchableOpacity
              style={styles.deviceActionButton}
              onPress={() => {
                if (isTerminal) {
                  removeUSBDevice(device);
                } else {
                  removeSavedPrinter(device.id);
                }
              }}
            >
              <Icon name="delete" size={20} color="#f44336" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.deviceCardContent}>
          <Text style={styles.deviceCardTitle} numberOfLines={1}>{deviceName}</Text>
          <Text style={styles.deviceCardSubtitle}>{connectionInfo}</Text>
          
          <View style={styles.deviceCardStatus}>
            <View style={styles.statusIndicatorContainer}>
              <View style={[
                styles.statusIndicator, 
                { backgroundColor: isDeviceConnected ? '#4CAF50' : '#f44336' }
              ]} />
              <Text style={[
                styles.statusText,
                isDeviceConnected && { color: '#4CAF50', fontWeight: '600' }
              ]}>
                {isDeviceConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
            
            {!isDeviceConnected ? (
              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => isTerminal ? connectToUSBDevice(device) : connectToPrinter(device)}
                disabled={isConnecting}
              >
                <Icon name="power" size={16} color="#FFFFFF" />
                <Text style={styles.connectButtonText}>Connect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={() => isTerminal ? handleDisconnect() : disconnectPrinter()}
              >
                <Icon name="power-off" size={16} color="#FFFFFF" />
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderUSBDevicesSection = () => (
    <DashboardCard
      title="Saved Devices"
      subtitle="Manage your saved devices and connections"
      icon="devices"
      cardType="info"
      fullWidth={true}
      headerAction={
        <Button
          mode="contained"
          onPress={() => setShowAddDeviceModal(true)}
          compact
          icon={() => <Icon name="plus" size={16} color="#FFFFFF" />}
        >
          Add Device
        </Button>
      }
    >
      <Text style={styles.usbSectionDescription}>
        Your saved devices will automatically reconnect when available. Use "Add Device" to set up new connections.
      </Text>

      <View style={styles.allDevicesContainer}>
        {(savedUSBDevices.length === 0 && savedPrinters.length === 0) ? (
          <View style={styles.noDevicesContainer}>
            <Icon name="devices-off" size={48} color="#ccc" style={{marginBottom: 16}} />
            <Text style={styles.noDevicesText}>No devices saved</Text>
            <Text style={styles.noDevicesSubtext}>
              Tap "Add Device" to connect and save your payment terminal or printer.
            </Text>
          </View>
        ) : (
          <View style={styles.devicesGrid}>
            {savedUSBDevices.map((device) => renderSavedDeviceCard(device, 'terminal'))}
            {savedPrinters.map((device) => renderSavedDeviceCard(device, 'printer'))}
          </View>
        )}
      </View>

      <View style={styles.deviceStats}>
        <Text style={styles.deviceStatsText}>
          {savedUSBDevices.length} payment terminals • {savedPrinters.length} printers saved
        </Text>
      </View>
    </DashboardCard>
  );

  return (
    <ResponsiveGrid scrollable={true}>
      {renderUSBDevicesSection()}

      {/* Add Device Modal */}
      <Modal
        visible={showAddDeviceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddDeviceModal(false);
          setSelectedDeviceType(null);
          setConnectionType(null);
          setPrinterConnectionType(null);
        }}
        style={styles.addDeviceModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addDeviceContent}>
            <View style={styles.addDeviceHeader}>
              <Text style={styles.addDeviceTitle}>Add New Device</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowAddDeviceModal(false);
                  setSelectedDeviceType(null);
                  setConnectionType(null);
                  setPrinterConnectionType(null);
                }}
              >
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.modalInnerContent}>
                {!selectedDeviceType ? (
                  <>
                    <Text style={styles.stepTitle}>Step 1: Select Device Type</Text>
                  <View style={styles.deviceTypeOptions}>
                    <TouchableOpacity
                      style={styles.deviceTypeCard}
                      onPress={() => setSelectedDeviceType('terminal')}
                    >
                      <Icon name="credit-card" size={32} color="#2196F3" style={{marginBottom: 8}} />
                      <Text style={{fontSize: 16, fontWeight: '600', marginBottom: 4}}>Payment Terminal</Text>
                      <Text style={{fontSize: 12, color: '#666', textAlign: 'center'}}>Connect ECR payment terminal for processing transactions</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deviceTypeCard}
                      onPress={() => setSelectedDeviceType('printer')}
                    >
                      <Icon name="printer" size={32} color="#2196F3" style={{marginBottom: 8}} />
                      <Text style={{fontSize: 16, fontWeight: '600', marginBottom: 4}}>ESC/POS Printer</Text>
                      <Text style={{fontSize: 12, color: '#666', textAlign: 'center'}}>Connect thermal or receipt printer for printing receipts</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setSelectedDeviceType(null)}
                    style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}
                  >
                    <Icon name="arrow-left" size={20} color="#2196F3" />
                    <Text style={{color: '#2196F3', marginLeft: 8}}>Back to device selection</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.stepTitle}>
                    Step 2: Select Connection Method
                  </Text>
                  <View style={styles.connectionMethods}>
                    {selectedDeviceType === 'terminal' ? (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.connectionMethodCard,
                            connectionType === CONNECTION_TYPES.SERIAL && styles.connectionMethodCardSelected
                          ]}
                          onPress={() => setConnectionType(CONNECTION_TYPES.SERIAL)}
                        >
                          <Icon name="usb" size={24} color="#4CAF50" style={{marginRight: 12}} />
                          <View style={{flex: 1}}>
                            <Text style={{fontSize: 14, fontWeight: '600'}}>USB Connection</Text>
                            <Text style={{fontSize: 12, color: '#666'}}>Direct USB serial connection</Text>
                          </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[
                            styles.connectionMethodCard,
                            connectionType === CONNECTION_TYPES.TCP && styles.connectionMethodCardSelected
                          ]}
                          onPress={() => setConnectionType(CONNECTION_TYPES.TCP)}
                        >
                          <Icon name="ethernet" size={24} color="#4CAF50" style={{marginRight: 12}} />
                          <View style={{flex: 1}}>
                            <Text style={{fontSize: 14, fontWeight: '600'}}>Network (TCP/IP)</Text>
                            <Text style={{fontSize: 12, color: '#666'}}>Connect via network/ethernet</Text>
                          </View>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.connectionMethodCard,
                            printerConnectionType === 'usb' && styles.connectionMethodCardSelected
                          ]}
                          onPress={() => setPrinterConnectionType('usb')}
                        >
                          <Icon name="usb" size={24} color="#4CAF50" style={{marginRight: 12}} />
                          <View style={{flex: 1}}>
                            <Text style={{fontSize: 14, fontWeight: '600'}}>USB</Text>
                            <Text style={{fontSize: 12, color: '#666'}}>Direct USB connection</Text>
                          </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[
                            styles.connectionMethodCard,
                            printerConnectionType === 'network' && styles.connectionMethodCardSelected
                          ]}
                          onPress={() => setPrinterConnectionType('network')}
                        >
                          <Icon name="ethernet" size={24} color="#4CAF50" style={{marginRight: 12}} />
                          <View style={{flex: 1}}>
                            <Text style={{fontSize: 14, fontWeight: '600'}}>Network</Text>
                            <Text style={{fontSize: 12, color: '#666'}}>TCP/IP network connection</Text>
                          </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[
                            styles.connectionMethodCard,
                            printerConnectionType === 'bluetooth' && styles.connectionMethodCardSelected
                          ]}
                          onPress={() => setPrinterConnectionType('bluetooth')}
                        >
                          <Icon name="bluetooth" size={24} color="#4CAF50" style={{marginRight: 12}} />
                          <View style={{flex: 1}}>
                            <Text style={{fontSize: 14, fontWeight: '600'}}>Bluetooth</Text>
                            <Text style={{fontSize: 12, color: '#666'}}>Wireless Bluetooth connection</Text>
                          </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[
                            styles.connectionMethodCard,
                            printerConnectionType === 'serial' && styles.connectionMethodCardSelected
                          ]}
                          onPress={() => setPrinterConnectionType('serial')}
                        >
                          <Icon name="serial-port" size={24} color="#4CAF50" style={{marginRight: 12}} />
                          <View style={{flex: 1}}>
                            <Text style={{fontSize: 14, fontWeight: '600'}}>Serial Port</Text>
                            <Text style={{fontSize: 12, color: '#666'}}>RS232/RS485 serial connection</Text>
                          </View>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
                )}
              </View>
            </ScrollView>
            
            <View style={styles.addDeviceActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowAddDeviceModal(false);
                  setSelectedDeviceType(null);
                  setConnectionType(null);
                  setPrinterConnectionType(null);
                }}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              
              {selectedDeviceType && (selectedDeviceType === 'terminal' ? connectionType : printerConnectionType) && (
                <Button
                  mode="contained"
                  onPress={() => {
                    setShowAddDeviceModal(false);
                    if (selectedDeviceType === 'terminal') {
                      scanForUSBDevices();
                    } else {
                      scanForPrinters();
                    }
                    setSelectedDeviceType(null);
                    setConnectionType(null);
                    setPrinterConnectionType(null);
                  }}
                  style={styles.proceedButton}
                >
                  Scan for Devices
                </Button>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Device Selection Modal */}
      <Modal
        visible={showDeviceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeviceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>USB Devices Found</Text>
            <Text style={styles.modalSubtitle}>Found {scannedDevices.length} device(s). Select one to save:</Text>
            
            <ScrollView style={styles.deviceList}>
              {scannedDevices.map((device) => (
                <TouchableOpacity
                  key={device.deviceId}
                  style={styles.deviceOption}
                  onPress={() => selectNewDevice(device)}
                >
                  <Text style={styles.deviceOptionTitle}>
                    {device.displayName || device.deviceName}
                  </Text>
                  <Text style={styles.deviceOptionSubtitle}>
                    VID:{device.vendorId} PID:{device.productId}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Button mode="outlined" onPress={() => setShowDeviceModal(false)}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      {/* Printer Selection Modal */}
      <Modal
        visible={showPrinterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrinterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Printers Found</Text>
            <Text style={styles.modalSubtitle}>Found {printerDevices.length} printer(s). Select one to save and connect:</Text>
            
            <ScrollView style={styles.deviceList}>
              {printerDevices.map((device, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.deviceOption}
                  onPress={() => {
                    setShowPrinterModal(false);
                    savePrinterDevice(device);
                    connectToPrinter(device);
                  }}
                >
                  <Text style={styles.deviceOptionTitle}>
                    {device.name || device.path}
                  </Text>
                  <Text style={styles.deviceOptionSubtitle}>
                    {device.description || `${printerConnectionType ? printerConnectionType.toUpperCase() : 'USB'} Printer`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Button mode="outlined" onPress={() => setShowPrinterModal(false)}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      {/* Centralized Alert Modal */}
      <AlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />

    </ResponsiveGrid>
  );
};

const styles = StyleSheet.create({
  card: { margin: 16, elevation: 4 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  mainStatusIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  statusText: { fontWeight: 'bold', flex: 1 },
  connectedDeviceText: { 
    fontSize: 12, 
    color: '#666', 
    marginLeft: 8 
  },
  divider: { marginVertical: 16 },
  
  // USB Device Management Styles
  usbSectionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    lineHeight: 16,
  },
  allDevicesContainer: {
    marginBottom: 16,
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  noDevicesContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  noDevicesText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  noDevicesSubtext: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
  },
  deviceStats: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'center',
  },
  deviceStatsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  
  // Saved Device Card Styles
  savedDeviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 8,
    width: '46%',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  savedDeviceCardConnected: {
    backgroundColor: '#f0f8f0',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  deviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deviceCardContent: {
    flex: 1,
  },
  deviceCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceCardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  deviceCardStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Add Device Modal Styles
  addDeviceModal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  addDeviceContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    minHeight: 400,
  },
  modalScrollView: {
    flex: 1,
  },
  modalInnerContent: {
    padding: 20,
    paddingTop: 16,
  },
  addDeviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  addDeviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  deviceTypeOptions: {
    marginBottom: 20,
  },
  deviceTypeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  connectionMethods: {
    marginBottom: 20,
  },
  connectionMethodCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionMethodCardSelected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
  },
  addDeviceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderColor: '#e9ecef',
  },
  proceedButton: {
    flex: 1,
    backgroundColor: '#2196F3',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  deviceList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  deviceOption: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  deviceOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  deviceOptionSubtitle: {
    fontSize: 12,
    color: '#666',
  },
});

export default ConnectionSetup;
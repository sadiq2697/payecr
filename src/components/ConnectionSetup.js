import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Modal,
  BackHandler,
  FlatList
} from 'react-native';
import { Card, Divider, Button, IconButton } from 'react-native-paper';
import { CONNECTION_TYPES, ECR_CONSTANTS } from '../utils/Constants';
import AlertModal from './AlertModal';
import useAlert from '../hooks/useAlert';

const ConnectionSetup = ({ ecrService, onConnectionChange }) => {
  const [connectionType, setConnectionType] = useState(CONNECTION_TYPES.SERIAL);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // USB Device Management State
  const [savedUSBDevices, setSavedUSBDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showUSBDevices, setShowUSBDevices] = useState(true);
  const [selectedUSBDevice, setSelectedUSBDevice] = useState(null);
  
  // Track previous device states to detect online status changes
  const previousDeviceStatesRef = React.useRef({});
  
  // Refs for cleanup and tracking
  const intervalRef = React.useRef(null);
  const lastAutoConnectAttempt = React.useRef(0);
  const AUTO_CONNECT_COOLDOWN = 10000; // 10 seconds cooldown between auto-connect attempts
  
  // Device Selection Modal
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [scannedDevices, setScannedDevices] = useState([]);
  
  // App Exit Handler
  const [showExitModal, setShowExitModal] = useState(false);
  
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
  
  // Delete Modal no longer needed - handled by centralized alert system

  const [tcpConfig, setTcpConfig] = useState({
    host: '192.168.1.100',
    port: ECR_CONSTANTS.TCP_CONFIG.PORT.toString(), // Use constant
    timeout: ECR_CONSTANTS.TIMEOUTS.COMMAND.toString(), // Use constant
  });

  const [serialConfig, setSerialConfig] = useState({
    baudRate: ECR_CONSTANTS.SERIAL_CONFIG.BAUD_RATE.toString(), // Use constant
  });

  // showAlert is now provided by useAlert hook

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


  // USB Device Management Functions
  const loadSavedUSBDevices = useCallback(async () => {
    try {
      console.log('Calling ecrService.getSavedUSBDevices()...');
      const devices = await ecrService.getSavedUSBDevices();
      console.log('Loaded saved devices:', devices, 'Length:', devices?.length || 0);
      setSavedUSBDevices(devices || []);
      console.log('State updated with devices');
    } catch (error) {
      console.error('Error loading saved USB devices:', error);
      console.error('Error details:', error.message, error.code);
    }
  }, [ecrService]);

  const scanForUSBDevices = useCallback(async () => {
    setIsScanning(true);
    try {
      const devices = await ecrService.scanForUSBDevices();
      console.log('Scanned devices:', devices); // Debug log
      
      if (devices.length === 0) {
        showWarning('No Devices Found', 'No USB devices detected. Please connect your ECR terminal or printer.');
        return;
      }
      
      setScannedDevices(devices);
      setShowDeviceModal(true);
    } catch (error) {
      console.error('Error scanning for USB devices:', error);
      showError('Scan Error', error.message || 'Failed to scan for USB devices');
    } finally {
      setIsScanning(false);
    }
  }, [ecrService, showWarning, showError]);

  const selectNewDevice = async (device) => {
    try {
      console.log('Saving device:', device); // Debug log
      
      // Save the device with a user-friendly alias
      const alias = device.displayName || device.deviceName || `USB Device ${device.vendorId}:${device.productId}`;
      const result = await ecrService.saveUSBDevice(device, parseInt(serialConfig.baudRate, 10), alias);
      
      console.log('Save result:', result); // Debug log
      
      showSuccess('Device Saved', `"${alias}" has been saved and will auto-reconnect when plugged in.`);
      
      // Force reload saved devices with a small delay to ensure persistence has completed
      setTimeout(async () => {
        await loadSavedUSBDevices();
        console.log('Updated saved devices after timeout:', savedUSBDevices); // Debug log
      }, 100);
    } catch (error) {
      console.error('Error saving USB device:', error);
      showError('Save Error', error.message || 'Failed to save USB device');
    }
  };

  const connectToUSBDevice = useCallback(async (device) => {
    if (!device.isOnline) {
      showWarning('Device Offline', `${device.displayName || device.deviceName} is not connected. Please plug in the USB device.`);
      return;
    }
    
    if (!device.hasPermission) {
      try {
        await ecrService.requestUSBPermission(device.deviceId);
        // Wait for permission result
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
      
      console.log('Connection result:', result);
      
      if (result.success) {
        setIsConnected(true);
        setSelectedUSBDevice(device);
        
        // Update connection status in parent component
        if (onConnectionChange) {
          console.log('Calling onConnectionChange with true');
          onConnectionChange(true);
        }
        
        // Refresh the connection status to make sure UI is updated
        setTimeout(() => {
          checkConnectionStatus();
        }, 500);
        
        showConnectionStatus(true, device.displayName || device.deviceName);
      } else {
        showError('Connection Failed', result.message || 'Failed to connect to USB device');
      }
    } catch (error) {
      console.error('Error connecting to USB device:', error);
      showError('Connection Error', error.message || 'Failed to connect to USB device');
    } finally {
      setIsConnecting(false);
    }
  }, [ecrService, onConnectionChange, checkConnectionStatus, showWarning, showError, showConnectionStatus]);

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
  
  // confirmDeleteDevice is now handled inline in removeUSBDevice

  const toggleAutoReconnect = useCallback(async (device) => {
    try {
      await ecrService.toggleUSBAutoReconnect(device.deviceId, !device.autoReconnect);
      await loadSavedUSBDevices();
    } catch (error) {
      console.error('Error toggling auto-reconnect:', error);
      showError('Error', 'Failed to update auto-reconnect setting');
    }
  }, [ecrService, loadSavedUSBDevices, showError]);


  useEffect(() => {
    checkConnectionStatus();
    
    // Load saved devices and attempt auto-connect
    console.log('Loading saved USB devices...');
    ecrService.getSavedUSBDevices()
      .then(async (devices) => {
        console.log('Loaded devices:', devices);
        setSavedUSBDevices(devices || []);
        
        // Initialize previous device states
        const initialStates = {};
        devices?.forEach(device => {
          initialStates[device.deviceId] = device.isOnline;
        });
        setPreviousDeviceStates(initialStates);
        
        // Try to auto-connect to the first available device with auto-reconnect enabled (one-time on app start)
        if (devices && devices.length > 0 && !isConnected) {
          const autoReconnectDevices = devices.filter(d => d.autoReconnect && d.isOnline && d.hasPermission);
          if (autoReconnectDevices.length > 0) {
            const deviceToConnect = autoReconnectDevices[0];
            console.log('Initial auto-connect attempt to:', deviceToConnect.displayName);
            try {
              const result = await ecrService.connectToUSBDevice(deviceToConnect.deviceId);
              if (result.success) {
                setIsConnected(true);
                setSelectedUSBDevice(deviceToConnect);
                onConnectionChange?.(true);
                console.log('Initial auto-connect successful');
              }
            } catch (error) {
              console.log('Initial auto-connect failed:', error.message);
            }
          }
        }
      })
      .catch(err => console.error('Error loading devices:', err));
    
    // Set up periodic refresh for USB devices - only for status updates
    intervalRef.current = setInterval(async () => {
      try {
        if (savedUSBDevices.length > 0) {
          const updatedDevices = await ecrService.getSavedUSBDevices();
        
        // Only update state and check auto-connect if there are actual changes
        let hasStatusChanges = false;
        const statusChanges = [];
        
        if (updatedDevices) {
          for (const device of updatedDevices) {
            const previousState = previousDeviceStatesRef.current[device.deviceId];
            if (previousState !== undefined && previousState !== device.isOnline) {
              hasStatusChanges = true;
              statusChanges.push({
                device,
                previousState,
                currentState: device.isOnline,
                justCameOnline: previousState === false && device.isOnline === true
              });
              console.log(`Device ${device.displayName}: ${previousState ? 'online' : 'offline'} → ${device.isOnline ? 'online' : 'offline'}`);
            }
          }
        }
        
        // Only process if there are actual status changes
        if (hasStatusChanges) {
          setSavedUSBDevices(updatedDevices || []);
          
          // Handle auto-connect only for devices that just came online
          if (!isConnected && !isConnecting) {
            for (const change of statusChanges) {
              if (change.justCameOnline && change.device.autoReconnect && change.device.hasPermission) {
                const now = Date.now();
                const canAutoConnect = now - lastAutoConnectAttempt.current > AUTO_CONNECT_COOLDOWN;
                
                if (canAutoConnect) {
                  console.log('🔌 Device just came online! Auto-connecting to:', change.device.displayName);
                  lastAutoConnectAttempt.current = now;
                  await connectToUSBDevice(change.device);
                  break; // Only connect to first available device
                } else {
                  console.log('⏳ Device came online but auto-connect in cooldown:', change.device.displayName);
                }
              } else if (change.justCameOnline) {
                console.log('📱 Device came online but auto-reconnect disabled or no permission:', change.device.displayName);
              }
            }
          }
          
            // Update previous states only when there are changes
            updatedDevices?.forEach(device => {
              previousDeviceStatesRef.current[device.deviceId] = device.isOnline;
            });
          }
        
        // Always check if currently connected device went offline (critical for disconnection)
        if (isConnected && selectedUSBDevice && updatedDevices) {
          const connectedDevice = updatedDevices.find(d => d.deviceId === selectedUSBDevice.deviceId);
          if (connectedDevice) {
            setSelectedUSBDevice(connectedDevice); // Update device status
            
            // If the connected device went offline, disconnect
            if (!connectedDevice.isOnline && selectedUSBDevice.isOnline) {
              console.log('🔌 Connected device went offline, disconnecting...');
              setIsConnected(false);
              onConnectionChange?.(false);
              try {
                await ecrService.disconnect();
              } catch (error) {
                console.error('Error disconnecting from offline device:', error);
              }
            }
          }
        }
        }
      } catch (error) {
        console.error('Error in device status refresh:', error);
      }
    }, 3000); // Check every 3 seconds for status changes (optimized)
    
    // Handle back button to show exit modal
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowExitModal(true);
      return true; // Prevent default back behavior
    });
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      backHandler.remove();
    };
  }, [checkConnectionStatus, loadSavedUSBDevices, connectToUSBDevice]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      let result;
      if (connectionType === CONNECTION_TYPES.TCP) {
        // --- Input Validation for TCP (Block 1) ---
        const host = tcpConfig.host.trim();
        const port = parseInt(tcpConfig.port, 10);
        const timeout = parseInt(tcpConfig.timeout, 10);

        if (!host) {
          showError('Input Error', 'Host cannot be empty.');
          return;
        }
        if (isNaN(port) || port <= 0 || port > 65535) {
          showError('Input Error', 'Port must be a valid number between 1 and 65535.');
          return;
        }
        if (isNaN(timeout) || timeout <= 0) {
          showError('Input Error', 'Timeout must be a positive number.');
          return;
        }

        result = await ecrService.connectTCP({ host, port, timeout });
      } else {
        // Serial connection - check if we have a selected USB device
        if (selectedUSBDevice && selectedUSBDevice.isOnline) {
          // Connect to selected USB device
          await connectToUSBDevice(selectedUSBDevice);
          return; // connectToUSBDevice handles success/failure internally
        } else {
          // No USB device selected - show device selection
          if (savedUSBDevices.length > 0) {
            const onlineDevices = savedUSBDevices.filter(d => d.isOnline);
            if (onlineDevices.length === 0) {
              showWarning('No Devices Online', 'No USB devices are currently connected. Please connect a USB device and try again.');
              return;
            }
            
            // Show device selection if multiple online devices
            if (onlineDevices.length === 1) {
              await connectToUSBDevice(onlineDevices[0]);
              return; // connectToUSBDevice handles success/failure internally
            } else {
              showDeviceSelectionForConnection();
              return;
            }
          } else {
            // No saved devices - try legacy serial connection
            const baudRate = parseInt(serialConfig.baudRate, 10);
            if (isNaN(baudRate) || baudRate <= 0) {
              showError('Input Error', 'Baud Rate must be a positive number.');
              return;
            }
            result = await ecrService.connectSerial({ baudRate });
          }
        }
      }

      if (result && result.success) {
        setIsConnected(true);
        onConnectionChange?.(true);
        showConnectionStatus(true); //  result.message || 'Connected successfully');
      } else {
        showError('Connection Failed', result?.message || 'Unknown error');
      }
    } catch (error) { // --- Error Logging (Block 2) ---
      showError('Connection Error', error.message);
      console.error('ECR Connection Error:', error); 
    } finally {
      setIsConnecting(false);
    }
  };

  const showDeviceSelectionForConnection = () => {
    // Use custom modal for device selection instead of Alert.alert
    showWarning('Multiple Devices Online', 'Please connect to devices individually from the USB Devices section below.');
  };

  const handleDisconnect = async () => {
    try {
      await ecrService.disconnect();
      setIsConnected(false);
      onConnectionChange?.(false);
      showSuccess('Disconnected', 'Connection closed successfully');
    } catch (error) { // --- Error Logging (Block 2) ---
      showError('Disconnect Error', error.message);
      console.error('ECR Disconnect Error:', error);
    }
  };

  const handleTestConnection = async () => {
    if (connectionType !== CONNECTION_TYPES.TCP) {
      return showWarning('Test Not Available', 'Only available for TCP connections');
    }
    setIsConnecting(true);
    try {
      // --- Input Validation for TCP Test (Block 1) ---
      const host = tcpConfig.host.trim();
      const port = parseInt(tcpConfig.port, 10);
      const timeout = parseInt(tcpConfig.timeout, 10);

      if (!host) {
        showError('Input Error', 'Host cannot be empty.');
        return;
      }
      if (isNaN(port) || port <= 0 || port > 65535) {
        showError('Input Error', 'Port must be a valid number between 1 and 65535.');
        return;
      }
      if (isNaN(timeout) || timeout <= 0) {
        showError('Input Error', 'Timeout must be a positive number.');
        return;
      }

      const result = await ecrService.testTCPConnection({ host, port, timeout });
      result.success ? showSuccess('Test Successful', result.message) : showError('Test Failed', result.message);
    } catch (error) { // --- Error Logging (Block 2) ---
      showError('Test Error', error.message);
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
          style={[styles.textInput, styles.flexInput]} // Added flex for layout
          value={tcpConfig.port}
          onChangeText={(v) => setTcpConfig({ ...tcpConfig, port: v })}
          placeholder="88"
          keyboardType="numeric"
          editable={!isConnected}
        />
        <TextInput
          style={[styles.textInput, styles.flexInput]} // Added flex for layout
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
      <Text>Data Bits: 8, Parity: None, Stop Bits: 1</Text>
    </View>
  );

  const renderUSBDeviceCard = ({ item: device }) => {
    const statusColor = device.isOnline ? '#4CAF50' : '#F44336';
    const statusText = device.isOnline ? 'Online' : 'Offline';
    const needsPermission = device.isOnline && !device.hasPermission;
    
    return (
      <TouchableOpacity 
        style={styles.deviceCard}
        onPress={() => device.isOnline && connectToUSBDevice(device)}
        disabled={!device.isOnline || isConnecting}
      >
        <View style={styles.deviceHeader}>
          <Text style={styles.deviceName} numberOfLines={1}>
            {device.displayName || device.deviceName || 'USB Device'}
          </Text>
          
          <View style={styles.deviceStatus}>
            <View style={[styles.deviceStatusIndicator, { backgroundColor: statusColor }]} />
            <Text style={styles.deviceStatusText}>{statusText}</Text>
          </View>
        </View>

        <Text style={styles.deviceDetails} numberOfLines={1}>
          {device.vendorId}:{device.productId}
        </Text>

        {needsPermission && (
          <Text style={styles.devicePermissionWarning} numberOfLines={1}>
            Needs Permission
          </Text>
        )}

        <View style={styles.deviceControls}>
          <View style={styles.autoReconnectRow}>
            <Text style={styles.autoReconnectLabel}>Auto</Text>
            <Switch
              value={device.autoReconnect !== false}
              onValueChange={() => toggleAutoReconnect(device)}
              disabled={isConnecting}
              style={styles.compactSwitch}
            />
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => removeUSBDevice(device)}
            disabled={isConnecting}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderUSBDevicesSection = () => (
    <View style={styles.usbSection}>
      <View style={styles.usbSectionHeader}>
        <TouchableOpacity 
          style={styles.usbSectionTitleContainer}
          onPress={() => setShowUSBDevices(!showUSBDevices)}
        >
          <Text style={styles.usbSectionTitle}>Saved USB Devices</Text>
          <IconButton
            icon={showUSBDevices ? "chevron-up" : "chevron-down"}
            size={20}
          />
        </TouchableOpacity>
        
        <View style={styles.usbSectionActions}>
          <Button
            mode="outlined"
            onPress={scanForUSBDevices}
            loading={isScanning}
            disabled={isScanning || isConnecting}
            compact
          >
            Scan Devices
          </Button>
        </View>
      </View>

      {showUSBDevices && (
        <>
          <Text style={styles.usbSectionDescription}>
            USB devices are automatically detected and saved. They will reconnect when plugged back in.
          </Text>

          <View style={styles.usbDevicesContainer}>
            {savedUSBDevices.length === 0 ? (
              <View style={styles.noDevicesContainer}>
                <Text style={styles.noDevicesText}>No USB devices saved</Text>
                <Text style={styles.noDevicesSubtext}>
                  Connect a USB device and tap "Scan Devices" to save it for automatic reconnection.
                </Text>
              </View>
            ) : (
              <FlatList 
                data={savedUSBDevices}
                renderItem={renderUSBDeviceCard}
                keyExtractor={(item) => item.deviceId}
                numColumns={4}
                columnWrapperStyle={styles.deviceRow}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                style={styles.devicesList}
              />
            )}
          </View>

          <View style={styles.usbStats}>
            <Text style={styles.usbStatsText}>
              {savedUSBDevices.filter(d => d.isOnline).length} of {savedUSBDevices.length} devices online
            </Text>
          </View>
        </>
      )}
    </View>
  );

  return (
    <>
      <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>ECR Connection Setup</Text>

        {/* Status */}
        <View style={styles.statusContainer}>
          <View style={[styles.mainStatusIndicator, isConnected ? styles.statusOnline : styles.statusOffline]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
            {isConnected && selectedUSBDevice && !selectedUSBDevice.isOnline ? ' (Device Offline)' : ''}
          </Text>
          {isConnected && <Text>({connectionType.toUpperCase()})</Text>}
          {selectedUSBDevice && (
            <Text style={styles.connectedDeviceText}>
              {selectedUSBDevice.displayName || selectedUSBDevice.deviceName}
            </Text>
          )}
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

        {/* Connect/Disconnect Buttons */}
        <View style={styles.buttonContainer}>
          {!isConnected ? (
            <Button
              mode="contained"
              onPress={handleConnect}
              loading={isConnecting}
              disabled={isConnecting}
              style={styles.actionButton}
            >
              Connect
            </Button>
          ) : (
            <Button
              mode="outlined"
              onPress={handleDisconnect}
              disabled={isConnecting}
              style={styles.actionButton}
            >
              Disconnect
            </Button>
          )}
        </View>

        {/* USB Devices Section for Serial connections */}
        {connectionType === CONNECTION_TYPES.SERIAL && (
          <>
            <Divider style={styles.divider} />
            {renderUSBDevicesSection()}
          </>
        )}

      </Card.Content>
      </Card>

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
                onPress={() => {
                  setShowDeviceModal(false);
                  selectNewDevice(device);
                }}
              >
                <Text style={styles.deviceOptionTitle}>
                  {device.displayName || device.deviceName}
                </Text>
                <Text style={styles.deviceOptionSubtitle}>
                  VID:{device.vendorId} PID:{device.productId}
                </Text>
                {!device.hasPermission && (
                  <Text style={styles.modalPermissionWarning}>Requires permission</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <Button mode="outlined" onPress={() => setShowDeviceModal(false)}>
            Cancel
          </Button>
        </View>
      </View>
    </Modal>

    {/* Exit Confirmation Modal */}
    <Modal
      visible={showExitModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowExitModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.exitModalContent}>
          <Text style={styles.modalTitle}>Exit App</Text>
          <Text style={styles.modalSubtitle}>Are you sure you want to exit?</Text>
          
          <View style={styles.exitModalButtons}>
            <Button 
              mode="outlined" 
              onPress={() => setShowExitModal(false)}
              style={styles.exitButton}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={() => BackHandler.exitApp()}
              style={styles.exitButton}
            >
              Exit
            </Button>
          </View>
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
    </>
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
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  configSection: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    // marginBottom: 12, // Removed as it's now in a row
    backgroundColor: '#fff',
  },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  buttonContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  actionButton: {
    minWidth: 120,
  },
  flexInput: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusOnline: {
    backgroundColor: '#4CAF50',
  },
  statusOffline: {
    backgroundColor: '#F44336',
  },
  deviceStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  
  // USB Device Management Styles
  usbSection: {
    marginBottom: 16,
  },
  usbSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usbSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usbSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  usbSectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usbSectionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    lineHeight: 16,
  },
  usbDevicesContainer: {
    marginBottom: 8,
  },
  devicesList: {
    maxHeight: 400,
  },
  deviceRow: {
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
  deviceCard: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    margin: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    width: '23%',
    minHeight: 120,
    justifyContent: 'space-between',
  },
  deviceHeader: {
    marginBottom: 6,
  },
  deviceName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  deviceDetails: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  deviceStatusText: {
    fontSize: 10,
    color: '#666',
  },
  devicePermissionWarning: {
    fontSize: 9,
    color: '#ff9800',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  deviceControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoReconnectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  autoReconnectLabel: {
    fontSize: 10,
    color: '#333',
    marginRight: 4,
  },
  compactSwitch: {
    transform: [{ scale: 0.8 }],
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  usbStats: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  usbStatsText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
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
  exitModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
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
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  deviceOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deviceOptionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modalPermissionWarning: {
    fontSize: 11,
    color: '#ff9800',
    fontWeight: 'bold',
  },
  exitModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  exitButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  alertModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 350,
  },
  alertButton: {
    marginTop: 16,
  },
});

export default ConnectionSetup;

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import {
  Card,
  Title,
  Button,
  Chip,
  IconButton,
  Searchbar,
  FAB,
  List,
  ProgressBar,
  Badge,
  SegmentedButtons,
} from 'react-native-paper';
import ResponsiveGrid from './UI/ResponsiveGrid';
import DashboardCard from './UI/DashboardCard';
import AnimatedStatusIndicator from './AnimatedStatusIndicator';
import useAlert from '../hooks/useAlert';

const PrinterManagement = ({ printerService, onConnectionChange }) => {
  // Printer state
  const [savedPrinters, setSavedPrinters] = useState([]);
  const [scannedPrinters, setScannedPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionType, setConnectionType] = useState('USB');
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const { showSuccess, showError, showWarning } = useAlert();

  const printerTypes = [
    { value: 'USB', label: 'USB Printers', icon: 'usb' },
    { value: 'Network', label: 'Network Printers', icon: 'wifi' },
    { value: 'Bluetooth', label: 'Bluetooth Printers', icon: 'bluetooth' },
    { value: 'Serial', label: 'Serial Printers', icon: 'cable-data' },
  ];

  useEffect(() => {
    loadSavedPrinters();
    updatePrinterStatus();
    
    // Set up periodic status updates
    const statusInterval = setInterval(updatePrinterStatus, 5000);
    
    // Listen for printer events
    const listeners = setupPrinterEventListeners();
    
    return () => {
      clearInterval(statusInterval);
      listeners.forEach(listener => listener.remove());
    };
  }, []);

  const setupPrinterEventListeners = () => {
    const listeners = [];
    
    if (printerService) {
      listeners.push(
        printerService.on('printerConnected', (data) => {
          setConnectionStatus(printerService.getConnectionStatus());
          showSuccess('Printer Connected', `Connected to ${data.type} printer`);
          onConnectionChange?.(true);
          loadSavedPrinters();
        })
      );
      
      listeners.push(
        printerService.on('printerDisconnected', (data) => {
          setConnectionStatus(printerService.getConnectionStatus());
          showWarning('Printer Disconnected', 'Printer connection lost');
          onConnectionChange?.(false);
        })
      );
      
      listeners.push(
        printerService.on('printerError', (error) => {
          showError('Printer Error', error.message || 'Printer operation failed');
        })
      );
      
      listeners.push(
        printerService.on('printComplete', (result) => {
          showSuccess('Print Complete', 'Document printed successfully');
        })
      );
    }
    
    return listeners;
  };

  const loadSavedPrinters = useCallback(async () => {
    // In a real implementation, this would load from AsyncStorage or a database
    const mockPrinters = [
      {
        id: '1',
        name: 'USB Thermal Printer',
        type: 'USB',
        address: '/dev/usb/lp0',
        isConnected: false,
        lastConnected: new Date(Date.now() - 3600000).toISOString(),
        status: 'Ready',
        autoConnect: true,
      },
      {
        id: '2', 
        name: 'Network Receipt Printer',
        type: 'Network',
        address: '192.168.1.100:9100',
        isConnected: false,
        lastConnected: new Date(Date.now() - 7200000).toISOString(),
        status: 'Offline',
        autoConnect: false,
      }
    ];
    
    setSavedPrinters(mockPrinters);
  }, []);

  const updatePrinterStatus = useCallback(async () => {
    if (printerService) {
      const status = printerService.getConnectionStatus();
      setConnectionStatus(status);
      
      // Update saved printers with current connection status
      setSavedPrinters(prev => prev.map(printer => ({
        ...printer,
        isConnected: status.isConnected && 
                    status.lastConnectedDevice?.type === printer.type &&
                    (status.lastConnectedDevice?.address === printer.address ||
                     status.lastConnectedDevice?.path === printer.address)
      })));
    }
  }, [printerService]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSavedPrinters();
    updatePrinterStatus();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const scanForPrinters = async () => {
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      let devices = [];
      const progressStep = 25;
      
      // Simulate scanning progress
      const updateProgress = (step) => {
        setScanProgress(step);
      };
      
      switch (connectionType) {
        case 'USB':
          updateProgress(progressStep);
          const usbResult = await printerService.getUSBDevices();
          if (usbResult.success) {
            devices = usbResult.devices.map(device => ({
              ...device,
              id: device.path,
              displayName: `USB Printer (${device.name})`,
            }));
          }
          break;
          
        case 'Bluetooth':
          updateProgress(progressStep);
          const btResult = await printerService.getBluetoothDevices();
          if (btResult.success) {
            devices = btResult.devices.map(device => ({
              ...device,
              id: device.address,
              displayName: device.name || 'Bluetooth Printer',
            }));
          }
          break;
          
        case 'Network':
          updateProgress(progressStep);
          const netResult = await printerService.scanNetworkPrinters();
          if (netResult.success) {
            devices = netResult.devices.map(device => ({
              ...device,
              id: device.address,
              displayName: `Network Printer (${device.address})`,
            }));
          }
          break;
          
        default:
          devices = [];
      }
      
      updateProgress(100);
      setScannedPrinters(devices);
      
      if (devices.length === 0) {
        showWarning('No Printers Found', `No ${connectionType} printers were detected`);
      } else {
        showSuccess('Scan Complete', `Found ${devices.length} ${connectionType} printer${devices.length !== 1 ? 's' : ''}`);
      }
      
    } catch (error) {
      showError('Scan Failed', error.message || 'Failed to scan for printers');
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const connectToPrinter = async (printer) => {
    setIsConnecting(true);
    
    try {
      let result;
      
      switch (printer.type) {
        case 'USB':
          result = await printerService.connectUSB(printer.address || printer.path);
          break;
        case 'Network':
          const [ip, port] = (printer.address || '').split(':');
          result = await printerService.connectNetwork(ip, parseInt(port) || 9100);
          break;
        case 'Bluetooth':
          result = await printerService.connectBluetooth(printer.address);
          break;
        case 'Serial':
          const [serialPort, baudRate] = (printer.address || '').split(',');
          result = await printerService.connectSerial(serialPort, baudRate || '9600');
          break;
        default:
          throw new Error('Unsupported printer type');
      }
      
      if (result.success) {
        showSuccess('Connected', `Successfully connected to ${printer.name || printer.displayName}`);
        updatePrinterStatus();
      } else {
        showError('Connection Failed', result.error || 'Failed to connect to printer');
      }
      
    } catch (error) {
      showError('Connection Error', error.message || 'Failed to connect to printer');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectPrinter = async () => {
    try {
      const result = await printerService.disconnect();
      
      if (result.success) {
        showSuccess('Disconnected', 'Printer disconnected successfully');
        updatePrinterStatus();
      } else {
        showError('Disconnection Failed', result.error || 'Failed to disconnect printer');
      }
      
    } catch (error) {
      showError('Disconnection Error', error.message || 'Failed to disconnect printer');
    }
  };

  const toggleAutoConnect = (printer) => {
    setSavedPrinters(prev => prev.map(p => 
      p.id === printer.id ? { ...p, autoConnect: !p.autoConnect } : p
    ));
    showSuccess('Settings Updated', `Auto-connect ${printer.autoConnect ? 'disabled' : 'enabled'} for ${printer.name}`);
  };

  const deletePrinter = (printer) => {
    Alert.alert(
      'Delete Printer',
      `Are you sure you want to remove "${printer.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSavedPrinters(prev => prev.filter(p => p.id !== printer.id));
            showSuccess('Printer Removed', `"${printer.name}" has been removed`);
          }
        }
      ]
    );
  };

  const savePrinter = async (scannedPrinter) => {
    const newPrinter = {
      id: Date.now().toString(),
      name: scannedPrinter.displayName || scannedPrinter.name,
      type: connectionType,
      address: scannedPrinter.address || scannedPrinter.path,
      isConnected: false,
      lastConnected: null,
      status: 'Ready',
      autoConnect: false,
    };
    
    setSavedPrinters(prev => [...prev, newPrinter]);
    showSuccess('Printer Added', `"${newPrinter.name}" has been saved`);
  };

  const testPrint = async () => {
    if (!connectionStatus?.isConnected) {
      showWarning('Not Connected', 'Please connect to a printer first');
      return;
    }
    
    try {
      const result = await printerService.printText('Printer Test\n\nThis is a test print from PayECR\n\n', {
        fontSize: 'normal',
        alignment: 'center'
      });
      
      if (result.success) {
        showSuccess('Test Print', 'Test print sent successfully');
      } else {
        showError('Print Failed', result.error || 'Test print failed');
      }
      
    } catch (error) {
      showError('Print Error', error.message || 'Test print failed');
    }
  };

  const filteredPrinters = savedPrinters.filter(printer =>
    printer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    printer.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderPrinterItem = ({ item: printer }) => {
    const isOnline = printer.status === 'Ready';
    const isCurrentlyConnected = printer.isConnected;
    
    return (
      <Card style={styles.printerCard}>
        <Card.Content>
          <View style={styles.printerHeader}>
            <View style={styles.printerInfo}>
              <View style={styles.printerNameRow}>
                <Text style={styles.printerName}>{printer.name}</Text>
                <AnimatedStatusIndicator 
                  status={isCurrentlyConnected ? 'connected' : isOnline ? 'ready' : 'offline'}
                  size={12}
                />
              </View>
              <Text style={styles.printerType}>{printer.type}</Text>
              <Text style={styles.printerAddress}>{printer.address}</Text>
              {printer.lastConnected && (
                <Text style={styles.lastConnected}>
                  Last used: {new Date(printer.lastConnected).toLocaleDateString()}
                </Text>
              )}
            </View>
            
            <View style={styles.printerActions}>
              <Chip
                style={[styles.statusChip, {
                  backgroundColor: isCurrentlyConnected ? '#4CAF50' : isOnline ? '#2196F3' : '#f44336'
                }]}
                textStyle={{ color: 'white', fontSize: 12 }}
              >
                {isCurrentlyConnected ? 'Connected' : isOnline ? 'Ready' : 'Offline'}
              </Chip>
              
              <View style={styles.actionButtons}>
                <IconButton
                  icon="cog"
                  size={20}
                  onPress={() => setSelectedPrinter(printer)}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => deletePrinter(printer)}
                />
              </View>
            </View>
          </View>
          
          <View style={styles.printerControls}>
            <View style={styles.autoConnectRow}>
              <Text style={styles.autoConnectLabel}>Auto-connect</Text>
              <Switch
                value={printer.autoConnect}
                onValueChange={() => toggleAutoConnect(printer)}
                disabled={isConnecting}
              />
            </View>
          </View>
        </Card.Content>
        
        <Card.Actions>
          {isCurrentlyConnected ? (
            <Button
              mode="outlined"
              onPress={disconnectPrinter}
              disabled={isConnecting}
              style={styles.connectButton}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={() => connectToPrinter(printer)}
              disabled={isConnecting || !isOnline}
              loading={isConnecting}
              style={styles.connectButton}
            >
              {isOnline ? 'Connect' : 'Offline'}
            </Button>
          )}
        </Card.Actions>
      </Card>
    );
  };

  const renderScannedPrinterItem = ({ item }) => (
    <List.Item
      title={item.displayName || item.name || 'Unknown Printer'}
      description={item.address || item.path || 'No address'}
      left={(props) => <List.Icon {...props} icon="printer" />}
      right={(props) => (
        <Button
          mode="contained"
          onPress={() => savePrinter(item)}
          compact
        >
          Add
        </Button>
      )}
      style={styles.scannedPrinterItem}
    />
  );

  return (
    <ResponsiveGrid scrollable={true}>
      {/* Current Connection Status */}
      {connectionStatus?.isConnected && (
        <DashboardCard
          title="Active Printer"
          subtitle={`${connectionStatus.connectionType} connection active`}
          icon="printer-check"
          cardType="info"
          status="success"
          headerAction={
            <Button mode="outlined" onPress={testPrint} compact>
              Test Print
            </Button>
          }
        >
          <Text style={styles.connectedPrinterInfo}>
            {connectionStatus.lastConnectedDevice?.type} printer connected
          </Text>
          {connectionStatus.lastConnectedDevice?.address && (
            <Text style={styles.connectedPrinterAddress}>
              {connectionStatus.lastConnectedDevice.address}
            </Text>
          )}
        </DashboardCard>
      )}

      {/* Printer Type Selector */}
      <DashboardCard
        title="Printer Type"
        subtitle="Select printer connection type"
        icon="printer-settings"
        cardType="action"
      >
        <SegmentedButtons
          value={connectionType}
          onValueChange={setConnectionType}
          buttons={printerTypes.map(type => ({
            value: type.value,
            label: type.label,
            icon: type.icon,
          }))}
          style={styles.segmentedButtons}
        />
      </DashboardCard>

      {/* Scanner */}
      <DashboardCard
        title="Scan for Printers"
        subtitle={`Find available ${connectionType} printers`}
        icon="radar"
        cardType="action"
        headerAction={
          <Button
            mode="contained"
            onPress={scanForPrinters}
            loading={isScanning}
            disabled={isScanning}
            compact
          >
            {isScanning ? 'Scanning...' : 'Scan'}
          </Button>
        }
      >
        {isScanning && (
          <View style={styles.scanProgress}>
            <Text style={styles.scanText}>Scanning for {connectionType} printers...</Text>
            <ProgressBar progress={scanProgress / 100} style={styles.progressBar} />
          </View>
        )}
        
        {scannedPrinters.length > 0 && (
          <View style={styles.scannedResults}>
            <Text style={styles.scannedTitle}>Found Printers:</Text>
            <FlatList
              data={scannedPrinters}
              keyExtractor={(item) => item.id}
              renderItem={renderScannedPrinterItem}
              style={styles.scannedList}
            />
          </View>
        )}
      </DashboardCard>

      {/* Saved Printers */}
      <DashboardCard
        title="Saved Printers"
        subtitle={`${filteredPrinters.length} printer${filteredPrinters.length !== 1 ? 's' : ''} configured`}
        icon="content-save"
        cardType="default"
        fullWidth={true}
      >
        <Searchbar
          placeholder="Search printers..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <FlatList
          data={filteredPrinters}
          keyExtractor={(item) => item.id}
          renderItem={renderPrinterItem}
          style={styles.printersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No saved printers</Text>
              <Text style={styles.emptySubtext}>
                Scan for printers to get started
              </Text>
            </View>
          }
        />
      </DashboardCard>
    </ResponsiveGrid>
  );
};

const styles = StyleSheet.create({
  segmentedButtons: {
    marginBottom: 12,
  },
  scanProgress: {
    marginVertical: 12,
  },
  scanText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
  },
  scannedResults: {
    marginTop: 16,
  },
  scannedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  scannedList: {
    maxHeight: 200,
  },
  scannedPrinterItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchbar: {
    marginBottom: 16,
  },
  printersList: {
    maxHeight: 400,
  },
  printerCard: {
    marginBottom: 12,
    elevation: 2,
  },
  printerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  printerInfo: {
    flex: 1,
  },
  printerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  printerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  printerType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  printerAddress: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  lastConnected: {
    fontSize: 12,
    color: '#999',
  },
  printerActions: {
    alignItems: 'flex-end',
  },
  statusChip: {
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  printerControls: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  autoConnectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoConnectLabel: {
    fontSize: 14,
    color: '#333',
  },
  connectButton: {
    flex: 1,
  },
  connectedPrinterInfo: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  connectedPrinterAddress: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default PrinterManagement;
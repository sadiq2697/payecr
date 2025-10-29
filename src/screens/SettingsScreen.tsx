import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import {
  Settings as SettingsIcon,
  Store,
  Printer,
  CreditCard,
  Bell,
  Lock,
  Globe,
  Moon,
  Wifi,
  Database,
  ChevronRight,
  X,
  Save,
  RotateCcw,
  Smartphone,
  Monitor,
  HardDrive,
  Keyboard,
  Scan,
  Scale,
  DollarSign,
  Receipt,
  Server,
  RefreshCw,
  Zap,
  ShieldCheck,
  Users,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  // Store Information
  const [storeName, setStoreName] = useState('ENTERPRISE POS');
  const [storeId, setStoreId] = useState('HQ-001');
  const [registerId, setRegisterId] = useState('POS-03');
  const [storeAddress, setStoreAddress] = useState('123 Main Street, Suite 100');
  const [storePhone, setStorePhone] = useState('+1 (555) 123-4567');
  const [storeEmail, setStoreEmail] = useState('store@enterprise.com');

  // Receipt Printer Settings
  const [printerEnabled, setPrinterEnabled] = useState(true);
  const [printerType, setPrinterType] = useState('Thermal');
  const [printerPort, setPrinterPort] = useState('USB001');
  const [printerWidth, setPrinterWidth] = useState('80mm');
  const [autoReceiptPrint, setAutoReceiptPrint] = useState(true);
  const [printLogo, setPrintLogo] = useState(true);
  const [printBarcode, setPrintBarcode] = useState(true);
  const [receiptCopies, setReceiptCopies] = useState('1');

  // Card Terminal Settings
  const [cardTerminalEnabled, setCardTerminalEnabled] = useState(true);
  const [terminalType, setTerminalType] = useState('Ingenico');
  const [terminalPort, setTerminalPort] = useState('COM3');
  const [terminalTimeout, setTerminalTimeout] = useState('60');
  const [autoCardDetection, setAutoCardDetection] = useState(true);
  const [contactlessEnabled, setContactlessEnabled] = useState(true);
  const [chipCardEnabled, setChipCardEnabled] = useState(true);
  const [magneticStripeEnabled, setMagneticStripeEnabled] = useState(true);

  // Barcode Scanner Settings
  const [barcodeScannerEnabled, setBarcodeScannerEnabled] = useState(true);
  const [scannerType, setScannerType] = useState('USB');
  const [scannerPort, setScannerPort] = useState('USB002');
  const [scanBeep, setScanBeep] = useState(true);
  const [continuousScan, setContinuousScan] = useState(false);

  // Cash Drawer Settings
  const [cashDrawerEnabled, setCashDrawerEnabled] = useState(true);
  const [drawerOpenOnSale, setDrawerOpenOnSale] = useState(true);
  const [drawerOpenOnRefund, setDrawerOpenOnRefund] = useState(true);
  const [cashDenominations, setCashDenominations] = useState('1,5,10,20,50,100');

  // Customer Display Settings
  const [customerDisplayEnabled, setCustomerDisplayEnabled] = useState(true);
  const [displayPort, setDisplayPort] = useState('Display-1');
  const [displayRotation, setDisplayRotation] = useState('0');
  const [showPrices, setShowPrices] = useState(true);
  const [showPromotions, setShowPromotions] = useState(true);

  // Scale Settings
  const [scaleEnabled, setScaleEnabled] = useState(false);
  const [scalePort, setScalePort] = useState('COM4');
  const [scaleUnit, setScaleUnit] = useState('kg');
  const [scalePrecision, setScalePrecision] = useState('2');

  // Transaction Settings
  const [taxRate, setTaxRate] = useState('8.5');
  const [currency, setCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('Card');
  const [allowPartialPayments, setAllowPartialPayments] = useState(true);
  const [allowNegativeInventory, setAllowNegativeInventory] = useState(false);
  const [requireCustomer, setRequireCustomer] = useState(false);
  const [autoDiscounts, setAutoDiscounts] = useState(true);
  const [loyaltyProgram, setLoyaltyProgram] = useState(true);

  // Network Settings
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [syncInterval, setSyncInterval] = useState('5');
  const [apiEndpoint, setApiEndpoint] = useState('https://api.enterprise.com');
  const [apiTimeout, setApiTimeout] = useState('30');
  const [cloudBackup, setCloudBackup] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  // App Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('English');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState('12h');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // Security Settings
  const [requirePIN, setRequirePIN] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('15');
  const [auditLog, setAuditLog] = useState(true);
  const [encryptData, setEncryptData] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [autoLock, setAutoLock] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);

  // Reporting Settings
  const [autoEndOfDay, setAutoEndOfDay] = useState(true);
  const [endOfDayTime, setEndOfDayTime] = useState('23:00');
  const [emailReports, setEmailReports] = useState(true);
  const [reportEmail, setReportEmail] = useState('reports@enterprise.com');
  const [dailySummary, setDailySummary] = useState(true);
  const [inventoryAlerts, setInventoryAlerts] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState('10');

  const handleSave = () => {
    Alert.alert(
      'Save Settings',
      'Are you sure you want to save all changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => {
            // TODO: Implement save logic
            console.log('Saving settings...');
            Alert.alert('Success', 'Settings saved successfully');
          },
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to factory defaults. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement reset logic
            console.log('Resetting settings...');
          },
        },
      ]
    );
  };

  const handleTestPrinter = () => {
    Alert.alert('Test Printer', 'Printing test receipt...');
  };

  const handleTestTerminal = () => {
    Alert.alert('Test Terminal', 'Testing card terminal connection...');
  };

  const handleTestScanner = () => {
    Alert.alert('Test Scanner', 'Testing barcode scanner...');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <SettingsIcon size={20} color="#FFFFFF" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>System Settings</Text>
            <Text style={styles.headerSubtitle}>Configure hardware, peripherals & system</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <X size={20} color="#525252" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Store Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Store size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Store Information</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Store Name</Text>
              <TextInput
                style={styles.input}
                value={storeName}
                onChangeText={setStoreName}
                placeholder="Enter store name"
                placeholderTextColor="#A3A3A3"
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Store ID</Text>
                <TextInput
                  style={styles.input}
                  value={storeId}
                  onChangeText={setStoreId}
                  placeholder="HQ-001"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Register ID</Text>
                <TextInput
                  style={styles.input}
                  value={registerId}
                  onChangeText={setRegisterId}
                  placeholder="POS-03"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.input}
                value={storeAddress}
                onChangeText={setStoreAddress}
                placeholder="Store address"
                placeholderTextColor="#A3A3A3"
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={storePhone}
                  onChangeText={setStorePhone}
                  placeholder="Phone number"
                  placeholderTextColor="#A3A3A3"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={storeEmail}
                  onChangeText={setStoreEmail}
                  placeholder="Email address"
                  placeholderTextColor="#A3A3A3"
                  keyboardType="email-address"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Receipt Printer */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Printer size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Receipt Printer</Text>
            <View style={styles.statusBadge}>
              <CheckCircle size={10} color="#059669" />
              <Text style={styles.statusBadgeText}>Connected</Text>
            </View>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Enable Printer</Text>
              </View>
              <Switch
                value={printerEnabled}
                onValueChange={setPrinterEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={printerEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Printer Type</Text>
                <TextInput
                  style={styles.input}
                  value={printerType}
                  onChangeText={setPrinterType}
                  placeholder="Thermal/Dot Matrix"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Port</Text>
                <TextInput
                  style={styles.input}
                  value={printerPort}
                  onChangeText={setPrinterPort}
                  placeholder="USB001"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Paper Width</Text>
                <TextInput
                  style={styles.input}
                  value={printerWidth}
                  onChangeText={setPrinterWidth}
                  placeholder="80mm"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Receipt Copies</Text>
                <TextInput
                  style={styles.input}
                  value={receiptCopies}
                  onChangeText={setReceiptCopies}
                  placeholder="1"
                  placeholderTextColor="#A3A3A3"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Auto-Print Receipts</Text>
              </View>
              <Switch
                value={autoReceiptPrint}
                onValueChange={setAutoReceiptPrint}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={autoReceiptPrint ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Print Logo on Receipt</Text>
              </View>
              <Switch
                value={printLogo}
                onValueChange={setPrintLogo}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={printLogo ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Print Barcode</Text>
              </View>
              <Switch
                value={printBarcode}
                onValueChange={setPrintBarcode}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={printBarcode ? '#059669' : '#F5F5F5'}
              />
            </View>
            <TouchableOpacity style={styles.testButton} onPress={handleTestPrinter}>
              <Printer size={16} color="#2563EB" />
              <Text style={styles.testButtonText}>Test Printer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Terminal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Card Payment Terminal</Text>
            <View style={styles.statusBadge}>
              <CheckCircle size={10} color="#059669" />
              <Text style={styles.statusBadgeText}>Connected</Text>
            </View>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Enable Card Terminal</Text>
              </View>
              <Switch
                value={cardTerminalEnabled}
                onValueChange={setCardTerminalEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={cardTerminalEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Terminal Type</Text>
                <TextInput
                  style={styles.input}
                  value={terminalType}
                  onChangeText={setTerminalType}
                  placeholder="Ingenico/Verifone"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Port</Text>
                <TextInput
                  style={styles.input}
                  value={terminalPort}
                  onChangeText={setTerminalPort}
                  placeholder="COM3"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Transaction Timeout (seconds)</Text>
              <TextInput
                style={styles.input}
                value={terminalTimeout}
                onChangeText={setTerminalTimeout}
                placeholder="60"
                placeholderTextColor="#A3A3A3"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Auto Card Detection</Text>
              </View>
              <Switch
                value={autoCardDetection}
                onValueChange={setAutoCardDetection}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={autoCardDetection ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Contactless/NFC Payments</Text>
              </View>
              <Switch
                value={contactlessEnabled}
                onValueChange={setContactlessEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={contactlessEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Chip Card (EMV)</Text>
              </View>
              <Switch
                value={chipCardEnabled}
                onValueChange={setChipCardEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={chipCardEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Magnetic Stripe</Text>
              </View>
              <Switch
                value={magneticStripeEnabled}
                onValueChange={setMagneticStripeEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={magneticStripeEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <TouchableOpacity style={styles.testButton} onPress={handleTestTerminal}>
              <CreditCard size={16} color="#2563EB" />
              <Text style={styles.testButtonText}>Test Terminal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Barcode Scanner */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Scan size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Barcode Scanner</Text>
            <View style={styles.statusBadge}>
              <CheckCircle size={10} color="#059669" />
              <Text style={styles.statusBadgeText}>Connected</Text>
            </View>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Enable Scanner</Text>
              </View>
              <Switch
                value={barcodeScannerEnabled}
                onValueChange={setBarcodeScannerEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={barcodeScannerEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Scanner Type</Text>
                <TextInput
                  style={styles.input}
                  value={scannerType}
                  onChangeText={setScannerType}
                  placeholder="USB/Wireless"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Port</Text>
                <TextInput
                  style={styles.input}
                  value={scannerPort}
                  onChangeText={setScannerPort}
                  placeholder="USB002"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Scan Beep Sound</Text>
              </View>
              <Switch
                value={scanBeep}
                onValueChange={setScanBeep}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={scanBeep ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Continuous Scan Mode</Text>
              </View>
              <Switch
                value={continuousScan}
                onValueChange={setContinuousScan}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={continuousScan ? '#059669' : '#F5F5F5'}
              />
            </View>
            <TouchableOpacity style={styles.testButton} onPress={handleTestScanner}>
              <Scan size={16} color="#2563EB" />
              <Text style={styles.testButtonText}>Test Scanner</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cash Drawer */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Cash Drawer</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Enable Cash Drawer</Text>
              </View>
              <Switch
                value={cashDrawerEnabled}
                onValueChange={setCashDrawerEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={cashDrawerEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Open on Sale Completion</Text>
              </View>
              <Switch
                value={drawerOpenOnSale}
                onValueChange={setDrawerOpenOnSale}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={drawerOpenOnSale ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Open on Refund</Text>
              </View>
              <Switch
                value={drawerOpenOnRefund}
                onValueChange={setDrawerOpenOnRefund}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={drawerOpenOnRefund ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cash Denominations (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={cashDenominations}
                onChangeText={setCashDenominations}
                placeholder="1,5,10,20,50,100"
                placeholderTextColor="#A3A3A3"
              />
            </View>
          </View>
        </View>

        {/* Customer Display */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Monitor size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Customer Display</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Enable Customer Display</Text>
              </View>
              <Switch
                value={customerDisplayEnabled}
                onValueChange={setCustomerDisplayEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={customerDisplayEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Display Port</Text>
                <TextInput
                  style={styles.input}
                  value={displayPort}
                  onChangeText={setDisplayPort}
                  placeholder="Display-1"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Rotation (degrees)</Text>
                <TextInput
                  style={styles.input}
                  value={displayRotation}
                  onChangeText={setDisplayRotation}
                  placeholder="0/90/180/270"
                  placeholderTextColor="#A3A3A3"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Show Item Prices</Text>
              </View>
              <Switch
                value={showPrices}
                onValueChange={setShowPrices}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={showPrices ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Show Promotions</Text>
              </View>
              <Switch
                value={showPromotions}
                onValueChange={setShowPromotions}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={showPromotions ? '#059669' : '#F5F5F5'}
              />
            </View>
          </View>
        </View>

        {/* Scale */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Scale size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Electronic Scale</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Enable Scale</Text>
              </View>
              <Switch
                value={scaleEnabled}
                onValueChange={setScaleEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={scaleEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Scale Port</Text>
                <TextInput
                  style={styles.input}
                  value={scalePort}
                  onChangeText={setScalePort}
                  placeholder="COM4"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={scaleUnit}
                  onChangeText={setScaleUnit}
                  placeholder="kg/lb"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Decimal Precision</Text>
              <TextInput
                style={styles.input}
                value={scalePrecision}
                onChangeText={setScalePrecision}
                placeholder="2"
                placeholderTextColor="#A3A3A3"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Transaction Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Transaction Settings</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Tax Rate (%)</Text>
                <TextInput
                  style={styles.input}
                  value={taxRate}
                  onChangeText={setTaxRate}
                  placeholder="8.5"
                  placeholderTextColor="#A3A3A3"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Currency</Text>
                <TextInput
                  style={styles.input}
                  value={currency}
                  onChangeText={setCurrency}
                  placeholder="USD"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Currency Symbol</Text>
                <TextInput
                  style={styles.input}
                  value={currencySymbol}
                  onChangeText={setCurrencySymbol}
                  placeholder="$"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Default Payment</Text>
                <TextInput
                  style={styles.input}
                  value={defaultPaymentMethod}
                  onChangeText={setDefaultPaymentMethod}
                  placeholder="Card/Cash"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Allow Partial Payments</Text>
              </View>
              <Switch
                value={allowPartialPayments}
                onValueChange={setAllowPartialPayments}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={allowPartialPayments ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Allow Negative Inventory</Text>
              </View>
              <Switch
                value={allowNegativeInventory}
                onValueChange={setAllowNegativeInventory}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={allowNegativeInventory ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Require Customer for Sale</Text>
              </View>
              <Switch
                value={requireCustomer}
                onValueChange={setRequireCustomer}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={requireCustomer ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Auto Apply Discounts</Text>
              </View>
              <Switch
                value={autoDiscounts}
                onValueChange={setAutoDiscounts}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={autoDiscounts ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Enable Loyalty Program</Text>
              </View>
              <Switch
                value={loyaltyProgram}
                onValueChange={setLoyaltyProgram}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={loyaltyProgram ? '#059669' : '#F5F5F5'}
              />
            </View>
          </View>
        </View>

        {/* Network & Sync */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wifi size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Network & Synchronization</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>WiFi Enabled</Text>
              </View>
              <Switch
                value={wifiEnabled}
                onValueChange={setWifiEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={wifiEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Offline Mode</Text>
              </View>
              <Switch
                value={offlineMode}
                onValueChange={setOfflineMode}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={offlineMode ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>API Endpoint</Text>
              <TextInput
                style={styles.input}
                value={apiEndpoint}
                onChangeText={setApiEndpoint}
                placeholder="https://api.enterprise.com"
                placeholderTextColor="#A3A3A3"
                keyboardType="url"
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Sync Interval (min)</Text>
                <TextInput
                  style={styles.input}
                  value={syncInterval}
                  onChangeText={setSyncInterval}
                  placeholder="5"
                  placeholderTextColor="#A3A3A3"
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>API Timeout (sec)</Text>
                <TextInput
                  style={styles.input}
                  value={apiTimeout}
                  onChangeText={setApiTimeout}
                  placeholder="30"
                  placeholderTextColor="#A3A3A3"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Cloud Backup</Text>
              </View>
              <Switch
                value={cloudBackup}
                onValueChange={setCloudBackup}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={cloudBackup ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Auto Sync Data</Text>
              </View>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={autoSync ? '#059669' : '#F5F5F5'}
              />
            </View>
          </View>
        </View>

        {/* Application Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Application Settings</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Bell size={16} color="#525252" />
                <Text style={styles.settingLabel}>Sound Effects</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={soundEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Bell size={16} color="#525252" />
                <Text style={styles.settingLabel}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={notificationsEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Smartphone size={16} color="#525252" />
                <Text style={styles.settingLabel}>Vibration</Text>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={setVibrationEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={vibrationEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Moon size={16} color="#525252" />
                <Text style={styles.settingLabel}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={darkMode ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Zap size={16} color="#525252" />
                <Text style={styles.settingLabel}>Animations</Text>
              </View>
              <Switch
                value={animationsEnabled}
                onValueChange={setAnimationsEnabled}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={animationsEnabled ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Language</Text>
                <TextInput
                  style={styles.input}
                  value={language}
                  onChangeText={setLanguage}
                  placeholder="English"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Date Format</Text>
                <TextInput
                  style={styles.input}
                  value={dateFormat}
                  onChangeText={setDateFormat}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#A3A3A3"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Time Format</Text>
              <TextInput
                style={styles.input}
                value={timeFormat}
                onChangeText={setTimeFormat}
                placeholder="12h/24h"
                placeholderTextColor="#A3A3A3"
              />
            </View>
          </View>
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShieldCheck size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Security & Privacy</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Lock size={16} color="#525252" />
                <Text style={styles.settingLabel}>Require PIN</Text>
              </View>
              <Switch
                value={requirePIN}
                onValueChange={setRequirePIN}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={requirePIN ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Lock size={16} color="#525252" />
                <Text style={styles.settingLabel}>Auto Lock Screen</Text>
              </View>
              <Switch
                value={autoLock}
                onValueChange={setAutoLock}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={autoLock ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <ShieldCheck size={16} color="#525252" />
                <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
              </View>
              <Switch
                value={twoFactorAuth}
                onValueChange={setTwoFactorAuth}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={twoFactorAuth ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Smartphone size={16} color="#525252" />
                <Text style={styles.settingLabel}>Biometric Authentication</Text>
              </View>
              <Switch
                value={biometricAuth}
                onValueChange={setBiometricAuth}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={biometricAuth ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Session Timeout (minutes)</Text>
              <TextInput
                style={styles.input}
                value={sessionTimeout}
                onChangeText={setSessionTimeout}
                placeholder="15"
                placeholderTextColor="#A3A3A3"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <FileText size={16} color="#525252" />
                <Text style={styles.settingLabel}>Enable Audit Log</Text>
              </View>
              <Switch
                value={auditLog}
                onValueChange={setAuditLog}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={auditLog ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Lock size={16} color="#525252" />
                <Text style={styles.settingLabel}>Encrypt Data</Text>
              </View>
              <Switch
                value={encryptData}
                onValueChange={setEncryptData}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={encryptData ? '#059669' : '#F5F5F5'}
              />
            </View>
            <TouchableOpacity style={styles.navigationItem}>
              <View style={styles.settingLeft}>
                <Lock size={16} color="#525252" />
                <Text style={styles.settingLabel}>Change PIN</Text>
              </View>
              <ChevronRight size={16} color="#A3A3A3" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navigationItem}>
              <View style={styles.settingLeft}>
                <Users size={16} color="#525252" />
                <Text style={styles.settingLabel}>User Permissions</Text>
              </View>
              <ChevronRight size={16} color="#A3A3A3" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reporting Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={18} color="#171717" />
            <Text style={styles.sectionTitle}>Reports & Alerts</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Clock size={16} color="#525252" />
                <Text style={styles.settingLabel}>Auto End-of-Day Report</Text>
              </View>
              <Switch
                value={autoEndOfDay}
                onValueChange={setAutoEndOfDay}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={autoEndOfDay ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End-of-Day Time</Text>
              <TextInput
                style={styles.input}
                value={endOfDayTime}
                onChangeText={setEndOfDayTime}
                placeholder="23:00"
                placeholderTextColor="#A3A3A3"
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <FileText size={16} color="#525252" />
                <Text style={styles.settingLabel}>Email Reports</Text>
              </View>
              <Switch
                value={emailReports}
                onValueChange={setEmailReports}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={emailReports ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Report Email Address</Text>
              <TextInput
                style={styles.input}
                value={reportEmail}
                onChangeText={setReportEmail}
                placeholder="reports@enterprise.com"
                placeholderTextColor="#A3A3A3"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <FileText size={16} color="#525252" />
                <Text style={styles.settingLabel}>Daily Summary</Text>
              </View>
              <Switch
                value={dailySummary}
                onValueChange={setDailySummary}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={dailySummary ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <AlertCircle size={16} color="#525252" />
                <Text style={styles.settingLabel}>Inventory Alerts</Text>
              </View>
              <Switch
                value={inventoryAlerts}
                onValueChange={setInventoryAlerts}
                trackColor={{ false: '#D4D4D4', true: '#BBF7D0' }}
                thumbColor={inventoryAlerts ? '#059669' : '#F5F5F5'}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Low Stock Threshold</Text>
              <TextInput
                style={styles.input}
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                placeholder="10"
                placeholderTextColor="#A3A3A3"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
        >
          <RotateCcw size={16} color="#DC2626" />
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Save size={16} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save All Changes</Text>
        </TouchableOpacity>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusBarLeft}>
          <View style={styles.statusItem}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              System: <Text style={styles.statusTextBold}>Online</Text>
            </Text>
          </View>
          <View style={styles.statusSeparator} />
          <View style={styles.statusItem}>
            <Receipt size={12} color="#D4D4D4" />
            <Text style={styles.statusText}>
              Printer: <Text style={styles.statusTextBold}>Ready</Text>
            </Text>
          </View>
          <View style={styles.statusSeparator} />
          <View style={styles.statusItem}>
            <CreditCard size={12} color="#D4D4D4" />
            <Text style={styles.statusText}>
              Terminal: <Text style={styles.statusTextBold}>Connected</Text>
            </Text>
          </View>
        </View>
        <View style={styles.statusBarRight}>
          <Text style={styles.statusVersion}>v2.0.1045-ENTERPRISE</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#2563EB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#171717',
    lineHeight: 16,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#737373',
    lineHeight: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171717',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
  sectionContent: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#525252',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 4,
    fontSize: 14,
    color: '#171717',
    fontFamily: 'monospace',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: '#171717',
    fontWeight: '500',
  },
  navigationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 4,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  statusBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusSeparator: {
    width: 1,
    height: 12,
    backgroundColor: '#525252',
  },
  statusText: {
    fontSize: 12,
    color: '#D4D4D4',
  },
  statusTextBold: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusVersion: {
    fontSize: 12,
    color: '#A3A3A3',
  },
});

export default SettingsScreen;

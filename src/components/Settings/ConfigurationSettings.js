import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Button,
  SegmentedButtons,
} from 'react-native-paper';
import { ECR_CONSTANTS } from '../../utils/Constants';
import useAlert from '../../hooks/useAlert';
import LazyInput from '../OptimizedComponents/LazyInput';
import ResponsiveGrid from '../UI/ResponsiveGrid';
import DashboardCard from '../UI/DashboardCard';

const ConfigurationSettings = ({ ecrService, onSettingsChange }) => {
  // Configuration state
  const [config, setConfig] = useState({
    // Connection Settings
    connection: {
      defaultType: 'serial',
      tcpHost: '192.168.1.100',
      tcpPort: ECR_CONSTANTS.TCP_CONFIG.PORT.toString(),
      tcpTimeout: ECR_CONSTANTS.TIMEOUTS.COMMAND.toString(),
      serialBaudRate: ECR_CONSTANTS.SERIAL_CONFIG.BAUD_RATE.toString(),
      serialDataBits: ECR_CONSTANTS.SERIAL_CONFIG.DATA_BITS.toString(),
      serialStopBits: ECR_CONSTANTS.SERIAL_CONFIG.STOP_BITS.toString(),
      autoReconnect: true,
      reconnectInterval: '5',
    },
    
    // Transaction Settings
    transaction: {
      defaultAmount: '100',
      enableReceiptGeneration: true,
      enablePOSReceipts: true,
      defaultHostNumber: 'CP',
      transactionTimeout: '30',
      maxRetries: '3',
      enableSplitPayments: true,
      defaultCurrency: 'MYR',
    },
    
    // UI Settings
    ui: {
      theme: 'light',
      enableAnimations: true,
      showAdvancedOptions: false,
      defaultView: 'home',
      enableVibration: true,
      enableSounds: true,
      language: 'en',
    },
    
    // Logging Settings
    logging: {
      enableFileLogging: true,
      logLevel: 'info',
      maxLogFiles: '10',
      logRetentionDays: '30',
      enableCommunicationLog: true,
      enableErrorReporting: true,
    },
    
    // Security Settings
    security: {
      enableEncryption: false,
      requireAuthentication: false,
      sessionTimeout: '30',
      enableAuditLog: true,
      maskSensitiveData: true,
    },
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { showSuccess, showError, showWarning } = useAlert();

  const connectionTypes = [
    { value: 'serial', label: 'Serial' },
    { value: 'tcp', label: 'TCP/IP' },
    { value: 'usb', label: 'USB' },
  ];

  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' },
  ];


  const logLevels = [
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
  ];

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  const loadConfiguration = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load configuration from ECR service and ConfigurationManager
      if (ecrService?.configManager) {
        const savedConfig = await ecrService.configManager.getConfiguration();
        if (savedConfig) {
          // Map the saved config to our UI state structure
          const mappedConfig = {
            connection: {
              defaultType: savedConfig.CONNECTION_TYPE?.toLowerCase() || 'serial',
              tcpHost: savedConfig.IP_TERMINAL || '192.168.1.100',
              tcpPort: savedConfig.PORT_Terminal || '88',
              tcpTimeout: (parseInt(savedConfig.TIMEOUT || '30000') / 1000).toString(),
              serialBaudRate: savedConfig.BAUD_RATE || '9600',
              serialDataBits: savedConfig.DATA_BITS || '8',
              serialStopBits: savedConfig.STOP_BITS || '1',
              autoReconnect: true,
              reconnectInterval: '5',
            },
            transaction: {
              defaultAmount: '100',
              enableReceiptGeneration: savedConfig.ENABLE_RECEIPTS === 'true',
              enablePOSReceipts: savedConfig.ENABLE_POS_RECEIPTS === 'true',
              defaultHostNumber: 'CP',
              transactionTimeout: '30',
              maxRetries: '3',
              enableSplitPayments: savedConfig.ENABLE_SPLIT_PAYMENTS === 'true',
              defaultCurrency: savedConfig.DEFAULT_CURRENCY || 'MYR',
            },
            ui: {
              theme: savedConfig.THEME || 'light',
              enableAnimations: savedConfig.ENABLE_ANIMATIONS === 'true',
              showAdvancedOptions: false,
              defaultView: 'home',
              enableVibration: true,
              enableSounds: true,
              language: 'en',
            },
            logging: {
              enableFileLogging: savedConfig.LOG_ENABLED === 'true',
              logLevel: savedConfig.LOG_LEVEL || 'info',
              maxLogFiles: savedConfig.MAX_LOG_FILES || '10',
              logRetentionDays: savedConfig.LOG_RETENTION_DAYS || '30',
              enableCommunicationLog: true,
              enableErrorReporting: true,
            },
            security: {
              enableEncryption: false,
              requireAuthentication: false,
              sessionTimeout: '30',
              enableAuditLog: true,
              maskSensitiveData: true,
            },
          };
          setConfig(mappedConfig);
        }
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      showError('Load Error', 'Failed to load configuration settings');
    } finally {
      setIsLoading(false);
    }
  }, [ecrService]);

  const saveConfiguration = useCallback(async () => {
    setIsLoading(true);
    try {
      // Save configuration via ECR service
      if (ecrService?.configManager) {
        // Map UI state back to ConfigurationManager format
        ecrService.configManager.set('CONNECTION_TYPE', config.connection.defaultType === 'tcp' ? 'TCP' : 'Serial');
        ecrService.configManager.set('IP_TERMINAL', config.connection.tcpHost);
        ecrService.configManager.set('PORT_Terminal', config.connection.tcpPort);
        ecrService.configManager.set('TIMEOUT', (parseInt(config.connection.tcpTimeout) * 1000).toString());
        ecrService.configManager.set('BAUD_RATE', config.connection.serialBaudRate);
        ecrService.configManager.set('DATA_BITS', config.connection.serialDataBits);
        ecrService.configManager.set('STOP_BITS', config.connection.serialStopBits);
        
        // Transaction settings
        ecrService.configManager.set('ENABLE_RECEIPTS', config.transaction.enableReceiptGeneration.toString());
        ecrService.configManager.set('ENABLE_POS_RECEIPTS', config.transaction.enablePOSReceipts.toString());
        ecrService.configManager.set('ENABLE_SPLIT_PAYMENTS', config.transaction.enableSplitPayments.toString());
        ecrService.configManager.set('DEFAULT_CURRENCY', config.transaction.defaultCurrency);
        
        // UI settings
        ecrService.configManager.set('THEME', config.ui.theme);
        ecrService.configManager.set('ENABLE_ANIMATIONS', config.ui.enableAnimations.toString());
        
        // Logging settings
        ecrService.configManager.set('LOG_ENABLED', config.logging.enableFileLogging.toString());
        ecrService.configManager.set('LOG_LEVEL', config.logging.logLevel);
        ecrService.configManager.set('MAX_LOG_FILES', config.logging.maxLogFiles);
        ecrService.configManager.set('LOG_RETENTION_DAYS', config.logging.logRetentionDays);
        
        // Save the configuration
        await ecrService.configManager.saveConfiguration();
        
        // Apply settings to ECR service
        ecrService.enableReceiptGeneration = config.transaction.enableReceiptGeneration;
        ecrService.enablePOSReceipts = config.transaction.enablePOSReceipts;
        
        // Update file logger settings if available
        if (ecrService.fileLogger && typeof ecrService.fileLogger.updateSettings === 'function') {
          try {
            await ecrService.fileLogger.updateSettings({
              enabled: config.logging.enableFileLogging,
              level: config.logging.logLevel,
              maxFiles: parseInt(config.logging.maxLogFiles),
              retentionDays: parseInt(config.logging.logRetentionDays),
            });
          } catch (loggerError) {
            console.warn('Failed to update file logger settings:', loggerError);
          }
        }
      }

      setIsDirty(false);
      showSuccess('Settings Saved', 'Configuration has been saved successfully');
      onSettingsChange?.();
    } catch (error) {
      console.error('Failed to save configuration:', error);
      showError('Save Error', 'Failed to save configuration settings');
    } finally {
      setIsLoading(false);
    }
  }, [config, ecrService, onSettingsChange]);

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Configuration',
      'Are you sure you want to reset all settings to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setConfig({
              connection: {
                defaultType: 'serial',
                tcpHost: '192.168.1.100',
                tcpPort: ECR_CONSTANTS.TCP_CONFIG.PORT.toString(),
                tcpTimeout: ECR_CONSTANTS.TIMEOUTS.COMMAND.toString(),
                serialBaudRate: ECR_CONSTANTS.SERIAL_CONFIG.BAUD_RATE.toString(),
                serialDataBits: ECR_CONSTANTS.SERIAL_CONFIG.DATA_BITS.toString(),
                serialStopBits: ECR_CONSTANTS.SERIAL_CONFIG.STOP_BITS.toString(),
                autoReconnect: true,
                reconnectInterval: '5',
              },
              transaction: {
                defaultAmount: '100',
                enableReceiptGeneration: true,
                enablePOSReceipts: true,
                defaultHostNumber: 'CP',
                transactionTimeout: '30',
                maxRetries: '3',
                enableSplitPayments: true,
                defaultCurrency: 'MYR',
              },
              ui: {
                theme: 'light',
                enableAnimations: true,
                showAdvancedOptions: false,
                defaultView: 'home',
                enableVibration: true,
                enableSounds: true,
                language: 'en',
              },
              logging: {
                enableFileLogging: true,
                logLevel: 'info',
                maxLogFiles: '10',
                logRetentionDays: '30',
                enableCommunicationLog: true,
                enableErrorReporting: true,
              },
              security: {
                enableEncryption: false,
                requireAuthentication: false,
                sessionTimeout: '30',
                enableAuditLog: true,
                maskSensitiveData: true,
              },
            });
            setIsDirty(true);
            showSuccess('Settings Reset', 'All settings have been reset to defaults');
          },
        },
      ]
    );
  };

  const updateConfig = (section, key, value) => {
    // Validate input before updating
    let validatedValue = value;
    
    if (section === 'connection') {
      if (key === 'tcpHost') {
        // Basic IP address validation
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (value && !ipRegex.test(value) && value !== '') {
          console.warn('Invalid IP address format');
          return;
        }
      } else if (key === 'tcpPort' || key === 'tcpTimeout') {
        // Numeric validation
        const numValue = parseInt(value, 10);
        if (value && (isNaN(numValue) || numValue < 1 || numValue > 65535)) {
          console.warn('Invalid port/timeout value');
          return;
        }
      } else if (key.includes('serial') && (key.includes('Rate') || key.includes('Bits'))) {
        // Serial parameter validation
        const numValue = parseInt(value, 10);
        if (value && isNaN(numValue)) {
          console.warn('Serial parameters must be numeric');
          return;
        }
      }
    } else if (section === 'logging') {
      if (key === 'maxLogFiles' || key === 'logRetentionDays') {
        // Numeric validation for log settings
        const numValue = parseInt(value, 10);
        if (value && (isNaN(numValue) || numValue < 1)) {
          console.warn('Log settings must be positive numbers');
          return;
        }
      }
    } else if (section === 'transaction') {
      if (key === 'defaultAmount' || key === 'transactionTimeout' || key === 'maxRetries') {
        // Numeric validation for transaction settings
        const numValue = parseInt(value, 10);
        if (value && (isNaN(numValue) || numValue < 0)) {
          console.warn('Transaction settings must be non-negative numbers');
          return;
        }
      }
    }
    
    setConfig(prevConfig => ({
      ...prevConfig,
      [section]: {
        ...prevConfig[section],
        [key]: validatedValue,
      },
    }));
    setIsDirty(true);
  };

  const exportConfiguration = async () => {
    try {
      const exportData = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          appVersion: '1.0.0',
        },
        configuration: config,
      };

      const configString = JSON.stringify(exportData, null, 2);
      
      // Here you would typically use a file picker or share dialog
      // For now, we'll just show a success message
      console.log('Configuration exported:', configString);
      showSuccess('Export Complete', 'Configuration has been exported');
    } catch (error) {
      showError('Export Error', 'Failed to export configuration');
    }
  };


  const testConnection = async () => {
    try {
      setIsLoading(true);
      
      if (config.connection.defaultType === 'tcp') {
        // Check if testTCPConnection method exists
        if (ecrService && typeof ecrService.testTCPConnection === 'function') {
          const testResult = await ecrService.testTCPConnection({
            host: config.connection.tcpHost,
            port: parseInt(config.connection.tcpPort, 10),
            timeout: parseInt(config.connection.tcpTimeout, 10) * 1000, // Convert to milliseconds
          });
          
          if (testResult.success) {
            showSuccess('Connection Test', 'TCP connection test successful');
          } else {
            showError('Connection Test', `TCP connection test failed: ${testResult.error}`);
          }
        } else {
          showWarning('Connection Test', 'TCP connection test method not available');
        }
      } else {
        showWarning('Connection Test', 'Connection testing is only available for TCP connections');
      }
    } catch (error) {
      showError('Connection Test', `Connection test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResponsiveGrid scrollable={true}>
      <DashboardCard
        title="Configuration Settings"
        subtitle="Manage application settings and preferences"
        icon="cog"
        cardType="info"
        fullWidth={true}
      >
        {/* Save/Reset Actions */}
        <Card style={styles.actionsCard}>
          <Card.Content>
          <View style={styles.actionsRow}>
            <Button
              mode="contained"
              onPress={saveConfiguration}
              disabled={!isDirty || isLoading}
              loading={isLoading}
              style={styles.actionButton}
            >
              Save Settings
            </Button>
            <Button
              mode="outlined"
              onPress={resetToDefaults}
              disabled={isLoading}
              style={styles.actionButton}
            >
              Reset
            </Button>
            <Button
              mode="text"
              onPress={exportConfiguration}
              disabled={isLoading}
              style={styles.actionButton}
            >
              Export
            </Button>
          </View>
          {isDirty && (
            <Text style={styles.dirtyIndicator}>
              You have unsaved changes
            </Text>
          )}
          </Card.Content>
        </Card>
      </DashboardCard>

      {/* Connection Settings */}
      <DashboardCard
        title="Connection Settings"
        subtitle="Configure ECR terminal connections"
        icon="connection"
        cardType="default"
      >
          
          <Text style={styles.fieldLabel}>Default Connection Type</Text>
          <SegmentedButtons
            value={config.connection.defaultType}
            onValueChange={(value) => updateConfig('connection', 'defaultType', value)}
            buttons={connectionTypes}
            style={styles.segmentedButtons}
          />

          <LazyInput
            label="TCP Host"
            value={config.connection.tcpHost}
            onChangeText={(value) => updateConfig('connection', 'tcpHost', value)}
            style={styles.textInput}
            disabled={config.connection.defaultType !== 'tcp'}
            placeholder="192.168.1.100"
            validator={(value) => {
              if (!value) return { isValid: true };
              const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
              return {
                isValid: ipRegex.test(value),
                error: 'Please enter a valid IP address'
              };
            }}
          />

          <LazyInput
            label="TCP Port"
            value={config.connection.tcpPort}
            onChangeText={(value) => updateConfig('connection', 'tcpPort', value)}
            keyboardType="numeric"
            style={styles.textInput}
            disabled={config.connection.defaultType !== 'tcp'}
            placeholder="85"
            validator={(value) => {
              if (!value) return { isValid: true };
              const numValue = parseInt(value, 10);
              return {
                isValid: !isNaN(numValue) && numValue >= 1 && numValue <= 65535,
                error: 'Port must be between 1 and 65535'
              };
            }}
          />

          <LazyInput
            label="Connection Timeout (seconds)"
            value={config.connection.tcpTimeout}
            onChangeText={(value) => updateConfig('connection', 'tcpTimeout', value)}
            keyboardType="numeric"
            style={styles.textInput}
            placeholder="30"
            validator={(value) => {
              if (!value) return { isValid: true };
              const numValue = parseInt(value, 10);
              return {
                isValid: !isNaN(numValue) && numValue >= 1 && numValue <= 300,
                error: 'Timeout must be between 1 and 300 seconds'
              };
            }}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Auto Reconnect</Text>
            <Switch
              value={config.connection.autoReconnect}
              onValueChange={(value) => updateConfig('connection', 'autoReconnect', value)}
            />
          </View>

          <Button
            mode="outlined"
            onPress={testConnection}
            disabled={isLoading}
            style={styles.testButton}
          >
            Test Connection
          </Button>
      </DashboardCard>

      {/* Transaction Settings */}
      <DashboardCard
        title="Transaction Settings"
        subtitle="Configure transaction defaults and behavior"
        icon="credit-card"
        cardType="default"
      >

          <LazyInput
            label="Default Amount (cents)"
            value={config.transaction.defaultAmount}
            onChangeText={(value) => updateConfig('transaction', 'defaultAmount', value)}
            keyboardType="numeric"
            style={styles.textInput}
          />

          <LazyInput
            label="Transaction Timeout (seconds)"
            value={config.transaction.transactionTimeout}
            onChangeText={(value) => updateConfig('transaction', 'transactionTimeout', value)}
            keyboardType="numeric"
            style={styles.textInput}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Receipt Generation</Text>
            <Switch
              value={config.transaction.enableReceiptGeneration}
              onValueChange={(value) => updateConfig('transaction', 'enableReceiptGeneration', value)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable POS Receipts</Text>
            <Switch
              value={config.transaction.enablePOSReceipts}
              onValueChange={(value) => updateConfig('transaction', 'enablePOSReceipts', value)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Split Payments</Text>
            <Switch
              value={config.transaction.enableSplitPayments}
              onValueChange={(value) => updateConfig('transaction', 'enableSplitPayments', value)}
            />
          </View>
      </DashboardCard>

      {/* UI Settings */}
      <DashboardCard
        title="User Interface"
        subtitle="Customize the app appearance and behavior"
        icon="palette"
        cardType="default"
      >

          <Text style={styles.fieldLabel}>Theme</Text>
          <SegmentedButtons
            value={config.ui.theme}
            onValueChange={(value) => updateConfig('ui', 'theme', value)}
            buttons={themes}
            style={styles.segmentedButtons}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Animations</Text>
            <Switch
              value={config.ui.enableAnimations}
              onValueChange={(value) => updateConfig('ui', 'enableAnimations', value)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show Advanced Options</Text>
            <Switch
              value={config.ui.showAdvancedOptions}
              onValueChange={(value) => updateConfig('ui', 'showAdvancedOptions', value)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Vibration</Text>
            <Switch
              value={config.ui.enableVibration}
              onValueChange={(value) => updateConfig('ui', 'enableVibration', value)}
            />
          </View>
      </DashboardCard>


      {/* Logging Settings */}
      <DashboardCard
        title="Logging & Debugging"
        subtitle="Configure logging and debug options"
        icon="bug"
        cardType="default"
      >

          <Text style={styles.fieldLabel}>Log Level</Text>
          <SegmentedButtons
            value={config.logging.logLevel}
            onValueChange={(value) => updateConfig('logging', 'logLevel', value)}
            buttons={logLevels}
            style={styles.segmentedButtons}
          />

          <LazyInput
            label="Max Log Files"
            value={config.logging.maxLogFiles}
            onChangeText={(value) => updateConfig('logging', 'maxLogFiles', value)}
            keyboardType="numeric"
            style={styles.textInput}
          />

          <LazyInput
            label="Log Retention (days)"
            value={config.logging.logRetentionDays}
            onChangeText={(value) => updateConfig('logging', 'logRetentionDays', value)}
            keyboardType="numeric"
            style={styles.textInput}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable File Logging</Text>
            <Switch
              value={config.logging.enableFileLogging}
              onValueChange={(value) => updateConfig('logging', 'enableFileLogging', value)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Communication Log</Text>
            <Switch
              value={config.logging.enableCommunicationLog}
              onValueChange={(value) => updateConfig('logging', 'enableCommunicationLog', value)}
            />
          </View>
      </DashboardCard>

      {/* Security Settings */}
      <DashboardCard
        title="Security & Privacy"
        subtitle="Manage security and privacy settings"
        icon="shield"
        cardType="default"
      >

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Mask Sensitive Data</Text>
            <Switch
              value={config.security.maskSensitiveData}
              onValueChange={(value) => updateConfig('security', 'maskSensitiveData', value)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Audit Log</Text>
            <Switch
              value={config.security.enableAuditLog}
              onValueChange={(value) => updateConfig('security', 'enableAuditLog', value)}
            />
          </View>

          <LazyInput
            label="Session Timeout (minutes)"
            value={config.security.sessionTimeout}
            onChangeText={(value) => updateConfig('security', 'sessionTimeout', value)}
            keyboardType="numeric"
            style={styles.textInput}
          />
      </DashboardCard>
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
  actionsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  dirtyIndicator: {
    textAlign: 'center',
    color: '#FF9800',
    fontSize: 12,
    fontStyle: 'italic',
  },
  sectionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  textInput: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  testButton: {
    marginTop: 8,
  },
  bottomSpacer: {
    height: 80,
  },
});

export default ConfigurationSettings;
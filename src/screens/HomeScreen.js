import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  BackHandler
} from 'react-native';
import { Appbar, FAB } from 'react-native-paper';
import { ECRService } from '../services/ECRService';
import ConnectionSetup from '../components/ConnectionSetup';
import TransactionForm from '../components/TransactionForm';
import ResponseDisplay from '../components/ResponseDisplay';
import LogViewer from '../components/LogViewer';

const HomeScreen = () => {
  // Create ECRService instance once (lazy initialization)
  const [ecrService] = useState(() => new ECRService());

  // Track connection status to ECR terminal
  const [isConnected, setIsConnected] = useState(false);

  // Store the last transaction or test response
  const [lastResponse, setLastResponse] = useState(null);

  // Track whether logs should be visible
  const [showLogs, setShowLogs] = useState(false);

  // Function to check current connection status
  const checkConnectionStatus = useCallback(async () => {
    try {
      const connected = await ecrService.checkConnection();
      setIsConnected(connected);
    } catch (error) {
      console.log('Error checking connection status:', error);
      setIsConnected(false);
    }
  }, [ecrService]);

  // Handle Android back button press
  const handleBackPress = useCallback(() => {
    // If logs are open, close them instead of exiting the app
    if (showLogs) {
      setShowLogs(false);
      return true;
    }

    // If connected to ECR, prompt the user before exiting
    if (isConnected) {
      Alert.alert(
        'Exit App',
        'You are currently connected to the ECR terminal. Do you want to disconnect and exit?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Disconnect & Exit', 
            style: 'destructive',
            onPress: () => {
              // Disconnect and exit the app
              ecrService.disconnect().finally(() => {
                BackHandler.exitApp();
              });
            }
          }
        ]
      );
      return true;
    }

    // Returning false lets the default back action happen
    return false;
  }, [showLogs, isConnected, ecrService]);

  // Run on component mount and cleanup on unmount
  useEffect(() => {
    // Register Android back button handler
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    // Check connection status when the component mounts
    checkConnectionStatus();

    return () => {
      // Remove back button handler on unmount
      backHandler.remove();

      // If connected, disconnect on unmount
      if (isConnected) {
        ecrService.disconnect().catch(console.error);
      }
    };
  }, [handleBackPress, checkConnectionStatus, isConnected, ecrService]);

  // Handle connection state changes from ConnectionSetup
  const handleConnectionChange = (connected) => {
    setIsConnected(connected);

    // Clear last response if disconnected
    if (!connected) {
      setLastResponse(null);
    }
  };

  // Handle transaction result from TransactionForm
  const handleTransactionResult = (result) => {
    setLastResponse(result);
  };

  // Clear displayed response
  const handleClearResponse = () => {
    setLastResponse(null);
  };

  // Perform a quick echo test to check communication with ECR
  const handleQuickEchoTest = async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to ECR terminal first');
      return;
    }
    
    try {
      const result = await ecrService.performEchoTest();
      setLastResponse(result);
      
      Alert.alert(
        'Echo Test Result',
        result.success ? 'Communication test successful!' : 'Communication test failed',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Echo Test Error', error.message);
      setLastResponse({ success: false, error: error.message });
    }
  };

  // AppBar (header) UI
  const renderAppBar = () => (
    <Appbar.Header>
      <Appbar.Content title="ECR Test App" subtitle="Paysys Terminal Communication" />

      {/* Toggle log viewer */}
      <Appbar.Action
        icon={showLogs ? "close" : "text-box-outline"}
        onPress={() => setShowLogs(!showLogs)}
      />

      {/* Help / About button */}
      <Appbar.Action
        icon="help-circle-outline"
        onPress={() => {
          Alert.alert(
            'About ECR Test App',
            'This app allows you to test communication with Paysys ECR terminals via Serial or TCP/IP connection.\n\n' +
            'Features:\n' +
            '• Serial and TCP/IP communication\n' +
            '• Transaction testing (Sale, Void, Refund, etc.)\n' +
            '• Real-time communication logging\n' +
            '• Response parsing and display\n\n' +
            'Make sure your terminal is properly configured before connecting.',
            [{ text: 'OK' }]
          );
        }}
      />
    </Appbar.Header>
  );

  // Main screen with connection setup and transactions
  const renderMainContent = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ConnectionSetup
        ecrService={ecrService}
        onConnectionChange={handleConnectionChange}
      />
      
      <TransactionForm
        ecrService={ecrService}
        isConnected={isConnected}
        onTransactionResult={handleTransactionResult}
      />
      
      {lastResponse && (
        <ResponseDisplay
          response={lastResponse}
          onClear={handleClearResponse}
        />
      )}
    </ScrollView>
  );

  // Log viewer screen
  const renderLogContent = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LogViewer ecrService={ecrService} />
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      {renderAppBar()}
      
      {/* Show logs or main content based on state */}
      {showLogs ? renderLogContent() : renderMainContent()}
      
      {/* Floating Action Button for quick echo test */}
      {isConnected && !showLogs && (
        <FAB
          style={styles.fab}
          icon="wifi"
          label="Echo Test"
          onPress={handleQuickEchoTest}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});

export default HomeScreen;
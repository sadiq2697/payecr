import React, { useState, useEffect } from 'react';
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
  const [ecrService] = useState(() => new ECRService());
  const [isConnected, setIsConnected] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  
  useEffect(() => {
    // Handle Android back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    // Check initial connection status
    checkConnectionStatus();
    
    return () => {
      backHandler.remove();
      // Clean up connection on unmount
      if (isConnected) {
        ecrService.disconnect().catch(console.error);
      }
    };
  }, []);
  
  const handleBackPress = () => {
    if (showLogs) {
      setShowLogs(false);
      return true;
    }
    
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
              ecrService.disconnect().finally(() => {
                BackHandler.exitApp();
              });
            }
          }
        ]
      );
      return true;
    }
    
    return false;
  };
  
  const checkConnectionStatus = async () => {
    try {
      const connected = await ecrService.checkConnection();
      setIsConnected(connected);
    } catch (error) {
      console.log('Error checking connection status:', error);
      setIsConnected(false);
    }
  };
  
  const handleConnectionChange = (connected) => {
    setIsConnected(connected);
    if (!connected) {
      setLastResponse(null);
    }
  };
  
  const handleTransactionResult = (result) => {
    setLastResponse(result);
  };
  
  const handleClearResponse = () => {
    setLastResponse(null);
  };
  
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
  
  const renderAppBar = () => (
    <Appbar.Header>
      <Appbar.Content title="ECR Test App" subtitle="Paysys Terminal Communication" />
      <Appbar.Action
        icon={showLogs ? "close" : "text-box-outline"}
        onPress={() => setShowLogs(!showLogs)}
      />
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
  
  const renderLogContent = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LogViewer ecrService={ecrService} />
    </ScrollView>
  );
  
  return (
    <View style={styles.root}>
      {renderAppBar()}
      
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


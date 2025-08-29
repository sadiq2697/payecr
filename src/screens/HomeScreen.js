import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  BackHandler,
  Modal,
  TouchableOpacity
} from 'react-native';
import { FAB, Button } from 'react-native-paper';
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
  
  // Custom Alert Modal
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  
  // Exit Confirmation Modal
  const [showExitModal, setShowExitModal] = useState(false);

  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlertModal(true);
  };
  
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
      setShowExitModal(true);
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
      showAlert('Not Connected', 'Please connect to ECR terminal first');
      return;
    }
    
    try {
      const result = await ecrService.performEchoTest();
      setLastResponse(result);
      
      showAlert(
        'Echo Test Result',
        result.success ? 'Communication test successful!' : 'Communication test failed'
      );
    } catch (error) {
      showAlert('Echo Test Error', error.message);
      setLastResponse({ success: false, error: error.message });
    }
  };
  
  
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
      {showLogs ? renderLogContent() : renderMainContent()}
      
      {/* Floating Exit Button */}
      <FAB
        style={styles.exitFab}
        icon="close"
        onPress={() => setShowExitModal(true)}
        color="white"
        size="small"
      />
      
      {/* Custom Alert Modal */}
      <Modal
        visible={showAlertModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAlertModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModalContent}>
            <Text style={styles.modalTitle}>{alertTitle}</Text>
            <Text style={styles.modalSubtitle}>{alertMessage}</Text>
            
            <Button 
              mode="contained" 
              onPress={() => setShowAlertModal(false)}
              style={styles.alertButton}
            >
              OK
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
            <Text style={styles.modalSubtitle}>
              {isConnected 
                ? 'You are currently connected to the ECR terminal. Do you want to disconnect and exit?'
                : 'Are you sure you want to exit?'
              }
            </Text>
            
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
                onPress={() => {
                  if (isConnected) {
                    ecrService.disconnect().finally(() => {
                      BackHandler.exitApp();
                    });
                  } else {
                    BackHandler.exitApp();
                  }
                }}
                style={styles.exitButton}
                buttonColor="#f44336"
              >
                {isConnected ? 'Disconnect & Exit' : 'Exit'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  exitFab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    top: 20,
    backgroundColor: '#f44336',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 350,
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
  exitModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  exitButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  alertButton: {
    marginTop: 16,
  },
});

export default HomeScreen;


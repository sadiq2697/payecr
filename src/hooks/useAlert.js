import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

/**
 * Custom hook for centralized alert management
 * Provides consistent alert functionality across the app
 */
const useAlert = () => {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: null,
  });

  const showAlert = useCallback((title, message, options = {}) => {
    const {
      type = 'info',
      buttons = null,
      onShow = null,
    } = options;

    setAlertState({
      visible: true,
      title,
      message,
      type,
      buttons,
    });

    onShow?.();
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  // Convenience methods for different alert types using React Native Alert
  const showSuccess = useCallback((title, message, buttons = null) => {
    if (buttons) {
      Alert.alert(title, message, buttons);
    } else {
      Alert.alert(title, message, [
        { text: 'OK', style: 'default' }
      ]);
    }
  }, []);

  const showError = useCallback((title, message, buttons = null) => {
    if (buttons) {
      Alert.alert(title, message, buttons);
    } else {
      Alert.alert(title, message, [
        { text: 'OK', style: 'default' }
      ]);
    }
  }, []);

  const showWarning = useCallback((title, message, buttons = null) => {
    if (buttons) {
      Alert.alert(title, message, buttons);
    } else {
      Alert.alert(title, message, [
        { text: 'OK', style: 'default' }
      ]);
    }
  }, []);

  const showConfirm = useCallback((title, message, onConfirm, onCancel = null) => {
    const buttons = [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Confirm',
        style: 'default',
        onPress: onConfirm,
      },
    ];
    Alert.alert(title, message, buttons);
  }, []);

  const showDelete = useCallback((title, message, onConfirm, onCancel = null) => {
    const buttons = [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: onConfirm,
      },
    ];
    Alert.alert(title, message, buttons);
  }, []);

  const showConnectionStatus = useCallback((isConnected, deviceName = null) => {
    if (isConnected) {
      showSuccess(
        'Connected', 
        deviceName 
          ? `Successfully connected to ${deviceName}` 
          : 'Connection established successfully'
      );
    } else {
      showError('Disconnected', 'Connection lost or failed to connect');
    }
  }, [showSuccess, showError]);

  return {
    // State
    alertState,
    
    // Methods
    showAlert,
    hideAlert,
    
    // Convenience methods
    showSuccess,
    showError,
    showWarning,
    showConfirm,
    showDelete,
    showConnectionStatus,
  };
};

export default useAlert;
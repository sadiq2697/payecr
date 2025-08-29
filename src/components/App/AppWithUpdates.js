import React, { useEffect } from 'react';
import { View, StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { store } from '../../store';
import UpdateService from '../../services/UpdateService';
import ToastManager from '../ToastNotification/ToastManager';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';

// Your main app components
import HomeScreen from '../../screens/HomeScreen';

/**
 * Main App component with secure update service integration
 */
const AppWithUpdates = () => {
  useEffect(() => {
    // Initialize update service when app starts
    initializeUpdateService();

    // Check for pending updates on app launch
    checkPendingUpdatesOnLaunch();

    // Cleanup on unmount
    return () => {
      UpdateService.cleanup();
    };
  }, []);

  const initializeUpdateService = async () => {
    try {
      await UpdateService.initialize();
      console.log('Update service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize update service:', error);
    }
  };

  const checkPendingUpdatesOnLaunch = async () => {
    try {
      // Small delay to let the app settle
      setTimeout(async () => {
        await UpdateService.checkPendingUpdate();
      }, 2000);
    } catch (error) {
      console.error('Failed to check pending updates:', error);
    }
  };

  return (
    <Provider store={store}>
      <ErrorBoundary>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={{ flex: 1 }}>
          <HomeScreen />
          <ToastManager />
        </View>
      </ErrorBoundary>
    </Provider>
  );
};

export default AppWithUpdates;
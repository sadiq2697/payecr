import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { store } from '../store';
import ConnectionSetupContainer from './ConnectionSetup/ConnectionSetupContainer';
import ErrorBoundary from './ErrorBoundary/ErrorBoundary';
import ToastManager from './ToastNotification/ToastManager';

/**
 * Modern Connection Setup with all improvements integrated
 */
const ModernConnectionSetup = ({ ecrService, onConnectionChange }) => {
  return (
    <Provider store={store}>
      <ErrorBoundary
        onRetry={() => console.log('Retry requested')}
        onReset={() => console.log('Reset requested')}
        onOfflineMode={() => console.log('Offline mode requested')}
      >
        <View style={styles.container}>
          <ConnectionSetupContainer
            ecrService={ecrService}
            onConnectionChange={onConnectionChange}
          />
          <ToastManager />
        </View>
      </ErrorBoundary>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ModernConnectionSetup;
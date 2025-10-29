import React, { useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';
import RootNavigator from './src/navigation/RootNavigator';
import { AppProviders } from './src/providers/AppProviders';
import ToastManager from './src/components/ToastNotification/ToastManager';
import ErrorBoundary from './src/components/ErrorBoundary/ErrorBoundary';
import KioskModeService from './src/services/KioskModeService';

// Enable react-native-screens for better performance
enableScreens();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#03DAC6',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#000000',
    onSurface: '#000000',
    disabled: '#00000061',
    placeholder: '#00000061',
    backdrop: '#00000050',
    onBackground: '#000000',
    notification: '#f50057',
  },
};

const App = () => {
  const [kioskModeEnabled, setKioskModeEnabled] = useState(true); // Default to true for kiosk mode

  useEffect(() => {
    // Initialize and auto-enable kiosk mode
    const initializeKioskMode = async () => {
      try {
        await KioskModeService.initialize({
          autoEnable: true, // Auto-enable kiosk mode by default
          mode: 'immersive-sticky', // Use immersive sticky mode
          navigationBarColor: '#000000',
          transparentNavigation: true,
        });
        setKioskModeEnabled(true);
        console.log('Kiosk mode enabled by default');
      } catch (error) {
        console.warn('Failed to initialize kiosk mode:', error);
        setKioskModeEnabled(false);
      }
    };

    initializeKioskMode();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AppProviders>
            <ErrorBoundary>
              {/* React Native StatusBar - hidden by default for kiosk mode */}
              <StatusBar
                barStyle="light-content"
                backgroundColor="transparent"
                translucent={true}
                hidden={true}
                networkActivityIndicatorVisible={false}
                showHideTransition="fade"
                animated={true}
              />

              {/* Conditional SafeAreaView based on kiosk mode */}
              {kioskModeEnabled ? (
                <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                  <NavigationContainer>
                    <RootNavigator />
                  </NavigationContainer>
                  <ToastManager/>
                </View>
              ) : (
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                  <View style={{ flex: 1 }}>
                    <NavigationContainer>
                      <RootNavigator />
                    </NavigationContainer>
                    <ToastManager/>
                  </View>
                </SafeAreaView>
              )}
            </ErrorBoundary>
          </AppProviders>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;


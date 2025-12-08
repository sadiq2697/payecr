import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { apiService } from '../services/ApiService';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Load saved credentials and navigate to Login
    const loadAndNavigate = async () => {
      let savedCredentials = { storeCode: '', outletCode: '' };
      try {
        const { storeCode, outletCode } = await apiService.getSavedLoginCredentials();
        if (storeCode && outletCode) {
          savedCredentials = { storeCode, outletCode };
        }
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }

      // Navigate after minimum 2.5 seconds
      setTimeout(() => {
        navigation.replace('Login', savedCredentials);
      }, 2500);
    };

    loadAndNavigate();

    return () => {};
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Content */}
      <View style={styles.content}>
        {/* Brand Name - No Icon */}
        <Animated.View
          style={[
            styles.brandContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.brandName}>asasii | POS</Text>
          <Text style={styles.brandTagline}>Point of Sale System</Text>
        </Animated.View>

        {/* Version & Loading */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.loadingDots}>
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: fadeAnim,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: fadeAnim,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: fadeAnim,
                },
              ]}
            />
          </View>
          <Text style={styles.version}>v1.0.0001 Asasii|POS</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  brandName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  brandTagline: {
    fontSize: 16,
    color: '#737373',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4D4D4',
  },
  version: {
    fontSize: 12,
    color: '#A3A3A3',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;

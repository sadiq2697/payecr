import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  Store,
  MapPin,
  User,
  Lock,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Settings,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/ApiService';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;
type LoginRouteProp = RouteProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LoginRouteProp>();
  const { login } = useAuth();

  // Get saved credentials from navigation params (loaded in SplashScreen)
  const savedStore = route.params?.storeCode || '';
  const savedOutlet = route.params?.outletCode || '';
  const hasSavedCreds = !!(savedStore && savedOutlet);

  const [step, setStep] = useState(hasSavedCreds ? 3 : 1); // Skip to Employee ID if saved credentials
  const [storeCode, setStoreCode] = useState(savedStore);
  const [outletCode, setOutletCode] = useState(savedOutlet);
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [outletName, setOutletName] = useState('');
  const [hasSavedCredentials, setHasSavedCredentials] = useState(hasSavedCreds);

  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [step]);

  // Clear error when step changes
  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
  }, [step]);

  // Show toast animation
  const showToast = (message: string, isSuccess: boolean) => {
    if (isSuccess) {
      setSuccessMessage(message);
      setError(null);
    } else {
      setError(message);
      setSuccessMessage(null);
    }

    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isSuccess) setSuccessMessage(null);
    });
  };

  // Validate store code
  const validateStoreCode = async (code: string) => {
    setIsValidating(true);
    try {
      const result = await apiService.validateStore(code);
      if (result.success && result.data) {
        setStoreName(result.data.storeName);
        showToast(`Welcome to ${result.data.storeName}`, true);
        setTimeout(() => animateToNextStep(2), 500);
      } else {
        showToast(result.message || 'Store not found', false);
      }
    } catch (err: any) {
      showToast(err.message || 'Store not found', false);
    } finally {
      setIsValidating(false);
    }
  };

  // Validate outlet code
  const validateOutletCode = async (code: string) => {
    setIsValidating(true);
    try {
      const result = await apiService.validateOutlet(storeCode, code);
      if (result.success && result.data) {
        setOutletName(result.data.outletName);
        showToast(result.data.outletName, true);
        setTimeout(() => animateToNextStep(3), 500);
      } else {
        showToast(result.message || 'Outlet not found', false);
      }
    } catch (err: any) {
      showToast(err.message || 'Outlet not found', false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleNumberPress = (num: string) => {
    setError(null);
    if (step === 1 && storeCode.length < 10) {
      const newCode = storeCode + num;
      setStoreCode(newCode);
      // Auto-validate when 10 digits entered
      if (newCode.length === 10) {
        setTimeout(() => validateStoreCode(newCode), 300);
      }
    } else if (step === 2 && outletCode.length < 3) {
      const newCode = outletCode + num;
      setOutletCode(newCode);
      // Auto-validate when 3 digits entered
      if (newCode.length === 3) {
        setTimeout(() => validateOutletCode(newCode), 300);
      }
    } else if (step === 3) {
      setEmployeeId(prev => prev + num);
    } else if (step === 4 && pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);

      // Auto-submit when PIN is 6 digits
      if (newPin.length === 6) {
        setTimeout(() => handleLogin(newPin), 300);
      }
    }
  };

  const handleDelete = () => {
    setError(null);
    if (step === 1) {
      setStoreCode(prev => prev.slice(0, -1));
    } else if (step === 2) {
      setOutletCode(prev => prev.slice(0, -1));
    } else if (step === 3) {
      setEmployeeId(prev => prev.slice(0, -1));
    } else if (step === 4) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setError(null);
    if (step === 1) {
      setStoreCode('');
    } else if (step === 2) {
      setOutletCode('');
    } else if (step === 3) {
      setEmployeeId('');
    } else if (step === 4) {
      setPin('');
    }
  };

  const animateToNextStep = (nextStep: number) => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      slideAnim.setValue(100);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    setError(null);
    if (step === 1 && storeCode.trim()) {
      animateToNextStep(2);
    } else if (step === 2 && outletCode.trim()) {
      animateToNextStep(3);
    } else if (step === 3 && employeeId.trim()) {
      animateToNextStep(4);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) {
      // If we have saved credentials and going back from Employee ID, go to step 1
      if (hasSavedCredentials && step === 3) {
        setHasSavedCredentials(false);
      }
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setStep(step - 1);
        slideAnim.setValue(-100);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handleChangeStore = async () => {
    // Clear saved credentials and go back to step 1
    await apiService.clearSavedLoginCredentials();
    setStoreCode('');
    setOutletCode('');
    setEmployeeId('');
    setPin('');
    setHasSavedCredentials(false);
    setStep(1);
  };

  const handleLogin = async (pinCode: string) => {
    if (pinCode.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await login(storeCode, outletCode, employeeId, pinCode);

      if (result.success) {
        // Save credentials for next time
        await apiService.saveLoginCredentials(storeCode, outletCode);

        // Navigate to POS on successful login
        navigation.reset({
          index: 0,
          routes: [{ name: 'POS' }],
        });
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
        setPin(''); // Clear PIN on error
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = () => {
    if (pin.length >= 4) {
      handleLogin(pin);
    } else {
      setError('PIN must be at least 4 digits');
    }
  };

  const renderError = () => {
    if (!error) return null;
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={16} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  };

  const renderNumberKeypad = () => (
    <View style={styles.keypadContainer}>
      <View style={styles.keypadGrid}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['C', '0', '\u232B'],
        ].map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.keypadButton,
                  key === 'C' && styles.keypadButtonClear,
                  key === '\u232B' && styles.keypadButtonDelete,
                ]}
                onPress={() => {
                  if (key === 'C') {
                    handleClear();
                  } else if (key === '\u232B') {
                    handleDelete();
                  } else {
                    handleNumberPress(key);
                  }
                }}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.keypadButtonText,
                    (key === 'C' || key === '\u232B') && styles.keypadButtonTextSpecial,
                  ]}
                >
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );

  const renderStoreCodeStep = () => (
    <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.formContainer}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <Store size={40} color="#007AFF" />
          </View>

          <Text style={styles.formTitle}>Store Code</Text>
          <Text style={styles.formDescription}>Enter your 10-digit store code</Text>

          <View style={styles.inputDisplay}>
            <Text style={styles.inputText}>{storeCode.padStart(10, '0').slice(-10)}</Text>
            {!storeCode && <Text style={styles.placeholderText}>0000000001</Text>}
          </View>

          {renderError()}

          <TouchableOpacity
            style={[styles.continueButton, !storeCode.trim() && styles.continueButtonDisabled]}
            disabled={!storeCode.trim()}
            onPress={handleNext}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Keypad Card */}
        <View style={styles.keypadCard}>
          <Text style={styles.keypadLabel}>Enter digits</Text>
          {renderNumberKeypad()}
        </View>
      </View>
    </Animated.View>
  );

  const renderOutletCodeStep = () => (
    <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.formContainer}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <MapPin size={40} color="#007AFF" />
          </View>

          <Text style={styles.formTitle}>Outlet Code</Text>
          <Text style={styles.formDescription}>Enter your 3-digit outlet code</Text>

          <View style={styles.inputDisplay}>
            <Text style={styles.inputText}>{outletCode.padStart(3, '0').slice(-3)}</Text>
            {!outletCode && <Text style={styles.placeholderText}>001</Text>}
          </View>

          {renderError()}

          <TouchableOpacity
            style={[styles.continueButton, !outletCode.trim() && styles.continueButtonDisabled]}
            disabled={!outletCode.trim()}
            onPress={handleNext}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={20} color="#007AFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Keypad Card */}
        <View style={styles.keypadCard}>
          <Text style={styles.keypadLabel}>Enter digits</Text>
          {renderNumberKeypad()}
        </View>
      </View>
    </Animated.View>
  );

  const renderEmployeeStep = () => (
    <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.formContainer}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          {/* Show saved store/outlet info */}
          {hasSavedCredentials && (
            <View style={styles.savedInfoContainer}>
              <View style={styles.savedInfoRow}>
                <Store size={16} color="#8E8E93" />
                <Text style={styles.savedInfoText}>Store: {storeCode.padStart(10, '0')}</Text>
                <MapPin size={16} color="#8E8E93" style={{ marginLeft: 12 }} />
                <Text style={styles.savedInfoText}>Outlet: {outletCode.padStart(3, '0')}</Text>
              </View>
              <TouchableOpacity onPress={handleChangeStore} style={styles.changeStoreButton}>
                <Settings size={14} color="#007AFF" />
                <Text style={styles.changeStoreText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.iconCircle}>
            <User size={40} color="#007AFF" />
          </View>

          <Text style={styles.formTitle}>Employee ID</Text>
          <Text style={styles.formDescription}>Enter your 5-digit employee ID</Text>

          <View style={styles.inputDisplay}>
            <Text style={styles.inputText}>{employeeId || ''}</Text>
            {!employeeId && <Text style={styles.placeholderText}>10001</Text>}
          </View>

          {renderError()}

          <TouchableOpacity
            style={[styles.continueButton, !employeeId.trim() && styles.continueButtonDisabled]}
            disabled={!employeeId.trim()}
            onPress={handleNext}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {!hasSavedCredentials && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ChevronLeft size={20} color="#007AFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Keypad Card */}
        <View style={styles.keypadCard}>
          <Text style={styles.keypadLabel}>Enter digits</Text>
          {renderNumberKeypad()}
        </View>
      </View>
    </Animated.View>
  );

  const renderPinStep = () => (
    <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.formContainer}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <Lock size={40} color="#007AFF" />
          </View>

          <Text style={styles.formTitle}>Enter PIN</Text>
          <Text style={styles.formDescription}>Enter your 4-6 digit PIN code</Text>

          <View style={styles.pinDisplayContainer}>
            <View style={styles.pinDisplay}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <View key={index} style={styles.pinDot}>
                  {pin[index] && <View style={styles.pinDotFilled} />}
                </View>
              ))}
            </View>
          </View>

          {renderError()}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Signing in...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.continueButton, pin.length < 4 && styles.continueButtonDisabled]}
                disabled={pin.length < 4}
                onPress={handlePinSubmit}
              >
                <Text style={styles.continueButtonText}>Sign In</Text>
                <ChevronRight size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <ChevronLeft size={20} color="#007AFF" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Keypad Card */}
        <View style={styles.keypadCard}>
          <Text style={styles.keypadLabel}>Enter digits</Text>
          {renderNumberKeypad()}
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Content */}
        <View style={styles.content}>
          {step === 1 && renderStoreCodeStep()}
          {step === 2 && renderOutletCodeStep()}
          {step === 3 && renderEmployeeStep()}
          {step === 4 && renderPinStep()}
        </View>
      </ScrollView>

      {/* Footer - fixed at bottom */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>v1.0.0001 Asasii|POS</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  stepContent: {
    width: '100%',
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
    maxWidth: 900,
  },
  mainCard: {
    flex: 1,
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  keypadCard: {
    flex: 1,
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  iconCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#F0F7FF',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  formDescription: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputDisplay: {
    width: '100%',
    minHeight: 60,
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  inputText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'monospace',
    letterSpacing: 4,
  },
  placeholderText: {
    position: 'absolute',
    fontSize: 24,
    color: '#C7C7CC',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  pinDisplayContainer: {
    width: '100%',
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDotFilled: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#007AFF',
    borderWidth: 0,
  },
  keypadLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  keypadContainer: {
    width: '100%',
  },
  keypadGrid: {
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  keypadButton: {
    flex: 1,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 0,
  },
  keypadButtonClear: {
    backgroundColor: '#FF3B30',
  },
  keypadButtonDelete: {
    backgroundColor: '#E5E5EA',
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
  },
  keypadButtonTextSpecial: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  continueButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D1D6',
    shadowOpacity: 0,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#A3A3A3',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 12,
  },
  savedInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  savedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedInfoText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 6,
  },
  changeStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeStoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default LoginScreen;

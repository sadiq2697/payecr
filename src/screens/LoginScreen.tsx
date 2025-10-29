import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  ScrollView,
} from 'react-native';
import {
  Building2,
  User,
  Lock,
  ChevronRight,
  ChevronLeft,
  Store,
  Delete,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [step, setStep] = useState(1); // 1: Organization ID, 2: Employee ID, 3: PIN
  const [organizationId, setOrganizationId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');

  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const handleNumberPress = (num: string) => {
    if (step === 1) {
      setOrganizationId(prev => prev + num);
    } else if (step === 2) {
      setEmployeeId(prev => prev + num);
    } else if (step === 3 && pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);

      // Auto-submit when PIN is complete
      if (newPin.length === 6) {
        setTimeout(() => handleLogin(newPin), 300);
      }
    }
  };

  const handleDelete = () => {
    if (step === 1) {
      setOrganizationId(prev => prev.slice(0, -1));
    } else if (step === 2) {
      setEmployeeId(prev => prev.slice(0, -1));
    } else if (step === 3) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (step === 1) {
      setOrganizationId('');
    } else if (step === 2) {
      setEmployeeId('');
    } else if (step === 3) {
      setPin('');
    }
  };

  const handleNext = () => {
    if (step === 1 && organizationId.trim()) {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setStep(2);
        slideAnim.setValue(100);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else if (step === 2 && employeeId.trim()) {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setStep(3);
        slideAnim.setValue(100);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
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

  const handleLogin = (pinCode: string) => {
    // TODO: Implement actual authentication logic
    console.log('Login attempt:', {
      organizationId,
      employeeId,
      pin: pinCode,
    });

    // For now, just navigate to POS
    navigation.reset({
      index: 0,
      routes: [{ name: 'POS' }],
    });
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
      <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
      <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
    </View>
  );

  const renderNumberKeypad = () => (
    <View style={styles.keypadContainer}>
      <View style={styles.keypadGrid}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['C', '0', '⌫'],
        ].map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.keypadButton,
                  key === 'C' && styles.keypadButtonClear,
                  key === '⌫' && styles.keypadButtonDelete,
                ]}
                onPress={() => {
                  if (key === 'C') {
                    handleClear();
                  } else if (key === '⌫') {
                    handleDelete();
                  } else {
                    handleNumberPress(key);
                  }
                }}
              >
                <Text
                  style={[
                    styles.keypadButtonText,
                    (key === 'C' || key === '⌫') && styles.keypadButtonTextSpecial,
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

  const renderOrganizationStep = () => (
    <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.formContainer}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <Building2 size={40} color="#007AFF" />
          </View>

          <Text style={styles.formTitle}>Organization ID</Text>
          <Text style={styles.formDescription}>Enter your organization identifier to continue</Text>

          <View style={styles.inputDisplay}>
            <Text style={styles.inputText}>{organizationId || ''}</Text>
            {!organizationId && <Text style={styles.placeholderText}>ORG-XXXX</Text>}
          </View>

          <TouchableOpacity
            style={[styles.continueButton, !organizationId.trim() && styles.continueButtonDisabled]}
            disabled={!organizationId.trim()}
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

  const renderEmployeeStep = () => (
    <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.formContainer}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <User size={40} color="#007AFF" />
          </View>

          <Text style={styles.formTitle}>Employee ID</Text>
          <Text style={styles.formDescription}>Enter your employee identifier to continue</Text>

          <View style={styles.inputDisplay}>
            <Text style={styles.inputText}>{employeeId || ''}</Text>
            {!employeeId && <Text style={styles.placeholderText}>EMP-XXXX</Text>}
          </View>

          <TouchableOpacity
            style={[styles.continueButton, !employeeId.trim() && styles.continueButtonDisabled]}
            disabled={!employeeId.trim()}
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

  const renderPinStep = () => (
    <Animated.View style={[styles.stepContent, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.formContainer}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <Lock size={40} color="#007AFF" />
          </View>

          <Text style={styles.formTitle}>Enter PIN</Text>
          <Text style={styles.formDescription}>Enter your 6-digit PIN code to sign in</Text>

          <View style={styles.pinDisplayContainer}>
            <View style={styles.pinDisplay}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <View key={index} style={styles.pinDot}>
                  {pin[index] && <View style={styles.pinDotFilled} />}
                </View>
              ))}
            </View>
          </View>

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              {step === 1 && <Building2 size={32} color="#FFFFFF" />}
              {step === 2 && <User size={32} color="#FFFFFF" />}
              {step === 3 && <Lock size={32} color="#FFFFFF" />}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                {step === 1 && 'Organization ID'}
                {step === 2 && 'Employee ID'}
                {step === 3 && 'Enter PIN'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {step === 1 && 'Enter your organization identifier'}
                {step === 2 && 'Enter your employee identifier'}
                {step === 3 && 'Enter your 6-digit PIN code'}
              </Text>
            </View>
          </View>
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Content */}
        <View style={styles.content}>
          {step === 1 && renderOrganizationStep()}
          {step === 2 && renderEmployeeStep()}
          {step === 3 && renderPinStep()}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>v2.0.1045-ENTERPRISE</Text>
        </View>
      </ScrollView>
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
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerText: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E5E5',
  },
  stepDotActive: {
    backgroundColor: '#007AFF',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
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
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#007AFF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
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
});

export default LoginScreen;

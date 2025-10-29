import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Vibration,
  Animated,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NumberPadModal = ({
  visible,
  onClose,
  onConfirm,
  initialValue = '',
  title = 'Enter Amount',
  currency = 'RM',
  allowDecimal = true,
  maxValue = 999999.99,
  placeholder = '0.00',
}) => {
  const [value, setValue] = useState(initialValue);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, initialValue, fadeAnim, scaleAnim]);

  const handleNumberPress = (number) => {
    Vibration.vibrate(35);
    
    if (value.length >= 10) return; // Limit input length
    
    const newValue = value + number;
    const numValue = parseFloat(newValue);
    
    if (numValue <= maxValue) {
      setValue(newValue);
    }
  };

  const handleDecimalPress = () => {
    if (!allowDecimal || value.includes('.')) return;
    
    Vibration.vibrate(35);
    setValue(value === '' ? '0.' : value + '.');
  };

  const handleBackspace = () => {
    Vibration.vibrate(35);
    setValue(value.slice(0, -1));
  };

  const handleClear = () => {
    Vibration.vibrate(50);
    setValue('');
  };

  const handleConfirm = () => {
    const numValue = parseFloat(value || '0');
    if (numValue > 0) {
      onConfirm(value);
      onClose();
    }
  };

  const formatDisplayValue = (val) => {
    if (!val) return placeholder;
    
    // Add thousands separators
    const parts = val.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const renderNumberButton = (number, isLarge = false) => (
    <TouchableOpacity
      style={[
        styles.numberButton,
        isLarge && styles.numberButtonLarge,
      ]}
      onPress={() => handleNumberPress(number)}
      activeOpacity={0.7}
    >
      <Text style={styles.numberButtonText}>{number}</Text>
    </TouchableOpacity>
  );


  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity 
              onPress={handleConfirm} 
              style={[styles.headerButton, styles.confirmButton]}
              disabled={!value || parseFloat(value || '0') === 0}
            >
              <Icon 
                name="check" 
                size={24} 
                color={value && parseFloat(value || '0') > 0 ? "#4CAF50" : "#ccc"} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Left Side - Amount Display */}
            <View style={styles.amountSection}>
              <Text style={styles.currencyLabel}>{currency}</Text>
              <Text style={styles.amountValue}>
                {formatDisplayValue(value)}
              </Text>
              <View style={styles.amountActions}>
                <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Right Side - Number Pad */}
            <View style={styles.numberPadSection}>
              {/* Row 1 */}
              <View style={styles.numberRow}>
                {renderNumberButton('1')}
                {renderNumberButton('2')}
                {renderNumberButton('3')}
              </View>

              {/* Row 2 */}
              <View style={styles.numberRow}>
                {renderNumberButton('4')}
                {renderNumberButton('5')}
                {renderNumberButton('6')}
              </View>

              {/* Row 3 */}
              <View style={styles.numberRow}>
                {renderNumberButton('7')}
                {renderNumberButton('8')}
                {renderNumberButton('9')}
              </View>

              {/* Row 4 */}
              <View style={styles.numberRow}>
                {allowDecimal && (
                  <TouchableOpacity
                    style={[styles.numberButton, !value.includes('.') ? {} : styles.numberButtonDisabled]}
                    onPress={handleDecimalPress}
                    activeOpacity={0.7}
                    disabled={value.includes('.')}
                  >
                    <Text style={[styles.numberButtonText, value.includes('.') && styles.numberButtonTextDisabled]}>
                      .
                    </Text>
                  </TouchableOpacity>
                )}
                {!allowDecimal && <View style={styles.numberButton} />}
                
                {renderNumberButton('0', true)}
                
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={handleBackspace}
                  activeOpacity={0.7}
                >
                  <Icon name="backspace-outline" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: Math.min(SCREEN_WIDTH * 0.9, 500),
    maxHeight: SCREEN_HEIGHT * 0.8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    padding: 20,
    minHeight: 300,
  },
  
  // Left Side - Amount Display
  amountSection: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 20,
  },
  currencyLabel: {
    fontSize: 20,
    fontWeight: '300',
    color: '#666',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: '200',
    color: '#000',
    textAlign: 'center',
    minHeight: 60,
    fontFamily: 'System', // iOS system font
  },
  amountActions: {
    marginTop: 20,
  },
  clearButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  // Right Side - Number Pad
  numberPadSection: {
    flex: 1,
    justifyContent: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  numberButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  numberButtonLarge: {
    // Same size as regular for iPhone style
  },
  numberButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0',
  },
  numberButtonText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#333',
  },
  numberButtonTextDisabled: {
    color: '#ccc',
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF', // iOS blue
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});

export default NumberPadModal;
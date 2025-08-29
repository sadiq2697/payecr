import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Keyboard,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import NumberPad from './NumberPad';

const NumberPadInput = forwardRef(({
  label,
  value,
  onChangeText,
  placeholder = '',
  style,
  inputStyle,
  disabled = false,
  maxLength,
  allowDecimal = true,
  decimalPlaces = 2,
  prefix = '',
  suffix = '',
  error = false,
  errorText = '',
  theme = 'light',
  ...props
}, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const textInputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      Keyboard.dismiss();
      setIsVisible(true);
    },
    blur: () => {
      setIsVisible(false);
    },
    clear: () => {
      setInputValue('');
      onChangeText?.('');
    },
  }));

  const formatDisplayValue = (val) => {
    if (!val) return '';
    
    let formatted = val;
    
    if (allowDecimal && decimalPlaces > 0 && formatted.includes('.')) {
      const [integer, decimal] = formatted.split('.');
      formatted = `${integer}.${decimal.substring(0, decimalPlaces)}`;
    }
    
    return `${prefix}${formatted}${suffix}`;
  };

  const handleInputPress = () => {
    if (disabled) return;
    Keyboard.dismiss();
    setIsVisible(true);
  };

  const handleKeyPress = (key) => {
    let newValue = inputValue;
    
    if (maxLength && newValue.length >= maxLength) {
      return;
    }
    
    newValue = newValue + key;
    setInputValue(newValue);
  };

  const handleDecimal = (key) => {
    if (!allowDecimal) return;
    
    let newValue = inputValue;
    
    // Don't allow multiple decimals
    if (newValue.includes('.')) return;
    
    // If empty, add 0 before decimal
    if (newValue === '') {
      newValue = '0';
    }
    
    newValue = newValue + key;
    setInputValue(newValue);
  };

  const handleBackspace = () => {
    const newValue = inputValue.slice(0, -1);
    setInputValue(newValue);
  };

  const handleClear = () => {
    setInputValue('');
  };

  const handleDone = () => {
    onChangeText?.(inputValue);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setInputValue(value || '');
    setIsVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.inputContainer, style]}
        onPress={handleInputPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <TextInput
          ref={textInputRef}
          label={label}
          value={formatDisplayValue(value)}
          placeholder={placeholder}
          editable={false}
          pointerEvents="none"
          style={[styles.input, inputStyle]}
          error={error}
          disabled={disabled}
          showSoftInputOnFocus={false}
          {...props}
        />
      </TouchableOpacity>

      {error && errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : null}

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            onPress={handleCancel}
            activeOpacity={1}
          />
          
          <View style={[
            styles.modalContent,
            theme === 'dark' ? styles.modalContentDark : styles.modalContentLight
          ]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={[
                  styles.modalButton,
                  theme === 'dark' ? styles.modalButtonDark : styles.modalButtonLight
                ]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <Text style={[
                styles.modalTitle,
                theme === 'dark' ? styles.modalTitleDark : styles.modalTitleLight
              ]}>
                {label || 'Enter Value'}
              </Text>
              
              <TouchableOpacity onPress={handleDone}>
                <Text style={[
                  styles.modalButton,
                  styles.doneButton,
                  theme === 'dark' ? styles.modalButtonDark : styles.modalButtonLight
                ]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            {/* Current Value Display */}
            <View style={[
              styles.valueDisplay,
              theme === 'dark' ? styles.valueDisplayDark : styles.valueDisplayLight
            ]}>
              <Text style={[
                styles.valueText,
                theme === 'dark' ? styles.valueTextDark : styles.valueTextLight
              ]}>
                {formatDisplayValue(inputValue) || '0'}
              </Text>
            </View>

            {/* Number Pad */}
            <NumberPad
              onKeyPress={handleKeyPress}
              onBackspace={handleBackspace}
              onClear={handleClear}
              onDecimal={handleDecimal}
              showDecimal={allowDecimal}
              showClear={true}
              theme={theme}
              vibrate={true}
            />
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  inputContainer: {
    marginVertical: 4,
  },
  input: {
    backgroundColor: 'transparent',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    maxHeight: '60%',
  },
  modalContentLight: {
    backgroundColor: '#ffffff',
  },
  modalContentDark: {
    backgroundColor: '#1e1e1e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalTitleLight: {
    color: '#333333',
  },
  modalTitleDark: {
    color: '#ffffff',
  },
  modalButton: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalButtonLight: {
    color: '#2196F3',
  },
  modalButtonDark: {
    color: '#64B5F6',
  },
  doneButton: {
    fontWeight: '600',
  },
  valueDisplay: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  valueDisplayLight: {
    backgroundColor: '#f5f5f5',
  },
  valueDisplayDark: {
    backgroundColor: '#2e2e2e',
    borderBottomColor: '#444444',
  },
  valueText: {
    fontSize: 32,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  valueTextLight: {
    color: '#333333',
  },
  valueTextDark: {
    color: '#ffffff',
  },
});

NumberPadInput.displayName = 'NumberPadInput';

export default NumberPadInput;
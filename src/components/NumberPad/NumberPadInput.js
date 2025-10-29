import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import NumberPadModal from './NumberPadModal';

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
  currency = 'RM',
  maxValue = 999999.99,
  theme = 'light',
  ...props
}, ref) => {
  const [isVisible, setIsVisible] = useState(false);
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
    
    // Add thousands separators
    if (formatted.includes('.')) {
      const [integer, decimal] = formatted.split('.');
      const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formatted = `${formattedInteger}.${decimal}`;
    } else {
      formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    return `${prefix}${formatted}${suffix}`;
  };

  const handleInputPress = () => {
    if (disabled) return;
    Keyboard.dismiss();
    setIsVisible(true);
  };

  const handleConfirm = (newValue) => {
    onChangeText?.(newValue);
  };

  const handleClose = () => {
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
          right={
            <TextInput.Icon 
              icon="calculator" 
              onPress={handleInputPress}
              disabled={disabled}
            />
          }
          {...props}
        />
      </TouchableOpacity>

      {error && errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : null}

      <NumberPadModal
        visible={isVisible}
        onClose={handleClose}
        onConfirm={handleConfirm}
        initialValue={value}
        title={label || 'Enter Amount'}
        currency={currency}
        allowDecimal={allowDecimal}
        maxValue={maxValue}
        placeholder={placeholder}
      />
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
});

NumberPadInput.displayName = 'NumberPadInput';

export default NumberPadInput;
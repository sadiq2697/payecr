import React, { memo, useCallback, useMemo, useState, useRef } from 'react';
import { TextInput, View, Text, StyleSheet, Animated } from 'react-native';
import { useDebouncedCallback } from '../../hooks/useThrottledCallback';

// High-performance input with minimal re-renders
const LazyInput = memo(({
  value,
  onChangeText,
  label,
  placeholder,
  debounceDelay = 300,
  validateOnChange = true,
  validator,
  style,
  inputStyle,
  error,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState('');
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  // Debounced external change handler
  const debouncedChangeHandler = useDebouncedCallback((text) => {
    onChangeText?.(text);
    
    if (validateOnChange && validator) {
      const validation = validator(text);
      setValidationError(validation.isValid ? '' : validation.error);
    }
  }, debounceDelay);

  const handleChangeText = useCallback((text) => {
    setLocalValue(text);
    debouncedChangeHandler(text);
  }, [debouncedChangeHandler]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [animatedValue]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (!localValue) {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }
  }, [animatedValue, localValue]);

  const labelStyle = useMemo(() => ({
    position: 'absolute',
    left: 12,
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    top: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 8],
    }),
    color: isFocused ? '#2196F3' : '#666',
  }), [animatedValue, isFocused]);

  const inputContainerStyle = useMemo(() => ({
    borderColor: error || validationError ? '#f44336' : 
                isFocused ? '#2196F3' : '#e0e0e0',
    borderWidth: isFocused ? 2 : 1,
  }), [error, validationError, isFocused]);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.inputContainer, inputContainerStyle]}>
        {label && (
          <Animated.Text style={[styles.label, labelStyle]}>
            {label}
          </Animated.Text>
        )}
        <TextInput
          value={localValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={!isFocused && !localValue ? placeholder : ''}
          style={[styles.input, inputStyle, { paddingTop: label ? 20 : 12 }]}
          {...props}
        />
      </View>
      {(error || validationError) && (
        <Text style={styles.errorText}>
          {error || validationError}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  inputContainer: {
    position: 'relative',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  label: {
    fontWeight: '500',
    zIndex: 1,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
    minHeight: 48,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
    marginHorizontal: 12,
  },
});

LazyInput.displayName = 'LazyInput';

export default LazyInput;
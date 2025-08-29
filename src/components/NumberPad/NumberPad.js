import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Vibration,
} from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const NumberPad = ({
  onKeyPress,
  onBackspace,
  onClear,
  onDecimal,
  showDecimal = true,
  showClear = true,
  theme = 'light',
  vibrate = true,
  style,
}) => {
  const keys = useMemo(() => [
    [{ key: '1', type: 'number' }, { key: '2', type: 'number' }, { key: '3', type: 'number' }],
    [{ key: '4', type: 'number' }, { key: '5', type: 'number' }, { key: '6', type: 'number' }],
    [{ key: '7', type: 'number' }, { key: '8', type: 'number' }, { key: '9', type: 'number' }],
    [
      showDecimal ? { key: '.', type: 'decimal' } : null,
      { key: '0', type: 'number' },
      { key: 'backspace', type: 'backspace' },
    ].filter(Boolean),
    showClear ? [{ key: 'clear', type: 'clear', span: 3 }] : [],
  ].filter(row => row.length > 0), [showDecimal, showClear]);

  const handleKeyPress = (keyData) => {
    if (vibrate) {
      Vibration.vibrate(50);
    }

    switch (keyData.type) {
      case 'number':
        onKeyPress?.(keyData.key);
        break;
      case 'decimal':
        onDecimal?.(keyData.key);
        break;
      case 'backspace':
        onBackspace?.();
        break;
      case 'clear':
        onClear?.();
        break;
    }
  };

  const renderKey = (keyData, index) => {
    const isSpanKey = keyData.span && keyData.span > 1;
    
    return (
      <TouchableOpacity
        key={`${keyData.key}-${index}`}
        style={[
          styles.key,
          theme === 'dark' ? styles.keyDark : styles.keyLight,
          isSpanKey && { flex: keyData.span },
          getKeyTypeStyle(keyData.type, theme),
        ]}
        onPress={() => handleKeyPress(keyData)}
        activeOpacity={0.7}
      >
        {keyData.type === 'backspace' ? (
          <Icon 
            name="backspace-outline" 
            size={24} 
            color={theme === 'dark' ? '#ffffff' : '#333333'} 
          />
        ) : (
          <Text style={[
            styles.keyText,
            theme === 'dark' ? styles.keyTextDark : styles.keyTextLight,
            getKeyTextStyle(keyData.type, theme),
          ]}>
            {keyData.key === 'clear' ? 'Clear' : keyData.key}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderRow = (row, rowIndex) => (
    <View key={rowIndex} style={styles.row}>
      {row.map((keyData, index) => renderKey(keyData, index))}
    </View>
  );

  return (
    <View style={[styles.container, theme === 'dark' ? styles.containerDark : styles.containerLight, style]}>
      {keys.map(renderRow)}
    </View>
  );
};

const getKeyTypeStyle = (type, theme) => {
  const baseStyle = {};
  
  switch (type) {
    case 'backspace':
      return {
        ...baseStyle,
        backgroundColor: theme === 'dark' ? '#444444' : '#e0e0e0',
      };
    case 'clear':
      return {
        ...baseStyle,
        backgroundColor: theme === 'dark' ? '#d32f2f' : '#f44336',
      };
    case 'decimal':
      return {
        ...baseStyle,
        backgroundColor: theme === 'dark' ? '#555555' : '#f0f0f0',
      };
    default:
      return baseStyle;
  }
};

const getKeyTextStyle = (type, theme) => {
  switch (type) {
    case 'clear':
      return { color: '#ffffff', fontWeight: '600' };
    default:
      return {};
  }
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  containerLight: {
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#1e1e1e',
    borderTopColor: '#333333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  keyLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  keyDark: {
    backgroundColor: '#2e2e2e',
    borderWidth: 1,
    borderColor: '#444444',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
  },
  keyTextLight: {
    color: '#333333',
  },
  keyTextDark: {
    color: '#ffffff',
  },
});

export default NumberPad;
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Button } from 'react-native-paper';

/**
 * Centralized Alert Modal Component
 * Replaces React Native's Alert.alert with consistent custom modal
 */
const AlertModal = ({
  visible,
  title,
  message,
  onClose,
  buttons = null,
  type = 'info' // 'info', 'success', 'warning', 'error', 'confirm'
}) => {
  const getIconByType = (alertType) => {
    switch (alertType) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'confirm':
        return '❓';
      default:
        return 'ℹ️';
    }
  };

  const getColorByType = (alertType) => {
    switch (alertType) {
      case 'success':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'error':
        return '#F44336';
      case 'confirm':
        return '#2196F3';
      default:
        return '#2196F3';
    }
  };

  const renderButtons = () => {
    if (buttons && buttons.length > 0) {
      return (
        <View style={styles.buttonContainer}>
          {buttons.map((button, index) => (
            <Button
              key={index}
              mode={button.style === 'cancel' ? 'outlined' : 'contained'}
              onPress={() => {
                button.onPress?.();
                if (!button.keepModalOpen) {
                  onClose();
                }
              }}
              style={[
                styles.button,
                button.style === 'destructive' && styles.destructiveButton
              ]}
              buttonColor={
                button.style === 'destructive' 
                  ? '#F44336' 
                  : button.style === 'cancel' 
                  ? undefined 
                  : getColorByType(type)
              }
            >
              {button.text}
            </Button>
          ))}
        </View>
      );
    }

    // Default single OK button
    return (
      <Button 
        mode="contained" 
        onPress={onClose}
        style={styles.singleButton}
        buttonColor={getColorByType(type)}
      >
        OK
      </Button>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.icon}>{getIconByType(type)}</Text>
            <Text style={[styles.title, { color: getColorByType(type) }]}>
              {title}
            </Text>
          </View>
          
          <Text style={styles.message}>{message}</Text>
          
          {renderButtons()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'left',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  destructiveButton: {
    // Additional styling for destructive buttons handled by buttonColor
  },
  singleButton: {
    alignSelf: 'center',
    minWidth: 100,
  },
});

export default AlertModal;
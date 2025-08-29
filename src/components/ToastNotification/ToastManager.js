import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { IconButton } from 'react-native-paper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Toast Notification Manager
 */
const ToastManager = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 3000, action = null) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      duration,
      action,
      timestamp: Date.now(),
    };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }

    return id;
  };

  const hideToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const hideAllToasts = () => {
    setToasts([]);
  };

  // Expose methods globally
  useEffect(() => {
    global.showToast = showToast;
    global.hideToast = hideToast;
    global.hideAllToasts = hideAllToasts;

    return () => {
      delete global.showToast;
      delete global.hideToast;
      delete global.hideAllToasts;
    };
  }, []);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onHide={() => hideToast(toast.id)}
        />
      ))}
    </View>
  );
};

const ToastItem = ({ toast, onHide }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Show animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      // Hide animation when unmounting
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    };
  }, []);

  const handleHide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#4CAF50',
          icon: 'check-circle',
          iconColor: '#fff',
        };
      case 'error':
        return {
          backgroundColor: '#F44336',
          icon: 'alert-circle',
          iconColor: '#fff',
        };
      case 'warning':
        return {
          backgroundColor: '#FF9800',
          icon: 'alert',
          iconColor: '#fff',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#2196F3',
          icon: 'information',
          iconColor: '#fff',
        };
    }
  };

  const typeConfig = getTypeConfig(toast.type);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: typeConfig.backgroundColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <IconButton
        icon={typeConfig.icon}
        iconColor={typeConfig.iconColor}
        size={20}
        style={styles.toastIcon}
      />
      
      <Text style={styles.toastMessage} numberOfLines={2}>
        {toast.message}
      </Text>

      {toast.action && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            toast.action.onPress();
            handleHide();
          }}
        >
          <Text style={styles.actionText}>{toast.action.text}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={handleHide} style={styles.closeButton}>
        <IconButton
          icon="close"
          iconColor={typeConfig.iconColor}
          size={16}
          style={styles.closeIcon}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Utility functions for easy use
export const showSuccessToast = (message, duration, action) =>
  global.showToast?.(message, 'success', duration, action);

export const showErrorToast = (message, duration, action) =>
  global.showToast?.(message, 'error', duration, action);

export const showWarningToast = (message, duration, action) =>
  global.showToast?.(message, 'warning', duration, action);

export const showInfoToast = (message, duration, action) =>
  global.showToast?.(message, 'info', duration, action);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    maxWidth: SCREEN_WIDTH - 32,
  },
  toastIcon: {
    margin: 0,
    marginRight: 8,
  },
  toastMessage: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    lineHeight: 20,
  },
  actionButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    marginLeft: 8,
  },
  closeIcon: {
    margin: 0,
  },
});

export default ToastManager;
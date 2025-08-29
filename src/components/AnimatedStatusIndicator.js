import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

/**
 * Animated Status Indicator with pulsing effects
 */
const AnimatedStatusIndicator = ({ 
  status = 'offline', // 'online', 'offline', 'connecting', 'error'
  size = 12,
  style 
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const getStatusConfig = (status) => {
    switch (status) {
      case 'online':
        return { color: '#4CAF50', shouldPulse: false };
      case 'connecting':
        return { color: '#FF9800', shouldPulse: true };
      case 'error':
        return { color: '#F44336', shouldPulse: true };
      case 'offline':
      default:
        return { color: '#9E9E9E', shouldPulse: false };
    }
  };

  const { color, shouldPulse } = getStatusConfig(status);

  useEffect(() => {
    if (shouldPulse) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      const opacityAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();
      opacityAnimation.start();

      return () => {
        pulseAnimation.stop();
        opacityAnimation.stop();
      };
    } else {
      // Reset animations for non-pulsing states
      pulseAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [status, shouldPulse, pulseAnim, opacityAnim]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.indicator,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      {shouldPulse && (
        <View
          style={[
            styles.ripple,
            {
              width: size * 2,
              height: size * 2,
              borderRadius: size,
              borderColor: color,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  ripple: {
    position: 'absolute',
    borderWidth: 1,
    opacity: 0.3,
  },
});

export default AnimatedStatusIndicator;
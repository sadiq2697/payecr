import React, { memo, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanGestureHandler,
  Animated,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

// High-performance swipeable card component
const SwipeableCard = memo(({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  disabled = false,
  style,
  ...props
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const onGestureEvent = useCallback(
    Animated.event([{ nativeEvent: { translationX: translateX } }], {
      useNativeDriver: true,
    }),
    [translateX]
  );

  const onHandlerStateChange = useCallback(({ nativeEvent }) => {
    if (disabled) return;

    const { translationX, state } = nativeEvent;
    
    // Gesture ended
    if (state === 5) { // State.END
      const shouldSwipeLeft = translationX > SWIPE_THRESHOLD;
      const shouldSwipeRight = translationX < -SWIPE_THRESHOLD;

      if (shouldSwipeLeft && onSwipeLeft) {
        // Animate out to the right
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onSwipeLeft();
          resetCard();
        });
      } else if (shouldSwipeRight && onSwipeRight) {
        // Animate out to the left
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onSwipeRight();
          resetCard();
        });
      } else {
        // Snap back to center
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else if (state === 2) { // State.ACTIVE
      // Scale down slightly while dragging
      Animated.spring(scale, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    }
  }, [disabled, onSwipeLeft, onSwipeRight, translateX, opacity, scale]);

  const resetCard = useCallback(() => {
    translateX.setValue(0);
    opacity.setValue(1);
    scale.setValue(1);
  }, [translateX, opacity, scale]);

  const actionOpacity = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, SCREEN_WIDTH],
    outputRange: [1, 1, 0, 1, 1],
    extrapolate: 'clamp',
  });

  const leftActionStyle = {
    opacity: translateX.interpolate({
      inputRange: [0, SWIPE_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
  };

  const rightActionStyle = {
    opacity: translateX.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
  };

  return (
    <View style={[styles.container, style]} {...props}>
      {/* Background Actions */}
      <Animated.View style={[styles.actionContainer, styles.leftAction, leftActionStyle]}>
        {leftAction}
      </Animated.View>
      <Animated.View style={[styles.actionContainer, styles.rightAction, rightActionStyle]}>
        {rightAction}
      </Animated.View>

      {/* Main Card */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        enabled={!disabled}
      >
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateX }, { scale }],
              opacity,
            },
          ]}
        >
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 4,
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  leftAction: {
    right: 0,
    backgroundColor: '#4CAF50',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  rightAction: {
    left: 0,
    backgroundColor: '#f44336',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

SwipeableCard.displayName = 'SwipeableCard';

export default SwipeableCard;
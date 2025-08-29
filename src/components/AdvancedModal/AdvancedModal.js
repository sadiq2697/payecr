import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Animated,
  Dimensions,
  PanGestureHandler,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { BlurView } from '@react-native-blur/blur';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Advanced Modal with animations, gestures, and blur effects
 */
const AdvancedModal = ({
  visible,
  onClose,
  children,
  animationType = 'slide', // 'slide', 'fade', 'scale', 'slideUp'
  swipeToDismiss = true,
  blurBackground = true,
  dismissOnBackdrop = true,
  style,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      showModal();
    } else {
      hideModal();
    }
  }, [visible]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  const showModal = () => {
    const animations = [
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ];

    switch (animationType) {
      case 'slide':
      case 'slideUp':
        slideAnim.setValue(SCREEN_HEIGHT);
        animations.push(
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          })
        );
        break;
      case 'fade':
        fadeAnim.setValue(0);
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        );
        break;
      case 'scale':
        scaleAnim.setValue(0.8);
        animations.push(
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          })
        );
        break;
    }

    Animated.parallel(animations).start();
  };

  const hideModal = () => {
    const animations = [
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ];

    switch (animationType) {
      case 'slide':
      case 'slideUp':
        animations.push(
          Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          })
        );
        break;
      case 'fade':
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          })
        );
        break;
      case 'scale':
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 250,
            useNativeDriver: true,
          })
        );
        break;
    }

    Animated.parallel(animations).start();
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === 5) { // END state
      const { translationY, velocityY } = event.nativeEvent;
      
      if (translationY > 150 || velocityY > 1000) {
        // Dismiss modal if swiped down enough
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onClose();
        });
      } else {
        // Snap back to position
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  const handleBackdropPress = () => {
    if (dismissOnBackdrop) {
      onClose();
    }
  };

  const getModalTransform = () => {
    switch (animationType) {
      case 'slide':
      case 'slideUp':
        return [
          { translateY: slideAnim },
          { translateY: swipeToDismiss ? translateY : 0 },
        ];
      case 'fade':
        return [];
      case 'scale':
        return [{ scale: scaleAnim }];
      default:
        return [];
    }
  };

  const getModalOpacity = () => {
    switch (animationType) {
      case 'fade':
        return fadeAnim;
      case 'scale':
        return scaleAnim.interpolate({
          inputRange: [0.8, 1],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        });
      default:
        return 1;
    }
  };

  if (!visible) return null;

  const BackdropComponent = blurBackground ? BlurView : View;
  const backdropProps = blurBackground
    ? {
        style: styles.backdrop,
        blurType: 'light',
        blurAmount: 10,
      }
    : {
        style: [styles.backdrop, styles.solidBackdrop],
      };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.backdropContainer,
            { opacity: backdropAnim },
          ]}
        >
          <BackdropComponent {...backdropProps}>
            <View
              style={styles.backdropTouchable}
              onTouchEnd={handleBackdropPress}
            />
          </BackdropComponent>
        </Animated.View>

        <PanGestureHandler
          onGestureEvent={swipeToDismiss ? onGestureEvent : undefined}
          onHandlerStateChange={swipeToDismiss ? onHandlerStateChange : undefined}
          enabled={swipeToDismiss && animationType === 'slide'}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: getModalTransform(),
                opacity: getModalOpacity(),
              },
              style,
            ]}
          >
            {swipeToDismiss && animationType === 'slide' && (
              <View style={styles.swipeHandle}>
                <View style={styles.swipeBar} />
              </View>
            )}
            {children}
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    flex: 1,
  },
  solidBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 200,
    maxHeight: SCREEN_HEIGHT * 0.9,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  swipeHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  swipeBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
});

export default AdvancedModal;
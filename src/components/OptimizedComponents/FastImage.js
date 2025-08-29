import React, { memo, useState, useCallback } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';

// Optimized image component with lazy loading and fade-in animation
const FastImage = memo(({
  source,
  style,
  fadeDuration = 300,
  placeholder,
  onLoad,
  onError,
  lazy = true,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [opacity] = useState(new Animated.Value(0));

  const handleLoad = useCallback((event) => {
    setIsLoaded(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: fadeDuration,
      useNativeDriver: true,
    }).start();
    onLoad?.(event);
  }, [opacity, fadeDuration, onLoad]);

  const handleError = useCallback((error) => {
    setHasError(true);
    onError?.(error);
  }, [onError]);

  return (
    <View style={[styles.container, style]}>
      {(!isLoaded && placeholder) && (
        <View style={styles.placeholder}>
          {placeholder}
        </View>
      )}
      
      <Animated.View style={[styles.imageContainer, { opacity }]}>
        <Image
          source={source}
          style={[styles.image, style]}
          onLoad={handleLoad}
          onError={handleError}
          resizeMode="cover"
          {...props}
        />
      </Animated.View>
      
      {hasError && (
        <View style={styles.errorContainer}>
          {/* Error placeholder or retry button */}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

FastImage.displayName = 'FastImage';

export default FastImage;
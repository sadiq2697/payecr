import React, { memo, useMemo } from 'react';
import { ScrollView, FlatList } from 'react-native';

// Optimized ScrollView with lazy loading and virtualization
const OptimizedScrollView = memo(({
  data = [],
  renderItem,
  useVirtualization = false,
  keyExtractor,
  initialNumToRender = 10,
  maxToRenderPerBatch = 5,
  windowSize = 10,
  removeClippedSubviews = true,
  getItemLayout,
  children,
  ...props
}) => {
  const optimizedProps = useMemo(() => ({
    removeClippedSubviews,
    scrollEventThrottle: 16,
    showsVerticalScrollIndicator: false,
    showsHorizontalScrollIndicator: false,
    keyboardShouldPersistTaps: 'handled',
    ...props,
  }), [props, removeClippedSubviews]);

  if (useVirtualization && data.length > 0) {
    return (
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        initialNumToRender={initialNumToRender}
        maxToRenderPerBatch={maxToRenderPerBatch}
        windowSize={windowSize}
        removeClippedSubviews={removeClippedSubviews}
        getItemLayout={getItemLayout}
        {...optimizedProps}
      />
    );
  }

  return (
    <ScrollView {...optimizedProps}>
      {children}
    </ScrollView>
  );
});

OptimizedScrollView.displayName = 'OptimizedScrollView';

export default OptimizedScrollView;
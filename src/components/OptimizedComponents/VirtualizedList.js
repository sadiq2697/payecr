import React, { memo, useMemo, useCallback } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';

// High-performance virtualized list with optimizations
const VirtualizedList = memo(({
  data,
  renderItem,
  keyExtractor,
  ItemSeparatorComponent,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  numColumns = 1,
  horizontal = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  onEndReachedThreshold = 0.1,
  estimatedItemSize = 60,
  ...props
}) => {
  // Optimize rendering parameters
  const optimizedProps = useMemo(() => ({
    initialNumToRender: Math.max(10, Math.floor(600 / estimatedItemSize)),
    maxToRenderPerBatch: 5,
    windowSize: 10,
    removeClippedSubviews: true,
    scrollEventThrottle: 16,
    getItemLayout: estimatedItemSize > 0 ? (_, index) => ({
      length: estimatedItemSize,
      offset: estimatedItemSize * index,
      index,
    }) : undefined,
  }), [estimatedItemSize]);

  // Memoized render item to prevent unnecessary re-renders
  const memoizedRenderItem = useCallback(
    ({ item, index }) => {
      const ItemComponent = renderItem({ item, index });
      return React.cloneElement(ItemComponent, {
        key: keyExtractor ? keyExtractor(item, index) : index.toString(),
      });
    },
    [renderItem, keyExtractor]
  );

  // Memoized key extractor
  const memoizedKeyExtractor = useCallback(
    (item, index) => {
      if (keyExtractor) {
        return keyExtractor(item, index);
      }
      return item.id?.toString() || index.toString();
    },
    [keyExtractor]
  );

  // Performance optimization: only re-render when data actually changes
  const memoizedData = useMemo(() => data, [data]);

  return (
    <FlatList
      data={memoizedData}
      renderItem={memoizedRenderItem}
      keyExtractor={memoizedKeyExtractor}
      ItemSeparatorComponent={ItemSeparatorComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      numColumns={numColumns}
      horizontal={horizontal}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...optimizedProps}
      {...props}
    />
  );
});

// Optimized list item wrapper
export const ListItem = memo(({ children, style, ...props }) => (
  <View style={[styles.listItem, style]} {...props}>
    {children}
  </View>
));

// Optimized separator component
export const Separator = memo(({ height = 1, color = '#e0e0e0' }) => (
  <View style={[styles.separator, { height, backgroundColor: color }]} />
));

const styles = StyleSheet.create({
  listItem: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  separator: {
    width: '100%',
  },
});

VirtualizedList.displayName = 'VirtualizedList';
ListItem.displayName = 'ListItem';
Separator.displayName = 'Separator';

export default VirtualizedList;
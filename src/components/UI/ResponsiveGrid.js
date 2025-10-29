import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const ResponsiveGrid = ({
  children,
  spacing = 16,
  columns = 'auto', // 'auto', 1, 2, 3, 4
  style,
  scrollable = true,
  contentContainerStyle,
}) => {
  const getColumns = () => {
    if (columns === 'auto') {
      // Auto-responsive: 1 column on mobile, 2 on tablet, 3+ on desktop
      if (width < 600) return 1;
      if (width < 900) return 2;
      if (width < 1200) return 3;
      return 4;
    }
    return columns;
  };

  const numColumns = getColumns();
  
  const renderGridItems = () => {
    if (!children) return null;
    
    const childArray = React.Children.toArray(children).filter(child => child != null);
    
    if (numColumns === 1) {
      // Single column layout
      return childArray.map((child, index) => (
        <View key={index} style={[styles.singleColumnItem, { marginBottom: spacing }]}>
          {child}
        </View>
      ));
    }
    
    // Multi-column layout
    const rows = [];
    for (let i = 0; i < childArray.length; i += numColumns) {
      const rowItems = childArray.slice(i, i + numColumns);
      
      rows.push(
        <View key={i} style={[styles.row, { marginBottom: spacing }]}>
          {rowItems.map((child, index) => (
            <View
              key={`${i}-${index}`}
              style={[
                styles.gridItem,
                {
                  flex: 1,
                  marginRight: index < rowItems.length - 1 ? spacing : 0,
                }
              ]}
            >
              {child}
            </View>
          ))}
          
          {/* Fill remaining space if row is not complete */}
          {rowItems.length < numColumns &&
            Array.from({ length: numColumns - rowItems.length }).map((_, index) => (
              <View
                key={`empty-${i}-${index}`}
                style={[styles.gridItem, { flex: 1 }]}
              />
            ))}
        </View>
      );
    }
    
    return rows;
  };

  const gridContent = (
    <View style={[styles.container, style]}>
      <View style={styles.grid}>
        {renderGridItems()}
      </View>
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {gridContent}
      </ScrollView>
    );
  }

  return gridContent;
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  container: {
    flex: 1,
  },
  grid: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  gridItem: {
    // Flex items will size themselves based on content
  },
  singleColumnItem: {
    width: '100%',
  },
});

export default ResponsiveGrid;
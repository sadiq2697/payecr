import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, Button } from 'react-native-paper';

const { width } = Dimensions.get('window');

const DashboardCard = ({
  title,
  subtitle,
  icon,
  iconColor = '#2196F3',
  onPress,
  children,
  style,
  disabled = false,
  headerAction,
  cardType = 'default', // 'default', 'status', 'action', 'info'
  fullWidth = false,
  status, // 'success', 'warning', 'error', 'info'
}) => {
  // Remove fixed width - let parent (ResponsiveGrid) handle sizing
  // const cardWidth = fullWidth ? '100%' : (width > 768 ? '48%' : '100%');
  
  const getCardStyles = () => {
    const baseStyle = [styles.card];
    
    if (disabled) {
      baseStyle.push(styles.cardDisabled);
    }
    
    switch (cardType) {
      case 'status':
        baseStyle.push(styles.statusCard);
        break;
      case 'action':
        baseStyle.push(styles.actionCard);
        break;
      case 'info':
        baseStyle.push(styles.infoCard);
        break;
      default:
        baseStyle.push(styles.defaultCard);
    }
    
    if (status) {
      baseStyle.push(styles[`${status}Border`]);
    }
    
    if (fullWidth) {
      baseStyle.push(styles.fullWidthCard);
    }
    
    return baseStyle;
  };

  const getIconColor = () => {
    if (disabled) return '#BDBDBD';
    if (status) {
      switch (status) {
        case 'success': return '#4CAF50';
        case 'warning': return '#FF9800';
        case 'error': return '#F44336';
        case 'info': return '#2196F3';
        default: return iconColor;
      }
    }
    return iconColor;
  };

  const CardContent = () => (
    <View style={[getCardStyles(), style]}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}15` }]}>
              <Icon 
                name={icon} 
                size={24} 
                color={getIconColor()} 
              />
            </View>
          )}
          <View style={styles.titleContainer}>
            <Text style={[
              styles.cardTitle, 
              disabled && styles.disabledText
            ]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[
                styles.cardSubtitle, 
                disabled && styles.disabledText
              ]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        
        {headerAction && (
          <View style={styles.headerRight}>
            {headerAction}
          </View>
        )}
      </View>

      {/* Card Body */}
      {children && (
        <View style={styles.cardBody}>
          {children}
        </View>
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity 
        onPress={onPress}
        style={styles.touchableCard}
        activeOpacity={0.7}
      >
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  touchableCard: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  defaultCard: {
    // Default styling
  },
  statusCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  actionCard: {
    borderColor: '#E3F2FD',
    backgroundColor: '#FAFFFE',
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E9ECEF',
  },
  cardDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.6,
  },
  successBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  warningBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  errorBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  infoBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    marginLeft: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#757575',
    lineHeight: 18,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  disabledText: {
    color: '#BDBDBD',
  },
  fullWidthCard: {
    flex: 1,
    minWidth: '100%',
  },
});

export default DashboardCard;
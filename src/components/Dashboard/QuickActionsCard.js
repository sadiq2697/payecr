import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DashboardCard from '../UI/DashboardCard';

const QuickActionButton = ({ 
  icon, 
  label, 
  onPress, 
  disabled = false, 
  variant = 'primary' // 'primary', 'secondary', 'success', 'warning'
}) => {
  const getButtonColor = () => {
    if (disabled) return '#BDBDBD';
    switch (variant) {
      case 'primary': return '#2196F3';
      case 'secondary': return '#757575';
      case 'success': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'danger': return '#F44336';
      default: return '#2196F3';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { borderColor: getButtonColor() },
        disabled && styles.disabledButton
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Icon 
        name={icon} 
        size={20} 
        color={getButtonColor()} 
        style={styles.actionIcon}
      />
      <Text style={[
        styles.actionLabel,
        { color: getButtonColor() }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const QuickActionsCard = ({ 
  isConnected = false, 
  onSale,
  onWalletSale,
  onVoid,
  onSettlement,
  onEchoTest,
  onHistory,
  loading = false
}) => {
  const transactionActions = [
    {
      icon: 'credit-card',
      label: 'Sale',
      onPress: onSale,
      variant: 'primary',
      disabled: !isConnected || loading
    },
    {
      icon: 'qrcode',
      label: 'E-Wallet',
      onPress: onWalletSale,
      variant: 'success',
      disabled: !isConnected || loading
    },
    {
      icon: 'cancel',
      label: 'Void',
      onPress: onVoid,
      variant: 'warning',
      disabled: !isConnected || loading
    },
    {
      icon: 'calculator',
      label: 'Settlement',
      onPress: onSettlement,
      variant: 'secondary',
      disabled: !isConnected || loading
    }
  ];

  const systemActions = [
    {
      icon: 'flash',
      label: 'Echo Test',
      onPress: onEchoTest,
      variant: 'primary',
      disabled: !isConnected || loading
    },
    {
      icon: 'history',
      label: 'History',
      onPress: onHistory,
      variant: 'secondary',
      disabled: loading
    }
  ];

  return (
    <DashboardCard
      title="Quick Actions"
      subtitle={isConnected ? "Available transactions" : "Connect to enable actions"}
      icon="lightning-bolt"
      cardType="action"
    >
      <View style={styles.actionsContainer}>
        {/* Transaction Actions */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <View style={styles.actionGrid}>
            {transactionActions.map((action, index) => (
              <QuickActionButton
                key={index}
                {...action}
              />
            ))}
          </View>
        </View>

        {/* System Actions */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>System</Text>
          <View style={styles.actionGrid}>
            {systemActions.map((action, index) => (
              <QuickActionButton
                key={index}
                {...action}
              />
            ))}
          </View>
        </View>

        {!isConnected && (
          <View style={styles.notConnectedBanner}>
            <Icon name="information-outline" size={16} color="#FF9800" />
            <Text style={styles.notConnectedText}>
              Connect to ECR terminal to enable transactions
            </Text>
          </View>
        )}
      </View>
    </DashboardCard>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    marginTop: 8,
  },
  actionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    minWidth: '48%',
    maxWidth: '48%',
  },
  disabledButton: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  actionIcon: {
    marginRight: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  notConnectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE0B2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  notConnectedText: {
    fontSize: 12,
    color: '#F57C00',
    marginLeft: 8,
    flex: 1,
  },
});

export default QuickActionsCard;
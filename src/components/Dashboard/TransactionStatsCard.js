import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DashboardCard from '../UI/DashboardCard';

const StatItem = ({ label, value, icon, trend, trendValue }) => {
  const getTrendColor = () => {
    if (!trend) return '#757575';
    return trend === 'up' ? '#4CAF50' : trend === 'down' ? '#F44336' : '#757575';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'trending-neutral';
  };

  return (
    <View style={styles.statItem}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={16} color="#757575" />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      
      <View style={styles.statValueContainer}>
        <Text style={styles.statValue}>{value}</Text>
        {trend && trendValue && (
          <View style={styles.trendContainer}>
            <Icon 
              name={getTrendIcon()} 
              size={12} 
              color={getTrendColor()} 
            />
            <Text style={[styles.trendValue, { color: getTrendColor() }]}>
              {trendValue}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const TransactionStatsCard = ({ 
  todayStats = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalAmount: 0,
    successRate: 100
  },
  yesterdayStats = null,
  loading = false 
}) => {
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return null; // Don't show trend for minimal changes
    return {
      direction: change > 0 ? 'up' : 'down',
      value: `${Math.abs(change).toFixed(0)}%`
    };
  };

  const formatAmount = (amount) => {
  const safeAmount = Number(amount) || 0;
  if (safeAmount >= 1000) {
    return `RM ${(safeAmount / 1000).toFixed(1)}k`;
  }
  return `RM ${safeAmount.toFixed(2)}`;
};


  const transactionTrend = yesterdayStats ? 
    calculateTrend(todayStats.totalTransactions, yesterdayStats.totalTransactions) : null;
  
  const amountTrend = yesterdayStats ? 
    calculateTrend(todayStats.totalAmount, yesterdayStats.totalAmount) : null;

  if (loading) {
    return (
      <DashboardCard
        title="Today's Statistics"
        subtitle="Loading transaction data..."
        icon="chart-line"
        cardType="info"
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Today's Statistics"
      subtitle={`${todayStats.totalTransactions} transactions processed`}
      icon="chart-line"
      cardType="info"
    >
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <StatItem
            label="Total Transactions"
            value={todayStats.totalTransactions}
            icon="receipt"
            trend={transactionTrend?.direction}
            trendValue={transactionTrend?.value}
          />
          
          <StatItem
            label="Success Rate"
            value={`${todayStats.successRate}%`}
            icon="check-circle"
          />
        </View>

        <View style={styles.statsRow}>
          <StatItem
            label="Total Amount"
            value={formatAmount(todayStats.totalAmount)}
            icon="currency-usd"
            trend={amountTrend?.direction}
            trendValue={amountTrend?.value}
          />
          
          <StatItem
            label="Failed"
            value={todayStats.failedTransactions}
            icon="close-circle"
          />
        </View>

        {/* Success Rate Bar */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>Success Rate</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${todayStats.successRate}%`,
                  backgroundColor: todayStats.successRate >= 95 ? '#4CAF50' : 
                                   todayStats.successRate >= 80 ? '#FF9800' : '#F44336'
                }
              ]} 
            />
          </View>
          <Text style={styles.progressValue}>{todayStats.successRate}%</Text>
        </View>
      </View>
    </DashboardCard>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
  statsContainer: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
    fontWeight: '500',
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendValue: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  progressSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  progressLabel: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressValue: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
  },
});

export default TransactionStatsCard;
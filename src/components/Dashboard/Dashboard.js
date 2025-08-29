import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Text, Card, IconButton, Chip } from 'react-native-paper';
import AnimatedStatusIndicator from '../AnimatedStatusIndicator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Customizable Dashboard with draggable widgets
 */
const Dashboard = ({
  connectionStatus,
  deviceCount,
  todayTransactions,
  connectionHealth,
  recentActivity,
}) => {
  const [widgetLayout, setWidgetLayout] = useState([
    'connectionStatus',
    'quickStats',
    'connectionHealth',
    'recentActivity',
  ]);

  const widgets = useMemo(() => ({
    connectionStatus: {
      id: 'connectionStatus',
      title: 'Connection Status',
      component: ConnectionStatusWidget,
      size: 'medium',
      priority: 1,
    },
    quickStats: {
      id: 'quickStats',
      title: 'Quick Stats',
      component: QuickStatsWidget,
      size: 'large',
      priority: 2,
    },
    connectionHealth: {
      id: 'connectionHealth',
      title: 'Connection Health',
      component: ConnectionHealthWidget,
      size: 'medium',
      priority: 3,
    },
    recentActivity: {
      id: 'recentActivity',
      title: 'Recent Activity',
      component: RecentActivityWidget,
      size: 'large',
      priority: 4,
    },
  }), []);

  const renderWidget = (widgetId) => {
    const widget = widgets[widgetId];
    if (!widget) return null;

    const WidgetComponent = widget.component;
    
    return (
      <Card key={widgetId} style={[styles.widget, styles[widget.size]]}>
        <Card.Content style={styles.widgetContent}>
          <View style={styles.widgetHeader}>
            <Text style={styles.widgetTitle}>{widget.title}</Text>
            <IconButton
              icon="drag-variant"
              size={16}
              iconColor="#999"
              style={styles.dragHandle}
            />
          </View>
          <WidgetComponent
            connectionStatus={connectionStatus}
            deviceCount={deviceCount}
            todayTransactions={todayTransactions}
            connectionHealth={connectionHealth}
            recentActivity={recentActivity}
          />
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.dashboardTitle}>Dashboard</Text>
      
      <View style={styles.widgetsContainer}>
        {widgetLayout.map(renderWidget)}
      </View>
    </ScrollView>
  );
};

// Connection Status Widget
const ConnectionStatusWidget = ({ connectionStatus, deviceCount }) => {
  const getStatusText = () => {
    if (connectionStatus?.isConnected) {
      return `Connected to ${connectionStatus.deviceName || 'ECR Terminal'}`;
    }
    return 'Disconnected';
  };

  const getDeviceCountText = () => {
    if (deviceCount === 0) return 'No devices saved';
    const onlineCount = deviceCount.online || 0;
    const totalCount = deviceCount.total || 0;
    return `${onlineCount}/${totalCount} devices online`;
  };

  return (
    <View style={styles.statusWidget}>
      <View style={styles.statusRow}>
        <AnimatedStatusIndicator
          status={connectionStatus?.isConnected ? 'online' : 'offline'}
          size={16}
        />
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
      <Text style={styles.deviceCountText}>{getDeviceCountText()}</Text>
    </View>
  );
};

// Quick Stats Widget
const QuickStatsWidget = ({ todayTransactions, connectionHealth }) => {
  const stats = [
    {
      label: 'Today\'s Transactions',
      value: todayTransactions?.count || 0,
      trend: todayTransactions?.trend || 0,
      color: '#4CAF50',
    },
    {
      label: 'Success Rate',
      value: `${todayTransactions?.successRate || 100}%`,
      trend: todayTransactions?.successRateTrend || 0,
      color: '#2196F3',
    },
    {
      label: 'Avg Response Time',
      value: `${connectionHealth?.latency || 0}ms`,
      trend: connectionHealth?.latencyTrend || 0,
      color: '#FF9800',
    },
  ];

  return (
    <View style={styles.statsWidget}>
      {stats.map((stat, index) => (
        <View key={index} style={styles.statItem}>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
          {stat.trend !== 0 && (
            <Chip
              mode="outlined"
              compact
              style={[
                styles.trendChip,
                { borderColor: stat.trend > 0 ? '#4CAF50' : '#F44336' },
              ]}
              textStyle={[
                styles.trendText,
                { color: stat.trend > 0 ? '#4CAF50' : '#F44336' },
              ]}
            >
              {stat.trend > 0 ? '↗' : '↘'} {Math.abs(stat.trend)}%
            </Chip>
          )}
        </View>
      ))}
    </View>
  );
};

// Connection Health Widget
const ConnectionHealthWidget = ({ connectionHealth }) => {
  const getHealthColor = (value) => {
    if (value >= 80) return '#4CAF50';
    if (value >= 60) return '#FF9800';
    return '#F44336';
  };

  const healthMetrics = [
    {
      label: 'Signal Strength',
      value: connectionHealth?.signalStrength || 0,
      unit: '%',
    },
    {
      label: 'Latency',
      value: connectionHealth?.latency || 0,
      unit: 'ms',
    },
    {
      label: 'Uptime',
      value: Math.floor((connectionHealth?.uptime || 0) / 1000 / 60),
      unit: 'min',
    },
  ];

  return (
    <View style={styles.healthWidget}>
      {healthMetrics.map((metric, index) => (
        <View key={index} style={styles.healthMetric}>
          <View style={styles.healthMetricHeader}>
            <Text style={styles.healthLabel}>{metric.label}</Text>
            <Text style={[
              styles.healthValue,
              { color: getHealthColor(metric.value) }
            ]}>
              {metric.value}{metric.unit}
            </Text>
          </View>
          <View style={styles.healthBar}>
            <View
              style={[
                styles.healthBarFill,
                {
                  width: `${Math.min(metric.value, 100)}%`,
                  backgroundColor: getHealthColor(metric.value),
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

// Recent Activity Widget
const RecentActivityWidget = ({ recentActivity }) => {
  const activities = recentActivity || [];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'connection': return '🔌';
      case 'transaction': return '💳';
      case 'error': return '⚠️';
      case 'device': return '📱';
      default: return 'ℹ️';
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <View style={styles.activityWidget}>
      {activities.length === 0 ? (
        <Text style={styles.emptyActivityText}>No recent activity</Text>
      ) : (
        activities.slice(0, 5).map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <Text style={styles.activityIcon}>
              {getActivityIcon(activity.type)}
            </Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityDescription}>
                {activity.description}
              </Text>
            </View>
            <Text style={styles.activityTime}>
              {getTimeAgo(activity.timestamp)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  widgetsContainer: {
    gap: 16,
  },
  widget: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#fff',
  },
  medium: {
    minHeight: 120,
  },
  large: {
    minHeight: 200,
  },
  widgetContent: {
    padding: 16,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dragHandle: {
    margin: 0,
  },
  statusWidget: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  deviceCountText: {
    fontSize: 14,
    color: '#666',
  },
  statsWidget: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  trendChip: {
    marginTop: 8,
    height: 24,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  healthWidget: {
    gap: 16,
  },
  healthMetric: {
    gap: 8,
  },
  healthMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthLabel: {
    fontSize: 14,
    color: '#666',
  },
  healthValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  healthBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  activityWidget: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  activityDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  activityTime: {
    fontSize: 10,
    color: '#999',
  },
  emptyActivityText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default Dashboard;
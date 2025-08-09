import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { Card, Title, Button, Chip, Divider } from 'react-native-paper';

const LogViewer = ({ ecrService }) => {
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  
  const logLevels = [
    { key: 'all', label: 'All', color: '#666' },
    { key: 'info', label: 'Info', color: '#2196F3' },
    { key: 'success', label: 'Success', color: '#4CAF50' },
    { key: 'warning', label: 'Warning', color: '#FF9800' },
    { key: 'error', label: 'Error', color: '#F44336' },
    { key: 'debug', label: 'Debug', color: '#9C27B0' },
  ];
  
  useEffect(() => {
    loadLogs();
    
    // Set up periodic refresh
    const interval = setInterval(loadLogs, 2000);
    return () => clearInterval(interval);
  }, []);
  
  const loadLogs = () => {
    if (ecrService) {
      const communicationLog = ecrService.getCommunicationLog();
      setLogs(communicationLog);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadLogs();
    setTimeout(() => setRefreshing(false), 500);
  };
  
  const handleClearLogs = () => {
    if (ecrService) {
      ecrService.clearLog();
      setLogs([]);
    }
  };
  
  const getFilteredLogs = () => {
    if (filter === 'all') {
      return logs;
    }
    return logs.filter(log => log.level === filter);
  };
  
  const getLevelColor = (level) => {
    const levelConfig = logLevels.find(l => l.key === level);
    return levelConfig ? levelConfig.color : '#666';
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };
  
  const renderLogEntry = (log, index) => (
    <TouchableOpacity key={index} style={styles.logEntry}>
      <View style={styles.logHeader}>
        <Text style={styles.timestamp}>
          {formatTimestamp(log.timestamp)}
        </Text>
        <Chip
          style={[styles.levelChip, { backgroundColor: getLevelColor(log.level) }]}
          textStyle={{ color: 'white', fontSize: 10 }}
          compact
        >
          {log.level.toUpperCase()}
        </Chip>
      </View>
      <Text style={styles.logMessage} selectable>
        {log.message}
      </Text>
    </TouchableOpacity>
  );
  
  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      <Text style={styles.filterLabel}>Filter:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {logLevels.map((level) => (
          <Chip
            key={level.key}
            selected={filter === level.key}
            onPress={() => setFilter(level.key)}
            style={[
              styles.filterChip,
              filter === level.key && { backgroundColor: level.color }
            ]}
            textStyle={filter === level.key && { color: 'white' }}
            compact
          >
            {level.label}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
  
  const filteredLogs = getFilteredLogs();
  
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Title>Communication Log</Title>
          <View style={styles.headerButtons}>
            <Button
              mode="outlined"
              compact
              onPress={handleRefresh}
              style={styles.headerButton}
            >
              Refresh
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={handleClearLogs}
              style={styles.headerButton}
            >
              Clear
            </Button>
          </View>
        </View>
        
        {renderFilterChips()}
        
        <Divider style={styles.divider} />
        
        <View style={styles.logStats}>
          <Text style={styles.statsText}>
            Showing {filteredLogs.length} of {logs.length} entries
          </Text>
        </View>
        
        <ScrollView
          style={styles.logContainer}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {filteredLogs.length === 0 ? (
            <View style={styles.noLogsContainer}>
              <Text style={styles.noLogsText}>
                {logs.length === 0 ? 'No log entries yet' : 'No entries match the current filter'}
              </Text>
            </View>
          ) : (
            // Reverse to show newest first
            filteredLogs.slice().reverse().map((log, index) => 
              renderLogEntry(log, index)
            )
          )}
        </ScrollView>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    minWidth: 60,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
    color: '#333',
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#e0e0e0',
  },
  divider: {
    marginVertical: 12,
  },
  logStats: {
    marginBottom: 12,
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  logContainer: {
    maxHeight: 400,
  },
  noLogsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noLogsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  logEntry: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#e0e0e0',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
  levelChip: {
    height: 20,
  },
  logMessage: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});

export default LogViewer;


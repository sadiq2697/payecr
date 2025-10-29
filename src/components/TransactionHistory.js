import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Share,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  Card,
  Title,
  Button,
  Divider,
  Chip,
  IconButton,
  Searchbar,
  FAB,
  DataTable,
  SegmentedButtons,
} from 'react-native-paper';
import { LineChart, PieChart } from 'react-native-chart-kit';
import SwipeableCard from './OptimizedComponents/SwipeableCard';
import AdvancedModal from './AdvancedModal/AdvancedModal';
import useAlert from '../hooks/useAlert';
import ResponsiveGrid from './UI/ResponsiveGrid';
import DashboardCard from './UI/DashboardCard';

const { width: screenWidth } = Dimensions.get('window');

const TransactionHistory = ({ transactionRecorder, ecrService }) => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);

  const { showSuccess, showError, showWarning, showAlert } = useAlert();

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'DECLINED', label: 'Declined' },
    { value: 'ERROR', label: 'Error' },
  ];

  const dateFilters = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  const viewModes = [
    { value: 'list', label: 'List', icon: 'view-list' },
    { value: 'table', label: 'Table', icon: 'table' },
    { value: 'stats', label: 'Statistics', icon: 'chart-line' },
  ];

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchQuery, statusFilter, dateFilter]);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const allTransactions = await transactionRecorder.getAllTransactions();
      const stats = await transactionRecorder.getTransactionStats();
      
      setTransactions(allTransactions);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      showError('Load Error', 'Failed to load transaction history');
    } finally {
      setIsLoading(false);
    }
  }, [transactionRecorder, showError]);

  const filterTransactions = useCallback(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(tx =>
        tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.financial.amountFormatted.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.response.cardNumber && tx.response.cardNumber.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.timestamp);
        
        switch (dateFilter) {
          case 'today':
            return txDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return txDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return txDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    setFilteredTransactions(filtered);
  }, [transactions, searchQuery, statusFilter, dateFilter]);

  const viewTransactionDetail = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const exportTransactions = async () => {
    try {
      const exportData = await transactionRecorder.exportTransactionsJSON({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: dateFilter !== 'all' ? getFilterStartDate() : undefined,
        endDate: dateFilter !== 'all' ? new Date().toISOString() : undefined,
      });

      await Share.share({
        message: exportData,
        title: 'Transaction History Export',
      });

      showSuccess('Export Complete', `Exported ${filteredTransactions.length} transactions`);
    } catch (error) {
      showError('Export Error', 'Failed to export transactions');
    }
  };

  const getFilterStartDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        return today.toISOString();
      case 'week':
        return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return undefined;
    }
  };


  const handleDeleteTransaction = (transaction) => {
    showAlert(
      'Delete Transaction', 
      `Delete transaction ${transaction.id.substring(0, 12)}...?`,
      () => {
        setTransactions(prev => prev.filter(t => t.id !== transaction.id));
      }
    );
  };

  const handleShareTransaction = async (transaction) => {
    const content = `Transaction: ${transaction.id}\nType: ${transaction.type}\nAmount: ${transaction.financial.amountFormatted}\nStatus: ${transaction.status}\nDate: ${new Date(transaction.timestamp).toLocaleString()}`;
    try {
      await Share.share({ message: content });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const renderTransactionItem = ({ item }) => (
    <SwipeableCard
      onSwipeLeft={() => handleShareTransaction(item)}
      onSwipeRight={() => handleDeleteTransaction(item)}
      leftAction={
        <View style={styles.swipeAction}>
          <IconButton icon="share" iconColor="white" size={24} />
          <Text style={styles.swipeActionText}>Share</Text>
        </View>
      }
      rightAction={
        <View style={styles.swipeAction}>
          <IconButton icon="delete" iconColor="white" size={24} />
          <Text style={styles.swipeActionText}>Delete</Text>
        </View>
      }
    >
      <Card style={styles.transactionCard} onPress={() => viewTransactionDetail(item)}>
        <Card.Content>
          <View style={styles.transactionHeader}>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionId}>
                {item.id.substring(0, 12)}...
              </Text>
              <Text style={styles.transactionDate}>
                {new Date(item.timestamp).toLocaleDateString()}
              </Text>
              <Text style={styles.transactionTime}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </Text>
            </View>
            <View style={styles.transactionDetails}>
              <Chip
                style={[styles.statusChip, { 
                  backgroundColor: item.status === 'APPROVED' ? '#4CAF50' : 
                                  item.status === 'DECLINED' ? '#FF9800' : '#f44336' 
                }]}
                textStyle={{ color: 'white', fontSize: 12 }}
              >
                {item.status}
              </Chip>
              <Text style={styles.amount}>{item.financial.amountFormatted}</Text>
              <Text style={styles.type}>{item.type}</Text>
            </View>
          </View>
          
          {item.response.cardNumber && (
            <Text style={styles.cardNumber}>
              Card: {item.response.cardNumber}
            </Text>
          )}
        </Card.Content>
      </Card>
    </SwipeableCard>
  );

  const renderTableView = () => (
    <DataTable style={styles.dataTable}>
      <DataTable.Header>
        <DataTable.Title>Date</DataTable.Title>
        <DataTable.Title>Type</DataTable.Title>
        <DataTable.Title numeric>Amount</DataTable.Title>
        <DataTable.Title>Status</DataTable.Title>
      </DataTable.Header>

      {filteredTransactions.slice(0, 20).map((item) => (
        <DataTable.Row 
          key={item.id} 
          onPress={() => viewTransactionDetail(item)}
        >
          <DataTable.Cell>
            {new Date(item.timestamp).toLocaleDateString()}
          </DataTable.Cell>
          <DataTable.Cell>{item.type}</DataTable.Cell>
          <DataTable.Cell numeric>{item.financial.amountFormatted}</DataTable.Cell>
          <DataTable.Cell>
            <Chip
              style={[styles.miniStatusChip, { 
                backgroundColor: item.status === 'APPROVED' ? '#4CAF50' : 
                                item.status === 'DECLINED' ? '#FF9800' : '#f44336' 
              }]}
              textStyle={{ color: 'white', fontSize: 10 }}
            >
              {item.status.substring(0, 3)}
            </Chip>
          </DataTable.Cell>
        </DataTable.Row>
      ))}
    </DataTable>
  );

  const generateChartData = () => {
    if (!statistics) return null;

    // Line chart data for transactions over time (last 7 days)
    const dateEntries = Object.entries(statistics.byDate || {}).slice(-7);
    const lineChartData = {
      labels: dateEntries.map(([date]) => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [{
        data: dateEntries.map(([, count]) => count),
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 2,
      }],
    };

    // Pie chart data for transaction status
    const pieChartData = [
      {
        name: 'Approved',
        population: statistics.approved,
        color: '#4CAF50',
        legendFontColor: '#333',
        legendFontSize: 14,
      },
      {
        name: 'Declined', 
        population: statistics.declined,
        color: '#FF9800',
        legendFontColor: '#333',
        legendFontSize: 14,
      },
      {
        name: 'Error',
        population: statistics.errors,
        color: '#f44336',
        legendFontColor: '#333',
        legendFontSize: 14,
      },
    ].filter(item => item.population > 0);

    return { lineChartData, pieChartData };
  };

  const renderStatisticsView = () => {
    const chartData = generateChartData();
    
    if (!statistics) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No statistics available</Text>
        </View>
      );
    }

    return (
      <View style={styles.statsContainer}>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title>Transaction Summary</Title>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{statistics.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                  {statistics.approved}
                </Text>
                <Text style={styles.statLabel}>Approved</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FF9800' }]}>
                  {statistics.declined}
                </Text>
                <Text style={styles.statLabel}>Declined</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#f44336' }]}>
                  {statistics.errors}
                </Text>
                <Text style={styles.statLabel}>Errors</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {chartData && chartData.lineChartData.labels.length > 0 && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Title>Transactions Over Time</Title>
              <LineChart
                data={chartData.lineChartData}
                width={screenWidth - 64}
                height={220}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                }}
                style={styles.chart}
              />
            </Card.Content>
          </Card>
        )}

        {chartData && chartData.pieChartData.length > 0 && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Title>Status Distribution</Title>
              <PieChart
                data={chartData.pieChartData}
                width={screenWidth - 64}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            </Card.Content>
          </Card>
        )}

        <Card style={styles.statsCard}>
          <Card.Content>
            <Title>Transaction Types</Title>
            <View style={styles.typesList}>
              {Object.entries(statistics.byType || {}).map(([type, count]) => (
                <View key={type} style={styles.typeItem}>
                  <Text style={styles.typeName}>{type}</Text>
                  <Text style={styles.typeCount}>{count}</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      </View>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'table':
        return renderTableView();
      case 'stats':
        return renderStatisticsView();
      default:
        return (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransactionItem}
            style={styles.transactionsList}
            contentContainerStyle={styles.transactionsListContent}
            refreshing={isLoading}
            onRefresh={loadTransactions}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No transactions found</Text>
                <Text style={styles.emptySubtext}>
                  Complete some transactions to see history here
                </Text>
              </View>
            }
          />
        );
    }
  };

  return (
    <ResponsiveGrid scrollable={true}>
      <DashboardCard
        title="Transaction History"
        subtitle={`${filteredTransactions.length} transactions found`}
        icon="history"
        cardType="info"
        fullWidth={true}
      >
        {/* View Mode Selector */}
        <SegmentedButtons
          value={viewMode}
          onValueChange={setViewMode}
          buttons={viewModes}
          style={styles.viewModeSelector}
        />
      </DashboardCard>

      {/* Search and Filters */}
      <DashboardCard
        title="Search & Filter"
        subtitle="Find specific transactions"
        icon="filter"
        cardType="action"
      >
        <Searchbar
          placeholder="Search transactions..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <View style={styles.filtersRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status:</Text>
            <SegmentedButtons
              value={statusFilter}
              onValueChange={setStatusFilter}
              buttons={statusFilters}
              style={styles.filterButtons}
              density="small"
            />
          </View>
          
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Date:</Text>
            <SegmentedButtons
              value={dateFilter}
              onValueChange={setDateFilter}
              buttons={dateFilters}
              style={styles.filterButtons}
              density="small"
            />
          </View>
        </View>
      </DashboardCard>

      {/* Content */}
      <DashboardCard
        title="Transaction Data"
        subtitle={`Viewing in ${viewMode} mode`}
        icon="database"
        cardType="default"
        fullWidth={true}
        headerAction={
          filteredTransactions.length > 0 && (
            <FAB
              icon="export"
              onPress={exportTransactions}
              label="Export"
              size="small"
            />
          )
        }
      >
        {renderContent()}
      </DashboardCard>


      {/* Transaction Detail Modal */}
      <AdvancedModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        animationType="scale"
        swipeToDismiss={false}
        blurBackground={true}
      >
        <View style={styles.modalHeader}>
          <Title>Transaction Details</Title>
          <IconButton
            icon="close"
            onPress={() => setShowDetailModal(false)}
          />
        </View>

        {selectedTransaction && (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Transaction ID:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.id}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Date/Time:</Text>
              <Text style={styles.detailValue}>{new Date(selectedTransaction.timestamp).toLocaleString()}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.type}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.financial.amountFormatted}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.status}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Response Code:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.response.responseCode || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Response Message:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.response.responseMessage || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Approval Code:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.response.approvalCode || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Card Number:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.response.cardNumber || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Card Type:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.response.cardType || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Merchant ID:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.response.merchantId || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Terminal ID:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.response.terminalId || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Batch Number:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.response.batchNumber || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Receipt Number:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.response.receiptNumber || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Processing Time:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.response.processingTime || 0}ms</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Connection Type:</Text>
              <Text style={styles.detailValue}>{selectedTransaction.request.connectionType || 'N/A'}</Text>
            </View>
          </ScrollView>
        )}
      </AdvancedModal>
    </ResponsiveGrid>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  viewModeSelector: {
    marginBottom: 16,
  },
  controls: {
    marginBottom: 16,
  },
  searchbar: {
    marginBottom: 12,
  },
  filtersRow: {
    gap: 12,
  },
  filterGroup: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  filterButtons: {
    marginBottom: 8,
  },
  transactionsList: {
    flex: 1,
  },
  transactionsListContent: {
    paddingBottom: 80,
  },
  transactionCard: {
    marginBottom: 12,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDetails: {
    alignItems: 'flex-end',
  },
  transactionId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionTime: {
    fontSize: 12,
    color: '#666',
  },
  statusChip: {
    marginBottom: 4,
  },
  miniStatusChip: {
    height: 24,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  type: {
    fontSize: 12,
    color: '#666',
  },
  cardNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  dataTable: {
    backgroundColor: '#fff',
  },
  statsContainer: {
    flex: 1,
  },
  statsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  typesList: {
    gap: 8,
  },
  typeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  typeName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  typeCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  successRateContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successRateText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  successRateLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  chartCard: {
    marginBottom: 16,
    elevation: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  exportFab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailValue: {
    flex: 2,
    fontSize: 14,
    color: '#666',
  },
  swipeAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  swipeActionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
});

export default TransactionHistory;
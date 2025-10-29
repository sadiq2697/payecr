import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  Share,
  Alert,
  TouchableOpacity,
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
} from 'react-native-paper';
import useAlert from '../hooks/useAlert';

const ReceiptViewer = ({ ecrService, transactionRecorder, printerService }) => {
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const { showSuccess, showError, showWarning } = useAlert();
  const [isPrinting, setIsPrinting] = useState(false);

  const receiptTypes = [
    { key: 'all', label: 'All Receipts', color: '#666' },
    { key: 'customer', label: 'Customer', color: '#4CAF50' },
    { key: 'merchant', label: 'Merchant', color: '#2196F3' },
    { key: 'pos', label: 'POS Receipt', color: '#FF9800' },
  ];

  useEffect(() => {
    loadReceipts();
  }, []);

  useEffect(() => {
    filterReceipts();
  }, [receipts, searchQuery, filterType]);

  const loadReceipts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all transactions with receipt data
      const transactions = await transactionRecorder.getAllTransactions();
      
      // Filter transactions that have receipt data
      const receiptsData = transactions
        .filter(tx => tx.receipt && (tx.receipt.generated || tx.receipt.filePath))
        .map(tx => ({
          id: tx.id,
          transactionId: tx.id,
          type: tx.type,
          amount: tx.financial.amountFormatted,
          timestamp: tx.timestamp,
          status: tx.status,
          receiptData: tx.receipt,
          customerReceipt: generateCustomerReceipt(tx),
          merchantReceipt: generateMerchantReceipt(tx),
          posReceipt: generatePOSReceipt(tx),
        }));

      setReceipts(receiptsData);
    } catch (error) {
      console.error('Failed to load receipts:', error);
      showError('Load Error', 'Failed to load receipts');
    } finally {
      setIsLoading(false);
    }
  }, [transactionRecorder, showError]);

  const filterReceipts = useCallback(() => {
    let filtered = [...receipts];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(receipt =>
        receipt.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.amount.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      // For now, all receipts show all types, but this could be extended
      // to filter based on receipt type if needed
    }

    setFilteredReceipts(filtered);
  }, [receipts, searchQuery, filterType]);

  const generateCustomerReceipt = (transaction) => {
    return `
╔════════════════════════════════════════╗
║              CUSTOMER COPY             ║
╚════════════════════════════════════════╝

Transaction ID: ${transaction.id}
Date/Time: ${new Date(transaction.timestamp).toLocaleString()}
Type: ${transaction.type}
Amount: ${transaction.financial.amountFormatted}

${transaction.response.approved ? 'APPROVED' : 'DECLINED'}
${transaction.response.responseMessage || ''}

${transaction.response.approvalCode ? `Approval Code: ${transaction.response.approvalCode}` : ''}
${transaction.response.receiptNumber ? `Receipt #: ${transaction.response.receiptNumber}` : ''}
${transaction.response.cardNumber ? `Card: ${transaction.response.cardNumber}` : ''}

Merchant ID: ${transaction.response.merchantId || 'N/A'}
Terminal ID: ${transaction.response.terminalId || 'N/A'}
Batch #: ${transaction.response.batchNumber || 'N/A'}

Thank you for your business!

╔════════════════════════════════════════╗
║   Please keep this receipt for your    ║
║              records                   ║
╚════════════════════════════════════════╝
    `.trim();
  };

  const generateMerchantReceipt = (transaction) => {
    return `
╔════════════════════════════════════════╗
║              MERCHANT COPY             ║
╚════════════════════════════════════════╝

Transaction ID: ${transaction.id}
Date/Time: ${new Date(transaction.timestamp).toLocaleString()}
Type: ${transaction.type}
Amount: ${transaction.financial.amountFormatted}

Status: ${transaction.status}
Response Code: ${transaction.response.responseCode}
${transaction.response.responseMessage || ''}

Payment Details:
${transaction.response.approvalCode ? `Approval Code: ${transaction.response.approvalCode}` : ''}
${transaction.response.receiptNumber ? `Receipt #: ${transaction.response.receiptNumber}` : ''}
${transaction.response.cardNumber ? `Card: ${transaction.response.cardNumber}` : ''}
${transaction.response.cardType ? `Card Type: ${transaction.response.cardType}` : ''}
${transaction.response.expiryDate ? `Expiry: ${transaction.response.expiryDate}` : ''}

Terminal Information:
Merchant ID: ${transaction.response.merchantId || 'N/A'}
Terminal ID: ${transaction.response.terminalId || 'N/A'}
Batch #: ${transaction.response.batchNumber || 'N/A'}
Trace #: ${transaction.request.traceNumber || 'N/A'}

Processing Time: ${transaction.response.processingTime || 0}ms
Connection: ${transaction.request.connectionType || 'Unknown'}

╔════════════════════════════════════════╗
║            MERCHANT RECORD             ║
╚════════════════════════════════════════╝
    `.trim();
  };

  const generatePOSReceipt = (transaction) => {
    return `
════════════════════════════════════════
              POS RECEIPT
════════════════════════════════════════

TXN: ${transaction.id}
DATE: ${new Date(transaction.timestamp).toLocaleDateString()}
TIME: ${new Date(transaction.timestamp).toLocaleTimeString()}

TRANSACTION TYPE: ${transaction.type}
AMOUNT: ${transaction.financial.amountFormatted}

STATUS: ${transaction.status}
${transaction.response.responseCode ? `CODE: ${transaction.response.responseCode}` : ''}
${transaction.response.approvalCode ? `AUTH: ${transaction.response.approvalCode}` : ''}

${transaction.response.cardNumber ? `CARD: ${transaction.response.cardNumber}` : ''}
${transaction.response.cardType ? `TYPE: ${transaction.response.cardType}` : ''}

MID: ${transaction.response.merchantId || 'N/A'}
TID: ${transaction.response.terminalId || 'N/A'}
BATCH: ${transaction.response.batchNumber || 'N/A'}

────────────────────────────────────────
          TRANSACTION COMPLETE
════════════════════════════════════════
    `.trim();
  };

  const viewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const shareReceipt = async (receiptText, receiptType) => {
    try {
      await Share.share({
        message: receiptText,
        title: `${receiptType} Receipt - ${selectedReceipt.transactionId}`,
      });
    } catch (error) {
      showError('Share Error', 'Failed to share receipt');
    }
  };

  const printReceipt = async (receiptText, receiptType) => {
    if (!printerService) {
      showError('Printer Not Available', 'No printer service available. Please connect a printer first.');
      return;
    }

    const connectionStatus = printerService.getConnectionStatus();
    if (!connectionStatus.isConnected) {
      showError('Printer Not Connected', 'Please connect to a printer before printing.');
      return;
    }

    setIsPrinting(true);
    try {
      console.log('Printing receipt:', receiptType);
      
      // Print the receipt text
      const result = await printerService.printText(receiptText, {
        align: 'left',
        fontSize: 'small'
      });

      if (result && result.success) {
        showSuccess('Print Successful', `${receiptType} receipt printed successfully`);
      } else {
        showError('Print Failed', result?.error || 'Failed to print receipt');
      }
    } catch (error) {
      console.error('Print error:', error);
      showError('Print Error', error.message || 'Failed to print receipt');
    } finally {
      setIsPrinting(false);
    }
  };

  const exportAllReceipts = async () => {
    try {
      const exportData = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          totalReceipts: receipts.length,
          version: '1.0.0'
        },
        receipts: receipts.map(receipt => ({
          transactionId: receipt.transactionId,
          timestamp: receipt.timestamp,
          type: receipt.type,
          amount: receipt.amount,
          status: receipt.status,
          customerReceipt: receipt.customerReceipt,
          merchantReceipt: receipt.merchantReceipt,
          posReceipt: receipt.posReceipt,
        }))
      };

      await Share.share({
        message: JSON.stringify(exportData, null, 2),
        title: 'All Receipts Export',
      });

      showSuccess('Export Complete', `Exported ${receipts.length} receipts`);
    } catch (error) {
      showError('Export Error', 'Failed to export receipts');
    }
  };

  const renderReceiptItem = ({ item }) => (
    <TouchableOpacity onPress={() => viewReceipt(item)} activeOpacity={0.7}>
      <Card style={styles.receiptCard}>
        <Card.Content>
          <View style={styles.receiptHeader}>
            <View style={styles.receiptInfo}>
              <Text style={styles.transactionId}>
                {item.transactionId.substring(0, 12)}...
              </Text>
              <Text style={styles.receiptDate}>
                {new Date(item.timestamp).toLocaleDateString()}
              </Text>
              <Text style={styles.receiptTime}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </Text>
            </View>
            <View style={styles.receiptDetails}>
              <Chip
                style={[styles.statusChip, { 
                  backgroundColor: item.status === 'APPROVED' ? '#4CAF50' : 
                                  item.status === 'DECLINED' ? '#FF9800' : '#f44336' 
                }]}
                textStyle={{ color: 'white', fontSize: 12 }}
              >
                {item.status}
              </Chip>
              <Text style={styles.amount}>{item.amount}</Text>
              <Text style={styles.type}>{item.type}</Text>
            </View>
          </View>
        </Card.Content>
        <Card.Actions>
          <Button 
            mode="outlined" 
            onPress={(e) => { e.stopPropagation(); viewReceipt(item); }}
            compact
          >
            View Receipt
          </Button>
        </Card.Actions>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Receipt Viewer</Title>
      
      {/* Search and Filter */}
      <View style={styles.controls}>
        <Searchbar
          placeholder="Search receipts..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {receiptTypes.map(type => (
            <Chip
              key={type.key}
              selected={filterType === type.key}
              onPress={() => setFilterType(type.key)}
              style={[styles.filterChip, {
                backgroundColor: filterType === type.key ? type.color : 'transparent'
              }]}
              textStyle={{
                color: filterType === type.key ? 'white' : type.color
              }}
            >
              {type.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Receipts List */}
      <FlatList
        data={filteredReceipts}
        keyExtractor={(item) => item.id}
        renderItem={renderReceiptItem}
        style={styles.receiptsList}
        contentContainerStyle={styles.receiptsListContent}
        refreshing={isLoading}
        onRefresh={loadReceipts}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No receipts found</Text>
            <Text style={styles.emptySubtext}>
              Complete some transactions to see receipts here
            </Text>
          </View>
        }
      />

      {/* Export FAB */}
      {receipts.length > 0 && (
        <FAB
          style={styles.exportFab}
          icon="export"
          onPress={exportAllReceipts}
          label="Export All"
        />
      )}

      {/* Receipt Detail Modal */}
      <Modal
        visible={showReceiptModal}
        animationType="slide"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Title>Receipt Details</Title>
            <IconButton
              icon="close"
              onPress={() => setShowReceiptModal(false)}
            />
          </View>

          {selectedReceipt && (
            <ScrollView style={styles.modalContent}>
              {/* Print Button at the Top */}
              <Button
                mode="contained"
                onPress={() => printReceipt(selectedReceipt.customerReceipt, 'Customer')}
                style={styles.primaryPrintButton}
                icon="printer"
                loading={isPrinting}
                disabled={isPrinting}
              >
                Print Receipt
              </Button>

              {/* Receipt Preview */}
              <Card style={styles.receiptPreview}>
                <Card.Content>
                  <Text style={styles.receiptText}>
                    {selectedReceipt.customerReceipt}
                  </Text>
                </Card.Content>
              </Card>

              {/* Bottom Action Buttons */}
              <View style={styles.bottomActions}>
                <Button
                  mode="outlined"
                  onPress={() => shareReceipt(selectedReceipt.customerReceipt, 'Customer')}
                  style={styles.actionButton}
                  icon="share"
                >
                  Share
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={() => printReceipt(selectedReceipt.merchantReceipt, 'Merchant')}
                  style={styles.actionButton}
                  icon="printer"
                  loading={isPrinting}
                  disabled={isPrinting}
                >
                  Print Merchant
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={() => printReceipt(selectedReceipt.posReceipt, 'POS')}
                  style={styles.actionButton}
                  icon="printer"
                  loading={isPrinting}
                  disabled={isPrinting}
                >
                  Print POS
                </Button>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
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
  controls: {
    marginBottom: 16,
  },
  searchbar: {
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  receiptsList: {
    flex: 1,
  },
  receiptsListContent: {
    paddingBottom: 80,
  },
  receiptCard: {
    marginBottom: 12,
    elevation: 2,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptInfo: {
    flex: 1,
  },
  receiptDetails: {
    alignItems: 'flex-end',
  },
  transactionId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  receiptDate: {
    fontSize: 12,
    color: '#666',
  },
  receiptTime: {
    fontSize: 12,
    color: '#666',
  },
  statusChip: {
    marginBottom: 4,
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
  primaryPrintButton: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  receiptPreview: {
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  receiptText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
    color: '#333',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
    marginHorizontal: 2,
  },
});

export default ReceiptViewer;
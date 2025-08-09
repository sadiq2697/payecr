import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Clipboard
} from 'react-native';
import { Card, Title, Divider, Chip, Button } from 'react-native-paper';
import { LRCCalculator } from '../services/LRCCalculator';

const ResponseDisplay = ({ response, onClear }) => {
  const [showRawData, setShowRawData] = useState(false);
  
  if (!response) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title>Transaction Response</Title>
          <Text style={styles.noDataText}>No response data available</Text>
        </Card.Content>
      </Card>
    );
  }
  
  const copyToClipboard = (text) => {
    Clipboard.setString(text);
  };
  
  const getStatusColor = () => {
    if (!response.success) return '#f44336';
    if (response.isApproved) return '#4caf50';
    return '#ff9800';
  };
  
  const renderStatusSection = () => (
    <View style={styles.statusSection}>
      <View style={styles.statusRow}>
        <Chip
          style={[styles.statusChip, { backgroundColor: getStatusColor() }]}
          textStyle={{ color: 'white' }}
        >
          {response.success ? (response.isApproved ? 'APPROVED' : 'DECLINED') : 'ERROR'}
        </Chip>
        
        {response.transactionType && (
          <Chip style={styles.typeChip}>
            {response.transactionType}
          </Chip>
        )}
      </View>
      
      {response.statusDescription && (
        <Text style={styles.statusDescription}>
          {response.statusDescription}
        </Text>
      )}
      
      {response.error && (
        <Text style={styles.errorText}>
          Error: {response.error}
        </Text>
      )}
    </View>
  );
  
  const renderTransactionDetails = () => {
    if (!response.success || response.error) return null;
    
    const details = [];
    
    // Common fields
    if (response.cardNumber) {
      details.push({ label: 'Card Number', value: response.cardNumber });
    }
    if (response.expiryDate) {
      details.push({ label: 'Expiry Date', value: response.expiryDate });
    }
    if (response.cardholderName) {
      details.push({ label: 'Cardholder Name', value: response.cardholderName });
    }
    if (response.cardType) {
      details.push({ label: 'Card Type', value: response.cardType });
    }
    if (response.approvalCode) {
      details.push({ label: 'Approval Code', value: response.approvalCode });
    }
    if (response.rrn) {
      details.push({ label: 'RRN', value: response.rrn });
    }
    if (response.transactionTrace) {
      details.push({ label: 'Trace Number', value: response.transactionTrace });
    }
    if (response.batchNumber) {
      details.push({ label: 'Batch Number', value: response.batchNumber });
    }
    if (response.hostNo) {
      details.push({ label: 'Host Number', value: response.hostNo });
    }
    if (response.terminalId) {
      details.push({ label: 'Terminal ID', value: response.terminalId });
    }
    if (response.merchantId) {
      details.push({ label: 'Merchant ID', value: response.merchantId });
    }
    
    // EMV fields
    if (response.aid) {
      details.push({ label: 'AID', value: response.aid });
    }
    if (response.tc) {
      details.push({ label: 'Transaction Cryptogram', value: response.tc });
    }
    if (response.cardAppLabel) {
      details.push({ label: 'Card App Label', value: response.cardAppLabel });
    }
    if (response.tvr) {
      details.push({ label: 'TVR', value: response.tvr });
    }
    if (response.tsi) {
      details.push({ label: 'TSI', value: response.tsi });
    }
    
    // Settlement fields
    if (response.batchCount) {
      details.push({ label: 'Batch Count', value: response.batchCount });
    }
    if (response.batchAmount) {
      details.push({ label: 'Batch Amount', value: response.batchAmount });
    }
    
    // Wallet fields
    if (response.partnerTrxId) {
      details.push({ label: 'Partner Transaction ID', value: response.partnerTrxId });
    }
    if (response.alipayTrxId) {
      details.push({ label: 'Alipay Transaction ID', value: response.alipayTrxId });
    }
    if (response.customerId) {
      details.push({ label: 'Customer ID', value: response.customerId });
    }
    
    // Amount fields
    if (response.amount) {
      const formattedAmount = (parseInt(response.amount) / 100).toFixed(2);
      details.push({ label: 'Amount', value: `RM ${formattedAmount}` });
    }
    
    if (details.length === 0) return null;
    
    return (
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Transaction Details</Text>
        {details.map((detail, index) => (
          <View key={index} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{detail.label}:</Text>
            <Text style={styles.detailValue} selectable>
              {detail.value}
            </Text>
          </View>
        ))}
      </View>
    );
  };
  
  const renderRawDataSection = () => {
    if (!response.rawData) return null;
    
    return (
      <View style={styles.rawDataSection}>
        <View style={styles.rawDataHeader}>
          <Text style={styles.sectionTitle}>Raw Data</Text>
          <Button
            mode="outlined"
            compact
            onPress={() => setShowRawData(!showRawData)}
          >
            {showRawData ? 'Hide' : 'Show'}
          </Button>
        </View>
        
        {showRawData && (
          <View>
            <TouchableOpacity
              style={styles.rawDataContainer}
              onPress={() => copyToClipboard(response.rawData)}
            >
              <Text style={styles.rawDataText} selectable>
                {response.rawData}
              </Text>
            </TouchableOpacity>
            
            {response.hexData && (
              <TouchableOpacity
                style={styles.hexDataContainer}
                onPress={() => copyToClipboard(response.hexData)}
              >
                <Text style={styles.hexDataLabel}>Hex:</Text>
                <Text style={styles.hexDataText} selectable>
                  {response.hexData}
                </Text>
              </TouchableOpacity>
            )}
            
            {!response.hexData && response.rawData && (
              <TouchableOpacity
                style={styles.hexDataContainer}
                onPress={() => copyToClipboard(LRCCalculator.stringToHex(response.rawData))}
              >
                <Text style={styles.hexDataLabel}>Hex:</Text>
                <Text style={styles.hexDataText} selectable>
                  {LRCCalculator.stringToHex(response.rawData)}
                </Text>
              </TouchableOpacity>
            )}
            
            <Text style={styles.copyHint}>Tap to copy</Text>
          </View>
        )}
      </View>
    );
  };
  
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Title>Transaction Response</Title>
          {onClear && (
            <Button mode="outlined" compact onPress={onClear}>
              Clear
            </Button>
          )}
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderStatusSection()}
          
          <Divider style={styles.divider} />
          
          {renderTransactionDetails()}
          
          {response.rawData && (
            <>
              <Divider style={styles.divider} />
              {renderRawDataSection()}
            </>
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
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
  statusSection: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusChip: {
    marginRight: 8,
  },
  typeChip: {
    backgroundColor: '#e0e0e0',
  },
  statusDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
  },
  divider: {
    marginVertical: 16,
  },
  detailsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 120,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: 'monospace',
  },
  rawDataSection: {
    marginBottom: 16,
  },
  rawDataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rawDataContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  rawDataText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  hexDataContainer: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  hexDataLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  hexDataText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#2e7d32',
    lineHeight: 16,
  },
  copyHint: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ResponseDisplay;


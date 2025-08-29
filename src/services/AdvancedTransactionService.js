import AsyncStorage from '@react-native-async-storage/async-storage';
import { ECR_CONSTANTS } from '../utils/Constants';

/**
 * Advanced Transaction Service for split payments and partial refunds
 */
class AdvancedTransactionService {
  constructor(ecrService) {
    this.ecrService = ecrService;
    this.activeTransactions = new Map();
  }

  /**
   * Process split payment across multiple methods
   */
  async processSplitPayment(splitConfig) {
    const { totalAmount, payments, reference, additionalData } = splitConfig;
    
    // Validate split payment configuration
    const validationResult = this.validateSplitPayment(splitConfig);
    if (!validationResult.isValid) {
      throw new Error(`Split payment validation failed: ${validationResult.error}`);
    }

    const transactionId = this.generateTransactionId();
    const splitTransaction = {
      id: transactionId,
      type: 'split_payment',
      totalAmount,
      payments: [],
      status: 'processing',
      createdAt: Date.now(),
      reference,
      additionalData,
    };

    try {
      // Store transaction for tracking
      this.activeTransactions.set(transactionId, splitTransaction);

      console.log(`Starting split payment: ${transactionId}`);
      console.log(`Total amount: RM ${(totalAmount / 100).toFixed(2)}`);

      // Process each payment method sequentially
      for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];
        console.log(`Processing payment ${i + 1}/${payments.length}: ${payment.method} - RM ${(payment.amount / 100).toFixed(2)}`);

        try {
          const paymentResult = await this.processIndividualPayment(payment, transactionId, i + 1);
          
          splitTransaction.payments.push({
            ...payment,
            result: paymentResult,
            status: paymentResult.success ? 'completed' : 'failed',
            processedAt: Date.now(),
          });

          // If payment failed, handle the failure
          if (!paymentResult.success) {
            await this.handleSplitPaymentFailure(splitTransaction, i);
            throw new Error(`Payment ${i + 1} failed: ${paymentResult.error}`);
          }

        } catch (error) {
          splitTransaction.payments.push({
            ...payment,
            error: error.message,
            status: 'failed',
            processedAt: Date.now(),
          });
          throw error;
        }
      }

      // All payments successful
      splitTransaction.status = 'completed';
      splitTransaction.completedAt = Date.now();

      // Save transaction record
      await this.saveTransactionRecord(splitTransaction);

      // Remove from active transactions
      this.activeTransactions.delete(transactionId);

      return {
        success: true,
        transactionId,
        totalAmount,
        payments: splitTransaction.payments,
        completedAt: splitTransaction.completedAt,
        message: 'Split payment completed successfully',
      };

    } catch (error) {
      splitTransaction.status = 'failed';
      splitTransaction.error = error.message;
      splitTransaction.failedAt = Date.now();

      // Save failed transaction for audit
      await this.saveTransactionRecord(splitTransaction);
      this.activeTransactions.delete(transactionId);

      return {
        success: false,
        transactionId,
        error: error.message,
        payments: splitTransaction.payments,
        failedAt: splitTransaction.failedAt,
      };
    }
  }

  /**
   * Process individual payment within split payment
   */
  async processIndividualPayment(payment, parentTransactionId, paymentIndex) {
    const { method, amount, hostNo, additionalData } = payment;

    try {
      let result;

      switch (method.toLowerCase()) {
        case 'card':
          result = await this.ecrService.performSale({
            hostNo: hostNo || 'CP',
            amount,
            additionalData: `Split ${paymentIndex}/${parentTransactionId.slice(-6)} - ${additionalData || ''}`,
            printReceipt: paymentIndex === 1, // Print receipt for first payment only
          });
          break;

        case 'ewallet':
        case 'e-wallet':
          if (!payment.qrCode) {
            throw new Error('QR code required for e-wallet payment');
          }
          result = await this.ecrService.performWalletSale({
            hostNo: hostNo || '00',
            amount,
            qrCodeId: ECR_CONSTANTS.QR_CODE_IDS?.EWALLET || '03',
            qrCode: payment.qrCode,
            additionalData: `Split ${paymentIndex}/${parentTransactionId.slice(-6)} - ${additionalData || ''}`,
            printReceipt: false,
          });
          break;

        case 'duitnow':
          result = await this.ecrService.performSale({
            hostNo: hostNo || 'DN',
            amount,
            additionalData: `Split ${paymentIndex}/${parentTransactionId.slice(-6)} - ${additionalData || ''}`,
            printReceipt: false,
          });
          break;

        default:
          throw new Error(`Unsupported payment method: ${method}`);
      }

      return {
        success: result.success,
        method,
        amount,
        isApproved: result.isApproved,
        approvalCode: result.approvalCode,
        transactionTrace: result.transactionTrace,
        rrn: result.rrn,
        statusDescription: result.statusDescription,
        rawResponse: result,
      };

    } catch (error) {
      return {
        success: false,
        method,
        amount,
        error: error.message,
        isApproved: false,
      };
    }
  }

  /**
   * Validate split payment configuration
   */
  validateSplitPayment(splitConfig) {
    const { totalAmount, payments } = splitConfig;

    if (!totalAmount || totalAmount <= 0) {
      return { isValid: false, error: 'Total amount must be greater than 0' };
    }

    if (!payments || !Array.isArray(payments) || payments.length < 2) {
      return { isValid: false, error: 'At least 2 payment methods required for split payment' };
    }

    if (payments.length > 5) {
      return { isValid: false, error: 'Maximum 5 payment methods allowed' };
    }

    // Check total amounts match
    const paymentSum = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    if (paymentSum !== totalAmount) {
      return { 
        isValid: false, 
        error: `Payment amounts (${paymentSum}) don't match total amount (${totalAmount})` 
      };
    }

    // Validate each payment
    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      
      if (!payment.method) {
        return { isValid: false, error: `Payment ${i + 1}: method is required` };
      }

      if (!payment.amount || payment.amount <= 0) {
        return { isValid: false, error: `Payment ${i + 1}: amount must be greater than 0` };
      }

      if (payment.method.toLowerCase() === 'ewallet' && !payment.qrCode) {
        return { isValid: false, error: `Payment ${i + 1}: QR code required for e-wallet` };
      }
    }

    return { isValid: true };
  }

  /**
   * Handle split payment failure - attempt to reverse successful payments
   */
  async handleSplitPaymentFailure(splitTransaction, failedIndex) {
    console.log(`Split payment failed at payment ${failedIndex + 1}, attempting reversals...`);

    // Reverse successful payments in reverse order
    for (let i = failedIndex - 1; i >= 0; i--) {
      const payment = splitTransaction.payments[i];
      if (payment.status === 'completed' && payment.result?.isApproved) {
        try {
          console.log(`Reversing payment ${i + 1}...`);
          
          const reversalResult = await this.ecrService.performVoid({
            hostNo: payment.result.hostNo || '00',
            amount: payment.amount,
            traceNumber: payment.result.transactionTrace,
            additionalData: `Reversal: Split payment failed`,
          });

          payment.reversal = {
            attempted: true,
            success: reversalResult.success,
            result: reversalResult,
            timestamp: Date.now(),
          };

          if (reversalResult.success) {
            console.log(`Payment ${i + 1} reversed successfully`);
          } else {
            console.error(`Failed to reverse payment ${i + 1}:`, reversalResult.error);
          }

        } catch (error) {
          console.error(`Error reversing payment ${i + 1}:`, error);
          payment.reversal = {
            attempted: true,
            success: false,
            error: error.message,
            timestamp: Date.now(),
          };
        }
      }
    }
  }

  /**
   * Process partial refund with original transaction reference
   */
  async processPartialRefund(refundConfig) {
    const { 
      originalTransactionId, 
      originalAmount, 
      refundAmount, 
      reason, 
      hostNo,
      additionalData 
    } = refundConfig;

    // Validate partial refund configuration
    const validationResult = this.validatePartialRefund(refundConfig);
    if (!validationResult.isValid) {
      throw new Error(`Partial refund validation failed: ${validationResult.error}`);
    }

    const refundTransactionId = this.generateTransactionId();

    try {
      console.log(`Processing partial refund: ${refundTransactionId}`);
      console.log(`Original: RM ${(originalAmount / 100).toFixed(2)}, Refund: RM ${(refundAmount / 100).toFixed(2)}`);

      // Attempt to retrieve original transaction details
      const originalTransaction = await this.getOriginalTransaction(originalTransactionId);

      // Process the refund
      const result = await this.ecrService.performRefund({
        hostNo: hostNo || '00',
        amount: refundAmount,
        originalAmount: originalAmount,
        additionalData: `Partial refund: ${reason || 'Customer request'} - ${additionalData || ''}`,
        printReceipt: true,
      });

      const refundRecord = {
        id: refundTransactionId,
        type: 'partial_refund',
        originalTransactionId,
        originalAmount,
        refundAmount,
        reason,
        result,
        createdAt: Date.now(),
        status: result.success ? 'completed' : 'failed',
      };

      // Save refund record
      await this.saveTransactionRecord(refundRecord);

      // Update original transaction with refund reference
      if (originalTransaction) {
        await this.updateTransactionWithRefund(originalTransactionId, refundRecord);
      }

      return {
        success: result.success,
        refundTransactionId,
        originalTransactionId,
        refundAmount,
        originalAmount,
        remainingAmount: originalAmount - refundAmount,
        isApproved: result.isApproved,
        approvalCode: result.approvalCode,
        transactionTrace: result.transactionTrace,
        rrn: result.rrn,
        statusDescription: result.statusDescription,
        message: result.success ? 'Partial refund processed successfully' : 'Partial refund failed',
        rawResponse: result,
      };

    } catch (error) {
      console.error('Partial refund error:', error);
      
      // Save failed refund record
      const failedRefundRecord = {
        id: refundTransactionId,
        type: 'partial_refund',
        originalTransactionId,
        originalAmount,
        refundAmount,
        reason,
        error: error.message,
        createdAt: Date.now(),
        status: 'failed',
      };
      
      await this.saveTransactionRecord(failedRefundRecord);

      return {
        success: false,
        refundTransactionId,
        originalTransactionId,
        error: error.message,
      };
    }
  }

  /**
   * Validate partial refund configuration
   */
  validatePartialRefund(refundConfig) {
    const { originalTransactionId, originalAmount, refundAmount } = refundConfig;

    if (!originalTransactionId) {
      return { isValid: false, error: 'Original transaction ID is required' };
    }

    if (!originalAmount || originalAmount <= 0) {
      return { isValid: false, error: 'Original amount must be greater than 0' };
    }

    if (!refundAmount || refundAmount <= 0) {
      return { isValid: false, error: 'Refund amount must be greater than 0' };
    }

    if (refundAmount >= originalAmount) {
      return { isValid: false, error: 'Refund amount must be less than original amount for partial refund' };
    }

    return { isValid: true };
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN${timestamp}${random}`.toUpperCase();
  }

  /**
   * Save transaction record to persistent storage
   */
  async saveTransactionRecord(transaction) {
    try {
      const key = `advanced_transaction_${transaction.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(transaction));
      
      // Also add to transaction history index
      await this.addToTransactionHistory(transaction);
    } catch (error) {
      console.error('Failed to save transaction record:', error);
    }
  }

  /**
   * Add transaction to history index
   */
  async addToTransactionHistory(transaction) {
    try {
      const historyKey = 'advanced_transaction_history';
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];

      const historyEntry = {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.type === 'split_payment' ? transaction.totalAmount : transaction.refundAmount,
        status: transaction.status,
        createdAt: transaction.createdAt,
      };

      history.unshift(historyEntry); // Add to beginning
      
      // Keep only last 1000 entries
      const trimmedHistory = history.slice(0, 1000);
      
      await AsyncStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Failed to update transaction history:', error);
    }
  }

  /**
   * Get original transaction details
   */
  async getOriginalTransaction(transactionId) {
    try {
      const key = `advanced_transaction_${transactionId}`;
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get original transaction:', error);
      return null;
    }
  }

  /**
   * Update original transaction with refund reference
   */
  async updateTransactionWithRefund(originalTransactionId, refundRecord) {
    try {
      const originalTransaction = await this.getOriginalTransaction(originalTransactionId);
      if (originalTransaction) {
        if (!originalTransaction.refunds) {
          originalTransaction.refunds = [];
        }
        
        originalTransaction.refunds.push({
          id: refundRecord.id,
          amount: refundRecord.refundAmount,
          reason: refundRecord.reason,
          createdAt: refundRecord.createdAt,
          status: refundRecord.status,
        });

        await this.saveTransactionRecord(originalTransaction);
      }
    } catch (error) {
      console.error('Failed to update original transaction with refund:', error);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit = 50) {
    try {
      const historyKey = 'advanced_transaction_history';
      const stored = await AsyncStorage.getItem(historyKey);
      const history = stored ? JSON.parse(stored) : [];
      
      return history.slice(0, limit);
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  /**
   * Get transaction details by ID
   */
  async getTransactionDetails(transactionId) {
    try {
      const key = `advanced_transaction_${transactionId}`;
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get transaction details:', error);
      return null;
    }
  }

  /**
   * Get active split payment status
   */
  getActiveTransactions() {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * Cancel active split payment
   */
  async cancelSplitPayment(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found or already completed');
    }

    // Attempt to reverse any completed payments
    await this.handleSplitPaymentFailure(transaction, transaction.payments.length);

    transaction.status = 'cancelled';
    transaction.cancelledAt = Date.now();

    await this.saveTransactionRecord(transaction);
    this.activeTransactions.delete(transactionId);

    return {
      success: true,
      transactionId,
      message: 'Split payment cancelled and reversed',
    };
  }
}

export default AdvancedTransactionService;
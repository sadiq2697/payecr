import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import TransactionRecorder from '../services/TransactionRecorder';

interface TransactionContextType {
  transactionRecorder: TransactionRecorder | null;
  transactions: any[];
  transactionStats: any | null;
  refreshTransactions: () => Promise<void>;
  recordTransaction: (transactionData: any, response: any, additionalData?: any) => Promise<any>;
  clearTransactions: () => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const transactionRecorderRef = useRef<TransactionRecorder | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionStats, setTransactionStats] = useState<any | null>(null);

  // Initialize TransactionRecorder once
  useEffect(() => {
    if (!transactionRecorderRef.current) {
      try {
        console.log('[TransactionContext] Initializing TransactionRecorder...');
        transactionRecorderRef.current = new TransactionRecorder();
        console.log('[TransactionContext] TransactionRecorder initialized successfully');

        // Load initial transactions
        refreshTransactions();
      } catch (error) {
        console.error('[TransactionContext] Failed to initialize TransactionRecorder:', error);
      }
    }
  }, []);

  const refreshTransactions = async () => {
    if (transactionRecorderRef.current) {
      try {
        const history = await transactionRecorderRef.current.getAllTransactions();
        const stats = await transactionRecorderRef.current.getTransactionStats();
        setTransactions(history);
        setTransactionStats(stats);
      } catch (error) {
        console.error('[TransactionContext] Failed to refresh transactions:', error);
      }
    }
  };

  const recordTransaction = async (transactionData: any, response: any, additionalData?: any) => {
    if (transactionRecorderRef.current) {
      try {
        const result = await transactionRecorderRef.current.recordTransaction(
          transactionData,
          response,
          additionalData
        );
        await refreshTransactions(); // Refresh after recording
        return result;
      } catch (error) {
        console.error('[TransactionContext] Failed to record transaction:', error);
        throw error;
      }
    }
  };

  const clearTransactions = async () => {
    if (transactionRecorderRef.current) {
      try {
        // Clear by setting empty array
        await transactionRecorderRef.current.storeTransactionRecord([]);
        await refreshTransactions(); // Refresh after clearing
      } catch (error) {
        console.error('[TransactionContext] Failed to clear transactions:', error);
        throw error;
      }
    }
  };

  const value: TransactionContextType = {
    transactionRecorder: transactionRecorderRef.current,
    transactions,
    transactionStats,
    refreshTransactions,
    recordTransaction,
    clearTransactions,
  };

  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
};

export const useTransaction = (): TransactionContextType => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransaction must be used within a TransactionProvider');
  }
  return context;
};

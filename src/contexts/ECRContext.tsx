import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import ECRService from '../services/ECRService';

interface ECRContextType {
  ecrService: ECRService | null;
  isConnected: boolean;
  connectionType: string | null;
  autoReconnectEnabled: boolean;
  communicationLog: any[];
  currentTransaction: any | null;
  setAutoReconnectEnabled: (enabled: boolean) => void;
  refreshConnectionStatus: () => void;
}

const ECRContext = createContext<ECRContextType | undefined>(undefined);

interface ECRProviderProps {
  children: ReactNode;
}

export const ECRProvider: React.FC<ECRProviderProps> = ({ children }) => {
  const ecrServiceRef = useRef<ECRService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [autoReconnectEnabled, setAutoReconnectEnabled] = useState(false);
  const [communicationLog, setCommunicationLog] = useState<any[]>([]);
  const [currentTransaction, setCurrentTransaction] = useState<any | null>(null);

  // Initialize ECRService once
  useEffect(() => {
    if (!ecrServiceRef.current) {
      try {
        console.log('[ECRContext] Initializing ECRService...');
        ecrServiceRef.current = new ECRService();

        // Set up event listeners for connection state changes
        const updateConnectionStatus = () => {
          if (ecrServiceRef.current) {
            setIsConnected(ecrServiceRef.current.isConnected);
            setConnectionType(ecrServiceRef.current.connectionType);
            setAutoReconnectEnabled(ecrServiceRef.current.autoReconnectEnabled);
            setCommunicationLog([...ecrServiceRef.current.communicationLog]);
            setCurrentTransaction(ecrServiceRef.current.currentTransaction);
          }
        };

        // Poll for updates (since ECRService uses custom event emitter)
        const statusInterval = setInterval(updateConnectionStatus, 1000);

        // Initial update
        updateConnectionStatus();

        console.log('[ECRContext] ECRService initialized successfully');

        return () => {
          clearInterval(statusInterval);
        };
      } catch (error) {
        console.error('[ECRContext] Failed to initialize ECRService:', error);
      }
    }
  }, []);

  const refreshConnectionStatus = () => {
    if (ecrServiceRef.current) {
      setIsConnected(ecrServiceRef.current.isConnected);
      setConnectionType(ecrServiceRef.current.connectionType);
      setAutoReconnectEnabled(ecrServiceRef.current.autoReconnectEnabled);
      setCommunicationLog([...ecrServiceRef.current.communicationLog]);
      setCurrentTransaction(ecrServiceRef.current.currentTransaction);
    }
  };

  const value: ECRContextType = {
    ecrService: ecrServiceRef.current,
    isConnected,
    connectionType,
    autoReconnectEnabled,
    communicationLog,
    currentTransaction,
    setAutoReconnectEnabled: (enabled: boolean) => {
      if (ecrServiceRef.current) {
        ecrServiceRef.current.autoReconnectEnabled = enabled;
        setAutoReconnectEnabled(enabled);
      }
    },
    refreshConnectionStatus,
  };

  return <ECRContext.Provider value={value}>{children}</ECRContext.Provider>;
};

export const useECR = (): ECRContextType => {
  const context = useContext(ECRContext);
  if (context === undefined) {
    throw new Error('useECR must be used within an ECRProvider');
  }
  return context;
};

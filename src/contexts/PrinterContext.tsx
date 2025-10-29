import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import PrinterService from '../services/PrinterService';

interface PrinterContextType {
  printerService: PrinterService | null;
  isConnected: boolean;
  connectionType: string | null;
  deviceInfo: any | null;
  connectionStatus: any;
  refreshPrinterStatus: () => void;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

interface PrinterProviderProps {
  children: ReactNode;
}

export const PrinterProvider: React.FC<PrinterProviderProps> = ({ children }) => {
  const printerServiceRef = useRef<PrinterService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>({
    isConnected: false,
    lastConnectedDevice: null,
    connectionType: null,
    lastError: null,
  });

  // Initialize PrinterService once
  useEffect(() => {
    if (!printerServiceRef.current) {
      try {
        console.log('[PrinterContext] Initializing PrinterService...');
        printerServiceRef.current = new PrinterService();

        // Set up event listeners
        const updatePrinterStatus = () => {
          if (printerServiceRef.current) {
            setIsConnected(printerServiceRef.current.isConnected);
            setConnectionType(printerServiceRef.current.connectionType);
            setDeviceInfo(printerServiceRef.current.deviceInfo);
            setConnectionStatus({ ...printerServiceRef.current.connectionStatus });
          }
        };

        // Set up printer event listeners
        if (printerServiceRef.current.on) {
          printerServiceRef.current.on('printerConnected', updatePrinterStatus);
          printerServiceRef.current.on('printerDisconnected', updatePrinterStatus);
          printerServiceRef.current.on('printerError', updatePrinterStatus);
        }

        // Poll for updates
        const statusInterval = setInterval(updatePrinterStatus, 1000);

        // Initial update
        updatePrinterStatus();

        console.log('[PrinterContext] PrinterService initialized successfully');

        return () => {
          clearInterval(statusInterval);
        };
      } catch (error) {
        console.error('[PrinterContext] Failed to initialize PrinterService:', error);
      }
    }
  }, []);

  const refreshPrinterStatus = () => {
    if (printerServiceRef.current) {
      setIsConnected(printerServiceRef.current.isConnected);
      setConnectionType(printerServiceRef.current.connectionType);
      setDeviceInfo(printerServiceRef.current.deviceInfo);
      setConnectionStatus({ ...printerServiceRef.current.connectionStatus });
    }
  };

  const value: PrinterContextType = {
    printerService: printerServiceRef.current,
    isConnected,
    connectionType,
    deviceInfo,
    connectionStatus,
    refreshPrinterStatus,
  };

  return <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>;
};

export const usePrinter = (): PrinterContextType => {
  const context = useContext(PrinterContext);
  if (context === undefined) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
};

import React, { ReactNode } from 'react';
import { ECRProvider } from '../contexts/ECRContext';
import { TransactionProvider } from '../contexts/TransactionContext';
import { PrinterProvider } from '../contexts/PrinterContext';
import { ConfigProvider } from '../contexts/ConfigContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * App Providers Wrapper
 * Wraps the application with all necessary context providers
 * This ensures all services are available throughout the app
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ConfigProvider>
      <ECRProvider>
        <TransactionProvider>
          <PrinterProvider>
            {children}
          </PrinterProvider>
        </TransactionProvider>
      </ECRProvider>
    </ConfigProvider>
  );
};

export default AppProviders;

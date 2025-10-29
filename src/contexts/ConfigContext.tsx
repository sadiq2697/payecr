import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import ConfigurationManager from '../services/ConfigurationManager';

interface ConfigContextType {
  configManager: ConfigurationManager | null;
  config: any | null;
  refreshConfig: () => Promise<void>;
  saveConfig: (key: string, value: any) => Promise<void>;
  exportConfig: () => Promise<any>;
  importConfig: (config: any) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const configManagerRef = useRef<ConfigurationManager | null>(null);
  const [config, setConfig] = useState<any | null>(null);

  // Initialize ConfigurationManager once
  useEffect(() => {
    if (!configManagerRef.current) {
      try {
        console.log('[ConfigContext] Initializing ConfigurationManager...');
        configManagerRef.current = new ConfigurationManager();
        console.log('[ConfigContext] ConfigurationManager initialized successfully');

        // Load initial config
        refreshConfig();
      } catch (error) {
        console.error('[ConfigContext] Failed to initialize ConfigurationManager:', error);
      }
    }
  }, []);

  const refreshConfig = async () => {
    if (configManagerRef.current) {
      try {
        const exportedConfig = await configManagerRef.current.getConfiguration();
        setConfig(exportedConfig);
      } catch (error) {
        console.error('[ConfigContext] Failed to refresh config:', error);
      }
    }
  };

  const saveConfig = async (key: string, value: any) => {
    if (configManagerRef.current) {
      try {
        configManagerRef.current.set(key, value);
        await configManagerRef.current.saveConfiguration();
        await refreshConfig(); // Refresh after saving
      } catch (error) {
        console.error('[ConfigContext] Failed to save config:', error);
        throw error;
      }
    }
  };

  const exportConfig = async () => {
    if (configManagerRef.current) {
      try {
        return await configManagerRef.current.getConfiguration();
      } catch (error) {
        console.error('[ConfigContext] Failed to export config:', error);
        throw error;
      }
    }
  };

  const importConfig = async (newConfig: any) => {
    if (configManagerRef.current) {
      try {
        // Import by setting each key
        Object.keys(newConfig).forEach(key => {
          configManagerRef.current?.set(key, newConfig[key]);
        });
        await configManagerRef.current.saveConfiguration();
        await refreshConfig(); // Refresh after importing
      } catch (error) {
        console.error('[ConfigContext] Failed to import config:', error);
        throw error;
      }
    }
  };

  const value: ConfigContextType = {
    configManager: configManagerRef.current,
    config,
    refreshConfig,
    saveConfig,
    exportConfig,
    importConfig,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

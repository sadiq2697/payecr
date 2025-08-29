import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks for terminal operations
export const addTerminal = createAsyncThunk(
  'terminals/add',
  async (terminalData, { rejectWithValue }) => {
    try {
      // Validate terminal configuration
      const terminal = {
        id: Date.now() + Math.random(),
        name: terminalData.name,
        type: terminalData.type, // 'tcp' | 'serial' | 'usb'
        config: terminalData.config,
        isActive: false,
        isOnline: false,
        lastConnected: null,
        transactionCount: 0,
        status: 'disconnected',
        capabilities: terminalData.capabilities || [],
        createdAt: Date.now(),
      };

      // Save to persistent storage
      await AsyncStorage.setItem(`terminal_${terminal.id}`, JSON.stringify(terminal));
      
      return terminal;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeTerminal = createAsyncThunk(
  'terminals/remove',
  async (terminalId, { rejectWithValue }) => {
    try {
      await AsyncStorage.removeItem(`terminal_${terminalId}`);
      return terminalId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const connectToTerminal = createAsyncThunk(
  'terminals/connect',
  async ({ terminalId, ecrService }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const terminal = state.terminals.terminals.find(t => t.id === terminalId);
      
      if (!terminal) {
        throw new Error('Terminal not found');
      }

      // Disconnect from current terminal if connected
      const activeTerminal = state.terminals.activeTerminal;
      if (activeTerminal && activeTerminal.id !== terminalId) {
        await ecrService.disconnect();
      }

      // Connect to new terminal
      let result;
      if (terminal.type === 'tcp') {
        result = await ecrService.connectTCP(terminal.config);
      } else if (terminal.type === 'serial') {
        result = await ecrService.connectSerial(terminal.config);
      } else if (terminal.type === 'usb') {
        result = await ecrService.connectToUSBDevice(terminal.config.deviceId);
      }

      if (!result.success) {
        throw new Error(result.message || 'Connection failed');
      }

      return {
        terminalId,
        connectionData: {
          connectedAt: Date.now(),
          connectionInfo: result,
        },
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadSavedTerminals = createAsyncThunk(
  'terminals/loadSaved',
  async (_, { rejectWithValue }) => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const terminalKeys = keys.filter(key => key.startsWith('terminal_'));
      
      const terminals = [];
      for (const key of terminalKeys) {
        const terminalData = await AsyncStorage.getItem(key);
        if (terminalData) {
          terminals.push(JSON.parse(terminalData));
        }
      }

      return terminals;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  terminals: [],
  activeTerminal: null,
  connectionHistory: [],
  loadBalancing: {
    enabled: false,
    strategy: 'round_robin', // 'round_robin' | 'least_busy' | 'response_time'
    maxConcurrentConnections: 3,
  },
  statistics: {
    totalConnections: 0,
    averageResponseTime: 0,
    successRate: 0,
    failureCount: 0,
  },
  loading: false,
  error: null,
};

const terminalSlice = createSlice({
  name: 'terminals',
  initialState,
  reducers: {
    setActiveTerminal: (state, action) => {
      const terminalId = action.payload;
      const terminal = state.terminals.find(t => t.id === terminalId);
      
      if (terminal) {
        // Deactivate current active terminal
        if (state.activeTerminal) {
          const currentActive = state.terminals.find(t => t.id === state.activeTerminal.id);
          if (currentActive) {
            currentActive.isActive = false;
          }
        }
        
        // Set new active terminal
        terminal.isActive = true;
        state.activeTerminal = terminal;
      }
    },
    
    updateTerminalStatus: (state, action) => {
      const { terminalId, status, isOnline } = action.payload;
      const terminal = state.terminals.find(t => t.id === terminalId);
      
      if (terminal) {
        terminal.status = status;
        terminal.isOnline = isOnline;
        if (status === 'connected') {
          terminal.lastConnected = Date.now();
        }
      }
    },
    
    updateTerminalConfig: (state, action) => {
      const { terminalId, config } = action.payload;
      const terminal = state.terminals.find(t => t.id === terminalId);
      
      if (terminal) {
        terminal.config = { ...terminal.config, ...config };
      }
    },
    
    incrementTransactionCount: (state, action) => {
      const terminalId = action.payload;
      const terminal = state.terminals.find(t => t.id === terminalId);
      
      if (terminal) {
        terminal.transactionCount += 1;
      }
      
      state.statistics.totalConnections += 1;
    },
    
    addConnectionHistory: (state, action) => {
      const historyEntry = {
        id: Date.now() + Math.random(),
        terminalId: action.payload.terminalId,
        terminalName: action.payload.terminalName,
        action: action.payload.action, // 'connect' | 'disconnect' | 'switch'
        timestamp: Date.now(),
        duration: action.payload.duration || 0,
        success: action.payload.success,
        error: action.payload.error || null,
      };
      
      state.connectionHistory.unshift(historyEntry);
      
      // Keep only last 100 entries
      state.connectionHistory = state.connectionHistory.slice(0, 100);
    },
    
    updateLoadBalancingConfig: (state, action) => {
      state.loadBalancing = { ...state.loadBalancing, ...action.payload };
    },
    
    updateStatistics: (state, action) => {
      state.statistics = { ...state.statistics, ...action.payload };
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    resetTerminals: (state) => {
      state.terminals = [];
      state.activeTerminal = null;
      state.connectionHistory = [];
      state.error = null;
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Add Terminal
      .addCase(addTerminal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTerminal.fulfilled, (state, action) => {
        state.loading = false;
        state.terminals.push(action.payload);
      })
      .addCase(addTerminal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Remove Terminal
      .addCase(removeTerminal.fulfilled, (state, action) => {
        const terminalId = action.payload;
        state.terminals = state.terminals.filter(t => t.id !== terminalId);
        
        // Clear active terminal if it was removed
        if (state.activeTerminal && state.activeTerminal.id === terminalId) {
          state.activeTerminal = null;
        }
      })
      .addCase(removeTerminal.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Connect to Terminal
      .addCase(connectToTerminal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(connectToTerminal.fulfilled, (state, action) => {
        state.loading = false;
        const { terminalId, connectionData } = action.payload;
        
        // Update terminal status
        const terminal = state.terminals.find(t => t.id === terminalId);
        if (terminal) {
          terminal.isActive = true;
          terminal.isOnline = true;
          terminal.status = 'connected';
          terminal.lastConnected = connectionData.connectedAt;
          state.activeTerminal = terminal;
        }
      })
      .addCase(connectToTerminal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Load Saved Terminals
      .addCase(loadSavedTerminals.fulfilled, (state, action) => {
        state.terminals = action.payload;
      })
      .addCase(loadSavedTerminals.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  setActiveTerminal,
  updateTerminalStatus,
  updateTerminalConfig,
  incrementTransactionCount,
  addConnectionHistory,
  updateLoadBalancingConfig,
  updateStatistics,
  clearError,
  resetTerminals,
} = terminalSlice.actions;

export default terminalSlice.reducer;

// Selectors
export const selectTerminals = (state) => state.terminals.terminals;
export const selectActiveTerminal = (state) => state.terminals.activeTerminal;
export const selectOnlineTerminals = (state) => 
  state.terminals.terminals.filter(terminal => terminal.isOnline);
export const selectConnectionHistory = (state) => state.terminals.connectionHistory;
export const selectTerminalStatistics = (state) => state.terminals.statistics;
export const selectLoadBalancingConfig = (state) => state.terminals.loadBalancing;
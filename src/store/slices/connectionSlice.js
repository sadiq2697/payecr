import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks for ECR operations
export const connectECR = createAsyncThunk(
  'connection/connect',
  async ({ type, config }, { rejectWithValue }) => {
    try {
      // This would use your ECRService
      const result = await ecrService.connect(type, config);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const disconnectECR = createAsyncThunk(
  'connection/disconnect',
  async (_, { rejectWithValue }) => {
    try {
      await ecrService.disconnect();
      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const testConnection = createAsyncThunk(
  'connection/test',
  async (config, { rejectWithValue }) => {
    try {
      const result = await ecrService.testTCPConnection(config);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  isConnected: false,
  isConnecting: false,
  connectionType: 'serial', // 'serial' | 'tcp'
  status: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
  lastConnected: null,
  connectionHealth: {
    latency: 0,
    signalStrength: 0,
    lastPing: null,
    errors: [],
  },
  config: {
    tcp: {
      host: '192.168.1.100',
      port: 85,
      timeout: 5000,
    },
    serial: {
      baudRate: 9600,
    },
  },
  selectedDevice: null,
  error: null,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setConnectionType: (state, action) => {
      state.connectionType = action.payload;
      state.error = null;
    },
    updateConfig: (state, action) => {
      const { type, config } = action.payload;
      state.config[type] = { ...state.config[type], ...config };
    },
    setSelectedDevice: (state, action) => {
      state.selectedDevice = action.payload;
    },
    updateConnectionHealth: (state, action) => {
      state.connectionHealth = { ...state.connectionHealth, ...action.payload };
    },
    addConnectionError: (state, action) => {
      state.connectionHealth.errors.unshift({
        timestamp: Date.now(),
        message: action.payload,
      });
      // Keep only last 10 errors
      state.connectionHealth.errors = state.connectionHealth.errors.slice(0, 10);
    },
    clearError: (state) => {
      state.error = null;
    },
    resetConnection: (state) => {
      state.isConnected = false;
      state.isConnecting = false;
      state.status = 'disconnected';
      state.selectedDevice = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Connect ECR
      .addCase(connectECR.pending, (state) => {
        state.isConnecting = true;
        state.status = 'connecting';
        state.error = null;
      })
      .addCase(connectECR.fulfilled, (state, action) => {
        state.isConnecting = false;
        state.isConnected = true;
        state.status = 'connected';
        state.lastConnected = Date.now();
        state.error = null;
      })
      .addCase(connectECR.rejected, (state, action) => {
        state.isConnecting = false;
        state.isConnected = false;
        state.status = 'error';
        state.error = action.payload;
      })
      
      // Disconnect ECR
      .addCase(disconnectECR.pending, (state) => {
        state.isConnecting = true;
      })
      .addCase(disconnectECR.fulfilled, (state) => {
        state.isConnecting = false;
        state.isConnected = false;
        state.status = 'disconnected';
        state.selectedDevice = null;
        state.error = null;
      })
      .addCase(disconnectECR.rejected, (state, action) => {
        state.isConnecting = false;
        state.error = action.payload;
      })
      
      // Test Connection
      .addCase(testConnection.pending, (state) => {
        state.isConnecting = true;
      })
      .addCase(testConnection.fulfilled, (state, action) => {
        state.isConnecting = false;
        state.connectionHealth.latency = action.payload.latency || 0;
        state.connectionHealth.lastPing = Date.now();
      })
      .addCase(testConnection.rejected, (state, action) => {
        state.isConnecting = false;
        state.error = action.payload;
      });
  },
});

export const {
  setConnectionType,
  updateConfig,
  setSelectedDevice,
  updateConnectionHealth,
  addConnectionError,
  clearError,
  resetConnection,
} = connectionSlice.actions;

export default connectionSlice.reducer;

// Selectors
export const selectConnection = (state) => state.connection;
export const selectIsConnected = (state) => state.connection.isConnected;
export const selectConnectionStatus = (state) => state.connection.status;
export const selectConnectionConfig = (state) => state.connection.config;
export const selectConnectionHealth = (state) => state.connection.connectionHealth;
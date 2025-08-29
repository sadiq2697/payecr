import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks for USB device operations
export const scanUSBDevices = createAsyncThunk(
  'devices/scan',
  async (_, { rejectWithValue }) => {
    try {
      const devices = await ecrService.scanForUSBDevices();
      return devices;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadSavedDevices = createAsyncThunk(
  'devices/loadSaved',
  async (_, { rejectWithValue }) => {
    try {
      const devices = await ecrService.getSavedUSBDevices();
      return devices;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveDevice = createAsyncThunk(
  'devices/save',
  async ({ device, baudRate, alias }, { rejectWithValue }) => {
    try {
      await ecrService.saveUSBDevice(device, baudRate, alias);
      return { ...device, alias };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeDevice = createAsyncThunk(
  'devices/remove',
  async (deviceId, { rejectWithValue }) => {
    try {
      await ecrService.removeUSBDevice(deviceId);
      return deviceId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleAutoReconnect = createAsyncThunk(
  'devices/toggleAutoReconnect',
  async ({ deviceId, enabled }, { rejectWithValue }) => {
    try {
      await ecrService.toggleUSBAutoReconnect(deviceId, enabled);
      return { deviceId, enabled };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  savedDevices: [],
  scannedDevices: [],
  isScanning: false,
  autoConnectEnabled: true,
  deviceStatusHistory: {}, // Track device online/offline history
  lastScanTime: null,
  loading: false,
  error: null,
};

const deviceSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    updateDeviceStatus: (state, action) => {
      const { deviceId, isOnline } = action.payload;
      const deviceIndex = state.savedDevices.findIndex(d => d.deviceId === deviceId);
      
      if (deviceIndex !== -1) {
        const previousStatus = state.savedDevices[deviceIndex].isOnline;
        state.savedDevices[deviceIndex].isOnline = isOnline;
        
        // Track status history
        if (!state.deviceStatusHistory[deviceId]) {
          state.deviceStatusHistory[deviceId] = [];
        }
        
        if (previousStatus !== isOnline) {
          state.deviceStatusHistory[deviceId].unshift({
            timestamp: Date.now(),
            status: isOnline ? 'online' : 'offline',
            previousStatus: previousStatus ? 'online' : 'offline',
          });
          
          // Keep only last 10 status changes
          state.deviceStatusHistory[deviceId] = state.deviceStatusHistory[deviceId].slice(0, 10);
        }
      }
    },
    updateDevicePermission: (state, action) => {
      const { deviceId, hasPermission } = action.payload;
      const deviceIndex = state.savedDevices.findIndex(d => d.deviceId === deviceId);
      
      if (deviceIndex !== -1) {
        state.savedDevices[deviceIndex].hasPermission = hasPermission;
      }
    },
    setAutoConnectEnabled: (state, action) => {
      state.autoConnectEnabled = action.payload;
    },
    clearDeviceError: (state) => {
      state.error = null;
    },
    resetDevices: (state) => {
      state.savedDevices = [];
      state.scannedDevices = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Scan USB Devices
      .addCase(scanUSBDevices.pending, (state) => {
        state.isScanning = true;
        state.error = null;
      })
      .addCase(scanUSBDevices.fulfilled, (state, action) => {
        state.isScanning = false;
        state.scannedDevices = action.payload;
        state.lastScanTime = Date.now();
      })
      .addCase(scanUSBDevices.rejected, (state, action) => {
        state.isScanning = false;
        state.error = action.payload;
      })
      
      // Load Saved Devices
      .addCase(loadSavedDevices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSavedDevices.fulfilled, (state, action) => {
        state.loading = false;
        state.savedDevices = action.payload;
      })
      .addCase(loadSavedDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Save Device
      .addCase(saveDevice.pending, (state) => {
        state.loading = true;
      })
      .addCase(saveDevice.fulfilled, (state, action) => {
        state.loading = false;
        const existingIndex = state.savedDevices.findIndex(
          d => d.deviceId === action.payload.deviceId
        );
        
        if (existingIndex !== -1) {
          state.savedDevices[existingIndex] = action.payload;
        } else {
          state.savedDevices.push(action.payload);
        }
      })
      .addCase(saveDevice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Remove Device
      .addCase(removeDevice.fulfilled, (state, action) => {
        state.savedDevices = state.savedDevices.filter(
          d => d.deviceId !== action.payload
        );
        delete state.deviceStatusHistory[action.payload];
      })
      .addCase(removeDevice.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Toggle Auto Reconnect
      .addCase(toggleAutoReconnect.fulfilled, (state, action) => {
        const { deviceId, enabled } = action.payload;
        const deviceIndex = state.savedDevices.findIndex(d => d.deviceId === deviceId);
        
        if (deviceIndex !== -1) {
          state.savedDevices[deviceIndex].autoReconnect = enabled;
        }
      })
      .addCase(toggleAutoReconnect.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  updateDeviceStatus,
  updateDevicePermission,
  setAutoConnectEnabled,
  clearDeviceError,
  resetDevices,
} = deviceSlice.actions;

export default deviceSlice.reducer;

// Selectors
export const selectDevices = (state) => state.devices;
export const selectSavedDevices = (state) => state.devices.savedDevices;
export const selectScannedDevices = (state) => state.devices.scannedDevices;
export const selectOnlineDevices = (state) => 
  state.devices.savedDevices.filter(device => device.isOnline);
export const selectDeviceStatusHistory = (state) => state.devices.deviceStatusHistory;
export const selectIsScanning = (state) => state.devices.isScanning;
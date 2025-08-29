import { configureStore } from '@reduxjs/toolkit';
import connectionSlice from './slices/connectionSlice';
import deviceSlice from './slices/deviceSlice';
import transactionSlice from './slices/transactionSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    connection: connectionSlice,
    devices: deviceSlice,
    transactions: transactionSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: __DEV__,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
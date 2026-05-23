import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { dashboardApi } from '../services/dashboardApi';
import { adminGovernanceApi } from '../services/adminGovernanceApi';
import authReducer from '../features/authSlice';
import dashboardReducer from '../features/dashboardSlice';

export const store = configureStore({
  reducer: {
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [adminGovernanceApi.reducerPath]: adminGovernanceApi.reducer,
    auth: authReducer,
    dashboard: dashboardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: import.meta.env.MODE === 'production',
      immutableCheck: import.meta.env.MODE === 'production',
    }).concat(dashboardApi.middleware, adminGovernanceApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

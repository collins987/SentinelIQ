/**
 * User Dashboard API Service
 * RTK Query endpoints for user-specific dashboard data
 * Based on backend endpoints:
 * - POST /users/auth/login
 * - GET /user/dashboard
 * - GET /user/profile
 * - GET /users/user/activity
 * - POST /users/support/ticket
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type {
  UserDashboardData,
  UserProfile,
  UserActivity,
  SessionInfo,
  SupportTicketRequest,
  SupportTicketResponse,
  LoginRequest,
  LoginResponse,
} from '../types/user';

// Create the User API
export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['UserDashboard', 'UserProfile', 'UserActivity'],
  endpoints: (builder) => ({
    // =========================================================================
    // Authentication
    // =========================================================================
    
    /**
     * Login endpoint - authenticates user and returns JWT token
     * POST /api/auth/login (proxied to /auth/login on backend)
     */
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: 'api/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    // =========================================================================
    // Dashboard Data
    // =========================================================================

    /**
     * Get full user dashboard data
     * GET /user/dashboard
     * Returns: profile, risk_scores, activity, session
     */
    getUserDashboard: builder.query<UserDashboardData, void>({
      query: () => 'user/dashboard',
      providesTags: ['UserDashboard'],
    }),

    /**
     * Get user profile only
     * GET /user/profile
     */
    getUserProfile: builder.query<UserProfile, void>({
      query: () => 'user/profile',
      providesTags: ['UserProfile'],
    }),

    /**
     * Get user activity and session info
     * GET /users/user/activity
     */
    getUserActivity: builder.query<{ activity: UserActivity; session: SessionInfo }, void>({
      query: () => 'users/user/activity',
      providesTags: ['UserActivity'],
    }),

    // =========================================================================
    // Support
    // =========================================================================

    /**
     * Submit a support ticket
     * POST /users/support/ticket
     */
    submitSupportTicket: builder.mutation<SupportTicketResponse, SupportTicketRequest>({
      query: (ticket) => ({
        url: 'users/support/ticket',
        method: 'POST',
        body: ticket,
      }),
    }),
  }),
});

// Export hooks for components
export const {
  useLoginMutation,
  useGetUserDashboardQuery,
  useGetUserProfileQuery,
  useGetUserActivityQuery,
  useSubmitSupportTicketMutation,
} = userApi;

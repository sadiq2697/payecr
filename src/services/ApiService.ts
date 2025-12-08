/**
 * API Service for POS App
 * Handles all HTTP requests to the backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// API Configuration - adjust based on your environment
const getBaseUrl = () => {
  if (__DEV__) {
    // For Android emulator, use 10.0.2.2 to access localhost
    // For iOS simulator, use localhost
    // For real device on same network, use your computer's IP
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5001';
    }
    return 'http://localhost:5001';
  }
  return 'https://api.yourproduction.com';
};

const API_BASE_URL = getBaseUrl();

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Array<{ msg: string; path: string }>;
}

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  role?: any;
  roleName?: string;
  permissions: any;
  outletId?: any;
  storeId?: any;
}

export interface LoginResponse {
  user: User;
  token: string;
  outlet: {
    _id: string;
    name: string;
    code: string;
    status: string;
    address?: any;
  };
  store: {
    _id: string;
    name: string;
    code: number;
    currency: string;
  };
  organization?: {
    _id: string;
    name: string;
    code: string;
  };
}

export interface SessionInfo {
  user: User;
  isOnShift: boolean;
  shiftStart: string | null;
  terminal: string | null;
  outlet: any;
  store: any;
}

export interface ShiftResponse {
  shiftStarted?: boolean;
  shiftEnded?: boolean;
  shiftStart?: string;
  shiftEnd?: string;
  duration?: number;
  terminal?: string;
  totalWeekHours?: number;
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('pos_token');
    } catch (error) {
      console.error('[ApiService] Failed to load token:', error);
    }
  }

  private async saveToken(token: string) {
    try {
      this.token = token;
      await AsyncStorage.setItem('pos_token', token);
    } catch (error) {
      console.error('[ApiService] Failed to save token:', error);
    }
  }

  async clearToken() {
    try {
      this.token = null;
      await AsyncStorage.removeItem('pos_token');
      await AsyncStorage.removeItem('pos_user');
      await AsyncStorage.removeItem('pos_store');
      await AsyncStorage.removeItem('pos_outlet');
    } catch (error) {
      console.error('[ApiService] Failed to clear token:', error);
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`[ApiService] ${method} ${url}`);

      const options: RequestInit = {
        method,
        headers: this.getHeaders(),
      };

      if (body) {
        options.body = JSON.stringify(body);
        console.log(`[ApiService] Body:`, JSON.stringify(body));
      }

      const response = await fetch(url, options);
      const data = await response.json();

      console.log(`[ApiService] Response status: ${response.status}`);

      if (!response.ok) {
        // Extract error message
        let errorMessage = 'Request failed';
        if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.errors && data.errors.length > 0) {
          errorMessage = data.errors.map((e: any) => e.msg).join(', ');
        }

        return {
          success: false,
          error: errorMessage,
          errors: data.errors,
        };
      }

      return data;
    } catch (error: any) {
      console.error(`[ApiService] Error:`, error);
      return {
        success: false,
        error: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  // ============================================================================
  // AUTH ENDPOINTS
  // ============================================================================

  /**
   * Login with store code, outlet code, employee ID, and PIN
   */
  async login(
    storeCode: string,
    outletCode: string,
    employeeId: string,
    pin: string
  ): Promise<ApiResponse<LoginResponse>> {
    const result = await this.request<LoginResponse>('POST', '/api/pos/auth/login', {
      storeCode,
      outletCode,
      employeeId,
      pin,
    });

    if (result.success && result.data) {
      // Save token
      if (result.data.token) {
        await this.saveToken(result.data.token);
      }

      // Save user, store, and outlet info
      try {
        await AsyncStorage.setItem('pos_user', JSON.stringify(result.data.user));
        await AsyncStorage.setItem('pos_store', JSON.stringify(result.data.store));
        await AsyncStorage.setItem('pos_outlet', JSON.stringify(result.data.outlet));
      } catch (error) {
        console.error('[ApiService] Failed to save user data:', error);
      }
    }

    return result;
  }

  /**
   * Validate store code
   */
  async validateStore(storeCode: string): Promise<ApiResponse<{
    storeId: string;
    storeName: string;
    storeCode: string;
  }>> {
    return this.request('POST', '/api/pos/auth/validate-store', { storeCode });
  }

  /**
   * Validate outlet code
   */
  async validateOutlet(storeCode: string, outletCode: string): Promise<ApiResponse<{
    outletId: string;
    outletName: string;
    outletCode: string;
    storeName: string;
  }>> {
    return this.request('POST', '/api/pos/auth/validate-outlet', { storeCode, outletCode });
  }

  /**
   * Get current session info
   */
  async getSession(): Promise<ApiResponse<SessionInfo>> {
    return this.request<SessionInfo>('GET', '/api/pos/auth/session');
  }

  /**
   * Start shift
   */
  async startShift(terminalId?: string): Promise<ApiResponse<ShiftResponse>> {
    return this.request<ShiftResponse>('POST', '/api/pos/auth/shift/start', {
      terminalId,
    });
  }

  /**
   * End shift
   */
  async endShift(): Promise<ApiResponse<ShiftResponse>> {
    return this.request<ShiftResponse>('POST', '/api/pos/auth/shift/end');
  }

  /**
   * Set or update PIN
   */
  async setPin(
    newPin: string,
    currentPassword?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request('POST', '/api/pos/auth/pin', {
      newPin,
      currentPassword,
    });
  }

  /**
   * Logout
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const result = await this.request<{ message: string }>('POST', '/api/pos/auth/logout');
    await this.clearToken();
    return result;
  }

  /**
   * Check if user has a valid token
   */
  async isAuthenticated(): Promise<boolean> {
    if (!this.token) {
      await this.loadToken();
    }
    return !!this.token;
  }

  /**
   * Get the current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get stored user data
   */
  async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('pos_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('[ApiService] Failed to get stored user:', error);
      return null;
    }
  }

  /**
   * Get stored store data
   */
  async getStoredStore(): Promise<any | null> {
    try {
      const storeData = await AsyncStorage.getItem('pos_store');
      return storeData ? JSON.parse(storeData) : null;
    } catch (error) {
      console.error('[ApiService] Failed to get stored store:', error);
      return null;
    }
  }

  /**
   * Get stored outlet data
   */
  async getStoredOutlet(): Promise<any | null> {
    try {
      const outletData = await AsyncStorage.getItem('pos_outlet');
      return outletData ? JSON.parse(outletData) : null;
    } catch (error) {
      console.error('[ApiService] Failed to get stored outlet:', error);
      return null;
    }
  }

  /**
   * Save login credentials (store code and outlet code) for quick login
   */
  async saveLoginCredentials(storeCode: string, outletCode: string): Promise<void> {
    try {
      await AsyncStorage.setItem('pos_store_code', storeCode);
      await AsyncStorage.setItem('pos_outlet_code', outletCode);
    } catch (error) {
      console.error('[ApiService] Failed to save login credentials:', error);
    }
  }

  /**
   * Get saved login credentials
   */
  async getSavedLoginCredentials(): Promise<{ storeCode: string | null; outletCode: string | null }> {
    try {
      const storeCode = await AsyncStorage.getItem('pos_store_code');
      const outletCode = await AsyncStorage.getItem('pos_outlet_code');
      return { storeCode, outletCode };
    } catch (error) {
      console.error('[ApiService] Failed to get saved credentials:', error);
      return { storeCode: null, outletCode: null };
    }
  }

  /**
   * Clear saved login credentials
   */
  async clearSavedLoginCredentials(): Promise<void> {
    try {
      await AsyncStorage.removeItem('pos_store_code');
      await AsyncStorage.removeItem('pos_outlet_code');
    } catch (error) {
      console.error('[ApiService] Failed to clear saved credentials:', error);
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

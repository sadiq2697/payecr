import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { PresentationDisplay } = NativeModules;

interface Display {
  displayId: number;
  name: string;
  width: number;
  height: number;
}

class DualScreenManager {
  private eventEmitter: NativeEventEmitter | null = null;
  private updateListener: any = null;

  constructor() {
    if (Platform.OS === 'android' && PresentationDisplay) {
      this.eventEmitter = new NativeEventEmitter(PresentationDisplay);
    }
  }

  /**
   * Get all available displays
   * @returns Promise with array of displays
   */
  async getDisplays(): Promise<Display[]> {
    if (Platform.OS !== 'android' || !PresentationDisplay) {
      console.warn('Dual screen support only available on Android');
      return [];
    }

    try {
      const displays = await PresentationDisplay.getDisplays();
      console.log('[DualScreen] Available displays:', displays);
      return displays;
    } catch (error) {
      console.error('[DualScreen] Failed to get displays:', error);
      return [];
    }
  }

  /**
   * Show customer display on secondary screen
   * @param displayId ID of the secondary display (usually 1)
   * @returns Promise with result
   */
  async showCustomerDisplay(displayId: number = 1): Promise<boolean> {
    if (Platform.OS !== 'android' || !PresentationDisplay) {
      console.warn('Dual screen support only available on Android');
      return false;
    }

    try {
      const result = await PresentationDisplay.showOnSecondaryDisplay(displayId);
      console.log('[DualScreen] Customer display shown:', result);
      return result.success;
    } catch (error) {
      console.error('[DualScreen] Failed to show customer display:', error);
      return false;
    }
  }

  /**
   * Hide customer display from secondary screen
   * @returns Promise with success status
   */
  async hideCustomerDisplay(): Promise<boolean> {
    if (Platform.OS !== 'android' || !PresentationDisplay) {
      return false;
    }

    try {
      await PresentationDisplay.hideSecondaryDisplay();
      console.log('[DualScreen] Customer display hidden');
      return true;
    } catch (error) {
      console.error('[DualScreen] Failed to hide customer display:', error);
      return false;
    }
  }

  /**
   * Update customer display with cart data
   * @param data Cart data to send to customer display
   * @returns Promise with success status
   */
  async updateCustomerDisplay(data: any): Promise<boolean> {
    if (Platform.OS !== 'android' || !PresentationDisplay) {
      return false;
    }

    try {
      const jsonData = JSON.stringify(data);
      await PresentationDisplay.updateSecondaryDisplay(jsonData);
      return true;
    } catch (error) {
      console.error('[DualScreen] Failed to update customer display:', error);
      return false;
    }
  }

  /**
   * Listen to customer display updates
   * @param callback Function to call when display is updated
   * @returns Unsubscribe function
   */
  onCustomerDisplayUpdate(callback: (data: string) => void): () => void {
    if (!this.eventEmitter) {
      return () => {};
    }

    this.updateListener = this.eventEmitter.addListener(
      'CustomerDisplayUpdate',
      callback
    );

    return () => {
      if (this.updateListener) {
        this.updateListener.remove();
      }
    };
  }

  /**
   * Check if secondary display is available
   * @returns Promise with availability status
   */
  async hasSecondaryDisplay(): Promise<boolean> {
    const displays = await this.getDisplays();
    return displays.length > 1;
  }

  /**
   * Get secondary display info
   * @returns Promise with secondary display info or null
   */
  async getSecondaryDisplay(): Promise<Display | null> {
    const displays = await this.getDisplays();
    if (displays.length > 1) {
      return displays[1]; // Return second display
    }
    return null;
  }
}

export default new DualScreenManager();

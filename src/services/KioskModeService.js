import { StatusBar } from 'react-native';
import SystemNavigationBar from 'react-native-system-navigation-bar';

/**
 * Kiosk Mode Service
 * Handles hiding/showing navigation bar and status bar for fullscreen experience
 */
class KioskModeService {
  constructor() {
    this.isKioskMode = false;
    this.statusBarHidden = false;
    this.navigationBarHidden = false;
  }

  /**
   * Enable kiosk mode (hide navigation bar and status bar)
   */
  async enableKioskMode() {
    try {
      console.log('Enabling kiosk mode...');
      
      // Hide status bar immediately
      StatusBar.setHidden(true, 'none');
      this.statusBarHidden = true;

      // Hide navigation bar using react-native-system-navigation-bar
      await SystemNavigationBar.navigationHide();
      
      // Set navigation bar to lean back mode (hide on interaction)
      await SystemNavigationBar.leanBack();
      
      // Enable immersive mode
      await SystemNavigationBar.immersive();
      
      this.navigationBarHidden = true;
      this.isKioskMode = true;
      
      console.log('Kiosk mode enabled - status bar and navigation bar hidden');
      return { success: true, message: 'Kiosk mode enabled' };
    } catch (error) {
      console.error('Failed to enable kiosk mode:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable kiosk mode (show navigation bar and status bar)
   */
  async disableKioskMode() {
    try {
      console.log('Disabling kiosk mode...');
      
      // Show status bar
      StatusBar.setHidden(false, 'fade');
      this.statusBarHidden = false;

      // Show navigation bar
      await SystemNavigationBar.navigationShow();
      
      // Reset to normal mode
      await SystemNavigationBar.fullScreen(false);
      
      this.navigationBarHidden = false;
      this.isKioskMode = false;
      
      console.log('Kiosk mode disabled successfully');
      return { success: true, message: 'Kiosk mode disabled' };
    } catch (error) {
      console.error('Failed to disable kiosk mode:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Toggle kiosk mode
   */
  async toggleKioskMode() {
    if (this.isKioskMode) {
      return await this.disableKioskMode();
    } else {
      return await this.enableKioskMode();
    }
  }

  /**
   * Enable lean back mode (hide on touch, auto-show after delay)
   */
  async enableLeanBackMode() {
    try {
      console.log('Enabling lean back mode...');
      
      // Hide status bar (can be shown on swipe)
      StatusBar.setHidden(true, 'fade');
      this.statusBarHidden = true;
      
      // Enable lean back mode for navigation bar
      await SystemNavigationBar.leanBack();
      this.navigationBarHidden = true;
      
      this.isKioskMode = 'leanback';
      
      console.log('Lean back mode enabled - bars hidden but can be revealed on swipe');
      return { success: true, message: 'Lean back mode enabled' };
    } catch (error) {
      console.error('Failed to enable lean back mode:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set navigation bar color and transparency
   */
  async setNavigationBarStyle(color = '#000000', transparent = false) {
    try {
      if (transparent) {
        await SystemNavigationBar.setNavigationColor(color, 'light', true);
      } else {
        await SystemNavigationBar.setNavigationColor(color, 'light');
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to set navigation bar style:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable immersive sticky mode (best for kiosk applications)
   */
  async enableImmersiveSticky() {
    try {
      console.log('Enabling immersive sticky mode...');
      
      // Hide status bar immediately
      StatusBar.setHidden(true, 'none'); // Use 'none' for immediate hiding
      
      // Enable sticky immersive mode
      await SystemNavigationBar.stickyImmersive();
      
      // Make sure navigation bar is also hidden
      await SystemNavigationBar.navigationHide();
      
      this.isKioskMode = 'immersive-sticky';
      this.statusBarHidden = true;
      this.navigationBarHidden = true;
      
      console.log('Immersive sticky mode enabled - status bar and navigation bar hidden');
      return { success: true, message: 'Immersive sticky mode enabled' };
    } catch (error) {
      console.error('Failed to enable immersive sticky mode:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current kiosk mode status
   */
  getStatus() {
    return {
      isKioskMode: this.isKioskMode,
      statusBarHidden: this.statusBarHidden,
      navigationBarHidden: this.navigationBarHidden,
    };
  }

  /**
   * Initialize kiosk mode settings based on configuration
   */
  async initialize(config = {}) {
    try {
      const {
        autoEnable = false,
        mode = 'kiosk', // 'kiosk', 'leanback', 'immersive-sticky'
        navigationBarColor = '#000000',
        transparentNavigation = false,
      } = config;

      // Set navigation bar style
      await this.setNavigationBarStyle(navigationBarColor, transparentNavigation);

      // Auto-enable kiosk mode if configured
      if (autoEnable) {
        console.log(`Auto-enabling ${mode} mode...`);
        let result;
        switch (mode) {
          case 'leanback':
            result = await this.enableLeanBackMode();
            break;
          case 'immersive-sticky':
            result = await this.enableImmersiveSticky();
            break;
          case 'kiosk':
          default:
            result = await this.enableKioskMode();
            break;
        }
        
        if (result.success) {
          console.log(`${mode} mode enabled successfully`);
        } else {
          console.warn(`Failed to enable ${mode} mode:`, result.error);
        }
      }

      console.log('Kiosk mode service initialized');
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize kiosk mode service:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const kioskModeService = new KioskModeService();
export default kioskModeService;
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Secure Update Service with user consent and security checks
 * Follows platform guidelines and security best practices
 */
class UpdateService {
  constructor() {
    this.updateCheckInterval = null;
    this.isChecking = false;
    this.lastCheckTime = 0;
    this.CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    this.GITHUB_REPO = 'sadiq2697/payecr'; // Your GitHub repository
    this.GITHUB_API_URL = `https://api.github.com/repos/${this.GITHUB_REPO}/releases/latest`;
    this.currentVersion = require('../../../package.json').version || '1.0.0';
  }

  /**
   * Initialize update service with secure checks
   */
  async initialize() {
    try {
      // Load last check time
      const lastCheck = await AsyncStorage.getItem('last_update_check');
      this.lastCheckTime = lastCheck ? parseInt(lastCheck, 10) : 0;

      // Start periodic checks (with user consent)
      this.startPeriodicChecks();
      
      console.log('Update service initialized');
    } catch (error) {
      console.error('Failed to initialize update service:', error);
    }
  }

  /**
   * Start periodic update checks (respects user preferences)
   */
  async startPeriodicChecks() {
    // Check if user has enabled auto-update checks
    const autoCheckEnabled = await AsyncStorage.getItem('auto_check_updates');
    if (autoCheckEnabled === 'false') {
      console.log('Auto-update checks disabled by user');
      return;
    }

    // Clear existing interval
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }

    // Check immediately if it's been more than 24 hours
    const now = Date.now();
    if (now - this.lastCheckTime > this.CHECK_INTERVAL) {
      this.checkForUpdates();
    }

    // Set up periodic checks
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Check for available updates from GitHub releases
   */
  async checkForUpdates(forceCheck = false) {
    if (this.isChecking && !forceCheck) {
      console.log('Update check already in progress');
      return null;
    }

    this.isChecking = true;
    
    try {
      console.log('Checking for updates on GitHub...');
      
      // Call GitHub API to get latest release
      const response = await fetch(this.GITHUB_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': `PayECR/${this.currentVersion}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        timeout: 10000, // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`GitHub API request failed: ${response.status}`);
      }

      const releaseData = await response.json();
      const updateInfo = this.parseGitHubRelease(releaseData);
      
      // Validate response structure
      if (!this.validateUpdateResponse(updateInfo)) {
        throw new Error('Invalid update response format');
      }

      // Store last check time
      await AsyncStorage.setItem('last_update_check', Date.now().toString());
      this.lastCheckTime = Date.now();

      // Check if update is available
      if (this.isUpdateAvailable(updateInfo.version)) {
        return this.handleUpdateAvailable(updateInfo);
      } else {
        console.log('App is up to date');
        return null;
      }

    } catch (error) {
      console.error('Update check failed:', error);
      return null;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Parse GitHub release data into update info
   */
  parseGitHubRelease(releaseData) {
    // Find the APK asset for Android
    const apkAsset = releaseData.assets?.find(asset => 
      asset.name.toLowerCase().endsWith('.apk')
    );

    if (!apkAsset && Platform.OS === 'android') {
      throw new Error('No APK file found in release assets');
    }

    // Extract version from tag name (e.g., 'v1.2.3' -> '1.2.3')
    const version = releaseData.tag_name?.replace(/^v/, '') || '0.0.0';
    
    // Check if this is a critical update (based on release title/body)
    const isCritical = this.isCriticalUpdate(releaseData.name, releaseData.body);

    return {
      version,
      tagName: releaseData.tag_name,
      releaseNotes: releaseData.body || 'No release notes available.',
      downloadUrl: apkAsset?.browser_download_url,
      releaseDate: releaseData.published_at,
      size: apkAsset ? this.formatFileSize(apkAsset.size) : 'Unknown',
      critical: isCritical,
      githubUrl: releaseData.html_url,
      prerelease: releaseData.prerelease,
    };
  }

  /**
   * Determine if update is critical based on release content
   */
  isCriticalUpdate(title = '', body = '') {
    const criticalKeywords = [
      'security', 'critical', 'urgent', 'hotfix', 
      'vulnerability', 'patch', 'important'
    ];
    
    const content = `${title} ${body}`.toLowerCase();
    return criticalKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate update response for security
   */
  validateUpdateResponse(updateInfo) {
    return (
      updateInfo &&
      typeof updateInfo.version === 'string' &&
      updateInfo.downloadUrl &&
      updateInfo.downloadUrl.startsWith('https://') && // Must be HTTPS
      typeof updateInfo.releaseNotes === 'string'
    );
  }

  /**
   * Check if update version is newer
   */
  isUpdateAvailable(newVersion) {
    const current = this.currentVersion.split('.').map(Number);
    const available = newVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(current.length, available.length); i++) {
      const currentPart = current[i] || 0;
      const availablePart = available[i] || 0;

      if (availablePart > currentPart) return true;
      if (availablePart < currentPart) return false;
    }

    return false;
  }

  /**
   * Handle when update is available (WITH USER CONSENT)
   */
  async handleUpdateAvailable(updateInfo) {
    console.log('Update available:', updateInfo.version);

    // Check user preferences for update notifications
    const notificationsEnabled = await AsyncStorage.getItem('update_notifications');
    if (notificationsEnabled === 'false') {
      // Store update info but don't show notification
      await AsyncStorage.setItem('pending_update', JSON.stringify(updateInfo));
      return updateInfo;
    }

    // Show update notification with user choice
    return new Promise((resolve) => {
      const buttons = [
        {
          text: 'Later',
          style: 'cancel',
          onPress: () => {
            // Store for later reminder
            AsyncStorage.setItem('pending_update', JSON.stringify(updateInfo));
            resolve(null);
          }
        },
        {
          text: 'View Details',
          onPress: () => {
            this.showUpdateDetails(updateInfo);
            resolve(updateInfo);
          }
        }
      ];

      // Add immediate update option for critical updates
      if (updateInfo.critical) {
        buttons.push({
          text: 'Update Now',
          style: 'default',
          onPress: () => {
            this.initiateUpdate(updateInfo);
            resolve(updateInfo);
          }
        });
      }

      Alert.alert(
        updateInfo.critical ? '🚨 Critical Update Available' : '📱 Update Available',
        `Version ${updateInfo.version} is now available.\n\n${updateInfo.critical ? 'This is a security update and is recommended.' : 'Would you like to learn more?'}`,
        buttons
      );
    });
  }

  /**
   * Show detailed update information
   */
  showUpdateDetails(updateInfo) {
    Alert.alert(
      `Update to ${updateInfo.version}`,
      `What's New:\n${updateInfo.releaseNotes}\n\nSize: ${updateInfo.size || 'Unknown'}\nRelease Date: ${updateInfo.releaseDate || 'Unknown'}`,
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => {
            AsyncStorage.setItem('pending_update', JSON.stringify(updateInfo));
          }
        },
        {
          text: 'Update Now',
          style: 'default',
          onPress: () => this.initiateUpdate(updateInfo)
        }
      ]
    );
  }

  /**
   * Initiate update process (GitHub release download)
   */
  async initiateUpdate(updateInfo) {
    try {
      console.log('Initiating update from GitHub release');
      
      // Track update analytics (optional)
      await this.trackUpdateEvent('update_initiated', {
        from_version: this.currentVersion,
        to_version: updateInfo.version,
        critical: updateInfo.critical,
        source: 'github'
      });

      // Show download options to user
      this.showDownloadOptions(updateInfo);
      
    } catch (error) {
      console.error('Failed to initiate update:', error);
      Alert.alert(
        'Update Error',
        'Unable to start update process. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Show download options to user
   */
  showDownloadOptions(updateInfo) {
    const buttons = [
      {
        text: 'Cancel',
        style: 'cancel'
      },
      {
        text: 'View Release',
        onPress: () => this.openGitHubRelease(updateInfo.githubUrl)
      }
    ];

    // Add direct download for Android
    if (Platform.OS === 'android' && updateInfo.downloadUrl) {
      buttons.push({
        text: 'Download APK',
        onPress: () => this.downloadAPK(updateInfo)
      });
    }

    Alert.alert(
      `Update to ${updateInfo.version}`,
      `Size: ${updateInfo.size}\nReleased: ${new Date(updateInfo.releaseDate).toLocaleDateString()}\n\nChoose how to update:`,
      buttons
    );
  }

  /**
   * Open GitHub release page
   */
  async openGitHubRelease(githubUrl) {
    try {
      const supported = await Linking.canOpenURL(githubUrl);
      if (supported) {
        await Linking.openURL(githubUrl);
        await AsyncStorage.removeItem('pending_update');
      } else {
        throw new Error('Cannot open GitHub URL');
      }
    } catch (error) {
      console.error('Failed to open GitHub release:', error);
      Alert.alert('Error', 'Unable to open GitHub release page.');
    }
  }

  /**
   * Download APK directly (Android only)
   */
  async downloadAPK(updateInfo) {
    try {
      console.log('Starting APK download:', updateInfo.downloadUrl);
      
      // Show security warning first
      Alert.alert(
        '🔒 Security Notice',
        'You are about to download an APK file. Make sure "Install from unknown sources" is enabled in your device settings.\n\nOnly download from trusted sources.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: async () => {
              // Open download URL in browser
              const supported = await Linking.canOpenURL(updateInfo.downloadUrl);
              if (supported) {
                await Linking.openURL(updateInfo.downloadUrl);
                
                // Show installation instructions
                setTimeout(() => {
                  this.showInstallationInstructions(updateInfo);
                }, 1000);
                
                await AsyncStorage.removeItem('pending_update');
              } else {
                throw new Error('Cannot open download URL');
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Failed to download APK:', error);
      Alert.alert('Download Error', 'Unable to start APK download.');
    }
  }

  /**
   * Show installation instructions after download
   */
  showInstallationInstructions(updateInfo) {
    Alert.alert(
      '📱 Installation Instructions',
      `After the APK download completes:\n\n1. Open the downloaded APK file\n2. Allow installation from unknown sources if prompted\n3. Follow the installation wizard\n4. The app will update to version ${updateInfo.version}`,
      [{ text: 'Got it!' }]
    );
  }

  /**
   * Check for pending updates (show on app start)
   */
  async checkPendingUpdate() {
    try {
      const pendingUpdate = await AsyncStorage.getItem('pending_update');
      if (pendingUpdate) {
        const updateInfo = JSON.parse(pendingUpdate);
        
        // Show reminder after 3 days for non-critical updates
        const now = Date.now();
        const reminderDelay = updateInfo.critical ? 0 : 3 * 24 * 60 * 60 * 1000;
        
        if (now - this.lastCheckTime > reminderDelay) {
          this.showUpdateReminder(updateInfo);
        }
      }
    } catch (error) {
      console.error('Error checking pending updates:', error);
    }
  }

  /**
   * Show gentle update reminder
   */
  showUpdateReminder(updateInfo) {
    Alert.alert(
      '📱 Update Reminder',
      `Version ${updateInfo.version} is still available. Would you like to update now?`,
      [
        {
          text: 'Maybe Later',
          style: 'cancel'
        },
        {
          text: 'Update Now',
          onPress: () => this.initiateUpdate(updateInfo)
        }
      ]
    );
  }

  /**
   * Get current update status
   */
  async getUpdateStatus() {
    const pendingUpdate = await AsyncStorage.getItem('pending_update');
    const autoCheckEnabled = await AsyncStorage.getItem('auto_check_updates') !== 'false';
    const notificationsEnabled = await AsyncStorage.getItem('update_notifications') !== 'false';

    return {
      currentVersion: this.currentVersion,
      isChecking: this.isChecking,
      lastCheckTime: this.lastCheckTime,
      hasPendingUpdate: !!pendingUpdate,
      pendingUpdate: pendingUpdate ? JSON.parse(pendingUpdate) : null,
      autoCheckEnabled,
      notificationsEnabled
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences) {
    if (preferences.autoCheckEnabled !== undefined) {
      await AsyncStorage.setItem('auto_check_updates', preferences.autoCheckEnabled.toString());
      
      if (preferences.autoCheckEnabled) {
        this.startPeriodicChecks();
      } else {
        this.stopPeriodicChecks();
      }
    }

    if (preferences.notificationsEnabled !== undefined) {
      await AsyncStorage.setItem('update_notifications', preferences.notificationsEnabled.toString());
    }
  }

  /**
   * Stop periodic checks
   */
  stopPeriodicChecks() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  /**
   * Track update events for analytics (optional)
   */
  async trackUpdateEvent(event, data) {
    try {
      // Replace with your analytics service
      console.log('Update event:', event, data);
      
      // Example: Send to your analytics service
      // await analytics.track(event, data);
    } catch (error) {
      console.error('Failed to track update event:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopPeriodicChecks();
    this.isChecking = false;
  }
}

export default new UpdateService();
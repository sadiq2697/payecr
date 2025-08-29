import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Card, Button, Divider, Chip } from 'react-native-paper';
import UpdateService from '../../services/UpdateService';

/**
 * Update Settings Component - User controls for update behavior
 */
const UpdateSettings = () => {
  const [updateStatus, setUpdateStatus] = useState({
    currentVersion: '1.0.0',
    isChecking: false,
    lastCheckTime: 0,
    hasPendingUpdate: false,
    pendingUpdate: null,
    autoCheckEnabled: true,
    notificationsEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUpdateStatus();
  }, []);

  const loadUpdateStatus = async () => {
    try {
      const status = await UpdateService.getUpdateStatus();
      setUpdateStatus(status);
    } catch (error) {
      console.error('Failed to load update status:', error);
    }
  };

  const handleCheckForUpdates = async () => {
    setIsLoading(true);
    try {
      await UpdateService.checkForUpdates(true);
      await loadUpdateStatus();
    } catch (error) {
      Alert.alert('Error', 'Failed to check for updates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoCheck = async (value) => {
    try {
      await UpdateService.updatePreferences({ autoCheckEnabled: value });
      setUpdateStatus(prev => ({ ...prev, autoCheckEnabled: value }));
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings.');
    }
  };

  const handleToggleNotifications = async (value) => {
    try {
      await UpdateService.updatePreferences({ notificationsEnabled: value });
      setUpdateStatus(prev => ({ ...prev, notificationsEnabled: value }));
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings.');
    }
  };

  const handleInstallPendingUpdate = () => {
    if (updateStatus.pendingUpdate) {
      Alert.alert(
        'Install Update',
        `Install version ${updateStatus.pendingUpdate.version}?\n\nThis will redirect you to the app store.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Install',
            onPress: () => UpdateService.initiateUpdate(updateStatus.pendingUpdate)
          }
        ]
      );
    }
  };

  const formatLastCheckTime = () => {
    if (!updateStatus.lastCheckTime) return 'Never';
    
    const now = Date.now();
    const diff = now - updateStatus.lastCheckTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>App Updates</Text>
          
          {/* Current Version */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Version</Text>
            <Text style={styles.infoValue}>{updateStatus.currentVersion}</Text>
          </View>
          
          {/* Last Check */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Check</Text>
            <Text style={styles.infoValue}>{formatLastCheckTime()}</Text>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Pending Update Alert */}
          {updateStatus.hasPendingUpdate && (
            <View style={styles.updateAlert}>
              <View style={styles.updateAlertHeader}>
                <Text style={styles.updateAlertTitle}>
                  📱 Update Available
                </Text>
                <Chip
                  mode="flat"
                  style={[
                    styles.updateChip,
                    updateStatus.pendingUpdate?.critical && styles.criticalChip
                  ]}
                  textStyle={styles.chipText}
                >
                  v{updateStatus.pendingUpdate?.version}
                </Chip>
              </View>
              
              {updateStatus.pendingUpdate?.critical && (
                <Text style={styles.criticalText}>
                  🚨 This is a security update
                </Text>
              )}
              
              <Text style={styles.updateDescription}>
                {updateStatus.pendingUpdate?.releaseNotes || 'New version available with improvements and bug fixes.'}
              </Text>
              
              <Button
                mode="contained"
                onPress={handleInstallPendingUpdate}
                style={[
                  styles.installButton,
                  updateStatus.pendingUpdate?.critical && styles.criticalButton
                ]}
              >
                Install Update
              </Button>
            </View>
          )}
          
          {/* Check for Updates Button */}
          <Button
            mode="outlined"
            onPress={handleCheckForUpdates}
            loading={isLoading || updateStatus.isChecking}
            disabled={isLoading || updateStatus.isChecking}
            style={styles.checkButton}
          >
            {isLoading || updateStatus.isChecking ? 'Checking...' : 'Check for Updates'}
          </Button>
          
          <Divider style={styles.divider} />
          
          {/* Settings */}
          <Text style={styles.settingsTitle}>Update Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Automatic Checks</Text>
              <Text style={styles.settingDescription}>
                Check for updates daily (requires user consent to install)
              </Text>
            </View>
            <Switch
              value={updateStatus.autoCheckEnabled}
              onValueChange={handleToggleAutoCheck}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={updateStatus.autoCheckEnabled ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Update Notifications</Text>
              <Text style={styles.settingDescription}>
                Show notifications when updates are available
              </Text>
            </View>
            <Switch
              value={updateStatus.notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={updateStatus.notificationsEnabled ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
          
          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Text style={styles.securityTitle}>🔒 Security & Privacy</Text>
            <Text style={styles.securityText}>
              • All updates require your explicit consent{'\n'}
              • Updates are downloaded from official app stores only{'\n'}
              • No automatic installations without permission{'\n'}
              • Your data remains secure during updates
            </Text>
          </View>
          
          {/* Update History Link */}
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => {
              Alert.alert('Update History', 'Feature coming soon!');
            }}
          >
            <Text style={styles.historyText}>View Update History</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    marginVertical: 16,
  },
  updateAlert: {
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#b3d9e6',
  },
  updateAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  updateAlertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
  },
  updateChip: {
    backgroundColor: '#0066cc',
  },
  criticalChip: {
    backgroundColor: '#d32f2f',
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  criticalText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  updateDescription: {
    fontSize: 14,
    color: '#444',
    marginBottom: 12,
    lineHeight: 20,
  },
  installButton: {
    backgroundColor: '#0066cc',
  },
  criticalButton: {
    backgroundColor: '#d32f2f',
  },
  checkButton: {
    marginVertical: 8,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  securityNotice: {
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#c8e6c8',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#388e3c',
    lineHeight: 16,
  },
  historyButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  historyText: {
    fontSize: 14,
    color: '#0066cc',
    textDecorationLine: 'underline',
  },
});

export default UpdateSettings;
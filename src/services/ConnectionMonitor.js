import { EventEmitter } from 'events';

/**
 * Real-time Connection Monitoring System
 * Monitors ECR connection health with automatic recovery
 */
class ConnectionMonitor extends EventEmitter {
  constructor(ecrService) {
    super();
    this.ecrService = ecrService;
    this.isMonitoring = false;
    this.pingInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.pingIntervalMs = 30000; // 30 seconds
    this.reconnectDelayMs = 5000; // 5 seconds
    
    this.connectionHealth = {
      isHealthy: false,
      latency: 0,
      signalStrength: 100,
      lastPing: null,
      consecutiveFailures: 0,
      uptime: 0,
      connectionStartTime: null,
    };
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.connectionHealth.connectionStartTime = Date.now();
    this.emit('monitoringStarted');
    
    // Start periodic health checks
    this.pingInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.pingIntervalMs);
    
    // Perform immediate health check
    this.performHealthCheck();
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.emit('monitoringStopped');
  }

  async performHealthCheck() {
    if (!this.isMonitoring) return;
    
    const startTime = Date.now();
    
    try {
      // Perform echo test to check connection
      const result = await this.ecrService.sendEchoTest();
      const endTime = Date.now();
      
      if (result.success) {
        this.handleSuccessfulPing(endTime - startTime);
      } else {
        this.handleFailedPing('Echo test failed');
      }
    } catch (error) {
      this.handleFailedPing(error.message);
    }
  }

  handleSuccessfulPing(latency) {
    this.connectionHealth.isHealthy = true;
    this.connectionHealth.latency = latency;
    this.connectionHealth.lastPing = Date.now();
    this.connectionHealth.consecutiveFailures = 0;
    this.reconnectAttempts = 0;
    
    // Calculate signal strength based on latency
    this.connectionHealth.signalStrength = this.calculateSignalStrength(latency);
    
    // Calculate uptime
    if (this.connectionHealth.connectionStartTime) {
      this.connectionHealth.uptime = Date.now() - this.connectionHealth.connectionStartTime;
    }
    
    this.emit('healthUpdate', { ...this.connectionHealth });
    this.emit('connectionHealthy', this.connectionHealth);
  }

  handleFailedPing(error) {
    this.connectionHealth.isHealthy = false;
    this.connectionHealth.consecutiveFailures++;
    this.connectionHealth.lastPing = Date.now();
    
    this.emit('healthUpdate', { ...this.connectionHealth });
    this.emit('connectionUnhealthy', { error, health: this.connectionHealth });
    
    // Attempt automatic reconnection if enabled
    if (this.connectionHealth.consecutiveFailures >= 3) {
      this.attemptAutoReconnect();
    }
  }

  calculateSignalStrength(latency) {
    // Convert latency to signal strength (0-100)
    if (latency < 100) return 100; // Excellent
    if (latency < 300) return 80;  // Good
    if (latency < 500) return 60;  // Fair
    if (latency < 1000) return 40; // Poor
    return 20; // Very Poor
  }

  async attemptAutoReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnectFailed', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
      });
      return;
    }
    
    this.reconnectAttempts++;
    this.emit('reconnectAttempt', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
    });
    
    try {
      // Wait before attempting reconnection
      await this.delay(this.reconnectDelayMs * this.reconnectAttempts); // Exponential backoff
      
      // Attempt to reconnect
      const result = await this.ecrService.reconnect();
      
      if (result.success) {
        this.connectionHealth.connectionStartTime = Date.now();
        this.reconnectAttempts = 0;
        this.emit('reconnectSuccess');
      } else {
        // Will retry on next health check failure
        this.emit('reconnectFailed', { error: result.message });
      }
    } catch (error) {
      this.emit('reconnectFailed', { error: error.message });
    }
  }

  getConnectionHealth() {
    return { ...this.connectionHealth };
  }

  getConnectionQuality() {
    const { isHealthy, latency, signalStrength, consecutiveFailures } = this.connectionHealth;
    
    if (!isHealthy || consecutiveFailures > 0) {
      return 'poor';
    }
    
    if (latency < 100 && signalStrength > 80) {
      return 'excellent';
    }
    
    if (latency < 300 && signalStrength > 60) {
      return 'good';
    }
    
    if (latency < 500 && signalStrength > 40) {
      return 'fair';
    }
    
    return 'poor';
  }

  getDetailedStatus() {
    const quality = this.getConnectionQuality();
    const health = this.getConnectionHealth();
    
    return {
      ...health,
      quality,
      qualityDescription: this.getQualityDescription(quality),
      recommendations: this.getRecommendations(quality, health),
    };
  }

  getQualityDescription(quality) {
    switch (quality) {
      case 'excellent':
        return 'Connection is optimal with low latency';
      case 'good':
        return 'Connection is stable and responsive';
      case 'fair':
        return 'Connection is usable but may experience delays';
      case 'poor':
        return 'Connection is unstable and may fail';
      default:
        return 'Connection status unknown';
    }
  }

  getRecommendations(quality, health) {
    const recommendations = [];
    
    if (quality === 'poor') {
      recommendations.push('Check physical connections');
      recommendations.push('Restart the ECR terminal');
    }
    
    if (health.latency > 1000) {
      recommendations.push('Check network congestion');
      recommendations.push('Consider using wired connection');
    }
    
    if (health.consecutiveFailures > 0) {
      recommendations.push('Monitor for intermittent issues');
    }
    
    return recommendations;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy() {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

export default ConnectionMonitor;
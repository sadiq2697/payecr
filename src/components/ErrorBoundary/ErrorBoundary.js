import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button, Card } from 'react-native-paper';

/**
 * Advanced Error Boundary with recovery mechanisms
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: Date.now() + Math.random(),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to crash reporting service
    this.logErrorToService(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  logErrorToService(error, errorInfo) {
    // In production, you would send this to a crash reporting service
    console.error('Error Boundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Could integrate with services like Sentry, Bugsnag, etc.
    if (__DEV__) {
      // In development, show more detailed error info
      console.group('Error Boundary Details');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Props:', this.props);
      console.error('State:', this.state);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
    }));
    
    // Call onRetry prop if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    });
    
    // Call onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  getErrorSeverity(error) {
    // Categorize errors by severity
    const errorMessage = error?.message || '';
    const errorName = error?.name || '';
    
    if (errorMessage.includes('Network') || errorMessage.includes('Connection')) {
      return 'network';
    }
    
    if (errorName === 'ChunkLoadError' || errorMessage.includes('Loading chunk')) {
      return 'chunk';
    }
    
    if (errorMessage.includes('Permission') || errorMessage.includes('Unauthorized')) {
      return 'permission';
    }
    
    return 'unknown';
  }

  getErrorActions(severity) {
    switch (severity) {
      case 'network':
        return [
          { title: 'Check Connection', action: this.handleRetry },
          { title: 'Use Offline Mode', action: () => this.props.onOfflineMode?.() },
        ];
      case 'chunk':
        return [
          { title: 'Reload App', action: () => this.props.onReload?.() },
          { title: 'Clear Cache', action: () => this.props.onClearCache?.() },
        ];
      case 'permission':
        return [
          { title: 'Request Permission', action: () => this.props.onRequestPermission?.() },
          { title: 'Go to Settings', action: () => this.props.onOpenSettings?.() },
        ];
      default:
        return [
          { title: 'Try Again', action: this.handleRetry },
          { title: 'Reset App', action: this.handleReset },
        ];
    }
  }

  renderErrorDetails() {
    if (!__DEV__ || !this.state.error) return null;
    
    return (
      <Card style={styles.errorDetails}>
        <Card.Content>
          <Text style={styles.errorDetailsTitle}>Development Error Details:</Text>
          <ScrollView style={styles.errorDetailsScroll}>
            <Text style={styles.errorDetailsText}>
              {this.state.error.toString()}
            </Text>
            {this.state.errorInfo && (
              <Text style={styles.errorDetailsText}>
                {this.state.errorInfo.componentStack}
              </Text>
            )}
          </ScrollView>
        </Card.Content>
      </Card>
    );
  }

  render() {
    if (this.state.hasError) {
      const severity = this.getErrorSeverity(this.state.error);
      const actions = this.getErrorActions(severity);
      
      // Custom fallback UI can be provided via props
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry, this.handleReset);
      }

      return (
        <View style={styles.container}>
          <Card style={styles.errorCard}>
            <Card.Content>
              <View style={styles.errorHeader}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Something went wrong</Text>
              </View>
              
              <Text style={styles.errorMessage}>
                {this.getErrorMessage(severity)}
              </Text>
              
              {this.state.retryCount > 0 && (
                <Text style={styles.retryCount}>
                  Retry attempts: {this.state.retryCount}
                </Text>
              )}
              
              <View style={styles.actionButtons}>
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    mode={index === 0 ? 'contained' : 'outlined'}
                    onPress={action.action}
                    style={styles.actionButton}
                  >
                    {action.title}
                  </Button>
                ))}
              </View>
            </Card.Content>
          </Card>
          
          {this.renderErrorDetails()}
          
          <Text style={styles.errorId}>
            Error ID: {this.state.errorId}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }

  getErrorMessage(severity) {
    switch (severity) {
      case 'network':
        return 'Connection to the ECR terminal was lost. Please check your network connection and try again.';
      case 'chunk':
        return 'Failed to load app resources. This may be due to an app update. Please reload the app.';
      case 'permission':
        return 'Required permissions are missing. Please grant the necessary permissions to continue.';
      default:
        return 'An unexpected error occurred. The development team has been notified. Please try again.';
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    flex: 1,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  actionButton: {
    marginVertical: 4,
  },
  errorDetails: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#d32f2f',
  },
  errorDetailsScroll: {
    maxHeight: 200,
  },
  errorDetailsText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
    lineHeight: 16,
  },
  errorId: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;
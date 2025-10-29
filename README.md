# 💳 Asasii POS - Advanced ECR Payment Terminal App

A modern React Native application for managing ECR (Electronic Cash Register) payment terminals with advanced transaction processing, real-time monitoring, and comprehensive device management.

![React Native](https://img.shields.io/badge/React%20Native-Latest-blue) ![Android](https://img.shields.io/badge/Android-API%2021%2B-green) ![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

## ✨ Features

### 🔌 **Multi-Protocol Connection Support**
- **TCP/IP Connection** - Network-based terminal communication with configurable timeouts
- **Serial/RS232 Connection** - Direct serial device communication with full parameter control
- **USB Serial Connection** - USB-to-Serial converter support with OTG compatibility
- **Real-time Connection Monitoring** - Health tracking with latency, uptime, and failure detection
- **Auto-reconnect Logic** - Smart reconnection with exponential backoff and device detection
- **Multi-device Management** - Support for multiple terminals with individual monitoring

### 💳 **Advanced Payment Processing**
- **Standard ECR Transactions** - Sale, void, refund, and settlement operations
- **Split Payment Support** - Divide payments across multiple methods and terminals
- **Transaction Recording** - Complete JSON-based transaction logging with export capabilities
- **Receipt Generation** - Customer, merchant, and POS receipt printing with custom formatting
- **Transaction Analytics** - Real-time statistics, charts, and business insights
- **Response Code Handling** - Comprehensive ECR response parsing and error handling

### 🎨 **Modern UI/UX**
- **Optimized Number Pad** - Custom number pad with input validation and smooth animations
- **Gesture Controls** - Swipe-to-delete, swipe-to-share for transaction management
- **Advanced Modals** - Gesture-based modals with slide, fade, and scale animations
- **Real-time Status Indicators** - Animated connection health with live monitoring
- **Performance Optimized** - Lazy inputs, virtualized lists, and debounced operations
- **Toast Notification System** - Non-intrusive user feedback with queue management
- **Tabbed Navigation** - Bottom tab navigation with Home, Dashboard, History, Receipts, Settings

### 🏗️ **Architecture & Performance**
- **Service-Oriented Architecture** - Modular services for ECR, configuration, logging, and caching
- **Advanced State Management** - Local state with hooks and context patterns
- **Error Boundary System** - Graceful error handling with recovery mechanisms
- **Multi-layer Caching** - Smart caching for device data, configurations, and transaction history
- **Background Processing** - Connection monitoring and device scanning in background
- **Memory Optimization** - Efficient component lifecycle management and cleanup

## 📂 Project Structure

```
src/
├── components/                          # UI Components
│   ├── AdvancedModal/                     # Gesture-based modal with animations
│   │   └── AdvancedModal.js                 # Advanced modal component
│   ├── AdvancedTransactions/              # Advanced transaction features
│   │   └── SplitPaymentForm.js              # Split payment configuration
│   ├── Dashboard/                         # Analytics and insights
│   │   └── Dashboard.js                     # Business dashboard with charts
│   ├── ErrorBoundary/                     # Error handling
│   │   └── ErrorBoundary.js                 # React error boundary
│   ├── NumberPad/                         # Custom number input
│   │   ├── NumberPad.js                     # Main number pad component
│   │   ├── NumberPadInput.js                # Input field with validation
│   │   ├── NumberPadModal.js                # Modal wrapper for number pad
│   │   └── index.js                         # NumberPad exports
│   ├── OptimizedComponents/               # Performance-optimized components
│   │   ├── LazyInput.js                     # Debounced input with validation
│   │   └── SwipeableCard.js                 # Swipeable list items
│   ├── Settings/                          # Configuration management
│   │   └── ConfigurationSettings.js        # App and ECR configuration
│   ├── ToastNotification/                 # Notification system
│   │   └── ToastManager.js                  # Toast notification manager
│   ├── AlertModal.js                      # Alert dialog component
│   ├── AnimatedStatusIndicator.js         # Connection status animations
│   ├── ConnectionSetup.js                 # Device connection management
│   ├── DeviceManagement.js                # Multi-device management interface
│   ├── LogViewer.js                       # Application log viewer
│   ├── ReceiptViewer.js                   # Receipt display and management
│   ├── ResponseDisplay.js                 # ECR response formatting
│   ├── TransactionForm.js                 # Payment form interface
│   └── TransactionHistory.js              # Transaction history with analytics
├── hooks/                               # Custom React Hooks
│   ├── useAlert.js                        # Alert management hook
│   ├── useOptimizedComponent.js           # Component optimization utilities
│   └── useThrottledCallback.js            # Debounced callback handling
├── screens/                             # Application Screens
│   └── HomeScreen.js                      # Main application screen with navigation
├── services/                            # Business Logic Services
│   ├── AdvancedTransactionService.js      # Advanced transaction processing
│   ├── CacheService.js                    # Multi-layer caching system
│   ├── ConfigurationManager.js            # Configuration persistence
│   ├── ConnectionMonitor.js               # Real-time connection health monitoring
│   ├── ECRService.js                      # Core ECR communication protocol
│   ├── FileLogger.js                      # Application logging service
│   ├── LRCCalculator.js                   # LRC checksum calculation
│   ├── MessageBuilder.js                  # ECR message construction
│   ├── POSReceiptService.js               # Point-of-sale receipt generation
│   ├── ReceiptService.js                  # Receipt formatting and printing
│   ├── ResponseParser.js                  # ECR response parsing
│   └── TransactionRecorder.js             # Transaction logging and export
└── utils/                               # Utility Functions
    └── Constants.js                       # Application constants and configurations
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- React Native development environment
- Android Studio (for Android development)
- Physical Android device (recommended for USB testing)

### Installation

```bash
# Clone repository
git clone https://github.com/sadiq2697/payecr.git
cd payecr

# Install dependencies
npm install

# Install additional dependencies (if needed)
npm install react-native-chart-kit  # Already included in package.json

# Run on Android
npm run android

# For iOS (if configured)
npx pod-install ios
npm run ios
```

## 🔧 Configuration

### ECR Terminal Configuration

Edit `src/utils/Constants.js`:

```javascript
export const ECR_CONSTANTS = {
  TCP_CONFIG: {
    PORT: 8080,
    TIMEOUT: 30000,
  },
  SERIAL_CONFIG: {
    BAUD_RATE: 115200,
    DATA_BITS: 8,
    STOP_BITS: 1,
    PARITY: 'none',
  },
  TIMEOUTS: {
    COMMAND: 30000,
    CONNECTION: 10000,
  },
  MESSAGE_FORMATS: {
    STX: 0x02,
    ETX: 0x03,
    // ... other protocol constants
  }
};
```

### Connection Types

1. **TCP/IP Connection**
   - Host IP address (e.g., 192.168.1.100)
   - Port number (default: 8080)
   - Connection timeout settings

2. **Serial Connection**
   - COM port selection
   - Baud rate (9600, 19200, 115200)
   - Data bits, parity, stop bits configuration

3. **USB Serial Connection**
   - USB device detection and permission handling
   - Automatic device discovery
   - Hot-plug support with auto-reconnection

## 💳 Key Features Usage

### Transaction Processing

```javascript
import { ECRService } from './services/ECRService';

const ecrService = new ECRService();

// Process a sale transaction
const saleResult = await ecrService.processTransaction({
  type: 'SALE',
  amount: 1000, // RM 10.00 in cents
  hostNumber: 'CP',
});

// Process a void transaction
const voidResult = await ecrService.processTransaction({
  type: 'VOID',
  originalTransactionId: 'TXN123456',
});
```

### Split Payment Processing

```javascript
import SplitPaymentForm from './components/AdvancedTransactions/SplitPaymentForm';

const splitConfig = {
  totalAmount: 10000, // RM 100.00
  payments: [
    { method: 'CARD', amount: 6000, terminal: 'terminal1' },
    { method: 'EWALLET', amount: 4000, terminal: 'terminal2' }
  ]
};
```

### Transaction Recording & Analytics

```javascript
import { TransactionRecorder } from './services/TransactionRecorder';

const recorder = new TransactionRecorder();

// Record transaction with full metadata
await recorder.recordTransaction(transactionData, response, {
  deviceInfo: deviceMetadata,
  location: locationData,
  cashier: cashierInfo
});

// Get transaction statistics
const stats = await recorder.getTransactionStatistics();
const history = await recorder.getTransactionHistory();

// Export transactions
await recorder.exportTransactions('CSV');
await recorder.exportTransactions('PDF');
```

### Real-time Connection Monitoring

```javascript
import ConnectionMonitor from './services/ConnectionMonitor';

const monitor = new ConnectionMonitor(ecrService);

monitor.on('healthUpdate', (health) => {
  console.log(`Connection health: ${health.isHealthy}`);
  console.log(`Latency: ${health.latency}ms`);
  console.log(`Uptime: ${health.uptime}ms`);
});

monitor.on('connectionLost', () => {
  // Handle connection loss
});

monitor.startMonitoring();
```

## 🔄 Development Workflow

### Running in Development
```bash
# Start Metro bundler
npm start

# Run on Android device
npm run android

# Debug logs
npx react-native log-android

# Clear cache if needed
npm start --reset-cache
```

### Building for Production
```bash
# Generate signed APK
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

## 📊 Analytics & Reporting

### Built-in Analytics
- **Transaction Statistics** - Success rates, average amounts, transaction types
- **Performance Metrics** - Connection uptime, response times, error rates
- **Business Insights** - Daily/weekly/monthly revenue tracking
- **Device Health** - Terminal status, connection quality, usage patterns

### Export Options
- **JSON Exports** - Complete transaction data with metadata
- **CSV Reports** - Spreadsheet-compatible transaction summaries
- **PDF Receipts** - Customer and merchant receipt generation
- **Chart Visualizations** - Line charts, pie charts for trend analysis

## 🛡️ Security & Compliance

### Data Security
- 🔒 **Local Encryption** - Transaction data encrypted using AsyncStorage
- 🔒 **Secure Communication** - TLS/SSL for TCP connections
- 🔒 **Data Masking** - Sensitive card data masked in logs
- 🔒 **Permission Management** - Device access permissions properly handled

### ECR Protocol Compliance
- ✅ **Standard ECR Protocol** - Full compliance with ECR communication standards
- ✅ **Message Validation** - LRC checksum validation for all messages
- ✅ **Error Handling** - Comprehensive response code handling
- ✅ **Timeout Management** - Configurable timeouts for all operations

## 🔧 Troubleshooting

### Common Issues

1. **USB Device Not Detected**
   - Check USB OTG adapter functionality
   - Verify device permissions in Android settings
   - Try different USB cables

2. **TCP Connection Timeouts**
   - Verify network connectivity
   - Check firewall settings on ECR terminal
   - Confirm IP address and port configuration

3. **Transaction Failures**
   - Review ECR terminal logs
   - Check message format in LRCCalculator
   - Verify terminal is in correct mode

### Debug Mode
Enable detailed logging in development:

```javascript
// Set in Constants.js
export const DEBUG_MODE = __DEV__;
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Implement changes with proper error handling
4. Add tests for new functionality
5. Update documentation
6. Commit: `git commit -m 'feat: add new feature'`
7. Push: `git push origin feature/new-feature`
8. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/sadiq2697/payecr/issues)
- 📖 **Documentation**: [Project Wiki](https://github.com/sadiq2697/payecr/wiki)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/sadiq2697/payecr/discussions)

---

**Made with ❤️ for modern payment processing**

*PayECR - Empowering businesses with reliable ECR terminal management and advanced transaction processing capabilities*
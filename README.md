# 💳 Asasii POS - Modern Point of Sale System

A high-performance React Native POS application with dual-screen support, ECR terminal integration, and advanced transaction management.

![React Native](https://img.shields.io/badge/React%20Native-0.80.2-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0.4-blue) ![Android](https://img.shields.io/badge/Android-API%2021%2B-green) ![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

## ✨ Features

### 🎯 **Core POS Functionality**
- **Modern Touch Interface** - Intuitive tablet-optimized UI with responsive design
- **Advanced Transaction Management** - Sale, void, refund, hold, and split payment support
- **Multi-Item Cart** - Add, modify, remove items with real-time totals
- **Custom Number Pad** - Quick entry for quantities, discounts, and price overrides
- **Barcode Scanning** - Integrated barcode scanning for product lookup
- **Customer Management** - Assign customers to transactions
- **Transaction History** - Complete transaction logging with search and filtering

### 🖥️ **Dual Screen Support**
- **Customer-Facing Display** - Secondary screen showing cart and totals
- **Auto-Detection** - Automatic detection and setup of secondary displays
- **Real-Time Sync** - Instant updates synchronized across both screens
- **Presentation API** - Native Android presentation display integration

### 💳 **Payment Terminal Integration**
- **ECR Terminal Support** - Full ECR protocol implementation
- **TCP/IP & Serial** - Multiple connection protocols
- **Real-Time Status** - Connection health monitoring
- **Auto-Reconnect** - Smart reconnection with exponential backoff
- **Response Parsing** - Comprehensive ECR response handling

### 🖨️ **Receipt & Printing**
- **ESC/POS Integration** - Native printer support via ESC/POS protocol
- **Custom Receipt Templates** - Configurable receipt formatting
- **Multiple Receipt Types** - Customer, merchant, and POS receipts
- **Auto-Print** - Automatic receipt printing after transactions

### 🎨 **UI/UX Excellence**
- **Performance Optimized** - React.memo, useMemo, and FlatList for smooth scrolling
- **Kiosk Mode** - Full-screen immersive mode for retail environments
- **Dark/Light Themes** - Customizable color schemes
- **Gesture Controls** - Swipe and touch gestures for common actions
- **Toast Notifications** - Non-intrusive user feedback
- **Error Boundaries** - Graceful error handling with recovery

### 🏗️ **Architecture**
- **TypeScript** - Type-safe React components and services
- **Context API** - Modern state management with React Context
- **Service Layer** - Modular services for ECR, printer, configuration
- **Navigation** - React Navigation with stack and tab navigators
- **File Logging** - Comprehensive application logging

## 📂 Project Structure

```
src/
├── components/                    # UI Components
│   ├── Dashboard/                   # Dashboard cards and widgets
│   ├── NumberPad/                   # Custom number pad with modal
│   ├── Settings/                    # Configuration components
│   ├── ToastNotification/           # Toast notification system
│   ├── UI/                          # Reusable UI components
│   ├── DeviceManagement.js          # Device management interface
│   ├── PrinterManagement.js         # Printer configuration
│   ├── ReceiptViewer.js             # Receipt display
│   └── TransactionHistory.js        # Transaction history viewer
├── contexts/                      # React Context Providers
│   ├── ConfigContext.tsx            # App configuration
│   ├── ECRContext.tsx               # ECR terminal state
│   ├── PrinterContext.tsx           # Printer state
│   └── TransactionContext.tsx       # Transaction state
├── hooks/                         # Custom React Hooks
│   ├── useAlert.js                  # Alert management
│   └── useOptimizedComponent.js     # Performance optimization
├── navigation/                    # Navigation Configuration
│   └── RootNavigator.tsx            # Stack navigator setup
├── providers/                     # Context Providers Wrapper
│   └── AppProviders.tsx             # Combined providers
├── screens/                       # Application Screens
│   ├── SplashScreen.tsx             # App splash screen
│   ├── LoginScreen.tsx              # Cashier login
│   ├── index.tsx                    # Main POS screen
│   ├── CustomerSelectScreen.tsx     # Customer selection
│   ├── DiscountScreen.tsx           # Apply discounts
│   ├── PriceOverrideScreen.tsx      # Price override
│   ├── ProductLookupScreen.tsx      # Product search
│   ├── HoldTransactionScreen.tsx    # Held transactions
│   ├── PaymentScreen.tsx            # Payment processing
│   ├── ReceiptScreen.tsx            # Receipt display
│   ├── SettingsScreen.tsx           # App settings
│   └── CustomerDisplayScreen.tsx    # Secondary screen display
├── services/                      # Business Logic Services
│   ├── ECRService.js                # ECR communication
│   ├── PrinterService.js            # Printer integration
│   ├── DualScreenManager.ts         # Dual screen management
│   ├── KioskModeService.js          # Kiosk mode control
│   ├── ConfigurationManager.js      # Configuration persistence
│   ├── ConnectionMonitor.js         # Connection health monitoring
│   ├── FileLogger.js                # File logging service
│   ├── POSReceiptService.js         # POS receipt generation
│   ├── ReceiptService.js            # Receipt formatting
│   ├── TransactionRecorder.js       # Transaction logging
│   ├── MessageBuilder.js            # ECR message construction
│   └── ResponseParser.js            # ECR response parsing
└── utils/                         # Utility Functions
    └── Constants.js                 # App constants and config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- React Native development environment
- Android Studio (for Android)
- Physical Android device (recommended)

### Installation

```bash
# Clone repository
git clone https://github.com/asasii/pos-app.git
cd pos-app

# Install dependencies
npm install

# Run on Android
npm run android

# For iOS (if configured)
npx pod-install ios
npm run ios
```

## 🔧 Configuration

### POS Settings

Edit `src/utils/Constants.js`:

```javascript
export const POS_CONFIG = {
  STORE_NAME: 'ENTERPRISE POS',
  STORE_ID: 'HQ-001',
  REGISTER_ID: 'POS-03',
  TAX_RATE: 0.085, // 8.5%
  CURRENCY: 'RM',
};

export const ECR_CONFIG = {
  TCP: {
    HOST: '192.168.1.100',
    PORT: 8080,
    TIMEOUT: 30000,
  },
  SERIAL: {
    BAUD_RATE: 115200,
    DATA_BITS: 8,
    STOP_BITS: 1,
    PARITY: 'none',
  },
};
```

## 💡 Usage

### Basic Transaction Flow

1. **Login** - Cashier authentication
2. **Add Items** - Scan barcodes or search products
3. **Modify Cart** - Adjust quantities, apply discounts
4. **Customer** - Assign customer (optional)
5. **Payment** - Process payment via ECR terminal
6. **Receipt** - Auto-print receipt

### Advanced Features

#### Split Payment
```javascript
// Navigate to split payment screen
navigation.navigate('Payment', {
  enableSplitPayment: true
});
```

#### Hold Transaction
```javascript
// Hold current transaction for later
await TransactionRecorder.holdTransaction(cart);

// Recall held transaction
const heldTransaction = await TransactionRecorder.getHeldTransaction(id);
```

#### Return/Refund
```javascript
// Toggle return mode
setIsReturnMode(true);
// All quantities become negative for refund
```

## 🔄 Development

### Running in Development
```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# View logs
npx react-native log-android

# Clear cache
npm start --reset-cache
```

### Building for Production
```bash
# Generate signed APK
cd android
./gradlew assembleRelease

# APK output:
# android/app/build/outputs/apk/release/app-release.apk
```

## 🎯 Performance Optimizations

- **React.memo** - Memoized components to prevent unnecessary re-renders
- **useMemo** - Cached expensive calculations (subtotal, tax, total)
- **useCallback** - Stable callback references
- **FlatList** - Virtualized list rendering for cart items
- **Debouncing** - 300ms debounce for customer display updates
- **Lazy Loading** - Code splitting for screens
- **removeClippedSubviews** - Improved scrolling performance

## 🖨️ Printer Setup

### Supported Printers
- ESC/POS compatible thermal printers
- USB, Bluetooth, and Network printers
- 58mm and 80mm paper sizes

### Configuration
```javascript
const printerConfig = {
  type: 'USB', // or 'BLUETOOTH', 'NETWORK'
  paperWidth: 58, // or 80
  encoding: 'UTF-8',
};
```

## 🖥️ Dual Screen Setup

### Hardware Requirements
- Android device with secondary display support
- HDMI adapter or wireless display
- Android 8.0+ (API 26+)

### Configuration
```javascript
// Auto-detect and show customer display
await DualScreenManager.showCustomerDisplay(displayId);

// Update display content
await DualScreenManager.updateCustomerDisplay({
  cart,
  subtotal,
  tax,
  total,
});
```

## 🔐 Security

- **Local Storage Encryption** - Sensitive data encrypted via AsyncStorage
- **Kiosk Mode** - Prevents unauthorized access
- **Activity Timeout** - Auto-logout after inactivity
- **Permission Management** - Proper Android permissions
- **Data Masking** - Card data masked in logs

## 🛠️ Troubleshooting

### Common Issues

**App crashes on startup**
- Clear cache: `npm start --reset-cache`
- Reinstall: `npm install && npm run android`

**Dual screen not working**
- Check Android version (8.0+)
- Verify display permissions
- Restart secondary display

**Printer not connecting**
- Check USB/Bluetooth permissions
- Verify printer compatibility
- Test with different cable/adapter

**ECR terminal timeout**
- Verify network connectivity
- Check IP/port configuration
- Review terminal logs

## 📦 Dependencies

### Core
- `react-native` 0.80.2
- `react` 19.1.0
- `typescript` 5.0.4

### Navigation
- `@react-navigation/native` ^7.1.17
- `@react-navigation/stack` ^7.4.7
- `@react-navigation/bottom-tabs` ^7.4.6

### UI
- `react-native-paper` ^5.14.5
- `lucide-react-native` ^0.548.0
- `react-native-safe-area-context` ^5.6.0
- `react-native-gesture-handler` ^2.28.0

### Utilities
- `@react-native-async-storage/async-storage` ^2.2.0
- `react-native-tcp-socket` ^6.3.0
- `react-native-chart-kit` ^6.12.0

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/asasii/pos-app/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/asasii/pos-app/discussions)

---

**Built with ❤️ for modern retail**

*Asasii POS - Enterprise-grade point of sale solution*

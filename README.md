# 💳 PayECR - Advanced ECR Payment Terminal App

A modern React Native application for managing ECR (Electronic Cash Register) payment terminals with advanced features, GitHub-based auto-updates, and real-time communication.

![React Native](https://img.shields.io/badge/React%20Native-0.80.2-blue) ![Android](https://img.shields.io/badge/Android-API%2021%2B-green) ![GitHub](https://img.shields.io/badge/Updates-GitHub%20Releases-orange)

## ✨ Features

### 🔌 **Multi-Connection Support**
- **TCP/IP Connection** - Network-based terminal communication
- **USB Serial Connection** - Direct USB device communication with OTG support
- **Auto-reconnect** - Smart reconnection when devices come online
- **Multi-terminal management** - Connect to multiple terminals simultaneously
- **Real-time monitoring** - Live connection status tracking

### 💳 **Advanced Payment Processing**
- **Card Payments** - Credit/Debit card transactions with full ECR protocol
- **E-Wallet Support** - Digital wallet payments with QR code scanning
- **DuitNow Integration** - Malaysian instant payment system
- **Split Payments** - Divide payments across multiple methods
- **Partial Refunds** - Process partial refunds with original transaction reference
- **Transaction Templates** - Save frequently used transaction configurations
- **Batch Processing** - Handle multiple transactions efficiently

### 🎨 **Modern UI/UX**
- **Custom Number Pad** - No system keyboard interference, optimized for payments
- **Gesture Controls** - Swipe actions for device management and quick access
- **Real-time Status** - Animated connection indicators with health monitoring
- **Dark/Light Themes** - Adaptive UI themes with user preference
- **Performance Optimized** - Virtualized lists, lazy loading, and optimized rendering
- **Toast Notifications** - Non-blocking user feedback system

### 🚀 **GitHub Auto-Updates**
- **Release-based Updates** - Automatic checks for new GitHub releases
- **APK Direct Download** - Direct APK download from GitHub releases
- **User Consent Required** - All updates require explicit user approval
- **Critical Update Alerts** - Priority notifications for security updates
- **Version Management** - Smart version comparison and update recommendations

### 🔧 **Advanced Features**
- **State Management** - Redux Toolkit with persistent storage
- **Background Monitoring** - Real-time device status tracking
- **Advanced Caching** - Multi-layer caching system for better performance
- **Error Boundaries** - Graceful error handling with recovery options
- **Analytics Dashboard** - Transaction analytics and business insights
- **Offline Support** - Limited functionality when offline

## 📱 Quick Start

### Prerequisites
- Node.js 18+
- React Native development environment
- Android Studio (for Android)
- Xcode (for iOS, optional)

### Installation

```bash
# Clone repository
git clone https://github.com/sadiq2697/payecr.git
cd payecr

# Install dependencies
npm install

# iOS setup (if needed)
cd ios && pod install && cd ..

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## 🔧 Configuration

### 1. GitHub Auto-Updates Setup

Update `src/services/UpdateService.js`:
```javascript
this.GITHUB_REPO = 'sadiq2697/payecr'; // Your GitHub repository
```

### 2. ECR Terminal Configuration

Edit `src/utils/Constants.js`:
```javascript
export const ECR_CONSTANTS = {
  TCP_CONFIG: {
    PORT: 8080,
    TIMEOUT: 30000,
  },
  SERIAL_CONFIG: {
    BAUD_RATE: 115200,
  },
  // ... other configurations
};
```

### 3. Release Management

Create GitHub releases for auto-updates:

1. **Create Release** with semantic versioning (`v1.2.3`)
2. **Upload APK** file to release assets
3. **Add Release Notes** describing changes
4. **Tag Critical Updates** using keywords like "security" or "critical"

Users will automatically receive update notifications!

## 💳 Advanced Transaction Features

### Split Payments
```javascript
import { processSplitPayment } from './services/AdvancedTransactionService';

const splitConfig = {
  totalAmount: 10000, // RM 100.00
  payments: [
    { method: 'card', amount: 6000 },     // RM 60.00 card
    { method: 'ewallet', amount: 4000 }   // RM 40.00 e-wallet
  ]
};

const result = await processSplitPayment(splitConfig);
```

### Partial Refunds
```javascript
import { processPartialRefund } from './services/AdvancedTransactionService';

const refundConfig = {
  originalTransactionId: 'TXN123456',
  originalAmount: 10000,  // RM 100.00
  refundAmount: 3000,     // RM 30.00 partial refund
  reason: 'Partial return'
};

const result = await processPartialRefund(refundConfig);
```

### Transaction Templates
```javascript
import { saveTransactionTemplate } from './services/TemplateService';

const template = {
  name: 'Coffee Sale',
  amount: 450,  // RM 4.50
  category: 'F&B',
  tax: 0.06,
  quickAccess: true
};

await saveTransactionTemplate(template);
```

## 📂 Project Structure

```
src/
├── components/                     # React Native components
│   ├── AdvancedTransactions/          # Split payments, partial refunds
│   ├── ConnectionSetup.js             # Connection management
│   ├── TransactionForm.js             # Payment forms
│   ├── NumberPad/                     # Custom number pad
│   ├── Dashboard/                     # Analytics dashboard
│   ├── Settings/                      # App settings including updates
│   └── OptimizedComponents/           # Performance-optimized components
├── services/                       # Business logic services
│   ├── ECRService.js                  # Core ECR communication
│   ├── UpdateService.js               # GitHub-based auto-updates
│   ├── AdvancedTransactionService.js  # Split payments, partial refunds
│   ├── TemplateService.js             # Transaction templates
│   └── CacheService.js                # Advanced caching system
├── store/                          # Redux store
│   └── slices/                        # Redux Toolkit slices
├── hooks/                          # Custom React hooks
├── utils/                          # Utility functions
└── screens/                        # App screens
```

## 🔄 GitHub Release Process

### 1. Build Release APK
```bash
cd android
./gradlew assembleRelease
```

### 2. Create GitHub Release
- Go to your GitHub repository
- Click "Releases" → "Create a new release"
- Tag: `v1.2.3` (semantic versioning)
- Title: `PayECR v1.2.3 - Feature Description`
- Upload your APK file
- Add detailed release notes

### 3. Release Notes Format
```markdown
## What's New in v1.2.3

### ✨ New Features
- Split payment support for multiple payment methods
- Advanced transaction analytics dashboard
- Improved connection stability

### 🐛 Bug Fixes
- Fixed auto-reconnect issue with USB devices
- Resolved number pad input validation

### 🔒 Security Updates
- Updated ECR protocol security implementation
- Enhanced data encryption for transactions

### 📱 Improvements
- Faster transaction processing
- Better error messages
- UI/UX enhancements
```

## 🔐 Security & Compliance

### Auto-Update Security
- ✅ **User Consent Required** - All updates need explicit approval
- ✅ **HTTPS Only** - All API calls use secure connections
- ✅ **GitHub Releases Only** - Downloads only from official releases
- ✅ **Signature Validation** - APK signature verification
- ✅ **No Silent Installs** - Transparent update process

### Payment Security
- 🔒 **PCI DSS Compliant** - Follows payment card industry standards
- 🔒 **Data Masking** - Sensitive data masked in logs
- 🔒 **Secure Communication** - Encrypted ECR protocol
- 🔒 **Local Storage Encryption** - Transaction data encrypted
- 🔒 **Access Controls** - Role-based access management

## 📊 Analytics & Reporting

### Business Insights
- Daily/Weekly/Monthly transaction reports
- Payment method distribution analysis
- Terminal performance monitoring
- Revenue tracking and forecasting
- Customer transaction patterns

### Export Options
- PDF reports with transaction summaries
- CSV exports for accounting systems
- Real-time dashboard with live metrics
- Automated email reports (optional)

## 🛠️ Development

### Running in Development
```bash
# Start Metro bundler
npm start

# Run on Android device
npm run android

# Run on iOS device (if configured)
npm run ios

# Run tests
npm test

# Lint code
npm run lint
```

### Building for Production
```bash
# Android Release Build
cd android
./gradlew assembleRelease

# Find APK at:
# android/app/build/outputs/apk/release/app-release.apk

# iOS Release Build (if configured)
npx react-native build-ios --mode Release
```

## 📱 Usage Flow

### 1. Device Connection
- Select connection type (TCP/IP or USB Serial)
- Configure connection parameters
- Connect to ECR terminal
- Monitor real-time connection status

### 2. Transaction Processing
- Choose transaction type and payment method
- Enter amount using custom number pad
- Process payment through ECR terminal
- View detailed transaction results
- Optional receipt printing

### 3. Advanced Features
- Set up split payments for multiple methods
- Process partial refunds with original transaction reference
- Use transaction templates for quick access
- View analytics and business insights

### 4. Auto-Updates
- Receive notifications for new releases
- Review release notes and changes
- Choose update method (GitHub or direct download)
- Install updates with user consent

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Implement your changes
4. Add tests for new functionality
5. Commit: `git commit -m 'feat: add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/sadiq2697/payecr/issues)
- 📖 **Wiki**: [Documentation](https://github.com/sadiq2697/payecr/wiki)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/sadiq2697/payecr/discussions)

## 🎯 Roadmap

### Upcoming Features
- [ ] Cloud synchronization for multi-device setup
- [ ] Advanced reporting with AI insights
- [ ] Integration with accounting software
- [ ] Voice commands for hands-free operation
- [ ] NFC payment support
- [ ] Multi-language support
- [ ] White-label customization options

---

**Made with ❤️ for modern payment processing**

*PayECR - Empowering businesses with advanced payment terminal management*
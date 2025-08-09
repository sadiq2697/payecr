# PAYECR Test App
React Native Android app for testing ECR terminal communication with Paysys terminals.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen) ![React Native](https://img.shields.io/badge/React%20Native-0.80.2-blue) ![Android](https://img.shields.io/badge/Android-API%2021%2B-green)

## Requirements
- React Native 0.80.2 or higher
- Android API level 21 or higher
- Physical Android device with USB OTG support for serial communication
- Node.js 14+ and Android Studio with SDK

## Getting started
- [Learn how to test ECR terminals](#usage)
- [Add PAYECR Test App to your device](#installation) 
- [Try serial and TCP communication](#terminal-setup)
- [Try it out using Android Studio](https://developer.android.com/studio)

## Documentation
- [PAYECR Test App reference](#project-structure)
- [Transaction types guide](#transaction-commands) 
- [ECR protocol documentation](#ecr-protocol)
- [Android native modules](#native-modules)

## Features
- **Dual Communication**: Serial (USB OTG) and TCP/IP support
- **Complete Transaction Set**: Sale, Void, Refund, Pre-Auth, Settlement, Echo Test
- **Real-time Logging**: Live hex viewer with parsed response fields
- **LRC Verification**: Automatic checksum calculation and validation
- **Response Parsing**: Structured display of all transaction data
- **Connection Management**: Auto-detection and status monitoring

## Examples

### Basic Usage Flow
```javascript
import { ECRService } from './src/services/ECRService';

// Initialize service
const ecrService = new ECRService();

// Connect via TCP
await ecrService.connectTCP({
  host: '192.168.1.100',
  port: 88,
  timeout: 5000
});

// Perform sale transaction
const result = await ecrService.performSale({
  hostNo: '00',
  amount: 1099, // RM 10.99 in cents
  additionalData: 'Test Sale'
});

console.log('Transaction result:', result);
```

### Serial Connection Example
```javascript
// Connect via USB OTG Serial
await ecrService.connectSerial({
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 0 // NONE
});

// Check available serial ports
const ports = await ecrService.getAvailableSerialPorts();
console.log(`Available ports: ${ports.count}`);
```

### Transaction Examples
```javascript
// Sale Transaction
const saleResult = await ecrService.performSale({
  hostNo: '00',        // Auto-select host
  amount: 2500,        // RM 25.00
  additionalData: 'POS Sale'
});

// Void Transaction
const voidResult = await ecrService.performVoid({
  hostNo: '00',
  traceNumber: '123456',
  additionalData: 'Cancel Sale'
});

// Refund Transaction
const refundResult = await ecrService.performRefund({
  hostNo: '00',
  amount: 1500,        // Refund RM 15.00
  originalAmount: 2500, // From original RM 25.00 sale
  additionalData: 'Customer Return'
});

// Settlement
const settlementResult = await ecrService.performSettlement({
  hostNo: '00'
});

// Echo Test
const echoResult = await ecrService.performEchoTest();
```

## Installation

### 1. Clone and Install
```bash
git clone https://github.com/sadiq2697/payecr.git
cd payecr
npm install
```

### 2. Android Dependencies
Add to `android/app/build.gradle`:
```gradle
dependencies {
    implementation 'com.github.mik3y:usb-serial-for-android:3.4.6'
}
```

Add to the end of `android/app/build.gradle`:
```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

### 3. Permissions
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-feature android:name="android.hardware.usb.host" />
```

### 4. Environment Setup
```bash
export ANDROID_HOME=/path/to/android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 5. Run Development
```bash
npx react-native run-android
```

### 6. Build Release
```bash
cd android
./gradlew assembleRelease
# Find APK at: android/app/build/outputs/apk/release/app-release.apk
```

## Terminal Setup

### TCP Mode Configuration
```javascript
const tcpConfig = {
  host: '192.168.1.100',    // Terminal IP (static recommended)
  port: 88,                 // Standard ECR port
  timeout: 5000             // Connection timeout in ms
};

// Test connection before establishing
const testResult = await ecrService.testTCPConnection(tcpConfig);
if (testResult.success) {
  await ecrService.connectTCP(tcpConfig);
}
```

### Serial Mode Configuration  
```javascript
const serialConfig = {
  baudRate: 9600,           // Standard baud rate
  dataBits: 8,              // Data bits
  stopBits: 1,              // Stop bits  
  parity: 0                 // 0 = NONE, 1 = ODD, 2 = EVEN
};

// Check available ports first
const ports = await ecrService.getAvailableSerialPorts();
if (ports.count > 0) {
  await ecrService.connectSerial(serialConfig);
}
```

## Usage

### App Interface
1. **Connection Setup**: Choose TCP or Serial, configure parameters
2. **Status Monitoring**: Real-time connection status with visual indicators
3. **Transaction Form**: Select transaction type and enter required fields
4. **Response Display**: View parsed transaction results and raw hex data
5. **Communication Log**: Monitor all ECR communication with filtering

### Host Number Options
| Host Code | Description | Use Case |
|-----------|-------------|----------|
| `00` | Auto Select | Let terminal choose payment method |
| `CP` | Card Only | Force card payment only |
| `QR` | QR Only | QR/Wallet payments only |
| `DN` | DuitNow QR | Specific to DuitNow QR |
| `01-99` | Specific Host | Direct host routing |

## Transaction Commands

| Command | Type | Required Fields | Response Code |
|---------|------|-----------------|---------------|
| C200 | Sale | Amount, Host Number | R200 |
| C201 | Void | Trace Number, Host Number | R201 |
| C203 | Refund | Amount, Original Amount, Host Number | R203 |
| C100 | Pre-Auth | Amount, Host Number | R100 |
| C500 | Settlement | Host Number | R500 |
| C902 | Echo Test | None | R902 |
| C910 | Read Card | None | R910 |
| C290 | Wallet Sale | Amount, QR Code, Host Number | R290 |

## ECR Protocol

### Message Structure
```
STX + Message Content + ETX + LRC
```
- **STX**: Start of Text (0x02)
- **ETX**: End of Text (0x03)  
- **LRC**: XOR checksum of message content + ETX

### Communication Flow
```
1. Host → Terminal: ENQ
2. Terminal → Host: ACK
3. Host → Terminal: Command Message
4. Terminal → Host: ACK
5. Terminal → Host: ENQ
6. Host → Terminal: ACK
7. Terminal → Host: Response Message
8. Host → Terminal: ACK
9. Terminal → Host: EOT
```

### Example Message
```javascript
// Sale command for RM 10.99
const message = 'C2000000000001099                        ';
const wrappedMessage = '\x02' + message + '\x03' + lrcByte;

// Hex representation: 02 43 32 30 30 30 30 30 30 30 30 30 30 31 30 39 39 ... 03 XX
```

## Project Structure
```
src/
├── components/           # UI Components
│   ├── ConnectionSetup.js    # TCP/Serial connection management
│   ├── TransactionForm.js    # Transaction input form
│   ├── ResponseDisplay.js    # Response parsing and display
│   └── LogViewer.js         # Communication log viewer
├── screens/             # App Screens  
│   └── HomeScreen.js        # Main application screen
├── services/            # Core ECR Logic
│   ├── ECRService.js        # Main service class
│   ├── MessageBuilder.js    # Command message construction
│   ├── ResponseParser.js    # Response parsing logic
│   └── LRCCalculator.js     # Checksum calculation
├── utils/               # Constants and Helpers
│   └── Constants.js         # ECR protocol constants
└── android/             # Native Modules
    ├── ECRSerialModule.java # Serial communication
    └── ECRTcpModule.java    # TCP communication
```

## Native Modules

### ECRSerialModule
- `openSerial(config)`: Open serial connection
- `closeSerial()`: Close serial connection  
- `writeData(data)`: Write data to serial port
- `readData()`: Read data from serial port
- `getAvailablePorts()`: List available USB serial devices
- `isConnected()`: Check connection status

### ECRTcpModule  
- `connect(config)`: Connect to TCP endpoint
- `disconnect()`: Close TCP connection
- `send(data)`: Send data via TCP
- `receive()`: Receive data from TCP
- `testConnection(config)`: Test TCP connectivity
- `isConnected()`: Check connection status

## Response Parsing

### Sale Response (R200)
```javascript
{
  success: true,
  transactionType: 'SALE',
  responseCode: 'R200',
  cardNumber: '411111******1111',
  expiryDate: '1225',
  statusCode: '00',
  approvalCode: '123456',
  rrn: '202301011234',
  transactionTrace: '000001',
  batchNumber: '000001',
  hostNo: '00',
  terminalId: 'T1234567',
  merchantId: '123456789012345',
  cardType: '01',
  isApproved: true,
  statusDescription: 'Approved'
}
```

### Settlement Response (R500)
```javascript
{
  success: true,
  transactionType: 'SETTLEMENT',
  responseCode: 'R500', 
  hostNo: '00',
  statusCode: '00',
  batchNumber: '000001',
  batchCount: '025',
  batchAmount: '000000125099',
  isApproved: true,
  statusDescription: 'Approved'
}
```

## Troubleshooting

### Serial Connection Issues
```bash
# Check USB permissions
adb shell dumpsys usb

# Verify device detection  
adb logcat | grep -i usb

# Common solutions:
# 1. Use quality USB OTG cable
# 2. Grant USB permissions when prompted  
# 3. Restart app after connecting cable
# 4. Check terminal is in ECR mode
```

### TCP Connection Issues
```bash
# Test network connectivity
ping 192.168.1.100

# Check port availability
telnet 192.168.1.100 88
nc -zv 192.168.1.100 88

# Common solutions:
# 1. Ensure terminal and device on same network
# 2. Use static IP for terminal
# 3. Check firewall settings
# 4. Verify terminal ECR mode and port 88
```

### LRC Checksum Errors
- Verify terminal LRC mode matches app (XOR vs ISO 1155)
- Check for data corruption in logs using hex viewer
- Confirm baud rate settings match (9600)
- Try different USB cable if using serial

### Build and Runtime Issues
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx react-native run-android

# Clear React Native cache
npx react-native start --reset-cache

# Check native module linking
npx react-native doctor
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Testing
```javascript
// Echo test for connectivity
const echoResult = await ecrService.performEchoTest();
console.log('Echo test:', echoResult.success ? 'PASSED' : 'FAILED');

// Connection status check
const isConnected = await ecrService.checkConnection(); 
console.log('Connection status:', isConnected);
```

### Debug Logging
Enable detailed logging in ECRService:
```javascript
// Check communication log
const logs = ecrService.getCommunicationLog();
logs.forEach(log => {
  console.log(`[${log.level}] ${log.timestamp}: ${log.message}`);
});
```

## Configuration Options

### ECR Constants Configuration
```javascript
// Modify src/utils/Constants.js for custom settings
export const ECR_CONSTANTS = {
  // Serial settings
  SERIAL_BAUD_RATE: 9600,  // Note: actual constant name
  SERIAL_DATA_BITS: 8,
  SERIAL_PARITY: 'none',
  SERIAL_STOP_BITS: 1,
  
  // TCP settings  
  TCP_PORT: 88,
  
  // Timeouts
  ENQ_TIMEOUT: 3000,
  COMMAND_TIMEOUT: 5000,
  RESPONSE_TIMEOUT: 120000,
  ACK_TIMEOUT: 2000,
  
  // Retry counts
  ENQ_RETRY_COUNT: 3,
  COMMAND_RETRY_COUNT: 3
};
```

## Security Considerations
- All sensitive card data is masked in logs by default
- Communication logs can be cleared after testing
- Use HTTPS for any remote log transmission
- Follow PCI DSS guidelines for production deployment
- Terminal should be in secure, controlled environment

## Contributing
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Commit with conventional format: `feat: add new transaction type`
6. Push to branch: `git push origin feature/new-feature`
7. Open Pull Request with detailed description

## Support
For issues and questions:
- Check existing GitHub issues
- Review troubleshooting section
- Enable debug logging for detailed error information
- Test with echo command to verify basic connectivity

---

**Version**: 1.0.0  
**Last Updated**: 2025  
**Compatible Terminals**: Payment terminals with ECR protocol support
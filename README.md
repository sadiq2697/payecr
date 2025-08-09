# PAYECR Test App
React Native Android app for testing ECR terminal communication.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen) ![React Native](https://img.shields.io/badge/React%20Native-0.80.2-blue)

## Requirements
The minimum supported React Native version is 0.80.2. Android API level 21 or higher required. Physical Android device with USB OTG support needed for serial communication.

## Getting started
- [Learn how to test ECR terminals](#usage)
- [Add PAYECR Test App to your device](#installation) 
- [Try serial and TCP communication](#terminal-setup)
- [Try it out using Android Studio](https://developer.android.com/studio)

## Documentation
- [PAYECR Test App reference](#project-structure)
- [Transaction types guide](#transaction-commands) 
- [ECR protocol documentation](#troubleshooting)
- [Android native modules](#project-structure)

## Examples

### Minimal setup
First, install dependencies and set up your environment.

```bash
npm install
```

### Using Serial Communication
```javascript
// Configure serial connection
const serialConfig = {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1
};

const ECRTest = () => {
  const [connection, setConnection] = useState(null);
  const [transaction, setTransaction] = useState(null);

  const handleConnect = async () => {
    try {
      // Connect via USB OTG
      const conn = await ECRService.connectSerial(serialConfig);
      setConnection(conn);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleSale = async (amount, reference) => {
    if (!connection) return;

    try {
      // Send sale transaction
      const result = await ECRService.sendTransaction({
        command: 'C200',
        amount: amount,
        reference: reference
      });
      
      setTransaction(result);
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  return (
    <View>
      <Button title="Connect Serial" onPress={handleConnect} />
      <Button 
        title="Process Sale" 
        onPress={() => handleSale(1099, 'REF123')}
        disabled={!connection}
      />
      {transaction && (
        <Text>Result: {transaction.responseCode}</Text>
      )}
    </View>
  );
};
```

### Using TCP Communication
```javascript
// Configure TCP connection
const tcpConfig = {
  host: '192.168.1.100',
  port: 88,
  timeout: 30000
};

const ECRTestTCP = () => {
  const [connection, setConnection] = useState(null);

  const handleConnect = async () => {
    try {
      // Connect via TCP/IP
      const conn = await ECRService.connectTCP(tcpConfig);
      setConnection(conn);
    } catch (error) {
      console.error('TCP connection failed:', error);
    }
  };

  const handleEchoTest = async () => {
    if (!connection) return;

    try {
      // Send echo test
      const result = await ECRService.sendTransaction({
        command: 'C902'
      });
      
      console.log('Echo test result:', result);
    } catch (error) {
      console.error('Echo test failed:', error);
    }
  };

  return (
    <View>
      <Button title="Connect TCP" onPress={handleConnect} />
      <Button 
        title="Echo Test" 
        onPress={handleEchoTest}
        disabled={!connection}
      />
    </View>
  );
};
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

### 3. Environment Setup
Set your Android SDK path:
```bash
export ANDROID_HOME=/path/to/android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 4. Run on Device
```bash
npx react-native run-android
```

### 5. Build Release
```bash
cd android
./gradlew assembleRelease
# Find APK at: android/app/build/outputs/apk/release/app-release.apk
```

## Terminal Setup

### TCP Mode
```javascript
const tcpSetup = {
  terminal: {
    ip: '192.168.1.100', // Static IP
    port: 88,
    network: 'same as Android device'
  }
};
```

### Serial Mode
```javascript
const serialSetup = {
  hardware: 'USB OTG cable + adapter',
  settings: {
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1
  },
  permissions: 'Grant USB access on Android'
};
```

## Usage

1. **Start the app** on your Android device
2. **Choose connection type** (TCP or Serial)
3. **Enter parameters** (IP/port or serial settings)
4. **Connect to terminal**
5. **Select transaction type**
6. **Fill required fields**
7. **Send transaction**
8. **View response** in logs with hex data

## Transaction Commands

| Command | Type | Required Fields | Example |
|---------|------|-----------------|---------|
| C200 | Sale | Amount, Reference | `{amount: 1099, reference: 'REF123'}` |
| C201 | Void | Original TX ID | `{originalTxId: 'TX12345'}` |
| C203 | Refund | Amount, Original TX ID | `{amount: 599, originalTxId: 'TX12345'}` |
| C100 | Pre-Auth | Amount, Reference | `{amount: 2000, reference: 'AUTH456'}` |
| C500 | Settlement | None | `{}` |
| C902 | Echo Test | None | `{}` |

## Configuration Options

```javascript
const ecrConfig = {
  // Connection settings
  connection: {
    type: 'tcp', // or 'serial'
    timeout: 30000
  },
  
  // TCP settings
  tcp: {
    host: '192.168.1.100',
    port: 88
  },
  
  // Serial settings
  serial: {
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1
  },
  
  // Protocol settings
  protocol: {
    lrcMode: 'xor', // or 'iso1155'
    hostMode: 'auto' // 'card-only', 'qr-only', or specific
  },
  
  // Logging
  logging: {
    level: 'debug', // 'info', 'success', 'warning', 'error'
    exportEnabled: true
  }
};
```

## Project Structure
```
src/
├── components/         # UI components
│   ├── TransactionForm.js
│   ├── LogViewer.js
│   └── ConnectionStatus.js
├── screens/           # App screens
│   ├── HomeScreen.js
│   ├── TransactionScreen.js
│   └── LogScreen.js
├── services/          # Core ECR logic
│   ├── ECRService.js
│   ├── MessageBuilder.js
│   ├── ResponseParser.js
│   └── LRCCalculator.js
├── utils/             # Constants and helpers
│   ├── Constants.js
│   └── Helpers.js
└── android/           # Native modules
    ├── ECRSerialModule.java
    └── ECRTcpModule.java
```

## Troubleshooting

**Serial connection issues**
```bash
# Check USB permissions
adb shell dumpsys usb

# Verify cable connection
# Ensure USB OTG adapter is working
# Grant USB permissions when prompted
```

**TCP connection fails**
```bash
# Test network connectivity
ping 192.168.1.100

# Check port availability
telnet 192.168.1.100 88

# Verify terminal is in ECR mode
```

**LRC checksum errors**
- Ensure LRC mode matches terminal settings (XOR vs ISO 1155)
- Check hex data in logs for corruption
- Verify baud rate settings

**Build errors**
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## Testing
Run unit tests:
```bash
npm test
```

Test with echo command:
```javascript
const echoTest = async () => {
  const result = await ECRService.sendTransaction({
    command: 'C902'
  });
  console.log('Echo response:', result);
};
```

## TypeScript Support
ECR Terminal Test App includes TypeScript declarations for all ECR communication methods and transaction types.

## Contributing
If you would like to contribute to ECR Terminal Test App, please make sure to read our contributor guidelines.
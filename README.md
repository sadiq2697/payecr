# PAYECR Test App — ECR Terminal Communication

A React Native Android app for testing ECR terminal communication.
Built with React Native 0.80.2.
Supports Serial (USB OTG) and TCP/IP.

# Key facts

* React Native 0.80.2
* Android target API 21 or higher
* Serial RS232 over USB OTG and TCP socket transport
* Transaction types: Sale, Void, Refund, Pre-Auth, Settlement, Echo Test
* Live log viewer with raw hex and parsed fields
* LRC checksum calculation and verification

# Quick start

## Requirements

* Node.js 14 or higher
* React Native 0.80.2 project files
* Android Studio with SDK and platform tools
* JDK 17
* Physical Android device with USB OTG for serial tests
* ECR terminal set to ECR mode

## Install

```bash
git clone <repository-url>
cd ECRTestApp
npm install
```

## Run on device

```bash
npx react-native run-android
```

## Build release

```bash
cd android
./gradlew assembleRelease
```

APK path: `android/app/build/outputs/apk/release/app-release.apk`

# Android dependencies

Add this to `android/app/build.gradle` under dependencies:

```gradle
implementation 'com.github.mik3y:usb-serial-for-android:3.4.6'
```

Add vector fonts loader:

```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

# Environment

Add to your shell profile:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

# App configuration

* TCP: IP address, port, timeout
* Serial: baud rate and connection params
* Host mode: auto, card-only, QR-only, or specific host
* LRC mode: XOR or ISO 1155 two's complement

# Terminal setup

## TCP mode

* Set terminal to a static IP
* Use port 88 by default
* Put terminal and device on same network

## Serial mode

* Use USB OTG cable and adapter
* Terminal serial settings:

  * Baud rate 9600
  * Data bits 8
  * Parity none
  * Stop bits 1
* Grant USB permission on device

# Usage

1. Start the app on your Android device
2. Select connection type: TCP or Serial
3. Enter connection parameters
4. Connect to the terminal
5. Choose a transaction type
6. Fill required fields
7. Send the transaction
8. Inspect logs and parsed response

# ECR protocol summary

## Frame structure

STX + payload + ETX + LRC

## Control flow

1. Host sends ENQ
2. Terminal replies ACK
3. Host sends command frame
4. Terminal replies ACK
5. Terminal sends ENQ to start response
6. Host replies ACK
7. Terminal sends response frame
8. Host replies ACK
9. Host sends EOT to finish

## Common commands

* C100  Pre-Authorization
* C200  Sale
* C201  Void
* C203  Refund
* C500  Settlement
* C902  Echo Test
* C910  Read Card

# LRC checksum

The app supports two LRC modes. Choose the one used by your terminal.

## XOR mode

* Start LRC at 0
* XOR each byte from STX through ETX
* Result is the LRC byte

## ISO 1155 two's complement mode

* Sum relevant bytes
* Keep low 8 bits
* Two's complement of that byte is the LRC

## Worked example

Payload text: `C200|01|000100`

Bytes: `02 43 32 30 30 7C 30 31 7C 30 30 30 31 30 30 03`

XOR of these bytes yields a single byte LRC. The app shows raw hex and parsed fields.

# Logging and debug

* Logs persist to local storage
* Filter by level: info, success, warning, error, debug
* View raw TX and RX hex
* Export logs for offline analysis
* Use `adb logcat` for native and JS logs

Example:

```bash
adb logcat | grep ECRTestApp
```

# Project layout

```
src/
  components/   UI controls
  screens/      App screens
  services/     ECRService, MessageBuilder, ResponseParser, LRCCalculator
  utils/        Constants and helpers
  examples/     Sample frames and recorded sessions

android/
  native modules and Java wrappers
  ECRSerialModule.java
  ECRTcpModule.java
```

# Core modules

* ECRService.js

  * Manage transport
  * Orchestrate ENQ/ACK flow
  * Retry and timeout logic
* MessageBuilder.js

  * Build command frames
  * Pad fields per spec
* ResponseParser.js

  * Parse terminal responses
  * Map response fields to labels
* LRCCalculator.js

  * Compute and verify LRC
  * Support both modes
* LogViewer.js

  * Persist and filter logs
  * Show raw hex and parsed view

# Adding a new command

1. Add a constant to `utils/Constants.js`
2. Add a builder in `MessageBuilder.js`
3. Add a parser in `ResponseParser.js`
4. Add a form in `TransactionForm.js`
5. Add unit tests for builder and parser
6. Rebuild android if native code changed

# Testing

Unit tests

* MessageBuilder
* ResponseParser
* LRCCalculator

Integration tests

* Echo test round trip
* Small sale against a test host
* Mock terminal harness in `examples/mocks`

Run locally

```bash
npm test
npm run lint
```

# Troubleshooting

## Serial not detected

* Check OTG cable and adapter
* Confirm USB permission prompt on device
* Try a different cable or device

## TCP fails

* Ping terminal IP from a workstation on same network
* Telnet to port 88 to check listener
* Check firewall rules

## Timeouts

* Increase timeout in TCP settings
* Confirm terminal responsiveness

## LRC errors

* Verify selected LRC mode
* Check message encoding, use ISO-8859-1 if required
* Inspect raw hex logs for corrupted bytes

## Native module errors

* Clean android build:

```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

* Inspect `adb logcat` for native traces

# Security

* Do not store PAN or sensitive track data in plain logs
* Redact or mask sensitive fields before export
* Use HTTPS for remote uploads
* Remove debug flags from release builds
* Follow card brand and PCI guidance before any production use

# Contributing

Help improve the project. Focus on docs, tests, and examples.

Priority tasks

* Improve quick start and onboarding
* Add full byte level protocol guide per command
* Add unit tests for LRCCalculator, MessageBuilder, ResponseParser
* Add mock terminal harness and fixtures
* Add CI to run lint and tests on every PR
* Add issue and PR templates

Workflow

1. Fork the repo
2. Create a branch `feature/name` or `fix/name`
3. Keep changes small
4. Add or update tests
5. Run lint and tests locally
6. Commit with prefix `feat:`, `fix:`, `docs:`, or `test:`
7. Open a PR to `main`
8. Add a testing checklist and attach logs or screenshots

# License

Choose a license that fits your use case.
Common choices:

* MIT
* Apache 2.0

# Version history

v1.0.0 Initial release, React Native 0.80.2

* Serial and TCP transports
* Core transaction flows
* Live logging and parsing

# Notes

If you want edits, tell me which section to update.

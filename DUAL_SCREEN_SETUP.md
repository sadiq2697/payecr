# 📺 Dual-Screen POS Setup Guide

Complete guide for setting up and using the dual-screen customer display feature.

## 🎯 Overview

Your POS app now supports **dual-screen mode** for devices with secondary displays (like tablets with HDMI output, Microsoft Surface Duo, or Android dual-screen devices).

- **Primary Screen**: Cashier's POS interface (POSScreen)
- **Secondary Screen**: Customer-facing display (CustomerDisplayScreen)

---

## 🏗️ Architecture

### Components Created

1. **Native Module**: `PresentationDisplayModule.java`
   - Manages Android's Presentation Display API
   - Detects secondary displays
   - Shows React components on secondary screen

2. **Service**: `DualScreenManager.ts`
   - TypeScript wrapper for native module
   - Simple API for dual-screen management

3. **Customer Display**: `CustomerDisplayScreen.tsx`
   - Beautiful customer-facing UI
   - Real-time cart updates
   - Transaction completion screen

---

## 🚀 Quick Start

### 1. Enable Dual-Screen in Your POS Screen

```typescript
import { useEffect, useState } from 'react';
import DualScreenManager from '../services/DualScreenManager';

const POSScreen = () => {
  const [cart, setCart] = useState([]);
  const [hasSecondDisplay, setHasSecondDisplay] = useState(false);

  // Initialize dual-screen on mount
  useEffect(() => {
    initializeDualScreen();
  }, []);

  const initializeDualScreen = async () => {
    // Check if secondary display is available
    const hasDisplay = await DualScreenManager.hasSecondaryDisplay();
    setHasSecondDisplay(hasDisplay);

    if (hasDisplay) {
      // Show customer display on secondary screen
      const success = await DualScreenManager.showCustomerDisplay(1);
      console.log('Customer display shown:', success);
    }
  };

  // Update customer display when cart changes
  useEffect(() => {
    if (hasSecondDisplay) {
      DualScreenManager.updateCustomerDisplay({
        cart: cart,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        total: calculateTotal(),
        storeName: 'ENTERPRISE STORE',
      });
    }
  }, [cart]);

  // ... rest of your POS logic
};
```

### 2. Show Customer Display

```typescript
// Show on secondary display (display ID 1)
await DualScreenManager.showCustomerDisplay(1);
```

### 3. Update Customer Display

```typescript
// Send cart data to customer display
await DualScreenManager.updateCustomerDisplay({
  cart: [
    {
      id: '1',
      name: 'Product Name',
      sku: 'SKU-001',
      price: 29.99,
      quantity: 2,
    }
  ],
  subtotal: 59.98,
  tax: 5.10,
  total: 65.08,
  paymentMethod: 'card', // 'card', 'cash', 'digital'
  transactionComplete: false,
});
```

### 4. Show Transaction Complete

```typescript
// Show success screen to customer
await DualScreenManager.updateCustomerDisplay({
  cart: cart,
  total: total,
  transactionComplete: true, // This shows the success screen
});

// Wait 3 seconds, then reset
setTimeout(() => {
  DualScreenManager.updateCustomerDisplay({
    cart: [],
    total: 0,
    transactionComplete: false,
  });
}, 3000);
```

### 5. Hide Customer Display

```typescript
// Hide secondary display (when closing app or switching modes)
await DualScreenManager.hideCustomerDisplay();
```

---

## 📋 API Reference

### DualScreenManager Methods

#### `getDisplays(): Promise<Display[]>`
Get all available displays.

```typescript
const displays = await DualScreenManager.getDisplays();
// Returns: [{ displayId: 0, name: 'Main', width: 1920, height: 1080 }, ...]
```

#### `hasSecondaryDisplay(): Promise<boolean>`
Check if a secondary display is available.

```typescript
const hasSecond = await DualScreenManager.hasSecondaryDisplay();
// Returns: true or false
```

#### `getSecondaryDisplay(): Promise<Display | null>`
Get secondary display information.

```typescript
const secondDisplay = await DualScreenManager.getSecondaryDisplay();
// Returns: { displayId: 1, name: 'Secondary', width: 1920, height: 1080 }
```

#### `showCustomerDisplay(displayId?: number): Promise<boolean>`
Show customer display on secondary screen.

```typescript
const success = await DualScreenManager.showCustomerDisplay(1);
// Returns: true if successful
```

#### `hideCustomerDisplay(): Promise<boolean>`
Hide customer display.

```typescript
await DualScreenManager.hideCustomerDisplay();
```

#### `updateCustomerDisplay(data: any): Promise<boolean>`
Update customer display with new data.

```typescript
await DualScreenManager.updateCustomerDisplay({
  cart: [...],
  subtotal: 100,
  tax: 8.5,
  total: 108.5,
});
```

---

## 🎨 Customer Display Props

### CustomerDisplayScreen Props

```typescript
interface CustomerDisplayScreenProps {
  cart?: CartItem[];              // Array of cart items
  subtotal?: number;              // Subtotal amount
  tax?: number;                   // Tax amount
  total?: number;                 // Total amount
  storeName?: string;             // Your store name
  storeLogo?: string;             // Logo URL (optional)
  paymentMethod?: 'card' | 'cash' | 'digital' | null;
  transactionComplete?: boolean;  // Show success screen
}

interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  imageUrl?: string;             // Product image (optional)
}
```

---

## 🔧 Hardware Setup

### Supported Devices

1. **Android Tablets with HDMI Output**
   - USB-C to HDMI adapter
   - External monitor/display

2. **Dual-Screen Android Devices**
   - Microsoft Surface Duo
   - LG V60 ThinQ (Dual Screen)
   - ASUS ZenBook Duo

3. **Android POS Terminals**
   - Sunmi T2 series (dual screen)
   - PAX A920 Pro (with customer display)

### Physical Connection

1. Connect secondary display via:
   - USB-C to HDMI cable
   - Built-in secondary screen
   - Wireless display (Miracast)

2. Enable secondary display in Android settings:
   - Settings → Display → Secondary Display
   - Or automatic detection

---

## 🎬 Usage Flow

### Complete Transaction Flow

```typescript
// 1. Initialize dual screen on app start
useEffect(() => {
  initDualScreen();
}, []);

const initDualScreen = async () => {
  if (await DualScreenManager.hasSecondaryDisplay()) {
    await DualScreenManager.showCustomerDisplay(1);
  }
};

// 2. Update display when items are scanned
const addItemToCart = (item) => {
  const newCart = [...cart, item];
  setCart(newCart);

  // Update customer display
  DualScreenManager.updateCustomerDisplay({
    cart: newCart,
    subtotal: calcSubtotal(newCart),
    tax: calcTax(newCart),
    total: calcTotal(newCart),
  });
};

// 3. Show payment method when selected
const selectPaymentMethod = (method) => {
  DualScreenManager.updateCustomerDisplay({
    cart: cart,
    subtotal: subtotal,
    tax: tax,
    total: total,
    paymentMethod: method, // 'card', 'cash', or 'digital'
  });
};

// 4. Show completion screen
const completeTransaction = () => {
  DualScreenManager.updateCustomerDisplay({
    cart: cart,
    total: total,
    transactionComplete: true,
  });

  // Reset after 3 seconds
  setTimeout(() => {
    setCart([]);
    DualScreenManager.updateCustomerDisplay({
      cart: [],
      total: 0,
      transactionComplete: false,
    });
  }, 3000);
};
```

---

## 🐛 Troubleshooting

### Secondary Display Not Detected

```typescript
// Check available displays
const displays = await DualScreenManager.getDisplays();
console.log('Available displays:', displays);

// Should show at least 2 displays
// If only 1 display: check physical connection
```

### Display Not Showing

1. Check Android permissions in `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
```

2. Verify display is enabled in Android settings

3. Check logs:
```bash
adb logcat | grep DualScreen
```

### Content Not Updating

```typescript
// Make sure you're passing all required data
DualScreenManager.updateCustomerDisplay({
  cart: cart,        // Required
  subtotal: 0,       // Required
  tax: 0,            // Required
  total: 0,          // Required
});
```

---

## 📱 Testing

### Test on Device

1. Build and install:
```bash
npm run android
```

2. Connect secondary display

3. Check logs:
```bash
adb logcat | grep -E "(DualScreen|Presentation)"
```

### Test Without Secondary Display

```typescript
// The app will work normally without secondary display
// It just won't show customer facing screen
const hasSecond = await DualScreenManager.hasSecondaryDisplay();
if (hasSecond) {
  // Show customer display
} else {
  console.log('No secondary display available');
}
```

---

## 🎯 Best Practices

1. **Always Check Availability**
   ```typescript
   if (await DualScreenManager.hasSecondaryDisplay()) {
     // Use dual-screen features
   }
   ```

2. **Update on Every Cart Change**
   ```typescript
   useEffect(() => {
     updateCustomerDisplay();
   }, [cart]);
   ```

3. **Handle Disconnection**
   ```typescript
   // Listen for display changes
   useEffect(() => {
     const interval = setInterval(async () => {
       const hasDisplay = await DualScreenManager.hasSecondaryDisplay();
       if (!hasDisplay && isDisplayShowing) {
         // Display was disconnected
         setIsDisplayShowing(false);
       }
     }, 5000);
     return () => clearInterval(interval);
   }, []);
   ```

4. **Clean Up on Unmount**
   ```typescript
   useEffect(() => {
     return () => {
       DualScreenManager.hideCustomerDisplay();
     };
   }, []);
   ```

---

## 📊 Example: Complete Integration

See `src/screens/index.tsx` (POSScreen) for a complete example of dual-screen integration.

---

## 🔐 Permissions

Required permissions in `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
```

---

## 📝 Notes

- Customer display runs as a separate React Native root view
- Updates are sent via native events (very fast)
- Supports hot reload in development
- Works with Android Presentation Display API
- Compatible with Android 8.0+

---

## 🎉 You're Ready!

Your dual-screen POS setup is complete. The customer display will automatically show on secondary screens when available.

For support, check the logs or file an issue.

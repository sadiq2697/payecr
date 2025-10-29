import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import POSScreen from '../screens';
import CustomerSelectScreen from '../screens/CustomerSelectScreen';
import DiscountScreen from '../screens/DiscountScreen';
import PriceOverrideScreen from '../screens/PriceOverrideScreen';
import ProductLookupScreen from '../screens/ProductLookupScreen';
import HoldTransactionScreen from '../screens/HoldTransactionScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  POS: undefined;
  CustomerSelect: undefined;
  Discount: { itemIndex: number };
  PriceOverride: { itemIndex: number };
  ProductLookup: undefined;
  HoldTransaction: undefined;
  Payment: { cart: any[]; subtotal: number; tax: number; total: number };
  Receipt: { transaction: any };
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        presentation: 'transparentModal',
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress,
          },
        }),
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{
          headerShown: false,
          cardStyle: { backgroundColor: '#FFFFFF' },
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
          cardStyle: { backgroundColor: '#F5F5F5' },
        }}
      />
      <Stack.Screen name="POS" component={POSScreen} />
      <Stack.Screen
        name="CustomerSelect"
        component={CustomerSelectScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Discount"
        component={DiscountScreen}
        options={{
          headerShown: true,
          headerTitle: 'Apply Discount',
          headerStyle: { backgroundColor: '#FFFFFF' },
        }}
      />
      <Stack.Screen
        name="PriceOverride"
        component={PriceOverrideScreen}
        options={{
          headerShown: true,
          headerTitle: 'Override Price',
          headerStyle: { backgroundColor: '#FFFFFF' },
        }}
      />
      <Stack.Screen
        name="ProductLookup"
        component={ProductLookupScreen}
        options={{
          headerShown: true,
          headerTitle: 'Product Lookup',
          headerStyle: { backgroundColor: '#FFFFFF' },
        }}
      />
      <Stack.Screen
        name="HoldTransaction"
        component={HoldTransactionScreen}
        options={{
          headerShown: true,
          headerTitle: 'Held Transactions',
          headerStyle: { backgroundColor: '#FFFFFF' },
        }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{
          headerShown: true,
          headerTitle: 'Process Payment',
          headerStyle: { backgroundColor: '#FFFFFF' },
        }}
      />
      <Stack.Screen
        name="Receipt"
        component={ReceiptScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;

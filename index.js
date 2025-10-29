/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import CustomerDisplayScreen from './src/screens/CustomerDisplayScreen.tsx';
import { name as appName } from './app.json';

// Register main app
AppRegistry.registerComponent(appName, () => App);

// Register customer display for secondary screen
AppRegistry.registerComponent('CustomerDisplay', () => CustomerDisplayScreen);

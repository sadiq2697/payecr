import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { DollarSign, Lock, FileText, AlertCircle } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList, 'PriceOverride'>;
type PriceOverrideRouteProp = RouteProp<RootStackParamList, 'PriceOverride'>;

const PriceOverrideScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PriceOverrideRouteProp>();
  const { itemIndex } = route.params;

  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [requiresAuth, setRequiresAuth] = useState(false);

  const handlePriceChange = (value: string) => {
    setNewPrice(value);
    // Check if authorization is required (e.g., if discount is > 20%)
    const price = parseFloat(value);
    if (!isNaN(price) && price < 50) {
      // Assume original price is $100
      setRequiresAuth(true);
    } else {
      setRequiresAuth(false);
    }
  };

  const handleApplyPriceOverride = () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for price override');
      return;
    }

    if (requiresAuth && !authCode.trim()) {
      Alert.alert(
        'Authorization Required',
        'This price override requires manager authorization'
      );
      return;
    }

    // In a real app, you would validate the auth code and pass data back
    console.log('Applying price override:', {
      itemIndex,
      newPrice: price,
      reason,
      authCode: requiresAuth ? authCode : null,
    });

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <AlertCircle size={20} color="#DC2626" />
          <Text style={styles.warningText}>
            Price overrides are logged and require manager approval
          </Text>
        </View>

        {/* New Price Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Price</Text>
          <View style={styles.inputContainer}>
            <DollarSign size={24} color="#737373" style={styles.inputIcon} />
            <TextInput
              style={styles.priceInput}
              placeholder="0.00"
              value={newPrice}
              onChangeText={handlePriceChange}
              keyboardType="decimal-pad"
              placeholderTextColor="#A3A3A3"
            />
          </View>
          <Text style={styles.hint}>Enter the new price for this item</Text>
        </View>

        {/* Reason Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for Override *</Text>
          <View style={styles.inputContainer}>
            <FileText size={20} color="#737373" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Price match, Damaged item, Manager approval"
              value={reason}
              onChangeText={setReason}
              placeholderTextColor="#A3A3A3"
              multiline
            />
          </View>
        </View>

        {/* Authorization Code (if required) */}
        {requiresAuth && (
          <View style={styles.section}>
            <View style={styles.authHeader}>
              <Lock size={16} color="#DC2626" />
              <Text style={styles.sectionTitleRequired}>
                Manager Authorization Required
              </Text>
            </View>
            <View style={styles.inputContainer}>
              <Lock size={20} color="#737373" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter authorization code"
                value={authCode}
                onChangeText={setAuthCode}
                secureTextEntry
                placeholderTextColor="#A3A3A3"
              />
            </View>
            <Text style={styles.hint}>
              This price reduction requires manager approval
            </Text>
          </View>
        )}

        {/* Price Comparison */}
        {newPrice && (
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Original Price</Text>
              <Text style={styles.comparisonValueOld}>$100.00</Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>New Price</Text>
              <Text style={styles.comparisonValueNew}>
                ${parseFloat(newPrice).toFixed(2)}
              </Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabelBold}>Difference</Text>
              <Text
                style={[
                  styles.comparisonValueDiff,
                  parseFloat(newPrice) < 100 && styles.comparisonValueNegative,
                ]}
              >
                {parseFloat(newPrice) < 100 ? '-' : '+'}$
                {Math.abs(100 - parseFloat(newPrice)).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.applyButton,
            (!newPrice || !reason) && styles.applyButtonDisabled,
          ]}
          onPress={handleApplyPriceOverride}
          disabled={!newPrice || !reason}
        >
          <Text style={styles.applyButtonText}>Apply Override</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#525252',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sectionTitleRequired: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#171717',
  },
  priceInput: {
    flex: 1,
    height: 72,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#171717',
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: 12,
    color: '#737373',
    marginTop: 8,
  },
  comparisonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginTop: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  comparisonDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 8,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#737373',
  },
  comparisonLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#171717',
  },
  comparisonValueOld: {
    fontSize: 16,
    color: '#737373',
    textDecorationLine: 'line-through',
    fontFamily: 'monospace',
  },
  comparisonValueNew: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    fontFamily: 'monospace',
  },
  comparisonValueDiff: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    fontFamily: 'monospace',
  },
  comparisonValueNegative: {
    color: '#DC2626',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#525252',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.4,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default PriceOverrideScreen;

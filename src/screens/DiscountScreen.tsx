import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Percent, DollarSign, Tag } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Discount'>;
type DiscountRouteProp = RouteProp<RootStackParamList, 'Discount'>;

type DiscountType = 'percentage' | 'fixed';

const PRESET_DISCOUNTS = [
  { label: '5%', value: 5, type: 'percentage' as DiscountType },
  { label: '10%', value: 10, type: 'percentage' as DiscountType },
  { label: '15%', value: 15, type: 'percentage' as DiscountType },
  { label: '20%', value: 20, type: 'percentage' as DiscountType },
  { label: '25%', value: 25, type: 'percentage' as DiscountType },
  { label: '50%', value: 50, type: 'percentage' as DiscountType },
];

const DiscountScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DiscountRouteProp>();
  const { itemIndex } = route.params;

  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [reason, setReason] = useState('');

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      // Show error
      return;
    }

    // In a real app, you would pass this data back via route params or context
    console.log('Applying discount:', {
      itemIndex,
      type: discountType,
      value,
      reason,
    });

    navigation.goBack();
  };

  const handlePresetDiscount = (preset: typeof PRESET_DISCOUNTS[0]) => {
    setDiscountType(preset.type);
    setDiscountValue(preset.value.toString());
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Discount Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discount Type</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                discountType === 'percentage' && styles.typeButtonActive,
              ]}
              onPress={() => setDiscountType('percentage')}
            >
              <Percent
                size={20}
                color={discountType === 'percentage' ? '#FFFFFF' : '#525252'}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  discountType === 'percentage' && styles.typeButtonTextActive,
                ]}
              >
                Percentage
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                discountType === 'fixed' && styles.typeButtonActive,
              ]}
              onPress={() => setDiscountType('fixed')}
            >
              <DollarSign
                size={20}
                color={discountType === 'fixed' ? '#FFFFFF' : '#525252'}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  discountType === 'fixed' && styles.typeButtonTextActive,
                ]}
              >
                Fixed Amount
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preset Discounts */}
        {discountType === 'percentage' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Discounts</Text>
            <View style={styles.presetGrid}>
              {PRESET_DISCOUNTS.map((preset, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.presetButton,
                    discountValue === preset.value.toString() &&
                      styles.presetButtonActive,
                  ]}
                  onPress={() => handlePresetDiscount(preset)}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      discountValue === preset.value.toString() &&
                        styles.presetButtonTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Custom Discount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {discountType === 'percentage' ? 'Percentage' : 'Amount'}
          </Text>
          <View style={styles.inputContainer}>
            {discountType === 'fixed' && (
              <DollarSign size={20} color="#737373" style={styles.inputIcon} />
            )}
            <TextInput
              style={styles.input}
              placeholder={
                discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'
              }
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="decimal-pad"
              placeholderTextColor="#A3A3A3"
            />
            {discountType === 'percentage' && (
              <Percent size={20} color="#737373" style={styles.inputIcon} />
            )}
          </View>
        </View>

        {/* Reason for Discount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason (Optional)</Text>
          <View style={styles.inputContainer}>
            <Tag size={20} color="#737373" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter reason for discount"
              value={reason}
              onChangeText={setReason}
              placeholderTextColor="#A3A3A3"
            />
          </View>
        </View>

        {/* Preview */}
        {discountValue && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Discount Preview</Text>
            <Text style={styles.previewValue}>
              {discountType === 'percentage'
                ? `${discountValue}%`
                : `$${parseFloat(discountValue).toFixed(2)}`}
            </Text>
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
            !discountValue && styles.applyButtonDisabled,
          ]}
          onPress={handleApplyDiscount}
          disabled={!discountValue}
        >
          <Text style={styles.applyButtonText}>Apply Discount</Text>
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
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#525252',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetButton: {
    width: '30%',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  presetButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  presetButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#525252',
  },
  presetButtonTextActive: {
    color: '#2563EB',
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
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
  },
  previewCard: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 8,
  },
  previewValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    backgroundColor: '#059669',
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

export default DiscountScreen;

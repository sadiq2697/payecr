import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { Search, User, X, ShoppingBag, TrendingUp, Mail, Phone, Calendar, UserCheck, Award, Scan, QrCode } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

const { width } = Dimensions.get('window');
type NavigationProp = StackNavigationProp<RootStackParamList, 'CustomerSelect'>;

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalPurchases: number;
  totalOrders: number;
  lastVisit: string;
  memberSince: string;
  membershipTier: 'Gold' | 'Silver' | 'Bronze';
}

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
    name: 'John Anderson',
    email: 'john.anderson@email.com',
    phone: '+1 (555) 123-4567',
    totalPurchases: 15234.50,
    totalOrders: 87,
    lastVisit: '2 days ago',
    memberSince: 'Jan 2022',
    membershipTier: 'Gold',
  },
  {
    id: '2',
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@email.com',
    phone: '+1 (555) 234-5678',
    totalPurchases: 8945.75,
    totalOrders: 54,
    lastVisit: '1 week ago',
    memberSince: 'Mar 2023',
    membershipTier: 'Silver',
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael.chen@email.com',
    phone: '+1 (555) 345-6789',
    totalPurchases: 12567.20,
    totalOrders: 68,
    lastVisit: '3 days ago',
    memberSince: 'Jun 2021',
    membershipTier: 'Gold',
  },
  {
    id: '4',
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '+1 (555) 456-7890',
    totalPurchases: 6234.90,
    totalOrders: 32,
    lastVisit: '1 day ago',
    memberSince: 'Sep 2023',
    membershipTier: 'Bronze',
  },
  {
    id: '5',
    name: 'David Thompson',
    email: 'david.t@email.com',
    phone: '+1 (555) 567-8901',
    totalPurchases: 19876.45,
    totalOrders: 124,
    lastVisit: '5 hours ago',
    memberSince: 'Feb 2020',
    membershipTier: 'Gold',
  },
];

const CustomerSelectScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = MOCK_CUSTOMERS.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  );

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Gold': return '#2563EB';
      case 'Silver': return '#737373';
      case 'Bronze': return '#A3A3A3';
      default: return '#D4D4D4';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderCustomerCard = ({ item }: { item: Customer }) => {
    const isSelected = selectedCustomer?.id === item.id;
    const tierColor = getTierColor(item.membershipTier);

    return (
      <TouchableOpacity
        style={[styles.customerCard, isSelected && styles.customerCardSelected]}
        onPress={() => setSelectedCustomer(item)}
        activeOpacity={0.8}
      >
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <UserCheck size={16} color="#FFFFFF" />
          </View>
        )}

        <View style={styles.cardHeader}>
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { borderColor: tierColor }]}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <View style={styles.customerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.customerName}>{item.name}</Text>
                <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
                  <Award size={10} color="#FFFFFF" />
                  <Text style={styles.tierText}>{item.membershipTier}</Text>
                </View>
              </View>
              <View style={styles.contactInfo}>
                <View style={styles.contactRow}>
                  <Mail size={13} color="#64748B" />
                  <Text style={styles.contactText}>{item.email}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Phone size={13} color="#64748B" />
                  <Text style={styles.contactText}>{item.phone}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardStats}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E9EEF7' }]}>
              <ShoppingBag size={16} color="#161A24" />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>
              ${(item.totalPurchases / 1000).toFixed(1)}k
            </Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E9EEF7' }]}>
              <TrendingUp size={16} color="#161A24" />
            </View>
            <Text style={styles.statValue}>{item.totalOrders}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E9EEF7' }]}>
              <Calendar size={16} color="#161A24" />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>{item.lastVisit}</Text>
            <Text style={styles.statLabel}>Visit</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.memberSinceContainer}>
            <Text style={styles.memberSinceLabel}>Member since</Text>
            <Text style={styles.memberSinceValue}>{item.memberSince}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleConfirm = () => {
    if (selectedCustomer) {
      navigation.goBack();
    }
  };

  const handleBarcodeScan = () => {
    // TODO: Implement barcode scanning
    console.log('Barcode scan requested');
  };

  const handleQRCodeScan = () => {
    // TODO: Implement QR code scanning
    console.log('QR code scan requested');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <User size={18} color="#161A24" />
            </View>
            <Text style={styles.headerTitle}>Select Customer</Text>
            <Text style={styles.headerSubtitle}>
              {filteredCustomers.length} available
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.searchBar}>
              <Search size={18} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search customers..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94A3B8"
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <X size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.scanButton} onPress={handleBarcodeScan}>
              <Scan size={20} color="#161A24" />
              <Text style={styles.scanButtonText}>Barcode</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.scanButton} onPress={handleQRCodeScan}>
              <QrCode size={20} color="#161A24" />
              <Text style={styles.scanButtonText}>QR Code</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <X size={20} color="#0B0E13" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Customer List with Cards */}
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        numColumns={4}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <User size={64} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyText}>No customers found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search criteria' : 'No customers available'}
            </Text>
          </View>
        }
      />

      {/* Floating Action Bar */}
      {selectedCustomer && (
        <View style={styles.floatingActionBar}>
          <View style={styles.selectedCustomerInfo}>
            <View style={styles.selectedAvatar}>
              <Text style={styles.selectedAvatarText}>{getInitials(selectedCustomer.name)}</Text>
            </View>
            <View>
              <Text style={styles.selectedLabel}>Selected Customer</Text>
              <Text style={styles.selectedName}>{selectedCustomer.name}</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedCustomer(null)}>
              <Text style={styles.cancelButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <UserCheck size={18} color="#F7FAFC" />
              <Text style={styles.confirmButtonText}>Confirm Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Header Styles
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#2563EB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#737373',
    fontWeight: '400',
    marginLeft: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#525252',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    paddingHorizontal: 14,
    height: 40,
    gap: 10,
    minWidth: 340,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#171717',
    fontWeight: '400',
  },
  clearButton: {
    padding: 4,
  },

  // List Styles
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 16,
  },

  // Customer Card
  customerCard: {
    width: (width - 96) / 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  customerCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    elevation: 2,
    shadowOpacity: 0.08,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card Header
  cardHeader: {
    marginBottom: 12,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#525252',
  },
  customerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    flex: 1,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#F7FAFC',
    textTransform: 'uppercase',
  },
  contactInfo: {
    gap: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '400',
  },

  // Card Divider
  cardDivider: {
    height: 1,
    backgroundColor: '#E9EEF7',
    marginVertical: 12,
  },

  // Stats Section
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B0E13',
    marginBottom: 3,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // Card Footer
  cardFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E9EEF7',
  },
  memberSinceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberSinceLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  memberSinceValue: {
    fontSize: 11,
    color: '#0B0E13',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    width: width - 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E9EEF7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Floating Action Bar
  floatingActionBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E9EEF7',
  },
  selectedCustomerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#161A24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F7FAFC',
  },
  selectedLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0B0E13',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#E9EEF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  confirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    backgroundColor: '#161A24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F7FAFC',
  },
});

export default CustomerSelectScreen;

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useApp, FridgeItem } from '../../context/AppContext';

export default function MyFridgeScreen() {
  const { currentUser, fridgeItems, removeItem, addFridgeItems } = useApp();

  const [itemName, setItemName] = useState('');
  const [shelfLifeHours, setShelfLifeHours] = useState('48');

  // Filter items that belong to the current user
  const userItems = fridgeItems.filter((item) => item.ownerId === currentUser.id);

  const handleAddItem = () => {
    const trimmed = itemName.trim();
    if (!trimmed) {
      Alert.alert('Validation Error', 'Please enter an item name.');
      return;
    }

    const hours = parseInt(shelfLifeHours, 10);
    if (isNaN(hours) || hours <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid number of hours.');
      return;
    }

    addFridgeItems([
      {
        name: trimmed,
        category: 'Pantry',
        quantity: '1 item',
        shelfLifeHours: hours,
      },
    ]);

    setItemName('');
    setShelfLifeHours('48');
  };

  const handleMockScanReceipt = () => {
    addFridgeItems([
      {
        name: 'Baby Spinach',
        category: 'Produce',
        quantity: '1 bag',
        shelfLifeHours: 48,
      },
      {
        name: 'Chicken Thighs',
        category: 'Meat',
        quantity: '500g',
        shelfLifeHours: 36,
      },
      {
        name: 'Heavy Cream',
        category: 'Dairy',
        quantity: '1 pint',
        shelfLifeHours: 60,
      },
    ]);
  };

  const renderItem = ({ item }: { item: FridgeItem }) => {
    const hoursRemaining = Math.round(
      (new Date(item.expiresAt).getTime() - Date.now()) / 36e5
    );
    const isExpiringSoon = hoursRemaining <= 48;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            Qty: {item.quantity} • Category: {item.category}
          </Text>
          <Text
            style={[
              styles.expiryBadge,
              isExpiringSoon ? styles.expiryUrgent : styles.expiryNormal,
            ]}>
            Expires in: {hoursRemaining}h
          </Text>
        </View>
        <Pressable
          style={styles.deleteButton}
          onPress={() => removeItem(item.id)}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>{currentUser.name}'s Fridge</Text>
        <Text style={styles.headerSubtitle}>
          {userItems.length} active items logged
        </Text>
      </View>

      {/* Quick Manual Add */}
      <View style={styles.addSection}>
        <Text style={styles.sectionTitle}>Quick Manual Add</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Item name (e.g. Avocado)"
            value={itemName}
            onChangeText={setItemName}
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Hours (e.g. 48)"
            value={shelfLifeHours}
            onChangeText={setShelfLifeHours}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <Pressable style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </Pressable>
      </View>

      {/* Mock OCR Scan Button */}
      <View style={styles.scanSection}>
        <Pressable
          style={styles.scanButton}
          onPress={handleMockScanReceipt}>
          <Text style={styles.scanButtonText}>
            📸 Mock Scan Receipt (Batch Add 3 Items)
          </Text>
        </Pressable>
      </View>

      {/* Inventory List */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Current Inventory</Text>
        <FlatList
          data={userItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Your fridge is empty!</Text>
              <Text style={styles.emptySubtext}>
                Add items manually or tap "Mock Scan Receipt" above.
              </Text>
            </View>
          }
          contentContainerStyle={userItems.length === 0 ? styles.emptyList : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  headerBox: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  addSection: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  scanSection: {
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: '#10B981',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#059669',
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  itemMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  expiryBadge: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiryUrgent: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  expiryNormal: {
    backgroundColor: '#E0F2FE',
    color: '#0284C7',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});

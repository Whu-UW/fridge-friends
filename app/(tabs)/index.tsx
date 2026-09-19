import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { FridgeItemRow } from '../../services/supabase/types';
import { scanGroceryReceiptMock, ScannedReceiptResult } from '../../services/receiptOcrService';

export default function MyFridgeScreen() {
  const router = useRouter();
  const {
    currentUser,
    fridgeItems,
    removeFridgeItem,
    addManualFridgeItem,
    addShoppingTripFromReceipt,
    getUserExpiringItems,
    generateSoloWasteRecipe,
  } = useApp();

  // Manual Add Form State
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('Produce');

  // Receipt Scanner Modal State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedReceipt, setScannedReceipt] = useState<ScannedReceiptResult | null>(null);
  const [isAddingReceipt, setIsAddingReceipt] = useState(false);

  // Recipe generation loading state
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);

  const userItems = fridgeItems.filter((item) => item.user_id === currentUser.id);
  const expiringItems = getUserExpiringItems(72);

  // Format time since purchase
  const formatTimeSinceBought = (dateBoughtIso: string) => {
    const diffMs = Date.now() - new Date(dateBoughtIso).getTime();
    const diffDays = Math.floor(diffMs / (24 * 36e5));
    const boughtDate = new Date(dateBoughtIso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

    if (diffDays <= 0) return `Bought today (${boughtDate})`;
    if (diffDays === 1) return `Bought yesterday (${boughtDate})`;
    return `Bought ${diffDays} days ago (${boughtDate})`;
  };

  // Format expiration countdown
  const formatExpiration = (expiresAtIso: string) => {
    const hoursLeft = Math.round(
      (new Date(expiresAtIso).getTime() - Date.now()) / 36e5
    );
    if (hoursLeft <= 0) return 'Expired';
    if (hoursLeft < 48) return `Expires in ${hoursLeft}h`;
    const daysLeft = Math.ceil(hoursLeft / 24);
    return `Expires in ${daysLeft} days`;
  };

  const handleManualAdd = async () => {
    const trimmed = itemName.trim();
    if (!trimmed) {
      Alert.alert('Validation Error', 'Please enter an item name.');
      return;
    }

    const parsedPrice = parseFloat(itemPrice);
    const validPrice = isNaN(parsedPrice) || parsedPrice <= 0 ? 3.5 : parsedPrice;

    await addManualFridgeItem(
      trimmed,
      validPrice,
      new Date().toISOString(),
      itemCategory
    );

    setItemName('');
    setItemPrice('');
  };

  const handleTriggerScan = async () => {
    setIsScanning(true);
    try {
      const result = await scanGroceryReceiptMock();
      setScannedReceipt(result);
    } catch (err) {
      Alert.alert('Scan Failed', 'Could not parse grocery receipt.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmReceiptIntake = async () => {
    if (!scannedReceipt) return;
    setIsAddingReceipt(true);
    try {
      await addShoppingTripFromReceipt(scannedReceipt);
      setScannedReceipt(null);
      Alert.alert('Receipt Processed', 'Items added with LLM-predicted expiration dates!');
    } catch (err) {
      Alert.alert('Error', 'Failed to save receipt items.');
    } finally {
      setIsAddingReceipt(false);
    }
  };

  const handleSuggestWasteRecipe = async () => {
    setIsGeneratingRecipe(true);
    try {
      const recipeId = await generateSoloWasteRecipe();
      router.push({
        pathname: '/recipe/[id]',
        params: { id: recipeId },
      });
    } catch (err) {
      Alert.alert('Recipe Error', 'Failed to generate waste-reduction recipe.');
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const renderFridgeCard = ({ item }: { item: FridgeItemRow }) => {
    const hoursLeft = Math.round(
      (new Date(item.expires_at).getTime() - Date.now()) / 36e5
    );
    const isUrgent = hoursLeft <= 48;

    return (
      <View style={styles.card}>
        <View style={styles.cardMain}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
          </View>

          {/* Time since bought */}
          <Text style={styles.timeBoughtText}>
            ⏱ {formatTimeSinceBought(item.date_bought)}
          </Text>

          {/* Expiration estimation from LLM */}
          <View style={styles.badgeContainer}>
            <Text
              style={[
                styles.expiryBadge,
                isUrgent ? styles.expiryUrgent : styles.expiryFresh,
              ]}>
              {formatExpiration(item.expires_at)} (LLM Predicted)
            </Text>
            <Text style={styles.categoryBadge}>{item.category}</Text>
          </View>
        </View>

        <Pressable
          style={styles.deleteBtn}
          onPress={() => removeFridgeItem(item.id)}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Waste Reduction Banner */}
      {expiringItems.length > 0 && (
        <View style={styles.wasteBanner}>
          <View style={styles.wasteBannerLeft}>
            <Text style={styles.wasteBannerTitle}>
              🚨 {expiringItems.length} items expiring soon!
            </Text>
            <Text style={styles.wasteBannerSub}>
              Use them up today to eliminate food waste.
            </Text>
          </View>
          <Pressable
            style={styles.recipePromptBtn}
            onPress={handleSuggestWasteRecipe}
            disabled={isGeneratingRecipe}>
            {isGeneratingRecipe ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.recipePromptBtnText}>Suggest Recipe 🍳</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Action Bar: Receipt Scanning & Intake */}
      <View style={styles.actionBar}>
        <Pressable
          style={styles.scanReceiptBtn}
          onPress={handleTriggerScan}
          disabled={isScanning}>
          {isScanning ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.scanReceiptBtnText}>
              📸 Scan Grocery Receipt (OCR)
            </Text>
          )}
        </Pressable>
      </View>

      {/* Quick Manual Add */}
      <View style={styles.manualBox}>
        <Text style={styles.boxTitle}>Quick Add Item (LLM Estimator)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.textInput, { flex: 2 }]}
            placeholder="Item (e.g. Avocado)"
            value={itemName}
            onChangeText={setItemName}
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder="Price ($)"
            value={itemPrice}
            onChangeText={setItemPrice}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
          <Pressable style={styles.addBtn} onPress={handleManualAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>
      </View>

      {/* Inventory List */}
      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {currentUser.display_name}'s Fridge ({userItems.length})
          </Text>
          <Text style={styles.listMeta}>
            Tracked from purchase to expiration
          </Text>
        </View>

        <FlatList
          data={userItems}
          keyExtractor={(item) => item.id}
          renderItem={renderFridgeCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Your fridge is empty!</Text>
              <Text style={styles.emptySub}>
                Scan a receipt or add items above to start tracking food waste.
              </Text>
            </View>
          }
        />
      </View>

      {/* Scanned Receipt Modal Preview */}
      <Modal
        visible={Boolean(scannedReceipt)}
        animationType="slide"
        transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>🧾 Scanned Receipt Preview</Text>
            <Text style={styles.modalSubheading}>
              Simulated OCR Extraction ready for LLM processing
            </Text>

            {scannedReceipt && (
              <ScrollView style={styles.modalReceiptScroll}>
                <View style={styles.receiptHeader}>
                  <Text style={styles.receiptStore}>
                    {scannedReceipt.storeName}
                  </Text>
                  <Text style={styles.receiptDate}>
                    Date Bought: {new Date(scannedReceipt.tripDate).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.receiptDivider} />

                {scannedReceipt.items.map((it, idx) => (
                  <View key={idx} style={styles.receiptItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.receiptItemName}>{it.name}</Text>
                      <Text style={styles.receiptItemCat}>
                        {it.category} • {it.quantity || '1 item'}
                      </Text>
                    </View>
                    <Text style={styles.receiptItemPrice}>
                      ${it.price.toFixed(2)}
                    </Text>
                  </View>
                ))}

                <View style={styles.receiptDivider} />

                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Trip Total:</Text>
                  <Text style={styles.receiptTotalValue}>
                    ${scannedReceipt.totalCost.toFixed(2)}
                  </Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setScannedReceipt(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmBtn}
                onPress={handleConfirmReceiptIntake}
                disabled={isAddingReceipt}>
                {isAddingReceipt ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    Confirm &amp; Add to Fridge
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 14,
  },
  wasteBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  wasteBannerLeft: {
    flex: 1,
    marginRight: 8,
  },
  wasteBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  wasteBannerSub: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  recipePromptBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  recipePromptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  actionBar: {
    marginBottom: 10,
  },
  scanReceiptBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanReceiptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  manualBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  boxTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  addBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  listSection: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  listMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMain: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  timeBoughtText: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 3,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  expiryBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiryUrgent: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  expiryFresh: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deleteBtn: {
    padding: 8,
  },
  deleteBtnText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalSubheading: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  modalReceiptScroll: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  receiptHeader: {
    marginBottom: 6,
  },
  receiptStore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  receiptDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  receiptItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  receiptItemCat: {
    fontSize: 11,
    color: '#6B7280',
  },
  receiptItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  receiptTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  receiptTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#059669',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

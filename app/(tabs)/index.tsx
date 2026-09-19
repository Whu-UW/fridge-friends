import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useApp } from "../../context/AppContext";
import {
  isGeminiKeyConfigured,
  scanGroceryReceiptMock,
  scanGroceryReceiptWithGemini,
  ScannedReceiptItem,
  ScannedReceiptResult,
} from "../../services/receiptOcrService";
import { FridgeItemRow } from "../../services/supabase/types";

import CalendarPickerModal from "../../components/CalendarPickerModal";

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
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("Produce");

  // Intake / Scanner Options Modal
  const [isScannerPickerVisible, setIsScannerPickerVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningStatusText, setScanningStatusText] = useState("");
  const [scannedReceipt, setScannedReceipt] =
    useState<ScannedReceiptResult | null>(null);
  const [isAddingReceipt, setIsAddingReceipt] = useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  // Recipe generation loading state
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);

  const userItems = fridgeItems.filter(
    (item) => item.user_id === currentUser.id,
  );
  const expiringItems = getUserExpiringItems(72);

  // Format time since purchase
  const formatTimeSinceBought = (dateBoughtIso: string) => {
    const diffMs = Date.now() - new Date(dateBoughtIso).getTime();
    const diffDays = Math.floor(diffMs / (24 * 36e5));
    const boughtDate = new Date(dateBoughtIso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    if (diffDays <= 0) return `Bought today (${boughtDate})`;
    if (diffDays === 1) return `Bought yesterday (${boughtDate})`;
    return `Bought ${diffDays} days ago (${boughtDate})`;
  };

  // Format expiration countdown
  const formatExpiration = (expiresAtIso: string) => {
    const hoursLeft = Math.round(
      (new Date(expiresAtIso).getTime() - Date.now()) / 36e5,
    );
    if (hoursLeft <= 0) return "Expired";
    if (hoursLeft < 48) return `Expires in ${hoursLeft}h`;
    const daysLeft = Math.ceil(hoursLeft / 24);
    return `Expires in ${daysLeft} days`;
  };

  const handleManualAdd = async () => {
    const trimmed = itemName.trim();
    if (!trimmed) {
      Alert.alert("Validation Error", "Please enter an item name.");
      return;
    }

    const parsedPrice = parseFloat(itemPrice);
    const validPrice =
      isNaN(parsedPrice) || parsedPrice <= 0 ? 3.5 : parsedPrice;

    await addManualFridgeItem(
      trimmed,
      validPrice,
      new Date().toISOString(),
      itemCategory,
    );

    setItemName("");
    setItemPrice("");
  };

  const processImageWithGemini = async (
    base64: string,
    mimeType: string = "image/jpeg",
  ) => {
    setIsScanning(true);
    setScanningStatusText("Analyzing receipt with Gemini...");
    try {
      if (isGeminiKeyConfigured()) {
        const result = await scanGroceryReceiptWithGemini(
          base64,
          mimeType,
          (msg) => setScanningStatusText(msg),
        );
        setScannedReceipt(result);
      } else {
        Alert.alert(
          "Gemini API Key Needed",
          "Add your key to .env.local (EXPO_PUBLIC_GEMINI_API_KEY). Using demo receipt for now!",
        );
        const result = await scanGroceryReceiptMock();
        setScannedReceipt(result);
      }
    } catch (err: any) {
      Alert.alert(
        "Scan Failed",
        err.message || "Could not parse receipt image with Gemini.",
      );
    } finally {
      setIsScanning(false);
      setScanningStatusText("");
    }
  };

  const handleTakePhoto = async () => {
    setIsScannerPickerVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Camera permission is needed to snap receipts.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      await processImageWithGemini(
        result.assets[0].base64,
        result.assets[0].mimeType || "image/jpeg",
      );
    }
  };

  const handlePickFromGallery = async () => {
    setIsScannerPickerVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Gallery access is needed to select receipt photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      await processImageWithGemini(
        result.assets[0].base64,
        result.assets[0].mimeType || "image/jpeg",
      );
    }
  };

  const handleUseMockDemo = async () => {
    setIsScannerPickerVisible(false);
    setIsScanning(true);
    setScanningStatusText("Loading demo receipt...");
    try {
      const result = await scanGroceryReceiptMock();
      setScannedReceipt(result);
    } finally {
      setIsScanning(false);
      setScanningStatusText("");
    }
  };

  // Editable Receipt Handlers
  const handleUpdateStoreName = (name: string) => {
    setScannedReceipt((prev) => (prev ? { ...prev, storeName: name } : null));
  };

  const handleUpdateTripDate = (dateStr: string) => {
    setScannedReceipt((prev) => (prev ? { ...prev, tripDate: dateStr } : null));
  };

  const handleSetQuickDate = (daysAgo: number) => {
    const target = new Date(Date.now() - daysAgo * 24 * 36e5);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    handleUpdateTripDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleUpdateItemField = (
    index: number,
    field: keyof ScannedReceiptItem,
    value: any,
  ) => {
    setScannedReceipt((prev) => {
      if (!prev) return null;
      const updated = [...prev.items];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      const newTotal = updated.reduce(
        (sum, it) => sum + (parseFloat(String(it.price)) || 0),
        0,
      );

      return {
        ...prev,
        items: updated,
        totalCost: Number(newTotal.toFixed(2)),
      };
    });
  };

  const handleRemoveScannedItem = (index: number) => {
    setScannedReceipt((prev) => {
      if (!prev) return null;
      const updated = prev.items.filter((_, i) => i !== index);
      const newTotal = updated.reduce(
        (sum, it) => sum + (parseFloat(String(it.price)) || 0),
        0,
      );
      return {
        ...prev,
        items: updated,
        totalCost: Number(newTotal.toFixed(2)),
      };
    });
  };

  const handleAddScannedItem = () => {
    setScannedReceipt((prev) => {
      if (!prev) return null;
      const newItem: ScannedReceiptItem = {
        name: "",
        price: 3.5,
        category: "Produce",
        quantity: "1 item",
        shelfLifeDays: 5,
      };
      const updated = [...prev.items, newItem];
      const newTotal = updated.reduce(
        (sum, it) => sum + (parseFloat(String(it.price)) || 0),
        0,
      );
      return {
        ...prev,
        items: updated,
        totalCost: Number(newTotal.toFixed(2)),
      };
    });
  };

  const handleConfirmReceiptIntake = async () => {
    if (!scannedReceipt) return;

    // Filter valid named items
    const validItems = scannedReceipt.items.filter(
      (it) => it.name.trim().length > 0,
    );

    if (validItems.length === 0) {
      Alert.alert("Empty Receipt", "Please enter at least one item name.");
      return;
    }

    const parsedDate = new Date(scannedReceipt.tripDate);
    const validDateIso = !isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date().toISOString();

    const finalReceipt: ScannedReceiptResult = {
      ...scannedReceipt,
      tripDate: validDateIso,
      items: validItems,
      totalCost: Number(
        validItems
          .reduce((sum, it) => sum + (parseFloat(String(it.price)) || 0), 0)
          .toFixed(2),
      ),
    };

    setIsAddingReceipt(true);
    try {
      await addShoppingTripFromReceipt(finalReceipt);
      setScannedReceipt(null);
      Alert.alert(
        "Receipt Saved",
        `Successfully added ${validItems.length} items to your fridge!`,
      );
    } catch (err) {
      Alert.alert("Error", "Failed to save receipt items.");
    } finally {
      setIsAddingReceipt(false);
    }
  };

  const handleSuggestWasteRecipe = async () => {
    setIsGeneratingRecipe(true);
    try {
      const recipeId = await generateSoloWasteRecipe();
      router.push({
        pathname: "/recipe/[id]",
        params: { id: recipeId },
      });
    } catch (err) {
      Alert.alert("Recipe Error", "Failed to generate waste-reduction recipe.");
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const renderFridgeCard = ({ item }: { item: FridgeItemRow }) => {
    const hoursLeft = Math.round(
      (new Date(item.expires_at).getTime() - Date.now()) / 36e5,
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
              ]}
            >
              {formatExpiration(item.expires_at)} (LLM Predicted)
            </Text>
            <Text style={styles.categoryBadge}>{item.category}</Text>
          </View>
        </View>

        <Pressable
          style={styles.deleteBtn}
          onPress={() => removeFridgeItem(item.id)}
        >
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
            disabled={isGeneratingRecipe}
          >
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
          onPress={() => setIsScannerPickerVisible(true)}
          disabled={isScanning}
        >
          {isScanning ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.loadingText}>
                {scanningStatusText || "Scanning receipt..."}
              </Text>
            </View>
          ) : (
            <Text style={styles.scanReceiptBtnText}>
              📸 Scan Grocery Receipt (Gemini Vision)
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

      {/* Scan Options Modal (Camera vs Gallery vs Mock) */}
      <Modal
        visible={isScannerPickerVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModalCard}>
            <Text style={styles.optionsModalTitle}>
              📸 Scan Grocery Receipt
            </Text>
            <Text style={styles.optionsModalSub}>
              {isGeminiKeyConfigured()
                ? "Gemini 1.5 Flash Vision active"
                : "Free Gemini API Key supported in .env.local"}
            </Text>

            <Pressable
              style={styles.optionBtnPrimary}
              onPress={handleTakePhoto}
            >
              <Text style={styles.optionBtnPrimaryText}>
                📷 Take Photo with Camera
              </Text>
            </Pressable>

            <Pressable
              style={styles.optionBtnSecondary}
              onPress={handlePickFromGallery}
            >
              <Text style={styles.optionBtnSecondaryText}>
                🖼️ Choose from Photo Gallery
              </Text>
            </Pressable>

            <Pressable
              style={styles.optionBtnSecondary}
              onPress={handleUseMockDemo}
            >
              <Text style={styles.optionBtnSecondaryText}>
                ⚡ Use Demo Sample Receipt
              </Text>
            </Pressable>

            <Pressable
              style={styles.optionCancelBtn}
              onPress={() => setIsScannerPickerVisible(false)}
            >
              <Text style={styles.optionCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Editable Scanned Receipt Modal */}
      <Modal
        visible={Boolean(scannedReceipt)}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>
                  🧾 Review Scanned Receipt
                </Text>
                <Text style={styles.modalSubheading}>
                  Tap any item, price, or shelf life to edit before saving:
                </Text>
              </View>
            </View>

            {scannedReceipt && (
              <ScrollView
                style={styles.modalReceiptScroll}
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Store Name & Date row */}
                <View style={styles.storeEditRow}>
                  <View style={{ flex: 1.3 }}>
                    <Text style={styles.inputLabel}>Store Name:</Text>
                    <TextInput
                      style={styles.storeInput}
                      value={scannedReceipt.storeName}
                      onChangeText={handleUpdateStoreName}
                      placeholder="Store Name"
                    />
                  </View>
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.inputLabel}>Date Bought:</Text>
                    <Pressable
                      style={styles.calendarPickerBtn}
                      onPress={() => setIsCalendarVisible(true)}
                    >
                      <Text style={styles.calendarIconText}>📅</Text>
                      <Text style={styles.calendarDateText}>
                        {scannedReceipt.tripDate
                          ? new Date(
                              scannedReceipt.tripDate,
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Pick Date"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Quick Date Shortcuts */}
                <View style={styles.quickDateRow}>
                  <Text style={styles.quickDateLabel}>Quick Date:</Text>
                  {/* <Pressable
                    style={styles.quickDateChip}
                    onPress={() => setIsCalendarVisible(true)}>
                    <Text style={styles.quickDateChipText}>🗓️ Calendar</Text>
                  </Pressable> */}
                  <Pressable
                    style={styles.quickDateChip}
                    onPress={() => handleSetQuickDate(0)}
                  >
                    <Text style={styles.quickDateChipText}>Today</Text>
                  </Pressable>
                  <Pressable
                    style={styles.quickDateChip}
                    onPress={() => handleSetQuickDate(1)}
                  >
                    <Text style={styles.quickDateChipText}>Yesterday</Text>
                  </Pressable>
                  <Pressable
                    style={styles.quickDateChip}
                    onPress={() => handleSetQuickDate(2)}
                  >
                    <Text style={styles.quickDateChipText}>2 Days Ago</Text>
                  </Pressable>
                </View>

                <View style={styles.receiptDivider} />

                {/* Items List */}
                <Text style={styles.itemsSectionLabel}>
                  Grocery Items ({scannedReceipt.items.length}):
                </Text>

                {scannedReceipt.items.map((it, idx) => (
                  <View key={idx} style={styles.editItemCard}>
                    {/* Row 1: Name and Delete Button */}
                    <View style={styles.itemTopRow}>
                      <TextInput
                        style={styles.itemNameInput}
                        value={it.name}
                        onChangeText={(txt) =>
                          handleUpdateItemField(idx, "name", txt)
                        }
                        placeholder="Item name (e.g. Avocado)"
                        placeholderTextColor="#9CA3AF"
                      />
                      <Pressable
                        style={styles.removeItemBtn}
                        onPress={() => handleRemoveScannedItem(idx)}
                      >
                        <Text style={styles.removeItemBtnText}>✕</Text>
                      </Pressable>
                    </View>

                    {/* Row 2: Price, Shelf Life, and Category */}
                    <View style={styles.itemBottomRow}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Price ($):</Text>
                        <TextInput
                          style={styles.priceInput}
                          value={String(it.price)}
                          onChangeText={(txt) =>
                            handleUpdateItemField(idx, "price", txt)
                          }
                          keyboardType="numeric"
                          placeholder="0.00"
                        />
                      </View>

                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Shelf Life:</Text>
                        <View style={styles.shelfLifeInputGroup}>
                          <TextInput
                            style={styles.shelfLifeInput}
                            value={String(it.shelfLifeDays || 5)}
                            onChangeText={(txt) =>
                              handleUpdateItemField(
                                idx,
                                "shelfLifeDays",
                                parseInt(txt, 10) || 5,
                              )
                            }
                            keyboardType="numeric"
                            placeholder="5"
                          />
                          <Text style={styles.daysLabel}>days</Text>
                        </View>
                      </View>

                      <View style={styles.fieldGroupCategory}>
                        <Text style={styles.fieldLabel}>Category:</Text>
                        <TextInput
                          style={styles.categoryInput}
                          value={it.category}
                          onChangeText={(txt) =>
                            handleUpdateItemField(idx, "category", txt)
                          }
                          placeholder="Category"
                        />
                      </View>
                    </View>
                  </View>
                ))}

                {/* Button to add an item manually */}
                <Pressable
                  style={styles.addItemBtn}
                  onPress={handleAddScannedItem}
                >
                  <Text style={styles.addItemBtnText}>+ Add Missing Item</Text>
                </Pressable>

                <View style={styles.receiptDivider} />

                {/* Total Cost Row */}
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>
                    Calculated Total:
                  </Text>
                  <Text style={styles.receiptTotalValue}>
                    ${scannedReceipt.totalCost.toFixed(2)}
                  </Text>
                </View>
              </ScrollView>
            )}

            {/* Action Buttons */}
            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setScannedReceipt(null)}
              >
                <Text style={styles.cancelBtnText}>Discard</Text>
              </Pressable>
              <Pressable
                style={styles.confirmBtn}
                onPress={handleConfirmReceiptIntake}
                disabled={isAddingReceipt}
              >
                {isAddingReceipt ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    ✓ Confirm &amp; Add to Fridge
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Calendar Date Picker Modal */}
      <CalendarPickerModal
        visible={isCalendarVisible}
        selectedDate={scannedReceipt?.tripDate || new Date().toISOString()}
        onSelectDate={(newDate) => handleUpdateTripDate(newDate)}
        onClose={() => setIsCalendarVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 14,
  },
  wasteBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  wasteBannerLeft: {
    flex: 1,
    marginRight: 8,
  },
  wasteBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
  },
  wasteBannerSub: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
  },
  recipePromptBtn: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  recipePromptBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  actionBar: {
    marginBottom: 10,
  },
  scanReceiptBtn: {
    backgroundColor: "#059669",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  scanReceiptBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  manualBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  boxTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  textInput: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
  },
  addBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 6,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  listSection: {
    flex: 1,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  listMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  cardMain: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
  },
  timeBoughtText: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 3,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  expiryBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiryUrgent: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
  },
  expiryFresh: {
    backgroundColor: "#ECFDF5",
    color: "#047857",
  },
  categoryBadge: {
    backgroundColor: "#F3F4F6",
    color: "#4B5563",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deleteBtn: {
    padding: 8,
  },
  deleteBtnText: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyBox: {
    padding: 32,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
  },
  emptySub: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 12,
  },
  optionsModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
  },
  optionsModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  optionsModalSub: {
    fontSize: 12,
    color: "#059669",
    marginTop: 3,
    marginBottom: 16,
  },
  optionBtnPrimary: {
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  optionBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  optionBtnSecondary: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionBtnSecondaryText: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "600",
  },
  optionCancelBtn: {
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  optionCancelText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    maxHeight: "88%",
  },
  modalHeaderRow: {
    marginBottom: 10,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  modalSubheading: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  modalReceiptScroll: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#F9FAFB",
    maxHeight: 380,
  },
  storeEditRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 2,
  },
  storeInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  calendarPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 6,
  },
  calendarIconText: {
    fontSize: 14,
  },
  calendarDateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  quickDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  quickDateLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  quickDateChip: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  quickDateChipText: {
    fontSize: 11,
    color: "#1D4ED8",
    fontWeight: "600",
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },
  itemsSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  editItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    marginBottom: 8,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  itemNameInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  removeItemBtn: {
    backgroundColor: "#FEE2E2",
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  removeItemBtnText: {
    color: "#DC2626",
    fontWeight: "bold",
    fontSize: 14,
  },
  itemBottomRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  fieldGroup: {
    flex: 1,
  },
  fieldGroupCategory: {
    flex: 1.3,
  },
  fieldLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
  },
  priceInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
  },
  shelfLifeInputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  shelfLifeInput: {
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
    width: 26,
    textAlign: "center",
  },
  daysLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  categoryInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: "#374151",
  },
  addItemBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 6,
  },
  addItemBtnText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 13,
  },
  receiptTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  receiptTotalLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
  },
  receiptTotalValue: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#059669",
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  cancelBtnText: {
    color: "#4B5563",
    fontWeight: "600",
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: "#059669",
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

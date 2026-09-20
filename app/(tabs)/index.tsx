import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AddGroceriesActionModal from "../../components/AddGroceriesActionModal";
import AddGroceryModal from "../../components/AddGroceryModal";
import FeastFriendRequirementModal from "../../components/FeastFriendRequirementModal";
import FoodCharacter from "../../components/FoodCharacter";
import RemoveItemSheet from "../../components/RemoveItemSheet";
import ScanReceiptModal from "../../components/ScanReceiptModal";
import StatusChip from "../../components/ui/StatusChip";
import StickerButton from "../../components/ui/StickerButton";
import { Colors, Fonts } from "../../constants/Theme";
import { useApp } from "../../context/AppContext";
import {
  CharacterKey,
  formatShelfTimeLeft,
  getDaysLeft,
  getStatusUrgency,
  lookupFoodCharacter,
} from "../../services/foodCharacterLookup";
import { ScannedReceiptResult } from "../../services/receiptOcrService";
import { FridgeItemRow } from "../../services/supabase/types";

type FilterType = "all" | "fresh" | "soon" | "now";

export default function ShelfScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    friends,
    fridgeItems,
    removeFridgeItem,
    addManualFridgeItem,
    addShoppingTripFromReceipt,
    backendSyncAttempted,
  } = useApp();

  // Buddy avatar state
  const [buddyKey, setBuddyKey] = useState<CharacterKey>("can");

  // Keep buddy in sync with You/Profile selections
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadBuddy = async () => {
        try {
          const stored =
            (await AsyncStorage.getItem(`user_buddy_${currentUser.id}`)) ||
            (await AsyncStorage.getItem("user_buddy_default"));
          if (isMounted && stored) {
            setBuddyKey(stored as CharacterKey);
          }
        } catch {}
      };
      loadBuddy();
      return () => {
        isMounted = false;
      };
    }, [currentUser.id]),
  );

  // Modals
  const [isAddMenuVisible, setIsAddMenuVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);
  const [scanImagePayload, setScanImagePayload] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);
  const [selectedItemForRemove, setSelectedItemForRemove] =
    useState<FridgeItemRow | null>(null);
  const [isFriendReqModalVisible, setIsFriendReqModalVisible] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // User items
  const userItems = useMemo(() => {
    return fridgeItems.filter((item) => item.user_id === currentUser.id);
  }, [fridgeItems, currentUser.id]);

  // Urgency classifications
  const { urgentRedCount, rescueBadgeCount, categorizedItems } = useMemo(() => {
    let redCount = 0;
    let yellowAndRedCount = 0;

    const mapped = userItems.map((item) => {
      const daysLeft = getDaysLeft(item.expires_at);
      const urgency = getStatusUrgency(daysLeft);
      const lookup = lookupFoodCharacter(item.name);

      if (urgency.status === "now") redCount++;
      if (urgency.needsRescue) yellowAndRedCount++;

      return {
        ...item,
        daysLeft,
        urgencyStatus: urgency.status,
        timeFormatted: formatShelfTimeLeft(daysLeft),
        characterKey: lookup.characterKey,
        foodCategory: lookup.category,
      };
    });

    return {
      urgentRedCount: redCount,
      rescueBadgeCount: yellowAndRedCount,
      categorizedItems: mapped,
    };
  }, [userItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return categorizedItems;
    return categorizedItems.filter(
      (item) => item.urgencyStatus === activeFilter,
    );
  }, [categorizedItems, activeFilter]);

  // Chunk items into rows of 3 for the wooden shelves
  const shelfRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < filteredItems.length; i += 3) {
      rows.push(filteredItems.slice(i, i + 3));
    }
    return rows;
  }, [filteredItems]);

  // Multi-select state
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedItemIds([]);
  };

  const handleItemPress = (item: (typeof categorizedItems)[0]) => {
    if (selectedItemIds.length > 0) {
      toggleItemSelection(item.id);
    } else {
      setSelectedItemForRemove(item);
    }
  };

  const handleItemLongPress = (item: (typeof categorizedItems)[0]) => {
    toggleItemSelection(item.id);
  };

  // Friends check for Feast Mode
  const mutualFriends = useMemo(() => {
    return friends.filter((f) => f.status === "accepted");
  }, [friends]);

  const handleFeastModePress = () => {
    if (mutualFriends.length === 0) {
      setIsFriendReqModalVisible(true);
    } else {
      router.push({
        pathname: "/(tabs)/feasts",
        params: { itemIds: selectedItemIds.join(",") },
      });
    }
  };

  const handleRescuePress = () => {
    if (selectedItemIds.length === 0) return;
    router.push({
      pathname: "/rescue",
      params: { itemIds: selectedItemIds.join(",") },
    });
  };

  const handleTossItem = (item: FridgeItemRow) => {
    removeFridgeItem(item.id);
    setSelectedItemIds((prev) => prev.filter((id) => id !== item.id));
    setSelectedItemForRemove(null);
  };

  const handleRemoveMistake = (item: FridgeItemRow) => {
    removeFridgeItem(item.id);
    setSelectedItemIds((prev) => prev.filter((id) => id !== item.id));
    setSelectedItemForRemove(null);
  };

  const handleAddManualItem = async (
    name: string,
    price: number,
    dateBoughtIso: string,
    category: string,
    shelfLifeDays: number,
    dateExpiredIso?: string,
  ) => {
    await addManualFridgeItem(
      name,
      price,
      dateBoughtIso,
      category,
      shelfLifeDays,
      dateExpiredIso,
    );
  };

  const handleAddReceipt = async (receipt: ScannedReceiptResult) => {
    await addShoppingTripFromReceipt(receipt);
  };

  const handleSelectScanCamera = async () => {
    setIsAddMenuVisible(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Camera access is required to take receipt photos.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setScanImagePayload({
          base64: result.assets[0].base64,
          mimeType: result.assets[0].mimeType || "image/jpeg",
        });
        setIsScanModalVisible(true);
      }
    } catch {
      Alert.alert("Camera Error", "Could not open camera.");
    }
  };

  const handleSelectUploadPhoto = async () => {
    setIsAddMenuVisible(false);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Gallery Permission Required",
          "Gallery access is needed to select receipt photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setScanImagePayload({
          base64: result.assets[0].base64,
          mimeType: result.assets[0].mimeType || "image/jpeg",
        });
        setIsScanModalVisible(true);
      }
    } catch {
      Alert.alert("Gallery Error", "Could not access photo library.");
    }
  };

  if (!backendSyncAttempted) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  // Safe bottom padding preventing Android 3-button navigation bar overlap with stacked buttons
  const safeBottomPadding =
    selectedItemIds.length > 0
      ? Math.max(insets.bottom, 16) + 160
      : Math.max(insets.bottom, 16) + 40;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: safeBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.appTitle}>Fridge Friends</Text>
            <Text style={styles.urgencySubtitle}>
              {urgentRedCount === 0
                ? "All groceries are fresh!"
                : `${urgentRedCount} ${urgentRedCount === 1 ? "item needs" : "items need"} rescuing!`}
            </Text>
          </View>

          {/* Profile Avatar (static image, non-clickable) */}
          <View style={styles.avatarSticker}>
            <FoodCharacter
              foodKey={buddyKey}
              mood="happy"
              size={44}
              animate={false}
            />
          </View>
        </View>

        {/* SECTION 2: Top Action Button (+ Add groceries) */}
        <View style={styles.topActionsRow}>
          <StickerButton
            title="+ Add groceries"
            onPress={() => setIsAddMenuVisible(true)}
            variant="primary"
            size="large"
          />
        </View>

        {/* SECTION 3: "Your shelf" Section Header & Multi-Select Status */}
        <View style={styles.shelfSectionHeader}>
          <View style={styles.shelfHeaderRow}>
            <Text style={styles.shelfTitle}>Your Fridge</Text>
            {selectedItemIds.length === 0 ? (
              <Text style={styles.shelfHelperText}>Hold item to select</Text>
            ) : null}
          </View>

          {selectedItemIds.length > 0 && (
            <View style={styles.selectionBar}>
              <Text style={styles.selectionCountText}>
                {selectedItemIds.length} {selectedItemIds.length === 1 ? "item" : "items"} selected
              </Text>
              <Pressable
                style={styles.cancelSelectionBtn}
                onPress={clearSelection}
                hitSlop={8}
              >
                <Text style={styles.cancelSelectionText}>Cancel</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* SECTION 4: Wooden Shelf Planks with Characters */}
        {shelfRows.length === 0 ? (
          <View style={styles.emptyShelfBox}>
            <FoodCharacter foodKey="spinach" mood="happy" size={70} />
            <Text style={styles.emptyShelfTitle}>Your fridge is empty</Text>
            <Text style={styles.emptyShelfSub}>
              Tap + Add groceries or scan a receipt to stock your fridge.
            </Text>
          </View>
        ) : (
          <View style={styles.shelvesContainer}>
            {shelfRows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.shelfRowUnit}>
                {/* Food Characters Standing on Plank */}
                <View style={styles.shelfCharactersRow}>
                  {row.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.foodSpot,
                          isSelected && styles.foodSpotSelected,
                        ]}
                        onPress={() => handleItemPress(item)}
                        onLongPress={() => handleItemLongPress(item)}
                        delayLongPress={250}
                      >
                        {isSelected && (
                          <View style={styles.selectedCheckBadge}>
                            <Text style={styles.selectedCheckText}>✓</Text>
                          </View>
                        )}
                        <FoodCharacter
                          foodKey={item.characterKey}
                          mood={undefined}
                          category={item.foodCategory}
                          daysLeft={item.daysLeft}
                          size={84}
                          animate={true}
                        />

                        {/* Name Label */}
                        <Text style={styles.foodName} numberOfLines={1}>
                          {item.name}
                        </Text>

                        {/* Urgency Status Chip */}
                        <StatusChip
                          label={item.timeFormatted}
                          status={item.urgencyStatus}
                          size="small"
                        />
                      </Pressable>
                    );
                  })}

                  {/* Empty spot spacers to maintain 3-column layout */}
                  {Array.from({ length: Math.max(0, 3 - row.length) }).map(
                    (_, emptyIdx) => (
                      <View
                        key={`empty-${emptyIdx}`}
                        style={styles.foodSpotPlaceholder}
                      />
                    ),
                  )}
                </View>

                {/* Wooden Plank Graphic */}
                <View style={styles.woodenPlankWrapper}>
                  <View style={styles.woodenPlank}>
                    {/* Wood grain highlight */}
                    <View style={styles.woodPlankHighlight} />
                  </View>
                  {/* Plank bevel shadow */}
                  <View style={styles.woodPlankUnderShadow} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* SECTION 5: Floating Bottom Action Buttons (Only shown when items selected) */}
      {selectedItemIds.length > 0 && (
        <View
          style={[
            styles.bottomFloatingBar,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <View style={styles.bottomButtonsStack}>
            <StickerButton
              title={`Rescue ingredients (${selectedItemIds.length})`}
              onPress={handleRescuePress}
              variant="primary"
              size="large"
            />

            <StickerButton
              title="Feast mode"
              onPress={handleFeastModePress}
              variant="secondary"
              size="large"
            />
          </View>
        </View>
      )}

      {/* Modals & Sheets */}
      <AddGroceriesActionModal
        visible={isAddMenuVisible}
        onClose={() => setIsAddMenuVisible(false)}
        onSelectManual={() => {
          setIsAddMenuVisible(false);
          setIsAddModalVisible(true);
        }}
        onSelectScanCamera={handleSelectScanCamera}
        onSelectUploadPhoto={handleSelectUploadPhoto}
      />

      <AddGroceryModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onAdd={handleAddManualItem}
      />

      <ScanReceiptModal
        visible={isScanModalVisible}
        imagePayload={scanImagePayload}
        onClose={() => {
          setIsScanModalVisible(false);
          setScanImagePayload(null);
        }}
        onAddItems={handleAddReceipt}
      />

      <RemoveItemSheet
        visible={selectedItemForRemove !== null}
        item={selectedItemForRemove}
        onClose={() => setSelectedItemForRemove(null)}
        onToss={handleTossItem}
        onRemoveMistake={handleRemoveMistake}
      />

      <FeastFriendRequirementModal
        visible={isFriendReqModalVisible}
        onClose={() => setIsFriendReqModalVisible(false)}
        onAddFriend={() => {
          setIsFriendReqModalVisible(false);
          router.push("/(tabs)/insights");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 54,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTextWrap: {
    flex: 1,
  },
  appTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 28,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  urgencySubtitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 16,
    color: Colors.terracotta,
    marginTop: 4,
  },
  avatarSticker: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.fresh.bg,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  topActionsRow: {
    marginBottom: 24,
  },
  shelfSectionHeader: {
    marginBottom: 16,
  },
  shelfHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  shelfTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
  },
  shelfHelperText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: "#8A776A",
  },
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF2EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.terracotta,
    marginTop: 4,
  },
  selectionCountText: {
    fontFamily: Fonts.headingBold,
    fontSize: 15,
    color: Colors.terracotta,
  },
  cancelSelectionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: Colors.paper,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  cancelSelectionText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: Colors.ink,
  },
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emptyShelfBox: {
    marginTop: 40,
    padding: 30,
    borderRadius: 24,
    backgroundColor: "rgba(255, 253, 247, 0.7)",
    borderWidth: 2,
    borderColor: Colors.ink,
    alignItems: "center",
    gap: 10,
  },
  emptyShelfTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
  },
  emptyShelfSub: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 14,
    color: "#76665A",
    textAlign: "center",
  },
  shelvesContainer: {
    marginTop: 8,
  },
  shelfRowUnit: {
    marginBottom: 32,
  },
  shelfCharactersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    alignItems: "flex-end",
    marginBottom: -6, // Characters stand on plank
  },
  foodSpot: {
    width: "31%",
    alignItems: "center",
    gap: 4,
    position: "relative",
    paddingVertical: 4,
    borderRadius: 14,
  },
  foodSpotSelected: {
    backgroundColor: "rgba(235, 107, 75, 0.12)",
    borderWidth: 2,
    borderColor: Colors.terracotta,
  },
  selectedCheckBadge: {
    position: "absolute",
    top: -6,
    right: 2,
    zIndex: 10,
    backgroundColor: Colors.terracotta,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  selectedCheckText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  foodSpotPlaceholder: {
    width: "31%",
  },
  foodName: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: Colors.ink,
    textAlign: "center",
    marginTop: 2,
  },
  woodenPlankWrapper: {
    width: "100%",
    position: "relative",
  },
  woodenPlank: {
    height: 18,
    backgroundColor: Colors.shelfWood,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    borderRadius: 6,
    overflow: "hidden",
  },
  woodPlankHighlight: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  woodPlankUnderShadow: {
    height: 6,
    backgroundColor: Colors.shelfWoodDark,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    marginHorizontal: 3,
    marginTop: -2,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: Colors.ink,
  },
  bottomFloatingBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(251, 243, 228, 0.95)",
    borderTopWidth: 1.5,
    borderTopColor: "#E6D7C3",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bottomButtonsStack: {
    flexDirection: "column",
    gap: 10,
  },
});

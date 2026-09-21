import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
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
  const { friendId } = useLocalSearchParams<{ friendId?: string }>();
  const {
    currentUser,
    friends,
    fridgeItems,
    removeFridgeItem,
    tossFridgeItem,
    addManualFridgeItem,
    addShoppingTripFromReceipt,
    backendSyncAttempted,
  } = useApp();

  const viewedFriend = friendId ? friends.find((f) => f.id === friendId) : null;
  const isViewingFriend = !!viewedFriend;

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

  // Items to display (either viewed friend's fridge or current user's fridge)
  const displayItems = useMemo(() => {
    if (isViewingFriend && friendId) {
      return fridgeItems.filter((item) => item.user_id === friendId);
    }
    return fridgeItems.filter((item) => item.user_id === currentUser.id);
  }, [fridgeItems, currentUser.id, isViewingFriend, friendId]);

  // Urgency classifications
  const { urgentRedCount, rescueBadgeCount, categorizedItems } = useMemo(() => {
    let redCount = 0;
    let yellowAndRedCount = 0;

    const mapped = displayItems.map((item) => {
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
  }, [displayItems]);

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
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [bottomBarHeight, setBottomBarHeight] = useState(160);

  const toggleItemSelection = (id: string) => {
    if (isViewingFriend) return;
    setSelectedItemIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((i) => i !== id) : [...prev, id];
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedItemIds([]);
  };

  const handleToggleSelectMode = () => {
    if (isSelectMode) {
      setIsSelectMode(false);
      setSelectedItemIds([]);
    } else {
      setIsSelectMode(true);
    }
  };

  const handleItemPress = (item: (typeof categorizedItems)[0]) => {
    if (isViewingFriend) return;
    if (isSelectMode) {
      toggleItemSelection(item.id);
    } else {
      setSelectedItemForRemove(item);
    }
  };

  const handleItemLongPress = (item: (typeof categorizedItems)[0]) => {
    if (isViewingFriend) return;
    if (!isSelectMode) {
      setIsSelectMode(true);
    }
    toggleItemSelection(item.id);
  };

  // Friends check for Feast Mode
  const mutualFriends = useMemo(() => {
    return friends.filter((f) => f.status === "accepted");
  }, [friends]);

  const handleFeastModePress = () => {
    if (selectedItemIds.length === 0) {
      Alert.alert(
        "No Groceries Selected",
        "Select ingredients first to plan a feast!",
      );
      return;
    }
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
    if (selectedItemIds.length === 0) {
      Alert.alert(
        "No Groceries Selected",
        "Select ingredients first to rescue them!",
      );
      return;
    }
    router.push({
      pathname: "/rescue",
      params: { itemIds: selectedItemIds.join(",") },
    });
  };

  const handleTossItem = (item: FridgeItemRow) => {
    tossFridgeItem(item.id);
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
  // Measured rather than guessed: the bar grows with the safe-area inset and
  // with its own button labels, and a short guess left the last shelf row
  // sitting underneath it.
  const safeBottomPadding =
    selectedItemIds.length > 0
      ? bottomBarHeight + 24
      : Math.max(insets.bottom, 16) + 40;

  return (
    <View style={styles.screen}>
      {/* Pinned header: stays put while the shelf scrolls under it */}
      <View style={styles.pinnedHeader}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.appTitle}>
              {isViewingFriend
                ? `@${viewedFriend?.username}'s Fridge`
                : "Fridge Friends"}
            </Text>
            <Text style={styles.urgencySubtitle}>
              {categorizedItems.length === 0 && !isViewingFriend
                ? "No groceries yet."
                : urgentRedCount === 0
                  ? "All groceries are fresh!"
                  : `${urgentRedCount} ${urgentRedCount === 1 ? "item needs" : "items need"} rescuing!`}
            </Text>
          </View>

          {/* Profile Avatar (static image, non-clickable) */}
          <View style={styles.avatarSticker}>
            <FoodCharacter
              foodKey={isViewingFriend ? "lemon" : buddyKey}
              mood="happy"
              size={44}
              animate={false}
            />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: safeBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Friend Fridge Banner */}
        {isViewingFriend && (
          <View style={styles.viewingFriendBanner}>
            <Pressable
              style={styles.backToMyFridgeBtn}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.backToMyFridgeText}>‹ Back to My Fridge</Text>
            </Pressable>
            <Text style={styles.viewingFriendNotice}>
              Viewing {viewedFriend?.display_name}'s Fridge
            </Text>
          </View>
        )}

        {/* SECTION 2: Top Action Button (+ Add groceries) */}
        {!isViewingFriend && (
          <View style={styles.topActionsRow}>
            <StickerButton
              title="+ Add groceries"
              onPress={() => setIsAddMenuVisible(true)}
              variant="primary"
              size="large"
            />
          </View>
        )}

        {/* SECTION 3: "Your shelf" Section Header & Multi-Select Status */}
        <View style={styles.shelfSectionHeader}>
          <View style={styles.shelfHeaderRow}>
            <View style={styles.shelfTitleCol}>
              <Text style={styles.shelfTitle}>
                {isViewingFriend
                  ? `${viewedFriend?.display_name?.split(' ')[0]}'s Fridge`
                  : isSelectMode
                    ? "Pick ingredients"
                    : "Your Fridge"}
              </Text>
              {!isViewingFriend &&
                (isSelectMode ? (
                  <View style={styles.pickSubtitleRow}>
                    <Text style={styles.pickSubtitleCount}>
                      {selectedItemIds.length} selected
                    </Text>
                    {selectedItemIds.length > 0 && (
                      <>
                        <Text style={styles.pickSubtitleDot}> · </Text>
                        <Pressable onPress={clearSelection} hitSlop={6}>
                          <Text style={styles.clearSelectionLink}>Clear</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                ) : (
                  <Text style={styles.shelfHelperText}>
                    {rescueBadgeCount > 0
                      ? `${rescueBadgeCount} need rescuing · ${urgentRedCount} urgent`
                      : `${categorizedItems.length} items total`}
                  </Text>
                ))}
            </View>

            {!isViewingFriend && (
              <Pressable
                style={[
                  styles.selectPillBtn,
                  isSelectMode && styles.donePillBtn,
                ]}
                onPress={handleToggleSelectMode}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.selectPillText,
                    isSelectMode && styles.donePillText,
                  ]}
                >
                  {isSelectMode ? "Cancel" : "Select"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* SECTION 4: Wooden Shelf Planks with Characters */}
        {shelfRows.length === 0 ? (
          <View style={styles.emptyShelfBox}>
            <FoodCharacter foodKey="spinach" mood="happy" size={70} />
            <Text style={styles.emptyShelfTitle}>
              {isViewingFriend
                ? "No items need rescuing!"
                : 'Your fridge is empty'}
            </Text>
            <Text style={styles.emptyShelfSub}>
              {isViewingFriend
                ? `${viewedFriend?.display_name?.split(' ')[0]} doesn't have any food about to expire.`
                : 'Tap + Add groceries or scan a receipt to stock your fridge.'}
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
                        style={styles.foodSpot}
                        onPress={() => handleItemPress(item)}
                        onLongPress={() => handleItemLongPress(item)}
                        delayLongPress={250}
                      >
                        {/* Handover V2 Screen 5: dashed circle when unselected in pick mode, solid white circle with dark ink border when selected */}
                        <View
                          style={[
                            styles.characterRingNormal,
                            isSelectMode &&
                              (isSelected
                                ? styles.characterRingPicked
                                : styles.characterRingUnpicked),
                          ]}
                        >
                          {isSelectMode && isSelected && (
                            <View style={styles.selectedCheckBadge}>
                              <Text style={styles.selectedCheckText}>✓</Text>
                            </View>
                          )}
                          <FoodCharacter
                            foodKey={item.characterKey}
                            mood={undefined}
                            category={item.foodCategory}
                            daysLeft={item.daysLeft}
                            size={76}
                            animate={true}
                          />
                        </View>

                        {/* Name Label */}
                        <Text style={styles.foodName} numberOfLines={1}>
                          {item.name}
                        </Text>

                        {/* Urgency Status Chip */}
                        <StatusChip
                          label={item.timeFormatted}
                          status={item.urgencyStatus}
                          size="small"
                          // StatusChip pins itself to flex-start, which left-aligned
                          // the chip under a centred name. Centre it back.
                          style={{ alignSelf: "center" }}
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

      {/* SECTION 5: Floating Bottom Action Buttons (Only appear when ingredients are selected) */}
      {!isViewingFriend && selectedItemIds.length > 0 && (
        <View
          style={[
            styles.bottomFloatingBar,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
          onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.bottomButtonsStack}>
            <StickerButton
              title={`Rescue ingredients [${selectedItemIds.length}]`}
              onPress={handleRescuePress}
              variant="primary"
              size="large"
            />

            <StickerButton
              title={`Feast mode [${selectedItemIds.length}]`}
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
          router.push("/(tabs)/social");
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
  pinnedHeader: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.cream,
  },
  content: {
    paddingTop: 8,
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
    alignItems: "center",
    marginBottom: 8,
  },
  shelfTitleCol: {
    flex: 1,
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
    marginTop: 2,
  },
  selectPillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#F0EAE1",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    justifyContent: "center",
    alignItems: "center",
  },
  selectPillText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  donePillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.terracotta,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    justifyContent: "center",
    alignItems: "center",
  },
  donePillText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: "#FAF6F0",
  },
  pickSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  pickSubtitleCount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.terracotta,
  },
  pickSubtitleDot: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: "#8A776A",
  },
  clearSelectionLink: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: Colors.ink,
    textDecorationLine: "underline",
  },
  characterRingNormal: {
    width: 86,
    height: 86,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  characterRingUnpicked: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: "#D9CFC4",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  characterRingPicked: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: Colors.ink,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
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
    // flex-start, not space-between: a row holding one or two items has to sit
    // in the same columns as the full rows above it rather than spreading out
    justifyContent: "flex-start",
    paddingHorizontal: 8,
    alignItems: "flex-end",
    marginBottom: -6, // Characters stand on plank
  },
  foodSpot: {
    width: "33.33%",
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
    width: "100%",
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
    backgroundColor: Colors.cream,
    borderTopWidth: 1.5,
    borderTopColor: "#E6D7C3",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bottomButtonsStack: {
    flexDirection: "column",
    gap: 10,
  },
  viewingFriendBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EBF3E8",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.ink,
    marginBottom: 16,
  },
  backToMyFridgeBtn: {
    backgroundColor: Colors.paper,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  backToMyFridgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: Colors.ink,
  },
  viewingFriendNotice: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: "#2E5A36",
  },
});

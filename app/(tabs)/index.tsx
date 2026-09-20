import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Fonts, Radius } from '../../constants/Theme';
import StickerCard from '../../components/ui/StickerCard';
import StickerButton from '../../components/ui/StickerButton';
import StatusChip from '../../components/ui/StatusChip';
import FoodCharacter from '../../components/FoodCharacter';
import AddGroceryModal from '../../components/AddGroceryModal';
import ScanReceiptModal from '../../components/ScanReceiptModal';
import RemoveItemSheet from '../../components/RemoveItemSheet';
import FeastFriendRequirementModal from '../../components/FeastFriendRequirementModal';
import {
  lookupFoodCharacter,
  getDaysLeft,
  getStatusUrgency,
  formatShelfTimeLeft,
} from '../../services/foodCharacterLookup';
import { FridgeItemRow } from '../../services/supabase/types';
import { ScannedReceiptResult } from '../../services/receiptOcrService';

type FilterType = 'all' | 'fresh' | 'soon' | 'now';

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

  // Modals
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);
  const [selectedItemForRemove, setSelectedItemForRemove] = useState<FridgeItemRow | null>(null);
  const [isFriendReqModalVisible, setIsFriendReqModalVisible] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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

      if (urgency.status === 'now') redCount++;
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
    if (activeFilter === 'all') return categorizedItems;
    return categorizedItems.filter((item) => item.urgencyStatus === activeFilter);
  }, [categorizedItems, activeFilter]);

  // Chunk items into rows of 3 for the wooden shelves
  const shelfRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < filteredItems.length; i += 3) {
      rows.push(filteredItems.slice(i, i + 3));
    }
    return rows;
  }, [filteredItems]);

  // Friends check for Feast Mode
  const mutualFriends = useMemo(() => {
    return friends.filter((f) => f.status === 'accepted');
  }, [friends]);

  const handleFeastModePress = () => {
    if (mutualFriends.length === 0) {
      setIsFriendReqModalVisible(true);
    } else {
      router.push('/(tabs)/feasts');
    }
  };

  const handleRescuePress = () => {
    router.push('/rescue');
  };

  const handleTossItem = (item: FridgeItemRow) => {
    removeFridgeItem(item.id);
    setSelectedItemForRemove(null);
  };

  const handleRemoveMistake = (item: FridgeItemRow) => {
    removeFridgeItem(item.id);
    setSelectedItemForRemove(null);
  };

  const handleAddManualItem = async (
    name: string,
    price: number,
    dateBoughtIso: string,
    category: string,
    shelfLifeDays: number,
    dateExpiredIso?: string
  ) => {
    await addManualFridgeItem(name, price, dateBoughtIso, category, shelfLifeDays, dateExpiredIso);
  };

  const handleAddReceipt = async (receipt: ScannedReceiptResult) => {
    await addShoppingTripFromReceipt(receipt);
  };

  if (!backendSyncAttempted) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  // Safe bottom padding preventing Android 3-button navigation bar overlap with stacked buttons
  const safeBottomPadding = Math.max(insets.bottom, 16) + 160;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.appTitle}>Fridge Friends</Text>
            <Text style={styles.urgencySubtitle}>
              {urgentRedCount === 0
                ? 'All groceries are fresh!'
                : `${urgentRedCount} ${urgentRedCount === 1 ? 'item needs' : 'items need'} rescuing!`}
            </Text>
          </View>
        </View>

        {/* SECTION 2: Top Action Buttons (+ Add groceries & Receipt) */}
        <View style={styles.topActionsRow}>
          <View style={{ flex: 1 }}>
            <StickerButton
              title="+ Add groceries"
              onPress={() => setIsAddModalVisible(true)}
              variant="primary"
              size="large"
            />
          </View>

          <Pressable
            style={styles.receiptScanBtn}
            onPress={() => setIsScanModalVisible(true)}
            hitSlop={6}
          >
            <View style={styles.receiptIconInner}>
              <Text style={{ fontSize: 24 }}>🧾</Text>
            </View>
          </Pressable>
        </View>

        {/* SECTION 3: "Your shelf" Section Header & Status Filter Chips */}
        <View style={styles.shelfSectionHeader}>
          <Text style={styles.shelfTitle}>Your shelf</Text>
          <View style={styles.filterChipsRow}>
            <StatusChip
              label="All"
              status="neutral"
              isSelected={activeFilter === 'all'}
              onPress={() => setActiveFilter('all')}
            />
            <StatusChip
              label="Fresh"
              status="fresh"
              isSelected={activeFilter === 'fresh'}
              onPress={() => setActiveFilter(activeFilter === 'fresh' ? 'all' : 'fresh')}
            />
            <StatusChip
              label="Use soon"
              status="soon"
              isSelected={activeFilter === 'soon'}
              onPress={() => setActiveFilter(activeFilter === 'soon' ? 'all' : 'soon')}
            />
            <StatusChip
              label="Use now"
              status="now"
              isSelected={activeFilter === 'now'}
              onPress={() => setActiveFilter(activeFilter === 'now' ? 'all' : 'now')}
            />
          </View>
        </View>

        {/* SECTION 4: Wooden Shelf Planks with Characters */}
        {shelfRows.length === 0 ? (
          <View style={styles.emptyShelfBox}>
            <FoodCharacter foodKey="spinach" mood="happy" size={70} />
            <Text style={styles.emptyShelfTitle}>Your shelf is empty</Text>
            <Text style={styles.emptyShelfSub}>
              Tap + Add groceries or scan a receipt to stock your shelf.
            </Text>
          </View>
        ) : (
          <View style={styles.shelvesContainer}>
            {shelfRows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.shelfRowUnit}>
                {/* Food Characters Standing on Plank */}
                <View style={styles.shelfCharactersRow}>
                  {row.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.foodSpot}
                      onPress={() => setSelectedItemForRemove(item)}
                    >
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
                  ))}

                  {/* Empty spot spacers to maintain 3-column layout */}
                  {Array.from({ length: Math.max(0, 3 - row.length) }).map((_, emptyIdx) => (
                    <View key={`empty-${emptyIdx}`} style={styles.foodSpotPlaceholder} />
                  ))}
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

      {/* SECTION 5: Floating Bottom Action Buttons (Rescue & Feast) */}
      <View
        style={[
          styles.bottomFloatingBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 8 },
        ]}
      >
        <View style={styles.bottomButtonsStack}>
          <StickerButton
            title="Rescue ingredients"
            badge={rescueBadgeCount}
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

      {/* Modals & Sheets */}
      <AddGroceryModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onAdd={handleAddManualItem}
      />

      <ScanReceiptModal
        visible={isScanModalVisible}
        onClose={() => setIsScanModalVisible(false)}
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
          router.push('/(tabs)/insights');
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 54,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    borderRadius: 18,
    backgroundColor: Colors.paper,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 28,
  },
  receiptScanBtn: {
    width: 56,
    height: 56,
    borderRadius: Radius.button,
    backgroundColor: Colors.paper,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  receiptIconInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shelfSectionHeader: {
    marginBottom: 16,
  },
  shelfTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
    marginBottom: 10,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyShelfBox: {
    marginTop: 40,
    padding: 30,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 253, 247, 0.7)',
    borderWidth: 2,
    borderColor: Colors.ink,
    alignItems: 'center',
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
    color: '#76665A',
    textAlign: 'center',
  },
  shelvesContainer: {
    marginTop: 8,
  },
  shelfRowUnit: {
    marginBottom: 32,
  },
  shelfCharactersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    alignItems: 'flex-end',
    marginBottom: -6, // Characters stand on plank
  },
  foodSpot: {
    width: '31%',
    alignItems: 'center',
    gap: 4,
  },
  foodSpotPlaceholder: {
    width: '31%',
  },
  foodName: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: Colors.ink,
    textAlign: 'center',
    marginTop: 2,
  },
  woodenPlankWrapper: {
    width: '100%',
    position: 'relative',
  },
  woodenPlank: {
    height: 18,
    backgroundColor: Colors.shelfWood,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    borderRadius: 6,
    overflow: 'hidden',
  },
  woodPlankHighlight: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(251, 243, 228, 0.95)',
    borderTopWidth: 1.5,
    borderTopColor: '#E6D7C3',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bottomButtonsStack: {
    flexDirection: 'column',
    gap: 10,
  },
});

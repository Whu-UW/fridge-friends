import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Fonts, Radius } from '../../constants/Theme';
import StickerCard from '../../components/ui/StickerCard';
import StickerButton from '../../components/ui/StickerButton';
import StatusChip from '../../components/ui/StatusChip';
import FoodCharacter from '../../components/FoodCharacter';
import {
  lookupFoodCharacter,
  getDaysLeft,
  getStatusUrgency,
  formatShelfTimeLeft,
} from '../../services/foodCharacterLookup';
import { FridgeItemRow } from '../../services/supabase/types';

export default function FriendFridgeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    friends,
    followingFriendIds,
    toggleFollowFriend,
    getFriendFridgeItems,
    backendSyncAttempted,
  } = useApp();

  const friend = friends.find((f) => f.id === id);
  const items = id ? getFriendFridgeItems(id) : [];
  const isFollowing = id ? followingFriendIds.includes(id) : false;

  if (!backendSyncAttempted) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
        <Text style={styles.loadingTitle}>Loading Shared Fridge...</Text>
      </View>
    );
  }

  if (!friend) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Friend Not Found</Text>
        <Text style={styles.errorSub}>Could not locate friend profile with ID: {id}</Text>
        <Pressable style={styles.backBtnAction} onPress={() => router.back()}>
          <Text style={styles.backBtnActionText}>‹ Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const renderItem = ({ item }: { item: FridgeItemRow }) => {
    const daysLeft = getDaysLeft(item.expires_at);
    const urgency = getStatusUrgency(daysLeft);
    const lookup = lookupFoodCharacter(item.name);
    const timeFormatted = formatShelfTimeLeft(daysLeft);

    return (
      <StickerCard
        backgroundColor={Colors.paper}
        shadowOffset={4}
        borderRadius={20}
        style={styles.itemCard}
      >
        <View style={styles.itemRow}>
          <FoodCharacter
            foodKey={lookup.characterKey}
            category={lookup.category}
            daysLeft={daysLeft}
            size={56}
            animate={urgency.status === 'now'}
          />

          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.itemCategory}>
              {lookup.categoryLabel} · {item.quantity || '1 item'}
            </Text>
          </View>

          <StatusChip
            label={timeFormatted}
            status={urgency.status}
            size="small"
          />
        </View>
      </StickerCard>
    );
  };

  const initial = friend.display_name.charAt(0).toUpperCase();
  const firstName = friend.display_name.split(' ')[0];
  const safeBottomPadding = Math.max(insets.bottom, 16) + 30;

  return (
    <View style={styles.screen}>
      {/* Header with Back Arrow */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Text style={styles.backBtnArrow}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{firstName}&apos;s Fridge</Text>
          <Text style={styles.headerSubtitle}>Shared pantry & ingredients</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Friend Profile Sticker Card */}
            <StickerCard
              backgroundColor={Colors.paper}
              shadowOffset={4}
              borderRadius={22}
              style={styles.profileCard}
            >
              <View style={styles.profileRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{friend.display_name}</Text>
                  <Text style={styles.profileUsername}>@{friend.username}</Text>
                  <Text style={styles.profileItemsCount}>
                    {items.length === 0
                      ? 'No items currently in fridge'
                      : `${items.length} ${items.length === 1 ? 'grocery item' : 'grocery items'} shared`}
                  </Text>
                </View>

                <View style={{ width: 100 }}>
                  <StickerButton
                    title={isFollowing ? 'Following' : '+ Follow'}
                    onPress={() => toggleFollowFriend(friend.id)}
                    variant={isFollowing ? 'secondary' : 'primary'}
                    size="small"
                  />
                </View>
              </View>
            </StickerCard>

            {/* Hint Notice Card */}
            <View style={styles.noticeWrap}>
              <Text style={styles.noticeText}>
                You can invite {firstName} to Feast Mode to combine your ingredients and rescue food together!
              </Text>
            </View>

            <Text style={styles.sectionHeading}>
              {firstName}&apos;s Shelf Items ({items.length})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <StickerCard
            backgroundColor={Colors.paper}
            shadowOffset={4}
            borderRadius={22}
            style={styles.emptyCard}
          >
            <FoodCharacter foodKey="can" mood="happy" size={72} animate={false} />
            <Text style={styles.emptyTitle}>Fridge is Empty</Text>
            <Text style={styles.emptySub}>
              {firstName} hasn&apos;t added any groceries to their shared shelf yet.
            </Text>
          </StickerCard>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 16,
    color: Colors.ink,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  errorTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
  },
  errorSub: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 15,
    color: '#76665A',
    textAlign: 'center',
  },
  backBtnAction: {
    marginTop: 12,
    backgroundColor: Colors.terracotta,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.button,
  },
  backBtnActionText: {
    fontFamily: Fonts.headingBold,
    fontSize: 15,
    color: Colors.paper,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.paper,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnArrow: {
    fontFamily: Fonts.headingBold,
    fontSize: 26,
    color: Colors.ink,
    marginTop: -4,
  },
  headerTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 24,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 14,
    color: '#76665A',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  headerSection: {
    gap: 14,
    marginBottom: 4,
  },
  profileCard: {
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FDEBD0',
    borderWidth: 2.5,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
  },
  profileName: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
  },
  profileUsername: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: '#76665A',
  },
  profileItemsCount: {
    fontFamily: Fonts.headingMedium,
    fontSize: 12,
    color: Colors.terracotta,
    marginTop: 2,
  },
  noticeWrap: {
    backgroundColor: 'rgba(255, 253, 247, 0.7)',
    borderWidth: 1.5,
    borderColor: '#E6D7C3',
    borderRadius: 14,
    padding: 12,
  },
  noticeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 18,
  },
  sectionHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
    marginTop: 6,
  },
  itemCard: {
    padding: 12,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
    marginBottom: 2,
  },
  itemCategory: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
  },
  emptySub: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 14,
    color: '#76665A',
    textAlign: 'center',
  },
});

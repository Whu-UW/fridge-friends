import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { FridgeItemRow } from '../../services/supabase/types';

export default function FriendFridgeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { friends, followingFriendIds, toggleFollowFriend, getFriendFridgeItems } = useApp();

  const friend = friends.find((f) => f.id === id);
  const items = id ? getFriendFridgeItems(id) : [];
  const isFollowing = id ? followingFriendIds.includes(id) : false;

  if (!friend) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Friend Not Found</Text>
        <Text style={styles.errorSub}>Could not locate friend profile with ID: {id}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const formatExpiration = (expiresAtIso: string) => {
    const hoursLeft = Math.round(
      (new Date(expiresAtIso).getTime() - Date.now()) / 36e5
    );
    if (hoursLeft <= 0) return 'Expired';
    if (hoursLeft < 48) return `Expires in ${hoursLeft}h`;
    const days = Math.ceil(hoursLeft / 24);
    return `Expires in ${days} days`;
  };

  const renderItem = ({ item }: { item: FridgeItemRow }) => {
    const hoursLeft = Math.round(
      (new Date(item.expires_at).getTime() - Date.now()) / 36e5
    );
    const isUrgent = hoursLeft <= 48;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemMain}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            Quantity: {item.quantity} • {item.category}
          </Text>
        </View>
        <Text
          style={[
            styles.expiryBadge,
            isUrgent ? styles.expiryUrgent : styles.expiryFresh,
          ]}>
          {formatExpiration(item.expires_at)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{friend.display_name.charAt(0)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>{friend.display_name}</Text>
          <Text style={styles.username}>@{friend.username}</Text>
          <Text style={styles.statsText}>
            {items.length} items logged in fridge
          </Text>
        </View>
        <Pressable
          style={[
            styles.followBtn,
            isFollowing ? styles.followingState : styles.notFollowingState,
          ]}
          onPress={() => toggleFollowFriend(friend.id)}>
          <Text
            style={[
              styles.followBtnText,
              isFollowing ? styles.followingText : styles.notFollowingText,
            ]}>
            {isFollowing ? 'Following' : '+ Follow'}
          </Text>
        </Pressable>
      </View>

      {/* Info Notice */}
      <View style={styles.noticeBox}>
        <Text style={styles.noticeTitle}>
          👀 Viewing {friend.display_name}'s Shared Fridge
        </Text>
        <Text style={styles.noticeSub}>
          Invite {friend.display_name} to a dinner party from your fridge to combine
          ingredients and cook zero-waste meals together.
        </Text>
      </View>

      {/* Inventory */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Fridge is Empty</Text>
            <Text style={styles.emptySub}>
              {friend.display_name} has not added any grocery items yet.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 14,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  username: {
    fontSize: 12,
    color: '#6B7280',
  },
  statsText: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  followBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  notFollowingState: {
    backgroundColor: '#2563EB',
  },
  followingState: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notFollowingText: {
    color: '#FFFFFF',
  },
  followingText: {
    color: '#374151',
  },
  noticeBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  noticeSub: {
    fontSize: 12,
    color: '#1E40AF',
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 24,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMain: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  itemMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  expiryBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  errorSub: {
    fontSize: 13,
    color: '#6B7280',
    marginVertical: 8,
  },
  backBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

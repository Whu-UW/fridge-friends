import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, FriendEntry } from '../../context/AppContext';

export default function SocialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    friends,
    addFriend,
    acceptFriendRequest,
    removeFriend,
    getFriendFridgeItems,
    backendConnected,
    backendSyncAttempted,
  } = useApp();

  // Add Friend Input State
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isAddingVisible, setIsAddingVisible] = useState(false);

  // Filter friends: only mutual (accepted) and pending requests
  const acceptedFriends = friends.filter((f) => f.status === 'accepted');
  const pendingFriends = friends.filter((f) => f.status === 'pending');

  const handleAddFriendSubmit = () => {
    const trimmedUser = newUsername.trim();
    if (!trimmedUser) {
      Alert.alert('Validation Error', 'Please enter a username.');
      return;
    }

    addFriend(trimmedUser, newDisplayName.trim());
    setNewUsername('');
    setNewDisplayName('');
    setIsAddingVisible(false);
    Alert.alert(
      'Friend Request Sent',
      `Sent friend request to @${trimmedUser.replace('@', '')}. Once accepted, you can inspect each other's fridges!`
    );
  };

  const handleConfirmRemoveFriend = (friend: FriendEntry) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.display_name} (@${friend.username})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFriend(friend.id),
        },
      ]
    );
  };

  // Safe bottom padding preventing Android navigation bar overlap
  const safeBottomPadding = Math.max(insets.bottom, 16) + 100;

  if (!backendSyncAttempted) {
    return (
      <View style={styles.initialLoadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.initialLoadingTitle}>Connecting to Live Database...</Text>
        <Text style={styles.initialLoadingSub}>
          Loading friends and shared fridges from server...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
    >
      {/* SECTION: Friends Header & Controls */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionHeading}>
              👥 Friends &amp; Fridges ({acceptedFriends.length})
            </Text>
            <Text style={styles.sectionSubheading}>
              Inspect friends' fridges and pool ingredients to prevent food waste.
            </Text>
          </View>
          <Pressable
            style={styles.toggleAddBtn}
            onPress={() => setIsAddingVisible((prev) => !prev)}
          >
            <Text style={styles.toggleAddBtnText}>
              {isAddingVisible ? '✕ Cancel' : '+ Add Friend'}
            </Text>
          </Pressable>
        </View>

        {/* Database vs Hardcoded Notice for Friends */}
        {backendConnected ? (
          <View style={styles.dbStatusBanner}>
            <Text style={styles.dbStatusBannerText}>
              🟢 Live Database Friends ({friends.length} accounts from server)
            </Text>
          </View>
        ) : (
          <View style={styles.hardcodedWarningBanner}>
            <Text style={styles.hardcodedWarningTitle}>
              ⚠️ [HARDCODED DATA] Database Unreachable
            </Text>
            <Text style={styles.hardcodedWarningSub}>
              Note: Showing hardcoded friends list because the backend database could not be reached.
            </Text>
          </View>
        )}

        {/* Add Friend Input Box */}
        {isAddingVisible && (
          <View style={styles.addFriendBox}>
            <Text style={styles.addFriendBoxTitle}>Send Friend Request</Text>
            <View style={styles.addFriendInputRow}>
              <TextInput
                style={[styles.addFriendInput, { flex: 1.5 }]}
                placeholder="Username (e.g. jamie_chef)"
                value={newUsername}
                onChangeText={setNewUsername}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.addFriendInput, { flex: 1 }]}
                placeholder="Name (Optional)"
                value={newDisplayName}
                onChangeText={setNewDisplayName}
                placeholderTextColor="#9CA3AF"
              />
              <Pressable
                style={styles.submitFriendBtn}
                onPress={handleAddFriendSubmit}
              >
                <Text style={styles.submitFriendBtnText}>Send</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Pending Friend Requests (if any) */}
        {pendingFriends.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.pendingSectionTitle}>
              Pending Friend Requests ({pendingFriends.length})
            </Text>
            {pendingFriends.map((item) => (
              <View key={item.id} style={styles.pendingFriendCard}>
                <View style={styles.cardInfo}>
                  <View style={styles.avatarPlaceholderPending}>
                    <Text style={styles.avatarText}>
                      {item.display_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.friendMeta}>
                    <Text style={styles.friendName}>{item.display_name}</Text>
                    <Text style={styles.friendUsername}>@{item.username}</Text>
                    <Text style={styles.pendingNoticeText}>
                      ⏳ Waiting for mutual acceptance
                    </Text>
                  </View>
                </View>

                <View style={styles.pendingActions}>
                  <Pressable
                    style={styles.acceptRequestBtn}
                    onPress={() => acceptFriendRequest(item.id)}
                  >
                    <Text style={styles.acceptRequestBtnText}>✓ Accept</Text>
                  </Pressable>
                  <Pressable
                    style={styles.removeFriendBtn}
                    onPress={() => handleConfirmRemoveFriend(item)}
                  >
                    <Text style={styles.removeFriendBtnText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Mutually Added Friends & Their Fridges */}
        <Text style={styles.subSectionTitle}>
          Mutual Friends &amp; Fridges ({acceptedFriends.length})
        </Text>

        {acceptedFriends.length === 0 ? (
          <View style={styles.emptyFriendsBox}>
            <Text style={styles.emptyFriendsText}>
              No mutual friends yet! Use "+ Add Friend" above to send an invite and share fridge items.
            </Text>
          </View>
        ) : (
          acceptedFriends.map((friend) => {
            const friendItems = getFriendFridgeItems(friend.id);
            const expiringItems = friendItems.filter((i) => {
              const hours =
                (new Date(i.expires_at).getTime() - Date.now()) / 36e5;
              return hours > 0 && hours <= 72;
            });
            const expiringCount = expiringItems.length;

            return (
              <View key={friend.id} style={styles.friendFridgeCard}>
                <View style={styles.friendHeaderRow}>
                  <View style={styles.cardInfo}>
                    {friend.avatar_url ? (
                      <Image
                        source={{ uri: friend.avatar_url }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                          {friend.display_name.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.friendMeta}>
                      <Text style={styles.friendName}>{friend.display_name}</Text>
                      <Text style={styles.friendUsername}>@{friend.username}</Text>
                      <Text style={styles.inventoryCount}>
                        🧊 {friendItems.length} items logged •{' '}
                        <Text
                          style={{
                            color: expiringCount > 0 ? '#DC2626' : '#059669',
                            fontWeight: '700',
                          }}
                        >
                          {expiringCount > 0
                            ? `⚠️ ${expiringCount} expiring soon`
                            : 'All fresh'}
                        </Text>
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={styles.removeFriendBtn}
                    hitSlop={8}
                    onPress={() => handleConfirmRemoveFriend(friend)}
                  >
                    <Text style={styles.removeFriendBtnText}>✕</Text>
                  </Pressable>
                </View>

                {/* Expiring Items Quick Chips Preview */}
                {expiringCount > 0 && (
                  <View style={styles.expiringChipsRow}>
                    <Text style={styles.expiringChipsLabel}>Expiring Soon:</Text>
                    {expiringItems.slice(0, 3).map((item) => (
                      <View key={item.id} style={styles.expiringChip}>
                        <Text style={styles.expiringChipText}>
                          ⚠️ {item.name}
                        </Text>
                      </View>
                    ))}
                    {expiringCount > 3 && (
                      <Text style={styles.moreChipsText}>+{expiringCount - 3} more</Text>
                    )}
                  </View>
                )}

                {/* Primary Action: View Shared Fridge */}
                <Pressable
                  style={styles.viewFridgeBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/friend/[id]',
                      params: { id: friend.id },
                    })
                  }
                >
                  <Text style={styles.viewFridgeBtnText}>
                    👀 View {friend.display_name.split(' ')[0]}'s Shared Fridge ➔
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubheading: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 10,
  },
  toggleAddBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 8,
  },
  toggleAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  dbStatusBanner: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
    alignItems: 'center',
  },
  dbStatusBannerText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  hardcodedWarningBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  hardcodedWarningTitle: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  hardcodedWarningSub: {
    color: '#92400E',
    fontSize: 11,
    marginTop: 2,
  },
  addFriendBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 14,
  },
  addFriendBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  addFriendInputRow: {
    flexDirection: 'row',
    gap: 6,
  },
  addFriendInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#111827',
  },
  submitFriendBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitFriendBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  pendingSection: {
    marginBottom: 14,
  },
  pendingSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 6,
  },
  pendingFriendCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pendingNoticeText: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptRequestBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  acceptRequestBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyFriendsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center',
  },
  emptyFriendsText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  friendFridgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  friendHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarPlaceholderPending: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  friendMeta: {
    flex: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  friendUsername: {
    fontSize: 12,
    color: '#6B7280',
  },
  inventoryCount: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
  },
  removeFriendBtn: {
    backgroundColor: '#FEE2E2',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeFriendBtnText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 11,
  },
  expiringChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expiringChipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  expiringChip: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  expiringChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
  },
  moreChipsText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  viewFridgeBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  viewFridgeBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  initialLoadingContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  initialLoadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 14,
  },
  initialLoadingSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
});

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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, FriendEntry, FeastInvite } from '../../context/AppContext';

export default function SocialScreen() {
  const router = useRouter();
  const {
    friends,
    feasts,
    addFriend,
    acceptFriendRequest,
    removeFriend,
    getFriendFridgeItems,
    toggleFeastFriendRsvp,
    cancelFeastInvite,
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
      `Sent friend request to @${trimmedUser.replace('@', '')}. Once accepted, you'll be mutual friends!`
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

  const handleConfirmCancelFeast = (feast: FeastInvite) => {
    Alert.alert(
      'Cancel Feast',
      `Cancel "${feast.partyName}" and withdraw invitations?`,
      [
        { text: 'Keep Feast', style: 'cancel' },
        {
          text: 'Cancel Feast',
          style: 'destructive',
          onPress: () => cancelFeastInvite(feast.id),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* SECTION 1: Pending Feasts & Invites */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>
            🍽️ Pending Feasts &amp; Invites ({feasts.length})
          </Text>
        </View>
        <Text style={styles.sectionSubheading}>
          Track who has accepted your Feast Mode invitations:
        </Text>

        {feasts.length === 0 ? (
          <View style={styles.emptyFeastsBox}>
            <Text style={styles.emptyFeastsIcon}>🍲</Text>
            <Text style={styles.emptyFeastsTitle}>No Pending Feasts</Text>
            <Text style={styles.emptyFeastsSub}>
              Tap Feast Mode on the Fridge tab to invite friends and cook a zero-waste meal together!
            </Text>
          </View>
        ) : (
          feasts.map((feast) => {
            const acceptedCount =
              feast.invitedFriends.filter((f) => f.status === 'accepted').length +
              1; // Host is always accepted
            const totalCount = feast.invitedFriends.length + 1;
            const isAllAccepted = acceptedCount === totalCount;

            return (
              <View key={feast.id} style={styles.feastCard}>
                {/* Header row */}
                <View style={styles.feastHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feastTitle}>{feast.partyName}</Text>
                    <Text style={styles.feastRecipeName}>
                      Recipe: {feast.recipeTitle}
                    </Text>
                  </View>
                  <View style={styles.cookTimeBadge}>
                    <Text style={styles.cookTimeText}>⏱ {feast.cookTime}</Text>
                  </View>
                </View>

                {/* Impact Row */}
                <View style={styles.feastImpactRow}>
                  <Text style={styles.feastImpactText}>
                    🌱 {feast.foodRescuedGrams}g food rescued
                  </Text>
                  <Text style={styles.bulletSeparator}>•</Text>
                  <Text style={styles.feastImpactText}>
                    💰 ${feast.dollarsSaved.toFixed(2)} group savings
                  </Text>
                </View>

                {/* Acceptance Progress Header */}
                <View style={styles.rsvpProgressHeader}>
                  <Text style={styles.rsvpProgressLabel}>
                    RSVP Status ({acceptedCount}/{totalCount} Accepted):
                  </Text>
                  {isAllAccepted && (
                    <Text style={styles.readyBadge}>🎉 Ready to Cook!</Text>
                  )}
                </View>

                {/* Attendees list */}
                <View style={styles.attendeesList}>
                  {/* Host row */}
                  <View style={styles.attendeeRow}>
                    <View style={styles.attendeeInfo}>
                      <View style={styles.hostAvatar}>
                        <Text style={styles.hostAvatarText}>
                          {feast.hostName.charAt(0)}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.attendeeName}>
                          {feast.hostName} <Text style={styles.hostTag}>(Host)</Text>
                        </Text>
                      </View>
                    </View>
                    <View style={styles.acceptedBadge}>
                      <Text style={styles.acceptedBadgeText}>✓ Accepted</Text>
                    </View>
                  </View>

                  {/* Invited friends */}
                  {feast.invitedFriends.map((friend) => {
                    const isAccepted = friend.status === 'accepted';
                    return (
                      <View key={friend.id} style={styles.attendeeRow}>
                        <View style={styles.attendeeInfo}>
                          {friend.avatarUrl ? (
                            <Image
                              source={{ uri: friend.avatarUrl }}
                              style={styles.attendeeAvatar}
                            />
                          ) : (
                            <View style={styles.attendeeAvatarPlaceholder}>
                              <Text style={styles.attendeeAvatarText}>
                                {friend.name.charAt(0)}
                              </Text>
                            </View>
                          )}
                          <View>
                            <Text style={styles.attendeeName}>{friend.name}</Text>
                            <Text style={styles.attendeeHandle}>
                              @{friend.username}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.attendeeStatusAction}>
                          <View
                            style={[
                              styles.statusPill,
                              isAccepted
                                ? styles.statusPillAccepted
                                : styles.statusPillPending,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                isAccepted
                                  ? styles.statusPillTextAccepted
                                  : styles.statusPillTextPending,
                              ]}
                            >
                              {isAccepted ? '✓ Accepted' : '⏳ Pending'}
                            </Text>
                          </View>

                          {/* Interactive RSVP toggle for demo & testing */}
                          <Pressable
                            style={styles.simulateRsvpBtn}
                            hitSlop={6}
                            onPress={() =>
                              toggleFeastFriendRsvp(feast.id, friend.id)
                            }
                          >
                            <Text style={styles.simulateRsvpBtnText}>
                              {isAccepted ? 'Set Pending' : 'Simulate Accept'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Feast Action Buttons */}
                <View style={styles.feastActionsRow}>
                  <Pressable
                    style={styles.viewRecipeBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/recipe/[id]',
                        params: { id: feast.recipeId },
                      })
                    }
                  >
                    <Text style={styles.viewRecipeBtnText}>
                      View Recipe &amp; Tasks ➔
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.cancelFeastBtn}
                    onPress={() => handleConfirmCancelFeast(feast)}
                  >
                    <Text style={styles.cancelFeastBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.sectionDivider} />

      {/* SECTION 2: Friends (Mutual Friends & Pending Requests) */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionHeading}>
              Friends ({acceptedFriends.length})
            </Text>
            <Text style={styles.sectionSubheading}>
              Mutual friends can share fridges and join Feast Mode.
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

        {/* Mutually Added Friends */}
        <Text style={styles.subSectionTitle}>
          Mutual Friends ({acceptedFriends.length})
        </Text>

        {acceptedFriends.length === 0 ? (
          <View style={styles.emptyFriendsBox}>
            <Text style={styles.emptyFriendsText}>
              No mutual friends yet! Use "+ Add Friend" above to send an invite.
            </Text>
          </View>
        ) : (
          acceptedFriends.map((item) => {
            const friendItems = getFriendFridgeItems(item.id);
            const expiringCount = friendItems.filter((i) => {
              const hours =
                (new Date(i.expires_at).getTime() - Date.now()) / 36e5;
              return hours > 0 && hours <= 72;
            }).length;

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardInfo}>
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {item.display_name.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.friendMeta}>
                    <Text style={styles.friendName}>{item.display_name}</Text>
                    <Text style={styles.friendUsername}>@{item.username}</Text>
                    <Text style={styles.inventoryCount}>
                      🧊 {friendItems.length} items in fridge •{' '}
                      <Text
                        style={{
                          color: expiringCount > 0 ? '#DC2626' : '#6B7280',
                          fontWeight: '600',
                        }}
                      >
                        {expiringCount} expiring soon
                      </Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.viewFridgeBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/friend/[id]',
                        params: { id: item.id },
                      })
                    }
                  >
                    <Text style={styles.viewFridgeBtnText}>View Fridge →</Text>
                  </Pressable>

                  <Pressable
                    style={styles.removeFriendBtn}
                    onPress={() => handleConfirmRemoveFriend(item)}
                  >
                    <Text style={styles.removeFriendBtnText}>✕</Text>
                  </Pressable>
                </View>
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
    paddingBottom: 40,
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
    marginBottom: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 14,
  },

  /* Pending Feasts Styles */
  emptyFeastsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    alignItems: 'center',
  },
  emptyFeastsIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyFeastsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  emptyFeastsSub: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  feastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  feastHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  feastTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  feastRecipeName: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  cookTimeBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cookTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  feastImpactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  feastImpactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  bulletSeparator: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rsvpProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  rsvpProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  readyBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  attendeesList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  hostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  attendeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  attendeeAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeAvatarText: {
    color: '#374151',
    fontWeight: 'bold',
    fontSize: 13,
  },
  attendeeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  hostTag: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  attendeeHandle: {
    fontSize: 11,
    color: '#6B7280',
  },
  acceptedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  acceptedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  attendeeStatusAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillAccepted: {
    backgroundColor: '#DCFCE7',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillTextAccepted: {
    color: '#166534',
  },
  statusPillTextPending: {
    color: '#92400E',
  },
  simulateRsvpBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  simulateRsvpBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  feastActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  viewRecipeBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewRecipeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelFeastBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelFeastBtnText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },

  /* Friends Styles */
  toggleAddBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  addFriendBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 12,
  },
  addFriendBoxTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  addFriendInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addFriendInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  submitFriendBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 6,
  },
  submitFriendBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  pendingSection: {
    marginBottom: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
  },
  pendingSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  pendingFriendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholderPending: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingNoticeText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
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
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  friendUsername: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  inventoryCount: {
    fontSize: 11,
    color: '#4B5563',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewFridgeBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewFridgeBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '600',
  },
  removeFriendBtn: {
    padding: 6,
  },
  removeFriendBtnText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyFriendsBox: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  emptyFriendsText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});

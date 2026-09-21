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
import { Colors, Fonts } from '../../constants/Theme';
import StickerCard from '../../components/ui/StickerCard';
import StickerButton from '../../components/ui/StickerButton';
import { LockIcon } from '../../components/ui/AppIcons';
import { getDaysLeft } from '../../services/foodCharacterLookup';

export default function SocialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    friends,
    addFriend,
    acceptFriendRequest,
    removeFriend,
    getFriendFridgeItems,
    backendSyncAttempted,
  } = useApp();

  // Invite friend input state
  const [inviteUserId, setInviteUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Split into accepted and pending requests
  const acceptedFriends = friends.filter((f) => f.status === 'accepted');
  const pendingRequests = friends.filter((f) => f.status === 'pending');

  const handleInviteSubmit = () => {
    const trimmed = inviteUserId.trim().replace('@', '');
    if (!trimmed) {
      Alert.alert('User ID Required', 'Please enter a friend’s username or user ID.');
      return;
    }

    setIsSubmitting(true);
    try {
      addFriend(trimmed);
      setInviteUserId('');
      Alert.alert(
        'Invite Sent',
        `Friend request sent to @${trimmed}. Once accepted, you can view each other's fridges and cook feasts!`
      );
    } catch {
      Alert.alert('Error', 'Could not send friend request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFriendClick = (friend: FriendEntry) => {
    router.push({
      pathname: '/(tabs)',
      params: { friendId: friend.id },
    });
  };

  const handleDeclineRequest = (friend: FriendEntry) => {
    removeFriend(friend.id);
    Alert.alert('Request Declined', `Declined friend request from @${friend.username}.`);
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

  if (!backendSyncAttempted) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  const safeBottomPadding = Math.max(insets.bottom, 16) + 60;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Friends</Text>
          <Text style={styles.headerSubtitle}>
            Inspect fridges and cook together to end waste
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{acceptedFriends.length}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================
            1. VERY TOP: INVITE A FRIEND INPUT
        ============================================================ */}
        <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.inviteCard}>
          <Text style={styles.inviteHeading}>Invite a friend</Text>
          <Text style={styles.inviteSubtext}>
            Enter their username or User ID to share fridge items
          </Text>

          <View style={styles.inviteInputRow}>
            <TextInput
              style={styles.inviteInput}
              placeholder="Username or ID (e.g. nadia_khan)"
              placeholderTextColor="#8A776A"
              value={inviteUserId}
              onChangeText={setInviteUserId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={[styles.inviteBtn, isSubmitting && styles.inviteBtnDisabled]}
              onPress={handleInviteSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.inviteBtnText}>+ Invite</Text>
            </Pressable>
          </View>

          {/* Handover V2 Screen 15: Privacy Disclosure */}
          <View style={styles.privacyNoteWrap}>
            <LockIcon size={16} color="#76665A" />
            <Text style={styles.privacyNoteText}>
              Friends can see your yellow and red buddies so they can cook with you. Prices stay private.
            </Text>
          </View>
        </StickerCard>

        {/* ============================================================
            2. TOP: PENDING FRIEND REQUESTS
        ============================================================ */}
        {pendingRequests.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>
              Pending Requests ({pendingRequests.length})
            </Text>

            {pendingRequests.map((friend) => (
              <StickerCard
                key={friend.id}
                backgroundColor="#FFF8E7"
                borderRadius={20}
                style={styles.pendingCard}
              >
                <View style={styles.pendingCardHeader}>
                  <View style={styles.avatarBox}>
                    {friend.avatar_url ? (
                      <Image source={{ uri: friend.avatar_url }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>
                          {friend.display_name.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName}>{friend.display_name}</Text>
                    <Text style={styles.friendUsername}>@{friend.username}</Text>
                    <Text style={styles.pendingNote}>Wants to share fridges with you</Text>
                  </View>
                </View>

                {/* Accept & Decline Buttons */}
                <View style={styles.pendingActionsRow}>
                  <Pressable
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => acceptFriendRequest(friend.id)}
                  >
                    <Text style={styles.acceptBtnText}>✓ Accept</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => handleDeclineRequest(friend)}
                  >
                    <Text style={styles.declineBtnText}>✕ Decline</Text>
                  </Pressable>
                </View>
              </StickerCard>
            ))}
          </View>
        )}

        {/* ============================================================
            3. BOTTOM: ACCEPTED FRIENDS LIST
        ============================================================ */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>
            Friends ({acceptedFriends.length})
          </Text>

          {acceptedFriends.length === 0 ? (
            <StickerCard backgroundColor={Colors.paper} borderRadius={20} style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No friends yet!</Text>
              <Text style={styles.emptySubtext}>
                Invite a friend at the top to view their shared fridge and plan feasts together!
              </Text>
            </StickerCard>
          ) : (
            <View style={styles.friendsList}>
              {acceptedFriends.map((friend) => {
                const friendItems = getFriendFridgeItems(friend.id);
                const atRiskCount = friendItems.filter((i) => {
                  const daysLeft = getDaysLeft(i.expires_at);
                  return daysLeft <= 5;
                }).length;

                return (
                  <StickerCard
                    key={friend.id}
                    backgroundColor={Colors.paper}
                    borderRadius={20}
                    style={styles.friendCard}
                    onPress={() => handleFriendClick(friend)}
                  >
                    <View style={styles.friendRow}>
                      {/* Avatar */}
                      <View style={styles.avatarBox}>
                        {friend.avatar_url ? (
                          <Image source={{ uri: friend.avatar_url }} style={styles.avatarImg} />
                        ) : (
                          <View style={styles.avatarFallback}>
                            <Text style={styles.avatarFallbackText}>
                              {friend.display_name.charAt(0)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Info (Handover V2 Screen 15: "N buddies need rescuing") */}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.friendName}>{friend.display_name}</Text>
                        <Text style={styles.friendUsername}>@{friend.username}</Text>
                        <Text style={styles.friendStatusSubtitle}>
                          {atRiskCount > 0
                            ? `${atRiskCount} ${atRiskCount === 1 ? 'buddy needs' : 'buddies need'} rescuing`
                            : 'All buddies are fresh'}
                        </Text>
                      </View>

                      {/* View Fridge Indicator */}
                      <View style={styles.viewFridgePill}>
                        <Text style={styles.viewFridgeText}>View fridge ›</Text>
                      </View>
                    </View>
                  </StickerCard>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.cream,
    borderBottomWidth: 2,
    borderBottomColor: Colors.ink,
  },
  headerTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 26,
    color: Colors.ink,
  },
  headerSubtitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: '#7A685D',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: Colors.terracotta,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  countBadgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: '#FFF',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  inviteCard: {
    padding: 18,
  },
  inviteHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
  },
  inviteSubtext: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#7A685D',
    marginTop: 2,
    marginBottom: 12,
  },
  inviteInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inviteInput: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.cream,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.ink,
    paddingHorizontal: 14,
    fontFamily: Fonts.bodyRegular,
    fontSize: 14,
    color: Colors.ink,
  },
  inviteBtn: {
    backgroundColor: Colors.terracotta,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  inviteBtnDisabled: {
    opacity: 0.6,
  },
  inviteBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: '#FFF',
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
  },
  pendingCard: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#E6A23C',
  },
  pendingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.ink,
    overflow: 'hidden',
    backgroundColor: '#FFE5DC',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.terracotta,
  },
  friendName: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
  },
  friendUsername: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: '#7A685D',
  },
  pendingNote: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 12,
    color: '#A66700',
    marginTop: 2,
  },
  pendingActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  acceptBtn: {
    backgroundColor: '#72C08A',
  },
  acceptBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: Colors.ink,
  },
  declineBtn: {
    backgroundColor: Colors.paper,
  },
  declineBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: '#8A776A',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
    marginBottom: 4,
  },
  emptySubtext: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#7A685D',
    textAlign: 'center',
    lineHeight: 18,
  },
  friendsList: {
    gap: 12,
  },
  friendCard: {
    padding: 14,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  itemCountText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: '#655142',
  },
  expiringNoticeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 12,
    color: Colors.terracotta,
  },
  viewFridgePill: {
    backgroundColor: '#EBF3E8',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  viewFridgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 12,
    color: '#2E5A36',
  },
  privacyNoteWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#F7F3EE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  privacyNoteIcon: {
    fontSize: 12,
    marginTop: 1,
  },
  privacyNoteText: {
    flex: 1,
    fontFamily: Fonts.bodyRegular,
    fontSize: 12,
    color: '#8A776A',
    lineHeight: 16,
  },
  friendStatusSubtitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: Colors.terracotta,
    marginTop: 3,
  },
});

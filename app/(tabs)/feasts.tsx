import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, FeastInvite } from '../../context/AppContext';

export default function FeastsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    friends,
    feasts,
    voteOnFeastRecipe,
    simulateFriendVote,
    confirmFeastRecipe,
    reopenFeastVoting,
    toggleFeastFriendRsvp,
    cancelFeastInvite,
  } = useApp();

  const getVoterName = (voterId: string) => {
    if (voterId === currentUser.id) return 'You';
    const friend = friends.find((f) => f.id === voterId);
    return friend ? friend.display_name.split(' ')[0] : 'Friend';
  };

  const handleSimulateFriendVote = (feastId: string, recipeId: string, feast: FeastInvite) => {
    const candidate = feast.candidateRecipes.find((c) => c.recipe.id === recipeId);
    const candidateVotes = candidate?.votes || [];
    const eligibleFriend =
      feast.invitedFriends.find((f) => !candidateVotes.includes(f.id)) ||
      feast.invitedFriends[0];

    if (eligibleFriend) {
      simulateFriendVote(feastId, eligibleFriend.id, recipeId);
    } else if (candidateVotes.length > 0) {
      const friendVote = candidateVotes.find((v) => v !== currentUser.id);
      if (friendVote) {
        simulateFriendVote(feastId, friendVote, recipeId);
      }
    }
  };

  const handleConfirmRecipe = (
    feast: FeastInvite,
    recipeId: string,
    recipeTitle: string
  ) => {
    confirmFeastRecipe(feast.id, recipeId);
    Alert.alert(
      'Recipe Confirmed! 🍳',
      `"${recipeTitle}" is now the official recipe for "${feast.partyName}".\n\nYou and your friends can coordinate prep tasks together!`
    );
  };

  const handleReopenVoting = (feast: FeastInvite) => {
    Alert.alert(
      'Re-open Recipe Poll?',
      `Are you sure you want to re-open voting for "${feast.partyName}"? Everyone will be able to cast votes again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-open Poll',
          onPress: () => reopenFeastVoting(feast.id),
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

  // Safe bottom padding preventing Android nav bar overlap
  const safeBottomPadding = Math.max(insets.bottom, 16) + 100;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
    >
      {/* Header Section */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionHeading}>
            🍽️ Dinner Parties &amp; Feasts ({feasts.length})
          </Text>
          <Text style={styles.sectionSubheading}>
            Vote on candidate recipes, track RSVPs, and cook together.
          </Text>
        </View>

        <Pressable
          style={styles.hostFeastBtn}
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.hostFeastBtnText}>+ Host Feast</Text>
        </Pressable>
      </View>

      {/* Local storage note */}
      <View style={styles.hardcodedNoticeCard}>
        <Text style={styles.hardcodedNoticeText}>
          ℹ️ [LOCAL / ON-DEVICE] Feasts and voting polls are managed in app state (backend database does not yet have a feasts table). Expiring food is pooled from live pantry accounts.
        </Text>
      </View>

      {feasts.length === 0 ? (
        <View style={styles.emptyFeastsBox}>
          <Text style={styles.emptyFeastsIcon}>🍲</Text>
          <Text style={styles.emptyFeastsTitle}>No Active Dinner Parties</Text>
          <Text style={styles.emptyFeastsSub}>
            Ready to cook zero-waste food with friends? Go to My Fridge and tap Feast Mode to pool expiring food and send invites!
          </Text>
          <Pressable
            style={styles.emptyActionBtn}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.emptyActionBtnText}>Go to Fridge &amp; Start Feast Mode ➔</Text>
          </Pressable>
        </View>
      ) : (
        feasts.map((feast) => {
          const acceptedCount =
            feast.invitedFriends.filter((f) => f.status === 'accepted').length + 1;
          const totalCount = feast.invitedFriends.length + 1;
          const isAllAccepted = acceptedCount === totalCount;
          const isVotingMode =
            feast.status === 'voting' &&
            feast.candidateRecipes &&
            feast.candidateRecipes.length > 0;
          const totalVotes = (feast.candidateRecipes || []).reduce(
            (acc, c) => acc + c.votes.length,
            0
          );

          return (
            <View key={feast.id} style={styles.feastCard}>
              {/* Card Header */}
              <View style={styles.feastHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feastTitle}>{feast.partyName}</Text>
                  <Text style={styles.feastHostSubtitle}>
                    Hosted by {feast.hostId === currentUser.id ? `${feast.hostName} (You)` : feast.hostName}
                  </Text>
                </View>
                <View
                  style={
                    isVotingMode
                      ? styles.statusVotingBadge
                      : styles.statusConfirmedBadge
                  }
                >
                  <Text
                    style={
                      isVotingMode
                        ? styles.statusVotingText
                        : styles.statusConfirmedText
                    }
                  >
                    {isVotingMode ? '🗳️ Polling Recipes' : '✓ Recipe Decided'}
                  </Text>
                </View>
              </View>

              {/* VOTING MODE: Candidate Recipes with Click-to-View and Voting */}
              {isVotingMode ? (
                <View style={styles.pollSection}>
                  <View style={styles.pollHeaderRow}>
                    <Text style={styles.pollHeaderTitle}>
                      🗳️ Recipe Poll ({totalVotes} {totalVotes === 1 ? 'vote' : 'votes'})
                    </Text>
                    <Text style={styles.pollHintText}>Click recipe to inspect</Text>
                  </View>
                  <Text style={styles.pollSubtext}>
                    Click any recipe to see what it is (ingredients &amp; prep steps), then cast your vote below!
                  </Text>

                  {feast.candidateRecipes.map((cand, candIdx) => {
                    const isMyVote = cand.votes.includes(currentUser.id);
                    const voteCount = cand.votes.length;
                    const voterNames = cand.votes.map(getVoterName).join(', ');

                    return (
                      <View
                        key={cand.recipe.id || `cand-${candIdx}`}
                        style={[
                          styles.candidateCard,
                          isMyVote && styles.candidateCardVoted,
                        ]}
                      >
                        {/* Clickable Header: Tapping views full recipe */}
                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: '/recipe/[id]',
                              params: { id: cand.recipe.id },
                            })
                          }
                          style={styles.candidateClickableArea}
                        >
                          <View style={styles.candidateTopRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.candidateTitle}>
                                {cand.recipe.title} ➔
                              </Text>
                              <Text style={styles.candidateMeta}>
                                ⏱ {cand.recipe.cookTime} • 🌱 {cand.recipe.projectedImpact.foodRescuedGrams}g rescued • 💰 ${cand.recipe.projectedImpact.dollarsSaved.toFixed(2)} saved
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.voteBadge,
                                voteCount > 0 && styles.voteBadgeActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.voteBadgeText,
                                  voteCount > 0 && styles.voteBadgeTextActive,
                                ]}
                              >
                                👍 {voteCount}
                              </Text>
                            </View>
                          </View>
                        </Pressable>

                        {/* View Recipe Link Button */}
                        <Pressable
                          style={styles.inspectRecipeLink}
                          onPress={() =>
                            router.push({
                              pathname: '/recipe/[id]',
                              params: { id: cand.recipe.id },
                            })
                          }
                        >
                          <Text style={styles.inspectRecipeLinkText}>
                            📖 View Full Recipe &amp; Ingredients Breakdown ➔
                          </Text>
                        </Pressable>

                        {/* Voters List */}
                        {voteCount > 0 && (
                          <Text style={styles.votersListText}>
                            Voted by: <Text style={{ fontWeight: '700', color: '#1F2937' }}>{voterNames}</Text>
                          </Text>
                        )}

                        {/* Actions: Vote, Simulate, Confirm */}
                        <View style={styles.candidateButtonsRow}>
                          <Pressable
                            style={[
                              styles.voteBtn,
                              isMyVote && styles.voteBtnActive,
                            ]}
                            onPress={() =>
                              voteOnFeastRecipe(
                                feast.id,
                                cand.recipe.id,
                                currentUser.id
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.voteBtnText,
                                isMyVote && styles.voteBtnTextActive,
                              ]}
                            >
                              {isMyVote ? '✓ Your Vote' : '👍 Vote'}
                            </Text>
                          </Pressable>

                          <Pressable
                            style={styles.simulateVoteBtn}
                            onPress={() =>
                              handleSimulateFriendVote(
                                feast.id,
                                cand.recipe.id,
                                feast
                              )
                            }
                          >
                            <Text style={styles.simulateVoteBtnText}>
                              🎲 +Friend
                            </Text>
                          </Pressable>

                          <Pressable
                            style={styles.confirmRecipeBtn}
                            onPress={() =>
                              handleConfirmRecipe(
                                feast,
                                cand.recipe.id,
                                cand.recipe.title
                              )
                            }
                          >
                            <Text style={styles.confirmRecipeBtnText}>
                              Confirm Recipe ➔
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                /* CONFIRMED MODE: Official Recipe Display */
                <View style={styles.confirmedRecipeBox}>
                  <View style={styles.confirmedHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.confirmedBadgeText}>
                        🏆 Official Recipe to Cook
                      </Text>
                      <Text style={styles.confirmedRecipeTitle}>
                        {feast.recipeTitle}
                      </Text>
                    </View>
                    <View style={styles.cookTimeBadge}>
                      <Text style={styles.cookTimeText}>⏱ {feast.cookTime}</Text>
                    </View>
                  </View>

                  {/* Impact Stats */}
                  <View style={styles.feastImpactRow}>
                    <Text style={styles.feastImpactText}>
                      🌱 {feast.foodRescuedGrams}g food rescued
                    </Text>
                    <Text style={styles.bulletSeparator}>•</Text>
                    <Text style={styles.feastImpactText}>
                      💰 ${feast.dollarsSaved.toFixed(2)} group savings
                    </Text>
                  </View>

                  {/* Actions: View Recipe Tasks + Reopen Poll */}
                  <View style={styles.confirmedActionRow}>
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
                        View Recipe &amp; Prep Tasks ➔
                      </Text>
                    </Pressable>

                    {feast.candidateRecipes && feast.candidateRecipes.length > 0 && (
                      <Pressable
                        style={styles.reopenVotingBtn}
                        onPress={() => handleReopenVoting(feast)}
                      >
                        <Text style={styles.reopenVotingBtnText}>
                          ↺ Re-open Poll
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}

              {/* RSVP Status Header */}
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

              {/* Cancel Feast Button Row */}
              <View style={styles.feastFooterCancelRow}>
                <Pressable
                  style={styles.cancelFeastBtn}
                  onPress={() => handleConfirmCancelFeast(feast)}
                >
                  <Text style={styles.cancelFeastBtnText}>Cancel Feast</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
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
  },
  hostFeastBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 8,
  },
  hostFeastBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  hardcodedNoticeCard: {
    backgroundColor: '#F1F5F9',
    borderLeftWidth: 3,
    borderLeftColor: '#64748B',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 10,
  },
  hardcodedNoticeText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  emptyFeastsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyFeastsIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyFeastsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptyFeastsSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  feastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    padding: 14,
    marginBottom: 14,
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
    marginBottom: 8,
  },
  feastTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  feastHostSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusVotingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusVotingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  statusConfirmedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusConfirmedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  pollSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  pollHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pollHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  pollHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  pollSubtext: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 10,
  },
  candidateCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  candidateCardVoted: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  candidateClickableArea: {
    paddingBottom: 4,
  },
  candidateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  candidateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  candidateMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  inspectRecipeLink: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginVertical: 6,
    alignItems: 'center',
  },
  inspectRecipeLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  voteBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  voteBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  voteBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  voteBadgeTextActive: {
    color: '#15803D',
    fontWeight: '700',
  },
  votersListText: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 6,
  },
  candidateButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  voteBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  voteBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  voteBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  voteBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  simulateVoteBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  simulateVoteBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  confirmRecipeBtn: {
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: 'auto',
  },
  confirmRecipeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmedRecipeBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  confirmedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  confirmedRecipeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#14532D',
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
    marginBottom: 8,
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
  confirmedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
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
  reopenVotingBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  reopenVotingBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
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
  feastFooterCancelRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
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
});

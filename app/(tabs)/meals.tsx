import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CrushedOutcomeModal from '../../components/CrushedOutcomeModal';
import FoodCharacter from '../../components/FoodCharacter';
import RescuedCelebrationModal from '../../components/RescuedCelebrationModal';
import StickerButton from '../../components/ui/StickerButton';
import StickerCard from '../../components/ui/StickerCard';
import { Colors, Fonts } from '../../constants/Theme';
import { FeastInvite, useApp } from '../../context/AppContext';
import { backendApi, formatScheduledFor } from '../../services/backendApi';

export default function MealsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    feasts,
    savedRecipes,
    removeSavedRecipe,
    startFeastCooking,
    completeFeast,
    respondToFeastInvite,
    nudgeFeastFriend,
  } = useApp();

  // Tab segment: 'feasts' (default) vs 'saved'
  const [activeSegment, setActiveSegment] = useState<'feasts' | 'saved'>('feasts');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Nudge banner state
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);

  // Outcome modals state
  const [activeRescuedFeast, setActiveRescuedFeast] = useState<FeastInvite | null>(null);
  const [activeCrushedFeast, setActiveCrushedFeast] = useState<FeastInvite | null>(null);

  // 1. Incoming invites awaiting user response
  const incomingInvites = useMemo(() => {
    return feasts.filter(
      (f) =>
        f.hostId !== currentUser.id &&
        f.userRsvpStatus === 'pending'
    );
  }, [feasts, currentUser.id]);

  // 2. Pending feasts (waiting for RSVP)
  const pendingFeasts = useMemo(() => {
    return feasts.filter((f) => {
      if (f.status === 'completed' || f.status === 'cancelled') return false;
      if (f.status === 'cooking') return false;
      // If user is host, or user has accepted
      const isHost = f.hostId === currentUser.id;
      const hasAccepted =
        f.userRsvpStatus === 'accepted' ||
        f.invitedFriends.some(
          (friend) => friend.id === currentUser.id && friend.status === 'accepted'
        );
      return isHost || hasAccepted;
    });
  }, [feasts, currentUser.id]);

  // 3. Cooking in progress feasts
  const cookingFeasts = useMemo(() => {
    return feasts.filter((f) => f.status === 'cooking');
  }, [feasts]);

  // 4. Completed feasts
  const completedFeasts = useMemo(() => {
    return feasts.filter((f) => f.status === 'completed');
  }, [feasts]);

  const handleNudge = (feastId: string, friendId: string, friendName: string) => {
    nudgeFeastFriend(feastId, friendId);
    const msg = `Nudge reminder sent to ${friendName}!`;
    setNudgeMessage(msg);
    Alert.alert('Nudge Sent', msg);
    setTimeout(() => {
      setNudgeMessage(null);
    }, 4000);
  };

  const handleStartFeast = (feastId: string) => {
    startFeastCooking(feastId);
    Alert.alert('Feast Started', 'Everyone has gathered — cooking is now underway!');
  };

  const handleAcceptInvite = (feast: FeastInvite) => {
    respondToFeastInvite(feast.id, 'accepted');
    // Mark any associated notification as read
    const feastNumId = Number(feast.id);
    if (!isNaN(feastNumId) && currentUser.id) {
      backendApi
        .getNotifications(Number(currentUser.id), { unreadOnly: true })
        .then((notifs) => {
          notifs
            .filter((n) => n.feast_id === feastNumId)
            .forEach((n) => backendApi.markNotificationRead(n.id).catch(() => {}));
        })
        .catch(() => {});
    }
    Alert.alert('Invite Accepted! 🎉', `You joined ${feast.partyName}!`);
  };

  const handleDeclineInvite = (feast: FeastInvite) => {
    respondToFeastInvite(feast.id, 'declined');
    // Mark any associated notification as read
    const feastNumId = Number(feast.id);
    if (!isNaN(feastNumId) && currentUser.id) {
      backendApi
        .getNotifications(Number(currentUser.id), { unreadOnly: true })
        .then((notifs) => {
          notifs
            .filter((n) => n.feast_id === feastNumId)
            .forEach((n) => backendApi.markNotificationRead(n.id).catch(() => {}));
        })
        .catch(() => {});
    }
    Alert.alert('Invite Declined', `You declined the invitation to ${feast.partyName}.`);
  };

  const handleMarkRescued = (feast: FeastInvite) => {
    setActiveRescuedFeast(feast);
  };

  const handleCloseRescuedModal = () => {
    if (activeRescuedFeast) {
      completeFeast(activeRescuedFeast.id, 'rescued');
      setActiveRescuedFeast(null);
    }
  };

  const handleMarkFailed = (feast: FeastInvite) => {
    setActiveCrushedFeast(feast);
  };

  const handleCloseCrushedModal = () => {
    if (activeCrushedFeast) {
      completeFeast(activeCrushedFeast.id, 'failed');
      setActiveCrushedFeast(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header (Handover V2 Screens 11 & 12: Dropdown Selector) */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        <View style={styles.headerTopRow}>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setIsDropdownOpen((prev) => !prev)}
            hitSlop={8}
          >
            <Text style={styles.dropdownTitle}>
              Meals: {activeSegment === 'feasts' ? 'Feasts' : 'Personal'} ▾
            </Text>
          </Pressable>

          <View style={styles.headerCountBadge}>
            <Text style={styles.headerCountBadgeText}>
              {activeSegment === 'feasts'
                ? pendingFeasts.length + cookingFeasts.length
                : savedRecipes.length}
            </Text>
          </View>
        </View>

        <Text style={styles.headerSubtitle}>
          {activeSegment === 'feasts'
            ? 'Group cooking plans'
            : 'Recipes you saved to cook solo'}
        </Text>

        {/* Dropdown Menu Popover */}
        {isDropdownOpen && (
          <View style={styles.dropdownMenu}>
            <Pressable
              style={[
                styles.dropdownItem,
                activeSegment === 'feasts' && styles.dropdownItemActive,
              ]}
              onPress={() => {
                setActiveSegment('feasts');
                setIsDropdownOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  activeSegment === 'feasts' && styles.dropdownItemTextActive,
                ]}
              >
                Feasts ({pendingFeasts.length + cookingFeasts.length})
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.dropdownItem,
                activeSegment === 'saved' && styles.dropdownItemActive,
              ]}
              onPress={() => {
                setActiveSegment('saved');
                setIsDropdownOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  activeSegment === 'saved' && styles.dropdownItemTextActive,
                ]}
              >
                Personal ({savedRecipes.length})
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Nudge Confirmation Message Banner */}
      {nudgeMessage && (
        <View style={styles.nudgeBanner}>
          <Text style={styles.nudgeBannerText}>✓ {nudgeMessage}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================
            VIEW 1: FEASTS (DEFAULT)
        ============================================================ */}
        {activeSegment === 'feasts' && (
          <View style={styles.feastsStack}>
            {/* 1. RESPOND TO INVITE SECTION */}
            {incomingInvites.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>Respond to Invite</Text>
                {incomingInvites.map((invite) => {
                  return (
                    <StickerCard
                      key={invite.id}
                      backgroundColor="#FFF8E7"
                      borderRadius={22}
                      style={styles.inviteCard}
                    >
                      {/* Handover V2 Screen 13: Incoming Feast Invite Card */}
                      <>
                          <View style={styles.inviteHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inviteHost}>
                                {invite.hostName} invited you to a feast!
                              </Text>
                              <Text style={styles.invitePartyName}>{invite.partyName}</Text>
                            </View>
                            <View style={styles.inviteTimeBadge}>
                              <Text style={styles.inviteTimeBadgeText}>
                                {formatScheduledFor(invite.scheduledFor) || 'Soon'}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.inviteRecipeTitle}>
                            {invite.recipeTitle} ({invite.cookTime || '25 min'})
                          </Text>

                          {/* Who's bringing what breakdown */}
                          {invite.bringBreakdown && invite.bringBreakdown.length > 0 && (
                            <View style={styles.bringBox}>
                              <Text style={styles.bringBoxHeading}>Who's bringing what:</Text>
                              {invite.bringBreakdown.map((item, bIdx) => (
                                <Text key={bIdx} style={styles.bringLine}>
                                  <Text style={styles.bringWho}>{item.who}: </Text>
                                  {item.items}
                                </Text>
                              ))}
                            </View>
                          )}

                          {/* Handover V2 Screen 13: Reassurance freshness note */}
                          <View style={styles.reassurancePill}>
                            <Text style={styles.reassuranceText}>
                              Your ingredients will still be good then
                            </Text>
                          </View>

                          <View style={styles.inviteActionsRow}>
                            <View style={{ flex: 1 }}>
                              <StickerButton
                                title="I'm in!"
                                onPress={() => handleAcceptInvite(invite)}
                                variant="primary"
                                size="large"
                              />
                            </View>
                            <Pressable
                              style={styles.declineLinkBtn}
                              onPress={() => handleDeclineInvite(invite)}
                              hitSlop={8}
                            >
                              <Text style={styles.declineLinkText}>Can't make it</Text>
                            </Pressable>
                          </View>
                        </>
                    </StickerCard>
                  );
                })}
              </View>
            )}

            {/* 2. PENDING FEASTS (Waiting for RSVP) */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                Waiting for RSVP ({pendingFeasts.length})
              </Text>
              {pendingFeasts.length === 0 ? (
                <StickerCard backgroundColor={Colors.paper} borderRadius={20} style={styles.emptyFeastCard}>
                  <Text style={styles.emptyFeastText}>No feasts waiting for RSVP.</Text>
                  <Text style={styles.emptyFeastSubtext}>
                    Hold groceries on your Shelf and tap "Feast mode" to plan a dinner party!
                  </Text>
                </StickerCard>
              ) : (
                pendingFeasts.map((feast) => {
                  const isHost = feast.hostId === currentUser.id;
                  
                  if (!isHost) {
                    return (
                      <StickerCard
                        key={feast.id}
                        backgroundColor="#FFF8E7"
                        borderRadius={22}
                        style={styles.inviteCard}
                      >
                        {/* Handover V2 Screen 14: You're In! Confirmed Feast View */}
                        <View style={styles.acceptedInviteWrap}>
                          <View style={styles.youreInBanner}>
                            <Text style={styles.youreInTitle}>You're in!</Text>
                            <Text style={styles.youreInSubtitle}>
                              See you {formatScheduledFor(feast.scheduledFor) || 'soon'}
                            </Text>
                          </View>

                          <Text style={styles.inviteRecipeTitle}>
                            {feast.recipeTitle} ({feast.cookTime || '25 min'})
                          </Text>

                          {feast.bringBreakdown && feast.bringBreakdown.length > 0 && (
                            <View style={styles.bringBox}>
                              <Text style={styles.bringBoxHeading}>Who's bringing what:</Text>
                              {feast.bringBreakdown.map((item, bIdx) => (
                                <Text key={bIdx} style={styles.bringLine}>
                                  <Text style={styles.bringWho}>{item.who}: </Text>
                                  {item.items}
                                </Text>
                              ))}
                            </View>
                          )}

                          <Text style={styles.confirmedAttendeesHeading}>
                            Confirmed attendees:
                          </Text>
                          <View style={styles.confirmedAttendeesRow}>
                            {feast.invitedFriends
                              .filter((f) => f.status === 'accepted')
                              .map((f) => (
                                <View key={f.id} style={styles.attendeePill}>
                                  <Text style={styles.attendeePillCheck}>✓</Text>
                                  <Text style={styles.attendeePillName}>
                                    {f.name.split(' ')[0]}
                                  </Text>
                                </View>
                              ))}
                          </View>

                          <Pressable
                            style={styles.cantMakeItBtn}
                            onPress={() => handleDeclineInvite(feast)}
                            hitSlop={8}
                          >
                            <Text style={styles.cantMakeItText}>
                              Can't make it? Let them know
                            </Text>
                          </Pressable>
                        </View>
                      </StickerCard>
                    );
                  }

                  return (
                    <StickerCard

                    key={feast.id}
                    backgroundColor={Colors.paper}
                    borderRadius={22}
                    style={styles.pendingFeastCard}
                  >
                    <View style={styles.feastHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.feastTitle}>{feast.partyName}</Text>
                        <Text style={styles.feastMeta}>
                          {feast.recipeTitle} · {formatScheduledFor(feast.scheduledFor) || 'Upcoming'}
                        </Text>
                      </View>
                      <View style={styles.statusPillPending}>
                        <Text style={styles.statusPillPendingText}>Waiting</Text>
                      </View>
                    </View>

                    {/* Friends RSVP list with Nudge button */}
                    <View style={styles.rsvpList}>
                      <Text style={styles.rsvpListTitle}>Friends Responding:</Text>
                      {feast.invitedFriends.map((friend) => {
                        const isCanGo = friend.status === 'accepted';
                        const isCannotGo = friend.status === 'declined';
                        const isPending = !isCanGo && !isCannotGo;

                        return (
                          <View key={friend.id} style={styles.rsvpRow}>
                            <View style={styles.friendInfoCol}>
                              <Text style={styles.rsvpFriendName}>{friend.name}</Text>
                              <Text style={styles.rsvpFriendStatus}>
                                {isCanGo && 'Can go'}
                                {isCannotGo && 'Cannot go'}
                                {isPending && 'Pending RSVP'}
                              </Text>
                            </View>

                            {isPending && (
                              <Pressable
                                style={styles.nudgeButton}
                                onPress={() => handleNudge(feast.id, friend.id, friend.name)}
                              >
                                <Text style={styles.nudgeButtonText}>Nudge</Text>
                              </Pressable>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Start Feast Button */}
                    <View style={styles.startFeastWrap}>
                      <StickerButton
                        title="Start feast"
                        onPress={() => handleStartFeast(feast.id)}
                        variant="primary"
                        size="medium"
                      />
                    </View>
                  </StickerCard>
                );
              })
            )}
          </View>

            {/* 3. COOKING IN PROGRESS FEASTS */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                Cooking in Progress ({cookingFeasts.length})
              </Text>
              {cookingFeasts.length === 0 ? (
                <StickerCard backgroundColor={Colors.paper} borderRadius={20} style={styles.emptyFeastCard}>
                  <Text style={styles.emptyFeastText}>No feasts cooking right now.</Text>
                  <Text style={styles.emptyFeastSubtext}>
                    When everyone's RSVP is in, tap "Start feast" to begin cooking!
                  </Text>
                </StickerCard>
              ) : (
                cookingFeasts.map((feast) => (
                  <StickerCard
                    key={feast.id}
                    backgroundColor={Colors.paper}
                    borderRadius={22}
                    style={styles.cookingFeastCard}
                  >
                    <View style={styles.feastHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.feastTitle}>{feast.recipeTitle}</Text>
                        <Text style={styles.feastMeta}>
                          {feast.cookTime || '35 min'} · {formatScheduledFor(feast.scheduledFor) || 'Time to be set'}
                        </Text>
                      </View>
                      <View style={styles.statusPillCooking}>
                        <Text style={styles.statusPillCookingText}>Cooking</Text>
                      </View>
                    </View>

                    {/* Who's bringing what breakdown */}
                    {feast.bringBreakdown && feast.bringBreakdown.length > 0 && (
                      <View style={styles.bringBox}>
                        <Text style={styles.bringBoxHeading}>Who's bringing what:</Text>
                        {feast.bringBreakdown.map((item, bIdx) => (
                          <Text key={bIdx} style={styles.bringLine}>
                            <Text style={styles.bringWho}>{item.who}: </Text>
                            {item.items}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Numbered cooking steps */}
                    {feast.cookingTasks && feast.cookingTasks.length > 0 && (
                      <View style={styles.cookingStepsBox}>
                        <Text style={styles.cookingStepsHeading}>Steps:</Text>
                        {feast.cookingTasks.map((task, sIdx) => (
                          <View key={sIdx} style={styles.stepRow}>
                            <View style={styles.stepNumPill}>
                              <Text style={styles.stepNumText}>{task.step_number || sIdx + 1}</Text>
                            </View>
                            <Text style={styles.stepInstructionText}>{task.instruction}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Outcome Check-in Buttons */}
                    <View style={styles.outcomeCheckinBox}>
                      <Text style={styles.outcomeCheckinPrompt}>How did the feast go?</Text>
                      <View style={styles.outcomeButtonsRow}>
                        <Pressable
                          style={[styles.outcomeBtn, styles.rescuedBtn]}
                          onPress={() => handleMarkRescued(feast)}
                        >
                          <Text style={styles.rescuedBtnText}>We ate it! Rescued</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.outcomeBtn, styles.failedBtn]}
                          onPress={() => handleMarkFailed(feast)}
                        >
                          <Text style={styles.failedBtnText}>Didn't work out</Text>
                        </Pressable>
                      </View>
                    </View>
                  </StickerCard>
                ))
              )}
            </View>

            {/* 4. COMPLETED FEASTS (Finished Cooking, Greyed Out) */}
            {completedFeasts.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>
                  Completed ({completedFeasts.length})
                </Text>
                {completedFeasts.map((feast) => {
                  const wasRescued = feast.outcome !== 'failed';

                  return (
                    <StickerCard
                      key={feast.id}
                      backgroundColor="#F0EDE8"
                      borderRadius={20}
                      style={styles.completedCard}
                    >
                      <View style={styles.completedHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.completedTitle}>{feast.recipeTitle}</Text>
                          <Text style={styles.completedMeta}>
                            {feast.partyName} · {formatScheduledFor(feast.scheduledFor) || 'Completed'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.outcomeBadge,
                            wasRescued ? styles.badgeRescued : styles.badgeFailed,
                          ]}
                        >
                          <Text style={styles.outcomeBadgeText}>
                            {wasRescued ? 'Rescued' : "Didn't work out"}
                          </Text>
                        </View>
                      </View>
                    </StickerCard>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ============================================================
            VIEW 2: SAVED SOLO RECIPES
        ============================================================ */}
        {activeSegment === 'saved' && (
          <View style={styles.savedStack}>
            {savedRecipes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FoodCharacter name="chef" mood="happy" size={110} animate={true} />
                <Text style={styles.emptyTitle}>No saved meals yet!</Text>
                <Text style={styles.emptySubtitle}>
                  Select ingredients on your Shelf to rescue them, or host a Feast to save recipes here.
                </Text>
                <View style={{ marginTop: 20, width: '100%' }}>
                  <StickerButton
                    title="Go to Shelf"
                    onPress={() => router.push('/(tabs)')}
                    variant="primary"
                    size="large"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {savedRecipes.map((recipe) => {
                  const ingredientsList =
                    recipe.focusExpiringItems && recipe.focusExpiringItems.length > 0
                      ? recipe.focusExpiringItems
                      : recipe.ingredients?.map((i) => i.item_name) || [];

                  const dollarsSaved = Math.round(
                    recipe.projectedImpact?.dollarsSaved || 0
                  );

                  return (
                    <StickerCard
                      key={recipe.id}
                      backgroundColor={Colors.paper}
                      borderRadius={20}
                      style={styles.recipeCard}
                    >
                      <View style={styles.recipeHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recipeTitle}>{recipe.title}</Text>
                          <View style={styles.metaRow}>
                            <Text style={styles.metaPill}>
                              {recipe.cookTime || '25 min'}
                            </Text>
                            {dollarsSaved > 0 && (
                              <Text style={[styles.metaPill, styles.savingsPill]}>
                                Saves about ${dollarsSaved}
                              </Text>
                            )}
                            {recipe.cookingTasks && recipe.cookingTasks.length > 0 && (
                              <Text style={styles.metaPill}>
                                {recipe.cookingTasks.length} steps
                              </Text>
                            )}
                          </View>
                        </View>
                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => removeSavedRecipe(recipe.id)}
                          hitSlop={8}
                        >
                          <Text style={styles.deleteIcon}>✕</Text>
                        </Pressable>
                      </View>

                      {/* Rescued Ingredients Pills */}
                      {ingredientsList.length > 0 && (
                        <View style={styles.ingredientsSection}>
                          <Text style={styles.ingredientsLabel}>Rescuing:</Text>
                          <View style={styles.ingredientsChipsWrap}>
                            {ingredientsList.map((item, idx) => (
                              <View key={idx} style={styles.ingredientChip}>
                                <Text style={styles.ingredientChipText}>{item}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Action CTA */}
                      <View style={styles.cardActions}>
                        <StickerButton
                          title="Cook & Check In"
                          onPress={() => router.push(`/recipe/${recipe.id}`)}
                          variant="primary"
                          size="medium"
                        />
                      </View>
                    </StickerCard>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Rescued Celebration Modal */}
      {activeRescuedFeast && (
        <RescuedCelebrationModal
          visible={!!activeRescuedFeast}
          ingredientNames={
            activeRescuedFeast.bringBreakdown
              ? activeRescuedFeast.bringBreakdown.flatMap((b) => b.items.split(', '))
              : ['Baby Spinach', 'Heavy Cream', 'Peppers']
          }
          dollarsSaved={activeRescuedFeast.dollarsSaved || 16}
          itemsSavedCount={4}
          isFeast={true}
          onClose={() => setActiveRescuedFeast(null)}
          onDone={handleCloseRescuedModal}
        />
      )}

      {/* Crushed Outcome Modal */}
      {activeCrushedFeast && (
        <CrushedOutcomeModal
          visible={!!activeCrushedFeast}
          crushedItemName={
            activeCrushedFeast.bringBreakdown?.[0]?.items.split(', ')[0] || 'Spinach'
          }
          onlookerNames={['Milk', 'Bell Pepper']}
          wastedAmount={8.5}
          isFeast={true}
          onClose={() => setActiveCrushedFeast(null)}
          onBackToShelf={handleCloseCrushedModal}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.cream,
    borderBottomWidth: 2,
    borderBottomColor: Colors.ink,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  dropdownTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 24,
    color: Colors.ink,
  },
  headerCountBadge: {
    backgroundColor: '#F0EAE1',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  headerCountBadgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: Colors.ink,
  },
  headerSubtitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: '#7A685D',
    marginTop: 2,
    marginBottom: 4,
  },
  dropdownMenu: {
    marginTop: 10,
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 16,
    padding: 6,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    gap: 4,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  dropdownItemActive: {
    backgroundColor: '#F0EAE1',
  },
  dropdownItemText: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: '#7A685D',
  },
  dropdownItemTextActive: {
    color: Colors.ink,
  },
  reassurancePill: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 12,
  },
  reassuranceText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: '#2E7D32',
  },
  declineLinkBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineLinkText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: '#8A776A',
    textDecorationLine: 'underline',
  },
  acceptedInviteWrap: {
    gap: 12,
  },
  youreInBanner: {
    backgroundColor: '#EBF3E8',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  youreInTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: '#2E5A36',
  },
  youreInSubtitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: '#4A6B50',
    marginTop: 2,
  },
  confirmedAttendeesHeading: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: '#7A685D',
  },
  confirmedAttendeesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attendeePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0EAE1',
    borderWidth: 1,
    borderColor: Colors.ink,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  attendeePillCheck: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 12,
  },
  attendeePillName: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 12,
    color: Colors.ink,
  },
  cantMakeItBtn: {
    alignItems: 'center',
    marginTop: 4,
  },
  cantMakeItText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: '#8A776A',
    textDecorationLine: 'underline',
  },
  segmentToggle: {
    flexDirection: 'row',
    backgroundColor: '#EBE2D5',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: Colors.paper,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  segmentBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: '#7A685D',
  },
  segmentBtnTextActive: {
    color: Colors.ink,
  },
  nudgeBanner: {
    backgroundColor: '#EBF3E8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.ink,
  },
  nudgeBannerText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: '#2E5A36',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  feastsStack: {
    gap: 20,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
  },
  inviteCard: {
    padding: 16,
    borderWidth: 2.5,
    borderColor: Colors.terracotta,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invitePartyName: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
  },
  inviteHost: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.terracotta,
  },
  inviteTimeBadge: {
    backgroundColor: '#FFEAD8',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.ink,
  },
  inviteTimeBadgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 11,
    color: Colors.ink,
  },
  inviteRecipeTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.ink,
    marginBottom: 8,
  },
  bringBox: {
    backgroundColor: Colors.cream,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFD1BF',
    marginBottom: 12,
  },
  bringBoxHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 12,
    color: '#655142',
    marginBottom: 4,
  },
  bringLine: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 18,
  },
  bringWho: {
    fontFamily: Fonts.headingBold,
    color: Colors.terracotta,
  },
  inviteActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inviteActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  acceptBtn: {
    backgroundColor: '#72C08A',
  },
  acceptBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: Colors.ink,
  },
  declineBtn: {
    backgroundColor: Colors.paper,
  },
  declineBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: '#8A776A',
  },
  emptyFeastCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyFeastText: {
    fontFamily: Fonts.headingBold,
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 4,
  },
  emptyFeastSubtext: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#7A685D',
    textAlign: 'center',
    lineHeight: 18,
  },
  pendingFeastCard: {
    padding: 16,
  },
  feastHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  feastTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 17,
    color: Colors.ink,
  },
  feastMeta: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: '#7A685D',
    marginTop: 2,
  },
  statusPillPending: {
    backgroundColor: '#FFF2D6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  statusPillPendingText: {
    fontFamily: Fonts.headingBold,
    fontSize: 11,
    color: '#9C6F12',
  },
  rsvpList: {
    borderTopWidth: 1,
    borderTopColor: '#EBE0D6',
    paddingTop: 10,
    marginBottom: 12,
  },
  rsvpListTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: '#8A776A',
    marginBottom: 6,
  },
  rsvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0E7DD',
  },
  friendInfoCol: {
    flex: 1,
  },
  rsvpFriendName: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: Colors.ink,
  },
  rsvpFriendStatus: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: '#7A685D',
  },
  nudgeButton: {
    backgroundColor: '#FFE5DC',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  nudgeButtonText: {
    fontFamily: Fonts.headingBold,
    fontSize: 12,
    color: Colors.terracotta,
  },
  startFeastWrap: {
    marginTop: 4,
  },
  cookingFeastCard: {
    padding: 16,
    borderWidth: 2.5,
    borderColor: '#54A06B',
  },
  statusPillCooking: {
    backgroundColor: '#E2F4E6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  statusPillCookingText: {
    fontFamily: Fonts.headingBold,
    fontSize: 11,
    color: '#257039',
  },
  cookingStepsBox: {
    backgroundColor: Colors.cream,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DFD1BF',
    marginBottom: 14,
  },
  cookingStepsHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: Colors.ink,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  stepNumPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ink,
  },
  stepNumText: {
    fontFamily: Fonts.headingBold,
    fontSize: 11,
    color: '#FFF',
  },
  stepInstructionText: {
    flex: 1,
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 18,
  },
  outcomeCheckinBox: {
    borderTopWidth: 1,
    borderTopColor: '#EBE0D6',
    paddingTop: 12,
  },
  outcomeCheckinPrompt: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  outcomeButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outcomeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  rescuedBtn: {
    backgroundColor: '#72C08A',
  },
  rescuedBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: Colors.ink,
  },
  failedBtn: {
    backgroundColor: '#F7E7E5',
  },
  failedBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: Colors.terracotta,
  },
  completedCard: {
    padding: 14,
    opacity: 0.75,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  completedTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 15,
    color: '#554A42',
  },
  completedMeta: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: '#8A776A',
    marginTop: 2,
  },
  outcomeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.ink,
  },
  badgeRescued: {
    backgroundColor: '#E8F5E9',
  },
  badgeFailed: {
    backgroundColor: '#FFEBEE',
  },
  outcomeBadgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 11,
    color: Colors.ink,
  },
  savedStack: {
    gap: 16,
  },
  emptyContainer: {
    backgroundColor: Colors.paper,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    padding: 28,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: Colors.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  emptyTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
    marginTop: 18,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 14,
    color: '#6E6057',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  listContainer: {
    gap: 16,
  },
  recipeCard: {
    padding: 16,
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  recipeTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  metaPill: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.ink,
    backgroundColor: '#F3EDE6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.ink,
  },
  savingsPill: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7E7E5',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontFamily: Fonts.headingBold,
    fontSize: 12,
    color: Colors.ink,
  },
  ingredientsSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EBE0D6',
  },
  ingredientsLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: '#8A776A',
    marginBottom: 6,
  },
  ingredientsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientChip: {
    backgroundColor: Colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.ink,
  },
  ingredientChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.ink,
  },
  cardActions: {
    marginTop: 14,
  },
});

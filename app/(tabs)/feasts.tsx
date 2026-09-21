import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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
import { formatScheduledFor } from '../../services/backendApi';
import {
    getDaysLeft,
    getStatusUrgency
} from '../../services/foodCharacterLookup';

type FeastStep = 'pick_friends' | 'pick_recipe' | 'waiting' | 'live';
export type FriendRsvpStatus = 'can_go' | 'cannot_go' | 'pending';

interface ChatMessage {
  id: string;
  senderName: string;
  senderInitial: string;
  text: string;
  isSelf: boolean;
}

const DAY_CHOICES = 14;
const STEP_MINUTES = 15;

const defaultWhen = () => {
  const d = new Date();
  d.setHours(18, 30, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d;
};

export default function FeastsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { itemIds } = useLocalSearchParams<{ itemIds?: string }>();
  const {
    currentUser,
    friends,
    fridgeItems,
    backendSyncAttempted,
    getFriendFridgeItems,
    addCustomFeast,
    feasts,
    nudgeFeastFriend,
    updateFeastSchedule,
    refreshFeast,
  } = useApp();

  // Active step in Feast mode
  const [currentStep, setCurrentStep] = useState<FeastStep>('pick_friends');

  // When navigated with itemIds, start at pick_friends
  React.useEffect(() => {
    if (itemIds) {
      setCurrentStep('pick_friends');
    }
  }, [itemIds]);

  // Step 1: Selected friends
  const mutualFriends = useMemo(() => {
    return friends.filter((f) => f.status === 'accepted');
  }, [friends]);

  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  // Initialize selected friends when mutualFriends changes
  React.useEffect(() => {
    if (selectedFriendIds.length === 0 && mutualFriends.length > 0) {
      setSelectedFriendIds(mutualFriends.slice(0, 2).map((f) => f.id));
    }
  }, [mutualFriends]);

  // Top 3 ingredients for each friend
  const getFriendTopIngredients = (friend: (typeof mutualFriends)[0], idx: number): string[] => {
    const items = getFriendFridgeItems(friend.id);
    if (items && items.length > 0) {
      return items.slice(0, 3).map((i) => i.name);
    }
    const fallbacks = [
      ['Bell peppers', 'Heavy cream', 'Rosemary'],
      ['Fresh basil', 'Feta cheese', 'Cherry tomatoes'],
      ['Mushrooms', 'Corn tortillas', 'Avocado'],
      ['Garlic cloves', 'Parmesan', 'Baby spinach'],
    ];
    return fallbacks[idx % fallbacks.length];
  };

  // User's foods to rescue (from itemIds or at-risk)
  const userAtRiskFoods = useMemo(() => {
    const userItems = fridgeItems.filter((i) => i.user_id === currentUser.id);
    if (itemIds && itemIds.trim().length > 0) {
      const ids = itemIds.split(',').filter(Boolean);
      const matched = userItems.filter((i) => ids.includes(i.id));
      if (matched.length > 0) {
        return matched.map((i) => i.name);
      }
    }
    return userItems
      .filter((i) => getStatusUrgency(getDaysLeft(i.expires_at)).needsRescue)
      .map((i) => i.name);
  }, [fridgeItems, currentUser.id, itemIds]);

  // Step 2: Recipe options & Schedule
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0);
  const [when, setWhen] = useState<Date>(defaultWhen);
  const scheduledIso = when.toISOString();
  const scheduledDateTime = formatScheduledFor(scheduledIso);
  const dayOptions = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: DAY_CHOICES }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);
  const pickDay = (day: Date) => {
    setWhen((prev) => {
      const next = new Date(day);
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      return next;
    });
  };
  const shiftTime = (minutes: number) => {
    setWhen((prev) => new Date(prev.getTime() + minutes * 60000));
  };

  // Step 3: Waiting lobby RSVPs & Nudge confirmation
  const [friendRsvps, setFriendRsvps] = useState<Record<string, FriendRsvpStatus>>({});
  const [nudgeConfirmation, setNudgeConfirmation] = useState<string | null>(null);

  // Answers come from the invitees themselves, via the backend. Nobody can
  // mark a friend as coming on their behalf.
  React.useEffect(() => {
    const mine = feasts.find((f) => f.hostId === currentUser.id);
    setFriendRsvps(() => {
      const next: Record<string, FriendRsvpStatus> = {};
      selectedFriendIds.forEach((id) => {
        const st = mine?.invitedFriends.find((f) => f.id === id)?.status;
        next[id] = st === 'accepted' ? 'can_go' : st === 'declined' ? 'cannot_go' : 'pending';
      });
      return next;
    });
  }, [selectedFriendIds, feasts, currentUser.id]);

  // Poll the backend for RSVP updates when host is in the waiting lobby
  React.useEffect(() => {
    if (currentStep !== 'waiting') return;
    const mine = feasts.find((f) => f.hostId === currentUser.id);
    if (!mine || isNaN(Number(mine.id))) return;
    const allResponded = mine.invitedFriends.every(
      (f) => f.status === 'accepted' || f.status === 'declined'
    );
    if (allResponded) return;
    const timer = setInterval(() => {
      refreshFeast(mine.id);
    }, 15000);
    return () => clearInterval(timer);
  }, [currentStep, feasts, currentUser.id]);

  // Toggle for inline schedule editor in the waiting lobby
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);

  const handleNudgeFriend = (name: string, friendId?: string) => {
    const mine = feasts.find((f) => f.hostId === currentUser.id);
    if (mine) {
      const targets = friendId
        ? [friendId]
        : mine.invitedFriends.filter((f) => f.status === 'pending').map((f) => f.id);
      targets.forEach((id) => nudgeFeastFriend(mine.id, id));
    }
    const msg = `Confirmation: Nudge reminder sent to ${name}!`;
    setNudgeConfirmation(msg);
    Alert.alert('Nudge Sent! 🔔', msg);
    setTimeout(() => {
      setNudgeConfirmation(null);
    }, 4000);
  };

  const feastRecipes = useMemo(() => {
    return [
      {
        id: 'feast-1',
        title: 'Eggplant and pepper bake',
        cookTime: '45 min',
        servings: 3,
        bringList: [
          { who: 'You', items: userAtRiskFoods.slice(0, 3).join(', ') || 'Spinach, Milk, Eggplant' },
          { who: mutualFriends[0]?.display_name.split(' ')[0] || 'Maya', items: 'Bell peppers, Cream' },
          { who: mutualFriends[1]?.display_name.split(' ')[0] || 'Jae', items: 'Feta cheese, Basil' },
        ],
        steps: [
          'Roast the eggplant and peppers in olive oil until tender and lightly charred.',
          'Wilt the fresh spinach into a warm pan and gently stir in the milk.',
          'Layer everything into a baking dish, top with crumbled feta, and bake until golden and bubbly.',
        ],
      },
      {
        id: 'feast-2',
        title: 'Creamy veggie pasta bake',
        cookTime: '50 min',
        servings: 4,
        bringList: [
          { who: 'You', items: userAtRiskFoods.slice(0, 2).join(', ') || 'Spinach, Milk' },
          { who: mutualFriends[0]?.display_name.split(' ')[0] || 'Maya', items: 'Cream, Bell peppers' },
          { who: mutualFriends[1]?.display_name.split(' ')[0] || 'Jae', items: 'Basil, Feta' },
        ],
        steps: [
          'Boil penne pasta until al dente.',
          'Simmer cream, spinach, and bell peppers into a rich sauce.',
          'Combine pasta and sauce, top with feta and fresh basil, and bake for 20 minutes.',
        ],
      },
      {
        id: 'feast-3',
        title: 'Stuffed pepper boats',
        cookTime: '40 min',
        servings: 3,
        bringList: [
          { who: 'You', items: userAtRiskFoods[0] || 'Spinach' },
          { who: mutualFriends[0]?.display_name.split(' ')[0] || 'Maya', items: 'Bell peppers' },
          { who: mutualFriends[1]?.display_name.split(' ')[0] || 'Jae', items: 'Feta, Basil' },
        ],
        steps: [
          'Slice bell peppers in half lengthwise and remove seeds.',
          'Sauté spinach and mix with feta cheese and basil.',
          'Fill pepper halves with filling and bake until tender and fragrant.',
        ],
      },
    ];
  }, [userAtRiskFoods, mutualFriends]);

  const activeRecipe = feastRecipes[selectedRecipeIndex];

  const allAccepted = Object.values(friendRsvps).every((s) => s === 'can_go');

  // Step 4: Live Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      senderName: mutualFriends[0]?.display_name.split(' ')[0] || 'Maya',
      senderInitial: 'M',
      text: 'Cutting the peppers small so they cook fast!',
      isSelf: false,
    },
    {
      id: 'm-2',
      senderName: 'You',
      senderInitial: 'Y',
      text: "Perfect. I'll start on the eggplant and spinach.",
      isSelf: true,
    },
    {
      id: 'm-3',
      senderName: mutualFriends[1]?.display_name.split(' ')[0] || 'Jae',
      senderInitial: 'J',
      text: "Feta's ready! Still good for 6:30?",
      isSelf: false,
    },
  ]);
  const [newChatText, setNewChatText] = useState('');

  // Outcome Modals
  const [isRescuedModalVisible, setIsRescuedModalVisible] = useState(false);
  const [isCrushedModalVisible, setIsCrushedModalVisible] = useState(false);

  const handleSendChat = () => {
    const trimmed = newChatText.trim();
    if (!trimmed) return;
    const msg: ChatMessage = {
      id: `m-${Date.now()}`,
      senderName: 'You',
      senderInitial: 'Y',
      text: trimmed,
      isSelf: true,
    };
    setChatMessages((prev) => [...prev, msg]);
    setNewChatText('');
  };

  const handleToggleFriendSelection = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendInvite = () => {
    const invitedFriendsList = mutualFriends
      .filter((f) => selectedFriendIds.includes(f.id))
      .map((f) => ({
        id: f.id,
        name: f.display_name,
        username: f.username,
        avatarUrl: f.avatar_url || '',
        status: 'pending' as 'accepted' | 'pending',
      }));

    const newFeast: FeastInvite = {
      id: `feast-${Date.now()}`,
      partyName: `${currentUser.display_name.split(' ')[0]}'s Feast Mode`,
      hostId: currentUser.id,
      hostName: currentUser.display_name,
      candidateRecipes: [],
      recipeId: activeRecipe.id,
      recipeTitle: activeRecipe.title,
      cookTime: activeRecipe.cookTime,
      foodRescuedGrams: 800,
      dollarsSaved: 16.5,
      invitedFriends: invitedFriendsList,
      status: 'pending',
      userRsvpStatus: 'host',
      scheduledFor: scheduledIso,
      bringBreakdown: activeRecipe.bringList,
      cookingTasks: activeRecipe.steps.map((step, idx) => ({
        step_number: idx + 1,
        instruction: step,
      })),
      createdAt: new Date().toISOString(),
    };

    addCustomFeast(newFeast);
    Alert.alert(
      'Invites Sent! ✉️',
      `Sent feast invites for "${activeRecipe.title}" (${scheduledDateTime})! Friends must confirm before they're counted in.`,
      [
        {
          text: 'Track RSVPs',
          onPress: () => setCurrentStep('waiting'),
        },
        {
          text: 'Go to Meals 🍳',
          onPress: () => router.push('/(tabs)/meals'),
        },
      ]
    );
  };

  if (!backendSyncAttempted) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  // Safe bottom padding for Android navigation bar
  const safeBottomPadding = Math.max(insets.bottom, 16) + 120;

  // RULE 2: No friends empty state
  if (mutualFriends.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: 54, paddingHorizontal: 16 }]}>
          <Text style={styles.headerTitle}>Feast mode</Text>
        </View>

        <View style={styles.emptyContainer}>
          <StickerCard backgroundColor={Colors.paper} borderRadius={26} shadowOffset={6} style={styles.emptyCard}>
            <View style={styles.mascotsRow}>
              <FoodCharacter foodKey="spinach" mood="happy" size={74} />
              <FoodCharacter foodKey="milk" mood="happy" size={74} />
            </View>

            <Text style={styles.emptyCardTitle}>Add Friends to Feast!</Text>

            <Text style={styles.emptyCardBody}>
              Feast mode brings friends together to pool at-risk groceries and cook collaborative rescue meals.
              Connect with at least 1 friend to start feasting!
            </Text>

            <StickerButton
              title="+ Add a Friend"
              onPress={() => router.push('/(tabs)/insights')}
              variant="primary"
              size="large"
            />
          </StickerCard>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================
            STEP 1: Pick Friends (Screen 12)
        ============================================================ */}
        {currentStep === 'pick_friends' && (
          <View style={styles.stepBlock}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Pressable onPress={() => router.push('/(tabs)')} hitSlop={10} style={styles.backBtn}>
                <Text style={styles.backBtnArrow}>‹</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Feast mode</Text>
                <Text style={styles.headerSubtitle}>
                  Friends who need rescuing! Pick who to cook with.
                </Text>
              </View>
            </View>

            {/* Your buddies that need rescuing */}
            <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.yourBuddiesCard}>
              <Text style={styles.cardHeading}>Your buddies that need rescuing</Text>
              <View style={styles.buddiesRow}>
                {(userAtRiskFoods.length > 0 ? userAtRiskFoods : ['Spinach', 'Milk', 'Eggplant']).map(
                  (food, idx) => (
                    <View key={idx} style={styles.buddyPill}>
                      <Text style={styles.buddyPillText}>{food}</Text>
                    </View>
                  )
                )}
              </View>
            </StickerCard>

            {/* Friends Cards with Checkboxes */}
            <View style={styles.friendsListStack}>
              {mutualFriends.map((friend, idx) => {
                const isSelected = selectedFriendIds.includes(friend.id);
                const initial = friend.display_name.charAt(0).toUpperCase();
                const friendTop3 = getFriendTopIngredients(friend, idx);

                return (
                  <StickerCard
                    key={friend.id}
                    backgroundColor={Colors.paper}
                    borderRadius={22}
                    style={styles.friendPickCard}
                    onPress={() => handleToggleFriendSelection(friend.id)}
                  >
                    <View style={styles.friendCardRow}>
                      {/* Avatar initial circle */}
                      <View style={styles.avatarInitialCircle}>
                        <Text style={styles.avatarInitialText}>{initial}</Text>
                      </View>

                      {/* Name and top 3 ingredients */}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.friendName}>{friend.display_name.split(' ')[0]}</Text>
                        <Text style={styles.topIngredientsLabel}>Top 3 ingredients:</Text>
                        <View style={styles.friendItemsRow}>
                          {friendTop3.map((item, fIdx) => (
                            <View key={fIdx} style={styles.friendItemPill}>
                              <Text style={styles.friendItemPillText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      {/* Checkbox */}
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxActive,
                        ]}
                      >
                        {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
                      </View>
                    </View>
                  </StickerCard>
                );
              })}
            </View>

            {/* Bottom Button: See recipes */}
            <View style={styles.ctaBottomWrap}>
              <StickerButton
                title={`Select recipe & schedule (${selectedFriendIds.length} friends)`}
                onPress={() => setCurrentStep('pick_recipe')}
                disabled={selectedFriendIds.length === 0}
                variant="primary"
                size="large"
              />
            </View>
          </View>
        )}

        {/* ============================================================
            STEP 2: Pick a Recipe & Schedule (Screen 13)
        ============================================================ */}
        {currentStep === 'pick_recipe' && (
          <View style={styles.stepBlock}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Pressable onPress={() => setCurrentStep('pick_friends')} hitSlop={10} style={styles.backBtn}>
                <Text style={styles.backBtnArrow}>‹</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Pick a recipe</Text>
                <Text style={styles.headerSubtitle}>What looks good? Pick your voyage.</Text>
              </View>
            </View>

            {/* Matches everyone's preferences banner */}
            <View style={styles.preferencesBannerRow}>
              <View style={styles.initialsStack}>
                <View style={[styles.microInitialCircle, { backgroundColor: '#DDEBD7' }]}>
                  <Text style={styles.microInitialText}>Y</Text>
                </View>
                <View style={[styles.microInitialCircle, { backgroundColor: '#F8E3A9', marginLeft: -8 }]}>
                  <Text style={styles.microInitialText}>M</Text>
                </View>
                <View style={[styles.microInitialCircle, { backgroundColor: '#F4C7B8', marginLeft: -8 }]}>
                  <Text style={styles.microInitialText}>J</Text>
                </View>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>Matches everyone's preferences</Text>
              </View>
            </View>

            {/* Recipe Radio Options */}
            <View style={styles.recipeOptionsStack}>
              {feastRecipes.map((recipe, idx) => {
                const isSelected = selectedRecipeIndex === idx;

                return (
                  <StickerCard
                    key={recipe.id}
                    backgroundColor={Colors.paper}
                    borderRadius={22}
                    style={styles.recipeSelectCard}
                    onPress={() => setSelectedRecipeIndex(idx)}
                  >
                    <View style={styles.recipeSelectHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recipeSelectTitle}>{recipe.title}</Text>
                        <Text style={styles.recipeSelectMeta}>
                          {recipe.cookTime} · serves {recipe.servings}
                        </Text>
                      </View>

                      {/* Radio circle */}
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <Text style={styles.radioCheck}>✓</Text>}
                      </View>
                    </View>

                    {/* Who brings what breakdown */}
                    <View style={styles.bringBreakdown}>
                      {recipe.bringList.map((item, bIdx) => (
                        <Text key={bIdx} style={styles.bringItemLine}>
                          <Text style={styles.bringWho}>{item.who}: </Text>
                          {item.items}
                        </Text>
                      ))}
                    </View>
                  </StickerCard>
                );
              })}
            </View>

            {/* Schedule Feast: Date & Time Picker */}
            <View style={styles.scheduleCardWrap}>
              <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.scheduleCard}>
                <Text style={styles.scheduleHeading}>Select feast date & time 📅</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.dateTimePresetsRow}>
                    {dayOptions.map((day) => {
                      const isPicked = day.toDateString() === when.toDateString();
                      return (
                        <Pressable
                          key={day.toISOString()}
                          style={[
                            styles.dateTimePresetPill,
                            isPicked && styles.dateTimePresetPillActive,
                          ]}
                          onPress={() => pickDay(day)}
                        >
                          <Text
                            style={[
                              styles.dateTimePresetText,
                              isPicked && styles.dateTimePresetTextActive,
                            ]}
                          >
                            {day.toLocaleDateString(undefined, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
                <View style={styles.dateTimePresetsRow}>
                  <Pressable style={styles.dateTimePresetPill} onPress={() => shiftTime(-60)}>
                    <Text style={styles.dateTimePresetText}>− 1 hr</Text>
                  </Pressable>
                  <Pressable style={styles.dateTimePresetPill} onPress={() => shiftTime(-STEP_MINUTES)}>
                    <Text style={styles.dateTimePresetText}>− {STEP_MINUTES} min</Text>
                  </Pressable>
                  <View style={[styles.dateTimePresetPill, styles.dateTimePresetPillActive]}>
                    <Text style={[styles.dateTimePresetText, styles.dateTimePresetTextActive]}>
                      {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Pressable style={styles.dateTimePresetPill} onPress={() => shiftTime(STEP_MINUTES)}>
                    <Text style={styles.dateTimePresetText}>+ {STEP_MINUTES} min</Text>
                  </Pressable>
                  <Pressable style={styles.dateTimePresetPill} onPress={() => shiftTime(60)}>
                    <Text style={styles.dateTimePresetText}>+ 1 hr</Text>
                  </Pressable>
                </View>
              </StickerCard>
            </View>

            {/* Bottom Button: Send out invite */}
            <View style={styles.ctaBottomWrap}>
              <StickerButton
                title="Send out invite to friends ✉️"
                onPress={handleSendInvite}
                variant="primary"
                size="large"
              />
            </View>
          </View>
        )}

        {/* ============================================================
            STEP 3: Waiting for Friends (Screen 14)
        ============================================================ */}
        {currentStep === 'waiting' && (
          <View style={styles.stepBlock}>
            {/* Header */}
            {/* Header */}
            <View style={styles.headerRow}>
              <Pressable onPress={() => setCurrentStep('pick_recipe')} hitSlop={10} style={styles.backBtn}>
                <Text style={styles.backBtnArrow}>‹</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Waiting for friends</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Text style={styles.headerSubtitle}>
                    {activeRecipe.title} · {scheduledDateTime}
                  </Text>
                  <Pressable
                    onPress={() => setIsEditingSchedule((prev) => !prev)}
                    hitSlop={6}
                    style={{
                      backgroundColor: isEditingSchedule ? Colors.terracotta : '#F0E6DA',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Fonts.bodySemiBold,
                        fontSize: 11,
                        color: isEditingSchedule ? '#fff' : Colors.terracotta,
                      }}
                    >
                      {isEditingSchedule ? 'Done' : '✏️ Edit time'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Inline Schedule Editor (collapsible) */}
            {isEditingSchedule && (
              <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.scheduleCard}>
                <Text style={styles.scheduleHeading}>Change feast date & time 📅</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.dateTimePresetsRow}>
                    {dayOptions.map((day) => {
                      const isPicked = day.toDateString() === when.toDateString();
                      return (
                        <Pressable
                          key={day.toISOString()}
                          style={[
                            styles.dateTimePresetPill,
                            isPicked && styles.dateTimePresetPillActive,
                          ]}
                          onPress={() => {
                            pickDay(day);
                            const mine = feasts.find((f) => f.hostId === currentUser.id);
                            if (mine) {
                              const next = new Date(day);
                              next.setHours(when.getHours(), when.getMinutes(), 0, 0);
                              updateFeastSchedule(mine.id, next.toISOString());
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.dateTimePresetText,
                              isPicked && styles.dateTimePresetTextActive,
                            ]}
                          >
                            {day.toLocaleDateString(undefined, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
                <View style={styles.dateTimePresetsRow}>
                  <Pressable
                    style={styles.dateTimePresetPill}
                    onPress={() => {
                      shiftTime(-60);
                      const mine = feasts.find((f) => f.hostId === currentUser.id);
                      if (mine) updateFeastSchedule(mine.id, new Date(when.getTime() - 60 * 60000).toISOString());
                    }}
                  >
                    <Text style={styles.dateTimePresetText}>− 1 hr</Text>
                  </Pressable>
                  <Pressable
                    style={styles.dateTimePresetPill}
                    onPress={() => {
                      shiftTime(-STEP_MINUTES);
                      const mine = feasts.find((f) => f.hostId === currentUser.id);
                      if (mine) updateFeastSchedule(mine.id, new Date(when.getTime() - STEP_MINUTES * 60000).toISOString());
                    }}
                  >
                    <Text style={styles.dateTimePresetText}>− {STEP_MINUTES} min</Text>
                  </Pressable>
                  <View style={[styles.dateTimePresetPill, styles.dateTimePresetPillActive]}>
                    <Text style={[styles.dateTimePresetText, styles.dateTimePresetTextActive]}>
                      {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.dateTimePresetPill}
                    onPress={() => {
                      shiftTime(STEP_MINUTES);
                      const mine = feasts.find((f) => f.hostId === currentUser.id);
                      if (mine) updateFeastSchedule(mine.id, new Date(when.getTime() + STEP_MINUTES * 60000).toISOString());
                    }}
                  >
                    <Text style={styles.dateTimePresetText}>+ {STEP_MINUTES} min</Text>
                  </Pressable>
                  <Pressable
                    style={styles.dateTimePresetPill}
                    onPress={() => {
                      shiftTime(60);
                      const mine = feasts.find((f) => f.hostId === currentUser.id);
                      if (mine) updateFeastSchedule(mine.id, new Date(when.getTime() + 60 * 60000).toISOString());
                    }}
                  >
                    <Text style={styles.dateTimePresetText}>+ 1 hr</Text>
                  </Pressable>
                </View>
              </StickerCard>
            )}

            {/* Nudge Confirmation Message Banner */}
            {nudgeConfirmation && (
              <View style={styles.nudgeConfirmationBanner}>
                <Text style={styles.nudgeConfirmationText}>✓ {nudgeConfirmation}</Text>
              </View>
            )}

            {/* RSVP Cards List */}
            <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.lobbyCard}>
              {/* You (Host) */}
              <View style={styles.lobbyRow}>
                <View style={styles.avatarInitialCircle}>
                  <Text style={styles.avatarInitialText}>Y</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lobbyName}>You</Text>
                  <Text style={styles.lobbySub}>Host · Scheduled for {scheduledDateTime}</Text>
                </View>
                <View style={[styles.rsvpBadge, styles.rsvpCanGo]}>
                  <Text style={[styles.rsvpBadgeText, { color: '#2E7D32' }]}>✓ Ready</Text>
                </View>
              </View>

              {/* Invited Friends RSVPs */}
              {(selectedFriendIds.length > 0
                ? mutualFriends.filter((f) => selectedFriendIds.includes(f.id))
                : mutualFriends.slice(0, 2)
              ).map((friend) => {
                const rsvp = friendRsvps[friend.id] || 'pending';
                const isCanGo = rsvp === 'can_go';
                const isCannotGo = rsvp === 'cannot_go';
                const friendName = friend.display_name.split(' ')[0];

                return (
                  <View key={friend.id} style={[styles.lobbyRow, styles.lobbyRowBorder]}>
                    <View style={styles.avatarInitialCircle}>
                      <Text style={styles.avatarInitialText}>
                        {friend.display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lobbyName}>{friendName}</Text>
                      <Text style={styles.lobbySub}>
                        {isCanGo
                          ? 'Confirmed. Bringing ingredients.'
                          : isCannotGo
                          ? 'Cannot go this time.'
                          : 'Invite sent. Waiting for them to confirm.'}
                      </Text>

                    </View>

                    {/* Status Badge & Nudge Button */}
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View
                        style={[
                          styles.rsvpBadge,
                          isCanGo
                            ? styles.rsvpCanGo
                            : isCannotGo
                            ? styles.rsvpCannotGo
                            : styles.rsvpPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.rsvpBadgeText,
                            {
                              color: isCanGo
                                ? '#2E7D32'
                                : isCannotGo
                                ? '#C62828'
                                : Colors.soon.text,
                            },
                          ]}
                        >
                          {isCanGo ? '✓ Can go' : isCannotGo ? '✕ Cannot go' : '⏳ Pending'}
                        </Text>
                      </View>

                      <Pressable
                        style={styles.nudgePillBtn}
                        onPress={() => handleNudgeFriend(friendName, friend.id)}
                      >
                        <Text style={styles.nudgePillBtnText}>Nudge 🔔</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </StickerCard>

            {/* Progress Capsule Bars */}
            <View style={styles.progressWrap}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressTextLeft}>
                  {Object.values(friendRsvps).filter((s) => s === 'can_go').length + 1} of{' '}
                  {selectedFriendIds.length + 1} can go
                </Text>
                <Text style={styles.progressTextRight}>
                  {Object.values(friendRsvps).some((s) => s === 'pending')
                    ? 'Waiting for responses'
                    : 'Responses collected!'}
                </Text>
              </View>
              <View style={styles.capsuleBarsRow}>
                <View style={[styles.capsuleBar, styles.capsuleBarFilled]} />
                {selectedFriendIds.map((id) => {
                  const status = friendRsvps[id];
                  return (
                    <View
                      key={id}
                      style={[
                        styles.capsuleBar,
                        status === 'can_go' && styles.capsuleBarFilled,
                        status === 'cannot_go' && styles.capsuleBarDeclined,
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.waitingButtonsStack}>
              <StickerButton
                title="Send reminder nudge to pending friends 🔔"
                onPress={() => handleNudgeFriend('friends')}
                variant="secondary"
                size="large"
              />

              <StickerButton
                title="Start feast 🍳"
                onPress={() => setCurrentStep('live')}
                variant="primary"
                size="large"
              />
            </View>
          </View>
        )}

        {/* ============================================================
            STEP 4: Feast Live (Screen 15)
        ============================================================ */}
        {currentStep === 'live' && (
          <View style={styles.stepBlock}>
            {/* Header */}
            <View style={styles.liveHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable onPress={() => setCurrentStep('waiting')} hitSlop={10} style={styles.backBtn}>
                  <Text style={styles.backBtnArrow}>‹</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Feast</Text>
              </View>

              <Pressable
                style={styles.changeRecipeBtn}
                onPress={() => setCurrentStep('pick_recipe')}
              >
                <Text style={styles.changeRecipeBtnText}>Change recipe</Text>
              </Pressable>
            </View>

            {/* Recipe Card with Steps */}
            <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.recipeCard}>
              <Text style={styles.recipeTitle}>{activeRecipe.title}</Text>
              <Text style={styles.recipeMeta}>
                {activeRecipe.cookTime} · serves {activeRecipe.servings}
              </Text>

              <View style={styles.liveStepsList}>
                {activeRecipe.steps.map((step, sIdx) => (
                  <Text key={sIdx} style={styles.liveStepLine}>
                    <Text style={styles.liveStepNum}>{sIdx + 1}. </Text>
                    {step}
                  </Text>
                ))}
              </View>
            </StickerCard>

            {/* Who's bringing what */}
            <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.bringingCard}>
              <Text style={styles.cardHeading}>Who's bringing what</Text>
              <View style={styles.bringingStack}>
                {activeRecipe.bringList.map((entry, bIdx) => (
                  <View key={bIdx} style={styles.bringPersonRow}>
                    <View style={styles.avatarInitialCircle}>
                      <Text style={styles.avatarInitialText}>
                        {entry.who.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.bringPersonName}>{entry.who}</Text>
                    <View style={styles.bringItemTag}>
                      <Text style={styles.bringItemTagText}>{entry.items}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </StickerCard>

            {/* Side-by-side Outcome Buttons */}
            <View style={styles.outcomeRow}>
              <View style={{ flex: 1 }}>
                <StickerButton
                  title="We ate it!"
                  onPress={() => setIsRescuedModalVisible(true)}
                  variant="primary"
                  size="large"
                />
              </View>
              <View style={{ flex: 1 }}>
                <StickerButton
                  title="Didn't work"
                  onPress={() => setIsCrushedModalVisible(true)}
                  variant="secondary"
                  size="large"
                />
              </View>
            </View>

            {/* Group Chat Card */}
            <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.chatCard}>
              <Text style={styles.cardHeading}>Feast chat</Text>

              <View style={styles.chatMessagesList}>
                {chatMessages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.chatBubbleRow,
                      msg.isSelf && styles.chatBubbleRowSelf,
                    ]}
                  >
                    {!msg.isSelf && (
                      <View style={styles.chatAvatar}>
                        <Text style={styles.chatAvatarText}>{msg.senderInitial}</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.chatBubble,
                        msg.isSelf ? styles.chatBubbleSelf : styles.chatBubbleOther,
                      ]}
                    >
                      <Text style={styles.chatMessageText}>{msg.text}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Chat Input Field */}
              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatTextInput}
                  placeholder="Message the group"
                  placeholderTextColor={Colors.placeholder}
                  value={newChatText}
                  onChangeText={setNewChatText}
                  onSubmitEditing={handleSendChat}
                />
                <Pressable style={styles.chatSendBtn} onPress={handleSendChat}>
                  <Text style={styles.chatSendArrow}>➤</Text>
                </Pressable>
              </View>
            </StickerCard>
          </View>
        )}
      </ScrollView>

      {/* Feast Rescued Scene (Screen 16) */}
      <RescuedCelebrationModal
        visible={isRescuedModalVisible}
        ingredientNames={['Spinach', 'Milk', 'Eggplant', 'Pepper']}
        itemsSavedCount={6}
        isFeast={true}
        onClose={() => setIsRescuedModalVisible(false)}
        onDone={() => {
          setIsRescuedModalVisible(false);
          setCurrentStep('pick_friends');
          router.replace('/(tabs)');
        }}
      />

      {/* Feast Fell Through Scene (Screen 17) */}
      <CrushedOutcomeModal
        visible={isCrushedModalVisible}
        crushedItemName="Spinach"
        onlookerNames={['Milk', 'Bell pepper']}
        isFeast={true}
        onClose={() => setIsCrushedModalVisible(false)}
        onTryAnother={() => {
          setIsCrushedModalVisible(false);
          setCurrentStep('pick_recipe');
        }}
        onBackToShelf={() => {
          setIsCrushedModalVisible(false);
          setCurrentStep('pick_friends');
          router.replace('/(tabs)');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 54,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnArrow: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 34,
    color: Colors.ink,
    marginTop: -4,
  },
  headerTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 24,
    color: Colors.ink,
  },
  headerSubtitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#76665A',
    marginTop: 2,
  },
  stepBlock: {
    gap: 16,
  },
  cardHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
    marginBottom: 10,
  },
  yourBuddiesCard: {
    padding: 16,
  },
  buddiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  buddyPill: {
    backgroundColor: Colors.now.bg,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  buddyPillText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: Colors.now.text,
  },
  friendsListStack: {
    gap: 12,
  },
  friendPickCard: {
    padding: 16,
  },
  friendCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarInitialCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FDEBD0',
    borderWidth: 2,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialText: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
  },
  friendName: {
    fontFamily: Fonts.headingBold,
    fontSize: 17,
    color: Colors.ink,
    marginBottom: 2,
  },
  topIngredientsLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: '#8A776A',
    marginBottom: 4,
  },
  friendItemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  friendItemPill: {
    backgroundColor: '#F8E3A9',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  friendItemPillText: {
    fontFamily: Fonts.headingMedium,
    fontSize: 12,
    color: Colors.ink,
  },
  scheduleCardWrap: {
    marginTop: 4,
  },
  scheduleCard: {
    padding: 16,
    gap: 10,
  },
  scheduleHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
  },
  dateTimePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateTimePresetPill: {
    backgroundColor: Colors.cream,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dateTimePresetPillActive: {
    backgroundColor: Colors.terracotta,
    borderColor: Colors.ink,
  },
  dateTimePresetText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 12,
    color: Colors.ink,
  },
  dateTimePresetTextActive: {
    color: '#FFF',
  },
  customDateTimeInput: {
    backgroundColor: Colors.cream,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.ink,
  },
  nudgeConfirmationBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2E7D32',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  nudgeConfirmationText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: '#2E7D32',
    textAlign: 'center',
  },
  rsvpSimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  simLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: '#8A776A',
  },
  simBtn: {
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.ink,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  simBtnActiveCanGo: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  simBtnActiveCannotGo: {
    backgroundColor: '#FFEBEE',
    borderColor: '#C62828',
  },
  simBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.ink,
  },
  simBtnTextActive: {
    fontWeight: 'bold',
  },
  nudgePillBtn: {
    backgroundColor: Colors.paper,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nudgePillBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 11,
    color: Colors.terracotta,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.ink,
    backgroundColor: Colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.terracotta,
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontFamily: Fonts.headingBold,
    fontSize: 16,
  },
  ctaBottomWrap: {
    marginTop: 10,
    marginBottom: 16,
  },
  preferencesBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  initialsStack: {
    flexDirection: 'row',
  },
  microInitialCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  microInitialText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: Colors.ink,
  },
  matchBadge: {
    backgroundColor: Colors.fresh.bg,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  matchBadgeText: {
    fontFamily: Fonts.headingMedium,
    fontSize: 13,
    color: Colors.fresh.text,
  },
  recipeOptionsStack: {
    gap: 14,
  },
  recipeSelectCard: {
    padding: 16,
  },
  recipeSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recipeSelectTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
  },
  recipeSelectMeta: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#76665A',
    marginTop: 2,
  },
  radioCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.ink,
    backgroundColor: Colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    backgroundColor: Colors.terracotta,
  },
  radioCheck: {
    color: '#FFFFFF',
    fontFamily: Fonts.headingBold,
    fontSize: 15,
  },
  bringBreakdown: {
    gap: 4,
  },
  bringItemLine: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  bringWho: {
    fontFamily: Fonts.headingBold,
    color: Colors.ink,
  },
  lobbyCard: {
    padding: 16,
    gap: 12,
  },
  lobbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  lobbyRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#EBE0CE',
    paddingTop: 12,
  },
  lobbyName: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
  },
  lobbySub: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
  },
  rsvpBadge: {
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  rsvpReady: {
    backgroundColor: Colors.fresh.bg,
  },
  rsvpAccepted: {
    backgroundColor: Colors.fresh.bg,
  },
  rsvpCanGo: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  rsvpCannotGo: {
    backgroundColor: '#FFEBEE',
    borderColor: '#C62828',
  },
  rsvpPending: {
    backgroundColor: Colors.soon.bg,
  },
  rsvpBadgeText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
  },
  progressWrap: {
    marginTop: 10,
    gap: 6,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTextLeft: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  progressTextRight: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
  },
  capsuleBarsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  capsuleBar: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    backgroundColor: Colors.paper,
  },
  capsuleBarFilled: {
    backgroundColor: Colors.sage,
  },
  capsuleBarDeclined: {
    backgroundColor: '#EF9A9A',
  },
  waitingButtonsStack: {
    gap: 12,
    marginTop: 12,
  },
  changeRecipeBtn: {
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  changeRecipeBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: Colors.ink,
  },
  recipeCard: {
    padding: 18,
  },
  recipeTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: Colors.ink,
  },
  recipeMeta: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#76665A',
    marginBottom: 12,
  },
  liveStepsList: {
    gap: 8,
  },
  liveStepLine: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.ink,
    lineHeight: 22,
  },
  liveStepNum: {
    fontFamily: Fonts.headingBold,
    color: Colors.ink,
  },
  bringingCard: {
    padding: 16,
  },
  bringingStack: {
    gap: 10,
  },
  bringPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bringPersonName: {
    fontFamily: Fonts.headingBold,
    fontSize: 15,
    color: Colors.ink,
    width: 60,
  },
  bringItemTag: {
    flex: 1,
    backgroundColor: '#F8E3A9',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  bringItemTagText: {
    fontFamily: Fonts.headingMedium,
    fontSize: 13,
    color: Colors.ink,
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chatCard: {
    padding: 16,
  },
  chatMessagesList: {
    gap: 10,
    marginBottom: 14,
  },
  chatBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  chatBubbleRowSelf: {
    justifyContent: 'flex-end',
  },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDEBD0',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatAvatarText: {
    fontFamily: Fonts.headingBold,
    fontSize: 12,
    color: Colors.ink,
  },
  chatBubble: {
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  chatBubbleOther: {
    backgroundColor: Colors.paper,
    borderBottomLeftRadius: 4,
  },
  chatBubbleSelf: {
    backgroundColor: '#E2F0D9',
    borderBottomRightRadius: 4,
  },
  chatMessageText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.ink,
    lineHeight: 20,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 44,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.terracotta,
    borderWidth: 2,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyCard: {
    padding: 26,
    alignItems: 'center',
  },
  mascotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  emptyCardTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyCardBody: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: '#655142',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
});

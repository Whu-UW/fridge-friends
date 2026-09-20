import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Fonts } from '../../constants/Theme';
import StickerCard from '../../components/ui/StickerCard';
import StickerButton from '../../components/ui/StickerButton';
import FoodCharacter from '../../components/FoodCharacter';
import RescuedCelebrationModal from '../../components/RescuedCelebrationModal';
import CrushedOutcomeModal from '../../components/CrushedOutcomeModal';
import {
  lookupFoodCharacter,
  getDaysLeft,
  getStatusUrgency,
} from '../../services/foodCharacterLookup';

type FeastStep = 'pick_friends' | 'pick_recipe' | 'waiting' | 'live';

interface ChatMessage {
  id: string;
  senderName: string;
  senderInitial: string;
  text: string;
  isSelf: boolean;
}

export default function FeastsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    friends,
    fridgeItems,
    backendSyncAttempted,
  } = useApp();

  // Active step in Feast mode
  const [currentStep, setCurrentStep] = useState<FeastStep>('pick_friends');

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

  // User's at-risk items
  const userAtRiskFoods = useMemo(() => {
    return fridgeItems
      .filter((i) => i.user_id === currentUser.id)
      .filter((i) => getStatusUrgency(getDaysLeft(i.expires_at)).needsRescue)
      .map((i) => i.name);
  }, [fridgeItems, currentUser.id]);

  // Step 2: Recipe options
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0);

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

  // Step 3: Waiting lobby RSVPs
  const [friendRsvps, setFriendRsvps] = useState<Record<string, 'Accepted' | 'Pending'>>({
    'friend-1': 'Accepted',
    'friend-2': 'Accepted',
  });

  const allAccepted = Object.values(friendRsvps).every((s) => s === 'Accepted');

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

  const handleNudgeFriend = (name: string) => {
    Alert.alert('Nudge Sent! 🔔', `Sent a reminder nudge to ${name}.`);
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

                // Placeholder at-risk items for friends
                const friendAtRisk =
                  idx === 0
                    ? ['Bell peppers', 'Cream']
                    : idx === 1
                    ? ['Basil', 'Feta']
                    : ['Mushrooms', 'Tortillas'];

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

                      {/* Name and urgent food pills */}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.friendName}>{friend.display_name.split(' ')[0]}</Text>
                        <View style={styles.friendItemsRow}>
                          {friendAtRisk.map((item, fIdx) => (
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
                title={`See recipes for ${selectedFriendIds.length + 1} people`}
                onPress={() => setCurrentStep('pick_recipe')}
                disabled={selectedFriendIds.length === 0}
                variant="primary"
                size="large"
              />
            </View>
          </View>
        )}

        {/* ============================================================
            STEP 2: Pick a Recipe (Screen 13)
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

            {/* Bottom Button: Nudge Friends */}
            <View style={styles.ctaBottomWrap}>
              <StickerButton
                title={`Nudge ${mutualFriends[0]?.display_name.split(' ')[0] || 'Maya'} and ${mutualFriends[1]?.display_name.split(' ')[0] || 'Jae'}`}
                onPress={() => setCurrentStep('waiting')}
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
            <View style={styles.headerRow}>
              <Pressable onPress={() => setCurrentStep('pick_recipe')} hitSlop={10} style={styles.backBtn}>
                <Text style={styles.backBtnArrow}>‹</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Waiting for friends</Text>
                <Text style={styles.headerSubtitle}>
                  {activeRecipe.title} · {activeRecipe.cookTime}
                </Text>
              </View>
            </View>

            {/* RSVP Cards List */}
            <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.lobbyCard}>
              {/* You (Host) */}
              <View style={styles.lobbyRow}>
                <View style={styles.avatarInitialCircle}>
                  <Text style={styles.avatarInitialText}>Y</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lobbyName}>You</Text>
                  <Text style={styles.lobbySub}>Host</Text>
                </View>
                <View style={[styles.rsvpBadge, styles.rsvpReady]}>
                  <Text style={[styles.rsvpBadgeText, { color: Colors.fresh.text }]}>Ready</Text>
                </View>
              </View>

              {/* Friend 1: Maya */}
              <View style={[styles.lobbyRow, styles.lobbyRowBorder]}>
                <View style={styles.avatarInitialCircle}>
                  <Text style={styles.avatarInitialText}>M</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lobbyName}>{mutualFriends[0]?.display_name.split(' ')[0] || 'Maya'}</Text>
                  <Text style={styles.lobbySub}>Bringing bell peppers</Text>
                </View>
                <View style={[styles.rsvpBadge, styles.rsvpAccepted]}>
                  <Text style={[styles.rsvpBadgeText, { color: Colors.fresh.text }]}>Accepted</Text>
                </View>
              </View>

              {/* Friend 2: Jae */}
              <View style={[styles.lobbyRow, styles.lobbyRowBorder]}>
                <View style={styles.avatarInitialCircle}>
                  <Text style={styles.avatarInitialText}>J</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lobbyName}>{mutualFriends[1]?.display_name.split(' ')[0] || 'Jae'}</Text>
                  <Text style={styles.lobbySub}>Nudged 5 minutes ago</Text>
                </View>
                <View style={[styles.rsvpBadge, styles.rsvpPending]}>
                  <Text style={[styles.rsvpBadgeText, { color: Colors.soon.text }]}>Pending</Text>
                </View>
              </View>
            </StickerCard>

            {/* Progress Capsule Bars */}
            <View style={styles.progressWrap}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressTextLeft}>2 of 3 are in</Text>
                <Text style={styles.progressTextRight}>Everyone needs to accept</Text>
              </View>
              <View style={styles.capsuleBarsRow}>
                <View style={[styles.capsuleBar, styles.capsuleBarFilled]} />
                <View style={[styles.capsuleBar, styles.capsuleBarFilled]} />
                <View style={styles.capsuleBar} />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.waitingButtonsStack}>
              <StickerButton
                title={`Nudge ${mutualFriends[1]?.display_name.split(' ')[0] || 'Jae'} again`}
                onPress={() => handleNudgeFriend(mutualFriends[1]?.display_name.split(' ')[0] || 'Jae')}
                variant="secondary"
                size="large"
              />

              <StickerButton
                title="Start feast"
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

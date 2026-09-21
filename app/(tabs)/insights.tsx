import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AccountEditModal from '../../components/AccountEditModal';
import ChangeBuddyModal from '../../components/ChangeBuddyModal';
import FoodCharacter from '../../components/FoodCharacter';
import StickerButton from '../../components/ui/StickerButton';
import StickerCard from '../../components/ui/StickerCard';
import { Colors, Fonts } from '../../constants/Theme';
import { useApp } from '../../context/AppContext';
import { backendApi, BackendBuddy, BackendStats } from '../../services/backendApi';
import { buddyKeyFromBackend, buddyToBackend, CharacterKey, STARTER_BUDDIES } from '../../services/foodCharacterLookup';

const DIET_OPTIONS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free'];
const AVOID_OPTIONS = ['Peanuts', 'Shellfish', 'Tree nuts', 'Sesame'];
const CUISINE_OPTIONS = ['Italian', 'Mexican', 'Korean', 'Indian', 'Mediterranean'];

export default function ProfileYouScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    backendSyncAttempted,
    logout,
    changeUsername,
  } = useApp();
  const userId = Number(currentUser.id);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          await AsyncStorage.removeItem('has_completed_onboarding');
          router.replace('/login');
        },
      },
    ]);
  };

  // Buddy State
  const [buddyKey, setBuddyKey] = useState<CharacterKey>('can');
  const [buddyName, setBuddyName] = useState('Carl the canned tomatoes');
  const [isChangeBuddyVisible, setIsChangeBuddyVisible] = useState(false);

  // Account edit modal (username / password)
  const [accountEditMode, setAccountEditMode] = useState<'username' | 'password' | null>(null);

  // Waste & spending stats from backend
  const [stats, setStats] = useState<BackendStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Time Period Toggle for Chart (Weeks vs Months)
  const [period, setPeriod] = useState<'weeks' | 'months'>('weeks');

  // Food Preferences Multi-Select State
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedAvoids, setSelectedAvoids] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSavedSuccess, setPrefsSavedSuccess] = useState(false);

  // Load buddy + food preferences from the backend (local copy is a fallback)
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedBuddy = await AsyncStorage.getItem(`user_buddy_${currentUser.id}`);
        if (storedBuddy) {
          setBuddyKey(storedBuddy as CharacterKey);
          const found = STARTER_BUDDIES.find((b) => b.key === storedBuddy);
          if (found) setBuddyName(found.desc);
        }
      } catch {}

      if (!userId) return;
      try {
        const user = await backendApi.getUser(userId);
        const key = buddyKeyFromBackend(user.buddy);
        if (key) {
          setBuddyKey(key);
          const found = STARTER_BUDDIES.find((b) => b.key === key);
          if (found) setBuddyName(found.desc);
          AsyncStorage.setItem(`user_buddy_${currentUser.id}`, key).catch(() => {});
        }
        const norm = (v: string) => v.toLowerCase().replace(/[-\s]/g, '_');
        const pick = (options: string[], saved?: string[]) =>
          options.filter((o) => (saved || []).map(norm).includes(norm(o)));
        setSelectedDiets(pick(DIET_OPTIONS, user.diets));
        setSelectedAvoids(pick(AVOID_OPTIONS, user.avoid_allergens));
        setSelectedCuisines(pick(CUISINE_OPTIONS, user.favorite_cuisines));
      } catch (err) {
        console.warn('Could not load profile from backend:', err);
      }
    };
    loadProfile();
  }, [currentUser.id]);

  // Load waste & spending stats whenever the weeks/months toggle changes
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(null);
    backendApi
      .getStats(userId, period, 6)
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setStats(null);
          setStatsError(err?.message || 'Could not load stats.');
        }
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, period]);

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const norm = (v: string) => v.toLowerCase().replace(/[-\s]/g, '_');
      await backendApi.setTasteProfile(userId, {
        diets: selectedDiets.map(norm),
        avoid_allergens: selectedAvoids.map(norm),
        favorite_cuisines: selectedCuisines,
      });
      setPrefsSavedSuccess(true);
      setTimeout(() => setPrefsSavedSuccess(false), 3000);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save preferences.');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const toggleDiet = (diet: string) => {
    setSelectedDiets((prev) =>
      prev.includes(diet) ? prev.filter((d) => d !== diet) : [...prev, diet]
    );
  };

  const toggleAvoid = (avoid: string) => {
    setSelectedAvoids((prev) =>
      prev.includes(avoid) ? prev.filter((a) => a !== avoid) : [...prev, avoid]
    );
  };

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  };

  // Chart scale and rescued totals from backend stats
  const buckets = stats?.buckets ?? [];
  const chartMax = Math.max(1, ...buckets.map((b) => b.spent));
  const buddiesSaved = buckets.reduce((sum, b) => sum + b.items_rescued, 0);
  const money = (n: number) => `$${Math.round(n)}`;

  if (!backendSyncAttempted) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  // Safe bottom padding for Android navigation bar
  const safeBottomPadding = Math.max(insets.bottom, 16) + 120;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header */}
        <Text style={styles.screenHeading}>You</Text>

        {/* SECTION 1: Buddy & Handle Card */}
        <StickerCard backgroundColor={Colors.paper} borderRadius={24} style={styles.buddyCard}>
          <View style={styles.buddyHeaderRow}>
            {/* Buddy Mascot Avatar */}
            <View style={styles.buddyAvatarBox}>
              <FoodCharacter foodKey={buddyKey} mood="happy" size={56} animate={false} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.userHandle}>@{currentUser.username || 'pantry.pal'}</Text>
              <Text style={styles.buddyName}>Buddy: {buddyName}</Text>
            </View>
          </View>

          {/* Action Button: Change buddy */}
          <Pressable
            style={styles.changeBuddyBtn}
            onPress={() => setIsChangeBuddyVisible(true)}
          >
            <Text style={styles.changeBuddyBtnText}>Change buddy</Text>
          </Pressable>
        </StickerCard>

        {/* SECTION 2: Account Settings */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>Account</Text>
          <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.accountCard}>
            {/* User ID Row */}
            <View style={styles.accountRow}>
              <View>
                <Text style={styles.accountLabel}>Username</Text>
                <Text style={styles.accountValue}>@{currentUser.username || 'pantry.pal'}</Text>
              </View>
              <Pressable
                style={styles.accountActionBtn}
                onPress={() => setAccountEditMode('username')}
              >
                <Text style={styles.accountActionText}>Edit</Text>
              </Pressable>
            </View>

            {/* Password Row */}
            <View style={[styles.accountRow, styles.accountRowBorder]}>
              <View>
                <Text style={styles.accountLabel}>Password</Text>
                <Text style={styles.accountValue}>••••••••</Text>
              </View>
              <Pressable
                style={styles.accountActionBtn}
                onPress={() => setAccountEditMode('password')}
              >
                <Text style={styles.accountActionText}>Change</Text>
              </Pressable>
            </View>

            {/* Revisit Onboarding Survey Row */}
            <View style={[styles.accountRow, styles.accountRowBorder]}>
              <View>
                <Text style={styles.accountLabel}>Onboarding Survey</Text>
                <Text style={styles.accountValue}>Revisit buddy & diet setup</Text>
              </View>
              <Pressable
                style={styles.accountActionBtn}
                onPress={() =>
                  router.push({
                    pathname: '/onboarding',
                    params: {
                      buddyKey,
                      buddyName: buddyName.split(' ')[0],
                      userId: currentUser.id,
                    },
                  })
                }
              >
                <Text style={styles.accountActionText}>Survey</Text>
              </Pressable>
            </View>
          </StickerCard>
        </View>

        {/* SECTION 4: Food Preferences */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>Food preferences</Text>

          {/* Diet */}
          <Text style={styles.prefCategoryTitle}>Diet</Text>
          <View style={styles.chipsWrap}>
            {DIET_OPTIONS.map((diet) => {
              const isSelected = selectedDiets.includes(diet);
              return (
                <Pressable
                  key={diet}
                  style={[styles.prefChip, isSelected && styles.prefChipActive]}
                  onPress={() => toggleDiet(diet)}
                >
                  <Text style={[styles.prefChipText, isSelected && styles.prefChipTextActive]}>
                    {diet}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Always avoid */}
          <Text style={styles.prefCategoryTitle}>Always avoid</Text>
          <View style={styles.chipsWrap}>
            {AVOID_OPTIONS.map((avoid) => {
              const isSelected = selectedAvoids.includes(avoid);
              return (
                <Pressable
                  key={avoid}
                  style={[styles.prefChip, isSelected && styles.prefChipAvoidActive]}
                  onPress={() => toggleAvoid(avoid)}
                >
                  <Text style={[styles.prefChipText, isSelected && styles.prefChipTextAvoidActive]}>
                    {avoid}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Cuisines I love */}
          <Text style={styles.prefCategoryTitle}>Cuisines I love</Text>
          <View style={styles.chipsWrap}>
            {CUISINE_OPTIONS.map((cuisine) => {
              const isSelected = selectedCuisines.includes(cuisine);
              return (
                <Pressable
                  key={cuisine}
                  style={[styles.prefChip, isSelected && styles.prefChipActive]}
                  onPress={() => toggleCuisine(cuisine)}
                >
                  <Text style={[styles.prefChipText, isSelected && styles.prefChipTextActive]}>
                    {cuisine}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.avoidEnforceNote}>
            Everything in "Always avoid" is respected in every Feast recipe.
          </Text>

          {/* Save Preferences Button */}
          <View style={styles.savePrefsWrap}>
            <StickerButton
              title={prefsSavedSuccess ? 'Preferences saved! ✓' : isSavingPrefs ? 'Saving...' : 'Save preferences'}
              onPress={handleSavePreferences}
              disabled={isSavingPrefs}
              variant={prefsSavedSuccess ? 'secondary' : 'primary'}
              size="large"
            />
          </View>
        </View>

        {/* SECTION 5: Waste and Spending */}
        <View style={styles.sectionBlock}>
          <View style={styles.wasteHeaderRow}>
            <Text style={styles.sectionHeading}>Waste and spending</Text>
            {/* Weeks vs Months Toggle */}
            <View style={styles.segmentToggle}>
              <Pressable
                style={[styles.segmentBtn, period === 'weeks' && styles.segmentBtnActive]}
                onPress={() => setPeriod('weeks')}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    period === 'weeks' && styles.segmentBtnTextActive,
                  ]}
                >
                  Weeks
                </Text>
              </Pressable>
              <Pressable
                style={[styles.segmentBtn, period === 'months' && styles.segmentBtnActive]}
                onPress={() => setPeriod('months')}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    period === 'months' && styles.segmentBtnTextActive,
                  ]}
                >
                  Months
                </Text>
              </Pressable>
            </View>
          </View>

          {statsLoading && !stats ? (
            <ActivityIndicator color={Colors.terracotta} style={{ marginVertical: 24 }} />
          ) : statsError || !stats ? (
            <Text style={styles.wasteTrendText}>
              {statsError
                ? 'Could not load your waste and spending right now. Pull down to try again.'
                : 'No stats yet.'}
            </Text>
          ) : (
            <>
              {/* Spent - Wasted - Rescued */}
              <View style={styles.kpiCardsRow}>
                <StickerCard backgroundColor={Colors.paper} borderRadius={18} containerStyle={{ flex: 1 }} style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Spent</Text>
                  <Text style={styles.kpiValue}>{money(stats.spent)}</Text>
                </StickerCard>

                <StickerCard backgroundColor={Colors.paper} borderRadius={18} containerStyle={{ flex: 1 }} style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Wasted</Text>
                  <Text style={[styles.kpiValue, { color: Colors.terracotta }]}>
                    {money(stats.wasted)}
                  </Text>
                </StickerCard>

                <StickerCard backgroundColor={Colors.paper} borderRadius={18} containerStyle={{ flex: 1 }} style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Rescued</Text>
                  <Text style={[styles.kpiValue, { color: Colors.fresh.text }]}>
                    {money(stats.rescued)}
                  </Text>
                </StickerCard>
              </View>

              {/* Total buddies saved */}
              <StickerCard backgroundColor={Colors.paper} borderRadius={18} style={styles.buddiesSavedCard}>
                <Text style={styles.kpiLabel}>Total buddies saved</Text>
                <Text style={[styles.kpiValue, { color: Colors.fresh.text }]}>{buddiesSaved}</Text>
              </StickerCard>

              {/* Stacked Bar Chart */}
              <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.chartCard}>
                <View style={styles.barsContainer}>
                  {buckets.map((bar, bIdx) => {
                    const totalHeight = (bar.spent / chartMax) * 110;
                    const wastedHeight = (bar.wasted / chartMax) * 110;
                    const usedHeight = totalHeight - wastedHeight;

                    return (
                      <View key={bIdx} style={styles.barColumn}>
                        <View style={[styles.barPillar, { height: totalHeight }]}>
                          <View style={[styles.wastedSegment, { height: wastedHeight }]} />
                          <View style={[styles.spentSegment, { height: usedHeight }]} />
                        </View>
                        <Text style={styles.barLabel}>{bar.label}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: Colors.sage }]} />
                    <Text style={styles.legendText}>Spent and used</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: Colors.terracotta }]} />
                    <Text style={styles.legendText}>Wasted</Text>
                  </View>
                </View>
              </StickerCard>

              <Text style={styles.wasteTrendText}>{stats.summary}</Text>
              {stats.unpriced_items > 0 && (
                <Text style={styles.wasteTrendText}>
                  {stats.unpriced_items} {stats.unpriced_items === 1 ? 'item has' : 'items have'} no
                  price and {stats.unpriced_items === 1 ? 'is' : 'are'} not counted.
                </Text>
              )}
            </>
          )}
        </View>

        {/* SECTION 6: Log out */}
        <StickerButton title="Log out" onPress={handleLogout} variant="danger" size="large" />
      </ScrollView>

      <AccountEditModal
        mode={accountEditMode}
        currentUsername={currentUser.username}
        onSaveUsername={changeUsername}
        onSavePassword={(current, next) => backendApi.changePassword(userId, current, next)}
        onClose={() => setAccountEditMode(null)}
      />

      {/* Change Buddy Modal */}
      <ChangeBuddyModal
        visible={isChangeBuddyVisible}
        currentBuddyKey={buddyKey}
        onSelectBuddy={(key, name) => {
          setBuddyKey(key);
          const found = STARTER_BUDDIES.find((b) => b.key === key);
          setBuddyName(found ? found.desc : name);
          AsyncStorage.setItem(`user_buddy_${currentUser.id}`, key);
          const backendBuddy = buddyToBackend(key) as BackendBuddy;
          if (backendBuddy && userId) {
            backendApi.updateUser(userId, { buddy: backendBuddy }).catch((err) => {
              Alert.alert('Could not save buddy', err?.message || 'Please try again.');
            });
          }
        }}
        onClose={() => setIsChangeBuddyVisible(false)}
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
    gap: 20,
  },
  screenHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 28,
    color: Colors.ink,
  },
  buddyCard: {
    padding: 16,
  },
  buddyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  buddyAvatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.fresh.bg,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userHandle: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: Colors.ink,
  },
  buddyName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#76665A',
    marginTop: 2,
  },
  changeBuddyBtn: {
    width: '100%',
    backgroundColor: Colors.paper,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    borderRadius: 20,
    paddingVertical: 11,
    alignItems: 'center',
  },
  changeBuddyBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: Colors.ink,
    marginBottom: 4,
  },
  accountCard: {
    padding: 16,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  accountRowBorder: {
    borderTopWidth: 1.5,
    borderTopColor: '#EBE0CE',
    marginTop: 8,
    paddingTop: 12,
  },
  accountLabel: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
  },
  accountValue: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
    marginTop: 2,
  },
  accountActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  accountActionText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 15,
    color: Colors.terracotta,
  },
  friendsCard: {
    padding: 12,
  },
  friendItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  friendItemBorder: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#EBE0CE',
  },
  friendInitialCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FDEBD0',
    borderWidth: 2,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInitialText: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
  },
  friendItemName: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
  },
  friendItemSub: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
  },
  friendChevron: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: '#8A776A',
    paddingHorizontal: 4,
  },
  emptyFriendsBox: {
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  emptyFriendsTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
  },
  emptyFriendsSub: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
    textAlign: 'center',
  },
  savePrefsWrap: {
    marginTop: 14,
  },
  inviteLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 15,
    color: Colors.ink,
    marginTop: 8,
  },
  inviteInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  inviteInput: {
    flex: 1,
    height: 46,
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.ink,
  },
  inviteBtn: {
    backgroundColor: Colors.terracotta,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  privacyNote: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
    lineHeight: 18,
    marginTop: 4,
  },
  prefCategoryTitle: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: '#76665A',
    marginTop: 8,
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefChip: {
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  prefChipActive: {
    backgroundColor: Colors.fresh.bg,
  },
  prefChipAvoidActive: {
    backgroundColor: Colors.now.bg,
  },
  prefChipText: {
    fontFamily: Fonts.headingMedium,
    fontSize: 14,
    color: Colors.ink,
  },
  prefChipTextActive: {
    color: Colors.fresh.text,
  },
  prefChipTextAvoidActive: {
    color: Colors.now.text,
  },
  avoidEnforceNote: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
    lineHeight: 18,
    marginTop: 8,
  },
  wasteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  segmentToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.ink,
    borderRadius: 18,
    padding: 2,
  },
  segmentBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  segmentBtnActive: {
    backgroundColor: Colors.paper,
  },
  segmentBtnText: {
    fontFamily: Fonts.headingMedium,
    fontSize: 13,
    color: '#FFFFFF',
  },
  segmentBtnTextActive: {
    color: Colors.ink,
  },
  kpiCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    padding: 12,
    alignItems: 'center',
  },
  kpiLabel: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
    marginBottom: 2,
  },
  kpiValue: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
  },
  chartCard: {
    padding: 18,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 130,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#EBE0CE',
  },
  barColumn: {
    alignItems: 'center',
    gap: 6,
  },
  barPillar: {
    width: 32,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.ink,
    justifyContent: 'flex-end',
  },
  wastedSegment: {
    backgroundColor: Colors.terracotta,
    width: '100%',
  },
  spentSegment: {
    backgroundColor: Colors.sage,
    width: '100%',
  },
  barLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 12,
    color: Colors.ink,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  legendText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.ink,
  },
  buddiesSavedCard: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  wasteTrendText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
    marginTop: 6,
  },
});

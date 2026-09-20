import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors, Fonts } from '../constants/Theme';
import StickerCard from '../components/ui/StickerCard';
import StickerButton from '../components/ui/StickerButton';
import StatusChip from '../components/ui/StatusChip';
import FoodCharacter from '../components/FoodCharacter';
import FeastFriendRequirementModal from '../components/FeastFriendRequirementModal';
import {
  lookupFoodCharacter,
  getDaysLeft,
  getStatusUrgency,
  formatShelfTimeLeft,
} from '../services/foodCharacterLookup';
import { RecipeComposite } from '../services/supabase/types';

export default function RescueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    friends,
    fridgeItems,
    recipes,
    generateTopSoloRecipes,
  } = useApp();

  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [soloRecipes, setSoloRecipes] = useState<RecipeComposite[]>([]);
  const [isFriendReqModalVisible, setIsFriendReqModalVisible] = useState(false);

  // User at-risk items (Yellow and Red urgency)
  const atRiskItems = useMemo(() => {
    const userItems = fridgeItems.filter((i) => i.user_id === currentUser.id);
    return userItems
      .map((item) => {
        const daysLeft = getDaysLeft(item.expires_at);
        const urgency = getStatusUrgency(daysLeft);
        const lookup = lookupFoodCharacter(item.name);
        return {
          ...item,
          daysLeft,
          urgencyStatus: urgency.status,
          needsRescue: urgency.needsRescue,
          timeFormatted: formatShelfTimeLeft(daysLeft),
          characterKey: lookup.characterKey,
          foodCategory: lookup.category,
        };
      })
      .filter((item) => item.needsRescue)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [fridgeItems, currentUser.id]);

  // Load recipes only if there are items needing rescue
  useEffect(() => {
    let isMounted = true;

    if (atRiskItems.length === 0) {
      setSoloRecipes([]);
      setIsLoadingRecipes(false);
      return;
    }

    const loadRecipes = async () => {
      setIsLoadingRecipes(true);
      try {
        const generated = await generateTopSoloRecipes();
        if (isMounted && generated.length > 0) {
          setSoloRecipes(generated.slice(0, 4));
        }
      } catch {
        // Ignored
      } finally {
        if (isMounted) setIsLoadingRecipes(false);
      }
    };

    loadRecipes();
    return () => {
      isMounted = false;
    };
  }, [atRiskItems.length]);

  // Friends check for "Not enough? Invite friends"
  const mutualFriends = useMemo(() => {
    return friends.filter((f) => f.status === 'accepted');
  }, [friends]);

  const handleInviteFriendsPress = () => {
    if (mutualFriends.length === 0) {
      setIsFriendReqModalVisible(true);
    } else {
      router.push('/(tabs)/feasts');
    }
  };

  const handleCookThis = (recipe: RecipeComposite) => {
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id },
    });
  };

  const safeBottomPadding = Math.max(insets.bottom, 16) + 30;

  return (
    <View style={styles.container}>
      {/* Header with Back Arrow */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Text style={styles.backBtnArrow}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Rescue ingredients</Text>
          <Text style={styles.headerSubtitle}>Won't survive long. Cook these first.</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {atRiskItems.length === 0 ? (
          <View style={styles.emptyRescueWrap}>
            <StickerCard
              backgroundColor={Colors.paper}
              shadowOffset={4}
              borderRadius={24}
              style={styles.emptyRescueCard}
            >
              <FoodCharacter foodKey="can" mood="happy" size={88} animate={true} />
              <Text style={styles.emptyRescueTitle}>No ingredients need rescuing!</Text>
              <Text style={styles.emptyRescueSub}>
                Everything in your fridge is fresh and has plenty of shelf-life left.
              </Text>
              <View style={styles.emptyRescueActionWrap}>
                <StickerButton
                  title="‹ Back to shelf"
                  onPress={() => router.back()}
                  variant="primary"
                  size="large"
                />
              </View>
            </StickerCard>
          </View>
        ) : (
          <>
            {/* Urgent Ingredients Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContainer}
            >
              {atRiskItems.map((item) => (
                <View key={item.id} style={styles.carouselCardWrapper}>
                  <StickerCard
                    backgroundColor={Colors.paper}
                    shadowOffset={4}
                    borderRadius={22}
                    style={styles.carouselCard}
                  >
                    <FoodCharacter
                      foodKey={item.characterKey}
                      category={item.foodCategory}
                      daysLeft={item.daysLeft}
                      size={72}
                      animate={true}
                    />
                    <Text style={styles.carouselFoodName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <StatusChip
                      label={item.timeFormatted}
                      status={item.urgencyStatus}
                      size="small"
                    />
                  </StickerCard>
                </View>
              ))}
            </ScrollView>

            {/* SECTION: Recipes that save them */}
            <View style={styles.recipesSection}>
              <Text style={styles.recipesSectionHeading}>Recipes that save them</Text>

              {isLoadingRecipes && soloRecipes.length === 0 ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={Colors.terracotta} />
                  <Text style={styles.loadingText}>Finding best rescue recipes...</Text>
                </View>
              ) : soloRecipes.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>No at-risk recipes needed!</Text>
                  <Text style={styles.emptySub}>All ingredients on your shelf have plenty of time left.</Text>
                </View>
              ) : (
                <View style={styles.recipeCardsStack}>
                  {soloRecipes.map((recipe) => {
                    const dollarsSaved = Math.round(recipe.projectedImpact.dollarsSaved || 8);

                    return (
                      <StickerCard
                        key={recipe.id}
                        backgroundColor={Colors.paper}
                        shadowOffset={4}
                        borderRadius={22}
                        style={styles.recipeCard}
                      >
                        <Text style={styles.recipeTitle}>{recipe.title}</Text>

                        {/* Rescued ingredient pills */}
                        <View style={styles.ingredientChipsRow}>
                          {recipe.focusExpiringItems.map((food, fIdx) => (
                            <View key={fIdx} style={styles.ingredientChip}>
                              <Text style={styles.ingredientChipText}>{food}</Text>
                            </View>
                          ))}
                        </View>

                        {/* Meta row and Cook this button */}
                        <View style={styles.cardFooterRow}>
                          <Text style={styles.recipeMetaText}>
                            {recipe.cookTime || '35 min'} · saves about ${dollarsSaved}
                          </Text>

                          <View style={{ width: 120 }}>
                            <StickerButton
                              title="Cook this"
                              onPress={() => handleCookThis(recipe)}
                              variant="primary"
                              size="medium"
                            />
                          </View>
                        </View>
                      </StickerCard>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Bottom CTA: Not enough? Invite friends */}
            <View style={styles.bottomCtaWrap}>
              <StickerButton
                title="Not enough? Invite friends"
                onPress={handleInviteFriendsPress}
                variant="secondary"
                size="large"
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Feast Friend Requirement Modal */}
      <FeastFriendRequirementModal
        visible={isFriendReqModalVisible}
        onClose={() => setIsFriendReqModalVisible(false)}
        onAddFriend={() => {
          setIsFriendReqModalVisible(false);
          router.push('/(tabs)/insights');
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyRescueWrap: {
    paddingTop: 20,
    alignItems: 'center',
  },
  emptyRescueCard: {
    width: '100%',
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  emptyRescueTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: Colors.ink,
    textAlign: 'center',
  },
  emptyRescueSub: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 14,
    color: '#76665A',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyRescueActionWrap: {
    width: '100%',
    marginTop: 10,
  },
  carouselContainer: {
    paddingRight: 16,
    gap: 12,
    marginBottom: 24,
  },
  carouselCardWrapper: {
    width: 110,
  },
  carouselCard: {
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  carouselFoodName: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: Colors.ink,
    textAlign: 'center',
  },
  recipesSection: {
    marginBottom: 24,
  },
  recipesSectionHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: Colors.ink,
    marginBottom: 14,
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#76665A',
  },
  emptyBox: {
    padding: 24,
    backgroundColor: 'rgba(255, 253, 247, 0.7)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.ink,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
  },
  emptySub: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
    textAlign: 'center',
    marginTop: 4,
  },
  recipeCardsStack: {
    gap: 16,
  },
  recipeCard: {
    padding: 18,
  },
  recipeTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 19,
    color: Colors.ink,
    marginBottom: 10,
  },
  ingredientChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  ingredientChip: {
    backgroundColor: '#F8E3A9',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 14,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  ingredientChipText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: Colors.ink,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeMetaText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: '#655142',
  },
  bottomCtaWrap: {
    marginTop: 8,
    marginBottom: 16,
  },
});

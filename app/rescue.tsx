import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors, Fonts } from '../constants/Theme';
import StickerCard from '../components/ui/StickerCard';
import StickerButton from '../components/ui/StickerButton';
import StatusChip from '../components/ui/StatusChip';
import FoodCharacter from '../components/FoodCharacter';
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
  const { itemIds } = useLocalSearchParams<{ itemIds?: string }>();
  const {
    currentUser,
    fridgeItems,
    generateTopSoloRecipes,
    savedRecipes,
    saveRecipe,
    removeSavedRecipe,
  } = useApp();

  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [soloRecipes, setSoloRecipes] = useState<RecipeComposite[]>([]);
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<string[]>([]);

  // Selected items from route params or fallback to user at-risk items
  const selectedItemsData = useMemo(() => {
    const userItems = fridgeItems.filter((i) => i.user_id === currentUser.id);

    let rawList = userItems;
    if (itemIds && itemIds.trim().length > 0) {
      const idArray = itemIds.split(',').filter(Boolean);
      const matched = userItems.filter((i) => idArray.includes(i.id));
      if (matched.length > 0) {
        rawList = matched;
      }
    } else {
      // Fallback: at-risk items
      rawList = userItems.filter((item) => {
        const daysLeft = getDaysLeft(item.expires_at);
        const urgency = getStatusUrgency(daysLeft);
        return urgency.needsRescue;
      });
    }

    const mapped = rawList.map((item) => {
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
    });

    return {
      rawList,
      mappedItems: mapped.sort((a, b) => a.daysLeft - b.daysLeft),
    };
  }, [fridgeItems, currentUser.id, itemIds]);

  const { rawList, mappedItems } = selectedItemsData;
  const rawListRef = useRef(rawList);
  rawListRef.current = rawList;

  const loadRecipes = useCallback(async () => {
    const items = rawListRef.current;
    if (!items || items.length === 0) {
      setSoloRecipes([]);
      setIsLoadingRecipes(false);
      return;
    }

    setIsLoadingRecipes(true);
    try {
      const generated = await generateTopSoloRecipes(items);
      if (generated && generated.length > 0) {
        setSoloRecipes(generated.slice(0, 5));
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsLoadingRecipes(false);
    }
  }, [generateTopSoloRecipes]);

  useEffect(() => {
    loadRecipes();
  }, [itemIds]);

  const toggleDropdownSteps = (recipeId: string) => {
    setExpandedRecipeIds((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const handleToggleSave = (recipe: RecipeComposite) => {
    const isSaved = savedRecipes.some((r) => r.id === recipe.id);
    if (isSaved) {
      removeSavedRecipe(recipe.id);
    } else {
      saveRecipe(recipe);
    }
  };

  const handleCookThis = (recipe: RecipeComposite) => {
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id },
    });
  };

  const safeBottomPadding = Math.max(insets.bottom, 16) + 40;

  return (
    <View style={styles.container}>
      {/* Header with Back Arrow */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Text style={styles.backBtnArrow}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Rescue ingredients</Text>
          <Text style={styles.headerSubtitle}>
            {mappedItems.length > 0
              ? `Creating meals from ${mappedItems.length} selected ${mappedItems.length === 1 ? 'item' : 'items'}`
              : 'Cook expiring groceries before they spoil'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {mappedItems.length === 0 ? (
          <View style={styles.emptyRescueWrap}>
            <StickerCard
              backgroundColor={Colors.paper}
              shadowOffset={4}
              borderRadius={24}
              style={styles.emptyRescueCard}
            >
              <FoodCharacter foodKey="can" mood="happy" size={88} animate={true} />
              <Text style={styles.emptyRescueTitle}>No ingredients selected!</Text>
              <Text style={styles.emptyRescueSub}>
                Head back to your shelf, hold any ingredient to select it, and tap Rescue.
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
            {/* SECTION 1: Selected Items */}
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionHeading}>Selected items</Text>
              <Text style={styles.sectionSubCount}>({mappedItems.length})</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContainer}
            >
              {mappedItems.map((item) => (
                <View key={item.id} style={styles.carouselCardWrapper}>
                  <StickerCard
                    backgroundColor={Colors.paper}
                    shadowOffset={3}
                    borderRadius={20}
                    style={styles.carouselCard}
                  >
                    <FoodCharacter
                      foodKey={item.characterKey}
                      category={item.foodCategory}
                      daysLeft={item.daysLeft}
                      size={64}
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

            {/* SECTION 2: Top 5 Recipes */}
            <View style={styles.recipesSection}>
              <View style={styles.recipesHeaderRow}>
                <Text style={styles.recipesSectionHeading}>Top 5 rescue recipes</Text>
              </View>

              {isLoadingRecipes ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={Colors.terracotta} />
                  <Text style={styles.loadingText}>Crafting top 5 rescue recipes with AI...</Text>
                </View>
              ) : soloRecipes.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>Could not load recipes</Text>
                  <Text style={styles.emptySub}>Please tap regenerate below to try again.</Text>
                </View>
              ) : (
                <View style={styles.recipeCardsStack}>
                  {soloRecipes.map((recipe, index) => {
                    const dollarsSaved = Math.round(
                      recipe.projectedImpact?.dollarsSaved || 9
                    );
                    const isExpanded = expandedRecipeIds.includes(recipe.id);
                    const isSaved = savedRecipes.some((r) => r.id === recipe.id);

                    const ingredientsUsed =
                      recipe.focusExpiringItems && recipe.focusExpiringItems.length > 0
                        ? recipe.focusExpiringItems
                        : recipe.ingredients?.map((i) => i.item_name) || [];

                    return (
                      <StickerCard
                        key={recipe.id}
                        backgroundColor={Colors.paper}
                        shadowOffset={4}
                        borderRadius={22}
                        style={styles.recipeCard}
                      >
                        {/* Rank Badge & Title */}
                        <View style={styles.recipeCardHeader}>
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankBadgeText}>#{index + 1}</Text>
                          </View>
                          <Text style={styles.recipeTitle}>{recipe.title}</Text>
                        </View>

                        {/* Meta Tags: Time Needed & Money Saved */}
                        <View style={styles.metaRow}>
                          <View style={styles.metaPill}>
                            <Text style={styles.metaPillText}>
                              {recipe.cookTime || '25 min'}
                            </Text>
                          </View>
                          <View style={[styles.metaPill, styles.savingsPill]}>
                            <Text style={[styles.metaPillText, styles.savingsPillText]}>
                              Saves about ${dollarsSaved}
                            </Text>
                          </View>
                        </View>

                        {/* Ingredients Used Chips */}
                        <View style={styles.ingredientsSection}>
                          <Text style={styles.ingredientsLabel}>Ingredients used:</Text>
                          <View style={styles.ingredientChipsRow}>
                            {ingredientsUsed.map((food, fIdx) => (
                              <View key={fIdx} style={styles.ingredientChip}>
                                <Text style={styles.ingredientChipText}>{food}</Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        {/* Dropdown Menu for Cooking Steps */}
                        <Pressable
                          style={styles.stepsDropdownButton}
                          onPress={() => toggleDropdownSteps(recipe.id)}
                        >
                          <Text style={styles.stepsDropdownText}>
                            {isExpanded ? 'Hide cooking steps ▴' : 'View cooking steps ▾'}
                          </Text>
                          <Text style={styles.stepsCountBadge}>
                            {recipe.cookingTasks?.length || 3} steps
                          </Text>
                        </Pressable>

                        {/* Expanded Cooking Steps Content */}
                        {isExpanded && (
                          <View style={styles.expandedStepsContainer}>
                            {recipe.cookingTasks && recipe.cookingTasks.length > 0 ? (
                              recipe.cookingTasks.map((task, sIdx) => (
                                <View key={task.id || sIdx} style={styles.stepItemRow}>
                                  <View style={styles.stepNumberBadge}>
                                    <Text style={styles.stepNumberText}>{task.step_number || sIdx + 1}</Text>
                                  </View>
                                  <Text style={styles.stepInstructionText}>
                                    {task.instruction}
                                  </Text>
                                </View>
                              ))
                            ) : (
                              <View style={styles.stepItemRow}>
                                <View style={styles.stepNumberBadge}>
                                  <Text style={styles.stepNumberText}>1</Text>
                                </View>
                                <Text style={styles.stepInstructionText}>
                                  Combine ingredients in a pan with oil and season to taste. Cook until fragrant and thoroughly heated!
                                </Text>
                              </View>
                            )}
                          </View>
                        )}

                        {/* Action Buttons: Save Recipe & Cook Now */}
                        <View style={styles.recipeActionsRow}>
                          <Pressable
                            style={[
                              styles.saveRecipeBtn,
                              isSaved && styles.saveRecipeBtnSaved,
                            ]}
                            onPress={() => handleToggleSave(recipe)}
                          >
                            <Text
                              style={[
                                styles.saveRecipeBtnText,
                                isSaved && styles.saveRecipeBtnTextSaved,
                              ]}
                            >
                              {isSaved ? 'Saved to Meals' : 'Save this recipe'}
                            </Text>
                          </Pressable>

                          <View style={{ flex: 1 }}>
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

            {/* Bottom Actions: Regenerate Top 5 */}
            <View style={styles.bottomButtonsWrap}>
              <StickerButton
                title={isLoadingRecipes ? "Regenerating recipes..." : "Regenerate recipes"}
                onPress={loadRecipes}
                disabled={isLoadingRecipes}
                variant="primary"
                size="large"
              />
            </View>
          </>
        )}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: Colors.ink,
    backgroundColor: Colors.cream,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backBtnArrow: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 34,
    color: Colors.ink,
    marginTop: -4,
  },
  headerTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
  },
  headerSubtitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: '#76665A',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  sectionHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
  },
  sectionSubCount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.terracotta,
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
    padding: 10,
    alignItems: 'center',
    gap: 6,
  },
  carouselFoodName: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: Colors.ink,
    textAlign: 'center',
    width: '100%',
  },
  recipesSection: {
    marginBottom: 24,
  },
  recipesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  recipesSectionHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: Colors.ink,
  },
  loadingBox: {
    padding: 36,
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.paper,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  loadingText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#76665A',
    textAlign: 'center',
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
    gap: 18,
  },
  recipeCard: {
    padding: 16,
  },
  recipeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  rankBadge: {
    backgroundColor: Colors.terracotta,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  rankBadgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 12,
    color: '#FFF',
  },
  recipeTitle: {
    flex: 1,
    fontFamily: Fonts.headingBold,
    fontSize: 18,
    color: Colors.ink,
    lineHeight: 23,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metaPill: {
    backgroundColor: '#F2ECE4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  metaPillText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.ink,
  },
  savingsPill: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  savingsPillText: {
    color: '#2E7D32',
  },
  ingredientsSection: {
    marginBottom: 12,
  },
  ingredientsLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: '#8A776A',
    marginBottom: 6,
  },
  ingredientChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientChip: {
    backgroundColor: '#FFF2EB',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  ingredientChipText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 12,
    color: Colors.ink,
  },
  stepsDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5EEE6',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  stepsDropdownText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: Colors.ink,
  },
  stepsCountBadge: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: '#8A776A',
  },
  expandedStepsContainer: {
    backgroundColor: '#FFFDF9',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E6DACF',
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
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
  recipeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveRecipeBtn: {
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveRecipeBtnSaved: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  saveRecipeBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 13,
    color: Colors.ink,
  },
  saveRecipeBtnTextSaved: {
    color: '#2E7D32',
  },
  bottomButtonsWrap: {
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
});

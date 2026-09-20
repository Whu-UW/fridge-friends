import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Colors, Fonts } from '../../constants/Theme';
import StickerCard from '../../components/ui/StickerCard';
import StickerButton from '../../components/ui/StickerButton';
import FoodCharacter from '../../components/FoodCharacter';

export default function MealsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { savedRecipes, removeSavedRecipe } = useApp();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Saved Meals 🍳</Text>
          <Text style={styles.headerSubtitle}>
            Cook your saved rescues & feasts
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{savedRecipes.length}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {savedRecipes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FoodCharacter name="chef" mood="happy" size={110} animate={true} />
            <Text style={styles.emptyTitle}>No saved meals yet!</Text>
            <Text style={styles.emptySubtitle}>
              Select ingredients on your Shelf to rescue them, or host a Feast to save recipes here.
            </Text>
            <View style={{ marginTop: 20, width: '100%' }}>
              <StickerButton
                title="Go to Shelf 🏠"
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
                          ⏱️ {recipe.cookTime || '25 min'}
                        </Text>
                        {dollarsSaved > 0 && (
                          <Text style={[styles.metaPill, styles.savingsPill]}>
                            💰 Saves ${dollarsSaved}
                          </Text>
                        )}
                        {recipe.cookingTasks && recipe.cookingTasks.length > 0 && (
                          <Text style={styles.metaPill}>
                            📋 {recipe.cookingTasks.length} steps
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
                      title="Cook & Check In 👩‍🍳"
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
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
    fontSize: 14,
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
  scrollContent: {
    padding: 16,
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

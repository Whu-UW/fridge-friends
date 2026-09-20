import React, { useState } from 'react';
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
import { useApp } from '../../context/AppContext';
import { Colors, Fonts } from '../../constants/Theme';
import StickerCard from '../../components/ui/StickerCard';
import StickerButton from '../../components/ui/StickerButton';
import FoodCharacter from '../../components/FoodCharacter';
import RescuedCelebrationModal from '../../components/RescuedCelebrationModal';
import CrushedOutcomeModal from '../../components/CrushedOutcomeModal';

export default function CookAndCheckinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getRecipe, removeFridgeItem, fridgeItems, backendSyncAttempted } = useApp();

  const [isRescuedModalVisible, setIsRescuedModalVisible] = useState(false);
  const [isCrushedModalVisible, setIsCrushedModalVisible] = useState(false);

  const recipe = id ? getRecipe(id) : undefined;

  if (!backendSyncAttempted) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Recipe Not Found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Rescued foods list
  const rescuedFoods = recipe.focusExpiringItems.length > 0
    ? recipe.focusExpiringItems
    : recipe.ingredients.map((i) => i.item_name);

  const dollarsSaved = Math.round(recipe.projectedImpact.dollarsSaved || 11);

  // Outcome Handlers
  const handleMarkRescued = () => {
    // Mark matching user fridge items as consumed/used
    recipe.focusExpiringItems.forEach((foodName) => {
      const match = fridgeItems.find(
        (i) => i.name.toLowerCase().includes(foodName.toLowerCase())
      );
      if (match) {
        removeFridgeItem(match.id);
      }
    });
    setIsRescuedModalVisible(true);
  };

  const handleMarkFailed = () => {
    // Mark the most urgent item as tossed/crushed
    if (recipe.focusExpiringItems.length > 0) {
      const firstFood = recipe.focusExpiringItems[0];
      const match = fridgeItems.find(
        (i) => i.name.toLowerCase().includes(firstFood.toLowerCase())
      );
      if (match) {
        removeFridgeItem(match.id);
      }
    }
    setIsCrushedModalVisible(true);
  };

  const handleReturnToShelf = () => {
    setIsRescuedModalVisible(false);
    setIsCrushedModalVisible(false);
    router.replace('/(tabs)');
  };

  const handleTryAnother = () => {
    setIsCrushedModalVisible(false);
    router.replace('/rescue');
  };

  const safeBottomPadding = Math.max(insets.bottom, 16) + 30;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Text style={styles.backBtnArrow}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          <Text style={styles.recipeMeta}>
            {recipe.cookTime || '40 min'} · serves 2
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION: You're rescuing character strip */}
        <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.rescuingCard}>
          <Text style={styles.rescuingHeading}>You're rescuing</Text>
          <View style={styles.charactersRow}>
            {rescuedFoods.slice(0, 4).map((food, idx) => (
              <View key={idx} style={styles.characterSpot}>
                <FoodCharacter name={food} mood="uneasy" size={68} animate={true} />
                <Text style={styles.characterName} numberOfLines={1}>
                  {food}
                </Text>
              </View>
            ))}
          </View>
        </StickerCard>

        {/* SECTION: Cooking Steps */}
        <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.stepsCard}>
          {recipe.cookingTasks && recipe.cookingTasks.length > 0 ? (
            recipe.cookingTasks.map((task, sIdx) => (
              <View key={task.id || sIdx} style={styles.stepRow}>
                {/* Step number badge */}
                <View style={styles.stepNumCircle}>
                  <Text style={styles.stepNumText}>{task.step_number || sIdx + 1}</Text>
                </View>
                {/* Step text */}
                <Text style={styles.stepBodyText}>{task.instruction}</Text>
              </View>
            ))
          ) : (
            <View style={styles.stepRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <Text style={styles.stepBodyText}>
                Prepare and combine ingredients, then cook until golden and delicious!
              </Text>
            </View>
          )}
        </StickerCard>

        {/* SECTION: How did it go? */}
        <View style={styles.checkinSection}>
          <Text style={styles.checkinHeading}>How did it go?</Text>

          <View style={styles.buttonStack}>
            <StickerButton
              title="We ate it! Rescued"
              onPress={handleMarkRescued}
              variant="primary"
              size="large"
            />

            <StickerButton
              title="It didn't work out"
              onPress={handleMarkFailed}
              variant="secondary"
              size="large"
            />
          </View>
        </View>
      </ScrollView>

      {/* Rescued Sunset Celebration Modal (Screen 10) */}
      <RescuedCelebrationModal
        visible={isRescuedModalVisible}
        ingredientNames={rescuedFoods}
        dollarsSaved={dollarsSaved}
        onClose={() => setIsRescuedModalVisible(false)}
        onDone={handleReturnToShelf}
      />

      {/* Crushed Hydraulic Press Modal (Screen 11) */}
      <CrushedOutcomeModal
        visible={isCrushedModalVisible}
        crushedItemName={rescuedFoods[0] || 'Spinach'}
        onlookerNames={rescuedFoods.slice(1, 3)}
        wastedAmount={3.49}
        onClose={() => setIsCrushedModalVisible(false)}
        onTryAnother={handleTryAnother}
        onBackToShelf={handleReturnToShelf}
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
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: Colors.ink,
    marginBottom: 16,
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 16,
    color: Colors.terracotta,
  },
  header: {
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
  recipeTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 24,
    color: Colors.ink,
  },
  recipeMeta: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#76665A',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 20,
  },
  rescuingCard: {
    padding: 18,
  },
  rescuingHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 17,
    color: Colors.ink,
    marginBottom: 12,
  },
  charactersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  characterSpot: {
    alignItems: 'center',
    gap: 4,
  },
  characterName: {
    fontFamily: Fonts.headingMedium,
    fontSize: 13,
    color: Colors.ink,
  },
  stepsCard: {
    padding: 20,
    gap: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepNumCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8E3A9',
    borderWidth: 2,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
  },
  stepBodyText: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.ink,
    lineHeight: 24,
  },
  checkinSection: {
    marginTop: 10,
    alignItems: 'center',
  },
  checkinHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
    marginBottom: 16,
  },
  buttonStack: {
    width: '100%',
    gap: 12,
  },
});

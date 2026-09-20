import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../constants/Theme';
import StickerCard from '../components/ui/StickerCard';
import StickerButton from '../components/ui/StickerButton';
import FoodCharacter from '../components/FoodCharacter';
import { CharacterKey } from '../services/foodCharacterLookup';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    buddyKey?: string;
    buddyName?: string;
    userId?: string;
  }>();

  const buddyKey = (params.buddyKey as CharacterKey) || 'can';
  const buddyName = params.buddyName || 'Carl';

  // Multi-select preferences
  const [selectedDiets, setSelectedDiets] = useState<string[]>(['Pescatarian']);
  const [selectedAvoids, setSelectedAvoids] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([
    'Italian',
    'Mexican',
  ]);

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

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('has_completed_onboarding', 'true');
      const prefKey = params.userId ? `user_preferences_${params.userId}` : 'user_preferences_default';
      const buddyStorageKey = params.userId ? `user_buddy_${params.userId}` : 'user_buddy_default';
      await AsyncStorage.setItem(buddyStorageKey, buddyKey);
      await AsyncStorage.setItem(
        prefKey,
        JSON.stringify({
          diets: selectedDiets,
          avoids: selectedAvoids,
          cuisines: selectedCuisines,
        })
      );
    } catch {
      // Ignored
    }

    // Navigate straight to the Shelf!
    router.replace('/(tabs)');
  };

  const safeBottomPadding = Math.max(insets.bottom, 16) + 30;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Let's get to know you</Text>

        {/* Buddy Speech Bubble */}
        <View style={styles.speechCardRow}>
          <FoodCharacter foodKey={buddyKey} mood="happy" size={70} animate={true} />
          <View style={styles.bubbleWrap}>
            <StickerCard backgroundColor={Colors.paper} borderRadius={20} style={styles.bubbleCard}>
              <Text style={styles.bubbleText}>
                Hi, I'm {buddyName}! Tell me how you like to eat and I'll pick recipes you'll love.
              </Text>
            </StickerCard>
          </View>
        </View>

        {/* Diet section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Do you follow a diet?</Text>
          <View style={styles.chipsWrap}>
            {['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'Dairy-free'].map((diet) => {
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
        </View>

        {/* Always avoid section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Anything you always avoid?</Text>
          <View style={styles.chipsWrap}>
            {['Peanuts', 'Shellfish', 'Tree nuts', 'Sesame'].map((avoid) => {
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
          <Text style={styles.avoidNote}>
            These never show up in your recipes, or in Feast recipes with friends.
          </Text>
        </View>

        {/* Cuisines I love section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Which cuisines do you love?</Text>
          <View style={styles.chipsWrap}>
            {['Italian', 'Mexican', 'Korean', 'Indian', 'Mediterranean'].map((cuisine) => {
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
        </View>

        {/* Let's go button */}
        <View style={styles.ctaWrap}>
          <StickerButton title="Let's go" onPress={handleFinish} variant="primary" size="large" />
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 54,
    gap: 20,
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: 28,
    color: Colors.ink,
    marginBottom: 4,
  },
  speechCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bubbleWrap: {
    flex: 1,
  },
  bubbleCard: {
    padding: 14,
  },
  bubbleText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.ink,
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 17,
    color: Colors.ink,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
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
  avoidNote: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
    lineHeight: 18,
  },
  ctaWrap: {
    marginTop: 10,
  },
});

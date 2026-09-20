import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { getCharacterSvg } from '../assets/characters/svgData';
import {
  CharacterKey,
  CharacterMood,
  FoodCategory,
  lookupFoodCharacter,
  computeFreshnessAndMood,
  getDaysLeft,
} from '../services/foodCharacterLookup';

interface FoodCharacterProps {
  foodKey?: string;
  name?: string;
  mood?: CharacterMood;
  category?: FoodCategory;
  daysLeft?: number;
  expiresAt?: string;
  shelfLifeDays?: number;
  size?: number;
  animate?: boolean;
}

export default function FoodCharacter({
  foodKey,
  name,
  mood: explicitMood,
  category: explicitCategory,
  daysLeft: explicitDaysLeft,
  expiresAt,
  shelfLifeDays,
  size = 90,
  animate = true,
}: FoodCharacterProps) {
  // Resolve food character identity
  let resolvedKey: CharacterKey = 'spinach';
  let resolvedCategory: FoodCategory = 'gradual';
  let resolvedShelfLife = shelfLifeDays || 7;

  if (foodKey && ['spinach', 'milk', 'egg', 'pepper', 'can', 'pasta', 'eggplant', 'salmon', 'lemon'].includes(foodKey)) {
    resolvedKey = foodKey as CharacterKey;
    resolvedCategory = explicitCategory || (lookupFoodCharacter(foodKey).category);
  } else if (name) {
    const lookup = lookupFoodCharacter(name);
    resolvedKey = lookup.characterKey;
    resolvedCategory = explicitCategory || lookup.category;
    resolvedShelfLife = shelfLifeDays || lookup.defaultShelfLifeDays;
  }

  // Resolve days left
  const daysLeft =
    explicitDaysLeft !== undefined
      ? explicitDaysLeft
      : expiresAt
      ? getDaysLeft(expiresAt)
      : 5;

  // Resolve mood
  let mood: CharacterMood = 'happy';
  let motion = 'bob';

  if (explicitMood) {
    mood = explicitMood;
    if (mood === 'joy') motion = 'joy';
    else if (mood === 'scared') motion = 'scared';
    else if (mood === 'done') motion = 'none';
    else if (mood === 'toxic') motion = 'rage';
    else if (mood === 'wilting') motion = 'sob';
    else if (mood === 'nervous') motion = 'jitter';
    else if (mood === 'uneasy') motion = 'blink';
    else motion = 'bob';
  } else {
    const computed = computeFreshnessAndMood(resolvedCategory, daysLeft, resolvedShelfLife);
    mood = computed.mood;
    motion = computed.motion;
  }

  const svgXml = getCharacterSvg(resolvedKey, mood);

  // Reanimated shared values
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scaleY = useSharedValue(1);
  const scaleX = useSharedValue(1);

  useEffect(() => {
    if (!animate) {
      translateY.value = 0;
      translateX.value = 0;
      rotation.value = 0;
      scaleY.value = 1;
      scaleX.value = 1;
      return;
    }

    // Motion physics per handover spec
    if (motion === 'bob') {
      // Bob: 2.4s cycle, up and down 6px
      translateY.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    } else if (motion === 'jitter') {
      // Jitter: 0.35s sideways 2px shake, 1.5 deg tilt
      translateX.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 85 }),
          withTiming(2, { duration: 85 }),
          withTiming(0, { duration: 85 })
        ),
        -1,
        true
      );
      rotation.value = withRepeat(
        withSequence(
          withTiming(-1.5, { duration: 175 }),
          withTiming(1.5, { duration: 175 })
        ),
        -1,
        true
      );
    } else if (motion === 'sob') {
      // Sob: 2.6s tilted squash, two quick 3px dips
      rotation.value = withTiming(-4, { duration: 500 });
      scaleY.value = withTiming(0.94, { duration: 500 });
      translateY.value = withRepeat(
        withSequence(
          withTiming(3, { duration: 250 }),
          withTiming(0, { duration: 250 }),
          withTiming(3, { duration: 250 }),
          withTiming(0, { duration: 850 })
        ),
        -1,
        false
      );
    } else if (motion === 'rage') {
      // Rage: 0.22s rapid 3px shake, scaled up 4%
      scaleX.value = withTiming(1.04, { duration: 200 });
      scaleY.value = withTiming(1.04, { duration: 200 });
      translateX.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 55 }),
          withTiming(3, { duration: 55 })
        ),
        -1,
        true
      );
    } else if (motion === 'joy') {
      // Joy: 0.9s hop, up 22px with squash & stretch
      translateY.value = withRepeat(
        withSequence(
          withTiming(-22, { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 480, easing: Easing.bounce })
        ),
        -1,
        true
      );
    } else if (motion === 'scared') {
      // Scared onlooker: trembling shivering
      translateX.value = withRepeat(
        withSequence(
          withTiming(-1.5, { duration: 45 }),
          withTiming(1.5, { duration: 45 })
        ),
        -1,
        true
      );
      scaleY.value = withRepeat(
        withSequence(
          withTiming(0.96, { duration: 150 }),
          withTiming(1, { duration: 150 })
        ),
        -1,
        true
      );
    } else if (mood === 'done') {
      // Done / crushed: flattened
      translateY.value = 0;
      translateX.value = 0;
      rotation.value = 0;
      scaleY.value = 0.95;
      scaleX.value = 1.05;
    }

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(translateX);
      cancelAnimation(rotation);
      cancelAnimation(scaleY);
      cancelAnimation(scaleX);
    };
  }, [animate, motion, mood]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { rotateZ: `${rotation.value}deg` },
        { scaleY: scaleY.value },
        { scaleX: scaleX.value },
      ],
    };
  });

  if (!svgXml) {
    return <View style={{ width: size, height: size }} />;
  }

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
      <SvgXml xml={svgXml} width={size} height={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React, { useEffect } from 'react';
import { View, Text, Modal, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors, Fonts } from '../constants/Theme';
import StickerCard from './ui/StickerCard';
import StickerButton from './ui/StickerButton';
import FoodCharacter from './FoodCharacter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CrushedOutcomeModalProps {
  visible: boolean;
  crushedItemName: string;
  onlookerNames?: string[];
  wastedAmount?: number;
  isFeast?: boolean;
  onClose: () => void;
  onTryAnother: () => void;
  onBackToShelf: () => void;
}

export default function CrushedOutcomeModal({
  visible,
  crushedItemName,
  onlookerNames = ['Milk', 'Eggplant'],
  wastedAmount = 3.49,
  isFeast = false,
  onClose,
  onTryAnother,
  onBackToShelf,
}: CrushedOutcomeModalProps) {
  // Hydraulic press drop animation
  const pressY = useSharedValue(-200);
  const squashedScaleY = useSharedValue(1);
  const squashedScaleX = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      pressY.value = -200;
      squashedScaleY.value = 1;
      squashedScaleX.value = 1;

      // Press drops down with ease-in
      pressY.value = withTiming(
        0,
        { duration: 450, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (finished) {
            // Squashes ingredient to 140% width and 18% height
            squashedScaleX.value = withTiming(1.4, { duration: 80 });
            squashedScaleY.value = withTiming(0.2, { duration: 80 });
          }
        }
      );
    }
  }, [visible]);

  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressY.value }],
  }));

  const animatedSquashStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: squashedScaleX.value },
      { scaleY: squashedScaleY.value },
    ],
  }));

  const onlookersText =
    onlookerNames.length >= 2
      ? `${onlookerNames[0]} and ${onlookerNames[1]}`
      : onlookerNames[0] || 'Everyone';

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Dusk Background Bands */}
        <View style={styles.duskSky}>
          <View style={styles.duskBand1} />
          <View style={styles.duskBand2} />
          <View style={styles.duskBand3} />

          {/* Floor */}
          <View style={styles.floor} />

          {/* Hydraulic Press Unit */}
          <Animated.View style={[styles.pressContainer, animatedPressStyle]}>
            <View style={styles.pressShaft} />
            <View style={styles.pressHead}>
              {/* Hazard stripes */}
              <View style={styles.hazardStripesRow}>
                {Array.from({ length: 12 }).map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.hazardStripe,
                      { backgroundColor: idx % 2 === 0 ? '#FFD700' : '#2A242E' },
                    ]}
                  />
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Characters on Ground */}
          <View style={styles.groundRow}>
            {/* Left Onlooker (Trembling with wide scared eyes) */}
            <View style={styles.onlookerSpot}>
              <FoodCharacter
                name={onlookerNames[0] || 'Milk'}
                mood="scared"
                size={78}
                animate={true}
              />
            </View>

            {/* Squashed Ingredient Under the Press */}
            <Animated.View style={[styles.squashedSpot, animatedSquashStyle]}>
              <FoodCharacter
                name={crushedItemName}
                mood="done"
                size={82}
                animate={false}
              />
            </Animated.View>

            {/* Right Onlooker */}
            <View style={styles.onlookerSpot}>
              <FoodCharacter
                name={onlookerNames[1] || 'Eggplant'}
                mood="scared"
                size={78}
                animate={true}
              />
            </View>
          </View>
        </View>

        {/* Bottom Paper Card */}
        <View style={styles.bottomCardWrap}>
          <StickerCard backgroundColor={Colors.paper} shadowOffset={6} borderRadius={28} style={styles.card}>
            <Text style={styles.title}>
              {isFeast ? 'Feast fell through' : 'Oh no.'}
            </Text>

            <Text style={styles.subtitle}>
              {isFeast
                ? `The ${crushedItemName.toLowerCase()} didn't make it. Your friends saw everything.`
                : `The ${crushedItemName.toLowerCase()} didn't make it. ${onlookersText} saw everything.`}
            </Text>

            {/* Wasted Amount Pill */}
            <View style={styles.wastedPill}>
              <Text style={styles.wastedPillText}>
                {isFeast
                  ? `${crushedItemName} counted as wasted`
                  : `$${wastedAmount.toFixed(2)} counted as wasted`}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonStack}>
              <StickerButton
                title={isFeast ? 'Pick another recipe' : 'Try another recipe'}
                onPress={onTryAnother}
                variant="primary"
                size="large"
              />

              <StickerButton
                title="Back to my shelf"
                onPress={onBackToShelf}
                variant="secondary"
                size="large"
              />
            </View>
          </StickerCard>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B4AAB8',
  },
  duskSky: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  duskBand1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: '#C5BAC9',
  },
  duskBand2: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: '#B4AAB8',
  },
  duskBand3: {
    position: 'absolute',
    top: '70%',
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: '#9E94A3',
  },
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 38,
    backgroundColor: '#867C8A',
    borderTopWidth: 2,
    borderTopColor: Colors.ink,
  },
  pressContainer: {
    position: 'absolute',
    bottom: 38,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  pressShaft: {
    width: 20,
    height: 400,
    backgroundColor: '#4A404F',
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  pressHead: {
    width: 200,
    height: 28,
    backgroundColor: '#4A404F',
    borderWidth: 2.5,
    borderColor: Colors.ink,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  hazardStripesRow: {
    flexDirection: 'row',
    height: 14,
    width: '100%',
  },
  hazardStripe: {
    flex: 1,
    transform: [{ skewX: '-20deg' }],
  },
  groundRow: {
    position: 'absolute',
    bottom: 38,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
  },
  onlookerSpot: {
    alignItems: 'center',
    marginBottom: 4,
  },
  squashedSpot: {
    alignItems: 'center',
    marginBottom: -16,
  },
  bottomCardWrap: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  card: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: 28,
    color: Colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: '#655142',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  wastedPill: {
    backgroundColor: Colors.now.bg,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  wastedPillText: {
    fontFamily: Fonts.headingBold,
    fontSize: 15,
    color: Colors.now.text,
  },
  buttonStack: {
    width: '100%',
    gap: 12,
  },
});

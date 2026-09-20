import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Dimensions,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '../constants/Theme';
import StickerCard from './ui/StickerCard';
import StickerButton from './ui/StickerButton';
import FoodCharacter from './FoodCharacter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RescuedCelebrationModalProps {
  visible: boolean;
  ingredientNames: string[];
  dollarsSaved?: number;
  itemsSavedCount?: number;
  isFeast?: boolean;
  onClose: () => void;
  onDone: () => void;
}

// 18 confetti pieces positioned in sky
const CONFETTI_PIECES = [
  { left: 30, top: 50, color: '#E8674F', rotate: '25deg', size: 10 },
  { left: 80, top: 120, color: '#5DBB8A', rotate: '-15deg', size: 12 },
  { left: 140, top: 40, color: '#FFD36B', rotate: '45deg', size: 9 },
  { left: 200, top: 90, color: '#7EC8F2', rotate: '10deg', size: 11 },
  { left: 260, top: 60, color: '#E8674F', rotate: '-35deg', size: 10 },
  { left: 320, top: 110, color: '#9A62B8', rotate: '30deg', size: 13 },
  { left: 50, top: 170, color: '#FFD36B', rotate: '-20deg', size: 11 },
  { left: 110, top: 210, color: '#E8674F', rotate: '40deg', size: 8 },
  { left: 170, top: 160, color: '#5DBB8A', rotate: '-10deg', size: 10 },
  { left: 230, top: 200, color: '#7EC8F2', rotate: '15deg', size: 12 },
  { left: 290, top: 170, color: '#FFD36B', rotate: '-45deg', size: 9 },
  { left: 340, top: 190, color: '#E8674F', rotate: '20deg', size: 11 },
  { left: 40, top: 250, color: '#9A62B8', rotate: '35deg', size: 10 },
  { left: 95, top: 270, color: '#5DBB8A', rotate: '-25deg', size: 12 },
  { left: 160, top: 240, color: '#FFD36B', rotate: '15deg', size: 9 },
  { left: 220, top: 280, color: '#E8674F', rotate: '-15deg', size: 10 },
  { left: 280, top: 250, color: '#7EC8F2', rotate: '45deg', size: 11 },
  { left: 330, top: 260, color: '#5DBB8A', rotate: '-30deg', size: 8 },
];

export default function RescuedCelebrationModal({
  visible,
  ingredientNames,
  dollarsSaved = 11,
  itemsSavedCount = 3,
  isFeast = false,
  onClose,
  onDone,
}: RescuedCelebrationModalProps) {
  const router = useRouter();

  const charactersToRender =
    ingredientNames && ingredientNames.length > 0
      ? ingredientNames.slice(0, 3)
      : ['Baby Spinach', 'Heavy Cream', 'Bell Pepper'];

  const formattedFoodList =
    ingredientNames.length > 0
      ? ingredientNames.slice(0, 3).join(', ')
      : 'Ingredients';

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Sky Sunset Bands */}
        <View style={styles.sunsetSky}>
          <View style={styles.sunsetBand1} />
          <View style={styles.sunsetBand2} />
          <View style={styles.sunsetBand3} />

          {/* Confetti Particles */}
          {CONFETTI_PIECES.map((p, idx) => (
            <View
              key={idx}
              style={[
                styles.confetti,
                {
                  left: (p.left / 375) * SCREEN_WIDTH,
                  top: p.top,
                  backgroundColor: p.color,
                  width: p.size,
                  height: p.size,
                  transform: [{ rotate: p.rotate }],
                },
              ]}
            />
          ))}

          {/* Golden Setting Sun */}
          <View style={styles.sun} />

          {/* Sage Rolling Hills */}
          <View style={styles.hillBack} />
          <View style={styles.hillFront} />

          {/* Hopping Joyful Characters */}
          <View style={styles.charactersRow}>
            {charactersToRender.map((food, idx) => (
              <FoodCharacter
                key={idx}
                name={food}
                mood="joy"
                size={94}
                animate={true}
              />
            ))}
          </View>
        </View>

        {/* Bottom Paper Card */}
        <View style={styles.bottomCardWrap}>
          <StickerCard backgroundColor={Colors.paper} shadowOffset={6} borderRadius={28} style={styles.card}>
            <Text style={styles.title}>
              {isFeast ? 'Feast rescued!' : 'Rescued!'}
            </Text>

            <Text style={styles.subtitle}>
              {isFeast
                ? `You and your friends saved ${itemsSavedCount} ingredients together.`
                : `${formattedFoodList} made it to dinner.`}
            </Text>

            {/* Saved Metric Pill */}
            <View style={styles.savedPill}>
              <Text style={styles.savedPillText}>
                {isFeast
                  ? `${itemsSavedCount} items saved from the bin`
                  : `$${dollarsSaved.toFixed(0)} saved from the bin`}
              </Text>
            </View>

            {/* Buttons - Only Back to Shelf */}
            <View style={styles.buttonStack}>
              <StickerButton
                title="Back to shelf"
                onPress={onDone}
                variant="primary"
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
    backgroundColor: '#F2A07B',
  },
  sunsetSky: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  sunsetBand1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: '#F2A07B',
  },
  sunsetBand2: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: '#F6C29A',
  },
  sunsetBand3: {
    position: 'absolute',
    top: '70%',
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: '#F9DDA6',
  },
  confetti: {
    position: 'absolute',
    borderRadius: 2,
  },
  sun: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FFD36B',
    bottom: 50,
    alignSelf: 'center',
  },
  hillBack: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.2,
    height: 140,
    borderRadius: 100,
    backgroundColor: '#A8C2A3',
    bottom: -30,
    left: -SCREEN_WIDTH * 0.2,
  },
  hillFront: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.3,
    height: 120,
    borderRadius: 110,
    backgroundColor: '#8FA98A',
    bottom: -40,
    right: -SCREEN_WIDTH * 0.2,
  },
  charactersRow: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 16,
  },
  bottomCardWrap: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    backgroundColor: 'transparent',
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
  savedPill: {
    backgroundColor: Colors.fresh.bg,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  savedPillText: {
    fontFamily: Fonts.headingBold,
    fontSize: 15,
    color: Colors.fresh.text,
  },
  buttonStack: {
    width: '100%',
    gap: 12,
  },
});

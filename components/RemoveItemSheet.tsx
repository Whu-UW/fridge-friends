import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../constants/Theme';
import StickerCard from './ui/StickerCard';
import StickerButton from './ui/StickerButton';
import FoodCharacter from './FoodCharacter';
import { FridgeItemRow } from '../services/supabase/types';

interface RemoveItemSheetProps {
  visible: boolean;
  item: FridgeItemRow | null;
  onClose: () => void;
  onToss: (item: FridgeItemRow) => void;
  onRemoveMistake: (item: FridgeItemRow) => void;
}

export default function RemoveItemSheet({
  visible,
  item,
  onClose,
  onToss,
  onRemoveMistake,
}: RemoveItemSheetProps) {
  if (!item) return null;

  // Calculate days since bought
  const boughtDate = new Date(item.date_bought);
  const diffDays = Math.max(0, Math.floor((Date.now() - boughtDate.getTime()) / (24 * 36e5)));
  const boughtText =
    diffDays === 0
      ? 'Bought today'
      : diffDays === 1
      ? 'Bought yesterday'
      : `Bought ${diffDays} days ago`;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <StickerCard backgroundColor={Colors.paper} shadowOffset={6} borderRadius={28} style={styles.card}>
            {/* Grab handle indicator */}
            <View style={styles.handleBar} />

            {/* Sad / Wilting Character Mascot */}
            <View style={styles.mascotWrap}>
              <FoodCharacter
                name={item.name}
                mood="wilting"
                size={84}
                animate={true}
              />
            </View>

            {/* Title & Subtext */}
            <Text style={styles.title}>Remove the {item.name.toLowerCase()}?</Text>
            <Text style={styles.subtext}>
              {boughtText} · ${item.price.toFixed(2)}
            </Text>

            {/* Action 1: Toss it */}
            <View style={styles.btnWrap}>
              <StickerButton
                title="Toss it"
                onPress={() => onToss(item)}
                variant="primary"
                size="large"
              />
              <Text style={styles.choiceSubtext}>Counts as wasted food</Text>
            </View>

            {/* Action 2: Remove, added by mistake */}
            <View style={styles.btnWrap}>
              <StickerButton
                title="Remove, added by mistake"
                onPress={() => onRemoveMistake(item)}
                variant="secondary"
                size="large"
              />
              <Text style={styles.choiceSubtext}>No record kept</Text>
            </View>

            {/* Action 3: Keep it */}
            <Pressable style={styles.keepBtn} onPress={onClose}>
              <Text style={styles.keepBtnText}>Keep it</Text>
            </Pressable>
          </StickerCard>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(62, 42, 30, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    padding: 24,
    alignItems: 'center',
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.ink,
    marginBottom: 16,
  },
  mascotWrap: {
    marginBottom: 14,
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtext: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: '#76665A',
    marginBottom: 24,
  },
  btnWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  choiceSubtext: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
    marginTop: 4,
  },
  keepBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  keepBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 17,
    color: Colors.ink,
  },
});

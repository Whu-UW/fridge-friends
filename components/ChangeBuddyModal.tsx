import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../constants/Theme';
import StickerCard from './ui/StickerCard';
import FoodCharacter from './FoodCharacter';
import { STARTER_BUDDIES, CharacterKey } from '../services/foodCharacterLookup';

interface ChangeBuddyModalProps {
  visible: boolean;
  currentBuddyKey: CharacterKey;
  onSelectBuddy: (buddyKey: CharacterKey, buddyName: string) => void;
  onClose: () => void;
}

export default function ChangeBuddyModal({
  visible,
  currentBuddyKey,
  onSelectBuddy,
  onClose,
}: ChangeBuddyModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <StickerCard backgroundColor={Colors.paper} shadowOffset={6} borderRadius={26} style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Pick your buddy</Text>
              <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.subtitle}>Choose your kitchen companion!</Text>

            <View style={styles.buddiesRow}>
              {STARTER_BUDDIES.map((buddy) => {
                const isSelected = currentBuddyKey === buddy.key;

                return (
                  <Pressable
                    key={buddy.key}
                    style={[styles.buddyCard, isSelected && styles.buddyCardActive]}
                    onPress={() => {
                      onSelectBuddy(buddy.key, buddy.name);
                      onClose();
                    }}
                  >
                    <FoodCharacter foodKey={buddy.key} mood="happy" size={54} animate={false} />
                    <Text style={styles.buddyNameText}>{buddy.name}</Text>
                  </Pressable>
                );
              })}
            </View>
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
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  card: {
    padding: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 18,
    color: Colors.ink,
  },
  subtitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#76665A',
    marginBottom: 16,
  },
  buddiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  buddyCard: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  buddyCardActive: {
    borderColor: Colors.terracotta,
    backgroundColor: '#FDEBD0',
  },
  buddyNameText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: Colors.ink,
  },
});

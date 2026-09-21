import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '../constants/Theme';
import StickerCard from './ui/StickerCard';
import StickerButton from './ui/StickerButton';
import FoodCharacter from './FoodCharacter';

interface FeastFriendRequirementModalProps {
  visible: boolean;
  onClose: () => void;
  onAddFriend?: () => void;
}

export default function FeastFriendRequirementModal({
  visible,
  onClose,
  onAddFriend,
}: FeastFriendRequirementModalProps) {
  const router = useRouter();

  const handleNavigateToAddFriend = () => {
    onClose();
    if (onAddFriend) {
      onAddFriend();
    } else {
      router.push('/(tabs)/social');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.cardContainer}>
          <StickerCard backgroundColor={Colors.paper} shadowOffset={6} borderRadius={26} style={styles.card}>
            {/* Playful Buddy Mascot Pair */}
            <View style={styles.mascotRow}>
              <FoodCharacter foodKey="spinach" mood="happy" size={70} />
              <FoodCharacter foodKey="milk" mood="happy" size={70} />
            </View>

            <Text style={styles.title}>Add a Friend to Feast!</Text>

            <Text style={styles.body}>
              Feast mode brings friends together to pool at-risk groceries and cook collaborative rescue meals.
              Connect with at least 1 friend to start feasting!
            </Text>

            {/* Action Buttons */}
            <View style={styles.buttonStack}>
              <StickerButton
                title="+ Add a Friend"
                onPress={handleNavigateToAddFriend}
                variant="primary"
                size="large"
              />

              <Pressable style={styles.secondaryBtn} onPress={onClose}>
                <Text style={styles.secondaryBtnText}>Maybe Later</Text>
              </Pressable>
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
    backgroundColor: 'rgba(62, 42, 30, 0.45)', // Tinted ink overlay
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
  },
  card: {
    padding: 24,
    alignItems: 'center',
  },
  mascotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: 24,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: '#655142',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonStack: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 16,
    color: Colors.ink,
  },
});

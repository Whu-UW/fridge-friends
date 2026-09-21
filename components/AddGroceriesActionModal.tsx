import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Colors, Fonts, Radius } from '../constants/Theme';
import StickerCard from './ui/StickerCard';

interface AddGroceriesActionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectScanCamera: () => void;
  onSelectUploadPhoto: () => void;
}

export default function AddGroceriesActionModal({
  visible,
  onClose,
  onSelectManual,
  onSelectScanCamera,
  onSelectUploadPhoto,
}: AddGroceriesActionModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <StickerCard backgroundColor={Colors.paper} shadowOffset={6} borderRadius={Radius.modal} style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>Add groceries</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.subtitle}>
              Choose how you'd like to add items to your fridge:
            </Text>

            {/* Option 1: Manually add item */}
            <Pressable
              style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
              onPress={onSelectManual}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#E2F0DC' }]}>
                <Text style={{ fontSize: 24 }}>✏️</Text>
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Manually add item</Text>
                <Text style={styles.optionSubtitle}>Fill in name, price, date bought, and expiration date</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            {/* Option 2: Scan a receipt with camera */}
            <Pressable
              style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
              onPress={onSelectScanCamera}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FDEBD0' }]}>
                <Text style={{ fontSize: 24 }}>📷</Text>
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Scan with camera</Text>
                <Text style={styles.optionSubtitle}>Snap a receipt photo and we’ll read the items off it</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            {/* Option 3: Upload a picture */}
            <Pressable
              style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
              onPress={onSelectUploadPhoto}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#E8E5F8' }]}>
                <Text style={{ fontSize: 24 }}>🖼️</Text>
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Upload a picture</Text>
                <Text style={styles.optionSubtitle}>Pick a receipt photo from your library</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
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
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(44, 34, 30, 0.45)',
  },
  sheetContainer: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  card: {
    padding: 20,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  closeBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: Colors.ink,
  },
  subtitle: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 14,
    color: '#76665A',
    marginBottom: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.ink,
    gap: 14,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  optionCardPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    backgroundColor: Colors.paperMuted,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
  },
  optionSubtitle: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 12,
    color: '#76665A',
    marginTop: 2,
  },
  chevron: {
    fontFamily: Fonts.headingBold,
    fontSize: 22,
    color: Colors.ink,
    opacity: 0.6,
  },
});

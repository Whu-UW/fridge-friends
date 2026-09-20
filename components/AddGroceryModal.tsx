import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Fonts } from '../constants/Theme';
import StickerCard from './ui/StickerCard';
import StickerButton from './ui/StickerButton';
import FoodCharacter from './FoodCharacter';
import CalendarPickerModal from './CalendarPickerModal';
import { lookupFoodCharacter } from '../services/foodCharacterLookup';

interface AddGroceryModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (
    name: string,
    price: number,
    dateBoughtIso: string,
    category: string,
    shelfLifeDays: number,
    dateExpiredIso?: string
  ) => Promise<void>;
}

export default function AddGroceryModal({
  visible,
  onClose,
  onAdd,
}: AddGroceryModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('3.49');
  const [dateBought, setDateBought] = useState(new Date().toISOString().slice(0, 10));
  const [dateExpired, setDateExpired] = useState('');
  const [isCustomExpiry, setIsCustomExpiry] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'bought' | 'expired'>('bought');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live lookup
  const lookup = lookupFoodCharacter(name || 'Spinach');

  // Compute default expiry based on dateBought + shelf life days
  const computedExpiryDate = useMemo(() => {
    try {
      const boughtMs = new Date(dateBought).getTime();
      const expMs = boughtMs + lookup.defaultShelfLifeDays * 864e5;
      return new Date(expMs).toISOString().slice(0, 10);
    } catch {
      return dateBought;
    }
  }, [dateBought, lookup.defaultShelfLifeDays]);

  const effectiveExpiryDate = isCustomExpiry && dateExpired ? dateExpired : computedExpiryDate;

  useEffect(() => {
    if (visible) {
      setName('');
      setPrice('3.49');
      setDateBought(new Date().toISOString().slice(0, 10));
      setDateExpired('');
      setIsCustomExpiry(false);
      setCalendarTarget('bought');
    }
  }, [visible]);

  // Format date display (MM/DD/YYYY)
  const formatDisplayDate = (isoDate: string) => {
    try {
      const [y, m, d] = isoDate.split('-');
      return `${m}/${d}/${y}`;
    } catch {
      return isoDate;
    }
  };

  const handleAddSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Required Field', 'Please enter an ingredient name.');
      return;
    }

    const parsedPrice = parseFloat(price);
    const validPrice = isNaN(parsedPrice) || parsedPrice <= 0 ? 3.49 : parsedPrice;

    setIsSubmitting(true);
    try {
      const fullIsoBoughtDate = new Date(dateBought).toISOString();
      const fullIsoExpiresDate = new Date(effectiveExpiryDate).toISOString();
      const diffDays = Math.max(
        1,
        Math.round((new Date(effectiveExpiryDate).getTime() - new Date(dateBought).getTime()) / 864e5)
      );

      await onAdd(
        trimmed,
        validPrice,
        fullIsoBoughtDate,
        lookup.category,
        diffDays,
        fullIsoExpiresDate
      );
      onClose();
    } catch (err: any) {
      Alert.alert('Unable to Add', 'Could not save ingredient. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <StickerCard backgroundColor={Colors.paper} shadowOffset={6} borderRadius={26} style={styles.card}>
            {/* Header with Close X */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>Add an ingredient</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            {/* Ingredient Name */}
            <Text style={styles.label}>Ingredient name</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Spinach, Milk, Apples..."
                placeholderTextColor={Colors.placeholder}
                value={name}
                onChangeText={setName}
                autoFocus={true}
              />
            </View>

            {/* Price */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Price</Text>
              <View style={[styles.inputWrap, styles.priceRow]}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.textInput, { paddingLeft: 4 }]}
                  placeholder="3.49"
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>

            {/* Date Bought & Date Expired Row */}
            <View style={styles.fieldsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Date bought</Text>
                <Pressable
                  style={[styles.inputWrap, styles.dateButton]}
                  onPress={() => {
                    setCalendarTarget('bought');
                    setIsCalendarVisible(true);
                  }}
                >
                  <Text style={styles.dateText}>{formatDisplayDate(dateBought)}</Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </Pressable>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Date expired</Text>
                <Pressable
                  style={[styles.inputWrap, styles.dateButton]}
                  onPress={() => {
                    setCalendarTarget('expired');
                    setIsCalendarVisible(true);
                  }}
                >
                  <Text style={styles.dateText}>{formatDisplayDate(effectiveExpiryDate)}</Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.dateSubtext}>
              Tap either date to change it on the calendar.
            </Text>

            {/* Live Character Preview Card */}
            <View style={styles.previewCard}>
              <FoodCharacter
                foodKey={lookup.characterKey}
                mood="happy"
                size={56}
                animate={false}
              />
              <View style={styles.previewMeta}>
                <Text style={styles.previewHeading}>Its freshness timer starts today</Text>
                <Text style={styles.previewSub}>We pick a shelf buddy for it.</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {lookup.categoryLabel} · ~{lookup.defaultShelfLifeDays} days
                  </Text>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <View style={styles.btnStack}>
              <StickerButton
                title={isSubmitting ? 'Adding...' : 'Add to shelf'}
                onPress={handleAddSubmit}
                disabled={isSubmitting}
                variant="primary"
                size="large"
              />

              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </StickerCard>
        </View>

        {/* Date Picker Modal */}
        <CalendarPickerModal
          visible={isCalendarVisible}
          selectedDate={calendarTarget === 'bought' ? dateBought : effectiveExpiryDate}
          onSelectDate={(newDate) => {
            if (calendarTarget === 'bought') {
              setDateBought(newDate);
            } else {
              setDateExpired(newDate);
              setIsCustomExpiry(true);
            }
            setIsCalendarVisible(false);
          }}
          onClose={() => setIsCalendarVisible(false)}
        />
      </KeyboardAvoidingView>
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
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 18,
    color: Colors.ink,
  },
  label: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 6,
  },
  inputWrap: {
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
    marginBottom: 12,
  },
  textInput: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.ink,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 17,
    color: Colors.ink,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.ink,
  },
  calendarIcon: {
    fontSize: 16,
  },
  dateSubtext: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#7A6B5F',
    marginTop: -4,
    marginBottom: 16,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F1E4',
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 18,
    padding: 12,
    marginBottom: 20,
    gap: 12,
  },
  previewMeta: {
    flex: 1,
  },
  previewHeading: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  previewSub: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 12,
    color: '#6E5C50',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#EBE0CE',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontFamily: Fonts.headingMedium,
    fontSize: 12,
    color: Colors.ink,
  },
  btnStack: {
    gap: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 16,
    color: Colors.ink,
  },
});

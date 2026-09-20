import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, Radius } from '../constants/Theme';
import StickerCard from './ui/StickerCard';
import StickerButton from './ui/StickerButton';
import FoodCharacter from './FoodCharacter';
import CalendarPickerModal from './CalendarPickerModal';
import {
  isGeminiKeyConfigured,
  scanGroceryReceiptWithGemini,
  scanGroceryReceiptMock,
  ScannedReceiptResult,
  ScannedReceiptItem,
} from '../services/receiptOcrService';
import { lookupFoodCharacter } from '../services/foodCharacterLookup';

interface ScanReceiptModalProps {
  visible: boolean;
  imagePayload?: { base64: string; mimeType: string } | null;
  initialSource?: 'camera' | 'library' | null;
  onClose: () => void;
  onAddItems: (receipt: ScannedReceiptResult) => Promise<void>;
}

export default function ScanReceiptModal({
  visible,
  imagePayload,
  initialSource,
  onClose,
  onAddItems,
}: ScanReceiptModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [tripDate, setTripDate] = useState(new Date().toISOString().slice(0, 10));
  const [calendarTarget, setCalendarTarget] = useState<
    { type: 'trip' } | { type: 'itemExpiry'; index: number } | null
  >(null);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedReceiptItem[]>([]);
  const [rawPrices, setRawPrices] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasTriggeredRef = useRef(false);

  // Trigger scanning with imagePayload or fallback to initial source
  useEffect(() => {
    if (visible) {
      if (imagePayload?.base64 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        processImage(imagePayload.base64, imagePayload.mimeType || 'image/jpeg');
      } else if (initialSource && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        if (initialSource === 'camera') {
          handleTakePhoto();
        } else if (initialSource === 'library') {
          handleUploadPhoto();
        }
      }
    }
    if (!visible) {
      hasTriggeredRef.current = false;
      setIsScanning(false);
      setStatusText('');
      setScannedItems([]);
      setRawPrices({});
      setCalendarTarget(null);
      setIsCalendarVisible(false);
      setTripDate(new Date().toISOString().slice(0, 10));
    }
  }, [visible, imagePayload, initialSource]);

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera Permission Required', 'Camera access is required to take receipt photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        await processImage(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
      } else if (scannedItems.length === 0 && !isScanning) {
        // User backed out of camera without taking a photo
        onClose();
      }
    } catch {
      Alert.alert('Camera Error', 'Could not open camera.');
    }
  };

  const handleUploadPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Gallery Permission Required', 'Gallery access is needed to select receipt photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        await processImage(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
      } else if (scannedItems.length === 0 && !isScanning) {
        // User backed out of gallery without choosing a photo
        onClose();
      }
    } catch {
      Alert.alert('Gallery Error', 'Could not access photo library.');
    }
  };

  const handleDemoPhoto = async () => {
    setIsScanning(true);
    setStatusText('Reading demo receipt...');
    try {
      const mock = await scanGroceryReceiptMock();
      const tripIso = mock.tripDate ? mock.tripDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
      setTripDate(tripIso);
      const itemsWithDates = mock.items.map((it) => {
        const shelfDays = it.shelfLifeDays && it.shelfLifeDays > 0 ? it.shelfLifeDays : 7;
        const boughtMs = new Date(tripIso).getTime();
        const expIso = it.dateExpired || new Date(boughtMs + shelfDays * 864e5).toISOString().slice(0, 10);
        return {
          ...it,
          shelfLifeDays: shelfDays,
          dateExpired: expIso,
        };
      });
      setScannedItems(itemsWithDates);
      const initialRaw: Record<number, string> = {};
      itemsWithDates.forEach((item, i) => {
        initialRaw[i] = item.price > 0 ? item.price.toString() : '';
      });
      setRawPrices(initialRaw);
    } finally {
      setIsScanning(false);
      setStatusText('');
    }
  };

  const processImage = async (base64: string, mimeType: string) => {
    setIsScanning(true);
    setStatusText('Analyzing receipt with Gemini...');
    try {
      let result: ScannedReceiptResult;
      if (isGeminiKeyConfigured()) {
        result = await scanGroceryReceiptWithGemini(base64, mimeType, (msg) => setStatusText(msg));
      } else {
        result = await scanGroceryReceiptMock();
      }
      const tripIso = result.tripDate ? result.tripDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
      setTripDate(tripIso);
      const itemsWithDates = result.items.map((it) => {
        const shelfDays = it.shelfLifeDays && it.shelfLifeDays > 0 ? it.shelfLifeDays : 7;
        const boughtMs = new Date(tripIso).getTime();
        const expIso = it.dateExpired || new Date(boughtMs + shelfDays * 864e5).toISOString().slice(0, 10);
        return {
          ...it,
          shelfLifeDays: shelfDays,
          dateExpired: expIso,
        };
      });
      setScannedItems(itemsWithDates);
      const initialRaw: Record<number, string> = {};
      itemsWithDates.forEach((item, i) => {
        initialRaw[i] = item.price > 0 ? item.price.toString() : '';
      });
      setRawPrices(initialRaw);
    } catch (err: any) {
      Alert.alert('Receipt Scan Notice', 'Gemini encountered a problem parsing the receipt. Loaded demo items to continue.');
      const mock = await scanGroceryReceiptMock();
      const tripIso = mock.tripDate ? mock.tripDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
      setTripDate(tripIso);
      const itemsWithDates = mock.items.map((it) => {
        const shelfDays = it.shelfLifeDays && it.shelfLifeDays > 0 ? it.shelfLifeDays : 7;
        const boughtMs = new Date(tripIso).getTime();
        const expIso = it.dateExpired || new Date(boughtMs + shelfDays * 864e5).toISOString().slice(0, 10);
        return {
          ...it,
          shelfLifeDays: shelfDays,
          dateExpired: expIso,
        };
      });
      setScannedItems(itemsWithDates);
      const initialRaw: Record<number, string> = {};
      itemsWithDates.forEach((item, i) => {
        initialRaw[i] = item.price > 0 ? item.price.toString() : '';
      });
      setRawPrices(initialRaw);
    } finally {
      setIsScanning(false);
      setStatusText('');
    }
  };

  // Editable fields handlers
  const handleUpdateItemName = (index: number, newName: string) => {
    setScannedItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        name: newName,
      };
      return updated;
    });
  };

  const handleUpdateItemPrice = (index: number, newPriceStr: string) => {
    setRawPrices((prev) => ({ ...prev, [index]: newPriceStr }));
    const parsed = parseFloat(newPriceStr);
    setScannedItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        price: isNaN(parsed) ? 0 : parsed,
      };
      return updated;
    });
  };

  const handleUpdateItemExpiry = (index: number, newDate: string) => {
    setScannedItems((prev) => {
      const updated = [...prev];
      const boughtMs = new Date(tripDate).getTime();
      const expMs = new Date(newDate).getTime();
      const diffDays = Math.max(1, Math.round((expMs - boughtMs) / 864e5));
      updated[index] = {
        ...updated[index],
        dateExpired: newDate,
        shelfLifeDays: diffDays,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, idx) => idx !== index));
    setRawPrices((prev) => {
      const updated: Record<number, string> = {};
      let nextI = 0;
      Object.keys(prev)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((i) => {
          if (i !== index) {
            updated[nextI] = prev[i];
            nextI++;
          }
        });
      return updated;
    });
  };

  const handleAddNewItem = () => {
    const nextIdx = scannedItems.length;
    const boughtMs = new Date(tripDate).getTime();
    const defaultExp = new Date(boughtMs + 7 * 864e5).toISOString().slice(0, 10);
    setScannedItems((prev) => [
      ...prev,
      {
        name: '',
        price: 0,
        category: 'Produce',
        shelfLifeDays: 7,
        dateExpired: defaultExp,
      },
    ]);
    setRawPrices((prev) => ({ ...prev, [nextIdx]: '' }));
  };

  const handleClose = () => {
    setScannedItems([]);
    setRawPrices({});
    setCalendarTarget(null);
    setIsCalendarVisible(false);
    setStatusText('');
    onClose();
  };

  const calculatedTotal = useMemo(() => {
    return scannedItems.reduce((sum, item, idx) => {
      const raw = rawPrices[idx];
      const parsed = raw !== undefined && raw !== '' ? parseFloat(raw) : item.price;
      return sum + (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0 ? parsed : 0);
    }, 0);
  }, [scannedItems, rawPrices]);

  const handleAddAllToShelf = async () => {
    if (scannedItems.length === 0) {
      Alert.alert('No Items', 'Please add at least one item.');
      return;
    }

    const boughtMs = new Date(tripDate).getTime();
    const cleanedItems = scannedItems
      .filter((item) => item.name.trim().length > 0)
      .map((item, idx) => {
        const raw = rawPrices[idx];
        const parsed = raw !== undefined && raw !== '' ? parseFloat(raw) : item.price;
        const lookup = lookupFoodCharacter(item.name.trim());
        const expDate = item.dateExpired || new Date(boughtMs + (item.shelfLifeDays || 7) * 864e5).toISOString().slice(0, 10);
        const expMs = new Date(expDate).getTime();
        const shelfLifeDays = Math.max(1, Math.round((expMs - boughtMs) / 864e5));

        return {
          ...item,
          name: item.name.trim(),
          price: typeof parsed === 'number' && !isNaN(parsed) && parsed >= 0 ? parsed : 0,
          category: lookup.category || item.category || 'Produce',
          shelfLifeDays,
          dateExpired: expDate,
        };
      });

    if (cleanedItems.length === 0) {
      Alert.alert('Incomplete Items', 'Please ensure at least one item has a valid name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const receiptResult: ScannedReceiptResult = {
        storeName: 'Grocery Store',
        tripDate: new Date(tripDate).toISOString(),
        totalCost: calculatedTotal,
        items: cleanedItems,
      };
      await onAddItems(receiptResult);
      handleClose();
    } catch {
      Alert.alert('Save Failed', 'Could not save items to the shelf. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayDate = (isoDate: string) => {
    try {
      const [y, m, d] = isoDate.split('-');
      return `${m}/${d}/${y}`;
    } catch {
      return isoDate;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header with Back Arrow */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={10} style={styles.backBtn}>
            <Text style={styles.backBtnArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Scan a receipt</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Loading View while scanning */}
          {isScanning ? (
            <View style={styles.loadingBox}>
              <FoodCharacter foodKey="can" mood="happy" size={80} animate={true} />
              <ActivityIndicator color={Colors.terracotta} size="large" style={{ marginTop: 20 }} />
              <Text style={styles.loadingHeading}>Reading your receipt</Text>
              <Text style={styles.loadingStatusText}>
                {statusText || 'Extracting items and prices with Gemini AI...'}
              </Text>
            </View>
          ) : scannedItems.length === 0 ? (
            /* Snap / Upload Choice Screen if no items yet */
            <View style={styles.dashedBox}>
              <View style={styles.receiptIconCircle}>
                <Text style={{ fontSize: 28 }}>🧾</Text>
              </View>
              <Text style={styles.snapTitle}>Snap or upload receipt</Text>
              <Text style={styles.snapSubtitle}>
                We'll extract all items, prices, and expiration dates for you.
              </Text>

              <View style={{ width: '100%', marginTop: 18, gap: 12 }}>
                <StickerButton
                  title="Scan with camera"
                  onPress={handleTakePhoto}
                  variant="primary"
                  size="large"
                  icon={<Text style={{ fontSize: 20 }}>📷</Text>}
                />

                <StickerButton
                  title="Upload a picture"
                  onPress={handleUploadPhoto}
                  variant="secondary"
                  size="large"
                  icon={<Text style={{ fontSize: 20 }}>🖼️</Text>}
                />
              </View>

              <Pressable onPress={handleDemoPhoto} style={styles.demoLink}>
                <Text style={styles.demoLinkText}>Or load demo receipt</Text>
              </Pressable>
            </View>
          ) : (
            /* Populated and Editable Results Section */
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeaderRow}>
                <View>
                  <Text style={styles.resultsHeading}>Found on receipt</Text>
                  <Text style={styles.resultsSub}>Review and edit any fields before saving</Text>
                </View>
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>
                    ${calculatedTotal.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Date bought card (Store removed) */}
              <StickerCard backgroundColor={Colors.paper} borderRadius={18} style={styles.metaCard}>
                <Text style={styles.metaLabel}>Date bought</Text>
                <Pressable
                  style={styles.datePickerBtn}
                  onPress={() => {
                    setCalendarTarget({ type: 'trip' });
                    setIsCalendarVisible(true);
                  }}
                >
                  <Text style={styles.datePickerText}>{formatDisplayDate(tripDate)}</Text>
                  <Text style={{ fontSize: 16 }}>📅</Text>
                </Pressable>
              </StickerCard>

              {/* Editable Scanned Items List */}
              <View style={styles.itemsListContainer}>
                {scannedItems.map((item, idx) => {
                  const lookup = lookupFoodCharacter(item.name || 'Spinach');

                  return (
                    <StickerCard
                      key={idx}
                      backgroundColor={Colors.paper}
                      borderRadius={18}
                      style={styles.itemEditCard}
                    >
                      <View style={styles.itemCardTop}>
                        {/* Food character mascot preview */}
                        <FoodCharacter
                          foodKey={lookup.characterKey}
                          mood="happy"
                          size={46}
                          animate={false}
                        />

                        {/* Editable Name & Price */}
                        <View style={styles.itemInputsCol}>
                          <TextInput
                            style={styles.itemNameInput}
                            value={item.name}
                            onChangeText={(text) => handleUpdateItemName(idx, text)}
                            placeholder="Item name (e.g. Milk)"
                            placeholderTextColor={Colors.placeholder}
                          />

                          <View style={styles.itemPriceRow}>
                            <Text style={styles.currencyPrefix}>$</Text>
                            <TextInput
                              style={styles.itemPriceInput}
                              value={rawPrices[idx] !== undefined ? rawPrices[idx] : (item.price > 0 ? item.price.toString() : '')}
                              onChangeText={(text) => handleUpdateItemPrice(idx, text)}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                              placeholderTextColor={Colors.placeholder}
                            />
                          </View>
                        </View>

                        {/* Delete item button */}
                        <Pressable
                          style={styles.deleteBtn}
                          onPress={() => handleRemoveItem(idx)}
                          hitSlop={8}
                        >
                          <Text style={styles.deleteBtnText}>✕</Text>
                        </Pressable>
                      </View>

                      {/* Date expired field (Categories removed) */}
                      <View style={styles.itemExpiryRow}>
                        <Text style={styles.itemExpiryLabel}>Date expired</Text>
                        <Pressable
                          style={styles.itemExpiryBtn}
                          onPress={() => {
                            setCalendarTarget({ type: 'itemExpiry', index: idx });
                            setIsCalendarVisible(true);
                          }}
                        >
                          <Text
                            style={[
                              styles.itemExpiryText,
                              !item.dateExpired && styles.placeholderText,
                            ]}
                          >
                            {item.dateExpired ? formatDisplayDate(item.dateExpired) : 'Select date'}
                          </Text>
                          <Text style={styles.calendarIconSmall}>📅</Text>
                        </Pressable>
                      </View>
                    </StickerCard>
                  );
                })}
              </View>

              {/* Add another item manually button */}
              <Pressable style={styles.addItemBtn} onPress={handleAddNewItem}>
                <Text style={styles.addItemBtnText}>+ Add another item</Text>
              </Pressable>

              {/* Re-scan or change photo options */}
              <View style={styles.rescanRow}>
                <Pressable onPress={handleTakePhoto} style={styles.rescanLink}>
                  <Text style={styles.rescanLinkText}>📷 Retake photo</Text>
                </Pressable>
                <Text style={styles.rescanDivider}>•</Text>
                <Pressable onPress={handleUploadPhoto} style={styles.rescanLink}>
                  <Text style={styles.rescanLinkText}>🖼️ Choose another</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTA to Save to Shelf & Backend */}
        {scannedItems.length > 0 && !isScanning && (
          <View style={styles.bottomBar}>
            <StickerButton
              title={isSubmitting ? 'Saving to shelf...' : `Save ${scannedItems.length} items to shelf`}
              onPress={handleAddAllToShelf}
              disabled={isSubmitting}
              variant="primary"
              size="large"
            />
          </View>
        )}

        {/* Date picker modal for receipt purchase date */}
        {/* Date picker modal for receipt purchase date or item expiration */}
        <CalendarPickerModal
          visible={isCalendarVisible}
          selectedDate={
            calendarTarget?.type === 'trip'
              ? tripDate
              : (calendarTarget?.type === 'itemExpiry' && scannedItems[calendarTarget.index]?.dateExpired)
                || tripDate
          }
          onSelectDate={(date) => {
            if (calendarTarget?.type === 'trip') {
              setTripDate(date);
            } else if (calendarTarget?.type === 'itemExpiry') {
              handleUpdateItemExpiry(calendarTarget.index, date);
            }
            setIsCalendarVisible(false);
            setCalendarTarget(null);
          }}
          onClose={() => {
            setIsCalendarVisible(false);
            setCalendarTarget(null);
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
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
  headerTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 24,
    color: Colors.ink,
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  loadingBox: {
    borderWidth: 2.5,
    borderColor: Colors.ink,
    borderRadius: 24,
    backgroundColor: Colors.paper,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  loadingHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: Colors.ink,
    marginTop: 14,
  },
  loadingStatusText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 14,
    color: '#76665A',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  dashedBox: {
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: Colors.ink,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 253, 247, 0.7)',
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  receiptIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.fresh.bg,
    borderWidth: 2,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  snapTitle: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: Colors.ink,
    marginBottom: 4,
  },
  snapSubtitle: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 14,
    color: '#76665A',
    textAlign: 'center',
    lineHeight: 20,
  },
  demoLink: {
    marginTop: 16,
    padding: 8,
  },
  demoLinkText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 14,
    color: Colors.terracotta,
    textDecorationLine: 'underline',
  },
  resultsSection: {
    marginTop: 8,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: Colors.ink,
  },
  resultsSub: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 12,
    color: '#76665A',
    marginTop: 2,
  },
  badgeWrap: {
    backgroundColor: Colors.terracotta,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  badgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  metaCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metaLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 15,
    color: Colors.ink,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FBF8F1',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  datePickerText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  itemsListContainer: {
    gap: 10,
  },
  itemEditCard: {
    padding: 12,
    gap: 10,
  },
  itemCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemInputsCol: {
    flex: 1,
    gap: 4,
  },
  itemNameInput: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 15,
    color: Colors.ink,
    backgroundColor: '#FBF8F1',
    borderWidth: 1.5,
    borderColor: '#E2D5C3',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF8F1',
    borderWidth: 1.5,
    borderColor: '#E2D5C3',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    width: 100,
  },
  currencyPrefix: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: Colors.ink,
    marginRight: 2,
  },
  itemPriceInput: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: Colors.ink,
    paddingVertical: 2,
    flex: 1,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDECE8',
    borderWidth: 1.5,
    borderColor: Colors.terracotta,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 12,
    color: Colors.terracotta,
  },
  itemExpiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0E6D8',
  },
  itemExpiryLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: Colors.ink,
  },
  itemExpiryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FBF8F1',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  itemExpiryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.ink,
  },
  calendarIconSmall: {
    fontSize: 13,
  },
  placeholderText: {
    color: Colors.placeholder,
    fontFamily: Fonts.bodyRegular,
  },
  addItemBtn: {
    marginTop: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.ink,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 247, 0.7)',
  },
  addItemBtnText: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: Colors.ink,
  },
  rescanRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  rescanLink: {
    padding: 6,
  },
  rescanLinkText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 13,
    color: Colors.terracotta,
  },
  rescanDivider: {
    color: '#8A776A',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(251, 243, 228, 0.96)',
    borderTopWidth: 2,
    borderTopColor: '#E6D7C3',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
});

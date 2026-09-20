import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts } from '../constants/Theme';
import StickerCard from './ui/StickerCard';
import StickerButton from './ui/StickerButton';
import FoodCharacter from './FoodCharacter';
import {
  isGeminiKeyConfigured,
  scanGroceryReceiptWithGemini,
  scanGroceryReceiptMock,
  ScannedReceiptResult,
  ScannedReceiptItem,
} from '../services/receiptOcrService';
import { lookupFoodCharacter, FoodCategory } from '../services/foodCharacterLookup';

interface ScanReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  onAddItems: (receipt: ScannedReceiptResult) => Promise<void>;
}

export default function ScanReceiptModal({
  visible,
  onClose,
  onAddItems,
}: ScanReceiptModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedReceiptItem[]>([]);
  const [tripDate, setTripDate] = useState(new Date().toISOString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera Permission', 'Camera access is required to take receipt photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      await processImage(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
    }
  };

  const handleUploadPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Gallery Permission', 'Gallery access is needed to select receipt photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      await processImage(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
    }
  };

  const handleDemoPhoto = async () => {
    setIsScanning(true);
    setStatusText('Reading demo receipt...');
    try {
      const mock = await scanGroceryReceiptMock();
      setScannedItems(mock.items);
      setTripDate(mock.tripDate);
    } finally {
      setIsScanning(false);
      setStatusText('');
    }
  };

  const processImage = async (base64: string, mimeType: string) => {
    setIsScanning(true);
    setStatusText('Reading items and prices...');
    try {
      if (isGeminiKeyConfigured()) {
        const result = await scanGroceryReceiptWithGemini(base64, mimeType, (msg) => setStatusText(msg));
        setScannedItems(result.items);
        setTripDate(result.tripDate);
      } else {
        const mock = await scanGroceryReceiptMock();
        setScannedItems(mock.items);
        setTripDate(mock.tripDate);
      }
    } catch (err: any) {
      Alert.alert('Receipt Scan Failed', 'Could not parse the receipt image. Using demo items instead.');
      const mock = await scanGroceryReceiptMock();
      setScannedItems(mock.items);
      setTripDate(mock.tripDate);
    } finally {
      setIsScanning(false);
      setStatusText('');
    }
  };

  // Cycle category chip
  const handleCycleCategory = (index: number) => {
    setScannedItems((prev) => {
      const updated = [...prev];
      const current = updated[index].category.toLowerCase();
      let nextCat = 'Gradual';
      let shelfLife = 7;

      if (current.includes('gradual') || current.includes('produce')) {
        nextCat = 'Hard expiry';
        shelfLife = 10;
      } else if (current.includes('hard') || current.includes('dairy') || current.includes('meat')) {
        nextCat = 'Shelf-stable';
        shelfLife = 365;
      } else {
        nextCat = 'Gradual';
        shelfLife = 7;
      }

      updated[index] = {
        ...updated[index],
        category: nextCat,
        shelfLifeDays: shelfLife,
      };
      return updated;
    });
  };

  const handleClose = () => {
    setScannedItems([]);
    setStatusText('');
    onClose();
  };

  useEffect(() => {
    if (!visible) {
      setScannedItems([]);
      setStatusText('');
    }
  }, [visible]);

  const handleAddAllToShelf = async () => {
    if (scannedItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const totalCost = scannedItems.reduce((sum, item) => sum + item.price, 0);
      const receiptResult: ScannedReceiptResult = {
        storeName: 'Grocery Store',
        tripDate,
        totalCost,
        items: scannedItems,
      };
      await onAddItems(receiptResult);
      setScannedItems([]);
      setStatusText('');
      onClose();
    } catch {
      Alert.alert('Save Failed', 'Could not add items to your shelf.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dateFormatted = new Date(tripDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header with Back Arrow */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={10} style={styles.backBtn}>
            <Text style={styles.backBtnArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Scan a receipt</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Snap your receipt dashed box */}
          <View style={styles.dashedBox}>
            <View style={styles.receiptIconCircle}>
              <Text style={{ fontSize: 24 }}>🧾</Text>
            </View>
            <Text style={styles.snapTitle}>Snap your receipt</Text>
            <Text style={styles.snapSubtitle}>We read the items, prices, and dates for you.</Text>

            <View style={{ width: '100%', marginTop: 14, gap: 10 }}>
              <StickerButton
                title={isScanning ? statusText || 'Analyzing...' : 'Take photo'}
                onPress={handleTakePhoto}
                disabled={isScanning}
                variant="primary"
                size="large"
                icon={<Text style={{ fontSize: 20 }}>📷</Text>}
              />

              <StickerButton
                title="Upload photo"
                onPress={handleUploadPhoto}
                disabled={isScanning}
                variant="secondary"
                size="large"
                icon={<Text style={{ fontSize: 20 }}>🖼️</Text>}
              />
            </View>

            {/* Test demo receipt link */}
            <Pressable onPress={handleDemoPhoto} style={styles.demoLink}>
              <Text style={styles.demoLinkText}>Or load demo receipt</Text>
            </Pressable>
          </View>

          {isScanning && (
            <View style={styles.scanningIndicator}>
              <ActivityIndicator color={Colors.terracotta} size="large" />
              <Text style={styles.scanningText}>{statusText || 'Analyzing receipt...'}</Text>
            </View>
          )}

          {/* Found on your receipt section */}
          {scannedItems.length > 0 && !isScanning && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeaderRow}>
                <Text style={styles.resultsHeading}>Found on your receipt</Text>
                <Text style={styles.resultsMeta}>
                  {scannedItems.length} items · {dateFormatted}
                </Text>
              </View>

              <StickerCard backgroundColor={Colors.paper} borderRadius={22} style={styles.itemsCard}>
                {scannedItems.map((item, idx) => {
                  const lookup = lookupFoodCharacter(item.name);
                  const isLast = idx === scannedItems.length - 1;

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.itemRow,
                        !isLast && styles.itemRowBorder,
                      ]}
                    >
                      <FoodCharacter
                        foodKey={lookup.characterKey}
                        mood="happy"
                        size={52}
                        animate={false}
                      />

                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>
                          {item.name} · ${item.price.toFixed(2)}
                        </Text>

                        {/* Interactive Category Chip Dropdown */}
                        <Pressable
                          style={styles.categoryChip}
                          onPress={() => handleCycleCategory(idx)}
                        >
                          <Text style={styles.categoryChipText}>
                            {item.category || lookup.categoryLabel} · ~{item.shelfLifeDays || lookup.defaultShelfLifeDays} days ▾
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </StickerCard>

              <Text style={styles.categorySubtext}>Not right? Tap a category to change it.</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTA Button */}
        {scannedItems.length > 0 && !isScanning && (
          <View style={styles.bottomBar}>
            <StickerButton
              title={isSubmitting ? 'Adding...' : `Add ${scannedItems.length} items to shelf`}
              onPress={handleAddAllToShelf}
              disabled={isSubmitting}
              variant="primary"
              size="large"
            />
          </View>
        )}
      </View>
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
    paddingBottom: 100,
  },
  dashedBox: {
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: Colors.ink,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 253, 247, 0.7)',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  receiptIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F7E2A9',
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
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#6E5C50',
    textAlign: 'center',
  },
  demoLink: {
    marginTop: 10,
    paddingVertical: 4,
  },
  demoLinkText: {
    fontFamily: Fonts.headingMedium,
    fontSize: 14,
    color: Colors.terracotta,
    textDecorationLine: 'underline',
  },
  scanningIndicator: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  scanningText: {
    fontFamily: Fonts.headingMedium,
    fontSize: 16,
    color: Colors.ink,
  },
  resultsSection: {
    marginBottom: 20,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  resultsHeading: {
    fontFamily: Fonts.headingBold,
    fontSize: 20,
    color: Colors.ink,
  },
  resultsMeta: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#76665A',
  },
  itemsCard: {
    padding: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#EBE0CE',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: Fonts.headingBold,
    fontSize: 16,
    color: Colors.ink,
    marginBottom: 6,
  },
  categoryChip: {
    backgroundColor: '#EBE0CE',
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 14,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  categoryChipText: {
    fontFamily: Fonts.headingMedium,
    fontSize: 12,
    color: Colors.ink,
  },
  categorySubtext: {
    fontFamily: Fonts.bodyRegular,
    fontSize: 13,
    color: '#76665A',
    textAlign: 'center',
    marginTop: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
});

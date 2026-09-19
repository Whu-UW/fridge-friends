import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { ShoppingTripRow, FridgeItemRow } from '../../services/supabase/types';

export default function InsightsScreen() {
  const { shoppingTrips, fridgeItems, recipes } = useApp();

  const [selectedTrip, setSelectedTrip] = useState<ShoppingTripRow | null>(null);

  // Financial aggregate calculations
  const totalSpent = shoppingTrips.reduce((sum, trip) => sum + trip.total_cost, 0);
  const avgTripCost = shoppingTrips.length > 0 ? totalSpent / shoppingTrips.length : 0;
  const totalItemsCount = shoppingTrips.reduce((sum, trip) => sum + trip.item_count, 0);

  // Waste money saved from recipes
  const totalDollarsSaved = recipes.reduce(
    (sum, r) => sum + r.projectedImpact.dollarsSaved,
    0
  );

  const maxTripCost = Math.max(...shoppingTrips.map((t) => t.total_cost), 80);

  // Find items belonging to selected trip
  const tripItems: FridgeItemRow[] = selectedTrip
    ? fridgeItems.filter((i) => i.shopping_trip_id === selectedTrip.id)
    : [];

  const renderTripCard = ({ item }: { item: ShoppingTripRow }) => {
    const tripDateFormatted = new Date(item.trip_date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const barWidthPercent = Math.min(
      Math.round((item.total_cost / maxTripCost) * 100),
      100
    );

    return (
      <Pressable style={styles.tripCard} onPress={() => setSelectedTrip(item)}>
        <View style={styles.tripCardHeader}>
          <View>
            <Text style={styles.storeName}>{item.store_name}</Text>
            <Text style={styles.tripDate}>📅 {tripDateFormatted}</Text>
          </View>
          <View style={styles.costBadge}>
            <Text style={styles.costAmount}>${item.total_cost.toFixed(2)}</Text>
            <Text style={styles.itemCountText}>{item.item_count} items</Text>
          </View>
        </View>

        {/* Visual Budget Time-Trend Bar */}
        <View style={styles.barContainer}>
          <View
            style={[
              styles.barFill,
              { width: `${barWidthPercent}%` },
              item.total_cost > 50 ? styles.barHigh : styles.barNormal,
            ]}
          />
        </View>

        <Text style={styles.viewReceiptHint}>Tap to view itemized breakdown →</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Budget Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Budget Monitoring</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${totalSpent.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Spend</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${avgTripCost.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Avg / Trip</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#059669' }]}>
              ${totalDollarsSaved.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Food Rescued</Text>
          </View>
        </View>
      </View>

      {/* Shopping Trip Cost Time Trend */}
      <View style={styles.trendSection}>
        <View style={styles.trendHeaderRow}>
          <Text style={styles.trendHeading}>Shopping Trip Cost Trend</Text>
          <Text style={styles.trendSub}>
            {shoppingTrips.length} receipts tracked
          </Text>
        </View>

        <FlatList
          data={shoppingTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Shopping Trips Yet</Text>
              <Text style={styles.emptySub}>
                Scan your first grocery receipt in My Fridge to start tracking
                your budget trend!
              </Text>
            </View>
          }
        />
      </View>

      {/* Itemized Trip Breakdown Modal */}
      <Modal visible={Boolean(selectedTrip)} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🧾 Receipt Breakdown</Text>
            {selectedTrip && (
              <>
                <Text style={styles.modalStore}>{selectedTrip.store_name}</Text>
                <Text style={styles.modalDate}>
                  Trip Date: {new Date(selectedTrip.trip_date).toLocaleDateString()} • Total: ${selectedTrip.total_cost.toFixed(2)}
                </Text>

                <View style={styles.modalDivider} />

                <ScrollView style={styles.itemScroll}>
                  {tripItems.length > 0 ? (
                    tripItems.map((it) => (
                      <View key={it.id} style={styles.modalItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modalItemName}>{it.name}</Text>
                          <Text style={styles.modalItemMeta}>
                            {it.category} • {it.quantity}
                          </Text>
                        </View>
                        <Text style={styles.modalItemPrice}>
                          ${it.price.toFixed(2)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noItemsNotice}>
                      Simulated item breakdown: {selectedTrip.item_count} items purchased.
                    </Text>
                  )}
                </ScrollView>
              </>
            )}

            <Pressable
              style={styles.closeBtn}
              onPress={() => setSelectedTrip(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 14,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  trendSection: {
    flex: 1,
  },
  trendHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  trendHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  trendSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  listContent: {
    paddingBottom: 24,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 10,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  tripDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  costBadge: {
    alignItems: 'flex-end',
  },
  costAmount: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  itemCountText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  barContainer: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barNormal: {
    backgroundColor: '#3B82F6',
  },
  barHigh: {
    backgroundColor: '#F59E0B',
  },
  viewReceiptHint: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalStore: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 4,
  },
  modalDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  itemScroll: {
    maxHeight: 250,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalItemMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  noItemsNotice: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  closeBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 14,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

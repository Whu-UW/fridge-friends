import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, Recipe } from '../../context/AppContext';

export default function ImpactStatsScreen() {
  const router = useRouter();
  const { recipes } = useApp();

  // Aggregate stats across all generated and past meals
  const totalItemsDiverted = recipes.reduce(
    (sum, r) => sum + r.ingredients.length,
    0
  );

  const totalGramsRescued = recipes.reduce(
    (sum, r) => sum + r.projectedImpact.foodRescuedGrams,
    0
  );

  const totalDollarsSaved = recipes.reduce(
    (sum, r) => sum + r.projectedImpact.dollarsSaved,
    0
  );

  const renderPastMeal = ({ item }: { item: Recipe }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

    return (
      <Pressable
        style={styles.mealCard}
        onPress={() =>
          router.push({
            pathname: '/recipe/[id]',
            params: { id: item.id },
          })
        }>
        <View style={styles.mealHeader}>
          <Text style={styles.mealTitle}>{item.title}</Text>
          <Text style={styles.mealDate}>{formattedDate}</Text>
        </View>

        <View style={styles.mealStatsRow}>
          <Text style={styles.mealStatBadge}>
            🥗 {item.ingredients.length} items saved
          </Text>
          <Text style={styles.mealStatBadge}>
            💵 ${item.projectedImpact.dollarsSaved.toFixed(2)} saved
          </Text>
          <Text style={styles.mealStatBadge}>
            👥 {item.rsvps.length} attendees
          </Text>
        </View>

        <Text style={styles.viewPlanText}>Tap to view recipe breakdown →</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Overview Stat Cards */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionHeading}>Circle Impact Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalItemsDiverted}</Text>
            <Text style={styles.statLabel}>Items Rescued</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              ${totalDollarsSaved.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Money Saved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {(totalGramsRescued / 1000).toFixed(1)}kg
            </Text>
            <Text style={styles.statLabel}>Food Diverted</Text>
          </View>
        </View>
      </View>

      {/* History of Potluck Meals */}
      <View style={styles.historySection}>
        <Text style={styles.sectionHeading}>
          Potluck Meals ({recipes.length})
        </Text>
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderPastMeal}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No potluck meals recorded yet.</Text>
              <Text style={styles.emptySubtext}>
                Go to Circle Feed and match a potluck dinner to record impact!
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  historySection: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  mealDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  mealStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  mealStatBadge: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  viewPlanText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
});

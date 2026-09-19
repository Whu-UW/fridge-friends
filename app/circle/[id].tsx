import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { FridgeItemRow } from '../../services/supabase/types';

export default function CircleHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { circles, currentUser, getCircleExpiringItems, generateCircleMealRecipe } = useApp();

  const [isGenerating, setIsGenerating] = useState(false);

  const circle = circles.find((c) => c.id === id);
  const expiringItems = id ? getCircleExpiringItems(id, 72) : [];

  if (!circle) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Circle Not Found</Text>
        <Text style={styles.errorSub}>Circle ID: {id}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleGenerateMeal = async () => {
    setIsGenerating(true);
    try {
      const recipeId = await generateCircleMealRecipe(circle.id);
      router.push({
        pathname: '/recipe/[id]',
        params: { id: recipeId },
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to generate circle meal.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderExpiringItem = ({ item }: { item: FridgeItemRow }) => {
    const hoursLeft = Math.round(
      (new Date(item.expires_at).getTime() - Date.now()) / 36e5
    );
    const owner = circle.members.find((m) => m.id === item.user_id);
    const isCurrentUser = item.user_id === currentUser.id;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            Quantity: {item.quantity} • {item.category}
          </Text>
          <View style={styles.ownerRow}>
            <Text style={styles.ownerText}>
              Owner: {isCurrentUser ? 'You' : owner?.display_name || 'Member'}
            </Text>
          </View>
        </View>

        <Text style={styles.hoursBadge}>{hoursLeft}h left</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Circle Header */}
      <View style={styles.headerCard}>
        <Text style={styles.circleName}>🥘 {circle.name}</Text>
        <Text style={styles.membersRoster}>
          Members: {circle.members.map((m) => m.display_name).join(' • ')}
        </Text>
      </View>

      {/* Info Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>
          Pooling Near-Expiration Food (&lt; 72 Hours)
        </Text>
        <Text style={styles.bannerSub}>
          The LLM will craft a collective recipe assigning ingredients and cooking
          steps among circle members.
        </Text>
      </View>

      {/* Items List */}
      <FlatList
        data={expiringItems}
        keyExtractor={(item) => item.id}
        renderItem={renderExpiringItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Expiring Items</Text>
            <Text style={styles.emptySub}>
              Members of this circle have no items expiring soon! You can still
              generate a meal using fresh pantry ingredients.
            </Text>
          </View>
        }
      />

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.generateBtn}
          onPress={handleGenerateMeal}
          disabled={isGenerating}>
          {isGenerating ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.generateBtnText}>
              ✨ Generate Circle Meal with LLM ({expiringItems.length} items)
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  circleName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  membersRoster: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  banner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  bannerSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  listContent: {
    padding: 14,
    paddingBottom: 24,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  itemMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  ownerRow: {
    marginTop: 4,
  },
  ownerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  hoursBadge: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  generateBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  errorSub: {
    fontSize: 13,
    color: '#6B7280',
    marginVertical: 8,
  },
  backBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

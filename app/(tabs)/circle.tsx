import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp, FridgeItem } from '../../context/AppContext';

export default function CircleFeedScreen() {
  const router = useRouter();
  const { currentUser, circleMembers, getCircleExpiringItems, generatePotluckDinner } = useApp();

  const expiringItems = getCircleExpiringItems(72);

  const handleMatchDinner = () => {
    const recipeId = generatePotluckDinner();
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipeId },
    });
  };

  const renderItem = ({ item }: { item: FridgeItem }) => {
    const hoursLeft = Math.round(
      (new Date(item.expiresAt).getTime() - Date.now()) / 36e5
    );
    const isCurrentUser = item.ownerId === currentUser.id;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.hoursBadge}>{hoursLeft}h left</Text>
        </View>

        <Text style={styles.itemDetails}>
          Quantity: {item.quantity} • Category: {item.category}
        </Text>

        <View style={styles.ownerRow}>
          <Text style={styles.ownerLabel}>Owner:</Text>
          <View
            style={[
              styles.ownerBadge,
              isCurrentUser ? styles.ownerYou : styles.ownerPeer,
            ]}>
            <Text
              style={[
                styles.ownerBadgeText,
                isCurrentUser ? styles.ownerYouText : styles.ownerPeerText,
              ]}>
              {isCurrentUser ? `${item.ownerName} (You)` : item.ownerName}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Circle Members Bar */}
      <View style={styles.circleBar}>
        <Text style={styles.circleBarTitle}>Your Circle:</Text>
        <View style={styles.membersList}>
          {circleMembers.map((member) => (
            <View key={member.id} style={styles.memberChip}>
              <Text style={styles.memberChipText}>
                {member.name} {member.id === currentUser.id ? '(You)' : ''}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Intro Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>⚠️ Expiring in &lt; 72 Hours</Text>
        <Text style={styles.bannerSubtitle}>
          These items across your circle will go to waste unless used soon.
        </Text>
      </View>

      {/* Feed List */}
      <FlatList
        data={expiringItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No items expiring soon! 🎉</Text>
            <Text style={styles.emptySubtitle}>
              Everyone in the circle has fresh food. Check back later or add items
              in the My Fridge tab.
            </Text>
          </View>
        }
      />

      {/* Bottom Action Button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[
            styles.matchButton,
            expiringItems.length === 0 && styles.matchButtonDisabled,
          ]}
          onPress={handleMatchDinner}>
          <Text style={styles.matchButtonText}>
            🍲 Match Potluck Dinner ({expiringItems.length} ingredients)
          </Text>
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
  circleBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  circleBarTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  memberChipText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  banner: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#B45309',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  hoursBadge: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  itemDetails: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  ownerLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  ownerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ownerYou: {
    backgroundColor: '#DCFCE7',
  },
  ownerYouText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
  },
  ownerPeer: {
    backgroundColor: '#F3E8FF',
  },
  ownerPeerText: {
    color: '#6B21A8',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  matchButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  matchButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  matchButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

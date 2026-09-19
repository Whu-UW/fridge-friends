import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { ProfileRow, CircleComposite } from '../../services/supabase/types';

export default function SocialScreen() {
  const router = useRouter();
  const {
    friends,
    followingFriendIds,
    toggleFollowFriend,
    circles,
    createCircle,
    getFriendFridgeItems,
    getCircleExpiringItems,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'friends' | 'circles'>('friends');

  // Create Circle Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [circleName, setCircleName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const handleToggleSelectFriend = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreateCircle = () => {
    const trimmed = circleName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a circle name.');
      return;
    }
    if (selectedFriendIds.length === 0) {
      Alert.alert('Error', 'Please select at least one friend to join your circle.');
      return;
    }

    createCircle(trimmed, selectedFriendIds);
    setCircleName('');
    setSelectedFriendIds([]);
    setIsModalVisible(false);
    Alert.alert('Circle Created', `"${trimmed}" is ready for meal planning!`);
  };

  const renderFriendCard = ({ item }: { item: ProfileRow }) => {
    const isFollowing = followingFriendIds.includes(item.id);
    const friendItems = getFriendFridgeItems(item.id);
    const expiringCount = friendItems.filter((i) => {
      const hours = (new Date(i.expires_at).getTime() - Date.now()) / 36e5;
      return hours > 0 && hours <= 72;
    }).length;

    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.display_name.charAt(0)}</Text>
          </View>
          <View style={styles.friendMeta}>
            <Text style={styles.friendName}>{item.display_name}</Text>
            <Text style={styles.friendUsername}>@{item.username}</Text>
            <Text style={styles.inventoryCount}>
              🧊 {friendItems.length} items in fridge •{' '}
              <Text style={{ color: expiringCount > 0 ? '#DC2626' : '#6B7280', fontWeight: '600' }}>
                {expiringCount} expiring soon
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            style={[styles.followBtn, isFollowing ? styles.followingBtn : styles.notFollowingBtn]}
            onPress={() => toggleFollowFriend(item.id)}>
            <Text style={[styles.followBtnText, isFollowing ? styles.followingBtnText : styles.notFollowingBtnText]}>
              {isFollowing ? 'Following' : '+ Follow'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.viewFridgeBtn}
            onPress={() =>
              router.push({
                pathname: '/friend/[id]',
                params: { id: item.id },
              })
            }>
            <Text style={styles.viewFridgeBtnText}>View Fridge →</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderCircleCard = ({ item }: { item: CircleComposite }) => {
    const expiringInCircle = getCircleExpiringItems(item.id, 72);

    return (
      <View style={styles.card}>
        <View style={styles.circleHeader}>
          <Text style={styles.circleTitle}>🥘 {item.name}</Text>
          <Text style={styles.memberCountBadge}>
            {item.members.length} members
          </Text>
        </View>

        <Text style={styles.membersListText}>
          Members: {item.members.map((m) => m.display_name).join(', ')}
        </Text>

        <View style={styles.circleExpiringRow}>
          <Text style={styles.circleExpiringLabel}>
            Combined Expiring Ingredients:
          </Text>
          <Text style={styles.circleExpiringCount}>
            {expiringInCircle.length} items (&lt;72h)
          </Text>
        </View>

        <Pressable
          style={styles.openCircleBtn}
          onPress={() =>
            router.push({
              pathname: '/circle/[id]',
              params: { id: item.id },
            })
          }>
          <Text style={styles.openCircleBtnText}>
            Plan Circle Meal (LLM) →
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <Pressable
          style={[styles.segmentBtn, activeTab === 'friends' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('friends')}>
          <Text
            style={[styles.segmentBtnText, activeTab === 'friends' && styles.segmentBtnTextActive]}>
            Friends ({friends.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, activeTab === 'circles' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('circles')}>
          <Text
            style={[styles.segmentBtnText, activeTab === 'circles' && styles.segmentBtnTextActive]}>
            Circles ({circles.length})
          </Text>
        </Pressable>
      </View>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <View style={styles.section}>
          <Text style={styles.sectionNotice}>
            Follow friends to see what's in their fridge and minimize collective waste!
          </Text>
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={renderFriendCard}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}

      {/* Circles Tab */}
      {activeTab === 'circles' && (
        <View style={styles.section}>
          <Pressable
            style={styles.createCircleBtn}
            onPress={() => setIsModalVisible(true)}>
            <Text style={styles.createCircleBtnText}>+ Create New Circle</Text>
          </Pressable>

          <FlatList
            data={circles}
            keyExtractor={(item) => item.id}
            renderItem={renderCircleCard}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No Circles Yet</Text>
                <Text style={styles.emptySub}>
                  Create a circle with friends to pool expiring ingredients for joint potlucks!
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* Create Circle Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Create Meal Planning Circle</Text>
            <Text style={styles.modalSubheading}>
              Select friends to coordinate recipes and use up near-expiration food.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Circle Name (e.g. 4th Floor Feast)"
              value={circleName}
              onChangeText={setCircleName}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.friendSelectHeading}>Select Members:</Text>
            {friends.map((f) => {
              const isSelected = selectedFriendIds.includes(f.id);
              return (
                <Pressable
                  key={f.id}
                  style={[
                    styles.friendCheckboxRow,
                    isSelected && styles.friendCheckboxRowSelected,
                  ]}
                  onPress={() => handleToggleSelectFriend(f.id)}>
                  <Text style={styles.friendCheckboxName}>{f.display_name}</Text>
                  <Text style={styles.friendCheckStatus}>
                    {isSelected ? '✓ Added' : '+ Add'}
                  </Text>
                </Pressable>
              );
            })}

            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmCircleBtn}
                onPress={handleCreateCircle}>
                <Text style={styles.confirmCircleBtnText}>Create Circle</Text>
              </Pressable>
            </View>
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
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentBtnTextActive: {
    color: '#111827',
  },
  section: {
    flex: 1,
  },
  sectionNotice: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 10,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
  friendMeta: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  friendUsername: {
    fontSize: 12,
    color: '#6B7280',
  },
  inventoryCount: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  followBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  notFollowingBtn: {
    backgroundColor: '#2563EB',
  },
  followingBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notFollowingBtnText: {
    color: '#FFFFFF',
  },
  followingBtnText: {
    color: '#374151',
  },
  viewFridgeBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewFridgeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  createCircleBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  createCircleBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  circleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  memberCountBadge: {
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  membersListText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  circleExpiringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginVertical: 10,
  },
  circleExpiringLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  circleExpiringCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#B45309',
  },
  openCircleBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  openCircleBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalSubheading: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 12,
  },
  friendSelectHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  friendCheckboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 6,
  },
  friendCheckboxRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  friendCheckboxName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  friendCheckStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  cancelBtnText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  confirmCircleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#2563EB',
    borderRadius: 6,
  },
  confirmCircleBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

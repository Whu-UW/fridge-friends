import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';

export default function RecipeViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser, recipes, rsvpRecipe } = useApp();

  const recipe = recipes.find((r) => r.id === id);

  // Group ingredients by owner
  const ingredientsByOwner = useMemo(() => {
    if (!recipe) return {};
    const map: Record<string, string[]> = {};
    recipe.ingredients.forEach((ing) => {
      const owner = ing.ownerName || 'Circle Member';
      if (!map[owner]) {
        map[owner] = [];
      }
      map[owner].push(`${ing.name} (${ing.quantity})`);
    });
    return map;
  }, [recipe]);

  if (!recipe) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Recipe Not Found</Text>
        <Text style={styles.errorSubtitle}>
          The requested potluck dinner recipe (ID: {id}) could not be located.
        </Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isRsvpd = recipe.rsvps.includes(currentUser.id);

  const handleToggleRsvp = () => {
    rsvpRecipe(recipe.id, currentUser.id);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{recipe.title}</Text>
        <View style={styles.badgeRow}>
          <Text style={styles.cookTimeBadge}>⏱ Cook Time: {recipe.cookTime}</Text>
          <Text style={styles.rsvpCountBadge}>
            👥 {recipe.rsvps.length} RSVP{recipe.rsvps.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      {/* Projected Impact */}
      <View style={styles.impactCard}>
        <Text style={styles.impactHeader}>🌱 Projected Impact</Text>
        <View style={styles.impactGrid}>
          <View style={styles.impactStat}>
            <Text style={styles.impactValue}>
              {recipe.projectedImpact.foodRescuedGrams}g
            </Text>
            <Text style={styles.impactLabel}>Food Rescued</Text>
          </View>
          <View style={styles.impactDivider} />
          <View style={styles.impactStat}>
            <Text style={styles.impactValue}>
              ${recipe.projectedImpact.dollarsSaved.toFixed(2)}
            </Text>
            <Text style={styles.impactLabel}>Estimated Saved</Text>
          </View>
        </View>
      </View>

      {/* Section: Ingredients & Owners */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients &amp; Owners</Text>
        <Text style={styles.sectionSubtitle}>
          Who brings what to the potluck dinner:
        </Text>
        <View style={styles.card}>
          {Object.entries(ingredientsByOwner).map(([owner, items]) => (
            <View key={owner} style={styles.ingredientGroup}>
              <Text style={styles.ownerHeading}>
                {owner === currentUser.name ? `${owner} (You)` : owner} brings:
              </Text>
              {items.map((item, index) => (
                <Text key={index} style={styles.ingredientItem}>
                  • {item}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Section: Cooking Tasks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cooking Tasks</Text>
        <Text style={styles.sectionSubtitle}>
          Step-by-step collaborative preparation:
        </Text>
        <View style={styles.card}>
          {recipe.cookingTasks.map((task) => (
            <View key={task.stepNumber} style={styles.taskRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>{task.stepNumber}</Text>
              </View>
              <View style={styles.taskDetails}>
                <Text style={styles.taskInstruction}>{task.instruction}</Text>
                <Text style={styles.assignedMember}>
                  Assigned to: {task.assignedMemberName}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* RSVP Toggle Button */}
      <View style={styles.rsvpSection}>
        <Pressable
          style={[styles.rsvpButton, isRsvpd ? styles.rsvpdState : styles.notRsvpdState]}
          onPress={handleToggleRsvp}>
          <Text style={styles.rsvpButtonText}>
            {isRsvpd
              ? '✓ Attending Potluck (Tap to Cancel RSVP)'
              : '👋 RSVP / Confirm Attendance'}
          </Text>
        </Pressable>
        <Text style={styles.rsvpStatusNotice}>
          {isRsvpd
            ? `You're in! You've confirmed attendance for this meal.`
            : 'RSVP so your circle knows you are bringing your ingredients.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cookTimeBadge: {
    backgroundColor: '#E0E7FF',
    color: '#3730A3',
    fontWeight: '600',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rsvpCountBadge: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
    fontWeight: '600',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  impactCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  impactHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 10,
  },
  impactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  impactStat: {
    alignItems: 'center',
  },
  impactValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#047857',
  },
  impactLabel: {
    fontSize: 12,
    color: '#065F46',
    marginTop: 2,
  },
  impactDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#A7F3D0',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  ingredientGroup: {
    marginBottom: 10,
  },
  ownerHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  ingredientItem: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    marginVertical: 2,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  taskDetails: {
    flex: 1,
  },
  taskInstruction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  assignedMember: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  rsvpSection: {
    marginTop: 8,
  },
  rsvpButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  notRsvpdState: {
    backgroundColor: '#2563EB',
  },
  rsvpdState: {
    backgroundColor: '#16A34A',
  },
  rsvpButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  rsvpStatusNotice: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

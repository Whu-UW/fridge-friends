import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../constants/Theme';
import StickerButton from '../components/ui/StickerButton';
import FoodCharacter from '../components/FoodCharacter';
import { STARTER_BUDDIES, CharacterKey } from '../services/foodCharacterLookup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openAuthModal } = useApp();

  const [selectedBuddyIndex, setSelectedBuddyIndex] = useState(3); // Carl by default per canvas
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedBuddy = STARTER_BUDDIES[selectedBuddyIndex];

  const handleCreateAccount = async () => {
    if (!userId.trim()) {
      Alert.alert('Required Field', 'Please enter a user ID.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }

    // Advance to "Get to know you"
    router.push({
      pathname: '/onboarding',
      params: {
        buddyKey: selectedBuddy.key,
        buddyName: selectedBuddy.name,
        userId: userId.trim(),
      },
    });
  };

  const safeBottomPadding = Math.max(insets.bottom, 16) + 24;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Buddy Character */}
      <View style={styles.heroWrap}>
        <FoodCharacter foodKey={selectedBuddy.key} mood="happy" size={110} animate={true} />
      </View>

      {/* Heading & Subtitle */}
      <Text style={styles.title}>Join Fridge Friends</Text>
      <Text style={styles.subtitle}>
        Track what's in your fridge and cook with friends before it goes bad.
      </Text>

      {/* Pick your buddy selector */}
      <Text style={styles.sectionLabel}>Pick your buddy</Text>
      <View style={styles.buddiesRow}>
        {STARTER_BUDDIES.map((buddy, idx) => {
          const isSelected = selectedBuddyIndex === idx;

          return (
            <Pressable
              key={buddy.key}
              style={[styles.buddyCard, isSelected && styles.buddyCardActive]}
              onPress={() => setSelectedBuddyIndex(idx)}
            >
              <FoodCharacter foodKey={buddy.key} mood="happy" size={48} animate={false} />
              <Text style={styles.buddyCardText}>{buddy.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.buddyBioText}>Meet {selectedBuddy.desc}</Text>

      {/* Inputs: User ID & Password */}
      <View style={styles.inputsStack}>
        <View>
          <Text style={styles.inputLabel}>User ID</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              placeholder="pantry.pal"
              placeholderTextColor={Colors.placeholder}
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              placeholder="At least 8 characters"
              placeholderTextColor={Colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
            />
          </View>
        </View>
      </View>

      {/* Create Account Button */}
      <View style={styles.ctaWrap}>
        <StickerButton
          title={isLoading ? 'Creating account...' : 'Create account'}
          onPress={handleCreateAccount}
          disabled={isLoading}
          variant="primary"
          size="large"
        />

        <Pressable style={styles.loginLink} onPress={openAuthModal}>
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginLinkBold}>Log in</Text>
          </Text>
        </Pressable>

        <Pressable
          style={styles.skipLink}
          onPress={async () => {
            try {
              await AsyncStorage.setItem('has_completed_onboarding', 'true');
            } catch {}
            router.replace('/(tabs)');
          }}
        >
          <Text style={styles.skipLinkText}>Skip & explore demo shelf</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 54,
    alignItems: 'center',
  },
  heroWrap: {
    marginBottom: 16,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: 28,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: '#6E5C50',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 16,
    color: Colors.ink,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  buddiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  buddyCard: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.ink,
    backgroundColor: Colors.paper,
    gap: 4,
    width: '18%',
  },
  buddyCardActive: {
    backgroundColor: '#FDEBD0',
    borderColor: Colors.terracotta,
    borderWidth: 2.5,
  },
  buddyCardText: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 12,
    color: Colors.ink,
  },
  buddyBioText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.ink,
    marginBottom: 20,
  },
  inputsStack: {
    width: '100%',
    gap: 14,
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 6,
  },
  inputWrap: {
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: 'center',
  },
  textInput: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.ink,
  },
  ctaWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  loginLink: {
    paddingVertical: 8,
  },
  loginLinkText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.ink,
  },
  loginLinkBold: {
    fontFamily: Fonts.headingBold,
    color: Colors.terracotta,
  },
  skipLink: {
    paddingVertical: 4,
  },
  skipLinkText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#8A776A',
    textDecorationLine: 'underline',
  },
});

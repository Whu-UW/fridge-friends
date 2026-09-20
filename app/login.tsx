import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../constants/Theme';
import StickerButton from '../components/ui/StickerButton';
import FoodCharacter from '../components/FoodCharacter';
import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const cleanUsername = username.trim().replace(/^@/, '');
    if (!cleanUsername || !password) {
      Alert.alert('Missing details', 'Please enter your username and password.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(cleanUsername, password);
      try {
        await AsyncStorage.setItem('has_completed_onboarding', 'true');
      } catch {}
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Could not log in', err?.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <FoodCharacter foodKey="can" mood="happy" size={110} animate={true} />
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to see your fridge and cook with friends.</Text>

        <View style={styles.inputsStack}>
          <View>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                placeholder="pantry.pal"
                placeholderTextColor={Colors.placeholder}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                placeholder="Your password"
                placeholderTextColor={Colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleLogin}
              />
            </View>
          </View>
        </View>

        <View style={styles.ctaWrap}>
          <StickerButton
            title={isLoading ? 'Logging in...' : 'Log in'}
            onPress={handleLogin}
            disabled={isLoading}
            variant="primary"
            size="large"
          />

          <Pressable style={styles.linkBtn} onPress={() => router.push('/signup')}>
            <Text style={styles.linkText}>
              New here? <Text style={styles.linkBold}>Sign up</Text>
            </Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              try {
                await AsyncStorage.setItem('has_completed_onboarding', 'true');
              } catch {}
              router.replace('/(tabs)');
            }}
          >
            <Text style={styles.skipText}>Skip & explore demo shelf</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 24, paddingTop: 80, alignItems: 'center' },
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
    marginBottom: 28,
  },
  inputsStack: { width: '100%', gap: 14, marginBottom: 24 },
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
  ctaWrap: { width: '100%', alignItems: 'center', gap: 14 },
  linkBtn: { paddingVertical: 8 },
  linkText: { fontFamily: Fonts.bodySemiBold, fontSize: 15, color: Colors.ink },
  linkBold: { fontFamily: Fonts.headingBold, color: Colors.terracotta },
  skipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#8A776A',
    textDecorationLine: 'underline',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/supabase/authService';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess: (
    authData: {
      email: string;
      displayName: string;
      username: string;
      avatarUrl?: string;
    },
    isNewUser: boolean
  ) => Promise<void>;
}

export default function AuthModal({
  visible,
  onClose,
  onAuthSuccess,
}: AuthModalProps) {
  const insets = useSafeAreaInsets();
  const isConfigured = authService.isConfigured();

  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Avatar Selection: Camera or Gallery only (no URL entry)
  const handleTakePhotoWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take a profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Could not take photo.');
    }
  };

  const handlePickPhotoFromGallery = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Gallery permission is needed to choose a profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Could not pick photo.');
    }
  };

  const handleOpenPhotoOptions = () => {
    Alert.alert('Profile Photo', 'Select an option to add your photo:', [
      { text: '📷 Take Photo', onPress: handleTakePhotoWithCamera },
      { text: '🖼️ Choose from Gallery', onPress: handlePickPhotoFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (cleanPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (authMode === 'signup') {
      const cleanName = displayName.trim();
      const cleanUser = username.trim().toLowerCase().replace('@', '');

      if (!cleanName) {
        setErrorMessage('Please enter your display name.');
        return;
      }
      if (!cleanUser) {
        setErrorMessage('Please choose a username.');
        return;
      }

      setIsLoading(true);
      try {
        if (isConfigured) {
          const res = await authService.signUp(
            cleanEmail,
            cleanPassword,
            cleanName,
            cleanUser,
            avatarUri || undefined
          );

          if (res.error) {
            setErrorMessage(res.error);
            setIsLoading(false);
            return;
          }
        }

        // Complete auth and bridge with FastAPI
        await onAuthSuccess(
          {
            email: cleanEmail,
            displayName: cleanName,
            username: cleanUser,
            avatarUrl: avatarUri || undefined,
          },
          true
        );

        setIsLoading(false);
        onClose();
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage(err.message || 'Could not complete registration.');
      }
    } else {
      // Sign In
      setIsLoading(true);
      try {
        let cleanName = cleanEmail.split('@')[0];
        let cleanUser = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');

        if (isConfigured) {
          const res = await authService.signIn(cleanEmail, cleanPassword);
          if (res.error) {
            setErrorMessage(res.error);
            setIsLoading(false);
            return;
          }

          if (res.user?.user_metadata) {
            if (res.user.user_metadata.display_name) {
              cleanName = res.user.user_metadata.display_name;
            }
            if (res.user.user_metadata.username) {
              cleanUser = res.user.user_metadata.username;
            }
          }
        }

        await onAuthSuccess(
          {
            email: cleanEmail,
            displayName: cleanName,
            username: cleanUser,
            avatarUrl: avatarUri || undefined,
          },
          false
        );

        setIsLoading(false);
        onClose();
      } catch (err: any) {
        setIsLoading(false);
        setErrorMessage(err.message || 'Sign in failed.');
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.overlay,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {authMode === 'signup' ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.subtitle}>
                {authMode === 'signup'
                  ? 'Join FridgeFriends to track groceries & host feasts'
                  : 'Sign in to access your fridge and dinner parties'}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Supabase Status Indicator */}
          {isConfigured ? (
            <View style={styles.statusBoxGreen}>
              <Text style={styles.statusTextGreen}>
                🟢 Supabase Authentication Ready
              </Text>
            </View>
          ) : (
            <View style={styles.statusBoxAmber}>
              <Text style={styles.statusTextAmber}>
                ℹ️ Demo Mode (Supabase keys not in .env.local yet). You can test
                account creation immediately!
              </Text>
            </View>
          )}

          {/* Mode Switcher */}
          <View style={styles.tabSwitcher}>
            <Pressable
              style={[
                styles.tabBtn,
                authMode === 'signup' && styles.tabBtnActive,
              ]}
              onPress={() => {
                setAuthMode('signup');
                setErrorMessage(null);
              }}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  authMode === 'signup' && styles.tabBtnTextActive,
                ]}
              >
                Create Account
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabBtn,
                authMode === 'signin' && styles.tabBtnActive,
              ]}
              onPress={() => {
                setAuthMode('signin');
                setErrorMessage(null);
              }}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  authMode === 'signin' && styles.tabBtnTextActive,
                ]}
              >
                Sign In
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingBottom: 10 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* SIGN UP: Avatar Picker */}
            {authMode === 'signup' && (
              <View style={styles.avatarSection}>
                <Pressable
                  style={styles.avatarTouchable}
                  onPress={handleOpenPhotoOptions}
                >
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderIcon}>📷</Text>
                    </View>
                  )}
                  <View style={styles.addPhotoBadge}>
                    <Text style={styles.addPhotoBadgeText}>+</Text>
                  </View>
                </Pressable>
                <Pressable onPress={handleOpenPhotoOptions}>
                  <Text style={styles.avatarHintText}>
                    {avatarUri ? 'Change Photo' : 'Add Profile Photo'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* SIGN UP: Display Name & Username */}
            {authMode === 'signup' && (
              <>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Alex Rivera"
                  placeholderTextColor="#9CA3AF"
                  value={displayName}
                  onChangeText={setDisplayName}
                />

                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. alex_rivera"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </>
            )}

            {/* Email & Password (Both Modes) */}
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. alex@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {/* Submit Button */}
            <Pressable
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {authMode === 'signup'
                    ? 'Create Account & Start Cooking 🎉'
                    : 'Sign In ➔'}
                </Text>
              )}
            </Pressable>

            {/* Guest / Demo Option */}
            <Pressable style={styles.guestBtn} onPress={onClose}>
              <Text style={styles.guestBtnText}>Continue as Guest</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  statusBoxGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  statusTextGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  statusBoxAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  statusTextAmber: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderIcon: {
    fontSize: 26,
  },
  addPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563EB',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  addPhotoBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  avatarHintText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  guestBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  guestBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Fonts } from '../constants/Theme';
import StickerButton from './ui/StickerButton';
import StickerCard from './ui/StickerCard';

interface AccountEditModalProps {
  mode: 'username' | 'password' | null;
  currentUsername: string;
  onSaveUsername: (username: string) => Promise<void>;
  onSavePassword: (current: string, next: string) => Promise<void>;
  onClose: () => void;
}

export default function AccountEditModal({
  mode,
  currentUsername,
  onSaveUsername,
  onSavePassword,
  onClose,
}: AccountEditModalProps) {
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUsername('');
    setCurrentPassword('');
    setNewPassword('');
    setError(null);
    setSaving(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (mode === 'username') {
      const clean = username.trim().replace(/^@/, '');
      if (clean.length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
      if (clean === currentUsername) {
        setError('That is already your username.');
        return;
      }
      setSaving(true);
      try {
        await onSaveUsername(clean);
        close();
      } catch (err: any) {
        setError(err?.message || 'Could not update username.');
        setSaving(false);
      }
    } else {
      if (!currentPassword) {
        setError('Please enter your current password.');
        return;
      }
      if (newPassword.length < 8) {
        setError('New password must be at least 8 characters.');
        return;
      }
      setSaving(true);
      try {
        await onSavePassword(currentPassword, newPassword);
        close();
      } catch (err: any) {
        setError(err?.message || 'Could not change password.');
        setSaving(false);
      }
    }
  };

  return (
    <Modal visible={mode !== null} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={close} />
        <StickerCard backgroundColor={Colors.paper} shadowOffset={6} borderRadius={26} style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {mode === 'username' ? 'Edit username' : 'Change password'}
            </Text>
            <Pressable onPress={close} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {mode === 'username' ? (
            <>
              <Text style={styles.label}>New username</Text>
              <TextInput
                style={styles.input}
                placeholder={currentUsername}
                placeholderTextColor={Colors.placeholder}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Current password</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={Colors.placeholder}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          <StickerButton
            title={saving ? 'Saving...' : 'Save'}
            onPress={submit}
            disabled={saving}
            variant="primary"
            size="large"
          />
        </StickerCard>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: { margin: 16, padding: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { fontFamily: Fonts.headingBold, fontSize: 22, color: Colors.ink },
  closeText: { fontFamily: Fonts.headingBold, fontSize: 16, color: Colors.ink },
  errorText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.terracotta,
    marginBottom: 10,
  },
  label: {
    fontFamily: Fonts.headingSemiBold,
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.cream,
    borderWidth: 2,
    borderColor: Colors.ink,
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 52,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.ink,
    marginBottom: 14,
  },
});

import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useApp } from '../../context/AppContext';

export default function ProfileScreen() {
  const { currentUser, recipes, feasts, updateProfile } = useApp();

  // Profile Edit State
  const [displayName, setDisplayName] = useState(currentUser.display_name);
  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url);

  // Sync state when currentUser changes
  useEffect(() => {
    setDisplayName(currentUser.display_name);
    setUsername(currentUser.username);
    setEmail(currentUser.email);
    setAvatarUrl(currentUser.avatar_url);
  }, [currentUser]);

  // Password Edit State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Photo URL Modal or Picker State
  const [isPhotoUrlModalVisible, setIsPhotoUrlModalVisible] = useState(false);
  const [tempPhotoUrl, setTempPhotoUrl] = useState('');

  // 1. Calculate Food Rescued Metrics: Solo vs With Friends
  // Solo recipes impact
  const soloRecipes = recipes.filter((r) => !r.isCollaborative);
  const soloRescuedGrams =
    soloRecipes.reduce((sum, r) => sum + r.projectedImpact.foodRescuedGrams, 0) +
    1280; // base historical metric
  const soloDollarsSaved =
    soloRecipes.reduce((sum, r) => sum + r.projectedImpact.dollarsSaved, 0) +
    18.4;

  // Collaborative / Feast Mode impact
  const collabRecipes = recipes.filter((r) => r.isCollaborative);
  const feastRescuedGrams =
    collabRecipes.reduce((sum, r) => sum + r.projectedImpact.foodRescuedGrams, 0) +
    feasts.reduce((sum, f) => sum + f.foodRescuedGrams, 0) +
    2850; // base historical metric
  const feastDollarsSaved =
    collabRecipes.reduce((sum, r) => sum + r.projectedImpact.dollarsSaved, 0) +
    feasts.reduce((sum, f) => sum + f.dollarsSaved, 0) +
    41.2;

  // Overall combined impact
  const totalRescuedGrams = soloRescuedGrams + feastRescuedGrams;
  const totalRescuedKg = (totalRescuedGrams / 1000).toFixed(1);
  const totalDollars = (soloDollarsSaved + feastDollarsSaved).toFixed(2);
  const co2AvoidedKg = ((totalRescuedGrams / 1000) * 2.5).toFixed(1);
  const totalMealsSaved = Math.round(totalRescuedGrams / 350);

  // Profile Picture Handlers
  const handlePickPhotoFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Gallery permission is needed to update your profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const newUri = result.assets[0].uri;
      setAvatarUrl(newUri);
      updateProfile({ avatar_url: newUri });
      Alert.alert('Photo Updated', 'Your profile picture has been updated!');
    }
  };

  const handleTakePhotoWithCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Camera permission is needed to snap a profile photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const newUri = result.assets[0].uri;
      setAvatarUrl(newUri);
      updateProfile({ avatar_url: newUri });
      Alert.alert('Photo Updated', 'Your profile picture has been updated!');
    }
  };

  const handleOpenPhotoOptions = () => {
    Alert.alert('Profile Photo', 'Choose an option to update your photo:', [
      { text: '📷 Take Photo', onPress: handleTakePhotoWithCamera },
      { text: '🖼️ Choose from Gallery', onPress: handlePickPhotoFromGallery },
      {
        text: '🔗 Enter Image URL',
        onPress: () => {
          setTempPhotoUrl(avatarUrl || '');
          setIsPhotoUrlModalVisible(true);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSavePhotoUrl = () => {
    const trimmed = tempPhotoUrl.trim();
    if (!trimmed) {
      Alert.alert('Invalid URL', 'Please enter a valid image URL.');
      return;
    }
    setAvatarUrl(trimmed);
    updateProfile({ avatar_url: trimmed });
    setIsPhotoUrlModalVisible(false);
    Alert.alert('Photo Updated', 'Profile image URL saved!');
  };

  // Profile Details Save Handler
  const handleSaveProfileDetails = () => {
    const cleanName = displayName.trim();
    const cleanUser = username.trim().toLowerCase().replace('@', '');
    const cleanEmail = email.trim();

    if (!cleanName) {
      Alert.alert('Validation Error', 'Display name cannot be empty.');
      return;
    }
    if (!cleanUser) {
      Alert.alert('Validation Error', 'Username cannot be empty.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    updateProfile({
      display_name: cleanName,
      username: cleanUser,
      email: cleanEmail,
    });

    Alert.alert(
      'Profile Updated 🎉',
      'Your account information has been saved successfully!'
    );
  };

  // Password Update Handler
  const handleUpdatePassword = () => {
    if (!currentPassword) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }
    if (!newPassword) {
      Alert.alert('Validation Error', 'Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(
        'Weak Password',
        'New password must be at least 6 characters long.'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New passwords do not match.');
      return;
    }

    // Success simulation
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    Alert.alert(
      'Password Updated 🔒',
      'Your password has been changed successfully.'
    );
  };

  const handleLogOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of FridgeFriends?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Logged Out', 'You have been signed out of your session.'),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Hero Header */}
        <View style={styles.heroCard}>
          <View style={styles.avatarSection}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {currentUser.display_name.charAt(0)}
                </Text>
              </View>
            )}
            <Pressable
              style={styles.changePhotoBtn}
              onPress={handleOpenPhotoOptions}
            >
              <Text style={styles.changePhotoBtnText}>📷 Change Photo</Text>
            </Pressable>
          </View>

          <View style={styles.heroMeta}>
            <Text style={styles.heroDisplayName}>
              {currentUser.display_name}
            </Text>
            <Text style={styles.heroUsername}>@{currentUser.username}</Text>
            <Text style={styles.heroEmail}>{currentUser.email}</Text>
            <View style={styles.ecoBadge}>
              <Text style={styles.ecoBadgeText}>🏆 Zero-Waste Champion</Text>
            </View>
          </View>
        </View>

        {/* Overall Food Rescued Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>🌱 Overall Food Rescued</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Your cumulative impact preventing good food from going to waste:
          </Text>

          {/* Total Highlight Bar */}
          <View style={styles.totalImpactBanner}>
            <View style={styles.totalImpactItem}>
              <Text style={styles.totalImpactValue}>{totalRescuedKg} kg</Text>
              <Text style={styles.totalImpactLabel}>Total Food Rescued</Text>
            </View>
            <View style={styles.impactDivider} />
            <View style={styles.totalImpactItem}>
              <Text style={styles.totalImpactValue}>${totalDollars}</Text>
              <Text style={styles.totalImpactLabel}>Total Dollars Saved</Text>
            </View>
          </View>

          {/* Breakdown: Solo vs Friends */}
          <View style={styles.breakdownRow}>
            {/* Card 1: Solo */}
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownIcon}>👤</Text>
                <Text style={styles.breakdownTitle}>Rescued Solo</Text>
              </View>
              <Text style={styles.breakdownValue}>
                {(soloRescuedGrams / 1000).toFixed(1)} kg
              </Text>
              <Text style={styles.breakdownSub}>
                ${soloDollarsSaved.toFixed(2)} saved
              </Text>
              <Text style={styles.breakdownMeta}>
                From quick waste-reduction meals
              </Text>
            </View>

            {/* Card 2: With Friends */}
            <View style={styles.breakdownCardCollab}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownIcon}>👥</Text>
                <Text style={styles.breakdownTitle}>With Friends</Text>
              </View>
              <Text style={styles.breakdownValueCollab}>
                {(feastRescuedGrams / 1000).toFixed(1)} kg
              </Text>
              <Text style={styles.breakdownSubCollab}>
                ${feastDollarsSaved.toFixed(2)} saved
              </Text>
              <Text style={styles.breakdownMeta}>
                From collaborative Feast Mode
              </Text>
            </View>
          </View>

          {/* Environmental Eco Stats */}
          <View style={styles.ecoStatsContainer}>
            <View style={styles.ecoStatPill}>
              <Text style={styles.ecoStatIcon}>🍽️</Text>
              <Text style={styles.ecoStatText}>
                {totalMealsSaved} meals rescued
              </Text>
            </View>
            <View style={styles.ecoStatPill}>
              <Text style={styles.ecoStatIcon}>☁️</Text>
              <Text style={styles.ecoStatText}>
                {co2AvoidedKg} kg CO₂e avoided
              </Text>
            </View>
          </View>
        </View>

        {/* Account Details Form (Standard Login Inputs) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👤 Account Information</Text>
          <Text style={styles.sectionSubtitle}>
            Update your display name, username, and contact email:
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your Name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Pressable
            style={styles.primaryActionBtn}
            onPress={handleSaveProfileDetails}
          >
            <Text style={styles.primaryActionBtnText}>
              Save Profile Changes
            </Text>
          </Pressable>
        </View>

        {/* Password & Security Form (Standard Password Inputs) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🔒 Edit Password</Text>
          <Text style={styles.sectionSubtitle}>
            Manage your password credentials:
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.textInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.textInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-type new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
          </View>

          <Pressable
            style={styles.securityActionBtn}
            onPress={handleUpdatePassword}
          >
            <Text style={styles.primaryActionBtnText}>Update Password</Text>
          </Pressable>
        </View>

        {/* Log Out Button */}
        <Pressable style={styles.logOutBtn} onPress={handleLogOut}>
          <Text style={styles.logOutBtnText}>Log Out of Session</Text>
        </Pressable>
      </ScrollView>

      {/* Enter Image URL Modal */}
      {isPhotoUrlModalVisible && (
        <View style={styles.urlModalOverlay}>
          <View style={styles.urlModalCard}>
            <Text style={styles.urlModalTitle}>Profile Image URL</Text>
            <Text style={styles.urlModalSubtitle}>
              Paste a public direct image link:
            </Text>
            <TextInput
              style={styles.textInput}
              value={tempPhotoUrl}
              onChangeText={setTempPhotoUrl}
              placeholder="https://images.unsplash.com/..."
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.urlModalBtnRow}>
              <Pressable
                style={styles.cancelModalBtn}
                onPress={() => setIsPhotoUrlModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmModalBtn}
                onPress={handleSavePhotoUrl}
              >
                <Text style={styles.confirmModalBtnText}>Save Photo URL</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarSection: {
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  changePhotoBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  changePhotoBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  heroMeta: {
    flex: 1,
  },
  heroDisplayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  heroUsername: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  heroEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  ecoBadge: {
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  ecoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },

  /* Total Impact Banner */
  totalImpactBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  totalImpactItem: {
    alignItems: 'center',
  },
  totalImpactValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#047857',
  },
  totalImpactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
    marginTop: 2,
  },
  impactDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#A7F3D0',
  },

  /* Breakdown Row */
  breakdownRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  breakdownCardCollab: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  breakdownIcon: {
    fontSize: 14,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  breakdownSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 1,
  },
  breakdownValueCollab: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  breakdownSubCollab: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 1,
  },
  breakdownMeta: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },

  /* Eco Stats Pill */
  ecoStatsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  ecoStatPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
  },
  ecoStatIcon: {
    fontSize: 14,
  },
  ecoStatText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },

  /* Input Fields */
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },

  /* Action Buttons */
  primaryActionBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  securityActionBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Log Out Button */
  logOutBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  logOutBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },

  /* URL Modal Overlay */
  urlModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  urlModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
  },
  urlModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  urlModalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  urlModalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  cancelModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  cancelModalBtnText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 13,
  },
  confirmModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
  confirmModalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

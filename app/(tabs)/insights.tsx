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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import {
  BACKEND_BASE_URL,
  ConnectionDiagnosticResult,
} from '../../services/backendApi';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    recipes,
    feasts,
    updateProfile,
    backendConnected,
    backendSyncAttempted,
    backendLatency,
    activeBackendUserId,
    switchBackendUser,
    testBackendDiagnostics,
    isPantryHardcoded,
    isFriendsHardcoded,
    isFeastsHardcoded,
    isRecipesHardcoded,
    // Supabase Auth
    supabaseUser,
    isAuthConfigured,
    openAuthModal,
    logoutFromSupabase,
  } = useApp();

  // Diagnostics State
  const [diagnosticResult, setDiagnosticResult] = useState<ConnectionDiagnosticResult | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

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

  // Profile Picture Handlers: Camera & Gallery ONLY (no manual URL entry)
  const handlePickPhotoFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Gallery permission is needed to choose a profile picture.'
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
      const newUri = result.assets[0].uri;
      setAvatarUrl(newUri);
      updateProfile({ avatar_url: newUri });
      Alert.alert('Photo Updated', 'Your profile picture has been updated from gallery!');
    }
  };

  const handleTakePhotoWithCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Camera permission is needed to take a profile photo.'
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
      const newUri = result.assets[0].uri;
      setAvatarUrl(newUri);
      updateProfile({ avatar_url: newUri });
      Alert.alert('Photo Updated', 'Your profile picture has been updated from camera!');
    }
  };

  const handleOpenPhotoOptions = () => {
    Alert.alert('Profile Photo', 'Choose an option to update your photo:', [
      { text: '📷 Take Photo', onPress: handleTakePhotoWithCamera },
      { text: '🖼️ Choose from Gallery', onPress: handlePickPhotoFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

  const handleRunDiagnosticTest = async () => {
    setIsRunningTest(true);
    try {
      const result = await testBackendDiagnostics();
      setDiagnosticResult(result);
      if (result.connected) {
        Alert.alert(
          'Live Database Verified! ✅',
          `Successfully connected to ${BACKEND_BASE_URL}!\n\nLatency: ${result.latencyMs}ms\nUsers in DB: ${result.usersCount}\nPantry items: ${result.groceriesCount}\nFriendships: ${result.friendsCount}`
        );
      } else {
        Alert.alert(
          'Connection Issue',
          `Could not reach database: ${result.error || 'Server timeout'}`
        );
      }
    } catch (err: any) {
      Alert.alert('Diagnostic Error', err.message);
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleLogOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of FridgeFriends?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          if (supabaseUser) {
            await logoutFromSupabase();
            Alert.alert('Logged Out', 'You have been signed out of Supabase Cloud.');
          } else {
            Alert.alert('Logged Out', 'You have been signed out of your session.');
          }
        },
      },
    ]);
  };

  if (!backendSyncAttempted) {
    return (
      <View style={styles.initialLoadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.initialLoadingTitle}>Connecting to Live Database...</Text>
        <Text style={styles.initialLoadingSub}>
          Loading account profile and impact metrics from server...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 100 },
        ]}
      >
        {/* Profile Hero Header */}
        <View style={styles.heroCard}>
          <View style={styles.avatarSection}>
            <Pressable
              onPress={handleOpenPhotoOptions}
              style={styles.avatarPressable}
              accessibilityLabel="Change profile picture"
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {currentUser.display_name.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeIcon}>📷</Text>
              </View>
            </Pressable>

            {/* Quick buttons: Gallery or Camera */}
            <View style={styles.photoQuickRow}>
              <Pressable
                style={styles.photoQuickBtn}
                onPress={handlePickPhotoFromGallery}
                accessibilityLabel="Choose from Gallery"
              >
                <Text style={styles.photoQuickBtnText}>🖼️ Gallery</Text>
              </Pressable>
              <Pressable
                style={styles.photoQuickBtn}
                onPress={handleTakePhotoWithCamera}
                accessibilityLabel="Take Photo"
              >
                <Text style={styles.photoQuickBtnText}>📷 Camera</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.heroMeta}>
            <Text style={styles.heroDisplayName}>
              {currentUser.display_name}
            </Text>
            <Text style={styles.heroUsername}>@{currentUser.username}</Text>
            <Text style={styles.heroEmail}>{currentUser.email}</Text>
            <View style={styles.heroBadgesRow}>
              <View style={styles.ecoBadge}>
                <Text style={styles.ecoBadgeText}>🏆 Zero-Waste Champion</Text>
              </View>
              {supabaseUser ? (
                <View style={styles.cloudSyncedBadge}>
                  <Text style={styles.cloudSyncedBadgeText}>☁️ Cloud Synced</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.cloudSignInBadge}
                  onPress={openAuthModal}
                  accessibilityLabel="Sign in with Supabase"
                >
                  <Text style={styles.cloudSignInBadgeText}>✨ Sign In</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Supabase Cloud Account Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.cloudHeaderTitleRow}>
              <Text style={styles.sectionTitle}>☁️ Cloud Account</Text>
              <View
                style={[
                  styles.cloudStatusPill,
                  supabaseUser ? styles.cloudStatusPillActive : styles.cloudStatusPillGuest,
                ]}
              >
                <Text
                  style={[
                    styles.cloudStatusPillText,
                    supabaseUser ? styles.cloudStatusPillTextActive : styles.cloudStatusPillTextGuest,
                  ]}
                >
                  {supabaseUser ? '🟢 Supabase Connected' : '🟡 Guest Session'}
                </Text>
              </View>
            </View>
          </View>

          {supabaseUser ? (
            <View style={styles.cloudDetailsBox}>
              <Text style={styles.cloudDetailsSub}>
                Your pantry groceries, friendships, and feasts are linked to your Supabase identity:
              </Text>
              <View style={styles.cloudInfoRow}>
                <Text style={styles.cloudInfoLabel}>Supabase Email:</Text>
                <Text style={styles.cloudInfoVal}>{supabaseUser.email}</Text>
              </View>
              <View style={styles.cloudInfoRow}>
                <Text style={styles.cloudInfoLabel}>Database User ID:</Text>
                <Text style={styles.cloudInfoVal}>#{activeBackendUserId}</Text>
              </View>
              <View style={styles.cloudInfoRow}>
                <Text style={styles.cloudInfoLabel}>Auth Status:</Text>
                <Text style={styles.cloudInfoValSuccess}>Verified Session</Text>
              </View>

              <Pressable
                style={styles.cloudSignOutBtn}
                onPress={handleLogOut}
                accessibilityLabel="Sign Out of Supabase"
              >
                <Text style={styles.cloudSignOutBtnText}>Sign Out of Supabase</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.cloudDetailsBox}>
              <Text style={styles.cloudDetailsSub}>
                You are currently browsing with backend user #{activeBackendUserId} ({currentUser.display_name}).
                Sign in or create an account with email to secure your data and seamlessly collaborate with friends!
              </Text>

              <Pressable
                style={styles.cloudSignInPrimaryBtn}
                onPress={openAuthModal}
                accessibilityLabel="Sign In or Create Account"
              >
                <Text style={styles.cloudSignInPrimaryBtnText}>✨ Sign In / Create Account</Text>
              </Pressable>
            </View>
          )}
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

        {/* Backend Live Database Status & Diagnostics */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>⚡ Live Database Connection</Text>
            <View
              style={[
                styles.liveStatusBadge,
                backendConnected
                  ? styles.liveStatusConnected
                  : styles.liveStatusOffline,
              ]}
            >
              <Text
                style={[
                  styles.liveStatusText,
                  backendConnected
                    ? styles.liveStatusTextConnected
                    : styles.liveStatusTextOffline,
                ]}
              >
                {backendConnected
                  ? `🟢 Live (${backendLatency ?? 0}ms)`
                  : '🟡 Offline Cache'}
              </Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            Target: {BACKEND_BASE_URL}
          </Text>

          {/* Data Sources Breakdown */}
          <View style={styles.dataSourcesTable}>
            <Text style={styles.dataSourcesTableTitle}>📊 Data Sources Breakdown:</Text>
            <View style={styles.dataSourceRow}>
              <Text style={styles.dataSourceName}>• Pantry Groceries</Text>
              <Text style={backendConnected ? styles.badgeDb : styles.badgeHardcoded}>
                {backendConnected ? '🟢 Live Database' : '⚠️ Hardcoded'}
              </Text>
            </View>
            <View style={styles.dataSourceRow}>
              <Text style={styles.dataSourceName}>• Friends & Requests</Text>
              <Text style={backendConnected ? styles.badgeDb : styles.badgeHardcoded}>
                {backendConnected ? '🟢 Live Database' : '⚠️ Hardcoded'}
              </Text>
            </View>
            <View style={styles.dataSourceRow}>
              <Text style={styles.dataSourceName}>• Feast Mode Parties</Text>
              <Text style={styles.badgeHardcoded}>⚠️ Hardcoded (No DB Table)</Text>
            </View>
            <View style={styles.dataSourceRow}>
              <Text style={styles.dataSourceName}>• AI Rescued Recipes</Text>
              <Text style={styles.badgeHardcoded}>⚠️ Local Generated (No DB Table)</Text>
            </View>
          </View>

          {/* User Switcher Buttons */}
          <Text style={styles.switcherLabel}>
            Switch Demo Account (Test Multi-User Collaboration):
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.userSwitcherScroll}
          >
            {[
              { id: 14, name: 'Sam Perera', role: 'Host' },
              { id: 15, name: 'Nadia Khan', role: 'Mutual Friend' },
              { id: 16, name: 'Theo Alvarez', role: 'Mutual Friend' },
              { id: 17, name: 'Mei Tanaka', role: 'Pending Friend' },
              { id: 18, name: 'Obi Nwachukwu', role: 'Pending Friend' },
            ].map((u) => {
              const isActive = activeBackendUserId === u.id;
              return (
                <Pressable
                  key={u.id}
                  style={[
                    styles.userSwitchPill,
                    isActive && styles.userSwitchPillActive,
                  ]}
                  onPress={() => switchBackendUser(u.id)}
                >
                  <Text
                    style={[
                      styles.userSwitchPillName,
                      isActive && styles.userSwitchPillNameActive,
                    ]}
                  >
                    {isActive ? '✓ ' : ''}{u.name}
                  </Text>
                  <Text
                    style={[
                      styles.userSwitchPillRole,
                      isActive && styles.userSwitchPillRoleActive,
                    ]}
                  >
                    ID #{u.id} • {u.role}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* On-Demand Diagnostics Test Button */}
          <Pressable
            style={[styles.testDiagnosticsBtn, isRunningTest && { opacity: 0.7 }]}
            onPress={handleRunDiagnosticTest}
            disabled={isRunningTest}
          >
            <Text style={styles.testDiagnosticsBtnText}>
              {isRunningTest
                ? '🔄 Querying Live Database...'
                : '🧪 Test Live Database Connection'}
            </Text>
          </Pressable>

          {diagnosticResult && (
            <View style={styles.diagnosticSummaryBox}>
              <Text style={styles.diagnosticSummaryTitle}>
                {diagnosticResult.connected
                  ? '✅ Database Sync Health Check: Healthy'
                  : '❌ Database Check: Disconnected'}
              </Text>
              <View style={styles.diagnosticMetricsRow}>
                <View style={styles.diagnosticMetricItem}>
                  <Text style={styles.diagnosticMetricValue}>
                    {diagnosticResult.latencyMs}ms
                  </Text>
                  <Text style={styles.diagnosticMetricLabel}>Latency</Text>
                </View>
                <View style={styles.diagnosticMetricItem}>
                  <Text style={styles.diagnosticMetricValue}>
                    {diagnosticResult.usersCount}
                  </Text>
                  <Text style={styles.diagnosticMetricLabel}>Users</Text>
                </View>
                <View style={styles.diagnosticMetricItem}>
                  <Text style={styles.diagnosticMetricValue}>
                    {diagnosticResult.groceriesCount}
                  </Text>
                  <Text style={styles.diagnosticMetricLabel}>Pantry Items</Text>
                </View>
                <View style={styles.diagnosticMetricItem}>
                  <Text style={styles.diagnosticMetricValue}>
                    {diagnosticResult.friendsCount}
                  </Text>
                  <Text style={styles.diagnosticMetricLabel}>Friends</Text>
                </View>
              </View>
            </View>
          )}
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
  avatarPressable: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeIcon: {
    fontSize: 11,
  },
  photoQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  photoQuickBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  photoQuickBtnText: {
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
  },
  ecoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  heroBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  cloudSyncedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignSelf: 'flex-start',
  },
  cloudSyncedBadgeText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  cloudSignInBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignSelf: 'flex-start',
  },
  cloudSignInBadgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '700',
  },
  cloudHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cloudStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  cloudStatusPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  cloudStatusPillGuest: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  cloudStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cloudStatusPillTextActive: {
    color: '#065F46',
  },
  cloudStatusPillTextGuest: {
    color: '#92400E',
  },
  cloudDetailsBox: {
    marginTop: 10,
  },
  cloudDetailsSub: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  cloudInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cloudInfoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  cloudInfoVal: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  cloudInfoValSuccess: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },
  cloudSignInPrimaryBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cloudSignInPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cloudSignOutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  cloudSignOutBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
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


  /* Data Sources Breakdown Table */
  dataSourcesTable: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  dataSourcesTableTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  dataSourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  dataSourceName: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  badgeDb: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeHardcoded: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  /* Live Database Diagnostics Styles */
  liveStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveStatusConnected: {
    backgroundColor: '#DCFCE7',
  },
  liveStatusOffline: {
    backgroundColor: '#FEF3C7',
  },
  liveStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  liveStatusTextConnected: {
    color: '#15803D',
  },
  liveStatusTextOffline: {
    color: '#B45309',
  },
  switcherLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
    marginBottom: 8,
  },
  userSwitcherScroll: {
    gap: 8,
    paddingBottom: 6,
  },
  userSwitchPill: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    marginRight: 6,
  },
  userSwitchPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  userSwitchPillName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  userSwitchPillNameActive: {
    color: '#1D4ED8',
  },
  userSwitchPillRole: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  userSwitchPillRoleActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  testDiagnosticsBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  testDiagnosticsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  diagnosticSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  diagnosticSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  diagnosticMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  diagnosticMetricItem: {
    alignItems: 'center',
  },
  diagnosticMetricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  diagnosticMetricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  initialLoadingContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  initialLoadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 14,
  },
  initialLoadingSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
});

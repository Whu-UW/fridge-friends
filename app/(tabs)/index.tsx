import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import CalendarPickerModal from "../../components/CalendarPickerModal";
import { useApp } from "../../context/AppContext";
import {
  isGeminiKeyConfigured,
  scanGroceryReceiptMock,
  scanGroceryReceiptWithGemini,
  ScannedReceiptItem,
  ScannedReceiptResult,
} from "../../services/receiptOcrService";
import { FridgeItemRow, RecipeComposite } from "../../services/supabase/types";

const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat",
  "Bakery",
  "Pantry",
  "Beverage",
  "Frozen",
  "Other",
];

export default function MyFridgeScreen() {
  const router = useRouter();
  const {
    currentUser,
    friends,
    fridgeItems,
    removeFridgeItem,
    addManualFridgeItem,
    addShoppingTripFromReceipt,
    getUserExpiringItems,
    generateTopSoloRecipes,
    generateTopDinnerPartyRecipes,
    createFeastInvite,
  } = useApp();

  // Filter only mutual (accepted) friends for Feast Mode
  const mutualFriends = friends.filter((f) => f.status === 'accepted');

  // Solo Recipes Modal State
  const [isGeneratingSolo, setIsGeneratingSolo] = useState(false);
  const [soloRecipes, setSoloRecipes] = useState<RecipeComposite[]>([]);
  const [isSoloRecipesModalVisible, setIsSoloRecipesModalVisible] =
    useState(false);

  // Dinner Party Friends & Recipes Modal State
  const [isPartyFriendsModalVisible, setIsPartyFriendsModalVisible] =
    useState(false);
  const [partyTitle, setPartyTitle] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isGeneratingParty, setIsGeneratingParty] = useState(false);
  const [partyRecipes, setPartyRecipes] = useState<RecipeComposite[]>([]);
  const [isPartyRecipesModalVisible, setIsPartyRecipesModalVisible] =
    useState(false);

  // FAB Menu Modal State
  const [isFabMenuVisible, setIsFabMenuVisible] = useState(false);

  // Manual Add Form Modal State
  const [isManualAddModalVisible, setIsManualAddModalVisible] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("Produce");
  const [itemDateBought, setItemDateBought] = useState(
    new Date().toISOString(),
  );
  const [isManualCalendarVisible, setIsManualCalendarVisible] = useState(false);
  const [isAddingManualItem, setIsAddingManualItem] = useState(false);

  // Scanner Modal & State
  const [isScannerPickerVisible, setIsScannerPickerVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningStatusText, setScanningStatusText] = useState("");
  const [scannedReceipt, setScannedReceipt] =
    useState<ScannedReceiptResult | null>(null);
  const [isAddingReceipt, setIsAddingReceipt] = useState(false);
  const [isReceiptCalendarVisible, setIsReceiptCalendarVisible] =
    useState(false);

  const userItems = fridgeItems.filter(
    (item) => item.user_id === currentUser.id,
  );
  const expiringItems = getUserExpiringItems(72);

  // Format time since purchase
  const formatTimeSinceBought = (dateBoughtIso: string) => {
    const diffMs = Date.now() - new Date(dateBoughtIso).getTime();
    const diffDays = Math.floor(diffMs / (24 * 36e5));
    const boughtDate = new Date(dateBoughtIso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    if (diffDays <= 0) return `Bought today (${boughtDate})`;
    if (diffDays === 1) return `Bought yesterday (${boughtDate})`;
    return `Bought ${diffDays} days ago (${boughtDate})`;
  };

  // Format expiration countdown
  const formatExpiration = (expiresAtIso: string) => {
    const hoursLeft = Math.round(
      (new Date(expiresAtIso).getTime() - Date.now()) / 36e5,
    );
    if (hoursLeft <= 0) return "Expired";
    if (hoursLeft < 48) return `Expires in ${hoursLeft}h`;
    const daysLeft = Math.ceil(hoursLeft / 24);
    return `Expires in ${daysLeft} days`;
  };

  // 1. "Get Recipe" Flow: Generate top 5 solo recipes from expiring food
  const handleGetRecipe = async () => {
    if (userItems.length === 0) {
      Alert.alert(
        "Fridge is Empty",
        "Add or scan some groceries first before generating recipes!",
      );
      return;
    }

    setIsGeneratingSolo(true);
    try {
      const top5 = await generateTopSoloRecipes();
      setSoloRecipes(top5);
      setIsSoloRecipesModalVisible(true);
    } catch (err: any) {
      Alert.alert(
        "Recipe Generation Error",
        err.message || "Failed to generate recipes.",
      );
    } finally {
      setIsGeneratingSolo(false);
    }
  };

  // 2. "Feast Mode" Flow: Select mutual friends & generate top 5 collaborative recipes
  const handleOpenPartyFriendsModal = () => {
    if (userItems.length === 0) {
      Alert.alert(
        "Fridge is Empty",
        "Add some groceries first so you have ingredients to contribute!",
      );
      return;
    }
    if (!partyTitle) {
      setPartyTitle(`${currentUser.display_name}'s Feast Mode`);
    }
    if (selectedFriendIds.length === 0 && mutualFriends.length > 0) {
      setSelectedFriendIds(mutualFriends.map((f) => f.id));
    }
    setIsPartyFriendsModalVisible(true);
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  const handleGeneratePartyRecipes = async () => {
    const finalTitle =
      partyTitle.trim() || `${currentUser.display_name}'s Feast Mode`;
    setIsGeneratingParty(true);
    try {
      const top5 = await generateTopDinnerPartyRecipes(
        finalTitle,
        selectedFriendIds,
      );
      setPartyRecipes(top5);
      setIsPartyFriendsModalVisible(false);
      setIsPartyRecipesModalVisible(true);
    } catch (err: any) {
      Alert.alert(
        "Feast Mode Error",
        err.message || "Failed to generate collaborative recipes.",
      );
    } finally {
      setIsGeneratingParty(false);
    }
  };

  const handleSelectFeastAndInvite = (recipe: RecipeComposite) => {
    const invitedFriendsList = friends.filter((f) =>
      selectedFriendIds.includes(f.id),
    );
    const friendNames =
      invitedFriendsList.map((f) => f.display_name).join(", ") || "friends";

    createFeastInvite(recipe, partyTitle, selectedFriendIds);
    setIsPartyRecipesModalVisible(false);

    Alert.alert(
      "Feast Invites Sent! 🎉",
      `Invitations for "${recipe.title}" were sent to ${friendNames}.\n\nYou can track which friends accept under Pending Feasts in the Social tab!`,
      [
        {
          text: "View in Social Tab",
          onPress: () => router.push("/(tabs)/social"),
        },
        {
          text: "View Recipe",
          onPress: () =>
            router.push({
              pathname: "/recipe/[id]",
              params: { id: recipe.id },
            }),
        },
        { text: "OK", style: "cancel" },
      ],
    );
  };

  // Manual Add Handlers
  const handleManualAdd = async () => {
    const trimmed = itemName.trim();
    if (!trimmed) {
      Alert.alert("Validation Error", "Please enter an item name.");
      return;
    }

    const parsedPrice = parseFloat(itemPrice);
    const validPrice =
      isNaN(parsedPrice) || parsedPrice <= 0 ? 3.5 : parsedPrice;

    setIsAddingManualItem(true);
    try {
      await addManualFridgeItem(
        trimmed,
        validPrice,
        itemDateBought || new Date().toISOString(),
        itemCategory,
      );

      setItemName("");
      setItemPrice("");
      setItemCategory("Produce");
      setItemDateBought(new Date().toISOString());
      setIsManualAddModalVisible(false);
      Alert.alert("Item Added", `${trimmed} was added to your fridge!`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not add item.");
    } finally {
      setIsAddingManualItem(false);
    }
  };

  const handleSetManualQuickDate = (daysAgo: number) => {
    const target = new Date(Date.now() - daysAgo * 24 * 36e5);
    setItemDateBought(target.toISOString());
  };

  // OCR Receipt Handlers
  const processImageWithGemini = async (
    base64: string,
    mimeType: string = "image/jpeg",
  ) => {
    setIsScanning(true);
    setScanningStatusText("Analyzing receipt with Gemini...");
    try {
      if (isGeminiKeyConfigured()) {
        const result = await scanGroceryReceiptWithGemini(
          base64,
          mimeType,
          (msg) => setScanningStatusText(msg),
        );
        setScannedReceipt(result);
      } else {
        Alert.alert(
          "Gemini API Key Needed",
          "Add your key to .env.local (EXPO_PUBLIC_GEMINI_API_KEY). Using demo receipt for now!",
        );
        const result = await scanGroceryReceiptMock();
        setScannedReceipt(result);
      }
    } catch (err: any) {
      Alert.alert(
        "Scan Failed",
        err.message || "Could not parse receipt image with Gemini.",
      );
    } finally {
      setIsScanning(false);
      setScanningStatusText("");
    }
  };

  const handleTakePhoto = async () => {
    setIsScannerPickerVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Camera permission is needed to snap receipts.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      await processImageWithGemini(
        result.assets[0].base64,
        result.assets[0].mimeType || "image/jpeg",
      );
    }
  };

  const handlePickFromGallery = async () => {
    setIsScannerPickerVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Gallery access is needed to select receipt photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      await processImageWithGemini(
        result.assets[0].base64,
        result.assets[0].mimeType || "image/jpeg",
      );
    }
  };

  const handleUseMockDemo = async () => {
    setIsScannerPickerVisible(false);
    setIsScanning(true);
    setScanningStatusText("Loading demo receipt...");
    try {
      const result = await scanGroceryReceiptMock();
      setScannedReceipt(result);
    } finally {
      setIsScanning(false);
      setScanningStatusText("");
    }
  };

  // Editable Receipt Handlers
  const handleUpdateStoreName = (name: string) => {
    setScannedReceipt((prev) => (prev ? { ...prev, storeName: name } : null));
  };

  const handleUpdateTripDate = (dateStr: string) => {
    setScannedReceipt((prev) => (prev ? { ...prev, tripDate: dateStr } : null));
  };

  const handleSetReceiptQuickDate = (daysAgo: number) => {
    const target = new Date(Date.now() - daysAgo * 24 * 36e5);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    handleUpdateTripDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleUpdateItemField = (
    index: number,
    field: keyof ScannedReceiptItem,
    value: any,
  ) => {
    setScannedReceipt((prev) => {
      if (!prev) return null;
      const updated = [...prev.items];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      const newTotal = updated.reduce(
        (sum, it) => sum + (parseFloat(String(it.price)) || 0),
        0,
      );

      return {
        ...prev,
        items: updated,
        totalCost: Number(newTotal.toFixed(2)),
      };
    });
  };

  const handleRemoveScannedItem = (index: number) => {
    setScannedReceipt((prev) => {
      if (!prev) return null;
      const updated = prev.items.filter((_, i) => i !== index);
      const newTotal = updated.reduce(
        (sum, it) => sum + (parseFloat(String(it.price)) || 0),
        0,
      );
      return {
        ...prev,
        items: updated,
        totalCost: Number(newTotal.toFixed(2)),
      };
    });
  };

  const handleAddScannedItem = () => {
    setScannedReceipt((prev) => {
      if (!prev) return null;
      const newItem: ScannedReceiptItem = {
        name: "",
        price: 3.5,
        category: "Produce",
        quantity: "1 item",
        shelfLifeDays: 5,
      };
      const updated = [...prev.items, newItem];
      const newTotal = updated.reduce(
        (sum, it) => sum + (parseFloat(String(it.price)) || 0),
        0,
      );
      return {
        ...prev,
        items: updated,
        totalCost: Number(newTotal.toFixed(2)),
      };
    });
  };

  const handleConfirmReceiptIntake = async () => {
    if (!scannedReceipt) return;

    const validItems = scannedReceipt.items.filter(
      (it) => it.name.trim().length > 0,
    );

    if (validItems.length === 0) {
      Alert.alert("Empty Receipt", "Please enter at least one item name.");
      return;
    }

    const parsedDate = new Date(scannedReceipt.tripDate);
    const validDateIso = !isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date().toISOString();

    const finalReceipt: ScannedReceiptResult = {
      ...scannedReceipt,
      tripDate: validDateIso,
      items: validItems,
      totalCost: Number(
        validItems
          .reduce((sum, it) => sum + (parseFloat(String(it.price)) || 0), 0)
          .toFixed(2),
      ),
    };

    setIsAddingReceipt(true);
    try {
      await addShoppingTripFromReceipt(finalReceipt);
      setScannedReceipt(null);
      Alert.alert(
        "Receipt Saved",
        `Successfully added ${validItems.length} items to your fridge!`,
      );
    } catch (err) {
      Alert.alert("Error", "Failed to save receipt items.");
    } finally {
      setIsAddingReceipt(false);
    }
  };

  // Render individual item card
  const renderFridgeCard = ({ item }: { item: FridgeItemRow }) => {
    const hoursLeft = Math.round(
      (new Date(item.expires_at).getTime() - Date.now()) / 36e5,
    );
    const isUrgent = hoursLeft <= 48;

    return (
      <View style={styles.card}>
        <View style={styles.cardMain}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
          </View>

          {/* Time since bought */}
          <Text style={styles.timeBoughtText}>
            ⏱ {formatTimeSinceBought(item.date_bought)}
          </Text>

          {/* Expiration estimation from LLM */}
          <View style={styles.badgeContainer}>
            <Text
              style={[
                styles.expiryBadge,
                isUrgent ? styles.expiryUrgent : styles.expiryFresh,
              ]}
            >
              {formatExpiration(item.expires_at)} (LLM Predicted)
            </Text>
            <Text style={styles.categoryBadge}>{item.category}</Text>
          </View>
        </View>

        {/* Delete Item Button */}
        <Pressable
          style={styles.deleteBtn}
          hitSlop={8}
          onPress={() => removeFridgeItem(item.id)}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Two Primary Action Buttons: Get Recipe vs Feast Mode */}
      <View style={styles.actionButtonsRow}>
        {/* Button 1: Get Recipe (Solo) */}
        <Pressable
          style={[styles.primaryActionBtn, styles.getRecipeBtn]}
          onPress={handleGetRecipe}
          disabled={isGeneratingSolo}
        >
          {isGeneratingSolo ? (
            <View style={styles.btnLoadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.actionBtnTitle}>Creating Recipes...</Text>
            </View>
          ) : (
            <View style={styles.btnContentRow}>
              <Text style={styles.actionBtnIcon}>🍳</Text>
              <View style={styles.actionBtnTextWrap}>
                <Text style={styles.actionBtnTitle}>Get Recipe</Text>
                <Text style={styles.actionBtnSub}>
                  Top 5 solo waste-rescue meals
                </Text>
              </View>
            </View>
          )}
        </Pressable>

        {/* Button 2: Feast Mode (Collaborative with Friends) */}
        <Pressable
          style={[styles.primaryActionBtn, styles.dinnerPartyBtn]}
          onPress={handleOpenPartyFriendsModal}
        >
          <View style={styles.btnContentRow}>
            <Text style={styles.actionBtnIcon}>🎉</Text>
            <View style={styles.actionBtnTextWrap}>
              <Text style={styles.actionBtnTitle}>Feast Mode</Text>
              <Text style={styles.actionBtnSub}>
                Top 5 feasts with friends' fridges
              </Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Inventory Header & List */}
      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {currentUser.display_name}'s Fridge ({userItems.length})
          </Text>
          <Text style={styles.listMeta}>
            Tracked from purchase to expiration
          </Text>
        </View>

        <FlatList
          data={userItems}
          keyExtractor={(item) => item.id}
          renderItem={renderFridgeCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Your fridge is empty!</Text>
              <Text style={styles.emptySub}>
                Tap the + button in the bottom corner to scan a grocery receipt or manually add items.
              </Text>
            </View>
          }
        />
      </View>

      {/* Floating Action Button (FAB) */}
      <Pressable
        style={styles.fab}
        onPress={() => setIsFabMenuVisible(true)}
        accessibilityLabel="Add item or scan receipt"
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      {/* Top 5 Solo Recipes Modal */}
      <Modal
        visible={isSoloRecipesModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardWide}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeading}>
                  🍳 Top 5 Waste-Rescue Recipes
                </Text>
                <Text style={styles.modalSubheading}>
                  Generated to rescue your near-expiration ingredients:
                </Text>
              </View>
              <Pressable
                style={styles.closeModalBtn}
                onPress={() => setIsSoloRecipesModalVisible(false)}
              >
                <Text style={styles.closeModalBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.recipesListScroll}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {soloRecipes.map((recipe, index) => (
                <View key={recipe.id} style={styles.recipeCard}>
                  <View style={styles.recipeCardHeader}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>
                        #{index + 1} Best Match
                      </Text>
                    </View>
                    <Text style={styles.recipeCookTime}>
                      ⏱ {recipe.cookTime}
                    </Text>
                  </View>

                  <Text style={styles.recipeCardTitle}>{recipe.title}</Text>

                  {/* Rescued ingredients badges */}
                  <View style={styles.focusTagsRow}>
                    <Text style={styles.rescuesLabel}>Rescues:</Text>
                    {recipe.focusExpiringItems.map((item, fIdx) => (
                      <View key={fIdx} style={styles.focusItemPill}>
                        <Text style={styles.focusItemPillText}>⚠️ {item}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Impact Stats */}
                  <View style={styles.recipeStatsRow}>
                    <Text style={styles.recipeStatText}>
                      🌱 {recipe.projectedImpact.foodRescuedGrams}g rescued
                    </Text>
                    <Text style={styles.recipeStatBullet}>•</Text>
                    <Text style={styles.recipeStatText}>
                      💰 ${recipe.projectedImpact.dollarsSaved.toFixed(2)} saved
                    </Text>
                  </View>

                  {/* CTA button */}
                  <Pressable
                    style={styles.viewRecipeBtn}
                    onPress={() => {
                      setIsSoloRecipesModalVisible(false);
                      router.push({
                        pathname: "/recipe/[id]",
                        params: { id: recipe.id },
                      });
                    }}
                  >
                    <Text style={styles.viewRecipeBtnText}>
                      Cook This Recipe ➔
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Friends Selection for Feast Mode Modal */}
      <Modal
        visible={isPartyFriendsModalVisible}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeading}>🎉 Feast Mode: Invite Friends</Text>
                <Text style={styles.modalSubheading}>
                  Select mutual friends to invite. We'll pool expiring food from your fridge and their fridges!
                </Text>
              </View>
              <Pressable
                style={styles.closeModalBtn}
                onPress={() => setIsPartyFriendsModalVisible(false)}
              >
                <Text style={styles.closeModalBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ marginTop: 10, maxHeight: 380 }}
              contentContainerStyle={{ paddingBottom: 10 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Party Title */}
              <Text style={styles.inputLabel}>Feast Name:</Text>
              <TextInput
                style={styles.manualInput}
                value={partyTitle}
                onChangeText={setPartyTitle}
                placeholder="e.g. Friday Night Zero-Waste Feast"
                placeholderTextColor="#9CA3AF"
              />

              {/* Friends list header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 14,
                  marginBottom: 6,
                }}
              >
                <Text style={styles.inputLabel}>
                  Select Attendees ({selectedFriendIds.length} invited):
                </Text>
                {mutualFriends.length > 0 && (
                  <Pressable
                    onPress={() => {
                      if (selectedFriendIds.length === mutualFriends.length) {
                        setSelectedFriendIds([]);
                      } else {
                        setSelectedFriendIds(mutualFriends.map((f) => f.id));
                      }
                    }}
                  >
                    <Text style={styles.toggleAllText}>
                      {selectedFriendIds.length === mutualFriends.length
                        ? "Deselect All"
                        : "Select All"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {mutualFriends.length === 0 ? (
                <View style={styles.emptyFriendsBox}>
                  <Text style={styles.emptyFriendsText}>
                    No mutual friends yet! Accept or add friends in the Social tab to invite them to Feast Mode.
                  </Text>
                </View>
              ) : (
                <View style={styles.friendsList}>
                  {mutualFriends.map((friend) => {
                    const isInvited = selectedFriendIds.includes(friend.id);
                    const friendItems = fridgeItems.filter(
                      (i) => i.user_id === friend.id,
                    );
                    const friendExpiringCount = friendItems.filter((i) => {
                      const hours =
                        (new Date(i.expires_at).getTime() - Date.now()) / 36e5;
                      return hours <= 72 || i.status === "expiring";
                    }).length;

                    return (
                      <Pressable
                        key={friend.id}
                        style={[
                          styles.friendInviteRow,
                          isInvited && styles.friendInviteRowSelected,
                        ]}
                        onPress={() => toggleFriendSelection(friend.id)}
                      >
                        <Image
                          source={{ uri: friend.avatar_url }}
                          style={styles.friendAvatar}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.friendName}>
                            {friend.display_name}
                          </Text>
                          <Text style={styles.friendHandle}>
                            @{friend.username}
                          </Text>
                          <Text style={styles.friendFridgeMeta}>
                            🥗 {friendItems.length} items ({friendExpiringCount} expiring)
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.checkboxCircle,
                            isInvited && styles.checkboxCircleSelected,
                          ]}
                        >
                          {isInvited && (
                            <Text style={styles.checkmarkText}>✓</Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setIsPartyFriendsModalVisible(false)}
                disabled={isGeneratingParty}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmPartyBtn}
                onPress={handleGeneratePartyRecipes}
                disabled={isGeneratingParty}
              >
                {isGeneratingParty ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.confirmBtnText}>
                      Generating Top 5 Feasts...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.confirmBtnText}>
                    🍳 Generate Top 5 Feasts
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Top 5 Feast Mode Recipes Modal */}
      <Modal
        visible={isPartyRecipesModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardWide}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeading}>
                  🎉 Top 5 Feast Mode Recipes
                </Text>
                <Text style={styles.modalSubheading}>
                  Collaborative recipes combining expiring food from you &amp; friends:
                </Text>
              </View>
              <Pressable
                style={styles.closeModalBtn}
                onPress={() => setIsPartyRecipesModalVisible(false)}
              >
                <Text style={styles.closeModalBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.recipesListScroll}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {partyRecipes.map((recipe, index) => (
                <View key={recipe.id} style={styles.recipeCardCollab}>
                  <View style={styles.recipeCardHeader}>
                    <View style={styles.rankBadgeCollab}>
                      <Text style={styles.rankBadgeText}>
                        #{index + 1} Crowd Favorite
                      </Text>
                    </View>
                    <Text style={styles.recipeCookTime}>
                      ⏱ {recipe.cookTime}
                    </Text>
                  </View>

                  <Text style={styles.recipeCardTitle}>{recipe.title}</Text>

                  {/* Combined Ingredients preview */}
                  <View style={styles.focusTagsRow}>
                    <Text style={styles.rescuesLabel}>Combined items:</Text>
                    {recipe.ingredients
                      .filter((i) => i.is_expiring_item)
                      .slice(0, 5)
                      .map((ing, iIdx) => (
                        <View key={iIdx} style={styles.partyItemPill}>
                          <Text style={styles.partyItemPillText}>
                            {ing.owner_name}: {ing.item_name}
                          </Text>
                        </View>
                      ))}
                  </View>

                  {/* Impact Stats */}
                  <View style={styles.recipeStatsRow}>
                    <Text style={styles.recipeStatText}>
                      🌱 {recipe.projectedImpact.foodRescuedGrams}g rescued
                    </Text>
                    <Text style={styles.recipeStatBullet}>•</Text>
                    <Text style={styles.recipeStatText}>
                      💰 ${recipe.projectedImpact.dollarsSaved.toFixed(2)} group savings
                    </Text>
                  </View>

                  {/* CTA button: Send invites and select feast */}
                  <Pressable
                    style={styles.viewRecipePartyBtn}
                    onPress={() => handleSelectFeastAndInvite(recipe)}
                  >
                    <Text style={styles.viewRecipeBtnText}>
                      Select Feast &amp; Send Invites ✉️
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* FAB Options Modal (Scan Receipt vs Manual Add) */}
      <Modal
        visible={isFabMenuVisible}
        animationType="fade"
        transparent={true}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsFabMenuVisible(false)}
        >
          <Pressable
            style={styles.optionsModalCard}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Text style={styles.optionsModalTitle}>Add to Fridge</Text>
            <Text style={styles.optionsModalSub}>
              Choose how you want to add grocery items:
            </Text>

            {/* Option 1: Scan Receipt */}
            <Pressable
              style={styles.fabOptionItem}
              onPress={() => {
                setIsFabMenuVisible(false);
                setIsScannerPickerVisible(true);
              }}
            >
              <View style={styles.fabOptionIconBg}>
                <Text style={styles.fabOptionIcon}>📸</Text>
              </View>
              <View style={styles.fabOptionContent}>
                <Text style={styles.fabOptionTitle}>
                  Scan Grocery Receipt
                </Text>
                <Text style={styles.fabOptionDesc}>
                  Auto-extract items, prices &amp; shelf life with Gemini Vision
                </Text>
              </View>
            </Pressable>

            {/* Option 2: Manual Add */}
            <Pressable
              style={styles.fabOptionItem}
              onPress={() => {
                setIsFabMenuVisible(false);
                setIsManualAddModalVisible(true);
              }}
            >
              <View style={styles.fabOptionIconBgBlue}>
                <Text style={styles.fabOptionIcon}>✍️</Text>
              </View>
              <View style={styles.fabOptionContent}>
                <Text style={styles.fabOptionTitle}>Manually Add Item</Text>
                <Text style={styles.fabOptionDesc}>
                  Quickly add an item with AI shelf life estimation
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.optionCancelBtn}
              onPress={() => setIsFabMenuVisible(false)}
            >
              <Text style={styles.optionCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Manual Add Modal */}
      <Modal
        visible={isManualAddModalVisible}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>✍️ Manually Add Item</Text>
            <Text style={styles.modalSubheading}>
              Gemini will estimate shelf life and optimal storage automatically.
            </Text>

            <ScrollView
              style={{ marginTop: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Item Name */}
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.manualInput}
                placeholder="e.g. Avocado, Whole Milk, Chicken Breast"
                value={itemName}
                onChangeText={setItemName}
                placeholderTextColor="#9CA3AF"
                autoFocus
              />

              {/* Price */}
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                Estimated Price ($)
              </Text>
              <TextInput
                style={styles.manualInput}
                placeholder="3.50"
                value={itemPrice}
                onChangeText={setItemPrice}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />

              {/* Category Chips */}
              <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                Category
              </Text>
              <View style={styles.categoryChipsRow}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryChip,
                      itemCategory === cat && styles.categoryChipSelected,
                    ]}
                    onPress={() => setItemCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        itemCategory === cat && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Date Bought */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                Date Bought
              </Text>
              <View style={styles.datePickerContainer}>
                <Pressable
                  style={styles.calendarPickerBtn}
                  onPress={() => setIsManualCalendarVisible(true)}
                >
                  <Text style={styles.calendarIconText}>📅</Text>
                  <Text style={styles.calendarDateText}>
                    {new Date(itemDateBought).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </Pressable>

                <View style={styles.quickDateRow}>
                  <Pressable
                    style={styles.quickDateChip}
                    onPress={() => handleSetManualQuickDate(0)}
                  >
                    <Text style={styles.quickDateChipText}>Today</Text>
                  </Pressable>
                  <Pressable
                    style={styles.quickDateChip}
                    onPress={() => handleSetManualQuickDate(1)}
                  >
                    <Text style={styles.quickDateChipText}>Yesterday</Text>
                  </Pressable>
                  <Pressable
                    style={styles.quickDateChip}
                    onPress={() => handleSetManualQuickDate(2)}
                  >
                    <Text style={styles.quickDateChipText}>2 Days Ago</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setIsManualAddModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmBtn}
                onPress={handleManualAdd}
                disabled={isAddingManualItem}
              >
                {isAddingManualItem ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>+ Add to Fridge</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Scan Source Options Modal (Camera vs Gallery vs Mock) */}
      <Modal
        visible={isScannerPickerVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModalCard}>
            <Text style={styles.optionsModalTitle}>
              📸 Scan Grocery Receipt
            </Text>
            <Text style={styles.optionsModalSub}>
              {isGeminiKeyConfigured()
                ? "Gemini Flash OCR active"
                : "Free Gemini API Key supported in .env.local"}
            </Text>

            <Pressable
              style={styles.optionBtnPrimary}
              onPress={handleTakePhoto}
            >
              <Text style={styles.optionBtnPrimaryText}>
                📷 Take Photo with Camera
              </Text>
            </Pressable>

            <Pressable
              style={styles.optionBtnSecondary}
              onPress={handlePickFromGallery}
            >
              <Text style={styles.optionBtnSecondaryText}>
                🖼️ Choose from Photo Gallery
              </Text>
            </Pressable>

            <Pressable
              style={styles.optionBtnSecondary}
              onPress={handleUseMockDemo}
            >
              <Text style={styles.optionBtnSecondaryText}>
                ⚡ Use Demo Sample Receipt
              </Text>
            </Pressable>

            <Pressable
              style={styles.optionCancelBtn}
              onPress={() => setIsScannerPickerVisible(false)}
            >
              <Text style={styles.optionCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Editable Scanned Receipt Modal */}
      <Modal
        visible={Boolean(scannedReceipt)}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>
                  🧾 Review Scanned Receipt
                </Text>
                <Text style={styles.modalSubheading}>
                  Tap any item, price, or shelf life to edit before saving:
                </Text>
              </View>
            </View>

            {scannedReceipt && (
              <ScrollView
                style={styles.modalReceiptScroll}
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Store Name & Date row */}
                <View style={styles.storeEditRow}>
                  <View style={{ flex: 1.3 }}>
                    <Text style={styles.inputLabel}>Store Name:</Text>
                    <TextInput
                      style={styles.storeInput}
                      value={scannedReceipt.storeName}
                      onChangeText={handleUpdateStoreName}
                      placeholder="Store Name"
                    />
                  </View>
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.inputLabel}>Date Bought:</Text>
                    <Pressable
                      style={styles.calendarPickerBtn}
                      onPress={() => setIsReceiptCalendarVisible(true)}
                    >
                      <Text style={styles.calendarIconText}>📅</Text>
                      <Text style={styles.calendarDateText}>
                        {scannedReceipt.tripDate
                          ? new Date(
                              scannedReceipt.tripDate,
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Pick Date"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Quick Date Shortcuts */}
                <View style={styles.quickDateRow}>
                  <Text style={styles.quickDateLabel}>Quick Date:</Text>
                  <Pressable
                    style={styles.quickDateChip}
                    onPress={() => handleSetReceiptQuickDate(0)}
                  >
                    <Text style={styles.quickDateChipText}>Today</Text>
                  </Pressable>
                  <Pressable
                    style={styles.quickDateChip}
                    onPress={() => handleSetReceiptQuickDate(1)}
                  >
                    <Text style={styles.quickDateChipText}>Yesterday</Text>
                  </Pressable>
                  <Pressable
                    style={styles.quickDateChip}
                    onPress={() => handleSetReceiptQuickDate(2)}
                  >
                    <Text style={styles.quickDateChipText}>2 Days Ago</Text>
                  </Pressable>
                </View>

                <View style={styles.receiptDivider} />

                {/* Items List */}
                <Text style={styles.itemsSectionLabel}>
                  Grocery Items ({scannedReceipt.items.length}):
                </Text>

                {scannedReceipt.items.map((it, idx) => (
                  <View key={idx} style={styles.editItemCard}>
                    {/* Row 1: Name and Delete Button */}
                    <View style={styles.itemTopRow}>
                      <TextInput
                        style={styles.itemNameInput}
                        value={it.name}
                        onChangeText={(txt) =>
                          handleUpdateItemField(idx, "name", txt)
                        }
                        placeholder="Item name (e.g. Avocado)"
                        placeholderTextColor="#9CA3AF"
                      />
                      <Pressable
                        style={styles.removeItemBtn}
                        onPress={() => handleRemoveScannedItem(idx)}
                      >
                        <Text style={styles.removeItemBtnText}>✕</Text>
                      </Pressable>
                    </View>

                    {/* Row 2: Price, Shelf Life, and Category */}
                    <View style={styles.itemBottomRow}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Price ($):</Text>
                        <TextInput
                          style={styles.priceInput}
                          value={String(it.price)}
                          onChangeText={(txt) =>
                            handleUpdateItemField(idx, "price", txt)
                          }
                          keyboardType="numeric"
                          placeholder="0.00"
                        />
                      </View>

                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Shelf Life:</Text>
                        <View style={styles.shelfLifeInputGroup}>
                          <TextInput
                            style={styles.shelfLifeInput}
                            value={String(it.shelfLifeDays || 5)}
                            onChangeText={(txt) =>
                              handleUpdateItemField(
                                idx,
                                "shelfLifeDays",
                                parseInt(txt, 10) || 5,
                              )
                            }
                            keyboardType="numeric"
                            placeholder="5"
                          />
                          <Text style={styles.daysLabel}>days</Text>
                        </View>
                      </View>

                      <View style={styles.fieldGroupCategory}>
                        <Text style={styles.fieldLabel}>Category:</Text>
                        <TextInput
                          style={styles.categoryInput}
                          value={it.category}
                          onChangeText={(txt) =>
                            handleUpdateItemField(idx, "category", txt)
                          }
                          placeholder="Category"
                        />
                      </View>
                    </View>
                  </View>
                ))}

                {/* Button to add an item manually */}
                <Pressable
                  style={styles.addItemBtn}
                  onPress={handleAddScannedItem}
                >
                  <Text style={styles.addItemBtnText}>+ Add Missing Item</Text>
                </Pressable>

                <View style={styles.receiptDivider} />

                {/* Total Cost Row */}
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>
                    Calculated Total:
                  </Text>
                  <Text style={styles.receiptTotalValue}>
                    ${scannedReceipt.totalCost.toFixed(2)}
                  </Text>
                </View>
              </ScrollView>
            )}

            {/* Action Buttons */}
            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setScannedReceipt(null)}
              >
                <Text style={styles.cancelBtnText}>Discard</Text>
              </Pressable>
              <Pressable
                style={styles.confirmBtn}
                onPress={handleConfirmReceiptIntake}
                disabled={isAddingReceipt}
              >
                {isAddingReceipt ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    ✓ Confirm &amp; Add to Fridge
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Receipt Calendar Date Picker Modal */}
      <CalendarPickerModal
        visible={isReceiptCalendarVisible}
        selectedDate={scannedReceipt?.tripDate || new Date().toISOString()}
        onSelectDate={(newDate) => handleUpdateTripDate(newDate)}
        onClose={() => setIsReceiptCalendarVisible(false)}
      />

      {/* Manual Add Calendar Date Picker Modal */}
      <CalendarPickerModal
        visible={isManualCalendarVisible}
        selectedDate={itemDateBought}
        onSelectDate={(newDate) => setItemDateBought(newDate)}
        onClose={() => setIsManualCalendarVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 14,
  },
  wasteBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  wasteBannerLeft: {
    flex: 1,
  },
  wasteBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
  },
  wasteBannerSub: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
  },

  /* Primary Action Buttons */
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  primaryActionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  getRecipeBtn: {
    backgroundColor: "#059669",
  },
  dinnerPartyBtn: {
    backgroundColor: "#2563EB",
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
  },
  actionBtnIcon: {
    fontSize: 22,
  },
  actionBtnTextWrap: {
    flex: 1,
  },
  actionBtnTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  actionBtnSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },

  /* Inventory Section */
  listSection: {
    flex: 1,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  listMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  listContent: {
    paddingBottom: 85,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  cardMain: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
  },
  timeBoughtText: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 3,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  expiryBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiryUrgent: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
  },
  expiryFresh: {
    backgroundColor: "#ECFDF5",
    color: "#047857",
  },
  categoryBadge: {
    backgroundColor: "#F3F4F6",
    color: "#4B5563",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deleteBtn: {
    padding: 8,
  },
  deleteBtnText: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyBox: {
    padding: 36,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
  },
  emptySub: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  /* Floating Action Button (FAB) */
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
  fabIcon: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "300",
    lineHeight: 34,
  },

  /* Modal Overlays & Cards */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 14,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    maxHeight: "90%",
  },
  modalCardWide: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    maxHeight: "92%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  modalSubheading: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  closeModalBtnText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6B7280",
  },

  /* Recipes List in Modal */
  recipesListScroll: {
    marginTop: 6,
  },
  recipeCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 12,
  },
  recipeCardCollab: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 14,
    marginBottom: 12,
  },
  recipeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rankBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rankBadgeCollab: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  recipeCookTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  recipeCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  focusTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  rescuesLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  focusItemPill: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  focusItemPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#991B1B",
  },
  partyItemPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  partyItemPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  recipeStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  recipeStatText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  recipeStatBullet: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  viewRecipeBtn: {
    backgroundColor: "#059669",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  viewRecipePartyBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  viewRecipeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Dinner Party Friends Selection Modal */
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  toggleAllText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  friendsList: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    padding: 8,
  },
  friendInviteRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  friendInviteRowSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  friendName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  friendHandle: {
    fontSize: 12,
    color: "#6B7280",
  },
  friendFridgeMeta: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
    marginTop: 2,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxCircleSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#2563EB",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyFriendsBox: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  emptyFriendsText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  confirmPartyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#2563EB",
  },

  /* FAB & Options Modal */
  optionsModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },
  optionsModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  optionsModalSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 16,
  },
  fabOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    marginBottom: 10,
  },
  fabOptionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  fabOptionIconBgBlue: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  fabOptionIcon: {
    fontSize: 22,
  },
  fabOptionContent: {
    flex: 1,
  },
  fabOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  fabOptionDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  optionBtnPrimary: {
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  optionBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  optionBtnSecondary: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionBtnSecondaryText: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "600",
  },
  optionCancelBtn: {
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  optionCancelText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Manual Add Form */
  manualInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
  },
  categoryChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryChip: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryChipSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  categoryChipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  categoryChipTextSelected: {
    color: "#2563EB",
    fontWeight: "700",
  },
  datePickerContainer: {
    marginTop: 2,
  },
  calendarPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  calendarIconText: {
    fontSize: 15,
  },
  calendarDateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  quickDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  quickDateLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  quickDateChip: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  quickDateChipText: {
    fontSize: 11,
    color: "#1D4ED8",
    fontWeight: "600",
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  cancelBtnText: {
    color: "#4B5563",
    fontWeight: "600",
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: "#059669",
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* Scanned Receipt Modal */
  modalReceiptScroll: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#F9FAFB",
    maxHeight: 380,
  },
  storeEditRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  storeInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },
  itemsSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  editItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    marginBottom: 8,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  itemNameInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  removeItemBtn: {
    backgroundColor: "#FEE2E2",
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  removeItemBtnText: {
    color: "#DC2626",
    fontWeight: "bold",
    fontSize: 14,
  },
  itemBottomRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  fieldGroup: {
    flex: 1,
  },
  fieldGroupCategory: {
    flex: 1.3,
  },
  fieldLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
  },
  priceInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
  },
  shelfLifeInputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  shelfLifeInput: {
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
    width: 26,
    textAlign: "center",
  },
  daysLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  categoryInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: "#374151",
  },
  addItemBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 6,
  },
  addItemBtnText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 13,
  },
  receiptTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  receiptTotalLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
  },
  receiptTotalValue: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#059669",
  },
});

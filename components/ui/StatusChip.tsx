import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
import { Colors, Fonts } from '../../constants/Theme';

interface StatusChipProps {
  label: string;
  status?: 'fresh' | 'soon' | 'now' | 'neutral';
  daysLeft?: number;
  isSelected?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
}

export default function StatusChip({
  label,
  status,
  daysLeft,
  isSelected = false,
  onPress,
  size = 'small',
  style,
}: StatusChipProps) {
  // Resolve status if daysLeft is provided
  let effectiveStatus = status || 'neutral';
  if (daysLeft !== undefined) {
    if (daysLeft > 5) effectiveStatus = 'fresh';
    else if (daysLeft >= 3) effectiveStatus = 'soon';
    else effectiveStatus = 'now';
  }

  let bg = Colors.paper;
  let textColor = Colors.ink;

  if (effectiveStatus === 'fresh') {
    bg = Colors.fresh.bg;
    textColor = Colors.fresh.text;
  } else if (effectiveStatus === 'soon') {
    bg = Colors.soon.bg;
    textColor = Colors.soon.text;
  } else if (effectiveStatus === 'now') {
    bg = Colors.now.bg;
    textColor = Colors.now.text;
  }

  const isSmall = size === 'small';

  const content = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: bg,
          borderColor: Colors.ink,
          borderWidth: isSelected ? 2.5 : 2,
          paddingVertical: isSmall ? 3 : 6,
          paddingHorizontal: isSmall ? 10 : 14,
        },
        isSelected && styles.selectedChip,
        style,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: textColor,
            fontSize: isSmall ? 12 : 14,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={6}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  chipText: {
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.2,
  },
  selectedChip: {
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
});

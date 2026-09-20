import React from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Colors, Fonts } from '../../constants/Theme';

interface StickerButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  badge?: string | number;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export default function StickerButton({
  title,
  onPress,
  variant = 'primary',
  size = 'large',
  badge,
  icon,
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
}: StickerButtonProps) {
  // Variant colors
  let bgColor = Colors.terracotta;
  let textColor = '#FFFFFF';
  let borderColor = Colors.ink;

  if (variant === 'secondary') {
    bgColor = Colors.paper;
    textColor = Colors.ink;
  } else if (variant === 'outline') {
    bgColor = 'transparent';
    textColor = Colors.ink;
  } else if (variant === 'danger') {
    bgColor = Colors.terracotta;
    textColor = '#FFFFFF';
  }

  if (disabled) {
    bgColor = Colors.disabled;
    textColor = '#7E7368';
  }

  // Sizing
  const height = size === 'small' ? 40 : size === 'medium' ? 48 : 56;
  const fontSize = size === 'small' ? 15 : size === 'medium' ? 17 : 19;
  const paddingHorizontal = size === 'small' ? 14 : size === 'medium' ? 20 : 24;

  const shadowOffset = disabled ? 0 : 4;

  return (
    <View
      style={[
        styles.outerWrapper,
        {
          width: fullWidth ? '100%' : undefined,
          paddingBottom: shadowOffset,
        },
      ]}
    >
      {/* Solid Shadow */}
      {!disabled && (
        <View
          style={[
            styles.solidShadow,
            {
              backgroundColor: borderColor,
              borderRadius: 26,
              top: shadowOffset,
              height,
            },
          ]}
        />
      )}

      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: bgColor,
            borderColor,
            height,
            paddingHorizontal,
            transform: pressed && !disabled ? [{ translateY: 3 }] : [{ translateY: 0 }],
          },
          style,
        ]}
      >
        <View style={styles.innerRow}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text
            style={[
              styles.buttonText,
              {
                color: textColor,
                fontSize,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>

          {badge !== undefined && (
            <View style={styles.badgeCircle}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'relative',
  },
  solidShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  button: {
    borderWidth: 2.5,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginRight: 8,
  },
  buttonText: {
    fontFamily: Fonts.headingSemiBold,
    letterSpacing: 0.3,
  },
  badgeCircle: {
    marginLeft: 10,
    backgroundColor: '#FFFFFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: Fonts.headingBold,
    fontSize: 14,
    color: Colors.ink,
  },
});

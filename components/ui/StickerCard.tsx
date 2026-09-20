import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import { Colors } from '../../constants/Theme';

interface StickerCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  shadowOffset?: number;
  borderRadius?: number;
  onPress?: () => void;
  disabled?: boolean;
}

export default function StickerCard({
  children,
  style,
  containerStyle,
  backgroundColor = Colors.paper,
  borderColor = Colors.ink,
  shadowOffset = 4,
  borderRadius = 22,
  onPress,
  disabled = false,
}: StickerCardProps) {
  const content = (
    <View
      style={[
        styles.innerCard,
        {
          backgroundColor,
          borderColor,
          borderRadius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View
      style={[
        styles.outerShadowWrapper,
        {
          borderRadius,
          paddingBottom: shadowOffset,
        },
        containerStyle,
      ]}
    >
      {/* Underlying Solid Shadow */}
      <View
        style={[
          styles.solidShadow,
          {
            backgroundColor: borderColor,
            borderRadius,
            top: shadowOffset,
          },
        ]}
      />
      {onPress ? (
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={({ pressed }) => [
            pressed && {
              transform: [{ translateY: Math.min(shadowOffset, 2) }],
            },
          ]}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerShadowWrapper: {
    position: 'relative',
  },
  solidShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  innerCard: {
    borderWidth: 2.5,
    overflow: 'hidden',
  },
});

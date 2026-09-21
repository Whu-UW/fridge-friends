import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: any;
}

/**
 * Fridge icon for bottom tab bar (sticker style)
 */
export function FridgeIcon({ size = 24, color = '#3E2A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Fridge outer body */}
      <Rect
        x="5"
        y="2.5"
        width="14"
        height="19"
        rx="2.5"
        stroke={color}
        strokeWidth="2"
      />
      {/* Freezer divider line */}
      <Line x1="5" y1="9.5" x2="19" y2="9.5" stroke={color} strokeWidth="2" />
      {/* Top door handle */}
      <Line
        x1="8"
        y1="5.5"
        x2="8"
        y2="7.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Bottom door handle */}
      <Line
        x1="8"
        y1="12"
        x2="8"
        y2="15.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Meals / Cooking icon for bottom tab bar
 */
export function MealsIcon({ size = 24, color = '#3E2A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Pan / bowl body */}
      <Path
        d="M4 11C4 16.5 7.5 19 12 19C16.5 19 20 16.5 20 11H4Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Rim line */}
      <Line
        x1="3"
        y1="11"
        x2="21"
        y2="11"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Steam curves */}
      <Path
        d="M8 7C8 5 9 4.5 9 3"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <Path
        d="M12 7.5C12 5.5 13 5 13 3.5"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <Path
        d="M16 7C16 5 17 4.5 17 3"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Friends icon for bottom tab bar
 */
export function FriendsIcon({ size = 24, color = '#3E2A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Primary user head */}
      <Circle cx="9" cy="8" r="3.5" stroke={color} strokeWidth="2" />
      {/* Primary user body */}
      <Path
        d="M3.5 19.5C3.5 16 6 14 9 14C12 14 14.5 16 14.5 19.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Friend user head */}
      <Path
        d="M14.5 5.5C15.2 4.9 16.1 4.5 17 4.5C18.9 4.5 20.5 6.1 20.5 8C20.5 9.1 20 10.1 19.2 10.7"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Friend user body */}
      <Path
        d="M15.5 14.2C17.5 14.7 19.5 16 20.5 18.5"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * You / Profile icon for bottom tab bar
 */
export function YouIcon({ size = 24, color = '#3E2A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Head */}
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
      {/* Body / shoulders */}
      <Path
        d="M5 20C5 15.8 8.1 14 12 14C15.9 14 19 15.8 19 20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Calendar icon for date pickers
 */
export function CalendarIcon({ size = 20, color = '#3E2A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="3"
        stroke={color}
        strokeWidth="2"
      />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="2" />
      <Line
        x1="8"
        y1="2"
        x2="8"
        y2="5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Line
        x1="16"
        y1="2"
        x2="16"
        y2="5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Circle cx="8" cy="13" r="1" fill={color} />
      <Circle cx="12" cy="13" r="1" fill={color} />
      <Circle cx="16" cy="13" r="1" fill={color} />
      <Circle cx="8" cy="17" r="1" fill={color} />
      <Circle cx="12" cy="17" r="1" fill={color} />
    </Svg>
  );
}

/**
 * Camera icon for receipt scanning
 */
export function CameraIcon({ size = 22, color = '#3E2A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8C4 6.9 4.9 6 6 6H7.8L9.2 4.2C9.5 3.8 10 3.5 10.5 3.5H13.5C14 3.5 14.5 3.8 14.8 4.2L16.2 6H18C19.1 6 20 6.9 20 8V18C20 19.1 19.1 20 18 20H6C4.9 20 4 19.1 4 18V8Z"
        stroke={color}
        strokeWidth="2"
      />
      <Circle cx="12" cy="13" r="3.5" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

/**
 * Gallery / Image icon for receipt photo library
 */
export function GalleryIcon({ size = 22, color = '#3E2A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="3"
        stroke={color}
        strokeWidth="2"
      />
      <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
      <Path
        d="M21 16L16 11L7 19"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 14.5L17.5 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Pencil icon for manual ingredient entry
 */
export function PencilIcon({ size = 22, color = '#3E2A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 3L21 7L7 21H3V17L17 3Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1="14"
        y1="6"
        x2="18"
        y2="10"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  );
}

/**
 * Receipt icon
 */
export function ReceiptIcon({ size = 26, color = '#3E2A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 3V20L6.5 18.5L9 20L11.5 18.5L14 20L16.5 18.5L20 20V3H4Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Line x1="8" y1="8" x2="16" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="12" x2="14" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Lock icon for privacy note
 */
export function LockIcon({ size = 16, color = '#76665A' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="5"
        y="10"
        width="14"
        height="11"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M8 10V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Circle cx="12" cy="15" r="1.5" fill={color} />
    </Svg>
  );
}

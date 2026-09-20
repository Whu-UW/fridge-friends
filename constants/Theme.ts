/**
 * Fridge Friends Design System Tokens
 * Source: ui fridge friends/fridge-friends-handover/docs/design/handover.md
 */

export const Colors = {
  // Core Surfaces & Backgrounds
  cream: '#FBF3E4',         // Canvas / App background
  paper: '#FFFDF7',         // Cards, modals, dialog backgrounds
  paperMuted: '#F4ECE1',    // Secondary card fill / muted state
  ink: '#3E2A1E',           // 2.5px strokes, borders, hard shadows, headings

  // Action Colors
  terracotta: '#B4523A',     // Primary buttons, hero CTAs, urgent badges
  terracottaDark: '#9C3F29', // Pressed button shade
  terracottaLight: '#E8674F',// Carl can body, bright accents

  // Wood & Furniture
  shelfWood: '#A9744F',      // Wooden shelf planks
  shelfWoodDark: '#8C5D3C',  // Shelf bevel / shadow

  // Nature & Accents
  sage: '#8FA98A',           // Freshness, rolling hills, accents
  sageDark: '#5DBB8A',       // Sammy spinach green, leafy body
  sageLight: '#EAF3E7',      // Very light sage card background

  // Urgency Status Chips
  fresh: {
    bg: '#DDEBD7',
    text: '#2F5A2B',
    label: 'Fresh',
  },
  soon: {
    bg: '#F8E3A9',
    text: '#5F430A',
    label: 'Use soon',
  },
  now: {
    bg: '#F4C7B8',
    text: '#7A2E1B',
    label: 'Use now',
  },

  // Theatrical Scene Colors
  sunset: {
    bands: ['#F2A07B', '#F6C29A', '#F9DDA6'],
    sun: '#FFD36B',
    hills: '#8FA98A',
    confetti: ['#FFD36B', '#F2A07B', '#5DBB8A', '#9A62B8', '#F58B6E', '#3E2A1E'],
  },
  dusk: {
    bands: ['#B4AAB8', '#9B90A0', '#837788'],
    press: '#4A404F',
    hazardYellow: '#FFD700',
    hazardStripe: '#2A242E',
    dust: '#D5CCD8',
  },

  // UI States
  disabled: '#D1C7BD',
  placeholder: '#9D8E81',
  border: '#3E2A1E',
};

export const Fonts = {
  // Heading & Brand Fonts
  headingMedium: 'Fredoka_500Medium',
  headingSemiBold: 'Fredoka_600SemiBold',
  headingBold: 'Fredoka_700Bold',

  // Body & Metadata Fonts
  bodyRegular: 'Nunito_400Regular',
  bodySemiBold: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
};

export const Shadows = {
  // Tactile Hard Drops (No Blur)
  card: {
    borderWidth: 2.5,
    borderColor: Colors.ink,
    shadowOffset: 4,
  },
  button: {
    borderWidth: 2.5,
    borderColor: Colors.ink,
    shadowOffset: 4,
  },
  chip: {
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  shelf: {
    borderWidth: 2.5,
    borderColor: Colors.ink,
  },
};

export const Radius = {
  card: 22,
  modal: 26,
  button: 26,
  pill: 999,
  chip: 20,
  shelf: 10,
};

/**
 * Theme constants for the Klaviyo React Native SDK Example App
 * Provides consistent colors, spacing, and typography throughout the app
 */

export const colors = {
  // Primary colors
  primary: '#007AFF', // iOS blue for primary actions
  secondary: '#5856D6', // Purple for secondary actions
  success: '#34C759', // Green for success states
  destructive: '#FF3B30', // Red for destructive actions

  // Background colors
  background: '#F2F2F7', // Light gray app background
  cardBackground: '#FFFFFF', // White card/section backgrounds

  // Text colors
  text: '#000000', // Primary text
  secondaryText: '#6B6B6B', // Secondary/muted text
  placeholderText: '#C6C6C8', // Placeholder text

  // Border and disabled states
  border: '#C6C6C8', // Default border color
  disabled: '#C6C6C8', // Disabled state color
  disabledBackground: '#F2F2F7', // Disabled background

  // Button states
  buttonText: '#FFFFFF', // White text on buttons
  buttonBorder: '#007AFF', // Border for outlined buttons
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
};

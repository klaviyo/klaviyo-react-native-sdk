import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, typography, borderRadius } from './theme';

// Shared base styles for DRY
const buttonBase = {
  paddingVertical: spacing.md - 2, // 14px
  paddingHorizontal: spacing.md,
  borderRadius: borderRadius.sm,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  minHeight: 48,
  borderWidth: 1,
  borderColor: colors.primary,
  backgroundColor: colors.cardBackground,
};

const rowContainerBase = {
  flexDirection: 'row' as const,
  marginHorizontal: -spacing.xs / 2, // Negative margin for spacing trick
};

export const styles = StyleSheet.create({
  // Container styles
  // Keep centering here for backwards compatibility with the pre-overhaul App
  // that still ships on feat/example-app. The new sectioned App.tsx (PR 3)
  // replaces this with a top-aligned layout in a separate wrapper style.
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Section styles
  section: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    // Add subtle shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderText: {
    ...typography.sectionHeader,
    color: colors.text,
  },

  // Profile text field styles (label + input + button row)
  profileFieldContainer: {
    marginBottom: spacing.md,
  },
  profileFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  profileFieldLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  profileFieldInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md - 4, // 12px
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.cardBackground,
    // Better height consistency across platforms
    minHeight: 44, // iOS recommended touch target
  },
  profileFieldButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md - 4, // 12px
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    minWidth: 60,
    minHeight: 44, // Match input height
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileFieldButtonDisabled: {
    backgroundColor: colors.disabled,
    opacity: 0.5,
  },
  profileFieldButtonText: {
    ...typography.button,
    color: colors.buttonText,
  },

  // Collapsible styles
  collapsibleContainer: {
    marginBottom: spacing.sm,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  collapsibleTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  collapsibleChevron: {
    ...typography.body,
    color: colors.secondaryText,
  },
  collapsibleContent: {
    marginTop: spacing.sm,
  },

  // Action button styles
  actionButtonRow: {
    ...rowContainerBase,
    marginBottom: spacing.sm,
  },
  actionButton: {
    ...buttonBase,
    marginBottom: spacing.sm,
  },
  actionButtonInRow: {
    flex: 1,
    marginHorizontal: spacing.xs / 2, // Half spacing on each side
    marginBottom: 0, // Remove bottom margin when in row
  },
  actionButtonDestructive: {
    borderColor: colors.destructive,
  },
  actionButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.disabledBackground,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  actionButtonTextDestructive: {
    color: colors.destructive,
  },
  actionButtonTextDisabled: {
    color: colors.secondaryText,
  },
  actionButtonWithTopSpacing: {
    marginTop: spacing.sm,
  },

  // Toggle button styles
  toggleContainer: {
    ...rowContainerBase,
  },
  toggleButton: {
    ...buttonBase,
    flex: 1,
    marginHorizontal: spacing.xs / 2, // Half spacing on each side = full spacing between buttons
  },
  toggleButtonActive: {
    backgroundColor: colors.activeButtonTint,
  },
  toggleButtonText: {
    ...typography.button,
    color: colors.secondaryText,
  },
  toggleButtonTextActive: {
    color: colors.primary,
  },
  toggleButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.disabledBackground,
  },
  toggleButtonTextDisabled: {
    color: colors.secondaryText,
  },

  // Permission granted text styles
  permissionGrantedContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cardBackground,
    borderWidth: 0,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  permissionGrantedText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },

  // Push token display styles
  pushTokenContainer: {
    backgroundColor: colors.disabledBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pushTokenLabel: {
    ...typography.label,
    color: colors.secondaryText,
    marginBottom: spacing.xs,
  },
  pushTokenText: {
    fontSize: 12, // Smaller for long tokens
    color: colors.text,
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
    }),
    lineHeight: 18,
  },
  pushTokenEmpty: {
    color: colors.placeholderText,
    fontStyle: 'italic',
  },

  // Permission status display styles
  permissionStatusContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.disabledBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  permissionStatusLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },

  // Warning message styles
  warningContainer: {
    backgroundColor: colors.warningBackground,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  warningText: {
    ...typography.body,
    color: colors.warningText,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  warningSubtext: {
    ...typography.body,
    fontSize: 14,
    color: colors.warningText,
    marginLeft: spacing.sm,
    marginTop: spacing.xs / 2,
  },
});

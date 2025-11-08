import { StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from './theme';

export const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },

  // Section styles
  section: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    ...typography.sectionHeader,
    color: colors.text,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  },
  profileFieldButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md - 4, // 12px
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    minWidth: 60,
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

  // Action button styles
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md - 2, // 14px
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionButtonDestructive: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.buttonText,
  },
  actionButtonTextDestructive: {
    color: colors.destructive,
  },

  // Toggle button styles
  toggleContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md - 2, // 14px
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleButtonText: {
    ...typography.button,
    color: colors.text,
  },
  toggleButtonTextActive: {
    color: colors.buttonText,
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
    ...typography.body,
    color: colors.text,
    fontFamily: 'Courier',
  },
  pushTokenEmpty: {
    color: colors.placeholderText,
    fontStyle: 'italic',
  },
});

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
  container: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderText: {
    ...typography.sectionHeader,
    color: colors.text,
  },
  sectionHeaderActionIcon: {
    fontSize: 18,
    color: colors.secondaryText,
  },
  sectionHeaderActionIconDisabled: {
    color: colors.disabled,
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

  // Consent toggle styles
  consentToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  consentToggleLabel: {
    ...typography.body,
    color: colors.text,
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  consentToggleLabelDisabled: {
    color: colors.secondaryText,
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
  // Opt-in spacing for a warning that sits above other content. Matches
  // profileFieldContainer's bottom margin so the vertical rhythm lines up.
  // Not folded into warningContainer, which renders as the only child in
  // PushSection and would gain a trailing gap.
  warningContainerWithBottomSpacing: {
    marginBottom: spacing.md,
  },
  // Collapsible warning: tappable headline row + chevron. Mirrors the
  // collapsible* styles so the affordance reads the same as the rest of the app,
  // but keeps the warning palette.
  warningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warningHeaderText: {
    ...typography.body,
    color: colors.warningText,
    fontWeight: '600',
    // Shrink rather than push the chevron off the row on narrow screens.
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  warningChevron: {
    ...typography.body,
    color: colors.warningText,
  },
  warningCollapsibleContent: {
    marginTop: spacing.xs,
  },

  // Inbox screen styles. The Inbox is a validation tool, so it follows the
  // test apps' mail-client look: unread bold on white, read on grey, archived
  // tinted red, and a red unread badge.
  inboxSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  inboxSummaryColumn: {
    flex: 1,
  },
  inboxSummaryHeadline: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  inboxSummarySubtext: {
    ...typography.label,
    color: colors.secondaryText,
    marginTop: spacing.xs / 2,
  },
  inboxUnreadBadge: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  inboxUnreadBadgeText: {
    color: colors.buttonText,
    fontWeight: '700',
    fontSize: 14,
  },
  inboxFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  inboxFilterLabel: {
    ...typography.label,
    color: colors.secondaryText,
    width: 56,
  },
  inboxFilterOptions: {
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: -spacing.xs / 2,
  },
  inboxFilterButton: {
    ...buttonBase,
    flex: 1,
    minHeight: 36,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.xs / 2,
  },
  inboxFilterButtonActive: {
    backgroundColor: colors.activeButtonTint,
  },
  inboxFilterButtonText: {
    ...typography.label,
    color: colors.primary,
  },
  inboxStateNotice: {
    backgroundColor: '#FBDADA',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  inboxStateNoticeText: {
    ...typography.label,
    color: colors.destructive,
  },
  inboxError: {
    ...typography.label,
    color: colors.destructive,
    marginBottom: spacing.sm,
  },
  inboxPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.disabledBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: 1,
  },
  inboxPageHeaderText: {
    ...typography.label,
    color: colors.secondaryText,
  },
  inboxMessageRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inboxMessageRowUnread: {
    backgroundColor: colors.cardBackground,
  },
  inboxMessageRowRead: {
    backgroundColor: colors.disabledBackground,
  },
  inboxMessageRowArchived: {
    backgroundColor: '#FBDADA',
  },
  inboxMessageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inboxUnreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  inboxUnreadDotHidden: {
    backgroundColor: 'transparent',
  },
  inboxMessageTitle: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  inboxMessageTitleUnread: {
    fontWeight: '700',
  },
  inboxMessageBody: {
    ...typography.label,
    color: colors.secondaryText,
    marginTop: spacing.xs / 2,
  },
  inboxMessageTime: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: spacing.xs / 2,
  },
  inboxMessageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  inboxStateButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  inboxStateButtonText: {
    ...typography.label,
    color: colors.primary,
  },
  inboxDetailsToggle: {
    marginLeft: 'auto',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  inboxDetailsToggleText: {
    ...typography.label,
    color: colors.primary,
  },
  inboxDetails: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  inboxDetailRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs / 2,
  },
  inboxDetailLabel: {
    ...typography.label,
    color: colors.secondaryText,
    width: 128,
  },
  inboxDetailValue: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
    }),
  },
  inboxEmpty: {
    ...typography.label,
    color: colors.secondaryText,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  inboxFooter: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  inboxFooterText: {
    ...typography.label,
    color: colors.secondaryText,
    marginTop: spacing.xs,
  },
  inboxRefreshButton: {
    ...buttonBase,
    marginTop: spacing.sm,
  },
  inboxDiagnosticsValue: {
    ...typography.label,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
});

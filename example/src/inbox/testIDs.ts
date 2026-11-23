/**
 * testIDs for the Inbox validation section and screen (MAGE-1781).
 *
 * Names follow the app-wide `{area}_{element}` snake_case convention. Where
 * the native test apps already name the same control, the name matches theirs
 * so one automation pass can target all three apps: the Android test app's
 * `inbox_read_filter_{name}`, `inbox_archive_filter_{name}`,
 * `inbox_page_button_{index}`, `inbox_message_{id}`, `inbox_read_toggle_{id}`,
 * `inbox_archive_toggle_{id}`, `inbox_state_notice` and `inbox_unread_badge`.
 */
export const InboxTestIDs = {
  // Entry points
  HOME_ENTRY_BUTTON: 'inbox_home_entry_button',
  SCREEN: 'inbox_screen',

  // Availability / empty build
  UNAVAILABLE: 'inbox_unavailable_text',

  // Diagnostics
  DIAGNOSTICS_TOGGLE: 'inbox_diagnostics_toggle',
  DIAGNOSTICS_SUMMARY: 'inbox_summary_text',
  CHANGE_SIGNAL_COUNT: 'inbox_change_signal_count_text',
  LAST_CHANGE: 'inbox_last_change_text',
  NEXT_CURSOR: 'inbox_next_cursor_text',
  CAPABILITIES: 'inbox_capabilities_text',

  // Page size
  PAGE_SIZE_STEPPER: 'inbox_page_size_stepper',
  PAGE_SIZE_DECREASE: 'inbox_page_size_decrease_button',
  PAGE_SIZE_INCREASE: 'inbox_page_size_increase_button',
  PAGE_SIZE_VALUE: 'inbox_page_size_value',

  // Summary and filters
  SUMMARY: 'inbox_pages_result',
  UNREAD_BADGE: 'inbox_unread_badge',
  readFilter: (name: string) => `inbox_read_filter_${name}`,
  archiveFilter: (name: string) => `inbox_archive_filter_${name}`,

  // States
  STATE_NOTICE: 'inbox_state_notice',
  ERROR: 'inbox_error_label',
  EMPTY: 'inbox_empty_label',

  // Messages
  message: (id: string) => `inbox_message_${id}`,
  readToggle: (id: string) => `inbox_read_toggle_${id}`,
  archiveToggle: (id: string) => `inbox_archive_toggle_${id}`,
  detailsToggle: (id: string) => `inbox_details_button_${id}`,
  details: (id: string) => `inbox_details_${id}`,
  pageHeader: (index: number) => `inbox_page_header_${index}`,

  // Paging
  FETCH_NEXT_PAGE_BUTTON: 'inbox_fetch_next_page_button',
  PAGE_COUNT_TEXT: 'inbox_page_count_text',
  END_OF_INBOX_TEXT: 'inbox_end_of_inbox_text',
} as const;

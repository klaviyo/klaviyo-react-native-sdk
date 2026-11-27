import { useEffect } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  InboxArchiveFilter,
  InboxReadFilter,
  type InboxMessage,
} from 'klaviyo-react-native-sdk';

import { useInbox } from '../hooks/useInbox';
import { styles } from '../Styles';
import { Collapsible } from '../components/Collapsible';
import { InboxMessageRow } from './InboxMessageRow';
import { InboxTestIDs } from './testIDs';
import {
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  pagesSummary,
  type InboxFilters,
} from './pages';

/** The filter buttons, "All" first in each row. */
const READ_FILTERS: InboxReadFilter[] = [
  InboxReadFilter.All,
  InboxReadFilter.Unread,
  InboxReadFilter.Read,
];
const ARCHIVE_FILTERS: InboxArchiveFilter[] = [
  InboxArchiveFilter.All,
  InboxArchiveFilter.Active,
  InboxArchiveFilter.Archived,
];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * The Inbox validation screen. It calls the wrapper's public Mobile Inbox API
 * and shows what each call returned; it is not a customer Inbox UI and never
 * opens a deep link or runs a message action.
 */
export function InboxScreen() {
  const inbox = useInbox();

  // A state notice belongs to the change that caused it; drop it once the
  // notice has been read rather than leaving it on screen indefinitely.
  useEffect(() => {
    if (inbox.stateNotice === null) return;
    const timer = setTimeout(inbox.clearStateNotice, 8000);
    return () => clearTimeout(timer);
  }, [inbox.stateNotice, inbox.clearStateNotice]);

  if (!inbox.available) {
    return (
      <View style={styles.section} testID={InboxTestIDs.SCREEN}>
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Inbox not included in this build
          </Text>
          <Text style={styles.warningSubtext} testID={InboxTestIDs.UNAVAILABLE}>
            The native inbox module is not linked into this app. Set
            KLAVIYO_INCLUDE_INBOX to "true" in the iOS Podfile and
            klaviyoIncludeInbox to true in Android's gradle.properties, then
            rebuild.
          </Text>
        </View>
      </View>
    );
  }

  const canLoadMore =
    inbox.pages.hasLoaded &&
    inbox.pages.nextCursor !== null &&
    !inbox.isLoading;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      testID={InboxTestIDs.SCREEN}
      refreshControl={
        <RefreshControl
          refreshing={inbox.isRefreshing}
          onRefresh={inbox.refresh}
        />
      }
    >
      <View style={styles.section}>
        <InboxSummary inbox={inbox} />
        <InboxFilters filters={inbox.filters} onChange={inbox.setFilters} />
        {inbox.stateNotice !== null && (
          <View
            style={styles.inboxStateNotice}
            testID={InboxTestIDs.STATE_NOTICE}
          >
            <Text style={styles.inboxStateNoticeText}>{inbox.stateNotice}</Text>
          </View>
        )}
        {inbox.errorMessage !== null && (
          <Text style={styles.inboxError} testID={InboxTestIDs.ERROR}>
            {inbox.errorMessage}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        {inbox.messages.length === 0 ? (
          <InboxEmpty inbox={inbox} />
        ) : (
          inbox.pages.pages.map((page, index) => (
            <View key={index}>
              <View
                style={styles.inboxPageHeader}
                testID={InboxTestIDs.pageHeader(index + 1)}
              >
                <Text style={styles.inboxPageHeaderText}>Page {index + 1}</Text>
                <Text style={styles.inboxPageHeaderText}>
                  {page.length} {page.length === 1 ? 'message' : 'messages'}
                </Text>
              </View>
              {page.map((message: InboxMessage) => (
                <InboxMessageRow
                  key={message.id}
                  message={message}
                  onSetState={inbox.updateMessageState}
                />
              ))}
            </View>
          ))
        )}

        <View style={styles.inboxFooter}>
          {inbox.isLoading && (
            <>
              <ActivityIndicator />
              <Text style={styles.inboxFooterText}>
                {inbox.pages.hasLoaded ? 'Loading next page…' : 'Loading…'}
              </Text>
            </>
          )}
          {canLoadMore && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={inbox.loadNextPage}
              testID={InboxTestIDs.FETCH_NEXT_PAGE_BUTTON}
              accessibilityRole="button"
              accessibilityLabel="Load next page"
            >
              <Text style={styles.actionButtonText}>
                Load page {inbox.pages.pages.length + 1}
              </Text>
            </TouchableOpacity>
          )}
          {inbox.pages.hasLoaded &&
            inbox.pages.nextCursor === null &&
            inbox.messages.length > 0 && (
              <Text
                style={styles.inboxFooterText}
                testID={InboxTestIDs.END_OF_INBOX_TEXT}
              >
                End of inbox
              </Text>
            )}
          {inbox.pages.hasLoaded && inbox.messages.length > 0 && (
            <Text
              style={styles.inboxFooterText}
              testID={InboxTestIDs.PAGE_COUNT_TEXT}
            >
              {inbox.messages.length} messages · {inbox.pages.pages.length}{' '}
              {inbox.pages.pages.length === 1 ? 'page' : 'pages'} · page size{' '}
              {inbox.pageSize}
            </Text>
          )}
          <TouchableOpacity
            style={styles.inboxRefreshButton}
            onPress={inbox.refresh}
            testID="inbox_refresh_button"
            accessibilityRole="button"
            accessibilityLabel="Refresh inbox"
          >
            <Text style={styles.actionButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Collapsible
          title="Diagnostics"
          testID={InboxTestIDs.DIAGNOSTICS_TOGGLE}
        >
          <DiagnosticRow
            label="Change signals"
            value={String(inbox.changeSignalCount)}
            testID={InboxTestIDs.CHANGE_SIGNAL_COUNT}
          />
          <DiagnosticRow
            label="Last change"
            value={
              inbox.lastChangeAt === null
                ? 'None'
                : new Date(inbox.lastChangeAt).toLocaleTimeString()
            }
            testID={InboxTestIDs.LAST_CHANGE}
          />
          <DiagnosticRow
            label="Next cursor"
            value={
              inbox.pages.nextCursor === null ? 'None (last page)' : 'Present'
            }
            testID={InboxTestIDs.NEXT_CURSOR}
          />
          <DiagnosticRow
            label="Page size"
            value={String(inbox.pageSize)}
            testID={InboxTestIDs.PAGE_SIZE_VALUE}
          />
          <View style={styles.inboxFilterRow}>
            <Text style={styles.inboxFilterLabel}>Size</Text>
            <View style={styles.inboxFilterOptions}>
              <TouchableOpacity
                style={styles.inboxFilterButton}
                onPress={() => inbox.setPageSize(inbox.pageSize - 1)}
                disabled={inbox.pageSize <= MIN_PAGE_SIZE}
                testID={InboxTestIDs.PAGE_SIZE_DECREASE}
                accessibilityRole="button"
                accessibilityLabel="Decrease page size"
              >
                <Text style={styles.inboxFilterButtonText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inboxFilterButton}
                onPress={() => inbox.setPageSize(inbox.pageSize + 1)}
                disabled={inbox.pageSize >= MAX_PAGE_SIZE}
                testID={InboxTestIDs.PAGE_SIZE_INCREASE}
                accessibilityRole="button"
                accessibilityLabel="Increase page size"
              >
                <Text style={styles.inboxFilterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Collapsible>
      </View>
    </ScrollView>
  );
}

function InboxSummary({ inbox }: { inbox: ReturnType<typeof useInbox> }) {
  return (
    <View style={styles.inboxSummaryRow}>
      <View style={styles.inboxSummaryColumn}>
        <Text style={styles.inboxSummaryHeadline} testID={InboxTestIDs.SUMMARY}>
          {pagesSummary(inbox.pages)}
        </Text>
        <Text style={styles.inboxSummarySubtext}>
          {inbox.filters.read} read · {inbox.filters.archive} archive ·{' '}
          {inbox.changeSignalCount} signals
        </Text>
      </View>
      {inbox.unreadCount > 0 && (
        <View
          style={styles.inboxUnreadBadge}
          testID={InboxTestIDs.UNREAD_BADGE}
          accessibilityLabel={`${inbox.unreadCount} unread, not archived`}
        >
          <Text style={styles.inboxUnreadBadgeText}>{inbox.unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

function FilterButtons<T extends string>({
  label,
  options,
  selected,
  testID,
  onSelect,
}: {
  label: string;
  options: readonly T[];
  selected: T;
  testID: (option: T) => string;
  onSelect: (option: T) => void;
}) {
  return (
    <View style={styles.inboxFilterRow}>
      <Text style={styles.inboxFilterLabel}>{label}</Text>
      <View style={styles.inboxFilterOptions}>
        {options.map((option) => {
          const active = option === selected;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.inboxFilterButton,
                active && styles.inboxFilterButtonActive,
              ]}
              onPress={() => onSelect(option)}
              testID={testID(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={styles.inboxFilterButtonText}>
                {capitalize(option)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function InboxFilters({
  filters,
  onChange,
}: {
  filters: InboxFilters;
  onChange: (filters: InboxFilters) => void;
}) {
  return (
    <>
      <FilterButtons
        label="Read"
        options={READ_FILTERS}
        selected={filters.read}
        testID={InboxTestIDs.readFilter}
        onSelect={(read) => onChange({ ...filters, read })}
      />
      <FilterButtons
        label="Archive"
        options={ARCHIVE_FILTERS}
        selected={filters.archive}
        testID={InboxTestIDs.archiveFilter}
        onSelect={(archive) => onChange({ ...filters, archive })}
      />
    </>
  );
}

function InboxEmpty({ inbox }: { inbox: ReturnType<typeof useInbox> }) {
  let text: string;
  if (!inbox.pages.hasLoaded) {
    text = 'Not fetched yet.';
  } else {
    text =
      'The page is empty. fetchPage returns an empty page until the SDK is ' +
      'initialized and a Klaviyo push is delivered. Send a push with ' +
      'mutable-content: 1 (iOS) or wait for FCM delivery (Android).';
  }
  return (
    <Text style={styles.inboxEmpty} testID={InboxTestIDs.EMPTY}>
      {text}
    </Text>
  );
}

function DiagnosticRow({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID: string;
}) {
  return (
    <View style={styles.inboxDetailRow}>
      <Text style={styles.inboxDetailLabel}>{label}</Text>
      <Text style={styles.inboxDiagnosticsValue} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

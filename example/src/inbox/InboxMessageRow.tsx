import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { InboxMessage, InboxMessageState } from 'klaviyo-react-native-sdk';

import { styles } from '../Styles';
import { InboxTestIDs } from './testIDs';

interface InboxMessageRowProps {
  message: InboxMessage;
  onSetState: (messageId: string, state: InboxMessageState) => void;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'medium',
});

function formatTime(ms: number | undefined): string | null {
  if (ms === undefined) return null;
  return dateFormatter.format(new Date(ms));
}

/**
 * One message, styled the way a mail client shows it: unread is bold on white,
 * read is regular on grey, and archived is tinted red whether or not it was
 * read. The two buttons are labelled with the change a tap makes, not the
 * current state.
 *
 * This is a validation row, not a customer inbox: it never opens the message's
 * destination or runs any of its actions.
 */
export function InboxMessageRow({ message, onSetState }: InboxMessageRowProps) {
  const [showDetails, setShowDetails] = useState(false);

  const rowStyle = message.isArchived
    ? styles.inboxMessageRowArchived
    : message.isRead
      ? styles.inboxMessageRowRead
      : styles.inboxMessageRowUnread;

  const received = formatTime(message.receivedAt);

  return (
    <View
      style={[styles.inboxMessageRow, rowStyle]}
      testID={InboxTestIDs.message(message.id)}
    >
      <View style={styles.inboxMessageTitleRow}>
        <View
          style={[
            styles.inboxUnreadDot,
            message.isRead && styles.inboxUnreadDotHidden,
          ]}
        />
        <Text
          style={[
            styles.inboxMessageTitle,
            !message.isRead && styles.inboxMessageTitleUnread,
          ]}
          numberOfLines={1}
        >
          {message.title ?? '(no title)'}
        </Text>
      </View>
      {message.body !== undefined && message.body.length > 0 && (
        <Text style={styles.inboxMessageBody} numberOfLines={2}>
          {message.body}
        </Text>
      )}
      {received !== null && (
        <Text style={styles.inboxMessageTime}>{received}</Text>
      )}

      <View style={styles.inboxMessageActions}>
        <TouchableOpacity
          style={styles.inboxStateButton}
          onPress={() =>
            onSetState(message.id, message.isRead ? 'unread' : 'read')
          }
          testID={InboxTestIDs.readToggle(message.id)}
          accessibilityRole="button"
          accessibilityLabel={message.isRead ? 'Mark unread' : 'Mark read'}
        >
          <Text style={styles.inboxStateButtonText}>
            {message.isRead ? 'Mark unread' : 'Mark read'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.inboxStateButton}
          onPress={() =>
            onSetState(
              message.id,
              message.isArchived ? 'unarchived' : 'archived'
            )
          }
          testID={InboxTestIDs.archiveToggle(message.id)}
          accessibilityRole="button"
          accessibilityLabel={message.isArchived ? 'Unarchive' : 'Archive'}
        >
          <Text style={styles.inboxStateButtonText}>
            {message.isArchived ? 'Unarchive' : 'Archive'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.inboxDetailsToggle}
          onPress={() => setShowDetails((prev) => !prev)}
          testID={InboxTestIDs.detailsToggle(message.id)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showDetails }}
        >
          <Text style={styles.inboxDetailsToggleText}>
            {showDetails ? 'Hide details' : 'Details'}
          </Text>
        </TouchableOpacity>
      </View>

      {showDetails && <InboxMessageDetails message={message} />}
    </View>
  );
}

/** The raw SDK values, kept for validation and out of the way until asked for. */
function InboxMessageDetails({ message }: { message: InboxMessage }) {
  const rows = useMemo(() => {
    const entries: { label: string; value: string }[] = [];
    const add = (label: string, value: string | undefined | null) => {
      if (value !== undefined && value !== null && value !== '') {
        entries.push({ label, value });
      }
    };

    add('id', message.id);
    add('source', message.source);
    add('sentAt', formatTime(message.sentAt) ?? undefined);
    add('receivedAt', formatTime(message.receivedAt) ?? undefined);
    add(
      'defaultDestination',
      message.defaultDestination.url
        ? `${message.defaultDestination.type}: ${message.defaultDestination.url}`
        : message.defaultDestination.type
    );
    add(
      'media',
      message.mediaUrl
        ? `${message.mediaUrl}${message.mediaType ? ` (${message.mediaType})` : ''}`
        : undefined
    );
    add('collapseId', message.collapseId);
    add(
      'badge',
      message.badge === null ? undefined : message.badge?.toString()
    );
    message.actions.forEach((action, index) => {
      const destination = action.destination.url
        ? `${action.destination.type}: ${action.destination.url}`
        : action.destination.type;
      add(
        `action ${index + 1} (${action.id})`,
        `${action.label}: ${destination}`
      );
    });
    Object.entries(message.customData)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => add(`customData.${key}`, value));

    return entries;
  }, [message]);

  return (
    <View style={styles.inboxDetails} testID={InboxTestIDs.details(message.id)}>
      {rows.map(({ label, value }) => (
        <View style={styles.inboxDetailRow} key={label}>
          <Text style={styles.inboxDetailLabel}>{label}</Text>
          <Text style={styles.inboxDetailValue} selectable>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

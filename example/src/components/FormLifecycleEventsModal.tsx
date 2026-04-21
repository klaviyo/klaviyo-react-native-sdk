import React from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FormLifecycleEventType } from 'klaviyo-react-native-sdk';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { FormLifecycleLogEntry } from '../hooks/useForms';

interface FormLifecycleEventsModalProps {
  visible: boolean;
  events: FormLifecycleLogEntry[];
  onClose: () => void;
  onClear: () => void;
}

const eventLabel = (type: FormLifecycleEventType): string => {
  switch (type) {
    case FormLifecycleEventType.Shown:
      return 'Shown';
    case FormLifecycleEventType.Dismissed:
      return 'Dismissed';
    case FormLifecycleEventType.CtaClicked:
      return 'CTA Clicked';
  }
};

const formatTimestamp = (ms: number): string => {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d
    .getMilliseconds()
    .toString()
    .padStart(3, '0')}`;
};

export const FormLifecycleEventsModal: React.FC<
  FormLifecycleEventsModalProps
> = ({ visible, events, onClose, onClear }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {`Form Lifecycle Events (${events.length})`}
          </Text>
          {events.length === 0 ? (
            <Text style={styles.emptyText}>
              No form lifecycle events received yet. Register for in-app forms
              and trigger one in your Klaviyo account.
            </Text>
          ) : (
            <FlatList<FormLifecycleLogEntry>
              data={events}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const { event, receivedAt } = item;
                return (
                  <View style={styles.eventItem}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventType}>
                        {eventLabel(event.type)}
                      </Text>
                      <Text style={styles.eventTime}>
                        {formatTimestamp(receivedAt)}
                      </Text>
                    </View>
                    {/* Values are JSON.stringify'd so the modal functions as a
                        protocol inspector — empty strings render as "" instead
                        of being collapsed into placeholder text. */}
                    <Text
                      style={styles.eventDetail}
                    >{`formId: ${JSON.stringify(event.formId)}`}</Text>
                    <Text
                      style={styles.eventDetail}
                    >{`formName: ${JSON.stringify(event.formName)}`}</Text>
                    {event.type === FormLifecycleEventType.CtaClicked && (
                      <>
                        <Text
                          style={styles.eventDetail}
                        >{`buttonLabel: ${JSON.stringify(event.buttonLabel)}`}</Text>
                        <Text
                          style={styles.eventDetail}
                        >{`deepLinkUrl: ${JSON.stringify(event.deepLinkUrl)}`}</Text>
                      </>
                    )}
                  </View>
                );
              }}
            />
          )}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={onClear}
              disabled={events.length === 0}
            >
              <Text
                style={[
                  styles.buttonText,
                  events.length === 0 && styles.buttonTextDisabled,
                ]}
              >
                Clear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.mdlg,
  },
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.mdlg,
    width: '100%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center' as const,
  },
  emptyText: {
    ...typography.label,
    color: colors.secondaryText,
    textAlign: 'center' as const,
    marginBottom: spacing.md,
    fontStyle: 'italic' as const,
  },
  eventItem: {
    paddingVertical: spacing.smmd,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  eventType: {
    ...typography.label,
    fontWeight: '600' as const,
    color: colors.text,
  },
  eventTime: {
    fontSize: 12,
    color: colors.secondaryText,
    fontFamily: 'monospace',
  },
  eventDetail: {
    fontSize: 12,
    color: colors.secondaryText,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.smmd,
    borderRadius: borderRadius.sm,
    alignItems: 'center' as const,
  },
  clearButton: {
    backgroundColor: colors.border,
  },
  closeButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    ...typography.button,
    color: colors.buttonText,
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
});

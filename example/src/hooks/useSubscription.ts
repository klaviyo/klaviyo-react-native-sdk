import { useState } from 'react';
import { Alert } from 'react-native';
import {
  Klaviyo,
  EmailConsent,
  MessagingConsent,
  allAvailableMarketing,
  type SubscriptionChannels,
} from 'klaviyo-react-native-sdk';

export function useSubscription() {
  // Target list
  const [listId, setListId] = useState('');
  const [customSource, setCustomSource] = useState('');

  // Broad grant — when on, the per-channel consent below is ignored
  const [allMarketing, setAllMarketing] = useState(false);

  // Per-channel consent
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [emailOpenTracking, setEmailOpenTracking] = useState(false);
  const [smsMarketing, setSmsMarketing] = useState(false);
  const [smsTransactional, setSmsTransactional] = useState(false);
  const [whatsappMarketing, setWhatsappMarketing] = useState(false);
  const [whatsappTransactional, setWhatsappTransactional] = useState(false);

  // Builds the channels object, omitting any channel with nothing selected so we
  // never send an empty consent array the native SDK would just warn about.
  const buildChannels = (): SubscriptionChannels => {
    const email: EmailConsent[] = [];
    if (emailMarketing) email.push(EmailConsent.Marketing);
    if (emailOpenTracking) email.push(EmailConsent.OpenTracking);

    const sms: MessagingConsent[] = [];
    if (smsMarketing) sms.push(MessagingConsent.Marketing);
    if (smsTransactional) sms.push(MessagingConsent.Transactional);

    const whatsapp: MessagingConsent[] = [];
    if (whatsappMarketing) whatsapp.push(MessagingConsent.Marketing);
    if (whatsappTransactional) whatsapp.push(MessagingConsent.Transactional);

    return {
      ...(email.length > 0 && { email }),
      ...(sms.length > 0 && { sms }),
      ...(whatsapp.length > 0 && { whatsapp }),
    };
  };

  const handleCreateSubscription = () => {
    const trimmedListId = listId.trim();
    if (!trimmedListId) {
      Alert.alert(
        'List ID required',
        'Enter the ID of the Klaviyo list to subscribe this profile to.'
      );
      return;
    }

    // An empty custom source would be sent as an empty $source label, so drop it.
    const source = customSource.trim() || undefined;

    if (allMarketing) {
      console.log(
        `[useSubscription] subscribing to ${trimmedListId} → all available marketing`
      );
      Klaviyo.createSubscription(allAvailableMarketing(trimmedListId, source));
      return;
    }

    const channels = buildChannels();
    if (Object.keys(channels).length === 0) {
      Alert.alert(
        'No consent selected',
        'Choose at least one channel consent type, or turn on "All available marketing".'
      );
      return;
    }

    console.log(
      `[useSubscription] subscribing to ${trimmedListId} → ${JSON.stringify(channels)}`
    );
    Klaviyo.createSubscription({
      listId: trimmedListId,
      channels,
      customSource: source,
    });
  };

  return {
    // Target list
    listId,
    setListId,
    customSource,
    setCustomSource,

    // Broad grant
    allMarketing,
    setAllMarketing,

    // Per-channel consent
    emailMarketing,
    setEmailMarketing,
    emailOpenTracking,
    setEmailOpenTracking,
    smsMarketing,
    setSmsMarketing,
    smsTransactional,
    setSmsTransactional,
    whatsappMarketing,
    setWhatsappMarketing,
    whatsappTransactional,
    setWhatsappTransactional,

    // Handlers
    handleCreateSubscription,
  };
}

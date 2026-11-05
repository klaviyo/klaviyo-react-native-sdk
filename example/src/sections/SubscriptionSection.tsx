import { Text, View } from 'react-native';

import { useSubscription } from '../hooks/useSubscription';
import { styles } from '../Styles';
import { ActionButton } from '../components/ActionButton';
import { Collapsible } from '../components/Collapsible';
import { CollapsibleWarning } from '../components/CollapsibleWarning';
import { ConsentToggle } from '../components/ConsentToggle';
import { ProfileTextField } from '../components/ProfileTextField';

export function SubscriptionSection() {
  const subscription = useSubscription();

  return (
    <View style={styles.section}>
      <CollapsibleWarning
        title="Set an email or phone number first"
        testID="subscription_identifier_warning_toggle"
      >
        <Text style={styles.warningSubtext}>
          The native SDK drops a subscription whose channel has no matching
          identifier on the profile. Use Profile &amp; Events above to set one.
        </Text>
      </CollapsibleWarning>
      <ProfileTextField
        label="List ID"
        testID="subscription_list_id"
        value={subscription.listId}
        onChangeText={subscription.setListId}
        placeholder="ABC123"
      />
      <ProfileTextField
        label="Custom Source (optional)"
        testID="subscription_custom_source"
        value={subscription.customSource}
        onChangeText={subscription.setCustomSource}
        placeholder="Checkout screen"
      />
      <ConsentToggle
        label="All available marketing"
        testID="subscription_all_marketing_switch"
        value={subscription.allMarketing}
        onValueChange={subscription.setAllMarketing}
      />
      {/*
        Requesting all-available-marketing lets the server pick the channels, so the
        per-channel picker below is disabled rather than hidden — leaving it visible
        makes it clear which choices are being superseded.
      */}
      <Collapsible
        title="Channel Consent"
        testID="subscription_channel_consent_toggle"
      >
        <ConsentToggle
          label="Email — Marketing"
          testID="subscription_email_marketing_switch"
          value={subscription.emailMarketing}
          onValueChange={subscription.setEmailMarketing}
          disabled={subscription.allMarketing}
        />
        <ConsentToggle
          label="Email — Open Tracking"
          testID="subscription_email_open_tracking_switch"
          value={subscription.emailOpenTracking}
          onValueChange={subscription.setEmailOpenTracking}
          disabled={subscription.allMarketing}
        />
        <ConsentToggle
          label="SMS — Marketing"
          testID="subscription_sms_marketing_switch"
          value={subscription.smsMarketing}
          onValueChange={subscription.setSmsMarketing}
          disabled={subscription.allMarketing}
        />
        <ConsentToggle
          label="SMS — Transactional"
          testID="subscription_sms_transactional_switch"
          value={subscription.smsTransactional}
          onValueChange={subscription.setSmsTransactional}
          disabled={subscription.allMarketing}
        />
        <ConsentToggle
          label="WhatsApp — Marketing"
          testID="subscription_whatsapp_marketing_switch"
          value={subscription.whatsappMarketing}
          onValueChange={subscription.setWhatsappMarketing}
          disabled={subscription.allMarketing}
        />
        <ConsentToggle
          label="WhatsApp — Transactional"
          testID="subscription_whatsapp_transactional_switch"
          value={subscription.whatsappTransactional}
          onValueChange={subscription.setWhatsappTransactional}
          disabled={subscription.allMarketing}
        />
      </Collapsible>
      <ActionButton
        title="Subscribe"
        testID="subscription_subscribe_button"
        onPress={subscription.handleCreateSubscription}
        disabled={!subscription.listId.trim()}
        withTopSpacing
      />
    </View>
  );
}

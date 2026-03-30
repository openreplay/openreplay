import * as React from 'react';

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Openreplay from '@openreplay/react-native';
import { OR_PROJECT_KEY, OR_INGEST_URL } from '@env';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [inputValue, onChangeInput] = React.useState('');
  const [status, setStatus] = React.useState('Not started');

  const start = () => {
    try {
      Openreplay.tracker.startSession(
        OR_PROJECT_KEY,
        {
          crashes: true,
          analytics: true,
          performances: true,
          logs: true,
          screen: true,
          debugLogs: true,
          wifiOnly: false,
          fps: 1,
          screenshotFrequency: 'low',
          screenshotQuality: 'standard',
        },
        OR_INGEST_URL
      );
      Openreplay.patchNetwork(global, () => false, { capturePayload: true });
      setStatus('Session started');
    } catch (e) {
      setStatus(`Start failed: ${e}`);
    }
  };

  React.useEffect(start, []);

  const stop = () => {
    Openreplay.tracker.stop();
    setStatus('Session stopped');
  };

  const showSessionId = async () => {
    try {
      const id = await Openreplay.tracker.getSessionID();
      setStatus(`Session ID: ${id}`);
      Alert.alert('Session ID', id || 'No session ID');
    } catch (e) {
      setStatus(`getSessionID failed: ${e}`);
    }
  };

  const setUserId = () => {
    Openreplay.tracker.setUserID('demo-user@example.com');
    setStatus('User ID set: demo-user@example.com');
  };

  const setAnonymousId = () => {
    Openreplay.tracker.userAnonymousID('anon-12345');
    setStatus('Anonymous ID set: anon-12345');
  };

  const setMetadata = () => {
    Openreplay.tracker.setMetadata('plan', 'enterprise');
    setStatus('Metadata set: plan=enterprise');
  };

  const sendEvent = () => {
    Openreplay.tracker.event(
      'button_clicked',
      JSON.stringify({ screen: 'home', action: 'send_event' })
    );
    setStatus('Event sent: button_clicked');
  };

  const fetchRequest = () => {
    setStatus('Fetching...');
    fetch('https://pokeapi.co/api/v2/pokemon/ditto')
      .then((res) => res.json())
      .then((data) => {
        setStatus(`Fetch OK: ${data.name} (auto-captured)`);
      })
      .catch((e) => {
        setStatus(`Fetch failed: ${e}`);
      });
  };

  const manualNetworkRequest = () => {
    const startTime = Date.now();
    setTimeout(() => {
      const duration = Date.now() - startTime;
      Openreplay.tracker.networkRequest(
        'https://api.example.com/users',
        'POST',
        JSON.stringify({ body: { username: 'demo' } }),
        JSON.stringify({ body: { id: 1, username: 'demo' } }),
        201,
        duration
      );
      setStatus('Manual network request sent (POST /users 201)');
    }, 150);
  };

  const sendGqlMessage = () => {
    const msg = JSON.stringify({
      operationKind: 'query',
      operationName: 'GetUser',
      variables: { id: '123' },
      response: { data: { user: { name: 'Demo User' } } },
      duration: 85,
    });
    Openreplay.sendCustomMessage('gql', msg);
    setStatus('GraphQL message sent: GetUser query');
  };

  return (
    <Openreplay.ORTouchTrackingView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>OpenReplay RN Demo</Text>
        <Text style={styles.status}>{status}</Text>

        <Section title="Session">
          <ActionButton label="Start Session" onPress={start} />
          <ActionButton label="Stop Session" onPress={stop} />
          <ActionButton label="Show Session ID" onPress={showSessionId} />
        </Section>

        <Section title="User Identity">
          <ActionButton label="Set User ID" onPress={setUserId} />
          <ActionButton label="Set Anonymous ID" onPress={setAnonymousId} />
        </Section>

        <Section title="Metadata & Events">
          <ActionButton label="Set Metadata" onPress={setMetadata} />
          <ActionButton label="Send Event" onPress={sendEvent} />
        </Section>

        <Section title="Network">
          <ActionButton label="Fetch Request (auto)" onPress={fetchRequest} />
          <ActionButton
            label="Manual networkRequest"
            onPress={manualNetworkRequest}
          />
        </Section>

        <Section title="Messages">
          <ActionButton label="Send GraphQL Message" onPress={sendGqlMessage} />
        </Section>

        <Section title="View Tracking">
          <Openreplay.ORTrackedView
            screenName="HomeScreen"
            viewName="TrackedSection"
            style={styles.trackedView}
          >
            <Text style={styles.trackedViewText}>
              This view is tracked with screenName="HomeScreen"
              viewName="TrackedSection"
            </Text>
          </Openreplay.ORTrackedView>
        </Section>

        <Section title="Input Tracking">
          <Openreplay.ORTrackedInput
            style={styles.input}
            onChangeText={onChangeInput}
            value={inputValue}
            placeholder="Type here (tracked)"
            trackingLabel="Search Field"
            numberOfLines={1}
          />
        </Section>

        <Section title="Sanitization">
          <Openreplay.ORSanitizedView style={styles.sanitizedView}>
            <Text>This content is masked in session recordings</Text>
            <Text style={styles.sensitiveText}>Sensitive: SSN 123-45-6789</Text>
          </Openreplay.ORSanitizedView>
        </Section>
      </ScrollView>
    </Openreplay.ORTouchTrackingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 4,
  },
  status: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  button: {
    backgroundColor: '#394EFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  trackedView: {
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
  },
  trackedViewText: {
    fontSize: 12,
    color: '#2e7d32',
  },
  sanitizedView: {
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 6,
  },
  sensitiveText: {
    marginTop: 4,
    fontSize: 12,
    color: '#e65100',
  },
});

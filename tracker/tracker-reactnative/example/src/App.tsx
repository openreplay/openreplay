import * as React from 'react';
import { REACT_APP_KEY, REACT_APP_INGEST } from '@env';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import Openreplay from '@openreplay/react-native';

export default function App() {
  const start = () => {
    Openreplay.tracker
      .startSession(
        REACT_APP_KEY!,
        {
          analytics: true,
          crashes: true,
          debugLogs: true,
          logs: true,
          performances: true,
          screen: true,
        },
        REACT_APP_INGEST
      )
      .then((resp: string) => {
        console.log(resp);
        Openreplay.tracker.setMetadata('key', 'value');
        Openreplay.tracker.setUserID('user-id');
      });
    Openreplay.patchNetwork(global, () => false, {});
  };

  React.useEffect(start, []);

  const setMetadata = () => {
    Openreplay.tracker.setMetadata('test', 'data');
  };

  const event = () => {
    Openreplay.tracker.event('test', JSON.stringify({ value: 'keyv' }));
  };

  const setID = () => {
    Openreplay.tracker.setUserID('react-native@connector.me');
  };

  const apiTest = () => {
    fetch('https://pokeapi.co/api/v2/pokemon/ditto')
      .then((res) => res.json())
      .then((res) => console.log(res));
  };

  return (
    <Openreplay.ORTouchTrackingView style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          <TouchableOpacity onPress={setMetadata} style={styles.button}>
            <Text>Set Metadata</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={event} style={styles.button}>
            <Text>Event</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={setID} style={styles.button}>
            <Text>Set User ID</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={apiTest} style={styles.button}>
            <Text>API Test</Text>
          </TouchableOpacity>
          <Openreplay.ORAnalyticsView
            screenName="view title"
            viewName="view name"
            style={styles.analyticsView}
          >
            <Text>This is a tracker view with text</Text>
          </Openreplay.ORAnalyticsView>
          <Openreplay.ORSanitizedView style={styles.sanitizedView}>
            <Text>This is a sanitized view</Text>
          </Openreplay.ORSanitizedView>
        </View>
      </ScrollView>
    </Openreplay.ORTouchTrackingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ccc', // Un-commented for background color
  },
  content: {
    flex: 1,
    width: '90%', // Adjusts the width to use 90% of the container width
    padding: 20,
  },
  button: {
    backgroundColor: '#ddd',
    padding: 10,
    marginTop: 10,
    alignSelf: 'stretch', // Added to make buttons stretch to full width
  },
  analyticsView: {
    padding: 10,
    marginTop: 10,
  },
  sanitizedView: {
    padding: 10,
    marginTop: 10,
    backgroundColor: '#eee',
  },
});

import * as React from 'react';

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Openreplay from '@openreplay/react-native';

export default function App() {
  const [number, onChangeNumber] = React.useState('');

  const start = () => {
    Openreplay.tracker.startSession(
      process.env.REACT_APP_KEY!,
      {},
      process.env.REACT_APP_INGEST
    );
    console.log('test', Openreplay.tracker, 123123);
    Openreplay.patchNetwork(
      global, () => false, {}
    )
  };

  const setMedatada = () => {
    Openreplay.tracker.setMetadata('test', 'data');
  };

  const event = () => {
    Openreplay.tracker.event('test', JSON.stringify({ value: 'keyv' }));
  };

  const setID = () => {
    Openreplay.tracker.setUserID('react-native@connector.me');
  };

  const apiTest = () => {
    fetch('https://pokeapi.co/api/v2/pokemon/ditto').then((res) => {
      return res.json()
    }).then((res) => {
      console.log(res)
    })
  }

  return (
    <Openreplay.ORTouchTrackingView style={styles.container}>
      <View style={styles.container}>
        <Openreplay.ORAnalyticsView
          screenName="view title"
          viewName="view name"
        >
          <Text>This is a tracker view with text</Text>
        </Openreplay.ORAnalyticsView>
        <Openreplay.ORSanitizedView>
          <Text>This is a sanitized view</Text>
        </Openreplay.ORSanitizedView>
        <TouchableOpacity onPress={start}>
          <Text>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={setMedatada}>
          <Text>Set medatada</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={event}>
          <Text>event</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={apiTest}>
          <Text>Request</Text>
        </TouchableOpacity>
        <Openreplay.ORTrackedInput
          style={styles.input}
          onChangeText={onChangeNumber}
          value={number}
          placeholder="useless placeholder"
        />
        <TouchableOpacity onPress={setID}>
          <Text>Set user id</Text>
        </TouchableOpacity>
      </View>
    </Openreplay.ORTouchTrackingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
  input: { height: 30, width: 100, borderWidth: 1 },
});

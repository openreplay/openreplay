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
    Openreplay.tracker.setMetadata('key', 'value');
    Openreplay.tracker.setUserID('user-id');
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

  const showId = async () => {
    const id = await Openreplay.tracker.getSessionID();
    console.log(id, 'test');
  };

  const apiTest = () => {
    fetch('https://pokeapi.co/api/v2/pokemon/ditto')
      .then((res) => {
        return res.json();
      })
      .then((res) => {
        console.log(res);
      });
  };

  return (
    <Openreplay.ORTouchTrackingView style={styles.container}>
      <View style={styles.container}>
        <TouchableOpacity onPress={setMetadata}>
          <Text>Set Metadata</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={showId}>
          <Text>Show ID</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={event}>
          <Text>event</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={setID}>
          <Text>Set user id</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={apiTest}>
          <Text>Request</Text>
        </TouchableOpacity>

        <Openreplay.ORTrackedInput
          style={styles.input}
          onChangeText={onChangeNumber}
          value={number}
          placeholder="Enter a number"
          numberOfLines={1}
        />

        <Openreplay.ORSanitizedView style={styles.sanitizedView}>
          <Text>This is a sanitized view</Text>
        </Openreplay.ORSanitizedView>
      </View>
    </Openreplay.ORTouchTrackingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: '#ccc',
  },
  content: {
    width: '90%', // adjusts the width to use 90% of the container width
    padding: 20,
  },
  button: {
    backgroundColor: '#ddd',
    padding: 10,
    marginTop: 10,
  },
  input: { height: 30, width: 100, borderWidth: 1 },
  sanitizedView: {
    padding: 10,
    marginTop: 10,
    backgroundColor: '#eee',
  },
});

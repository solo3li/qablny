import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MatchView from '../../src/components/MatchView';

export default function IndexRoute() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <MatchView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

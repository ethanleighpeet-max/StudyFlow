import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>StudyFlow</Text>
      <Text style={styles.subtitle}>Study smarter. Live better.</Text>
      <Text style={styles.version}>v0.1.0 — Mobile scaffolding complete</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6366F1',
  },
  subtitle: {
    fontSize: 16,
    color: '#525252',
  },
  version: {
    fontSize: 12,
    color: '#A3A3A3',
    marginTop: 24,
  },
});

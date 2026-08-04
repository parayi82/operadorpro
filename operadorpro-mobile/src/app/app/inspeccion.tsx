import { View, Text, StyleSheet } from 'react-native';

export default function InspeccionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>✅ Inspección Pre-Viaje</Text>
      <Text style={styles.text}>Realizar inspecciones con cámara y geolocalización (en desarrollo)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  text: { fontSize: 14, color: '#666', textAlign: 'center' },
});

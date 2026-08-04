import { View, Text, StyleSheet } from 'react-native';

export default function CobranzaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>💰 Cobranza</Text>
      <Text style={styles.text}>Gestionar cobros y recordatorios por WhatsApp (en desarrollo)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  text: { fontSize: 14, color: '#666', textAlign: 'center' },
});

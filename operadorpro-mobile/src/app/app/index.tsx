import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';

export default function DashboardScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    setLoading(false);
  }

  async function handleLogout() {
    Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Sí, cerrar sesión',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/auth/login');
        },
        style: 'destructive',
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d4a574" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>¡Bienvenido!</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Cartas Porte</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Inspecciones</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Cobranzas</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <TouchableOpacity style={styles.quickAction}>
          <Text style={styles.quickActionText}>📋 Nueva Carta Porte</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <Text style={styles.quickActionText}>✅ Inspeccionar Unidad</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <Text style={styles.quickActionText}>💰 Enviar Recordatorio</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { backgroundColor: '#d4a574', padding: 20, paddingTop: 20 },
  welcome: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  stats: { flexDirection: 'row', padding: 16, gap: 12 },
  stat: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#d4a574', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#666', textAlign: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#333' },
  quickAction: { backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
  quickActionText: { fontSize: 14, fontWeight: '600', color: '#333' },
  logoutButton: { margin: 16, padding: 14, backgroundColor: '#f0f0f0', borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#c00', fontSize: 16, fontWeight: '600' },
});

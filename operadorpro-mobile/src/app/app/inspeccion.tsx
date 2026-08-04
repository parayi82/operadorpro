import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Switch,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';

const CHECKLIST_ITEMS = [
  '🛞 Llantas sin daño',
  '⛽ Combustible suficiente',
  '🔧 Aceite y fluidos',
  '💡 Luces (frente, atrás, stop)',
  '🪟 Espejos sin grietas',
  '🛡️ Parachoques sin daño',
  '🚪 Puertas/cerraduras funcionan',
  '📋 Documentos completos',
  '🔐 Candados/sellos en orden',
  '🧰 Kit de herramientas presente',
];

interface Inspection {
  id: string;
  unit_id: string;
  status: string;
  created_at: string;
}

export default function InspeccionScreen() {
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadInspections();
    requestLocationPermission();
  }, []);

  async function requestLocationPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    }
  }

  async function loadInspections() {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: insp, error } = await supabase
        .from('inspections')
        .select('id, unit_id, status, created_at')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false });

      if (!error && insp) {
        setInspections(insp);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitInspection() {
    const completed = Object.values(checklist).filter(Boolean).length;
    const total = CHECKLIST_ITEMS.length;

    if (completed === 0) {
      Alert.alert('Error', 'Completa al menos un ítem del checklist');
      return;
    }

    setFormLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase.from('inspections').insert([
        {
          user_id: user.user.id,
          unit_id: null,
          status: completed === total ? 'completed' : 'pending',
          checklist,
          location,
        },
      ]);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Éxito',
          `Inspección registrada: ${completed}/${total} ítems completados`
        );
        setChecklist({});
        setTab('list');
        loadInspections();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setFormLoading(false);
    }
  }

  if (tab === 'create') {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => setTab('list')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Nueva Inspección</Text>

        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>
            📍 Ubicación{location ? ' (Registrada)' : ' (Pendiente)'}
          </Text>
          {location && (
            <Text style={styles.locationText}>
              Lat: {location.coords.latitude.toFixed(4)} | Lng:{' '}
              {location.coords.longitude.toFixed(4)}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Checklist de Inspección</Text>

        <View style={styles.checklistContainer}>
          {CHECKLIST_ITEMS.map((item, idx) => (
            <View key={idx} style={styles.checklistItem}>
              <Text style={styles.checklistLabel}>{item}</Text>
              <Switch
                value={checklist[item] || false}
                onValueChange={(val) =>
                  setChecklist({ ...checklist, [item]: val })
                }
                trackColor={{ false: '#ddd', true: '#d4a574' }}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, formLoading && styles.buttonDisabled]}
          onPress={handleSubmitInspection}
          disabled={formLoading}
        >
          {formLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              Guardar Inspección ({Object.values(checklist).filter(Boolean).length}/
              {CHECKLIST_ITEMS.length})
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'list' && styles.tabBtnActive]}
          onPress={() => setTab('list')}
        >
          <Text
            style={[
              styles.tabBtnText,
              tab === 'list' && styles.tabBtnTextActive,
            ]}
          >
            Inspecciones
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'create' && styles.tabBtnActive]}
          onPress={() => setTab('create')}
        >
          <Text
            style={[
              styles.tabBtnText,
              tab === 'create' && styles.tabBtnTextActive,
            ]}
          >
            + Nueva
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#d4a574" />
        </View>
      ) : inspections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No hay inspecciones aún</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setTab('create')}
          >
            <Text style={styles.createBtnText}>Hacer Primera Inspección</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={inspections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.inspCard}>
              <Text style={styles.inspTitle}>Inspección #{item.id.slice(0, 8)}</Text>
              <Text style={styles.inspStatus}>
                {item.status === 'completed'
                  ? '✅ Completada'
                  : '🔄 Pendiente'}
              </Text>
              <Text style={styles.inspDate}>
                {new Date(item.created_at).toLocaleDateString('es-MX')}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#ddd' },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tabBtnActive: { borderBottomWidth: 3, borderBottomColor: '#d4a574' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabBtnTextActive: { color: '#d4a574' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999', marginBottom: 20 },
  createBtn: {
    backgroundColor: '#d4a574',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createBtnText: { color: 'white', fontWeight: '600' },
  backButton: { paddingHorizontal: 16, paddingVertical: 12 },
  backButtonText: { color: '#d4a574', fontSize: 16, fontWeight: '600' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 16,
    color: '#333',
  },
  locationCard: {
    margin: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  locationText: { fontSize: 12, color: '#666', fontFamily: 'monospace' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 12,
    color: '#333',
  },
  checklistContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checklistLabel: { fontSize: 14, color: '#333', flex: 1 },
  button: {
    margin: 16,
    backgroundColor: '#d4a574',
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  listContainer: { padding: 12, gap: 12, paddingBottom: 20 },
  inspCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
  },
  inspTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  inspStatus: { fontSize: 13, color: '#666', marginBottom: 4 },
  inspDate: { fontSize: 12, color: '#999' },
});

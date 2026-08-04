import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { supabase } from '@/utils/supabase';

interface Unit {
  id: string;
  name: string;
  placa: string;
  config_vehicular?: string;
  active: boolean;
  created_at: string;
}

interface Document {
  id: string;
  unit_id: string;
  type: string;
  number?: string;
  expires_at: string;
}

export default function FlotaScreen() {
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [units, setUnits] = useState<Unit[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [name, setName] = useState('');
  const [placa, setPlaca] = useState('');
  const [config, setConfig] = useState('');

  useEffect(() => {
    loadUnits();
  }, []);

  async function loadUnits() {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: u, error: uErr } = await supabase
        .from('units')
        .select('id, name, placa, config_vehicular, active, created_at')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false });

      const { data: d, error: dErr } = await supabase
        .from('unit_documents')
        .select('id, unit_id, type, number, expires_at');

      if (!uErr && u) setUnits(u);
      if (!dErr && d) setDocuments(d);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUnit() {
    if (!name || !placa) {
      Alert.alert('Error', 'Por favor completa nombre y placa');
      return;
    }

    setFormLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase.from('units').insert([
        {
          user_id: user.user.id,
          name,
          placa,
          config_vehicular: config || null,
          active: true,
        },
      ]);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Éxito', `Unidad ${name} creada`);
        setName('');
        setPlaca('');
        setConfig('');
        setTab('list');
        loadUnits();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setFormLoading(false);
    }
  }

  function getDaysUntilExpiry(expiryDate: string): number {
    const today = new Date();
    const expDate = new Date(expiryDate);
    const days = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  }

  function getDocStatus(days: number) {
    if (days < 0) return { text: '❌ Vencido', color: '#c00' };
    if (days <= 7) return { text: `⚠️ ${days}d`, color: '#ff9800' };
    if (days <= 30) return { text: `📍 ${days}d`, color: '#f9a825' };
    return { text: '✅ OK', color: '#27ae60' };
  }

  if (tab === 'create') {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => setTab('list')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Nueva Unidad</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Nombre/Alias</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Torton 01"
            value={name}
            onChangeText={setName}
            editable={!formLoading}
          />

          <Text style={styles.label}>Placa</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: XYZ-123-AB"
            value={placa}
            onChangeText={setPlaca}
            editable={!formLoading}
          />

          <Text style={styles.label}>Configuración Vehicular</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: C3, T3S2, T3S3"
            value={config}
            onChangeText={setConfig}
            editable={!formLoading}
          />

          <TouchableOpacity
            style={[styles.button, formLoading && styles.buttonDisabled]}
            onPress={handleCreateUnit}
            disabled={formLoading}
          >
            {formLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Crear Unidad</Text>
            )}
          </TouchableOpacity>
        </View>
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
          <Text style={[styles.tabBtnText, tab === 'list' && styles.tabBtnTextActive]}>
            Unidades ({units.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'create' && styles.tabBtnActive]}
          onPress={() => setTab('create')}
        >
          <Text style={[styles.tabBtnText, tab === 'create' && styles.tabBtnTextActive]}>
            + Nueva
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#d4a574" />
        </View>
      ) : units.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No hay unidades registradas</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setTab('create')}
          >
            <Text style={styles.createBtnText}>Crear Primera Unidad</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={units}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const unitDocs = documents.filter((d) => d.unit_id === item.id);
            return (
              <View style={styles.unitCard}>
                <View style={styles.unitHeader}>
                  <View>
                    <Text style={styles.unitName}>{item.name}</Text>
                    <Text style={styles.unitPlaca}>{item.placa}</Text>
                  </View>
                  <Text style={styles.unitStatus}>
                    {item.active ? '✅ Activa' : '⛔ Inactiva'}
                  </Text>
                </View>

                {item.config_vehicular && (
                  <Text style={styles.unitConfig}>{item.config_vehicular}</Text>
                )}

                {unitDocs.length > 0 && (
                  <View style={styles.documentsSection}>
                    <Text style={styles.documentsTitle}>📄 Documentos:</Text>
                    <View style={styles.documentsList}>
                      {unitDocs.map((doc) => {
                        const days = getDaysUntilExpiry(doc.expires_at);
                        const status = getDocStatus(days);
                        return (
                          <View key={doc.id} style={styles.docBadge}>
                            <Text style={[styles.docText, { color: status.color }]}>
                              {status.text}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          }}
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
    marginBottom: 20,
    color: '#333',
  },
  form: { padding: 16, gap: 16, paddingBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  button: {
    backgroundColor: '#d4a574',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  listContainer: { padding: 12, gap: 12, paddingBottom: 20 },
  unitCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
  },
  unitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  unitName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  unitPlaca: { fontSize: 14, fontWeight: '600', color: '#d4a574', fontFamily: 'monospace' },
  unitStatus: { fontSize: 12, fontWeight: 'bold', color: '#27ae60' },
  unitConfig: { fontSize: 12, color: '#666', marginBottom: 12 },
  documentsSection: { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 12 },
  documentsTitle: { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 8 },
  documentsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  docBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  docText: { fontSize: 11, fontWeight: '600' },
});

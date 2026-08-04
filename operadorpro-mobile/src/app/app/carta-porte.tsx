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

interface CartaPorte {
  id: string;
  folio: string;
  status: string;
  total_weight?: number;
  total_value?: number;
  created_at: string;
}

export default function CartaPorteScreen() {
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [cartas, setCartas] = useState<CartaPorte[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Datos del formulario
  const [remitente, setRemitente] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [merchandise, setMerchandise] = useState('');
  const [peso, setPeso] = useState('');
  const [valor, setValor] = useState('');
  const [vehiculo, setVehiculo] = useState('');

  useEffect(() => {
    loadCartas();
  }, []);

  async function loadCartas() {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: cartas, error } = await supabase
        .from('carta_portes')
        .select('id, folio, status, total_weight, total_value, created_at')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false });

      if (!error && cartas) {
        setCartas(cartas);
      }
    } catch (err) {
      console.error('Error loading cartas:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCarta() {
    if (!remitente || !destinatario || !merchandise || !peso || !valor || !vehiculo) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setFormLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const folio = `CP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

      const { error } = await supabase.from('carta_portes').insert([
        {
          user_id: user.user.id,
          folio,
          remitente_name: remitente,
          destinatario_name: destinatario,
          merchandise_description: merchandise,
          total_weight: parseFloat(peso),
          total_value: parseFloat(valor),
          vehicle_name: vehiculo,
          status: 'draft',
        },
      ]);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Éxito', `Carta Porte ${folio} creada`);
        setRemitente('');
        setDestinatario('');
        setMerchandise('');
        setPeso('');
        setValor('');
        setVehiculo('');
        setTab('list');
        loadCartas();
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
        <TouchableOpacity
          onPress={() => setTab('list')}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Nueva Carta Porte</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Remitente (Origen)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre o empresa"
            value={remitente}
            onChangeText={setRemitente}
            editable={!formLoading}
          />

          <Text style={styles.label}>Destinatario (Destino)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre o empresa"
            value={destinatario}
            onChangeText={setDestinatario}
            editable={!formLoading}
          />

          <Text style={styles.label}>Mercancía</Text>
          <TextInput
            style={styles.input}
            placeholder="Descripción del contenido"
            value={merchandise}
            onChangeText={setMerchandise}
            editable={!formLoading}
          />

          <Text style={styles.label}>Peso (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={peso}
            onChangeText={setPeso}
            keyboardType="decimal-pad"
            editable={!formLoading}
          />

          <Text style={styles.label}>Valor ($)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={valor}
            onChangeText={setValor}
            keyboardType="decimal-pad"
            editable={!formLoading}
          />

          <Text style={styles.label}>Vehículo</Text>
          <TextInput
            style={styles.input}
            placeholder="Placa o nombre"
            value={vehiculo}
            onChangeText={setVehiculo}
            editable={!formLoading}
          />

          <TouchableOpacity
            style={[styles.button, formLoading && styles.buttonDisabled]}
            onPress={handleCreateCarta}
            disabled={formLoading}
          >
            {formLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Crear Carta Porte</Text>
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
            Mis Cartas
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
      ) : cartas.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No hay cartas porte aún</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setTab('create')}
          >
            <Text style={styles.createBtnText}>Crear Primera Carta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cartas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.cartaCard}>
              <View style={styles.cartaHeader}>
                <Text style={styles.cartaFolio}>{item.folio}</Text>
                <Text
                  style={[
                    styles.cartaStatus,
                    item.status === 'completed' ? styles.statusCompleted : styles.statusDraft,
                  ]}
                >
                  {item.status === 'completed' ? '✅ Completado' : '📋 Borrador'}
                </Text>
              </View>
              <View style={styles.cartaMeta}>
                {item.total_weight && (
                  <Text style={styles.cartaMataText}>📦 {item.total_weight} kg</Text>
                )}
                {item.total_value && (
                  <Text style={styles.cartaMataText}>💰 ${item.total_value}</Text>
                )}
              </View>
              <Text style={styles.cartaDate}>
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
  tabBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 3, borderBottomColor: '#d4a574' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabBtnTextActive: { color: '#d4a574' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999', marginBottom: 20 },
  createBtn: { backgroundColor: '#d4a574', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  createBtnText: { color: 'white', fontWeight: '600' },
  backButton: { paddingHorizontal: 16, paddingVertical: 12 },
  backButtonText: { color: '#d4a574', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 20, color: '#333' },
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
  button: { backgroundColor: '#d4a574', paddingVertical: 14, borderRadius: 8, marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  listContainer: { padding: 12, gap: 12, paddingBottom: 20 },
  cartaCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
  },
  cartaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cartaFolio: { fontSize: 16, fontWeight: 'bold', color: '#333', fontFamily: 'monospace' },
  cartaStatus: { fontSize: 12, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusDraft: { backgroundColor: '#f0f0f0', color: '#666' },
  statusCompleted: { backgroundColor: '#d1e7dd', color: '#0f5132' },
  cartaMeta: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  cartaMataText: { fontSize: 13, color: '#666' },
  cartaDate: { fontSize: 12, color: '#999' },
});

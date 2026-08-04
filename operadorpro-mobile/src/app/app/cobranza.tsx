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
  Linking,
} from 'react-native';
import { supabase } from '@/utils/supabase';

interface Collection {
  id: string;
  client_name?: string;
  amount: number;
  status: string;
  due_date: string;
  phone?: string;
  created_at: string;
}

export default function CobranzaScreen() {
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Datos del formulario
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: cols, error } = await supabase
        .from('freight_collections')
        .select('id, client_name, amount, status, due_date, phone, created_at')
        .eq('user_id', data.user.id)
        .order('due_date', { ascending: true });

      if (!error && cols) {
        setCollections(cols);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCollection() {
    if (!clientName || !amount || !phone || !dueDate) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setFormLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase.from('freight_collections').insert([
        {
          user_id: user.user.id,
          client_name: clientName,
          amount: parseFloat(amount),
          phone,
          due_date: dueDate,
          status: 'pending',
          message,
        },
      ]);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Éxito', `Cobranza registrada para ${clientName}`);
        setClientName('');
        setAmount('');
        setPhone('');
        setDueDate('');
        setMessage('');
        setTab('list');
        loadCollections();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setFormLoading(false);
    }
  }

  function openWhatsApp(phone: string, clientName: string) {
    const msg = `Hola ${clientName}, te recordamos que tienes un pendiente de pago. ¿Cuándo podrías hacer el depósito?`;
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp');
    });
  }

  if (tab === 'create') {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => setTab('list')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Nueva Cobranza</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Cliente</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del cliente"
            value={clientName}
            onChangeText={setClientName}
            editable={!formLoading}
          />

          <Text style={styles.label}>Cantidad ($)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!formLoading}
          />

          <Text style={styles.label}>Teléfono (WhatsApp)</Text>
          <TextInput
            style={styles.input}
            placeholder="+52 1234567890"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!formLoading}
          />

          <Text style={styles.label}>Vence el (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-08-31"
            value={dueDate}
            onChangeText={setDueDate}
            editable={!formLoading}
          />

          <Text style={styles.label}>Mensaje personalizado (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Mensaje adicional..."
            value={message}
            onChangeText={setMessage}
            multiline
            editable={!formLoading}
          />

          <TouchableOpacity
            style={[styles.button, formLoading && styles.buttonDisabled]}
            onPress={handleCreateCollection}
            disabled={formLoading}
          >
            {formLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Registrar Cobranza</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const pending = collections.filter((c) => c.status === 'pending');
  const paid = collections.filter((c) => c.status === 'paid');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'list' && styles.tabBtnActive]}
          onPress={() => setTab('list')}
        >
          <Text style={[styles.tabBtnText, tab === 'list' && styles.tabBtnTextActive]}>
            Pendientes ({pending.length})
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
      ) : pending.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {collections.length === 0
              ? 'No hay cobranzas aún'
              : '¡Todas las cobranzas están pagadas!'}
          </Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setTab('create')}
          >
            <Text style={styles.createBtnText}>Crear Cobranza</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.collectionCard}>
              <View style={styles.collectionHeader}>
                <View>
                  <Text style={styles.clientName}>{item.client_name}</Text>
                  <Text style={styles.amount}>${item.amount}</Text>
                </View>
                <Text style={styles.dueDate}>
                  Vence: {new Date(item.due_date).toLocaleDateString('es-MX')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={() => openWhatsApp(item.phone || '', item.client_name || '')}
              >
                <Text style={styles.whatsappBtnText}>📱 Recordar por WhatsApp</Text>
              </TouchableOpacity>
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
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#d4a574',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  listContainer: { padding: 12, gap: 12, paddingBottom: 20 },
  collectionCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
  },
  collectionHeader: { marginBottom: 12 },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  amount: { fontSize: 14, fontWeight: '600', color: '#d4a574', marginBottom: 8 },
  dueDate: { fontSize: 12, color: '#999' },
  whatsappBtn: {
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  whatsappBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },
});

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
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { takePhoto, uploadPhotoToSupabase, getPhotoUrl } from '@/utils/camera';

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

interface ChecklistItem {
  name: string;
  status: 'ok' | 'not_ok' | null; // null = not checked
  photoUri?: string;
  photoPath?: string; // path en Supabase
}

export default function InspeccionScreen() {
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [checklist, setChecklist] = useState<Record<string, ChecklistItem>>({});

  // Inicializar checklist
  useEffect(() => {
    const initialChecklist: Record<string, ChecklistItem> = {};
    CHECKLIST_ITEMS.forEach(item => {
      initialChecklist[item] = { name: item, status: null };
    });
    setChecklist(initialChecklist);
  }, []);

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

  async function handleTakePhoto(itemName: string) {
    setPhotoLoading(true);
    try {
      const photo = await takePhoto();
      if (!photo) {
        setPhotoLoading(false);
        return;
      }

      setChecklist(prev => ({
        ...prev,
        [itemName]: { ...prev[itemName], photoUri: photo.uri },
      }));

      // Subir a Supabase cuando se guarde la inspección
      setPhotoLoading(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setPhotoLoading(false);
    }
  }

  async function handleSubmitInspection() {
    const items = Object.values(checklist);
    const checked = items.filter(i => i.status !== null);

    if (checked.length === 0) {
      Alert.alert('Error', 'Completa al menos un ítem del checklist');
      return;
    }

    setFormLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Subir fotos a Supabase Storage
      const inspectionId = Date.now().toString();
      const checklistWithPhotos: Record<string, ChecklistItem> = {};

      for (const [itemName, item] of Object.entries(checklist)) {
        if (item.photoUri) {
          try {
            const photoPath = await uploadPhotoToSupabase(
              user.user.id,
              inspectionId,
              itemName,
              { uri: item.photoUri, type: 'image/jpeg' }
            );
            checklistWithPhotos[itemName] = { ...item, photoPath };
          } catch (err) {
            console.error('Error uploading photo for', itemName, err);
            checklistWithPhotos[itemName] = item;
          }
        } else {
          checklistWithPhotos[itemName] = item;
        }
      }

      const totalOK = items.filter(i => i.status === 'ok').length;
      const totalItems = items.filter(i => i.status !== null).length;

      const { error } = await supabase.from('inspections').insert([
        {
          user_id: user.user.id,
          unit_id: null,
          status: totalOK === totalItems ? 'completed' : 'failed',
          checklist: checklistWithPhotos,
          location,
        },
      ]);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Éxito',
          `Inspección guardada: ${totalOK}/${totalItems} ítems OK`
        );
        const initialChecklist: Record<string, ChecklistItem> = {};
        CHECKLIST_ITEMS.forEach(item => {
          initialChecklist[item] = { name: item, status: null };
        });
        setChecklist(initialChecklist);
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
          {CHECKLIST_ITEMS.map((item, idx) => {
            const itemData = checklist[item];
            const isOK = itemData?.status === 'ok';
            const isNotOK = itemData?.status === 'not_ok';

            return (
              <View key={idx} style={styles.checklistItem}>
                <View style={styles.checklistItemContent}>
                  <Text style={styles.checklistLabel}>{item}</Text>

                  <View style={styles.checklistButtons}>
                    <TouchableOpacity
                      style={[
                        styles.statusBtn,
                        isOK && styles.statusBtnOK,
                      ]}
                      onPress={() =>
                        setChecklist(prev => ({
                          ...prev,
                          [item]: { ...prev[item], status: 'ok' },
                        }))
                      }
                    >
                      <Text style={[styles.statusBtnText, isOK && styles.statusBtnTextActive]}>
                        ✅ OK
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.statusBtn,
                        isNotOK && styles.statusBtnNotOK,
                      ]}
                      onPress={() =>
                        setChecklist(prev => ({
                          ...prev,
                          [item]: { ...prev[item], status: 'not_ok' },
                        }))
                      }
                    >
                      <Text style={[styles.statusBtnText, isNotOK && styles.statusBtnTextActive]}>
                        ❌ NO OK
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isNotOK && (
                    <TouchableOpacity
                      style={styles.photoBtn}
                      onPress={() => handleTakePhoto(item)}
                      disabled={photoLoading}
                    >
                      {photoLoading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.photoBtnText}>
                          {itemData?.photoUri ? '📸 Foto Capturada' : '📸 Capturar Foto'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {itemData?.photoUri && (
                    <Image
                      source={{ uri: itemData.photoUri }}
                      style={styles.photoPreview}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.button, (formLoading || photoLoading) && styles.buttonDisabled]}
          onPress={handleSubmitInspection}
          disabled={formLoading || photoLoading}
        >
          {formLoading || photoLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              Guardar Inspección ({Object.values(checklist).filter(i => i.status !== null).length}/
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
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checklistItemContent: { gap: 10 },
  checklistLabel: { fontSize: 14, color: '#333', fontWeight: '600' },
  checklistButtons: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  statusBtnOK: { borderColor: '#27ae60', backgroundColor: '#f0f9f6' },
  statusBtnNotOK: { borderColor: '#e74c3c', backgroundColor: '#ffe8e8' },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },
  statusBtnTextActive: { color: 'white' },
  photoBtn: {
    backgroundColor: '#0066cc',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  photoBtnText: { color: 'white', fontSize: 12, fontWeight: '600' },
  photoPreview: { width: '100%', height: 150, borderRadius: 6, marginTop: 8 },
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

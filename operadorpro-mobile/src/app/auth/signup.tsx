import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup() {
    if (!email || !password || !fullName) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Éxito', 'Cuenta creada. Por favor inicia sesión.');
        router.replace('/auth/login');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backButton}>← Atrás</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Crear Cuenta</Text>
      <Text style={styles.subtitle}>OperadorPro</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre Completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          value={fullName}
          onChangeText={setFullName}
          editable={!loading}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="tu@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Crear Cuenta</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, minHeight: '100%' },
  backButton: { color: '#d4a574', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  button: { backgroundColor: '#d4a574', paddingVertical: 14, borderRadius: 8, marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});

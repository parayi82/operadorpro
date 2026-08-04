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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>OperadorPro</Text>
      <Text style={styles.subtitle}>Gestión de Flota</Text>

      <View style={styles.form}>
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
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/auth/signup')}
          disabled={loading}
        >
          <Text style={styles.link}>¿No tienes cuenta? Crear una</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { justifyContent: 'center', minHeight: '100%', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#333' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 40 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  button: { backgroundColor: '#d4a574', paddingVertical: 14, borderRadius: 8, marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  link: { color: '#d4a574', textAlign: 'center', fontSize: 14, fontWeight: '600', marginTop: 16 },
});

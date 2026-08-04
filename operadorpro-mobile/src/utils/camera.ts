import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

export async function requestCameraPermission() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

export async function requestPhotoPermission() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

export async function takePhoto() {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    throw new Error('Camera permission denied');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) return null;

  return {
    uri: result.assets[0].uri,
    base64: result.assets[0].base64,
    type: 'image/jpeg',
  };
}

export async function pickPhotoFromGallery() {
  const hasPermission = await requestPhotoPermission();
  if (!hasPermission) {
    throw new Error('Photo library permission denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) return null;

  return {
    uri: result.assets[0].uri,
    base64: result.assets[0].base64,
    type: 'image/jpeg',
  };
}

export async function uploadPhotoToSupabase(
  userId: string,
  inspectionId: string,
  itemName: string,
  photo: { uri: string; base64?: string; type: string }
) {
  try {
    const fileName = `${inspectionId}/${itemName}-${Date.now()}.jpg`;
    const filePath = `inspections/${userId}/${fileName}`;

    // Si tenemos base64, usamos eso
    if (photo.base64) {
      const { data, error } = await supabase.storage
        .from('inspection-photos')
        .upload(filePath, Buffer.from(photo.base64, 'base64'), {
          contentType: 'image/jpeg',
        });

      if (error) throw error;
      return data.path;
    }

    // Si no, leemos el archivo
    const fileData = await FileSystem.readAsStringAsync(photo.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { data, error } = await supabase.storage
      .from('inspection-photos')
      .upload(filePath, Buffer.from(fileData, 'base64'), {
        contentType: 'image/jpeg',
      });

    if (error) throw error;
    return data.path;
  } catch (err) {
    console.error('Error uploading photo:', err);
    throw err;
  }
}

export function getPhotoUrl(storagePath: string) {
  const { data } = supabase.storage
    .from('inspection-photos')
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

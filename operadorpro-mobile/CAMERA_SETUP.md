# Camera & Photo Upload Setup

## ¿Qué hace?

La captura de fotos en inspecciones permite:
- ✅ Marcar items como "OK" o "NO OK"
- 📸 Capturar fotos automáticamente de items con problemas
- ☁️ Subir fotos a Supabase Storage
- 📄 Incluir fotos en reportes/PDFs

## Flujo de Uso

1. **Hacer Inspección**
   - Usuario va a ✅ Inspección
   - Marca cada item como ✅ OK o ❌ NO OK
   - Si ❌ NO OK → opción "📸 Capturar Foto" aparece
   - Usuario toma foto con la cámara
   - Foto se previsualiza en el app

2. **Guardar Inspección**
   - Todas las fotos se suben a Supabase Storage
   - Inspección se guarda con referencias a las fotos
   - User ve confirmación: "Inspección guardada: X/Y ítems OK"

3. **Ver Historial**
   - Lista de inspecciones con fecha y estado
   - Puede expandir para ver fotos

## Permisos Necesarios

### iOS
En `app.json` o `eas.json`:
```json
{
  "plugins": [
    [
      "expo-camera",
      {
        "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera.",
        "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone."
      }
    ]
  ]
}
```

### Android
Ya incluido automáticamente por Expo

## Estructura de Almacenamiento

```
storage/
└── inspection-photos/
    └── {user-id}/
        └── {inspection-id}/
            ├── 🛞-Llantas-sin-daño-1722700800000.jpg
            ├── 💡-Luces-1722700805000.jpg
            └── ...
```

## Supabase Setup

1. **Crear bucket**
   ```bash
   supabase migration up
   ```

2. **Verificar permisos**
   ```sql
   select * from storage.buckets where name = 'inspection-photos';
   ```

3. **Hacer bucket público** (opcional, si quieres URLs públicas)
   ```sql
   update storage.buckets
   set public = true
   where name = 'inspection-photos';
   ```

## Testing Local

### Emulador Android
```bash
cd operadorpro-mobile
npm run android
```
- Permite acceso a cámara automáticamente
- Captura se guarda en Storage

### Emulador iOS
```bash
npm run ios
```
- Solicita permiso la primera vez
- Simulador no tiene cámara real (usa librería de test)

### Dispositivo Físico
```bash
npx expo start --dev-client
```
- Descarga app en tu teléfono
- Cámara funciona en tiempo real

## Troubleshooting

**"Camera not available"**
- Verificar permiso de cámara en ajustes del teléfono
- En emulador: confirmar que Expo Camera está habilitada

**"Failed to upload photo"**
- Verificar conexión a internet
- Verificar que bucket existe en Supabase
- Revisar tokens de autenticación
- Ver logs: `supabase functions logs`

**"Photo not visible in storage"**
- Verificar que RLS policies permiten upload (ver migration)
- Verificar user_id está correcto en la ruta
- Revisar permisos de bucket en Supabase Dashboard

## Referencia de API

```typescript
// Capturar foto
const photo = await takePhoto();
// Returns: { uri: string, base64?: string, type: string }

// Subir a Supabase
const path = await uploadPhotoToSupabase(userId, inspectionId, itemName, photo);

// Obtener URL pública
const url = getPhotoUrl(storagePath);
```

## Proxima Fase: PDF con Fotos

Para generar PDFs con fotos:

```typescript
import { pdf } from '@react-pdf/renderer';

const InspectionReport = ({ inspection, photos }) => (
  <Document>
    <Page>
      <Text>Inspección #{inspection.id}</Text>
      {photos.map((photo, i) => (
        <Image key={i} src={photo.url} />
      ))}
    </Page>
  </Document>
);
```

## Referencias

- [Expo Camera Docs](https://docs.expo.dev/versions/v57.0.0/sdk/camera/)
- [Expo Image Picker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

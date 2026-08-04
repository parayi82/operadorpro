# Push Notifications Setup

## ¿Qué hace?

Las notificaciones push automáticas alertan a los usuarios sobre:
- **Cobranzas próximas a vencer** (mañana)
- **Documentos próximos a expirar** (7 días)
- **Inspecciones pendientes**

Las notificaciones se envían automáticamente cada día a las 09:00 UTC via Expo Push Service.

## Requisitos

1. **Expo Account** (gratuito)
   - Crear cuenta en https://expo.io
   - Instalar Expo CLI: `npm install -g eas-cli`

2. **Project ID de Expo**
   - Crear proyecto en Expo Dashboard
   - Copiar el projectId

3. **Environment Variables en Netlify**
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_KEY=...
   ```

## Configuración

### 1. Actualizar app.json con el Project ID

```json
{
  "expo": {
    "projectId": "your-project-id-here"
  }
}
```

### 2. Permitir notificaciones en el dispositivo

Cuando la app se abre por primera vez, solicitará permiso para enviar notificaciones.

### 3. Verificar que el token se guardó

- Abrir la app e iniciar sesión
- Ir a Settings (⚙️) → Ver push_token en el perfil
- El token se verá como: `ExponentPushToken[...]`

### 4. Ejecutar migraciones de Supabase

```bash
supabase migration up
```

## Testing Local

Para probar notificaciones en desarrollo:

```typescript
// En cualquier pantalla
import { schedulePushNotification } from '@/utils/notifications';

// Ejecutar en 5 segundos
schedulePushNotification(
  'Test Title',
  'Test body message',
  5000
);
```

## Endpoint Manual

Puedes enviar notificaciones manualmente llamando:

```bash
curl -X POST https://operadorpro.netlify.app/.netlify/functions/send-push-notifications \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Estructura de Notificaciones

### Cobranzas
- **Título**: 💰 Recordatorio de Cobranza
- **Mensaje**: "{ClientName} vence mañana: ${Amount}"
- **Trigger**: 1 día antes del vencimiento

### Documentos
- **Título**: 📄 Documento Próximo a Vencer
- **Mensaje**: "{DocumentType} de {UnitName} vence en 7 días"
- **Trigger**: 7 días antes del vencimiento

## Troubleshooting

**"Push token is null"**
- Verificar que estás en un dispositivo físico (no emulador)
- Verificar que diste permiso de notificaciones
- Verificar que INTERNET está habilitada en el dispositivo

**"Notification not received"**
- Verificar que el dispositivo tiene conexión a internet
- Verificar que la app no está en Do Not Disturb
- Revisar logs de Netlify: `netlify logs`

**"Error saving push token"**
- Verificar que la tabla `profiles` tiene columna `push_token`
- Verificar que Supabase está disponible
- Revisar permisos RLS de la tabla

## Referencias

- [Expo Notifications Docs](https://docs.expo.dev/versions/v57.0.0/build/reference/config-with-app-json/#notifications)
- [Expo Push Service](https://github.com/expo/expo-server-sdk-js)
- [Scheduled Functions en Netlify](https://docs.netlify.com/functions/scheduled-functions/)

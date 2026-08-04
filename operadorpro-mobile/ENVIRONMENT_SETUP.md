# Environment Setup & Production Configuration

Guía para configurar variables de ambiente en desarrollo y producción.

## 🔧 Desarrollo Local

### 1. Crear archivo `.env.local`

En `operadorpro-mobile/`, crea un archivo `.env.local` (no versionar este archivo):

```bash
touch operadorpro-mobile/.env.local
```

### 2. Configurar variables de desarrollo

Agrega estas variables (valores de tu proyecto de desarrollo):

```env
# Supabase Development
EXPO_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Expo Notifications (Development)
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id

# App Name & Slug
EXPO_PUBLIC_APP_NAME=OperadorPro
EXPO_PUBLIC_APP_SLUG=operadorpro
```

### 3. Usar en el código

```typescript
// En tu código
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
```

## 🚀 Producción

### 1. Crear Proyecto Supabase de Producción

1. Ve a https://supabase.com
2. Crea un **nuevo proyecto** (separado del de desarrollo)
3. Nombra: "operadorpro-production"
4. Región: Mexico (si está disponible) o más cercana
5. Nota el URL y Anon Key

### 2. Crear archivo `.env.production`

En `operadorpro-mobile/`:

```env
# Supabase Production
EXPO_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Expo Notifications (Production)
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id

# App Name
EXPO_PUBLIC_APP_NAME=OperadorPro
EXPO_PUBLIC_APP_SLUG=operadorpro
```

### 3. Actualizar `app.json` (opcional)

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "${EXPO_PUBLIC_SUPABASE_URL}",
      "supabaseAnonKey": "${EXPO_PUBLIC_SUPABASE_ANON_KEY}",
      "eas": {
        "projectId": "${EXPO_PUBLIC_EAS_PROJECT_ID}"
      }
    }
  }
}
```

## 🔐 Seguridad: Claves Públicas vs Privadas

### Expo Public Variables (Seguras en Cliente)
Usa `EXPO_PUBLIC_` prefijo para valores que están OK en el cliente:
- URL de Supabase (pública)
- Anon Key de Supabase (solo para autenticación y autorización vía RLS)
- EAS Project ID

**NO son secretas porque:**
- Supabase usa Row-Level Security (RLS) para proteger datos
- Anon Key solo puede hacer lo que RLS permite
- El navegador/app verá estos valores de todas formas

### Variables Privadas (Solo Backend)
Para Netlify Functions (backend), usa variables sin prefijo:
- Supabase Service Role Key (¡NUNCA en cliente!)
- Stripe API Keys
- Twilio API Keys
- Etc.

Ejemplo en `netlify.toml`:
```toml
[context.production.environment]
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
STRIPE_SECRET_KEY="sk_live_..."
```

## 📱 Configurar EAS Build con Environment Variables

### 1. En `eas.json`, agregar secrets:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "@prod_supabase_url",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "@prod_supabase_key"
      }
    }
  }
}
```

### 2. Crear variables en EAS

```bash
# Login a EAS
eas login

# Crear variables para producción
eas secret:create --scope project --name prod_supabase_url
# Ingresa: https://your-prod-project.supabase.co

eas secret:create --scope project --name prod_supabase_key
# Ingresa: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Verificar variables

```bash
eas secret:list
```

## 🔄 Migraciones de Base de Datos

### Para Producción

1. **Conecta a Supabase Production**
   ```bash
   supabase link --project-ref your-prod-project-id
   ```

2. **Corre migraciones**
   ```bash
   supabase migration up
   ```

3. **Verifica que se crearon tablas y bucket**
   ```sql
   -- En Supabase SQL Editor
   SELECT * FROM storage.buckets WHERE name = 'inspection-photos';
   ```

## 🧪 Testing: Desarrollo vs Producción

### Build de Desarrollo
```bash
# Usa variables de .env.local
eas build --platform ios --profile development
eas build --platform android --profile development
```

### Build de Producción
```bash
# Usa variables definidas en eas.json (secrets)
eas build --platform ios --profile production
eas build --platform android --profile production
```

## 📋 Checklist de Configuración

### Desarrollo
- [ ] `.env.local` creado con valores de dev Supabase
- [ ] Supabase project de desarrollo conectado
- [ ] Tablas y bucket creados en Supabase dev
- [ ] RLS policies activadas
- [ ] App funciona en emulador/dispositivo

### Producción
- [ ] Supabase project de producción creado
- [ ] `.env.production` con valores de prod
- [ ] Migraciones ejecutadas en Supabase prod
- [ ] RLS policies verificadas en prod
- [ ] EAS secrets creados y verificados
- [ ] eas.json actualizado con secretos
- [ ] Build de producción testeado en TestFlight (iOS) / Google Play Beta (Android)
- [ ] Privacy Policy URL configurada
- [ ] Terms of Service URL configurada

## 🚨 Cambio de URL Supabase en Vivo

Si necesitas cambiar la URL/key sin reconstruir:

```bash
# iOS
eas update --branch production

# Actualiza app.json y pushea
git push
```

La siguiente vez que users abran la app, descargarán el update.

## 📚 Referencias

- [Expo Environment Variables](https://docs.expo.dev/build-reference/variables/)
- [EAS Secrets](https://docs.expo.dev/eas/environment-variables/)
- [Supabase Connection Strings](https://supabase.com/docs/reference/javascript/initializing)
- [Netlify Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)

## 🆘 Troubleshooting

**"Error: SUPABASE_URL undefined"**
- Verifica que `EXPO_PUBLIC_SUPABASE_URL` esté en `.env.local` o eas.json
- Reinicia el dev server: `npm start`

**"Auth not working in production"**
- Verifica que ANON_KEY en prod es diferente a dev
- Comprueba que RLS policies están activas

**"Photos not uploading in production"**
- Verifica que bucket `inspection-photos` existe en Supabase prod
- Verifica RLS policies para upload
- Revisa logs: `supabase functions logs`

**"Build fails with environment variables"**
- Verifica secrets con `eas secret:list`
- Verifica `eas.json` con referencias correctas
- Prueba crear secret manualmente en EAS Dashboard

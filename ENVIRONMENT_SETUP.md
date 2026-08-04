# 🔧 Environment Setup Guide

Guía completa para configurar variables de ambiente en desarrollo y producción.

---

## 📋 Overview

Tu app necesita variables de ambiente para conectarse a:
- **Supabase** (backend/base de datos)
- **EAS** (Expo Application Services)
- **Otras APIs** (si las hay)

Estas variables cambian entre:
- **Development** (tu computadora local)
- **Production** (cuando está en app stores)

---

## 🏗️ Estructura de Archivos

```
operadorpro-mobile/
├── .env.example          ← Template (seguro commitar)
├── .env.local            ← Variables desarrollo (NO commitar)
├── .env.production       ← Variables producción (NO commitar)
└── .env                  ← Alternativa a .env.local
```

### Regla de Oro
- ✅ **Commitar a git:** `.env.example` (sin valores reales)
- ❌ **NUNCA commitar:** `.env`, `.env.local`, `.env.production`

---

## 📝 Archivo .env.example

Este archivo sirve como **template**. Contiene nombres de variables pero SIN valores reales.

```bash
# Copiar contenido actual
cat > operadorpro-mobile/.env.example << 'EOF'
# Supabase (Backend)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# EAS (Expo Services)
EXPO_PUBLIC_EAS_PROJECT_ID=your-project-id-here

# API Keys (si tienes)
# EXPO_PUBLIC_API_URL=https://api.example.com
EOF
```

**Comitear esto al repo:**
```bash
git add operadorpro-mobile/.env.example
git commit -m "docs: Add .env.example template"
git push
```

---

## 💻 Configuración para Desarrollo

### Paso 1: Crear Supabase Dev Project

```bash
# 1. Ir a https://supabase.com
# 2. Sign up / Login
# 3. New Project
#    - Nombre: OperadorPro-Dev
#    - Region: (elige la más cercana a ti)
# 4. Copiar URL y Anon Key
```

**Ubicación de credenciales en Supabase:**
- URL: Settings → API → Project URL
- Anon Key: Settings → API → Anon public

### Paso 2: Crear .env.local

```bash
cd operadorpro-mobile

# Crear archivo
cat > .env.local << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto-dev.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_EAS_PROJECT_ID=tu-eas-project-id
EOF

# Reemplazar con tus valores reales
nano .env.local
```

### Paso 3: Verificar .gitignore

```bash
# Verificar que .env.local está ignorado
grep -E "\.env|\.env\.local" operadorpro-mobile/.gitignore

# Si no aparece, agregarlo
echo ".env.local" >> operadorpro-mobile/.gitignore
echo ".env.*.local" >> operadorpro-mobile/.gitignore
```

### Paso 4: Setup Supabase Local (Opcional)

Si quieres Supabase local sin conectar a internet:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Inicializar Supabase
cd operadorpro-mobile
supabase init

# Iniciar servicio local
supabase start

# Obtener URL y keys locales
supabase status
```

**Ventajas:**
- ✅ Trabaja offline
- ✅ Sin límites de uso
- ✅ Más rápido

**Desventajas:**
- ❌ Requiere Docker
- ❌ Datos locales (no sincroniza con producción)

---

## 🚀 Configuración para Producción

### Paso 1: Crear Supabase Production Project

```bash
# 1. En https://supabase.com, crear nuevo proyecto
#    - Nombre: OperadorPro-Production
#    - Region: Tu región preferida (igual a dev o más cercana a usuarios)
# 2. Copiar URL y Anon Key
# 3. Ejecutar migraciones:
supabase link --project-ref tu-proyecto-id
supabase migration up
```

### Paso 2: Crear .env.production

```bash
cd operadorpro-mobile

cat > .env.production << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto-prod.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_EAS_PROJECT_ID=tu-eas-project-id
EOF

# Editar con valores reales
nano .env.production
```

### Paso 3: Crear EAS Secrets

Los secrets se usan en builds de EAS para inyectar variables sin exponerlas:

```bash
# Desde operadorpro-mobile/

# 1. Supabase URL
eas secret:create --scope project --name PROD_SUPABASE_URL
# Ingresa: https://tu-proyecto-prod.supabase.co

# 2. Supabase Anon Key
eas secret:create --scope project --name PROD_SUPABASE_KEY
# Ingresa: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 3. Verificar
eas secret:list
```

### Paso 4: Verificar .gitignore

```bash
# Asegurar que .env.production NO se commite
echo ".env.production" >> operadorpro-mobile/.gitignore
echo ".env.*.production" >> operadorpro-mobile/.gitignore

# Verificar
git check-ignore .env.production  # Debería devolver ".env.production"
```

---

## 🔄 Diferentes Escenarios

### Desarrollo Local (npm run dev)

```
usa: .env.local
URL: http://localhost:19000 (Expo)
Supabase: Dev project
```

**Archivo:**
```
.env.local (o .env):
- EXPO_PUBLIC_SUPABASE_URL=https://dev-proyecto.supabase.co
- EXPO_PUBLIC_SUPABASE_ANON_KEY=dev-key...
- EXPO_PUBLIC_EAS_PROJECT_ID=eas-id
```

### Development Build (EAS)

```
usa: .env.local (en tu máquina)
Build: EAS dev profile
Instalación: Emulador o dispositivo
```

**Comando:**
```bash
eas build --platform ios --profile development
```

### Production Build (EAS)

```
usa: secrets de EAS
Build: EAS production profile
Instalación: App Store / Google Play
```

**Variables inyectadas automáticamente:**
```
PROD_SUPABASE_URL → EXPO_PUBLIC_SUPABASE_URL
PROD_SUPABASE_KEY → EXPO_PUBLIC_SUPABASE_ANON_KEY
```

---

## 🔐 Mejores Prácticas de Seguridad

### ✅ Haz

- ✅ Usar `.env.example` como template
- ✅ Guardar variables sensibles en EAS Secrets
- ✅ Usar variables diferentes para dev y prod
- ✅ Rotar keys periódicamente
- ✅ Usar .gitignore para archivos de secrets
- ✅ Tener un backup seguro de keys (1Password, Vault)

### ❌ NO Hagas

- ❌ Commitar .env files al repo
- ❌ Compartir keys por Slack/email/chat
- ❌ Usar misma key para dev y prod
- ❌ Hardcodear variables en código
- ❌ Mostrar keys en screenshots
- ❌ Usar valores públicos en producción

---

## 📱 Variables Principales

### EXPO_PUBLIC_SUPABASE_URL

**Qué es:** URL base de tu proyecto Supabase

**Dónde encontrarla:**
1. https://supabase.com → Tu proyecto
2. Settings → API
3. Copy "Project URL"

**Formato:**
```
https://xxxxxxxxxxxxxxxx.supabase.co
```

**Ejemplo:**
```
EXPO_PUBLIC_SUPABASE_URL=https://operadorpro-prod.supabase.co
```

### EXPO_PUBLIC_SUPABASE_ANON_KEY

**Qué es:** Clave pública para acceso anónimo (no es tan sensible como admin key)

**Dónde encontrarla:**
1. https://supabase.com → Tu proyecto
2. Settings → API
3. Copy "anon public" en "Project API keys"

**Formato:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

**Nota:** Esta clave es "pública" en el sentido de que la ven en el cliente, pero sigue siendo importante porque controla qué pueden hacer los usuarios autenticados.

### EXPO_PUBLIC_EAS_PROJECT_ID

**Qué es:** ID de tu proyecto en Expo Application Services

**Dónde encontrarlo:**
```bash
# Después de crear proyecto EAS
eas project:info

# O en https://expo.dev/eas
# Tu proyecto → Project ID
```

**Formato:**
```
0000aaaa-0000-0000-0000-aaaaaa000000
```

---

## 🔄 Actualizar Variables

### Cambiar Supabase URL

```bash
# 1. Obtener nueva URL de nuevo proyecto Supabase
# 2. Actualizar en .env.local (desarrollo)
sed -i 's|EXPO_PUBLIC_SUPABASE_URL=.*|EXPO_PUBLIC_SUPABASE_URL=https://new-url.supabase.co|g' .env.local

# 3. Actualizar en .env.production
sed -i 's|EXPO_PUBLIC_SUPABASE_URL=.*|EXPO_PUBLIC_SUPABASE_URL=https://new-url.supabase.co|g' .env.production

# 4. Actualizar en EAS secrets
eas secret:list  # Ver secreto actual
eas secret:delete --scope project --name PROD_SUPABASE_URL
eas secret:create --scope project --name PROD_SUPABASE_URL
# Ingresa: nueva URL
```

### Rotar Anon Key

```bash
# 1. En Supabase:
#    - Settings → API
#    - Click en "Rotate" junto a anon key
#    - Confirmar

# 2. Actualizar .env.production
nano .env.production
# Actualizar EXPO_PUBLIC_SUPABASE_ANON_KEY

# 3. Actualizar EAS secret
eas secret:delete --scope project --name PROD_SUPABASE_KEY
eas secret:create --scope project --name PROD_SUPABASE_KEY
# Ingresa: nueva key

# 4. Hacer build y deploy nuevo
eas build --platform ios --profile production
eas build --platform android --release-channel production
```

---

## 🛠️ Troubleshooting

### "Cannot connect to Supabase"

```bash
# Verificar variables están correctas
cat .env.local | grep SUPABASE

# Verificar URL es válida
curl https://tu-proyecto.supabase.co/rest/v1/
# Debería devolver error 401 (sin auth), no error de conexión

# Verificar red
ping supabase.co
```

### "Anon key rejected"

```bash
# Verificar que key en .env.local/production es correcta
# (debe ser la key "anon", no "service_role")

# Copiar key correcta desde Supabase:
# Settings → API → "anon public"

# Actualizar archivo
nano .env.local
```

### "EAS Project ID not found"

```bash
# Verificar que EAS project está creado
eas project:info

# Si no existe, crear:
eas project:create

# Verificar que projectId está en app.json
grep projectId operadorpro-mobile/app.json
```

### Build falló: "Variable no está definida"

```bash
# Si error es: "EXPO_PUBLIC_SUPABASE_URL is undefined"

# En dev:
# - Verificar .env.local existe
# - Verificar variable está bien escrita
# - Reiniciar npm run dev

# En production (EAS):
# - Verificar secret está creado:
eas secret:list

# - Si no está, crear:
eas secret:create --scope project --name PROD_SUPABASE_URL
```

---

## 📊 Checklist de Setup

### Desarrollo

- [ ] Supabase dev project creado
- [ ] .env.local creado con variables dev
- [ ] .gitignore contiene .env.local
- [ ] `npm run dev` funciona sin errores de conexión
- [ ] Puedo crear/leer datos en Supabase desde app

### Producción

- [ ] Supabase production project creado
- [ ] .env.production creado con variables prod
- [ ] Secrets creados en EAS (PROD_SUPABASE_URL, PROD_SUPABASE_KEY)
- [ ] .gitignore contiene .env.production
- [ ] EAS build --profile production funciona
- [ ] App compilada puede conectarse a Supabase prod

---

## 🔗 Links Útiles

- **Supabase Console:** https://supabase.com/dashboard
- **EAS Dashboard:** https://expo.dev/eas
- **Expo CLI Docs:** https://docs.expo.dev/cli/eas
- **Supabase JS Client:** https://supabase.com/docs/reference/javascript/auth-getsession

---

**Última actualización:** 4 de agosto de 2026  
**Status:** ✅ Listo para implementar

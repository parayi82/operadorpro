# 🚀 EAS Build and Deploy Guide

Guía completa para compilar y publicar tu app en iOS y Android usando Expo Application Services (EAS).

---

## 📋 Requisitos Previos

Antes de empezar, asegúrate que:

✅ Tienes Node.js 16+ instalado  
✅ Tienes npm instalado  
✅ Tienes EAS CLI instalado (`npm install -g eas-cli`)  
✅ Tu cuenta de Expo está creada  
✅ Tienes el PROJECT_ID de EAS en tu `app.json`  
✅ Tienes configuradas variables de ambiente en `.env.production`  

---

## 🔧 Paso 1: Setup EAS Project

### 1.1 Crear Proyecto EAS

```bash
cd operadorpro-mobile
eas login
eas project:create
```

**Resultado esperado:**
```
Created project named "operadorpro"
Project ID: <YOUR_PROJECT_ID>
```

**Importante:** Copia el PROJECT_ID y agrégalo a `app.json`:

```json
{
  "expo": {
    "projectId": "tu-project-id-aqui"
  }
}
```

### 1.2 Verificar Configuración

```bash
# Verificar que app.json tiene projectId
grep projectId operadorpro-mobile/app.json

# Verificar que eas.json es válido
node -e "console.log(JSON.stringify(require('./operadorpro-mobile/eas.json'), null, 2))"
```

---

## 📱 Paso 2: Configurar Variables de Ambiente

### 2.1 Crear .env.production

```bash
cd operadorpro-mobile

# Crear archivo con variables
cat > .env.production << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_EAS_PROJECT_ID=tu-eas-project-id-aqui
EOF

# Reemplazar valores con los reales
nano .env.production  # o usa tu editor favorito
```

### 2.2 Verificar Variables

```bash
# Verificar que .env.production existe
ls -la .env.production

# Ver contenido (sin mostrar valores sensibles completos)
echo "SUPABASE_URL=$(cat .env.production | grep SUPABASE_URL | cut -d= -f2 | cut -c1-30)..."
```

---

## 🔐 Paso 3: Crear EAS Secrets

Los secretos se usan durante el build para inyectar variables sensibles sin exponerlas en el repositorio.

```bash
# Desde operadorpro-mobile/

# 1. Crear secret para Supabase URL
eas secret:create --scope project --name PROD_SUPABASE_URL
# Ingresa: https://tu-proyecto.supabase.co

# 2. Crear secret para Supabase Anon Key
eas secret:create --scope project --name PROD_SUPABASE_KEY
# Ingresa: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 3. Verificar que se crearon
eas secret:list
```

**Nota:** Los secretos se almacenan en Expo y se inyectan automáticamente en el build.

---

## 🛠️ Paso 4: Configurar Certificados iOS

### 4.1 Requisitos iOS

Para compilar para iOS necesitas:
- Una cuenta de **Apple Developer** ($99/año)
- Un **Team ID**
- Un **Bundle Identifier** válido (ya tenemos `com.operadorpro.app`)

### 4.2 Crear Certificados con EAS

```bash
# EAS manejará los certificados automáticamente
# Solo ejecuta esto la primera vez:
eas build --platform ios --profile development

# EAS te pedirá:
# 1. Team ID de Apple Developer
# 2. Crear provisioning profile (automático)
# 3. Crear certificados (automático)
```

### 4.3 Verificar Certificados

```bash
# Ver certificados almacenados en EAS
eas credentials

# O en Apple Developer Console:
# https://appstoreconnect.apple.com → Certificates, Identifiers & Profiles
```

---

## 🤖 Paso 5: Configurar Certificados Android

### 5.1 Requisitos Android

Para compilar para Android necesitas:
- Una cuenta de **Google Play Console** ($25, única vez)
- Una **Google Play App Signing Key** (EAS la crea por ti)
- El **Package Name** válido (ya tenemos `com.operadorpro.app`)

### 5.2 Crear Keystore con EAS

```bash
# La primera vez que hagas build de Android, EAS creará la keystore automáticamente:
eas build --platform android --release-channel production

# EAS te pedirá:
# 1. Crear keystore (automático)
# 2. Elegir entre EAS-managed o Keystore propio
# 3. Guardar las credenciales en EAS
```

### 5.3 Descargar Google Play Key

```bash
# Si quieres descargar la keystore para backup:
eas credentials -p android

# La keystore se guarda en EAS y se usa automáticamente
```

---

## 🏗️ Paso 6: Build para Desarrollo

### 6.1 Build iOS Development

```bash
cd operadorpro-mobile

eas build --platform ios --profile development

# Esto:
# 1. Valida la configuración
# 2. Compila la app
# 3. Genera .ipa
# 4. Te da URL para descargar
```

**Tiempo:** 5-10 minutos

**Resultado:** Link para instalar en emulador o dispositivo real

### 6.2 Build Android Development

```bash
eas build --platform android --profile development --release-channel development

# Esto:
# 1. Valida la configuración
# 2. Compila la app
# 3. Genera .apk
# 4. Te da URL para descargar
```

**Tiempo:** 5-10 minutos

---

## 🚀 Paso 7: Build para Producción

### 7.1 Build iOS Producción

```bash
eas build --platform ios --profile production

# Genera: .ipa optimizado para App Store
# Tiempo: 10-15 minutos
```

**Qué se incluye:**
- Release optimization
- Strip debugging symbols
- App Store provisioning profile
- Certificados de distribución

### 7.2 Build Android Producción

```bash
eas build --platform android --release-channel production

# Genera: .aab (Android App Bundle) para Google Play
# Tiempo: 10-15 minutos
```

**Qué se incluye:**
- Release optimization
- Firma con Google Play key
- Adaptive icons optimizados
- Todas las densidades incluidas

---

## 📊 Monitorear Builds

### Ver Status de Build en Vivo

```bash
# Listar últimos builds
eas build:list

# Ver detalles de un build específico
eas build:view <BUILD_ID>

# Ver logs en tiempo real
eas build:logs <BUILD_ID>
```

### Esperar a Que Termine

```bash
# EAS te da un link para monitorear
# También puedes ver en: https://expo.dev/eas

# O esperar el email de notificación (5-15 minutos)
```

---

## 📤 Paso 8: Submit a App Stores

### 8.1 Submit Automático (Recomendado)

```bash
# Submit el último build de ambas plataformas
eas submit --latest

# Esto:
# 1. Carga el .ipa a App Store Connect
# 2. Carga el .aab a Google Play Console
# 3. Te da links de seguimiento
```

### 8.2 Submit Específico por Plataforma

```bash
# Solo iOS
eas submit --platform ios --latest

# Solo Android
eas submit --platform android --latest
```

### 8.3 Submit Manual

Si prefieres hacerlo manualmente:

```bash
# Obtener URLs de descarga
eas build:view <BUILD_ID>

# Descargar .ipa/.aab manualmente
# Cargar en App Store Connect / Google Play Console
```

---

## ✅ Paso 9: Preparar Metadatos

### 9.1 En App Store Connect (iOS)

```
1. Ir a: https://appstoreconnect.apple.com
2. Crear nueva app: "+ New App"
3. Completar información:
   - Nombre: OperadorPro
   - Bundle ID: com.operadorpro.app
   - SKU: operadorpro-v1
   - Categoría: Business / Productivity
4. Copiar metadatos de APP_STORE_TEMPLATES.md
5. Subir screenshots y icono
```

**URLs que necesitas:**
- Privacy Policy: https://operadorpro-legal.netlify.app#privacy
- Support: https://operadorpro-legal.netlify.app#contact
- Terms: https://operadorpro-legal.netlify.app#terms

### 9.2 En Google Play Console (Android)

```
1. Ir a: https://play.google.com/console
2. Crear nueva app: "Crear aplicación"
3. Completar información:
   - Nombre: OperadorPro
   - Package name: com.operadorpro.app
   - Categoría: Negocios
4. Copiar metadatos de APP_STORE_TEMPLATES.md
5. Subir screenshots y feature graphic
```

---

## 📸 Assets Requeridos

### iOS (App Store)

```
Icon:            1024 × 1024 pixels (PNG)
Screenshots:     5 × (1242 × 2208) pixels (iPhone)
Preview Video:   Optional (30 sec max)
```

### Android (Google Play)

```
Icon:            512 × 512 pixels (PNG)
Screenshots:     5 × (1080 × 1920) pixels (Android)
Feature Graphic: 1024 × 500 pixels (PNG)
```

**Dónde obtenerlos:**
- Diseña en: Figma, Sketch, Adobe XD
- O usa templates en: APP_STORE_ASSETS.md

---

## 🔄 Proceso Completo (Timeline)

```
ACTIVIDAD                          TIEMPO      QUIEN
─────────────────────────────────────────────────────
1. Setup EAS Project               5 min       Tú
2. Configurar Variables            5 min       Tú
3. Crear Certificados iOS          10 min      EAS (automático)
4. Crear Certificados Android      10 min      EAS (automático)
5. Build iOS Development           10 min      EAS
6. Test iOS (emulador/dispositivo) 30 min      Tú
7. Build Android Development       10 min      EAS
8. Test Android                    30 min      Tú
9. Build iOS Producción            15 min      EAS
10. Build Android Producción       15 min      EAS
11. Setup metadatos (App Store)    30 min      Tú
12. Setup metadatos (Google Play)  30 min      Tú
13. Submit a Stores                5 min       EAS
14. Esperar revisión Apple         24-48h      Apple
15. Esperar revisión Google        2-4h        Google
16. ¡Publicado!                    -           🎉
─────────────────────────────────────────────────────
TOTAL DE TRABAJO:                  ~3-4 hrs
TOTAL INCLUYENDO ESPERAS:          2-3 días
```

---

## 🆘 Troubleshooting

### Error: "Project ID not found"

```bash
# Verifica que app.json tiene projectId
grep projectId operadorpro-mobile/app.json

# Si no tiene, agregalo:
# "projectId": "tu-project-id"
```

### Error: "Invalid Bundle ID"

```bash
# Verifica bundleIdentifier en app.json
grep bundleIdentifier operadorpro-mobile/app.json

# Debe ser: "com.operadorpro.app"
# O el que registraste en Apple Developer
```

### Error: "Provisioning Profile not found"

```bash
# Revoca permisos de EAS y crea nuevos
eas credentials -p ios

# Opción: "Remove" old credentials
# Luego: "Generate new" credentials
```

### Error: "Keystore not found" (Android)

```bash
# EAS creará una nueva keystore automáticamente
eas credentials -p android --interactive
```

### Build Toma Mucho Tiempo

```bash
# Normal: 5-15 minutos
# Si toma más:
#   1. Verificar internet
#   2. Verificar logs: eas build:logs <BUILD_ID>
#   3. Cancelar: Ctrl+C, luego reintenta
```

### App Se Cuelga al Iniciar

```bash
# Posibles causas:
# 1. Variables de .env.production no configuradas
# 2. Supabase no accesible desde app
# 3. Permisos faltantes en iOS/Android

# Para debuggear:
# npm run dev  # Ejecutar en Expo Go
# Revisar console logs
```

---

## 💡 Mejores Prácticas

### ✅ Buenas Prácticas

- ✅ Siempre hacer build de development primero
- ✅ Testear thoroughly en emulador/dispositivo
- ✅ Incrementar version en app.json antes de production
- ✅ Guardar credenciales en lugar seguro (1Password, etc)
- ✅ Documentar cambios en "What's New"

### ❌ Evitar

- ❌ No commitar .env files al git
- ❌ No compartir credenciales en Slack/email
- ❌ No cambiar bundleIdentifier después de publicar
- ❌ No ignorar certificados vencidos
- ❌ No hacer push sin testear primero

---

## 🎯 Checklist Pre-Production

Antes de hacer el build final, verifica:

- [ ] app.json tiene `projectId`
- [ ] app.json tiene versión correcta
- [ ] .env.production configurado con valores reales
- [ ] Certificados iOS creados
- [ ] Keystore Android creada
- [ ] Privacy Policy URL funciona
- [ ] Terms of Service URL funciona
- [ ] Screenshots preparados
- [ ] Icons preparados
- [ ] Testeado en 2+ dispositivos
- [ ] No hay console errors
- [ ] Permisos solicitados (cámara, ubicación)
- [ ] App.json tiene cambios de última versión

---

## 📞 Recursos Útiles

- **EAS Dashboard:** https://expo.dev/eas
- **App Store Connect:** https://appstoreconnect.apple.com
- **Google Play Console:** https://play.google.com/console
- **EAS Docs:** https://docs.expo.dev/eas/
- **Troubleshooting:** https://docs.expo.dev/eas/build/

---

**Última actualización:** 4 de agosto de 2026  
**Status:** ✅ Listo para usar

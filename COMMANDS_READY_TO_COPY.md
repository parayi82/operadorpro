# 📋 Commands Ready to Copy & Paste

Todos los comandos que necesitas, listos para copiar y ejecutar.

---

## 📱 Deploy Legal Website to Netlify

### Opción 1: Con Netlify CLI

```bash
# 1. Instalar Netlify CLI (una sola vez)
npm install -g netlify-cli

# 2. Loguear (abre navegador para autenticación)
netlify login

# 3. Navegar a tu proyecto
cd operadorpro

# 4. Deploy el sitio legal
netlify deploy --dir="." --prod --open
```

**Resultado:** Browser abre automáticamente tu nuevo sitio con URL 🎉

---

## 🛠️ Configurar EAS Project

```bash
# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Loguear en EAS (abre navegador)
eas login

# 3. Navegar a carpeta de mobile
cd operadorpro-mobile

# 4. Crear proyecto EAS
eas project:create

# Copia el PROJECT_ID que te da y agrégalo a app.json:
# "projectId": "tu-project-id-aqui"
```

---

## 📦 Configurar Variables de Ambiente

```bash
# 1. En operadorpro-mobile/, crear archivo .env.production
cat > .env.production << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_EAS_PROJECT_ID=tu-eas-project-id
EOF

# 2. Editar los valores con los reales de tu Supabase Production

# 3. Crear .env.local para desarrollo (opcional)
cp .env.example .env.local
# Editar .env.local con valores de desarrollo
```

---

## 🔐 Crear EAS Secrets

```bash
# Desde operadorpro-mobile/

# Crear secret para URL de Supabase (producción)
eas secret:create --scope project --name PROD_SUPABASE_URL
# Ingresa: https://tu-proyecto.supabase.co

# Crear secret para Anon Key
eas secret:create --scope project --name PROD_SUPABASE_KEY
# Ingresa: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Verificar que se crearon
eas secret:list
```

---

## 🏗️ Setup Supabase Production

```bash
# 1. Conectar Supabase al proyecto
supabase link --project-ref tu-proyecto-id

# 2. Ejecutar migraciones en Supabase Production
supabase migration up

# 3. Verificar que todo se creó (en SQL Editor de Supabase)
SELECT COUNT(*) as tables_count 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

## 🔨 Build para Desarrollo

```bash
# iOS (emulador o dispositivo)
eas build --platform ios --profile development

# Android (APK para emulador)
eas build --platform android --profile development --release-channel development
```

---

## 🚀 Build para Producción (App Stores)

```bash
# iOS (para App Store)
eas build --platform ios --profile production

# Android (para Google Play - genera AAB)
eas build --platform android --release-channel production
```

---

## 📤 Submit a App Stores

```bash
# Ambas plataformas
eas submit --latest

# O plataforma específica
eas submit --platform ios --latest
eas submit --platform android --latest
```

---

## 🔄 Crear Assets Automáticamente

```bash
# Generar múltiples tamaños de icono con ImageMagick
convert assets/images/icon-1024.png -resize 512x512 assets/images/icon-512.png
convert assets/images/icon-1024.png -resize 256x256 assets/images/icon-256.png
convert assets/images/icon-1024.png -resize 180x180 assets/images/icon-180.png
convert assets/images/icon-1024.png -resize 120x120 assets/images/icon-120.png
```

---

## 📝 Actualizar Version

```bash
# Actualizar versión en app.json
# Cambiar: "version": "1.0.0" → "1.0.1"

# Actualizar buildNumber (iOS)
# Cambiar: "buildNumber": "1" → "2"

# Actualizar versionCode (Android)
# Cambiar: "versionCode": 1 → 2

# Commit y push
git add operadorpro-mobile/app.json
git commit -m "chore: Bump version to 1.0.1"
git push
```

---

## 🧹 Limpiar Build Artifacts

```bash
# Limpiar cache de EAS
rm -rf .eas

# Limpiar dependencias de npm
rm -rf operadorpro-mobile/node_modules
npm install

# Limpiar Expo cache
rm -rf .expo

# Limpiar builds locales
rm -rf operadorpro-mobile/android/app/build
rm -rf operadorpro-mobile/ios/Pods
```

---

## 🔍 Validar Configuración

```bash
# Verificar app.json es válido JSON
node -e "console.log(JSON.stringify(require('./operadorpro-mobile/app.json'), null, 2))"

# Verificar eas.json es válido
node -e "console.log(JSON.stringify(require('./operadorpro-mobile/eas.json'), null, 2))"

# Verificar Netlify config
netlify status
```

---

## 📋 Deploy Legal Website (Automático)

```bash
# Linux/macOS
bash scripts/deploy-legal-website.sh

# Windows PowerShell
.\scripts\deploy-legal-website.ps1
```

---

## 🔗 Deep Links

```bash
# Probar deep link en emulador Android
adb shell am start -a android.intent.action.VIEW \
  -d "operadorpro://inspect/123" \
  com.operadorpro.app

# iOS (en Xcode o dispositivo)
xcrun simctl openurl booted "operadorpro://inspect/123"
```

---

## 📱 Probar en Dispositivo Real

```bash
# Instalar app en dispositivo conectado (Android)
adb install operadorpro-mobile.apk

# Instalar en iPhone (requiere certificados)
# Ver: PUBLICATION_CHECKLIST.md

# O usar Expo Go
npx expo start --dev-client
# Escanea QR con cámara/Expo Go
```

---

## 🗂️ Estructura de Carpetas (Crear si no existen)

```bash
# Crear carpetas de assets si no existen
mkdir -p operadorpro-mobile/assets/images
mkdir -p operadorpro-mobile/assets/notification-sound

# Crear carpeta de scripts
mkdir -p operadorpro/scripts

# Crear carpeta de builds
mkdir -p operadorpro/builds/ios
mkdir -p operadorpro/builds/android
```

---

## 🔐 Proteger Archivos Sensibles

```bash
# Asegurar que archivos sensibles están en .gitignore
echo ".env.production" >> operadorpro-mobile/.gitignore
echo "google-play-key.json" >> operadorpro-mobile/.gitignore
echo ".eas/" >> operadorpro-mobile/.gitignore

# Verificar que no se subieron
git check-ignore .env.production
git check-ignore google-play-key.json

# Si ya se subieron, remover del historio
git rm --cached .env.production
git commit -m "remove: Remove .env.production from git history"
git push
```

---

## 📊 Ver Status de Builds

```bash
# Listar builds recientes
eas build:list

# Ver detalles de un build específico
eas build:view <build-id>

# Ver logs de un build
eas build:logs <build-id>
```

---

## 🎯 Shortcuts - Comandos Combinados

```bash
# Todo de una vez: Actualizar, build, submit
# (¡CUIDADO: Esto hace mucho!)
cd operadorpro-mobile && \
  eas build --platform ios --platform android --profile production && \
  eas submit --latest

# O más seguro: Build primero, review, luego submit
eas build --platform ios --profile production
# ... espera que termine ...
eas build --platform android --release-channel production
# ... espera que termine ...
# Ahora review los builds en EAS Dashboard
eas submit --latest
```

---

## 🚨 Troubleshooting Commands

```bash
# Limpiar todo y empezar de cero
rm -rf operadorpro-mobile/node_modules
rm -rf operadorpro-mobile/.expo
npm install

# Verificar que Expo está actualizado
expo --version
expo upgrade

# Verificar Node version (requiere 16+)
node --version

# Verificar npm
npm --version

# Actualizar npm
npm install -g npm@latest

# Verificar eas-cli
eas --version

# Actualizar eas-cli
npm install -g eas-cli@latest
```

---

## 📞 Preguntas Frecuentes (Commands)

**¿Ver qué cambios hay en git?**
```bash
git status
git diff
```

**¿Ver historial de commits?**
```bash
git log --oneline -10
```

**¿Descartar cambios locales?**
```bash
git checkout .
```

**¿Volver a commit anterior?**
```bash
git revert HEAD  # Crea nuevo commit deshaciendo cambios
# O
git reset --hard HEAD~1  # Elimina el último commit (¡CUIDADO!)
```

**¿Cambiar rama?**
```bash
git checkout claude/cargo-truck-management-app-jndduf
# O para crear nueva
git checkout -b nueva-rama
```

---

## ✅ Copy-Paste Checklist

Aquí está tu plan paso a paso (copia y pega):

```bash
# 1. Deploy Legal Website (5 min)
npm install -g netlify-cli
netlify login
cd operadorpro && netlify deploy --dir="." --prod --open

# 2. Setup EAS (5 min)
npm install -g eas-cli
eas login
cd operadorpro-mobile
eas project:create
# ← Anota PROJECT_ID y agrégalo a app.json

# 3. Crear variables de ambiente (5 min)
cat > .env.production << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_EAS_PROJECT_ID=...
EOF

# 4. Setup Supabase (10 min)
supabase link --project-ref tu-id
supabase migration up

# 5. Build de prueba (10 min)
eas build --platform ios --profile development
# ... espera ...
eas build --platform android --profile development

# 6. Build para producción (20 min)
eas build --platform ios --profile production
# ... espera ...
eas build --platform android --release-channel production

# 7. Submit (5 min)
eas submit --latest

# 8. ¡Esperar revisión! (24-48h)
# ✅ Done!
```

**Tiempo total:** ~2-3 horas de ejecución (esperas incluidas)

---

**Última actualización:** 4 de agosto de 2026  
**Status:** ✅ Listo para copiar y ejecutar

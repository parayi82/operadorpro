# EAS Build & App Store Deployment Guide

Guía completa para construir OperadorPro y publicarla en App Store y Google Play.

## 📋 Requisitos Previos

Necesitas crear tres cuentas:
1. **EAS (Expo Application Services)** - para construir la app
2. **Apple Developer Program** - para iOS (pago: $99 USD/año)
3. **Google Play Developer** - para Android (pago: $25 USD única vez)

### 1. Crear Cuenta EAS

```bash
# Instalar Expo CLI si no lo tienes
npm install -g eas-cli

# Login a EAS (crea cuenta en https://expo.dev si no la tienes)
eas login

# Verificar que estés logueado
eas whoami
```

### 2. Crear Proyecto EAS

```bash
cd operadorpro-mobile

# Crear proyecto en EAS (vincula con tu proyecto Expo)
eas project:create

# Te dará un PROJECT_ID, actualiza app.json:
```

**Actualizar `app.json`:**
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "tu-project-id-aqui"
      }
    }
  }
}
```

## 🍎 iOS: App Store Submission

### 2.1 Crear Apple Developer Account

1. Ve a https://developer.apple.com
2. Click "Account" → "Enroll"
3. Sigue los pasos para crear Apple ID
4. Paga $99 USD/año
5. Agrega un método de pago y acepta acuerdos

### 2.2 Crear Certificados en Apple Developer Portal

1. Ve a https://developer.apple.com/account/resources/certificates
2. Click "Create a Certificate"
3. Selecciona **"Apple Distribution"** (para App Store)
4. Descarga el certificado (.cer)
5. Haz doble click para instalarlo en Keychain (macOS)

### 2.3 Crear Provisioning Profile

1. Ve a https://developer.apple.com/account/resources/identifiers/list
2. Click "Register an Identifier"
   - **Bundle ID**: `com.operadorpro.app`
   - **Description**: "OperadorPro App"
3. Capabilities: Agrega:
   - Push Notifications
   - Camera
   - Location Services

4. Ve a https://developer.apple.com/account/resources/profiles/list
5. Click "Create a Profile"
   - Tipo: **App Store**
   - App ID: `com.operadorpro.app`
   - Certificate: Selecciona el certificado que acabas de crear
   - Descarga el archivo (.mobileprovision)

### 2.4 Crear App en App Store Connect

1. Ve a https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
   - **Platform**: iOS
   - **Name**: "OperadorPro"
   - **Bundle ID**: com.operadorpro.app
   - **SKU**: operadorpro-app-001 (cualquier valor único)

3. Completa la información:
   - **Category**: Business (o Transportation)
   - **Subcategory**: Fleet Management

### 2.5 Preparar Metadata para iOS

En App Store Connect, completa:

**Información General:**
- Descripción: "Gestión integral de flota y cumplimiento normativo para operadores de transporte en México"
- Palabras clave: "carta porte, inspección, cobranza, flota"
- Soporte URL: https://tudominio.com/soporte
- Política de privacidad: https://tudominio.com/privacy

**Precios y Distribución:**
- Availability: México y otros países
- Edades: 4+
- Contenido restringido: Desmarcar todos

**Revisión:**
- Información de contacto
- Información de demostración (si necesario)
- Notas para revisión de App Store

**Screenshots:**
- Necesitas al menos 2 screenshots por tamaño
- Tamaños requeridos:
  - iPhone 6.7" (OLED): 1290x2796
  - iPhone 6.1" (OLED): 1179x2556
  - iPhone 5.8" (OLED): 1125x2436

### 2.6 Construir para iOS

```bash
cd operadorpro-mobile

# Build para App Store (production)
eas build --platform ios --auto-submit

# O si prefieres controlar el submit manualmente:
eas build --platform ios
```

El build tardará 10-30 minutos. Cuando termine:
- Descarga el .ipa si no usaste `--auto-submit`
- O sube directo a App Store Connect

### 2.7 Subir a App Store Connect

Si descargaste el .ipa:

1. Ve a App Store Connect → Tu App
2. Click "Build" → "Select a build to test"
3. Selecciona tu build
4. Click "Submit for Review"
5. Responde preguntas de IDFA si es necesario
6. Apple revisa en 24-48 horas (típicamente)

## 🤖 Android: Google Play Submission

### 3.1 Crear Google Play Developer Account

1. Ve a https://play.google.com/console/signup
2. Paga $25 USD (única vez)
3. Completa tu perfil de desarrollador

### 3.2 Crear Key para Signing

En Google Play Console, Android usa un archivo JSON para autenticarse:

```bash
# Ve a Google Play Console → Configuración → API y servicios
# Crea una "Service Account"
# Descarga el JSON (va a ser called google-play-key.json)
# Muévelo a operadorpro-mobile/
```

### 3.3 Crear App en Google Play Console

1. Ve a https://play.google.com/console/apps/new
   - **Nombre de la app**: OperadorPro
   - **Idioma predeterminado**: Español
   - **Categoría**: Business
   - **Tipo de contenido**: Aplicación

2. Completa información de desarrollador

### 3.4 Preparar Metadata para Android

**En Google Play Console:**

**Descripción:**
```
Gestión integral de flota y cumplimiento normativo para operadores de transporte en México.

OperadorPro te permite:
✅ Crear y gestionar Cartas Porte digitales
📸 Realizar inspecciones pre-viaje con fotos
💰 Organizar cobranza con recordatorios por WhatsApp
🚚 Mantener inventario de tu flota
📋 Cumplir normativas de transporte

Perfecto para camioneros independientes y pequeñas flotas.
```

**Categorías:**
- Tipo de aplicación: Business
- Categoría: Productivity

**Clasificación de contenido:**
- Completa el cuestionario de edad
- Selecciona permisos (cámara, ubicación)

**Screenshots:**
- Necesitas al menos 2 screenshots
- Tamaño recomendado: 1440x2560 o 1080x1920

**Gráficos:**
- Feature Graphic: 1024x500
- Icon: 512x512

### 3.5 Construir para Android

```bash
cd operadorpro-mobile

# Build para Google Play (production AAB)
eas build --platform android --release-channel production

# Nota: Usa `--release-channel production` para crear AAB
# (no APK) que es lo que pide Google Play
```

El build tardará 10-30 minutos.

### 3.6 Subir a Google Play Console

```bash
# Con eas.json configurado correctamente, puedes:
eas submit --platform android --latest

# O manualmente:
# 1. Ve a Google Play Console
# 2. Click "Release" → "Production"
# 3. Click "Create Release"
# 4. Upload el AAB que descargaste de eas build
# 5. Completa la info de release
# 6. Revisa y publica
```

Google revisa en 2-4 horas típicamente.

## 🔧 Versioning & Updates

Cada vez que hagas un update:

1. **Actualiza versión en app.json:**
   ```json
   {
     "expo": {
       "version": "1.0.1"
     }
   }
   ```

2. **iOS: Actualiza buildNumber:**
   ```json
   {
     "expo": {
       "ios": {
         "buildNumber": "2"
       }
     }
   }
   ```

3. **Android: Actualiza versionCode:**
   ```json
   {
     "expo": {
       "android": {
         "versionCode": 2
       }
     }
   }
   ```

4. **Build y submite nuevamente**

## 🐛 Troubleshooting

### "Certificate not found"
```bash
# Regenera certificados de Apple
eas credentials --platform ios
```

### "Build failed: Missing provisioning profile"
```bash
# Asegúrate que los certificados están en app.json
# O regenera:
eas credentials --platform ios --clear
eas credentials --platform ios
```

### "Google Play Key JSON not found"
```bash
# Verifica que google-play-key.json está en operadorpro-mobile/
# Y actualiza eas.json con la ruta correcta
```

### "App rejected by App Store"
- Revisa Common Rejection Reasons en el email de Apple
- Usualmente son permisos de privacidad no documentados
- Actualiza PrivacyInfo.xcprivacy si es necesario

### "APK failed Google Play upload"
- Google Play solo acepta AAB (Android App Bundle), no APK
- Usa `eas build --platform android --release-channel production`

## 📱 Testing Local (Antes de Subir)

### Emulador Android
```bash
cd operadorpro-mobile
npm run android
```

Cosas que probar:
- Login/Signup funciona
- Permisos de cámara
- Permisos de ubicación
- Capturar fotos en inspección
- Crear Carta Porte
- Crear cobranza y abrir WhatsApp

### Dispositivo Físico iOS
```bash
# Requiere macOS con Xcode
eas build --platform ios --auto-submit=false
# Descarga el .ipa
# Usa TestFlight en App Store Connect para testing antes de production
```

```bash
# O build development:
eas build --platform ios --profile development
# Escanea QR con dispositivo
```

## 🎯 Checklist antes de Publicar

- [ ] app.json con projectId de EAS correcto
- [ ] Versión actualizada (version, buildNumber, versionCode)
- [ ] PRIVACY_POLICY URL válida (iOS requiere esto)
- [ ] app.json con bundleIdentifier (iOS) y package (Android) correctos
- [ ] Certificados Apple creados en Developer Portal
- [ ] Google Play key JSON descargado
- [ ] App creada en App Store Connect
- [ ] App creada en Google Play Console
- [ ] Screenshots en ambas plataformas
- [ ] Descripción y keywords en ambas plataformas
- [ ] Contacto de soporte en app.json
- [ ] Política de privacidad pública
- [ ] Términos de servicio (opcional pero recomendado)
- [ ] Testing completo en emuladores/dispositivos reales
- [ ] Build exitoso sin warnings

## 🚀 Resumen: Paso a Paso

```bash
# 1. Setup EAS
npm install -g eas-cli
eas login
eas project:create  # Anota el PROJECT_ID

# 2. Actualiza app.json con PROJECT_ID

# 3. Setup credenciales
eas credentials

# 4. Build
eas build --platform ios
eas build --platform android --release-channel production

# 5. Submit (manual o automático)
eas submit --latest

# 6. Espera revisión de Apple (24-48h) y Google (2-4h)
```

## 📚 Referencias

- [Expo EAS Documentation](https://docs.expo.dev/eas/introduction/)
- [Apple App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)
- [Apple Developer Portal](https://developer.apple.com/account/resources/)
- [Privacy Manifest (iOS)](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)

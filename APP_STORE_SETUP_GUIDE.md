# 🎯 App Store Setup Guide - Step by Step

Complete guide to set up your OperadorPro app on both App Store Connect (iOS) and Google Play Console (Android).

**Time estimate:** 30-45 minutes total  
**Prerequisites:** Developer accounts + Legal website URL

---

## 📌 Important URLs

Replace these in all steps below:

```
YOUR_LEGAL_WEBSITE = https://operadorpro-legal.netlify.app
PRIVACY_URL = https://operadorpro-legal.netlify.app#privacy
TERMS_URL = https://operadorpro-legal.netlify.app#terms
SUPPORT_EMAIL = support@operadorpro.com
```

---

## 🍎 PART 1: iOS - App Store Connect Setup

### Step 1: Create New App

**URL:** https://appstoreconnect.apple.com

1. Click **"Apps"** (left sidebar)
2. Click **"+ New App"**
3. Fill in the form:

| Field | Value |
|-------|-------|
| Platform | iOS |
| Name | OperadorPro |
| Primary Language | Spanish (Mexico) |
| Bundle ID | com.operadorpro.app |
| SKU | operadorpro-v1 |
| App Category | Business |
| User Type | Individual |

4. Click **Create**

### Step 2: Fill App Information

**Section:** App Store → App Information

#### General Information
```
App Name: OperadorPro
Subtitle: Gestión de Flota
Description (Descriptive Subtitle): Solución completa para operadores de transporte
```

#### Full Description
Copy this exactly:

```
OperadorPro es la solución completa para operadores de transporte en México.

CARTAS PORTE DIGITALES
✅ Crea Cartas Porte con folio automático
✅ Guarda borradores y completados
✅ Acceso sin internet (sincronización cuando hay red)

INSPECCIONES PRE-VIAJE
✅ Checklist completo con 10 ítems
✅ Captura fotos de problemas encontrados
✅ Geolocalización automática de inspecciones
✅ Historial completo con fotografías

GESTIÓN DE COBRANZA
✅ Registro de pendientes de cobro
✅ Recordatorios automáticos por WhatsApp
✅ Seguimiento por cliente
✅ Estado de pagos

INVENTARIO DE FLOTA
✅ Registro de unidades (vehículos)
✅ Seguimiento de documentos (tenencias, seguros)
✅ Alertas de vencimiento automáticas
✅ Estado de placas y configuración

NOTIFICACIONES PUSH
✅ Recordatorios de cobranzas pendientes
✅ Alertas de documentos por vencer
✅ Actualizaciones de la aplicación

DISEÑO PARA CONDUCTORES
• Interfaz simple sin complejidad innecesaria
• Funciona con conexión lenta o intermitente
• Botones grandes y fáciles de usar
• Mensajes en español claro

REQUISITOS:
- iOS 14.0 o superior
- iPhone o iPad
- Conexión intermitente a internet

PRIVACIDAD:
Los datos están protegidos con encriptación. Solo tú tienes acceso a tus datos.

¿Preguntas? Contacta a support@operadorpro.com
```

#### Keywords
```
carta porte, inspección, flota, transporte, cobranza, camión, logística, negocio, administración, app negocios
```

#### Support Information
```
Support URL: https://operadorpro-legal.netlify.app#contact
Support Email: support@operadorpro.com
Privacy Policy URL: https://operadorpro-legal.netlify.app#privacy
Terms of Service URL: https://operadorpro-legal.netlify.app#terms
```

#### Licensing Agreement
```
Copyright: © 2026 OperadorPro. Todos los derechos reservados.
```

### Step 3: Pricing and Availability

**Section:** Pricing and Availability

```
Free / Paid: FREE
Availability: 
  - Make available on App Store: YES
  - First release date: [Choose today or tomorrow]
  - Regions: Mexico (select at minimum)
```

### Step 4: Age Rating

**Section:** App Store → Age Rating Questionnaire

Fill questionnaire with:
- Violence: NONE
- Sexual Content: NONE
- Profanity: NONE
- Alcohol/Tobacco: NONE
- Add custom rating: Yes
  - Location: Yes (used for inspection geo-tagging)
  - Camera: Yes (used for inspection photos)
  - Photos: Yes (used to upload photos)
  - User ID: Yes (email login)

**Rating:** 4+ years

### Step 5: Upload Screenshots and Icon

**Section:** App Store → App Preview and Screenshots

#### App Icon
- Dimensions: **1024 × 1024 pixels**
- Format: **PNG**
- Upload: Click area for "App Icon"
- File: `operadorpro-mobile/assets/images/icon.png`

#### Screenshots (iPhone)
- Dimensions: **1242 × 2208 pixels**
- Format: **PNG or JPG**
- Upload: 5-10 screenshots
- Suggested content:
  1. Intro + Logo "OperadorPro"
  2. Cartas Porte screen
  3. Inspecciones screen
  4. Cobranza screen
  5. Inventario screen

### Step 6: Review Notes (Important!)

**Section:** App Store → General App Information → Notes for Review

Fill this carefully:

```
Our application is an administrative tool for transportation operators in Mexico.

Main features:
- Digital Carta Porte (shipping document) management
- Pre-trip inspections with photo capture
- Collections tracking with WhatsApp reminders
- Fleet inventory management

Permissions used:
- Camera: To capture inspection photos
- Location: To geo-tag inspections
- Photos: To access gallery photos
- Notifications: For collection reminders

The app does NOT include:
- Advertising
- Third-party analytics tracking
- In-app purchases

This application is designed for users with limited technical skills.
```

### ✅ iOS Setup Complete!

Save all information. When ready to submit:
1. Upload your first build (via EAS)
2. Return to this section
3. Click "Submit for Review"

---

## 🤖 PART 2: Android - Google Play Console Setup

### Step 1: Create New App

**URL:** https://play.google.com/console

1. Click **"Create app"**
2. Fill in:

| Field | Value |
|-------|-------|
| App name | OperadorPro |
| Default language | Spanish (Mexico) |
| App category | Business |
| App type | App |

3. Accept declaration
4. Click **Create app**

### Step 2: Fill Store Listing

**Section:** Store listing

#### App Title & Description

**App name:**
```
OperadorPro
```

**Short description (80 chars max):**
```
Gestión integral de flota y transporte para camioneros en México
```

**Full description:**
```
OperadorPro es tu asistente digital para operadores de transporte.

📋 CARTAS PORTE DIGITALES
• Crea Cartas Porte al instante
• Folio automático
• Guarda borradores y completados
• Funciona sin internet

📸 INSPECCIONES PRE-VIAJE
• Checklist de 10 puntos
• Captura fotos de problemas
• Geolocalización automática
• Historial completo

💰 GESTIÓN DE COBRANZA
• Tracking de pendientes
• Recordatorios por WhatsApp
• Seguimiento por cliente

🚚 INVENTARIO DE FLOTA
• Registro de vehículos
• Alertas de vencimiento
• Documentos (tenencias, seguros, permisos)

🔔 NOTIFICACIONES
• Recordatorios automáticos
• Alertas de documentos por vencer

DISEÑO SIMPLE
✓ Interfaz sin complejidad
✓ Botones grandes
✓ Mensajes claros en español
✓ Funciona con internet lento

PRIVACIDAD
Tus datos están protegidos. Solo tú accedes.

REQUISITOS:
• Android 8.0 o superior
• Conexión intermitente a internet

¿Preguntas? support@operadorpro.com
```

### Step 3: Add Screenshots and Graphics

**Section:** Store listing → Graphics

#### App Icon (Google Play)
- Dimensions: **512 × 512 pixels**
- Format: **PNG**
- Type: Adaptive icon
- Upload location: "App icon"

#### Feature Graphic
- Dimensions: **1024 × 500 pixels**
- Format: **PNG or JPG**
- Upload location: "Feature graphic"
- Content: Logo + app name + tagline

#### Screenshots
- Dimensions: **1080 × 1920 pixels**
- Quantity: **5-10 screenshots**
- Upload location: "Phone screenshots"
- Suggested content:
  1. Intro + Logo
  2. Cartas Porte
  3. Inspecciones
  4. Cobranza
  5. Inventario

### Step 4: Content Rating Questionnaire

**Section:** Store listing → Content rating

1. Click **"Complete questionnaire"**
2. Application type: **Business / Productivity**
3. Answer all questions:
   - Violence: No
   - Sexual content: No
   - Profanity: No
   - Alcohol/Tobacco: No
   - Data collection: Yes
     - Personal data collected: Email, GPS location, Photos
     - Data is encrypted: Yes
   - Ads: No

4. Submit questionnaire
5. Rating: **7+ years**

### Step 5: Privacy and Permissions

**Section:** Store listing → Privacy

Fill in:

| Field | Value |
|-------|-------|
| Privacy policy | https://operadorpro-legal.netlify.app#privacy |
| Developer website | https://operadorpro-legal.netlify.app |
| Developer email | support@operadorpro.com |

### Step 6: App Permissions Disclosure

**Section:** App permissions

Declare permissions used by your app:

```
Camera: Capture inspection photos
Location (GPS): Geo-tag inspections
Photos/Media: Access gallery photos
Notifications: Send reminders
```

### ✅ Android Setup Complete!

---

## 📋 Pre-Upload Checklist

Before building and uploading to stores:

### iOS (App Store Connect)
- [ ] App name: OperadorPro
- [ ] Bundle ID: com.operadorpro.app
- [ ] Full description copied
- [ ] Keywords added (8-10)
- [ ] Privacy URL set
- [ ] Terms URL set
- [ ] Support email set
- [ ] App icon uploaded (1024×1024)
- [ ] 5+ screenshots uploaded (1242×2208)
- [ ] Age rating: 4+
- [ ] Review notes filled in

### Android (Google Play Console)
- [ ] App name: OperadorPro
- [ ] Package name: com.operadorpro.app
- [ ] Full description copied
- [ ] Privacy policy URL set
- [ ] App icon uploaded (512×512)
- [ ] Feature graphic uploaded (1024×500)
- [ ] 5+ screenshots uploaded (1080×1920)
- [ ] Content rating submitted (7+)
- [ ] Developer email set
- [ ] Permissions disclosed

---

## 🚀 Next Steps After Setup

### 1. Create App Signing Key (Android Only)

**In Google Play Console:**
1. Go to: Setup → App signing
2. Let Google Play generate keys (recommended)
3. Save the key fingerprint somewhere safe

### 2. Build with EAS

```bash
cd operadorpro-mobile

# Build iOS
eas build --platform ios --profile production

# Build Android
eas build --platform android --release-channel production
```

### 3. Upload Builds

Once builds complete:

**iOS:**
1. Return to App Store Connect
2. Click "Build"
3. Select your EAS build
4. Click "Submit for Review"

**Android:**
1. Google Play Console → Production release
2. Click "Create new release"
3. Select your EAS build
4. Review and publish

---

## ✅ Verification Checklist

After setup, verify everything works:

### iOS Verification
- [ ] Go to: https://appstoreconnect.apple.com
- [ ] Click your app
- [ ] All sections show green checkmarks
- [ ] Version information is correct
- [ ] Build is selected (once uploaded)
- [ ] Status shows "Ready for Submit"

### Android Verification
- [ ] Go to: https://play.google.com/console
- [ ] Click your app
- [ ] Store listing shows all content
- [ ] Privacy policy URL is clickable
- [ ] Screenshots display correctly
- [ ] Content rating is approved

---

## 🆘 Troubleshooting

### "Missing description"
→ Copy exact text from Part 1 or Part 2 above

### "App icon rejected"
→ Must be PNG, exactly 1024×1024 (iOS) or 512×512 (Android)

### "Privacy policy not accessible"
→ Test URL directly: https://operadorpro-legal.netlify.app#privacy

### "Screenshots wrong dimensions"
→ iOS: 1242×2208, Android: 1080×1920 (exactly)

### "Build not appearing"
→ Wait 5-10 minutes after EAS build completes
→ Refresh page
→ Check build is marked "FINISHED" in EAS

---

## 📞 Support

For detailed documentation:
- **iOS Details:** APP_STORE_TEMPLATES.md (iOS section)
- **Android Details:** APP_STORE_TEMPLATES.md (Android section)
- **Building:** EAS_BUILD_AND_DEPLOY.md
- **Complete Process:** PUBLICATION_CHECKLIST.md

---

**Ready to submit?** Follow PUBLICATION_CHECKLIST.md Phase 5 (Build y Submit)

**¡Vamos a publicar! 🚀**

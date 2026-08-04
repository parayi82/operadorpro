# ✅ Publication Checklist

Checklist visual y detallado de todo lo que necesitas hacer antes de publicar tu app.

---

## 📊 Status Overview

```
╔══════════════════════════════════════════════╗
║        OperadorPro - Publication Path       ║
├──────────────────────────────────────────────┤
║ PHASE 1: Técnico           [ ] 0-2 días      ║
║ PHASE 2: Gráficos          [ ] 2-5 días      ║
║ PHASE 3: Testing           [ ] 3-5 días      ║
║ PHASE 4: Stores            [ ] 1-2 días      ║
║ PHASE 5: Revisión + Go Live [ ] 2-5 días     ║
╚══════════════════════════════════════════════╝
```

---

## 🔧 PHASE 1: Technical Setup (0-2 días)

### 1.1 Validación de Configuración

- [ ] Ejecutar `bash scripts/validate-config.sh`
  ```bash
  cd /home/user/operadorpro
  bash scripts/validate-config.sh
  # Esperado: Todos los checks ✓
  ```

- [ ] Verificar app.json es válido
  ```bash
  node -e "console.log(JSON.stringify(require('./operadorpro-mobile/app.json'), null, 2))"
  # No debe haber errores
  ```

- [ ] Verificar eas.json es válido
  ```bash
  node -e "console.log(JSON.stringify(require('./operadorpro-mobile/eas.json'), null, 2))"
  # No debe haber errores
  ```

### 1.2 Crear Proyecto EAS

- [ ] Instalar EAS CLI
  ```bash
  npm install -g eas-cli
  ```

- [ ] Login en EAS
  ```bash
  eas login
  # Abre navegador para autenticación
  ```

- [ ] Crear proyecto EAS
  ```bash
  cd operadorpro-mobile
  eas project:create
  # Anota el PROJECT_ID
  ```

- [ ] Agregar projectId a app.json
  ```bash
  # Editar: operadorpro-mobile/app.json
  # Buscar: "projectId"
  # Valor: "tu-eas-project-id-aqui"
  ```

### 1.3 Configurar Supabase

- [ ] Crear Supabase dev project
  - [ ] Ir a https://supabase.com
  - [ ] New Project → OperadorPro-Dev
  - [ ] Copiar URL y Anon Key

- [ ] Crear Supabase production project
  - [ ] New Project → OperadorPro-Production
  - [ ] Copiar URL y Anon Key

- [ ] Ejecutar migraciones
  ```bash
  cd operadorpro-mobile
  supabase link --project-ref <PROJECT_ID>
  supabase migration up
  ```

### 1.4 Configurar Variables de Ambiente

- [ ] Crear .env.local (desarrollo)
  ```bash
  cat > operadorpro-mobile/.env.local << 'EOF'
  EXPO_PUBLIC_SUPABASE_URL=https://dev.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=...
  EXPO_PUBLIC_EAS_PROJECT_ID=...
  EOF
  ```

- [ ] Crear .env.production
  ```bash
  cat > operadorpro-mobile/.env.production << 'EOF'
  EXPO_PUBLIC_SUPABASE_URL=https://prod.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=...
  EXPO_PUBLIC_EAS_PROJECT_ID=...
  EOF
  ```

- [ ] Verificar .gitignore
  ```bash
  grep ".env" operadorpro-mobile/.gitignore
  # Debe incluir: .env, .env.local, .env.production
  ```

### 1.5 Crear EAS Secrets

- [ ] Crear secret PROD_SUPABASE_URL
  ```bash
  eas secret:create --scope project --name PROD_SUPABASE_URL
  # Ingresa: https://prod.supabase.co
  ```

- [ ] Crear secret PROD_SUPABASE_KEY
  ```bash
  eas secret:create --scope project --name PROD_SUPABASE_KEY
  # Ingresa: tu-anon-key
  ```

- [ ] Verificar secrets
  ```bash
  eas secret:list
  ```

### 1.6 Deploy Legal Website

- [ ] Instalar Netlify CLI
  ```bash
  npm install -g netlify-cli
  ```

- [ ] Login en Netlify
  ```bash
  netlify login
  # Abre navegador
  ```

- [ ] Deploy sitio legal
  ```bash
  cd operadorpro
  netlify deploy --dir="." --prod --open
  # Anota la URL pública
  ```

- [ ] Verificar URLs funcionan
  - [ ] https://operadorpro-legal.netlify.app/
  - [ ] Todos los links internos funcionan

**Result:** ✅ Configuración técnica 100% lista

---

## 🎨 PHASE 2: Graphic Assets (2-5 días)

### 2.1 Preparar App Icon

- [ ] Diseñar icono de app
  - [ ] 1024×1024 pixels
  - [ ] PNG format
  - [ ] Sin transparencia (fondo color o blanco)
  - [ ] Esquinas cuadradas

- [ ] Guardar en: `operadorpro-mobile/assets/images/icon.png`

- [ ] Verificar tamaño
  ```bash
  ls -lh operadorpro-mobile/assets/images/icon.png
  # Debe ser < 500KB
  ```

### 2.2 Crear Screenshots iOS

- [ ] Diseñar 5 screenshots
  - [ ] Dimensiones: 1242×2208 pixels
  - [ ] PNG o JPG format
  - [ ] Mostrar UI real de app
  - [ ] Incluir descripción de features

- [ ] Screenshot 1: Intro + Logo
- [ ] Screenshot 2: Cartas Porte
- [ ] Screenshot 3: Inspecciones
- [ ] Screenshot 4: Cobranza
- [ ] Screenshot 5: Inventario

- [ ] Guardar en carpeta: `assets/screenshots/ios/`

### 2.3 Crear Screenshots Android

- [ ] Diseñar 5 screenshots
  - [ ] Dimensiones: 1080×1920 pixels
  - [ ] PNG o JPG format
  - [ ] Mostrar UI real de app

- [ ] Screenshot 1: Intro + Logo
- [ ] Screenshot 2: Cartas Porte
- [ ] Screenshot 3: Inspecciones
- [ ] Screenshot 4: Cobranza
- [ ] Screenshot 5: Inventario

- [ ] Guardar en carpeta: `assets/screenshots/android/`

### 2.4 Crear Feature Graphic (Android)

- [ ] Diseñar feature graphic
  - [ ] Dimensiones: 1024×500 pixels
  - [ ] PNG o JPG format
  - [ ] Logo + nombre app + tagline
  - [ ] Colores de branding

- [ ] Guardar en: `assets/graphics/feature-graphic.png`

### 2.5 Verificar Todos los Assets

- [ ] Icon: `assets/images/icon.png` ✓
- [ ] iOS Screenshots: 5 files ✓
- [ ] Android Screenshots: 5 files ✓
- [ ] Feature Graphic: ✓
- [ ] Todos < 5MB ✓

**Result:** ✅ Todos los gráficos listos

---

## 🧪 PHASE 3: Testing (3-5 días)

### 3.1 Setup de Testing

- [ ] Instalar dependencias
  ```bash
  cd operadorpro-mobile
  npm install
  ```

- [ ] Instalar emuladores
  - [ ] iOS Simulator (si en Mac)
  - [ ] Android Emulator

### 3.2 Development Build

- [ ] Build iOS development
  ```bash
  eas build --platform ios --profile development
  # Esperar 10-15 minutos
  ```

- [ ] Build Android development
  ```bash
  eas build --platform android --profile development
  # Esperar 10-15 minutos
  ```

- [ ] Instalar en emulador/dispositivo
  - [ ] iOS: Descargar .ipa
  - [ ] Android: Descargar .apk

### 3.3 Testing Funcionalidad

#### Autenticación
- [ ] Crear cuenta nueva
- [ ] Login/logout funciona
- [ ] Recuperar contraseña funciona
- [ ] Datos se guardan en Supabase

#### Cartas Porte
- [ ] Crear carta porte nueva
- [ ] Guardar como borrador
- [ ] Editar carta porte
- [ ] Marcar como completada
- [ ] Eliminar carta porte
- [ ] Buscar/filtrar cartas

#### Inspecciones
- [ ] Crear inspección nueva
- [ ] Marcar ítems OK/NO OK
- [ ] Tomar fotos de problemas
- [ ] Guardar inspección
- [ ] Ver historial de inspecciones
- [ ] Buscar inspecciones

#### Cobranza
- [ ] Crear cobranza nueva
- [ ] Agregar cliente
- [ ] Enviar recordatorio WhatsApp
- [ ] Marcar como pagado
- [ ] Ver estado de pagos

#### Inventario
- [ ] Agregar vehículo
- [ ] Subir documentos (tenencia, seguro)
- [ ] Ver alertas de vencimiento
- [ ] Editar información de vehículo

#### General
- [ ] Push notifications funcionan
- [ ] App no se cuelga en ningún escenario
- [ ] Offline mode funciona (si aplica)
- [ ] Interfaz responsive en diferentes tamaños
- [ ] Permisos (cámara, ubicación) solicitan correctamente

### 3.4 Pruebas en Dispositivo Real

- [ ] Instalar en iPhone real
  ```bash
  # Requiere certificados
  eas build --platform ios --profile development
  ```

- [ ] Instalar en Android real
  ```bash
  adb install operadorpro.apk
  ```

- [ ] Testing en dispositivo real
  - [ ] App abre sin errors
  - [ ] Todas las funciones trabajan
  - [ ] Performance es aceptable
  - [ ] UI se ve correctamente

### 3.5 Testing de Orientación

- [ ] Portrait mode
- [ ] Landscape mode
- [ ] Cambios de orientación

### 3.6 Testing de Conectividad

- [ ] Con conexión 4G/5G
- [ ] Con WiFi
- [ ] Con conexión lenta (simular)
- [ ] Sin conexión (offline)

**Result:** ✅ Testing completado, app estable

---

## 📱 PHASE 4: App Store Setup (1-2 días)

### 4.1 Apple Developer Account

- [ ] Crear/verificar Apple Developer ID
  - [ ] Ir a https://developer.apple.com
  - [ ] Sign Up o Sign In
  - [ ] Verificar email
  - [ ] Pagar $99/año (si es primera vez)

- [ ] Ir a App Store Connect
  - [ ] https://appstoreconnect.apple.com

- [ ] Crear nueva app
  - [ ] Click "+ New App"
  - [ ] Nombre: OperadorPro
  - [ ] Bundle ID: com.operadorpro.app
  - [ ] SKU: operadorpro-v1
  - [ ] Categoría: Business

### 4.2 iOS Metadata Setup

- [ ] Llenar "App Information"
  - [ ] Nombre: OperadorPro
  - [ ] Subtitle: Gestión de Flota
  - [ ] Descripción corta: Gestión integral de flota
  - [ ] Descripción larga: (copiar de APP_STORE_TEMPLATES.md)
  - [ ] Palabras clave: carta porte, inspección, flota, transporte...

- [ ] Llenar "Pricing and Availability"
  - [ ] Free (gratis)
  - [ ] Seleccionar países (mínimo México)

- [ ] Subir assets
  - [ ] App Icon: 1024×1024 PNG
  - [ ] Screenshots (5): 1242×2208
  - [ ] Preview video (opcional)

- [ ] Llenar "General App Information"
  - [ ] Privacy Policy URL: https://operadorpro-legal.netlify.app#privacy
  - [ ] Support URL: https://operadorpro-legal.netlify.app#contact
  - [ ] Copyright: © 2026 OperadorPro
  - [ ] Category: Business

- [ ] Configurar versión
  - [ ] Version string: 1.0.0
  - [ ] Build number: 1 (o superior)
  - [ ] Release date: Hoy o mañana

- [ ] Declaración de privacidad
  - [ ] Marcar permisos usados: Cámara, Ubicación, Fotos, Notificaciones
  - [ ] Describir qué se usa cada permiso

### 4.3 Google Play Account

- [ ] Crear/verificar Google Play Developer account
  - [ ] Ir a https://play.google.com/console
  - [ ] Sign In con Google
  - [ ] Pagar $25 (una sola vez)

- [ ] Crear nueva aplicación
  - [ ] Click "Create app"
  - [ ] Nombre: OperadorPro
  - [ ] Seleccionar idiomas
  - [ ] Agregar categoría: Business

### 4.4 Android Metadata Setup

- [ ] Ir a "Store listing"
  - [ ] Título: OperadorPro
  - [ ] Descripción corta: Gestión integral de flota y transporte...
  - [ ] Descripción completa: (copiar de APP_STORE_TEMPLATES.md)
  - [ ] Categoría: Negocios

- [ ] Subir assets
  - [ ] App icon: 512×512 PNG (Adaptive icon)
  - [ ] Feature graphic: 1024×500 PNG
  - [ ] Screenshots (5): 1080×1920 PNG/JPG

- [ ] Contact details
  - [ ] Email: support@operadorpro.com
  - [ ] Website: https://operadorpro-legal.netlify.app
  - [ ] Privacy policy: https://operadorpro-legal.netlify.app#privacy

- [ ] Content rating questionnaire
  - [ ] Completar cuestionario de contenido
  - [ ] Marcar como aplicación de negocios
  - [ ] Sin violencia, contenido sexual, etc

**Result:** ✅ Ambas stores configuradas

---

## 🏗️ PHASE 5: Build y Submit (1-2 días)

### 5.1 Production Build iOS

- [ ] Actualizar version en app.json
  ```json
  {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1"
    }
  }
  ```

- [ ] Build de producción
  ```bash
  cd operadorpro-mobile
  eas build --platform ios --profile production
  # Esperar 15-20 minutos
  ```

- [ ] Verificar build completó sin errores
  ```bash
  eas build:list
  # Ver que el más reciente está "FINISHED"
  ```

### 5.2 Production Build Android

- [ ] Actualizar version en app.json
  ```json
  {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    }
  }
  ```

- [ ] Build de producción
  ```bash
  eas build --platform android --release-channel production
  # Esperar 15-20 minutos
  ```

- [ ] Verificar build completó sin errores
  ```bash
  eas build:list
  # Ver que el más reciente está "FINISHED"
  ```

### 5.3 Submit a App Store

- [ ] Submit iOS
  ```bash
  eas submit --platform ios --latest
  ```

  - [ ] Seleccionar: App Store Connect
  - [ ] Esperar confirmación

- [ ] Submit Android
  ```bash
  eas submit --platform android --latest
  ```

  - [ ] Seleccionar: Google Play
  - [ ] Esperar confirmación

- [ ] Verificar submissions
  ```bash
  eas submission:list
  # Ver status de ambos
  ```

### 5.4 Monitorear Revisión

- [ ] App Store Connect
  - [ ] Ir a: https://appstoreconnect.apple.com
  - [ ] Ver status de app
  - [ ] Típicamente: 24-48 horas

- [ ] Google Play Console
  - [ ] Ir a: https://play.google.com/console
  - [ ] Ver status de app
  - [ ] Típicamente: 2-4 horas

**Result:** ✅ Apps enviadas a revisión

---

## 🎉 PHASE 6: Go Live & Monitoring

### 6.1 Aprobación de Apple

- [ ] App Store rechazó o aprobó?
  - [ ] ✅ Aprobado: Ir a 6.2
  - [ ] ❌ Rechazado: Ver correcciones, fix, resubmit

- [ ] En caso de rechazo:
  - [ ] Leer feedback detalladamente
  - [ ] Hacer cambios necesarios
  - [ ] Incrementar buildNumber en app.json
  - [ ] Hacer nuevo build
  - [ ] Resubmit

### 6.2 Aprobación de Google

- [ ] App Play rechazó o aprobó?
  - [ ] ✅ Aprobado: Ir a 6.3
  - [ ] ❌ Rechazado: Ver correcciones, fix, resubmit

- [ ] En caso de rechazo:
  - [ ] Leer feedback
  - [ ] Hacer cambios
  - [ ] Incrementar versionCode en app.json
  - [ ] Hacer nuevo build
  - [ ] Resubmit

### 6.3 App Publicada

- [ ] App Store: Cambiar estado a "Ready for Sale"
- [ ] Google Play: Confirmar que está en producción
- [ ] Ambas plataformas: Verificar app es descargable público

### 6.4 Post-Launch

- [ ] Monitorear crashes/errors
  - [ ] App Store Connect → TestFlight → Crashes
  - [ ] Google Play Console → Vitals → Crashes

- [ ] Monitorear reviews
  - [ ] App Store: Leer reviews de usuarios
  - [ ] Google Play: Leer reviews y ratings

- [ ] Preparar versión 1.0.1 con fixes críticos

**Result:** ✅ ¡App publicada y en vivo!

---

## 📋 Pre-Launch Verification

Antes de proceder con cada fase:

### Fase 1
- [ ] Config validator pasa
- [ ] No hay errores en console
- [ ] app.json y eas.json son JSON válido

### Fase 2
- [ ] Todos los gráficos están en dimensiones correctas
- [ ] Calidad de imagen es profesional
- [ ] No hay información sensible en screenshots

### Fase 3
- [ ] App abre sin crashes
- [ ] Funciones principales trabajan
- [ ] Sin errors en console durante uso

### Fase 4
- [ ] Ambas cuentas de desarrollador creadas
- [ ] Metadatos están completos en ambas stores
- [ ] URLs de Privacy/Terms funcionan

### Fase 5
- [ ] Builds completaron sin errores
- [ ] Tamaño de app es razonable (< 100MB)
- [ ] Versiones incrementadas correctamente

---

## 🚨 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| **Validator falla** | Ejecutar: `bash scripts/validate-config.sh` |
| **Build falla** | Ver logs: `eas build:logs <build-id>` |
| **App rejected** | Leer feedback en Store Connect/Play Console |
| **Can't submit** | Verificar: metadata completo, assets subidos, version correcta |
| **App crashes** | Verificar: `.env.production` correcto, Supabase accesible |

---

## 📞 Recursos

- **This Checklist:** PUBLICATION_CHECKLIST.md
- **Technical Guide:** EAS_BUILD_AND_DEPLOY.md
- **Environment Setup:** ENVIRONMENT_SETUP.md
- **Assets Specs:** APP_STORE_ASSETS.md
- **Store Metadata:** APP_STORE_TEMPLATES.md
- **Commands:** COMMANDS_READY_TO_COPY.md

---

**Última actualización:** 4 de agosto de 2026  
**Tiempo estimado:** 1-2 semanas de trabajo
**Status:** ✅ Completo y listo

**¡Vamos a publicar tu app! 🚀**

# 📱 OperadorPro - Publication Checklist

Guía visual de todo lo que necesitas antes de publicar en App Store y Google Play.

## ✅ Código y Configuración

- [x] **app.json** - Configurado con bundleIdentifier, package, permisos, plugins
- [x] **eas.json** - Perfiles de build para development, preview, production
- [x] **CAMERA_SETUP.md** - Documentación de cámara y foto upload
- [x] **PUSH_NOTIFICATIONS.md** - Documentación de notificaciones push
- [x] **EAS_BUILD_AND_DEPLOY.md** - Guía completa de build y deploy
- [x] **APP_STORE_ASSETS.md** - Dimensiones y especificaciones de assets
- [x] **ENVIRONMENT_SETUP.md** - Configuración de variables de ambiente
- [x] **ios/PrivacyInfo.xcprivacy** - Declaración de privacidad para iOS
- [x] **.env.example** - Template de variables de ambiente
- [x] **.gitignore** - Protege archivos sensibles

## 🔐 Documentos Legales

- [x] **PRIVACY_POLICY.md** - Política de privacidad completa
- [x] **TERMS_OF_SERVICE.md** - Términos de servicio completos

**Próximo paso**: Publica estos documentos en un sitio web público
- Opción 1: GitHub Pages (gratis)
- Opción 2: Sitio web de OperadorPro
- Opción 3: Netlify (gratis)

**URLs necesarias**:
- Privacy Policy: `https://your-domain.com/privacy`
- Terms of Service: `https://your-domain.com/terms`

## 👤 Cuentas Necesarias

### EAS (Expo Application Services)
- [ ] Cuenta creada en https://expo.dev
- [ ] Proyecto EAS creado (`eas project:create`)
- [ ] PROJECT_ID obtenido y agregado a app.json
- [ ] Credenciales de Apple y Google Play agregadas a EAS

### Apple Developer Program
- [ ] Cuenta pagada ($99/año)
- [ ] Apple ID creado
- [ ] Equipo de desarrollo configurado
- [ ] Acceso a https://developer.apple.com/account

### Google Play Developer
- [ ] Cuenta pagada ($25 única vez)
- [ ] Perfil de desarrollador completo
- [ ] Acceso a https://play.google.com/console
- [ ] Google Play key JSON descargado

### Supabase (Producción)
- [ ] Proyecto de producción creado
- [ ] URL y Anon Key anotados
- [ ] Migraciones ejecutadas
- [ ] Bucket `inspection-photos` creado
- [ ] RLS policies verificadas

## 🏗️ Configuración Técnica

### iOS
- [ ] Bundle Identifier configurado: `com.operadorpro.app`
- [ ] App creada en App Store Connect
- [ ] Certificado de distribución creado
- [ ] Provisioning profile para App Store creado
- [ ] PrivacyInfo.xcprivacy archivo en lugar correcto
- [ ] Permisos en infoPlist configurados

### Android
- [ ] Package name configurado: `com.operadorpro.app`
- [ ] App creada en Google Play Console
- [ ] Google Play key JSON descargado y seguro
- [ ] Permisos en AndroidManifest configurados
- [ ] Adaptive icons creados (foreground, background, monochrome)

### Environment Variables
- [ ] `.env.local` creado con valores de desarrollo
- [ ] `.env.production` preparado con valores de producción
- [ ] EAS secrets creados para production
- [ ] eas.json actualizado con referencias a secrets

## 🎨 Assets Gráficos

### Iconos
- [ ] App Icon base: 1024×1024 px (PNG)
- [ ] iOS: Copiado a `ios/Images.xcassets/AppIcon.appiconset/`
- [ ] Android: 
  - [ ] Foreground: 108×108 px
  - [ ] Background: 108×108 px
  - [ ] Monochrome: 108×108 px
- [ ] Google Play: 512×512 px (PNG)

### Screenshots

**iOS (mínimo 2 por tamaño):**
- [ ] iPhone 6.7" (OLED): 1290×2796 px
- [ ] iPhone 6.1" (OLED): 1179×2556 px

**Android (mínimo 2, máximo 8):**
- [ ] Tamaño: 1440×2560 px o 1080×1920 px

### Otros Assets (Recomendado)
- [ ] Feature Graphic Android: 1024×500 px
- [ ] App Preview Video (opcional): 15-30 seg, 1080p+, MP4

## 📝 Metadata de Tiendas

### App Store Connect (iOS)
- [ ] Nombre de app: "OperadorPro"
- [ ] Descripción corta: (máx 30 caracteres)
- [ ] Descripción completa: completada desde PRIVACY_POLICY.md
- [ ] Palabras clave: 5-10 palabras clave
- [ ] Categoría: Business o Productivity
- [ ] Icono de app: 1024×1024
- [ ] Screenshots: Cargados para cada tamaño
- [ ] URL de soporte: `https://your-domain.com/support`
- [ ] URL de política de privacidad: `https://your-domain.com/privacy`
- [ ] Información de contacto: Email de soporte válido

### Google Play Console (Android)
- [ ] Nombre de app: "OperadorPro"
- [ ] Descripción corta: (máx 80 caracteres)
- [ ] Descripción completa: completada desde PRIVACY_POLICY.md
- [ ] Categoría: Business o Productivity
- [ ] Icono de app: 512×512
- [ ] Feature Graphic: 1024×500
- [ ] Screenshots: 2-8 screenshots
- [ ] URL de política de privacidad: `https://your-domain.com/privacy`
- [ ] Información de contacto: Email de soporte
- [ ] Clasificación de contenido: completada

## 🧪 Testing

### Local
- [ ] App funciona en emulador Android
- [ ] App funciona en emulador/dispositivo iOS
- [ ] Permiso de cámara solicita correctamente
- [ ] Permiso de ubicación solicita correctamente
- [ ] Permiso de notificaciones solicita correctamente
- [ ] Captura de fotos funciona
- [ ] Upload de fotos a Supabase funciona
- [ ] Login/Signup funciona
- [ ] Crear Carta Porte funciona
- [ ] Crear inspección con fotos funciona
- [ ] Crear cobranza funciona
- [ ] Crear unidad de flota funciona

### Beta (Antes de Publicar)
- [ ] TestFlight build enviado y testeado en iOS
- [ ] Google Play Beta build enviado y testeado en Android
- [ ] Mínimo 48 horas de testing en cada plataforma
- [ ] Reportes de errores revisados
- [ ] Funcionalidad offline verificada

## 🚀 Build & Submission

### Builds
- [ ] EAS build iOS exitoso: `eas build --platform ios`
- [ ] EAS build Android (AAB) exitoso: `eas build --platform android --release-channel production`
- [ ] Ambos builds descargados y verificados

### iOS Submission
- [ ] Build cargado en App Store Connect
- [ ] Todas las preguntas respondidas (IDFA, etc.)
- [ ] Version notes completadas
- [ ] Enviado a revisión: `eas submit --platform ios`
- [ ] **Esperar 24-48 horas para revisión de Apple**

### Android Submission
- [ ] Build (AAB) cargado en Google Play Console
- [ ] Release notes completadas
- [ ] Enviado a producción: `eas submit --platform android`
- [ ] **Esperar 2-4 horas para que esté disponible**

## 📊 Post-Publication

- [ ] Configurar Google Analytics en Google Play Console
- [ ] Habilitar reviews y ratings en App Store
- [ ] Crear email de soporte (support@operadorpro.com)
- [ ] Crear proceso de feedback y bug reporting
- [ ] Configurar notificaciones de nuevas reviews
- [ ] Planificar actualizaciones futuras

## 🆘 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "Certificate not found" | `eas credentials --platform ios` |
| "Build failed" | Revisa logs en EAS Dashboard |
| "App rejected by Apple" | Lee el email de rechazo, arregla y resubmite |
| "APK upload failed" | Google Play solo acepta AAB, no APK |
| "Privacy Policy URL required" | Publica documentos legales y agrega URL |
| "Photos not uploading" | Verifica Supabase Storage bucket y RLS |

## 📚 Documentación de Referencia

Tienes estos documentos en el repo:
1. **README.md** - Overview del proyecto
2. **EAS_BUILD_AND_DEPLOY.md** - Paso a paso completo
3. **APP_STORE_ASSETS.md** - Especificaciones de assets
4. **ENVIRONMENT_SETUP.md** - Configuración de variables
5. **CAMERA_SETUP.md** - Configuración de cámara
6. **PUSH_NOTIFICATIONS.md** - Setup de notificaciones
7. **PRIVACY_POLICY.md** - Política de privacidad (publica esto)
8. **TERMS_OF_SERVICE.md** - Términos de servicio (publica esto)

## ⏱️ Estimado de Tiempo

- **Setup inicial**: 2-3 horas (cuentas + certificados)
- **Preparar assets**: 4-8 horas (iconos, screenshots)
- **Testing**: 4-6 horas
- **Builds**: 30-60 minutos (2-3 builds)
- **Submission & espera**: 24-48 horas (Apple) + 2-4 horas (Google)

**Total**: 1-2 semanas desde cero hasta publicación

## 🎉 Listo?

Una vez hayas verificado TODO en este checklist:

```bash
# 1. Posicionate en tu rama
git checkout claude/cargo-truck-management-app-jndduf

# 2. Verifica que todo esté commiteado
git status

# 3. Crea EAS project
eas project:create

# 4. Actualiza app.json con project ID
# ... edita app.json ...

# 5. Commit y push
git add app.json
git commit -m "chore: Add EAS project ID"
git push

# 6. Build de prueba
eas build --platform ios --profile development

# 7. Una vez todo esté testeado, build de producción
eas build --platform ios --profile production
eas build --platform android --profile production

# 8. Submit
eas submit --platform ios
eas submit --platform android
```

**¡Listo para publicar!** 🚀

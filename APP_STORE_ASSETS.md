# 📸 App Store Assets Specifications

Guía completa de dimensiones y especificaciones para todos los gráficos que necesitas para publicar en App Store (iOS) y Google Play (Android).

---

## 📊 Tabla Comparativa Rápida

| Asset | iOS | Android | Formato | Cantidad |
|-------|-----|---------|---------|----------|
| **App Icon** | 1024×1024 | 512×512 | PNG | 1 cada |
| **Screenshots** | 1242×2208 | 1080×1920 | PNG/JPG | 5-10 cada |
| **Feature Graphic** | N/A | 1024×500 | PNG/JPG | 1 |
| **Preview Video** | 30 seg max | N/A | MP4 | Opcional |

---

## 🍎 iOS App Store Connect

### 1. App Icon

**Dimensiones:** 1024 × 1024 pixels  
**Formato:** PNG (sin compresión pérdida)  
**Requerimientos:**
- ✅ Sin transparencia (fondo sólido)
- ✅ Sin bordes redondeados (iOS lo hace automáticamente)
- ✅ Esquinas cuadradas perfectas
- ✅ RGB color space (no CMYK)

**Herramientas sugeridas:**
- Figma (gratuito)
- Adobe Photoshop
- Sketch

**Dónde subir:** App Store Connect → App Information → App Icon

### 2. Screenshots

**Cantidad:** 5-10 (recomendado 5)  
**Dimensiones:** 1242 × 2208 pixels (iPhone)  
**Formato:** PNG o JPG  
**Resolución:** 72 DPI

**Contenido sugerido:**
1. **Screenshot 1:** Logo + "Gestión de Flota"
2. **Screenshot 2:** Pantalla de Cartas Porte
3. **Screenshot 3:** Pantalla de Inspecciones
4. **Screenshot 4:** Pantalla de Cobranza
5. **Screenshot 5:** Pantalla de Inventario

**Mejores prácticas:**
- ✅ Mostrar UI real de la app
- ✅ Incluir captions descriptivos
- ✅ Usar colores de branding (#d4a574)
- ✅ Mostrar features principales
- ✅ Usar fuentes legibles

**Dónde subir:** App Store Connect → App Preview

### 3. Preview Video (Opcional)

**Duración:** Máximo 30 segundos  
**Formato:** MP4, MOV  
**Resolución:** 1080p (1920×1080) o 4K  
**Codificador:** H.264  
**Audio:** AAC, 128-256 kbps

**Contenido sugerido:**
- Introducción del app (3 seg)
- Demo de cada feature (5 seg c/u)
- Call-to-action final (2 seg)

---

## 🤖 Google Play Console

### 1. App Icon (Adaptive Icon)

**Dimensiones:** 512 × 512 pixels  
**Formato:** PNG  
**Requerimientos:**
- ✅ Icon (foreground): 108×108 dp
- ✅ Background: Color sólido o imagen
- ✅ Safe zone: círculo central 66×66 dp
- ✅ Sin texto o elementos decorativos fuera de safe zone

**Estructura recomendada:**
```
Icon file (512×512)
├── Background (puede ser transparente o color)
└── Foreground (icon principal, centrado)
```

**Dónde subir:** Google Play Console → App icon (Adaptive icon)

### 2. Feature Graphic

**Dimensiones:** 1024 × 500 pixels  
**Formato:** PNG o JPG  
**Resolución:** 72 DPI  
**Proporción:** 2.048:1 exactamente

**Contenido:**
- Logo del app a la izquierda (60%)
- Nombre del app
- Tagline o descripción corta
- Colores de branding

**Ejemplo:**
```
┌─────────────────────────────────────────────┐
│  [LOGO]        OperadorPro                  │
│               Gestión Integral de Flota     │
│                                              │
│                                              │
└─────────────────────────────────────────────┘
       1024 px (ancho) x 500 px (alto)
```

**Dónde subir:** Google Play Console → Gráficos (Feature Graphic)

### 3. Screenshots

**Cantidad:** 5-10 (recomendado 5)  
**Dimensiones:** 1080 × 1920 pixels (Full phone)  
**Formato:** PNG o JPG  
**Resolución:** 72 DPI

**Diferencias con iOS:**
- Más vertical (1080×1920 vs 1242×2208)
- Se muestran en celulares Android reales
- Pueden incluir notch y navigation bar

**Dónde subir:** Google Play Console → Screenshots

### 4. Promo Graphic (Opcional)

**Dimensiones:** 180 × 120 pixels  
**Formato:** PNG o JPG  
**Uso:** Banner promocional en Google Play

---

## 🎨 Guía de Diseño

### Colores de Branding

**Color Primario:** #d4a574 (Dorado)  
**Color Secundario:** #333333 (Gris oscuro)  
**Fondo:** #FFFFFF (Blanco) o #F5F5F5 (Gris claro)  
**Texto:** #333333 (Oscuro)  

### Tipografía

**Primaria:** Inter, Roboto, o system font  
**Tamaño título:** 32-48pt  
**Tamaño subtítulo:** 16-24pt  
**Tamaño body:** 12-16pt  

### Espaciado

- **Márgenes:** 16-24px
- **Padding interno:** 8-16px
- **Separación elementos:** 8px

---

## 📱 Cómo Capturar Screenshots

### Opción 1: Desde Emulador

**iOS (Xcode):**
```bash
# Abrir Xcode
open -a Xcode

# O desde Terminal
xcrun simctl screenshot booted screenshot.png
```

**Android (Android Studio):**
```bash
# En Android Studio:
# Tools → Device Manager → Device → Screenshot
# O desde Terminal:
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png
```

### Opción 2: Desde Dispositivo Real

**iPhone:**
1. Botón de volumen arriba + botón lateral
2. Captura automática en Fotos

**Android:**
1. Botón volumen abajo + botón potencia
2. Captura automática en Galería

### Opción 3: Herramientas Especializadas

**Para mockups con marco de teléfono:**
- **Frame.io** (online, free)
- **Figma Plugins** (Device mockups)
- **MockUphone** (online)
- **Shotsnapp** (online, free)

---

## 🖼️ Checklist de Diseño

### Antes de Subir

- [ ] Icon: 1024×1024 (iOS), 512×512 (Android)
- [ ] Screenshots: 5+ en formato correcto
- [ ] Feature Graphic: 1024×500 (Android)
- [ ] Colores consistentes con branding
- [ ] Texto legible (min 12pt)
- [ ] Sin información sensible visible
- [ ] Sin marcas de competidores
- [ ] PNG/JPG sin compresión extrema

### Antes de Publicar

- [ ] Todos los assets subidos en ambas plataformas
- [ ] Preview en website funcionando
- [ ] Imagen de icono coincide entre plataformas
- [ ] Descripción coincide con screenshots
- [ ] URLs de privacy/terms funcionales

---

## 📐 Especificaciones Detalladas por Plataforma

### iOS - Requerimientos Técnicos

```
App Icon:
- PNG, RGB, no CMYK
- Exactly 1024×1024
- Sin transparencia (fondo blanco/color)
- sRGB color profile

Screenshots:
- Máx 5-10 imágenes
- JPEG o PNG
- Min 1242×2208, Max 2208×1242
- Menos de 5MB cada

Preview Video:
- H.264 codec
- AAC audio
- Máx 30 segundos
- Resolución 1080p+
```

### Android - Requerimientos Técnicos

```
Adaptive Icon:
- PNG, RGB
- 512×512 pixels
- Safe zone: 66×66 dp en el centro
- Sin transparencia en background

Screenshots:
- JPEG o PNG
- 1080×1920 pixels (recomendado)
- Mín 1080×1920, Máx 1920×1080
- Menos de 8MB cada (recomendado <1MB)

Feature Graphic:
- PNG o JPEG
- Exactly 1024×500 pixels
- Menos de 1MB
```

---

## 🚀 Timeline de Diseño

### Corto (1 día)
- ✅ Crear icon usando logo existente
- ✅ Tomar screenshots de app
- ✅ Agregar texto mínimo en Figma

### Medio (2-3 días)
- ✅ Diseñar 5 screenshots con captions
- ✅ Crear feature graphic
- ✅ Iterar basado en feedback

### Completo (4-5 días)
- ✅ Diseño professional de screenshots
- ✅ Grabar video de demostración
- ✅ Crear promo graphics
- ✅ Testing en ambas plataformas

---

## 💡 Consejos de Diseño

### ✅ Hace la App Más Atractiva

- ✅ Usar colores vibrantes pero profesionales
- ✅ Mostrar UI real de la app (no mockups)
- ✅ Incluir mano/dedo interactuando
- ✅ Usar iconos consistentes
- ✅ Mantener branding constante

### ❌ Evitar

- ❌ Screenshots borrosos o pixelados
- ❌ Información sensible/personal
- ❌ Logos de competidores
- ❌ Interfaces desactualizadas
- ❌ Texto ilegible o muy pequeño
- ❌ Fondos genéricos/aburridos

---

## 🔄 Actualizar Assets

### Cuando Hacer Cambios

1. **Mayor cambio de UI:** Actualizar screenshots
2. **Cambio de branding:** Actualizar icon y graphics
3. **Nueva feature:** Crear nuevo screenshot
4. **App Store feedback:** Revisar y mejorar

### Cómo Actualizar

```
1. Preparar nuevos assets
2. En App Store Connect/Google Play: "Manage Versions"
3. Subir nuevas imágenes (reemplaza antiguas)
4. Guardar cambios
5. Enviar para revisión (si hay cambios de app)
```

---

## 📞 Recursos para Crear Assets

### Herramientas Gratuitas

- **Figma:** https://figma.com (diseño, free plan)
- **Pixlr:** https://pixlr.com (editor online)
- **Canva:** https://canva.com (templates)
- **MockUphone:** https://mockuphone.com (frames)
- **Frame.io:** https://frame.io (mockups)

### Herramientas Premium

- **Adobe Photoshop:** $55/mes
- **Sketch:** $99 one-time
- **Affinity Photo:** $70 one-time

### Recursos de Assets

- **Unsplash:** https://unsplash.com (fotos gratis)
- **Pexels:** https://pexels.com (fotos gratis)
- **Flaticon:** https://flaticon.com (icons)
- **Material Design:** https://fonts.google.com (fonts)

---

## ✅ Checklist Pre-Publicación (Assets)

- [ ] App Icon creado (1024×1024 iOS, 512×512 Android)
- [ ] 5 screenshots de iOS (1242×2208)
- [ ] 5 screenshots de Android (1080×1920)
- [ ] Feature Graphic (1024×500)
- [ ] Todos los archivos en PNG/JPG
- [ ] Archivos bajo límite de tamaño
- [ ] Información sensible removida
- [ ] Colores consistentes con branding
- [ ] Texto claro y legible
- [ ] Icons y UI matches app real
- [ ] Revisado por alguien más
- [ ] Subido en ambas plataformas

---

**Última actualización:** 4 de agosto de 2026  
**Status:** ✅ Especificaciones completas

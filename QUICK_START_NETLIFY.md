# ⚡ Quick Start: Publicar Legal Website en Netlify

**Tiempo:** 5 minutos  
**Costo:** Gratis

---

## 🎯 El Más Rápido (Sin Terminal)

### Opción 1: Netlify Drop (2 minutos)

1. **Descarga el archivo:**
   ```
   operadorpro/legal-website.html
   ```

2. **Ve a:** https://app.netlify.com/drop

3. **Arrastra el archivo** al área de drop

4. **¡Listo!** 🎉
   - Netlify te genera una URL automática
   - Ejemplo: `https://quirky-name-12345.netlify.app`

**Cambiar nombre:**
- Click "Site settings" → "Change site name"
- Nuevo nombre: `operadorpro-legal`
- Nueva URL: `https://operadorpro-legal.netlify.app`

---

## 🚀 Con Terminal (5 minutos)

Si prefieres usar terminal/PowerShell.

### Paso 1: Instalar Netlify CLI
```bash
npm install -g netlify-cli
```

### Paso 2: Loguear
```bash
netlify login
```

### Paso 3: Correr el script
```bash
# Linux/macOS
bash scripts/deploy-legal-website.sh

# Windows (PowerShell)
.\scripts\deploy-legal-website.ps1
```

### ✅ Hecho!
El script:
- Sube tu sitio
- Te da las URLs
- Guarda en `.netlify-urls.txt`

---

## 📋 Después: Obtener URLs

**Sea cual sea el método, obtén estas URLs:**

```
Privacy Policy:  https://tu-sitio.netlify.app#privacy
Terms:          https://tu-sitio.netlify.app#terms
```

---

## 🎯 Usa las URLs en:

### 1. App Store Connect (iOS)
- Privacy Policy URL → `https://tu-sitio.netlify.app#privacy`

### 2. Google Play Console (Android)
- Privacy Policy URL → `https://tu-sitio.netlify.app#privacy`

### 3. app.json (Opcional)
```json
{
  "expo": {
    "extra": {
      "privacyPolicyUrl": "https://tu-sitio.netlify.app#privacy",
      "termsOfServiceUrl": "https://tu-sitio.netlify.app#terms",
      "supportEmail": "support@operadorpro.com"
    }
  }
}
```

---

## ✅ Verificar que Funciona

1. Abre tu URL en navegador
2. Deberías ver:
   - Header "OperadorPro"
   - Navigation tabs (Inicio, Privacy, Terms, Contact)
   - Contenido completo en español
   - Todo con colores de tu branding (#d4a574)

---

## 🎊 ¡Listo!

Tu sitio legal está **publicado y seguro** en:
```
https://tu-sitio.netlify.app
```

Puedes usar estas URLs en App Store y Google Play ahora mismo.

---

## 🆘 Si Algo Falla

### "Archivo no encontrado"
→ Asegúrate que estés en la carpeta `operadorpro/`

### "Command not found: netlify"
→ Instala: `npm install -g netlify-cli`

### "Not authenticated"
→ Login: `netlify login`

### "Sitio no se ve bien"
→ Abre en incognito mode
→ O verifica en otro navegador

---

**¡Ahora puedes publicar tu app en App Store y Google Play!** 🚀

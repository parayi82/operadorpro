# Netlify Deployment - Legal Website

Guía para publicar `legal-website.html` en Netlify (gratis en 3 minutos).

## 🚀 Opción 1: Netlify Drop (Más Rápido - Sin Código)

La forma más fácil sin usar Git.

### Paso 1: Descargar archivo
```bash
# Ya está en tu repo:
# /operadorpro/legal-website.html
```

### Paso 2: Ir a Netlify Drop
1. Abre: https://app.netlify.com/drop
2. Arrastra `legal-website.html` a la zona de drop
3. ¡Hecho! Netlify genera tu URL automáticamente

**Resultado:**
- URL: `https://your-random-name.netlify.app`
- Cambiar nombre en "Site Settings" → "Change site name"

**Ventaja:** Sin crear cuenta si no tienes, sin conectar Git  
**Desventaja:** Si el archivo cambia, debes re-subir manualmente

---

## 🔧 Opción 2: Deploy desde GitHub (Mejor)

Conectar tu repo a Netlify para deployment automático.

### Paso 1: Crear cuenta Netlify (si no tienes)
1. Ve a https://app.netlify.com
2. Click "Sign up"
3. Usa tu cuenta de GitHub

### Paso 2: Conectar repositorio
1. Dashboard → "New site from Git"
2. Selecciona GitHub → autoriza
3. Busca `parayi82/operadorpro`
4. Build settings:
   - **Base directory:** (deja vacío)
   - **Build command:** (deja vacío)
   - **Publish directory:** (deja vacío)
5. Click "Deploy site"

### Paso 3: Configurar dominio (opcional)
1. Site settings → Domain management
2. "Add custom domain" si tienes uno
3. Usa dominio default de Netlify si no

**Resultado:**
- Tu sitio se deploya automáticamente
- Cada push a `main` actualiza el sitio

---

## 📝 Paso a Paso Detallado (Con Screenshots)

### En GitHub

```bash
# 1. El archivo ya está en tu repo:
ls -la operadorpro/legal-website.html
# output: legal-website.html

# 2. Si aún no está commiteado:
git add operadorpro/legal-website.html
git commit -m "docs: Add legal website for App Store compliance"
git push origin main
```

### En Netlify

1. **Ve a https://app.netlify.com**
   - Si no tienes cuenta, click "Sign up"
   - Autoriza con GitHub

2. **Click "New site from Git"**
   ![nuevo-sitio]

3. **Selecciona GitHub**
   - Autoriza acceso a tus repos

4. **Busca parayi82/operadorpro**
   - Selecciona tu repo

5. **Deploy settings (dejar por defecto)**
   - Base directory: (vacío)
   - Build command: (vacío)
   - Publish directory: (vacío)

6. **Click "Deploy site"**
   - Netlify empieza a procesar
   - Tarda 1-2 minutos

7. **¡Listo!**
   - Tu URL aparece: `https://random-name.netlify.app`
   - Cambiar nombre en Site settings si quieres

---

## 🎯 Después de Deployar

### Verificar que funciona
1. Abre tu URL en navegador
2. Deberías ver el sitio legal con:
   - Header "OperadorPro"
   - Navegación (Inicio, Privacy, Terms, Contact)
   - Contenido legal completo

### Obtener URLs para App Stores

**Privacy Policy URL:**
```
https://tu-sitio.netlify.app#privacy
```

**Terms of Service URL:**
```
https://tu-sitio.netlify.app#terms
```

### Cambiar nombre del sitio

1. En Netlify dashboard → "Site settings"
2. "Change site name"
3. Escribe: `operadorpro-legal` (por ejemplo)
4. Tu nueva URL: `https://operadorpro-legal.netlify.app`

---

## 🔒 Seguridad (Ya Configurado)

El sitio incluye:
- ✅ HTTPS automático (Netlify)
- ✅ Headers de seguridad
- ✅ STS (Strict Transport Security)
- ✅ CSP (Content Security Policy)
- ✅ No tracking, no cookies

---

## 📊 Estadísticas Post-Deploy

Netlify te muestra:
- Visitors por día
- Performance del sitio
- Uptime (99.99%+)
- Bandwitdh usado

**Acceder a Analytics:**
1. Dashboard → Tu sitio
2. "Analytics" en sidebar

---

## 🚨 Troubleshooting

### "El sitio no se ve bien"
→ Abre DevTools (F12) y verifica la consola
→ Generalmente es un problema de CSS o rutas

### "URL no funciona"
→ Espera 2-3 minutos después de deploy
→ Refresca el navegador (Ctrl+F5)
→ Verifica en incognito mode

### "Cambios no se actualizan"
→ En GitHub: push a `main`
→ En Netlify: espera el redeploy automático (1-2 min)
→ Si usaste Drop: re-sube el archivo

---

## 🎁 Bonus: Deploy Automático en Cada Push

Ya está configurado si usas GitHub method:

```
Git push → GitHub → Webhook → Netlify → Auto Deploy
↓
Tu sitio se actualiza automáticamente en 1-2 minutos
```

No necesitas hacer nada. Cualquier cambio a `legal-website.html` se despliega solo.

---

## 💾 Archivos Involucrados

```
operadorpro/
├── legal-website.html          ← Tu sitio legal (publicado)
├── PRIVACY_POLICY.md           ← Contenido (en el HTML)
├── TERMS_OF_SERVICE.md         ← Contenido (en el HTML)
└── NETLIFY_DEPLOYMENT.md       ← Este archivo
```

---

## ✅ Checklist Post-Deployment

- [ ] Sitio visible en URL pública
- [ ] Todos los tabs funcionan (Inicio, Privacy, Terms, Contact)
- [ ] Responsive en mobile
- [ ] No hay errores en consola (F12)
- [ ] HTTPS activo (URL con 🔒)
- [ ] Privacy Policy URL anotada
- [ ] Terms of Service URL anotada
- [ ] URLs agregadas a app.json

---

## 📞 Soporte Netlify

- Email: support@netlify.com
- Chat: En app.netlify.com
- Docs: https://docs.netlify.com

---

**Status:** ✅ Listo para publicar  
**Tiempo de Deploy:** 1-2 minutos  
**Costo:** GRATIS (con opción de planes pagos)  
**Uptime:** 99.99%+

¡Vamos a publicar! 🚀

# 🚀 Scripts de Deployment

Scripts para automatizar la publicación de OperadorPro.

## 📱 Deploy Legal Website a Netlify

Script para publicar el sitio legal automáticamente a Netlify.

### Requisitos Previos

1. **Instalar Netlify CLI:**
```bash
npm install -g netlify-cli
```

2. **Crear cuenta en Netlify:**
   - Ve a https://app.netlify.com
   - Sign up con GitHub

3. **Loguear en Netlify:**
```bash
netlify login
```

### Uso

#### Linux/macOS:
```bash
cd operadorpro/
bash scripts/deploy-legal-website.sh
```

#### Windows (PowerShell):
```powershell
cd operadorpro/
.\scripts\deploy-legal-website.ps1
```

### Qué Hace

1. ✅ Verifica que `legal-website.html` existe
2. ✅ Verifica que Netlify CLI está instalado
3. ✅ Verifica que estás logueado
4. ✅ Sube el sitio a Netlify
5. ✅ Te da las URLs para app stores
6. ✅ Guarda las URLs en `.netlify-urls.txt`

### Resultado

El script te dará:
- **URL del sitio:** `https://your-site.netlify.app`
- **Privacy Policy URL:** `https://your-site.netlify.app#privacy`
- **Terms URL:** `https://your-site.netlify.app#terms`

---

## 📋 Otros Scripts (Próximamente)

- `build-mobile-app.sh` - Build de iOS/Android
- `create-eas-project.sh` - Setup de EAS
- `submit-to-stores.sh` - Submit automático a tiendas

---

## 🆘 Troubleshooting

### "netlify command not found"
```bash
npm install -g netlify-cli
```

### "Not logged in"
```bash
netlify login
```

### "legal-website.html not found"
- Asegúrate de correr desde la carpeta `operadorpro/` (raíz del proyecto)
- Verifica que el archivo existe: `ls legal-website.html`

### "Permission denied" (Linux/macOS)
```bash
chmod +x scripts/deploy-legal-website.sh
bash scripts/deploy-legal-website.sh
```

---

## 📞 Soporte

Documentación completa de deployment:
- 📖 Ver: `../NETLIFY_DEPLOYMENT.md`
- 📖 Ver: `../operadorpro-mobile/PUBLICATION_CHECKLIST.md`

---

**Generated:** August 2026  
**Status:** ✅ Ready

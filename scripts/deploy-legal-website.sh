#!/bin/bash

# ============================================================================
# Deploy Legal Website to Netlify
# ============================================================================
# Script para publicar legal-website.html a Netlify automáticamente
#
# Requisitos:
#  - Netlify CLI instalado: npm install -g netlify-cli
#  - Cuenta Netlify creada
#  - Logueado en Netlify: netlify login
#
# Uso:
#  bash scripts/deploy-legal-website.sh
#
# ============================================================================

set -e  # Exit on error

echo "🚀 OperadorPro - Legal Website Deployment"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# VERIFICACIONES
# ============================================================================

echo -e "${BLUE}📋 Verificando requisitos...${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -f "legal-website.html" ]; then
    echo -e "${RED}❌ Error: legal-website.html no encontrado${NC}"
    echo "   Por favor corre este script desde el directorio raíz: operadorpro/"
    exit 1
fi
echo -e "${GREEN}✓${NC} legal-website.html encontrado"

# Verificar Netlify CLI
if ! command -v netlify &> /dev/null; then
    echo -e "${RED}❌ Netlify CLI no está instalado${NC}"
    echo ""
    echo "Instálalo con:"
    echo "  npm install -g netlify-cli"
    echo ""
    echo "Luego login con:"
    echo "  netlify login"
    exit 1
fi
echo -e "${GREEN}✓${NC} Netlify CLI instalado"

# Verificar que estamos logueados
if ! netlify status &> /dev/null; then
    echo -e "${RED}❌ No estás logueado en Netlify${NC}"
    echo ""
    echo "Login con:"
    echo "  netlify login"
    exit 1
fi
echo -e "${GREEN}✓${NC} Logueado en Netlify"

echo ""
echo -e "${BLUE}🌐 Publicando sitio legal...${NC}"
echo ""

# ============================================================================
# DEPLOYMENT
# ============================================================================

# Crear directorio temporal si es necesario
DEPLOY_DIR=".deploy-legal"
mkdir -p "$DEPLOY_DIR"

# Copiar archivo
cp legal-website.html "$DEPLOY_DIR/index.html"

# Deploy a Netlify
echo "Uploadando archivo..."
DEPLOY_OUTPUT=$(netlify deploy --dir="$DEPLOY_DIR" --prod 2>&1)

# Extraer URL del output
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[^\s]+netlify\.app' | head -n1)

if [ -z "$DEPLOY_URL" ]; then
    # Si no encontramos la URL en el output, intentar con status
    DEPLOY_URL=$(netlify status 2>/dev/null | grep -oP 'https://[^\s]+netlify\.app' | head -n1)
fi

# ============================================================================
# RESULTADOS
# ============================================================================

echo ""
echo -e "${GREEN}✅ Deployment completado${NC}"
echo ""
echo "📱 Tu sitio legal está publicado en:"
echo -e "${BLUE}${DEPLOY_URL}${NC}"
echo ""

# Generar URLs para app stores
PRIVACY_URL="${DEPLOY_URL}#privacy"
TERMS_URL="${DEPLOY_URL}#terms"

echo "📋 URLs para App Stores:"
echo ""
echo "Privacy Policy URL:"
echo -e "  ${BLUE}${PRIVACY_URL}${NC}"
echo ""
echo "Terms of Service URL:"
echo -e "  ${BLUE}${TERMS_URL}${NC}"
echo ""

# Limpiar directorio temporal
rm -rf "$DEPLOY_DIR"

# Guardar URLs en archivo
cat > ".netlify-urls.txt" << EOF
Site URL: ${DEPLOY_URL}
Privacy Policy: ${PRIVACY_URL}
Terms of Service: ${TERMS_URL}
Deployed: $(date)
EOF

echo -e "${YELLOW}💡 URLs guardadas en .netlify-urls.txt${NC}"
echo ""

# ============================================================================
# PRÓXIMOS PASOS
# ============================================================================

echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo ""
echo "1. Verifica que el sitio funciona:"
echo -e "   ${BLUE}${DEPLOY_URL}${NC}"
echo ""
echo "2. Usa estas URLs en app.json:"
cat << 'EOF'
   {
     "expo": {
       "extra": {
         "privacyPolicyUrl": "PRIVACY_URL_AQUI",
         "termsOfServiceUrl": "TERMS_URL_AQUI"
       }
     }
   }
EOF
echo ""
echo "3. Usa estas URLs en App Store Connect:"
echo "   - Privacy Policy URL: ${PRIVACY_URL}"
echo "   - Terms URL: ${TERMS_URL}"
echo ""
echo "4. Usa estas URLs en Google Play Console:"
echo "   - Privacy Policy URL: ${PRIVACY_URL}"
echo ""

# ============================================================================

echo -e "${GREEN}🎉 ¡Listo!${NC}"
echo ""
echo "Tu sitio legal está publicado y listo para app stores."
echo ""

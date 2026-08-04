#!/bin/bash

# ============================================================================
# Configuration Validator for OperadorPro
# ============================================================================
# Script que valida que toda tu configuración está correcta
#
# Uso:
#  bash scripts/validate-config.sh
#
# ============================================================================

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 OperadorPro Configuration Validator${NC}"
echo "======================================="
echo ""

ERRORS=0
WARNINGS=0

# ============================================================================
# FUNCIONES HELPER
# ============================================================================

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 MISSING"
        ((ERRORS++))
        return 1
    fi
}

check_json() {
    if node -e "JSON.parse(require('fs').readFileSync('$1', 'utf8'))" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 is valid JSON"
        return 0
    else
        echo -e "${RED}✗${NC} $1 has JSON errors"
        ((ERRORS++))
        return 1
    fi
}

check_key() {
    local file=$1
    local key=$2
    if grep -q "$key" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $key found in $file"
        return 0
    else
        echo -e "${RED}✗${NC} $key NOT found in $file"
        ((ERRORS++))
        return 1
    fi
}

# ============================================================================
# VALIDACIONES
# ============================================================================

echo -e "${BLUE}📁 Checking file structure...${NC}"
check_file "legal-website.html"
check_file "operadorpro-mobile/app.json"
check_file "operadorpro-mobile/eas.json"
check_file "operadorpro-mobile/.env.example"
check_file "operadorpro-mobile/ios/PrivacyInfo.xcprivacy"
check_file "PRIVACY_POLICY.md"
check_file "TERMS_OF_SERVICE.md"
echo ""

echo -e "${BLUE}📋 Checking JSON files...${NC}"
check_json "operadorpro-mobile/app.json"
check_json "operadorpro-mobile/eas.json"
echo ""

echo -e "${BLUE}🔑 Checking required keys in app.json...${NC}"
check_key "operadorpro-mobile/app.json" '"name": "OperadorPro"'
check_key "operadorpro-mobile/app.json" '"bundleIdentifier": "com.operadorpro.app"'
check_key "operadorpro-mobile/app.json" '"package": "com.operadorpro.app"'
check_key "operadorpro-mobile/app.json" '"expo-router"'
check_key "operadorpro-mobile/app.json" '"expo-camera"'
check_key "operadorpro-mobile/app.json" '"expo-location"'
check_key "operadorpro-mobile/app.json" '"expo-notifications"'
echo ""

echo -e "${BLUE}🔐 Checking security...${NC}"
if grep -q ".env" "operadorpro-mobile/.gitignore"; then
    echo -e "${GREEN}✓${NC} .env files ignored in git"
else
    echo -e "${YELLOW}⚠${NC} .env files might not be ignored"
    ((WARNINGS++))
fi

if grep -q "google-play-key.json" "operadorpro-mobile/.gitignore"; then
    echo -e "${GREEN}✓${NC} google-play-key.json ignored"
else
    echo -e "${YELLOW}⚠${NC} google-play-key.json might not be ignored"
    ((WARNINGS++))
fi
echo ""

echo -e "${BLUE}🌐 Checking documentation...${NC}"
check_file "NETLIFY_DEPLOYMENT.md"
check_file "QUICK_START_NETLIFY.md"
check_file "COMMANDS_READY_TO_COPY.md"
check_file "APP_STORE_TEMPLATES.md"
check_file "EAS_BUILD_AND_DEPLOY.md"
check_file "APP_STORE_ASSETS.md"
check_file "ENVIRONMENT_SETUP.md"
check_file "PUBLICATION_CHECKLIST.md"
echo ""

echo -e "${BLUE}📱 Checking mobile app structure...${NC}"
check_file "operadorpro-mobile/package.json"
check_file "operadorpro-mobile/src/app/_layout.tsx"
check_file "operadorpro-mobile/src/utils/supabase.ts"
check_file "operadorpro-mobile/src/utils/camera.ts"
check_file "operadorpro-mobile/src/utils/notifications.ts"
echo ""

# ============================================================================
# VERIFICACIONES DE CONTENIDO
# ============================================================================

echo -e "${BLUE}✓ Checking content...${NC}"

# Verificar que legal-website tiene contenido completo
if grep -q "Política de Privacidad\|Privacy Policy" "legal-website.html" && \
   grep -q "Términos de Servicio\|Terms of Service" "legal-website.html" && \
   grep -q "Contacto" "legal-website.html"; then
    echo -e "${GREEN}✓${NC} legal-website.html has complete content"
else
    echo -e "${RED}✗${NC} legal-website.html missing sections"
    ((ERRORS++))
fi

# Verificar Privacy Policy
if grep -q "LFPDPPP" "PRIVACY_POLICY.md"; then
    echo -e "${GREEN}✓${NC} Privacy Policy mentions Mexican law"
else
    echo -e "${YELLOW}⚠${NC} Privacy Policy might need legal review"
    ((WARNINGS++))
fi

# Verificar Terms
if grep -q "México" "TERMS_OF_SERVICE.md"; then
    echo -e "${GREEN}✓${NC} Terms reference Mexico"
else
    echo -e "${YELLOW}⚠${NC} Terms might need Mexican jurisdiction"
    ((WARNINGS++))
fi
echo ""

# ============================================================================
# VERIFICAR GIT
# ============================================================================

echo -e "${BLUE}📦 Checking git status...${NC}"

if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Git repository found"

    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$BRANCH" == *"cargo-truck"* ]]; then
        echo -e "${GREEN}✓${NC} On correct branch: $BRANCH"
    else
        echo -e "${YELLOW}⚠${NC} Current branch: $BRANCH (expected: claude/cargo-truck-...)"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} Not in git repository"
    ((ERRORS++))
fi
echo ""

# ============================================================================
# VERIFICAR TOOLS
# ============================================================================

echo -e "${BLUE}🛠️  Checking required tools...${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js NOT installed"
    ((ERRORS++))
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm installed: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm NOT installed"
    ((ERRORS++))
fi

if command -v git &> /dev/null; then
    echo -e "${GREEN}✓${NC} Git installed"
else
    echo -e "${RED}✗${NC} Git NOT installed"
    ((ERRORS++))
fi

if command -v netlify &> /dev/null; then
    NETLIFY_VERSION=$(netlify --version)
    echo -e "${GREEN}✓${NC} Netlify CLI installed: $NETLIFY_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Netlify CLI not installed (optional, but needed for deploy)"
    ((WARNINGS++))
fi

if command -v eas &> /dev/null; then
    EAS_VERSION=$(eas --version)
    echo -e "${GREEN}✓${NC} EAS CLI installed: $EAS_VERSION"
else
    echo -e "${YELLOW}⚠${NC} EAS CLI not installed (needed for mobile build)"
    ((WARNINGS++))
fi
echo ""

# ============================================================================
# VERIFICAR SUPABASE
# ============================================================================

echo -e "${BLUE}☁️  Checking Supabase configuration...${NC}"

if [ -f "operadorpro-mobile/.env.example" ]; then
    if grep -q "EXPO_PUBLIC_SUPABASE_URL" "operadorpro-mobile/.env.example"; then
        echo -e "${GREEN}✓${NC} Supabase URL template exists"
    else
        echo -e "${RED}✗${NC} Supabase URL template missing"
        ((ERRORS++))
    fi

    if grep -q "EXPO_PUBLIC_SUPABASE_ANON_KEY" "operadorpro-mobile/.env.example"; then
        echo -e "${GREEN}✓${NC} Supabase Anon Key template exists"
    else
        echo -e "${RED}✗${NC} Supabase Anon Key template missing"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} .env.example not found"
    ((ERRORS++))
fi
echo ""

# ============================================================================
# RESULTADOS
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════${NC}"
echo -e "${BLUE}📊 Validation Results${NC}"
echo -e "${BLUE}═══════════════════════════════════${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed!${NC}"
    echo ""
    echo "Your OperadorPro configuration is complete and ready to:"
    echo "  ✅ Deploy to Netlify"
    echo "  ✅ Build for iOS and Android"
    echo "  ✅ Submit to App Stores"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    echo ""
    echo "These are not critical, but you should review them."
    echo ""
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix the errors before proceeding."
    echo ""
    exit 1
fi

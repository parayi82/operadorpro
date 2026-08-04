# ============================================================================
# Deploy Legal Website to Netlify (PowerShell for Windows)
# ============================================================================
# Script para publicar legal-website.html a Netlify desde Windows
#
# Requisitos:
#  - Netlify CLI instalado: npm install -g netlify-cli
#  - Cuenta Netlify creada
#  - Logueado en Netlify: netlify login
#
# Uso (en PowerShell):
#  .\scripts\deploy-legal-website.ps1
#
# ============================================================================

Write-Host "🚀 OperadorPro - Legal Website Deployment" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# ============================================================================
# VERIFICACIONES
# ============================================================================

Write-Host "📋 Verificando requisitos..." -ForegroundColor Blue

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "legal-website.html")) {
    Write-Host "❌ Error: legal-website.html no encontrado" -ForegroundColor Red
    Write-Host "   Por favor corre este script desde el directorio raíz: operadorpro/" -ForegroundColor Red
    exit 1
}
Write-Host "✓ legal-website.html encontrado" -ForegroundColor Green

# Verificar Netlify CLI
$netlifyExists = $null -ne (Get-Command netlify -ErrorAction SilentlyContinue)
if (-not $netlifyExists) {
    Write-Host "❌ Netlify CLI no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instálalo con:" -ForegroundColor Yellow
    Write-Host "  npm install -g netlify-cli" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Luego login con:" -ForegroundColor Yellow
    Write-Host "  netlify login" -ForegroundColor Cyan
    exit 1
}
Write-Host "✓ Netlify CLI instalado" -ForegroundColor Green

Write-Host ""
Write-Host "🌐 Publicando sitio legal..." -ForegroundColor Blue
Write-Host ""

# ============================================================================
# DEPLOYMENT
# ============================================================================

# Crear directorio temporal
$deployDir = ".deploy-legal"
if (Test-Path $deployDir) {
    Remove-Item $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

# Copiar archivo
Copy-Item "legal-website.html" "$deployDir\index.html"

# Deploy a Netlify
Write-Host "Uploadando archivo..."
$deployOutput = netlify deploy --dir=$deployDir --prod 2>&1

# Extraer URL
$deployUrl = $deployOutput | Select-String -Pattern 'https://[^\s]+netlify\.app' | ForEach-Object { $_.Matches[0].Value }

if (-not $deployUrl) {
    $statusOutput = netlify status 2>&1
    $deployUrl = $statusOutput | Select-String -Pattern 'https://[^\s]+netlify\.app' | ForEach-Object { $_.Matches[0].Value }
}

# ============================================================================
# RESULTADOS
# ============================================================================

Write-Host ""
Write-Host "✅ Deployment completado" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Tu sitio legal está publicado en:" -ForegroundColor Cyan
Write-Host $deployUrl -ForegroundColor Blue
Write-Host ""

# Generar URLs para app stores
$privacyUrl = "${deployUrl}#privacy"
$termsUrl = "${deployUrl}#terms"

Write-Host "📋 URLs para App Stores:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Privacy Policy URL:" -ForegroundColor Yellow
Write-Host "  $privacyUrl" -ForegroundColor Blue
Write-Host ""
Write-Host "Terms of Service URL:" -ForegroundColor Yellow
Write-Host "  $termsUrl" -ForegroundColor Blue
Write-Host ""

# Limpiar directorio temporal
Remove-Item $deployDir -Recurse -Force

# Guardar URLs en archivo
@"
Site URL: $deployUrl
Privacy Policy: $privacyUrl
Terms of Service: $termsUrl
Deployed: $(Get-Date)
"@ | Out-File ".netlify-urls.txt"

Write-Host "💡 URLs guardadas en .netlify-urls.txt" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# PRÓXIMOS PASOS
# ============================================================================

Write-Host "📋 Próximos pasos:" -ForegroundColor Blue
Write-Host ""
Write-Host "1. Verifica que el sitio funciona:" -ForegroundColor Cyan
Write-Host "   $deployUrl" -ForegroundColor Blue
Write-Host ""
Write-Host "2. Copia estas URLs para app.json:" -ForegroundColor Cyan
Write-Host '   Privacy Policy: ' -NoNewline
Write-Host $privacyUrl -ForegroundColor Blue
Write-Host '   Terms of Service: ' -NoNewline
Write-Host $termsUrl -ForegroundColor Blue
Write-Host ""
Write-Host "3. Usa estas URLs en App Store Connect y Google Play Console" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎉 ¡Listo!" -ForegroundColor Green
Write-Host ""
Write-Host "Tu sitio legal está publicado y listo para app stores." -ForegroundColor Cyan
Write-Host ""

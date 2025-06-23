# 🍉 Watermelon Hydrogen - Phase 2 Setup & Test Script (Windows)

Write-Host "🍉 Watermelon Hydrogen - Phase 2 Dynamic Menu Integration" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Checking project dependencies..." -ForegroundColor Yellow

# Check if npm is available
try {
    npm --version | Out-Null
    Write-Host "✅ npm is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: npm is not installed" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "✅ Dependencies checked" -ForegroundColor Green

# Check for required environment variables
Write-Host "🔧 Checking environment configuration..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host "⚠️ Warning: .env file not found" -ForegroundColor Orange
    Write-Host "   You'll need to configure Shopify credentials for dynamic menu loading" -ForegroundColor Orange
    Write-Host "   The system will use fallback menu data without proper configuration" -ForegroundColor Orange
} else {
    Write-Host "✅ Environment file found" -ForegroundColor Green
}

# Validate key files exist
Write-Host "📁 Validating Phase 2 files..." -ForegroundColor Yellow

$files = @(
    "app/utils/menuTransform.js",
    "app/utils/menuTestUtils.js", 
    "app/routes/(`$locale)._index.jsx",
    "app/components/Carousel3DMenu.jsx",
    "app/components/Carousel3DPro/main.js",
    "docs/PHASE_2_DYNAMIC_MENU_INTEGRATION.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $file" -ForegroundColor Red
    }
}

# Test linting if available
Write-Host "🔍 Running code quality checks..." -ForegroundColor Yellow

try {
    npx eslint app/utils/menuTransform.js --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ menuTransform.js passes linting" -ForegroundColor Green
    } else {
        Write-Host "⚠️ menuTransform.js has linting issues" -ForegroundColor Orange
    }
} catch {
    Write-Host "⚠️ Linting check skipped" -ForegroundColor Orange
}

Write-Host ""
Write-Host "🚀 Setup complete! Ready to test Phase 2 integration" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start development server: npm run dev" -ForegroundColor White
Write-Host "2. Open http://localhost:3000 in browser" -ForegroundColor White
Write-Host "3. Open browser console and run: window.menuTests.runAll()" -ForegroundColor White
Write-Host ""
Write-Host "For debugging:" -ForegroundColor Cyan
Write-Host "- Check menu data: window.debugCarousel.debug.listSceneContents()" -ForegroundColor White
Write-Host "- Test menu transform: window.menuTests.transform()" -ForegroundColor White
Write-Host "- Fix carousel: window.fixCarousel()" -ForegroundColor White
Write-Host ""
Write-Host "Documentation: docs/PHASE_2_DYNAMIC_MENU_INTEGRATION.md" -ForegroundColor White

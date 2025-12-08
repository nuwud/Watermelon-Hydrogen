#!/bin/bash

# 🍉 Watermelon Hydrogen - Phase 2 Setup & Test Script

echo "🍉 Watermelon Hydrogen - Phase 2 Dynamic Menu Integration"
echo "========================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Checking project dependencies..."

# Check if required dependencies are installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Dependencies checked"

# Check for required environment variables
echo "🔧 Checking environment configuration..."

if [ ! -f ".env" ]; then
    echo "⚠️ Warning: .env file not found"
    echo "   You'll need to configure Shopify credentials for dynamic menu loading"
    echo "   The system will use fallback menu data without proper configuration"
else
    echo "✅ Environment file found"
fi

# Validate key files exist
echo "📁 Validating Phase 2 files..."

files=(
    "app/utils/menuTransform.js"
    "app/utils/menuTestUtils.js" 
    "app/routes/($locale)._index.jsx"
    "app/components/Carousel3DMenu.jsx"
    "app/components/Carousel3DPro/main.js"
    "docs/PHASE_2_DYNAMIC_MENU_INTEGRATION.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
    fi
done

# Test TypeScript/ESLint if available
echo "🔍 Running code quality checks..."

if command -v npx &> /dev/null; then
    # Check if the files compile/lint correctly
    if npx eslint app/utils/menuTransform.js --quiet 2>/dev/null; then
        echo "✅ menuTransform.js passes linting"
    else
        echo "⚠️ menuTransform.js has linting issues"
    fi
    
    if npx eslint "app/routes/(\$locale)._index.jsx" --quiet 2>/dev/null; then
        echo "✅ Homepage route passes linting"
    else
        echo "⚠️ Homepage route has linting issues"
    fi
else
    echo "⚠️ npx not available, skipping lint checks"
fi

echo ""
echo "🚀 Setup complete! Ready to test Phase 2 integration"
echo ""
echo "Next steps:"
echo "1. Start development server: npm run dev"
echo "2. Open http://localhost:3000 in browser"
echo "3. Open browser console and run: window.menuTests.runAll()"
echo ""
echo "For debugging:"
echo "- Check menu data: window.debugCarousel.debug.listSceneContents()"
echo "- Test menu transform: window.menuTests.transform()"
echo "- Fix carousel: window.fixCarousel()"
echo ""
echo "Documentation: docs/PHASE_2_DYNAMIC_MENU_INTEGRATION.md"

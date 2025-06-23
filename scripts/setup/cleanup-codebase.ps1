# 🧹 Watermelon Hydrogen - Safe Codebase Cleanup Script (PowerShell)
# This script implements the cleanup recommendations from CODEBASE_CLEANUP_AUDIT.md

Write-Host "🍉 Watermelon Hydrogen - Codebase Cleanup Script" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Function to create directory if it doesn't exist
function Create-Dir {
    param($Path)
    if (!(Test-Path $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
        Write-Host "✅ Created directory: $Path" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Directory already exists: $Path" -ForegroundColor Blue
    }
}

# Function to move file safely
function Safe-Move {
    param($Source, $Destination)
    if (Test-Path $Source) {
        Move-Item $Source $Destination -Force
        Write-Host "✅ Moved: $Source → $Destination" -ForegroundColor Green
    } else {
        Write-Host "⚠️  File not found: $Source" -ForegroundColor Yellow
    }
}

# Function to delete file safely
function Safe-Delete {
    param($Path)
    if (Test-Path $Path) {
        Remove-Item $Path -Force
        Write-Host "✅ Deleted: $Path" -ForegroundColor Green
    } else {
        Write-Host "⚠️  File not found: $Path" -ForegroundColor Yellow
    }
}

Write-Host "🔍 Starting codebase cleanup based on audit recommendations..." -ForegroundColor Blue
Write-Host ""

# PHASE 1: Create directory structure
Write-Host "📁 Phase 1: Creating directory structure" -ForegroundColor Yellow
Create-Dir "tests\submenu"
Create-Dir "tests\integration"
Create-Dir "tests\utils"
Create-Dir "scripts\setup"
Create-Dir "scripts\debug"
Create-Dir "docs\archive"
Create-Dir "app\utils\cart"  # For cart migration
Write-Host ""

# PHASE 2: Move valuable test files
Write-Host "🔄 Phase 2: Moving valuable test files" -ForegroundColor Yellow
Safe-Move "final-submenu-validation.js" "tests\submenu\"
Safe-Move "submenu-debug-monitor.js" "tests\submenu\"
Safe-Move "test-comprehensive-submenu.js" "tests\submenu\"
Safe-Move "test-submenu-usability.js" "tests\submenu\"
Write-Host ""

# PHASE 3: Archive historical documentation
Write-Host "📚 Phase 3: Archiving historical documentation" -ForegroundColor Yellow
Safe-Move "PROJECT_STATUS_PHASE_2_COMPLETE.md" "docs\archive\"
Safe-Move "SUBMENU_CLICK_FIX_COMPLETE.md" "docs\archive\"
Write-Host ""

# PHASE 4: Delete obsolete test files (with confirmation)
$response = Read-Host "🗑️  Phase 4: Delete obsolete test files? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "🗑️  Deleting obsolete test files..." -ForegroundColor Red
    
    $obsoleteFiles = @(
        "browser-test-submenu-click.js",
        "debug-submenu-click-flow.js",
        "debug-submenu-click.js",
        "test-butter-smooth-restore.js",
        "test-restored-submenu-functionality.js",
        "test-smooth-submenu.js",
        "test-submenu-click-fix.js",
        "test-submenu-click.js",
        "test-submenu-fix.js",
        "submenu-validation.js"
    )
    
    foreach ($file in $obsoleteFiles) {
        Safe-Delete $file
    }
    Write-Host ""
}

# PHASE 5: Delete duplicate components (with confirmation)
$response = Read-Host "🔄 Phase 5: Delete duplicate carousel components? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "🗑️  Deleting duplicate components..." -ForegroundColor Red
    
    $duplicateComponents = @(
        "Carousel3DSubmenu.js",
        "app\components\Carousel3D.jsx",
        "app\components\Carousel3DMount.jsx",
        "app\components\Carousel3DProWrapper.jsx"
    )
    
    foreach ($file in $duplicateComponents) {
        Safe-Delete $file
    }
    Write-Host ""
}

# PHASE 6: Critical cart utilities migration
Write-Host "🚨 Phase 6: CRITICAL - Cart utilities migration" -ForegroundColor Yellow
Write-Host "ℹ️  The following files import from src/cart/ and need updating:" -ForegroundColor Blue
Write-Host "   - app\utils\cart-controller-utils.js"
Write-Host "   - app\components\cart-drawers\CartToggle3D.jsx"
Write-Host "   - app\components\Carousel3DPro\modules\cartIntegration.js"
Write-Host ""

$response = Read-Host "Migrate cart utilities from src\cart\ to app\utils\cart\? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "🔄 Migrating cart utilities..." -ForegroundColor Yellow
    
    # Move cart files
    if (Test-Path "src\cart") {
        Copy-Item "src\cart\*" "app\utils\cart\" -Recurse -Force
        Write-Host "✅ Cart utilities copied to app\utils\cart\" -ForegroundColor Green
        
        Write-Host "⚠️  MANUAL ACTION REQUIRED:" -ForegroundColor Red
        Write-Host "   Update the following imports:"
        Write-Host "   1. app\utils\cart-controller-utils.js"
        Write-Host "      Change: import { SceneRegistry } from '../../../src/cart/SceneRegistry';"
        Write-Host "      To:     import { SceneRegistry } from './cart/SceneRegistry';"
        Write-Host ""
        Write-Host "   2. app\components\cart-drawers\CartToggle3D.jsx"
        Write-Host "      Change: import { SceneRegistry } from '../../../src/cart/SceneRegistry';"
        Write-Host "      To:     import { SceneRegistry } from '../../utils/cart/SceneRegistry';"
        Write-Host "      Change: import { createCartToggleSphere } from '../../../src/cart/initCartToggleSphere';"
        Write-Host "      To:     import { createCartToggleSphere } from '../../utils/cart/initCartToggleSphere';"
        Write-Host ""
        Write-Host "   3. app\components\Carousel3DPro\modules\cartIntegration.js"
        Write-Host "      Change: import { createCartToggleSphere } from '../../../../src/cart/initCartToggleSphere';"
        Write-Host "      To:     import { createCartToggleSphere } from '../../../utils/cart/initCartToggleSphere';"
        Write-Host ""
        Write-Host "ℹ️  After updating imports, test the application before proceeding." -ForegroundColor Blue
    } else {
        Write-Host "⚠️  src\cart\ directory not found" -ForegroundColor Yellow
    }
    Write-Host ""
}

# PHASE 7: Delete legacy source files (after cart migration)
$response = Read-Host "🗑️  Phase 7: Delete legacy source files (after cart migration)? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "🗑️  Deleting legacy source files..." -ForegroundColor Red
    
    Safe-Delete "src\animate.js"
    Safe-Delete "src\createItems.js"
    Safe-Delete "src\hoverLogic.js"
    
    if (Test-Path "src\shaders") {
        Remove-Item "src\shaders" -Recurse -Force
        Write-Host "✅ Deleted: src\shaders\ (not referenced)" -ForegroundColor Green
    }
    
    # Only delete src\cart after migration and testing
    if ((Test-Path "src\cart") -and (Test-Path "app\utils\cart")) {
        Write-Host "⚠️  CAUTION: Ready to delete src\cart\ (migrated to app\utils\cart\)" -ForegroundColor Red
        $response = Read-Host "Delete src\cart\ directory? (Only after updating imports and testing) (y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Remove-Item "src\cart" -Recurse -Force
            Write-Host "✅ Deleted: src\cart\" -ForegroundColor Green
        }
    }
    
    # Check if src\ is empty and can be deleted
    if ((Test-Path "src") -and ((Get-ChildItem "src" | Measure-Object).Count -eq 0)) {
        $response = Read-Host "Delete empty src\ directory? (y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Remove-Item "src" -Force
            Write-Host "✅ Deleted: empty src\ directory" -ForegroundColor Green
        }
    }
    Write-Host ""
}

# PHASE 8: Move setup scripts
$response = Read-Host "🔧 Phase 8: Move setup scripts to scripts\setup\? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "🔄 Moving setup scripts..." -ForegroundColor Yellow
    Safe-Move "setup-phase2.sh" "scripts\setup\"
    Safe-Move "setup-phase2.ps1" "scripts\setup\"
    Write-Host ""
}

# Summary
Write-Host "🎉 Cleanup script completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary of changes:" -ForegroundColor Blue
Write-Host "   ✅ Created organized directory structure"
Write-Host "   ✅ Moved valuable test files to tests\"
Write-Host "   ✅ Archived historical documentation"
Write-Host "   ✅ Deleted obsolete test files (if confirmed)"
Write-Host "   ✅ Deleted duplicate components (if confirmed)"
Write-Host "   ✅ Migrated cart utilities (if confirmed)"
Write-Host "   ✅ Deleted legacy source files (if confirmed)"
Write-Host ""
Write-Host "⚠️  IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host "   1. Update the import statements as shown above"
Write-Host "   2. Test the application thoroughly"
Write-Host "   3. Run npm run build to verify no import errors"
Write-Host "   4. Consider updating .gitignore if needed"
Write-Host ""
Write-Host "🍉 Watermelon Hydrogen codebase is now cleaner and better organized!" -ForegroundColor Green

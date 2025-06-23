#!/bin/bash

# 🧹 Watermelon Hydrogen - Safe Codebase Cleanup Script
# This script implements the cleanup recommendations from CODEBASE_CLEANUP_AUDIT.md

echo "🍉 Watermelon Hydrogen - Codebase Cleanup Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to ask for confirmation
confirm() {
    read -p "$(echo -e ${YELLOW}"$1 (y/N): "${NC})" -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Function to create directory if it doesn't exist
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo -e "${GREEN}✅ Created directory: $1${NC}"
    else
        echo -e "${BLUE}ℹ️  Directory already exists: $1${NC}"
    fi
}

# Function to move file safely
safe_move() {
    if [ -f "$1" ]; then
        mv "$1" "$2"
        echo -e "${GREEN}✅ Moved: $1 → $2${NC}"
    else
        echo -e "${YELLOW}⚠️  File not found: $1${NC}"
    fi
}

# Function to delete file safely
safe_delete() {
    if [ -f "$1" ]; then
        rm "$1"
        echo -e "${GREEN}✅ Deleted: $1${NC}"
    else
        echo -e "${YELLOW}⚠️  File not found: $1${NC}"
    fi
}

echo -e "${BLUE}🔍 Starting codebase cleanup based on audit recommendations...${NC}"
echo

# PHASE 1: Create directory structure
echo -e "${YELLOW}📁 Phase 1: Creating directory structure${NC}"
create_dir "tests/submenu"
create_dir "tests/integration"
create_dir "tests/utils"
create_dir "scripts/setup"
create_dir "scripts/debug"
create_dir "docs/archive"
create_dir "app/utils/cart"  # For cart migration
echo

# PHASE 2: Move valuable test files
echo -e "${YELLOW}🔄 Phase 2: Moving valuable test files${NC}"
safe_move "final-submenu-validation.js" "tests/submenu/"
safe_move "submenu-debug-monitor.js" "tests/submenu/"
safe_move "test-comprehensive-submenu.js" "tests/submenu/"
safe_move "test-submenu-usability.js" "tests/submenu/"
echo

# PHASE 3: Archive historical documentation
echo -e "${YELLOW}📚 Phase 3: Archiving historical documentation${NC}"
safe_move "PROJECT_STATUS_PHASE_2_COMPLETE.md" "docs/archive/"
safe_move "SUBMENU_CLICK_FIX_COMPLETE.md" "docs/archive/"
echo

# PHASE 4: Delete obsolete test files (with confirmation)
if confirm "🗑️  Phase 4: Delete obsolete test files?"; then
    echo -e "${RED}🗑️  Deleting obsolete test files...${NC}"
    
    obsolete_files=(
        "browser-test-submenu-click.js"
        "debug-submenu-click-flow.js"
        "debug-submenu-click.js"
        "test-butter-smooth-restore.js"
        "test-restored-submenu-functionality.js"
        "test-smooth-submenu.js"
        "test-submenu-click-fix.js"
        "test-submenu-click.js"
        "test-submenu-fix.js"
        "submenu-validation.js"
    )
    
    for file in "${obsolete_files[@]}"; do
        safe_delete "$file"
    done
    echo
fi

# PHASE 5: Delete duplicate components (with confirmation)
if confirm "🔄 Phase 5: Delete duplicate carousel components?"; then
    echo -e "${RED}🗑️  Deleting duplicate components...${NC}"
    
    duplicate_components=(
        "Carousel3DSubmenu.js"
        "app/components/Carousel3D.jsx"
        "app/components/Carousel3DMount.jsx"
        "app/components/Carousel3DProWrapper.jsx"
    )
    
    for file in "${duplicate_components[@]}"; do
        safe_delete "$file"
    done
    echo
fi

# PHASE 6: Critical cart utilities migration
echo -e "${YELLOW}🚨 Phase 6: CRITICAL - Cart utilities migration${NC}"
echo -e "${BLUE}ℹ️  The following files import from src/cart/ and need updating:${NC}"
echo "   - app/utils/cart-controller-utils.js"
echo "   - app/components/cart-drawers/CartToggle3D.jsx"
echo "   - app/components/Carousel3DPro/modules/cartIntegration.js"
echo

if confirm "Migrate cart utilities from src/cart/ to app/utils/cart/?"; then
    echo -e "${YELLOW}🔄 Migrating cart utilities...${NC}"
    
    # Move cart files
    if [ -d "src/cart" ]; then
        cp -r src/cart/* app/utils/cart/ 2>/dev/null || echo -e "${YELLOW}⚠️  Some cart files may not exist${NC}"
        echo -e "${GREEN}✅ Cart utilities copied to app/utils/cart/${NC}"
        
        echo -e "${RED}⚠️  MANUAL ACTION REQUIRED:${NC}"
        echo "   Update the following imports:"
        echo "   1. app/utils/cart-controller-utils.js"
        echo "      Change: import { SceneRegistry } from '../../../src/cart/SceneRegistry';"
        echo "      To:     import { SceneRegistry } from './cart/SceneRegistry';"
        echo
        echo "   2. app/components/cart-drawers/CartToggle3D.jsx"
        echo "      Change: import { SceneRegistry } from '../../../src/cart/SceneRegistry';"
        echo "      To:     import { SceneRegistry } from '../../utils/cart/SceneRegistry';"
        echo "      Change: import { createCartToggleSphere } from '../../../src/cart/initCartToggleSphere';"
        echo "      To:     import { createCartToggleSphere } from '../../utils/cart/initCartToggleSphere';"
        echo
        echo "   3. app/components/Carousel3DPro/modules/cartIntegration.js"
        echo "      Change: import { createCartToggleSphere } from '../../../../src/cart/initCartToggleSphere';"
        echo "      To:     import { createCartToggleSphere } from '../../../utils/cart/initCartToggleSphere';"
        echo
        echo -e "${BLUE}ℹ️  After updating imports, test the application before proceeding.${NC}"
    else
        echo -e "${YELLOW}⚠️  src/cart/ directory not found${NC}"
    fi
    echo
fi

# PHASE 7: Delete legacy source files (after cart migration)
if confirm "🗑️  Phase 7: Delete legacy source files (after cart migration)?"; then
    echo -e "${RED}🗑️  Deleting legacy source files...${NC}"
    
    safe_delete "src/animate.js"
    safe_delete "src/createItems.js"
    safe_delete "src/hoverLogic.js"
    
    if [ -d "src/shaders" ]; then
        rm -rf "src/shaders"
        echo -e "${GREEN}✅ Deleted: src/shaders/ (not referenced)${NC}"
    fi
    
    # Only delete src/cart after migration and testing
    if [ -d "src/cart" ] && [ -d "app/utils/cart" ]; then
        echo -e "${RED}⚠️  CAUTION: Ready to delete src/cart/ (migrated to app/utils/cart/)${NC}"
        if confirm "Delete src/cart/ directory? (Only after updating imports and testing)"; then
            rm -rf "src/cart"
            echo -e "${GREEN}✅ Deleted: src/cart/${NC}"
        fi
    fi
    
    # Check if src/ is empty and can be deleted
    if [ -d "src" ] && [ ! "$(ls -A src)" ]; then
        if confirm "Delete empty src/ directory?"; then
            rmdir "src"
            echo -e "${GREEN}✅ Deleted: empty src/ directory${NC}"
        fi
    fi
    echo
fi

# PHASE 8: Move setup scripts
if confirm "🔧 Phase 8: Move setup scripts to scripts/setup/?"; then
    echo -e "${YELLOW}🔄 Moving setup scripts...${NC}"
    safe_move "setup-phase2.sh" "scripts/setup/"
    safe_move "setup-phase2.ps1" "scripts/setup/"
    echo
fi

# Summary
echo -e "${GREEN}🎉 Cleanup script completed!${NC}"
echo
echo -e "${BLUE}📋 Summary of changes:${NC}"
echo "   ✅ Created organized directory structure"
echo "   ✅ Moved valuable test files to tests/"
echo "   ✅ Archived historical documentation"
echo "   ✅ Deleted obsolete test files (if confirmed)"
echo "   ✅ Deleted duplicate components (if confirmed)"
echo "   ✅ Migrated cart utilities (if confirmed)"
echo "   ✅ Deleted legacy source files (if confirmed)"
echo
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo "   1. Update the import statements as shown above"
echo "   2. Test the application thoroughly"
echo "   3. Run npm run build to verify no import errors"
echo "   4. Consider updating .gitignore if needed"
echo
echo -e "${GREEN}🍉 Watermelon Hydrogen codebase is now cleaner and better organized!${NC}"

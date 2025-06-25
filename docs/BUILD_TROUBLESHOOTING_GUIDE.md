# Build Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting steps for common build issues encountered in the Watermelon Hydrogen project, based on the successful resolution of critical build failures.

## Common Build Error Categories

### 1. GraphQL Fragment Conflicts

#### Symptoms
```bash
[Codegen] Not all operations have an unique name: Product, Page
* Product found in:
- app/lib/fragments.js
- app/routes/products.$handle.jsx
* Page found in:
- app/lib/fragments.js  
- app/routes/pages.$handle.jsx
```

#### Root Cause
Multiple GraphQL fragments or operations with identical names across different files.

#### Diagnostic Steps
1. **Search for duplicate names**:
   ```bash
   grep -r "fragment Product" app/
   grep -r "query Product" app/
   ```

2. **Check codegen output** for specific file locations

3. **Verify import statements** in affected files

#### Resolution Strategy
1. **Rename global fragments** in `app/lib/fragments.js`:
   ```graphql
   # Before
   fragment Product on Product { ... }
   
   # After  
   fragment ProductBasic on Product { ... }
   ```

2. **Rename route-specific fragments**:
   ```graphql
   # Before
   fragment Product on Product { ... }
   
   # After
   fragment ProductPage on Product { ... }
   ```

3. **Update all references**:
   ```javascript
   // Update imports
   import { PRODUCT_FRAGMENT as PRODUCT_BASIC_FRAGMENT } from '~/lib/fragments';
   
   // Update query usage
   ${PRODUCT_BASIC_FRAGMENT}
   ```

4. **Verify build success**:
   ```bash
   npm run build
   ```

### 2. Three.js Import Issues

#### Symptoms
```bash
Error: Cannot resolve module 'three' in SSR context
Build failed during SSR compilation
Dynamic import of 'three' failed
```

#### Root Cause
Dynamic imports in SSR environment or improper module resolution.

#### Diagnostic Steps
1. **Check import patterns**:
   ```bash
   grep -r "import.*three" app/components/
   grep -r "await import" app/components/
   ```

2. **Verify Vite configuration** for SSR settings

3. **Test development vs production** builds

#### Resolution Strategy
1. **Convert dynamic to static imports**:
   ```javascript
   // ❌ Problematic
   const THREE = await import('three');
   
   // ✅ Solution
   import * as THREE from 'three';
   ```

2. **Update Vite configuration**:
   ```javascript
   // vite.config.js
   export default defineConfig({
     ssr: {
       noExternal: ['three', 'gsap']
     },
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'three': ['three'],
             'gsap': ['gsap']
           }
         }
       }
     }
   });
   ```

3. **Test both environments**:
   ```bash
   npm run dev    # Development
   npm run build  # Production + SSR
   ```

### 3. Customer Account Schema Issues

#### Symptoms
```bash
GraphQL validation error: Unknown type 'CustomerAccount'
Import error: Cannot resolve '~/graphql/customer-account/...'
TypeScript error: Module not found
```

#### Root Cause
Outdated Customer Account API schema or missing GraphQL files.

#### Diagnostic Steps
1. **Check GraphQL file existence**:
   ```bash
   ls app/graphql/customer-account/
   ```

2. **Verify schema compatibility**:
   ```bash
   npm run codegen
   ```

3. **Test individual imports**:
   ```javascript
   // Try importing in isolation
   import { CUSTOMER_DETAILS_QUERY } from '~/graphql/customer-account/CustomerDetailsQuery';
   ```

#### Resolution Strategy
1. **Immediate Fix - Mock Implementation**:
   ```javascript
   // Comment out problematic imports
   // import { CUSTOMER_DETAILS_QUERY } from '~/graphql/customer-account/CustomerDetailsQuery';
   
   export async function loader() {
     // Return mock data
     const mockCustomer = { /* ... */ };
     return { customer: mockCustomer };
   }
   ```

2. **Preserve Original Code**:
   ```bash
   mkdir backup/customer-account-graphql
   mv app/graphql/customer-account/* backup/customer-account-graphql/
   ```

3. **Long-term Fix - Schema Update**:
   - Wait for Shopify schema updates
   - Update Hydrogen framework
   - Restore from backup when compatible

### 4. Missing Exports

#### Symptoms
```bash
Module '"~/lib/fragments"' has no exported member 'PRODUCT_QUERY'
Cannot resolve import
```

#### Root Cause
Missing or incorrect export statements in GraphQL fragments file.

#### Diagnostic Steps
1. **Check export statements**:
   ```bash
   grep -n "export" app/lib/fragments.js
   ```

2. **Verify import statements**:
   ```bash
   grep -r "PRODUCT_QUERY" app/
   ```

3. **Test import resolution**:
   ```javascript
   // Try importing in isolation
   import { PRODUCT_QUERY } from '~/lib/fragments';
   ```

#### Resolution Strategy
1. **Add missing exports**:
   ```javascript
   // app/lib/fragments.js
   export const PRODUCT_QUERY = `#graphql
     query Product($handle: String!) {
       product(handle: $handle) {
         ...ProductBasic
       }
     }
     ${PRODUCT_FRAGMENT}
   `;
   ```

2. **Verify all exports**:
   ```javascript
   // Check what's actually exported
   console.log(Object.keys(require('./app/lib/fragments.js')));
   ```

3. **Update import statements**:
   ```javascript
   // Use correct export name
   import { PRODUCT_QUERY } from '~/lib/fragments';
   ```

## Systematic Debugging Approach

### Step 1: Identify Error Category
1. **Read error message carefully**
2. **Identify file locations** mentioned in error
3. **Categorize error type** (GraphQL, Import, TypeScript, etc.)

### Step 2: Isolate the Problem
1. **Test minimal reproduction**:
   ```bash
   # Test specific components
   npm run dev
   # Navigate to problematic routes
   ```

2. **Check individual files**:
   ```bash
   # Validate GraphQL syntax
   npm run codegen
   
   # Check TypeScript issues
   npx tsc --noEmit
   ```

3. **Verify dependencies**:
   ```bash
   npm ls three
   npm ls @shopify/hydrogen
   ```

### Step 3: Apply Targeted Fix
1. **Start with smallest change**
2. **Test after each modification**
3. **Document changes made**

### Step 4: Validate Resolution
1. **Full build test**:
   ```bash
   npm run build
   ```

2. **Development server test**:
   ```bash
   npm run dev
   ```

3. **Feature testing**: Verify affected functionality works

## Preventive Measures

### Code Organization
1. **Consistent naming conventions** for GraphQL fragments
2. **Centralized fragment definitions** in `app/lib/fragments.js`
3. **Clear import/export patterns**

### Build Validation
1. **Pre-commit hooks** for build validation:
   ```json
   {
     "husky": {
       "hooks": {
         "pre-commit": "npm run build"
       }
     }
   }
   ```

2. **CI/CD pipeline** with build checks
3. **Regular dependency updates** with testing

### Documentation
1. **Document breaking changes** when updating dependencies
2. **Maintain troubleshooting notes** for team
3. **Keep build fix history** for reference

## Emergency Recovery

### When Build is Completely Broken

1. **Revert to last working state**:
   ```bash
   git log --oneline
   git reset --hard <last-working-commit>
   ```

2. **Identify breaking changes**:
   ```bash
   git diff <last-working-commit> <current-commit>
   ```

3. **Apply fixes incrementally**:
   - Fix one error type at a time
   - Test after each fix
   - Commit working states

### Backup Strategy

1. **Create working branch** before major changes:
   ```bash
   git checkout -b backup-before-fixes
   git checkout main
   ```

2. **Preserve problematic code**:
   ```bash
   mkdir backup/
   cp -r problematic-files/ backup/
   ```

3. **Document current state**:
   ```bash
   npm run build 2>&1 | tee build-errors.log
   ```

## Tools and Commands

### Diagnostic Commands
```bash
# Check build status
npm run build

# Check development server
npm run dev

# GraphQL codegen only
npm run codegen

# TypeScript check
npx tsc --noEmit

# Check for duplicate fragment names
grep -r "fragment.*on" app/ | sort

# Check import/export issues
grep -r "import.*fragments" app/
grep -r "export.*" app/lib/fragments.js
```

### Cleanup Commands
```bash
# Clear build cache
rm -rf dist/
rm -rf .vite/

# Clear node modules
rm -rf node_modules/
npm install

# Clear codegen cache
rm -rf gql/
```

### Verification Commands
```bash
# Full production build
npm run build

# Development with hot reload
npm run dev

# Lint check
npm run lint

# Type check
npm run type-check
```

## Success Indicators

### Build Success
- ✅ `npm run build` completes without errors
- ✅ Both client and SSR bundles generate successfully
- ✅ No GraphQL codegen errors (warnings are acceptable)

### Runtime Success
- ✅ Development server starts without errors
- ✅ All routes load properly
- ✅ Three.js features initialize correctly
- ✅ No console errors during navigation

### Performance Success
- ✅ Reasonable bundle sizes (check with bundle analyzer)
- ✅ Fast initial page load
- ✅ Smooth Three.js animations
- ✅ Proper chunk loading

---

**Last Updated**: December 24, 2024  
**Status**: Validated with Real Project Issues ✅  
**Coverage**: All Major Error Categories ✅

# 🍉 Watermelon Hydrogen - Phase 2: Dynamic Shopify Menu Integration

## Overview

Phase 2 implements dynamic Shopify menu integration, replacing hardcoded menu items in the 3D carousel with live data from your Shopify store's menu structure.

## What Changed

### 1. Menu Data Transform Utility (`app/utils/menuTransform.js`)

**Purpose:** Transforms raw Shopify GraphQL menu data into the format expected by the 3D carousel.

**Key Functions:**
- `transformShopifyMenuForCarousel()` - Converts Shopify menu structure to carousel format
- `createFallbackMenuData()` - Provides default menu structure if Shopify data fails
- `validateMenuData()` - Validates menu data structure for carousel compatibility

### 2. Homepage Loader (`app/routes/($locale)._index.jsx`)

**Purpose:** Fetches menu data from Shopify and passes it to the carousel component.

**Features:**
- Uses `HEADER_QUERY` from `fragments.js` to fetch menu data
- Transforms Shopify data using `transformShopifyMenuForCarousel()`
- Falls back to default menu structure if Shopify query fails
- Supports internationalization (country/language context)

### 3. Carousel Setup Function (`app/components/Carousel3DPro/main.js`)

**Changes:**
- Now accepts optional `menuData` parameter
- Uses dynamic menu data when provided, falls back to hardcoded items
- Logs menu data source (dynamic vs hardcoded) for debugging

### 4. Carousel Component Updates

**Both Carousel3DMenu files updated to:**
- Accept `menuData` prop
- Pass menu data to `setupCarousel()`
- Reinitilaize carousel when menu data changes
- Use dynamic items in rendering

## Menu Data Structure

### Shopify GraphQL Response
```javascript
{
  menu: {
    id: "gid://shopify/Menu/123",
    items: [
      {
        id: "gid://shopify/MenuItem/456",
        title: "Home",
        url: "/",
        items: [
          {
            id: "gid://shopify/MenuItem/789",
            title: "Dashboard",
            url: "/dashboard"
          }
        ]
      }
    ]
  }
}
```

### Transformed Carousel Format
```javascript
{
  items: ["Home", "Products", "About"],
  submenus: {
    "Home": ["Dashboard", "Activity", "Settings"],
    "Products": ["All Products", "New Arrivals", "Sale"],
    "About": ["Our Story", "Team", "Contact"]
  }
}
```

## Configuration

### Menu Handle
Update the menu handle in the loader to match your Shopify menu:

```javascript
// In app/routes/($locale)._index.jsx
const menuResult = await storefront.query(HEADER_QUERY, {
  variables: {
    headerMenuHandle: 'main-menu', // Change this to your menu handle
  },
});
```

### Fallback Menu
Customize the fallback menu in `app/utils/menuTransform.js`:

```javascript
export function createFallbackMenuData() {
  return {
    items: ['Your', 'Custom', 'Items'],
    submenus: {
      'Your': ['Sub', 'Items'],
      // ...
    }
  };
}
```

## Error Handling

The system includes multiple layers of error handling:

1. **Shopify Query Failures** - Falls back to hardcoded menu data
2. **Invalid Menu Structure** - Validation with warnings/errors
3. **Missing Submenus** - Warnings logged, empty submenus created
4. **Network Issues** - Graceful degradation to fallback data

## Testing

### 1. Check Menu Data Loading
```javascript
// In browser console after page load
console.log(window.debugCarousel);
// Should show carousel instance with menu data
```

### 2. Verify Menu Transform
```javascript
// Check if dynamic data is being used
// Look for console log: "[🍉 Setup] Using menu data: { source: 'dynamic', ... }"
```

### 3. Test Fallback
- Temporarily break the menu handle name
- Should see fallback menu and error logged

## Debugging

### Console Logs to Watch For

**Successful Dynamic Load:**
```
[MenuTransform] Transformed menu data: { mainItems: [...], submenuKeys: [...] }
[🍉 Setup] Using menu data: { source: 'dynamic', itemCount: 6 }
[🍉 Menu] Carousel initialized with menu data: { hasMenuData: true, itemCount: 6 }
```

**Fallback Mode:**
```
[Homepage Loader] Error fetching menu data: [error details]
[🍉 Setup] Using menu data: { source: 'hardcoded', itemCount: 6 }
[Homepage] Using fallback menu data due to error: Failed to load menu from Shopify
```

### Debug Commands
```javascript
// Check current menu structure
window.debugCarousel.debug.listSceneContents();

// Force repair if needed
window.fixCarousel();
```

## Next Steps for Phase 3

1. **Enhanced Menu Features:**
   - Support for menu item icons/images
   - Menu item categories and tags
   - Custom menu item metadata

2. **Performance Optimizations:**
   - Menu data caching
   - Incremental menu updates
   - Lazy loading of submenu content

3. **Advanced Integration:**
   - Product collections as submenus
   - Dynamic pricing in menu items
   - Real-time inventory status

## Migration Notes

### From Hardcoded to Dynamic

If you were using the hardcoded system:

1. **No Breaking Changes** - Fallback system ensures compatibility
2. **Gradual Migration** - Test with existing menu structure first
3. **Menu Handle Setup** - Ensure your Shopify menu handle matches the loader

### Shopify Menu Setup

1. **Create Menu in Shopify Admin:**
   - Go to Online Store > Navigation
   - Create or edit your main menu
   - Note the menu handle (URL-friendly name)

2. **Menu Structure:**
   - Main items become carousel items
   - Child items become submenu items
   - Nested children are flattened to single level

### Menu Handle Discovery

To find your menu handle:
```javascript
// Query all menus (temporary debug)
const allMenus = await storefront.query(`
  query GetAllMenus {
    menus(first: 10) {
      edges {
        node {
          id
          handle
          title
        }
      }
    }
  }
`);
console.log(allMenus);
```

## Troubleshooting

### Common Issues

1. **Menu Not Loading**
   - Check menu handle in loader
   - Verify menu exists in Shopify admin
   - Check browser console for errors

2. **Empty Submenus**
   - Ensure menu items have child items in Shopify
   - Check menu structure in Shopify admin

3. **Carousel Not Updating**
   - Clear browser cache
   - Check React DevTools for prop changes
   - Verify useEffect dependencies

### Performance Issues

1. **Slow Menu Loading**
   - Check Shopify API response times
   - Consider menu data caching
   - Optimize GraphQL query

2. **Memory Leaks**
   - Ensure carousel disposal on unmount
   - Check for GSAP animation cleanup
   - Monitor browser memory usage

---

**Status:** ✅ Phase 2 Complete - Dynamic Shopify menu integration implemented
**Next:** Phase 3 - Enhanced menu features and performance optimizations

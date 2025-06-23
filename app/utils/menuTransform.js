/**
 * Transforms Shopify menu data into the format expected by the 3D Carousel
 * @param {Object} menuData - Raw Shopify menu data from GraphQL
 * @returns {Object} - Transformed menu data for carousel
 * @returns {Array} .items - Array of main menu item titles
 * @returns {Object} .submenus - Object mapping main items to their submenu arrays
 */
export function transformShopifyMenuForCarousel(menuData) {
  if (!menuData?.menu?.items) {
    console.warn('[MenuTransform] No menu data provided, returning null');
    return null;
  }

  const items = [];
  const submenus = {};

  menuData.menu.items.forEach((item) => {
    // Add main item title to items array
    items.push(item.title);
    
    // Transform child items into submenu array
    if (item.items && item.items.length > 0) {
      submenus[item.title] = item.items.map(child => child.title);
    } else {
      // For items without children, create a minimal submenu with the item itself
      submenus[item.title] = [item.title];
    }
  });

  console.warn('[MenuTransform] Transformed menu data:', {
    mainItems: items,
    submenuKeys: Object.keys(submenus),
    totalSubmenus: Object.values(submenus).reduce((acc, sub) => acc + sub.length, 0)
  });

  return { items, submenus };
}

/**
 * Creates fallback menu data with enhanced structure for testing
 * @returns {Object} - Default menu structure for carousel
 */
export function createFallbackMenuData() {
  return {
    items: ['Home', 'Products', 'Collections', 'About', 'Contact', 'Store'],
    submenus: {
      Home: ['Dashboard', 'Latest', 'Featured', 'Welcome'],
      Products: ['All Products', 'New Arrivals', 'Best Sellers', 'Sale', 'Categories'],
      Collections: ['Featured', 'Seasonal', 'By Type', 'By Brand', 'Custom'],
      About: ['Our Story', 'Team', 'Mission', 'Values', 'Contact'],
      Contact: ['Support', 'Sales', 'Locations', 'Social Media'],
      Store: ['Cart', 'Wishlist', 'Account', 'Orders', 'Settings']
    }
  };
}

/**
 * Validates menu data structure for carousel compatibility
 * @param {Object} menuData - Menu data to validate
 * @returns {boolean} - Whether the data is valid for carousel use
 */
export function validateMenuData(menuData) {
  if (!menuData || typeof menuData !== 'object') {
    console.error('[MenuTransform] Invalid menu data: not an object');
    return false;
  }

  if (!Array.isArray(menuData.items)) {
    console.error('[MenuTransform] Invalid menu data: items is not an array');
    return false;
  }

  if (!menuData.submenus || typeof menuData.submenus !== 'object') {
    console.error('[MenuTransform] Invalid menu data: submenus is not an object');
    return false;
  }

  // Check that all main items have corresponding submenus
  for (const item of menuData.items) {
    if (!menuData.submenus[item]) {
      console.warn(`[MenuTransform] Warning: Main item '${item}' has no submenu`);
    }
  }

  return true;
}

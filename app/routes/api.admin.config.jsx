import { json } from '@shopify/remix-oxygen';

/**
 * Admin API for menu mode, theme settings, and configuration
 * GET /api/admin/config - Get current configuration
 * POST /api/admin/config - Update configuration
 */

// Default menu theme settings (can be overridden by Shopify metafields)
const DEFAULT_MENU_THEME = {
  itemBaseColor: '#2a2a4a',
  itemHoverColor: '#3a3a6a',
  itemSelectedColor: '#4a4a8a',
  itemTextColor: '#ffffff',
  itemOpacity: 0.85,
  itemHoverOpacity: 0.95,
  itemSelectedOpacity: 1.0,
  glowEnabled: true,
  glowColor: '#6666ff',
  glowIntensity: 0.3,
  borderEnabled: true,
  borderColor: '#4444aa',
  borderWidth: 2,
  borderOpacity: 0.6,
  submenuBackgroundColor: '#1a1a3a',
  submenuBackgroundOpacity: 0.9,
  submenuItemColor: '#2a2a4a',
  submenuItemOpacity: 0.8,
  backgroundMode: 'hexagons',
  backgroundInteractivityPauseDuration: 2000,
};

export async function loader({ request, context }) {
  const url = new URL(request.url);
  const isDev = url.hostname === 'localhost' || url.hostname.includes('ngrok');
  const hasAdminFlag = url.searchParams.get('admin') === 'true';
  
  // Allow access in dev mode, with admin flag, or for menu theme settings
  const isThemeRequest = url.searchParams.get('theme') === 'true';
  
  if (!isDev && !hasAdminFlag && !isThemeRequest) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Try to load menu theme from Shopify metafields if storefront is available
  let menuTheme = { ...DEFAULT_MENU_THEME };
  
  try {
    if (context?.storefront) {
      const { shop } = await context.storefront.query(`
        query GetShopMetafield {
          shop {
            metafield(namespace: "watermelon", key: "menu_theme") {
              value
            }
          }
        }
      `);
      
      if (shop?.metafield?.value) {
        const storedTheme = JSON.parse(shop.metafield.value);
        menuTheme = { ...menuTheme, ...storedTheme };
      }
    }
  } catch (e) {
    // Metafield not available, use defaults
    console.log('[api.admin.config] Using default menu theme');
  }
  
  const config = {
    menuMode: 'auto',
    adminEnabled: true,
    features: {
      dynamicMenu: true,
      contentTemplates: true,
      cart3D: true,
      adminPanel: true,
      menuThemeEditor: true,
    },
    menuTheme,
    version: '1.0.0',
    lastUpdated: new Date().toISOString()
  };
  
  return json({ success: true, config, menuTheme });
}

export async function action({ request }) {
  // Only allow in development or with admin flag
  const url = new URL(request.url);
  const isDev = url.hostname === 'localhost' || url.hostname.includes('ngrok');
  
  if (!isDev) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const formData = await request.formData();
    const menuMode = formData.get('menuMode');
    const adminEnabled = formData.get('adminEnabled') === 'true';
    
    // In production, this would save to database
    const updatedConfig = {
      menuMode: menuMode || 'auto',
      adminEnabled,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Admin config updated:', updatedConfig);
    
    return json({ 
      success: true, 
      message: 'Configuration updated successfully',
      config: updatedConfig 
    });
    
  } catch (error) {
    console.error('Admin config error:', error);
    return json({ 
      success: false, 
      error: 'Failed to update configuration' 
    }, { status: 500 });
  }
}

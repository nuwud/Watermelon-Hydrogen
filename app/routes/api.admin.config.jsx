import { json } from '@shopify/remix-oxygen';

/**
 * Simple admin API for menu mode and configuration
 * GET /api/admin/config - Get current configuration
 * POST /api/admin/config - Update configuration
 */

export async function loader({ request }) {
  // Only allow in development or with admin flag
  const url = new URL(request.url);
  const isDev = url.hostname === 'localhost' || url.hostname.includes('ngrok');
  const hasAdminFlag = url.searchParams.get('admin') === 'true';
  
  if (!isDev && !hasAdminFlag) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get current configuration (would be from database in production)
  const config = {
    menuMode: 'auto', // Default
    adminEnabled: true,
    features: {
      dynamicMenu: true,
      contentTemplates: true,
      cart3D: true,
      adminPanel: true
    },
    version: '1.0.0',
    lastUpdated: new Date().toISOString()
  };
  
  return json({ success: true, config });
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

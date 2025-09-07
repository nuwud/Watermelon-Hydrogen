/**
 * Simple test route for 3D menu integration
 */

import { json } from '@shopify/remix-oxygen';

export async function loader({ request }) {
  const url = new URL(request.url);
  const test = url.searchParams.get('test') || 'basic';

  try {
    // Load menu structure
    let menuStructure = null;
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const menuPath = path.resolve('nuwud-menu-structure.json');
      const menuData = await fs.readFile(menuPath, 'utf8');
      menuStructure = JSON.parse(menuData);
    } catch (error) {
      console.warn('Could not load menu structure:', error.message);
      menuStructure = { 
        menuStructure: { 
          metadata: { name: 'Fallback Menu' },
          items: []
        }
      };
    }

    return json({
      success: true,
      test,
      timestamp: new Date().toISOString(),
      menuStructure,
      message: '3D Menu API is working!'
    });

  } catch (error) {
    console.error('Test API error:', error);
    
    return json({
      success: false,
      error: error.message,
      test
    }, { status: 500 });
  }
}

// ($locale)._index.jsx 

import { useLoaderData } from 'react-router';
import { data } from 'react-router';
import { HEADER_QUERY } from '~/lib/fragments';
import { Carousel3DMenu } from '../components/Carousel3DMenu';
import { transformShopifyMenuForCarousel, createFallbackMenuData } from '~/utils/menuTransform';

/**
 * Loader function to fetch menu data for the 3D carousel
 */
export async function loader({ context }) {
  const { storefront } = context;

  try {
    // Fetch menu data from Shopify
    const menuResult = await storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu', // Adjust to your menu handle
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    });

    // Transform Shopify menu data for carousel
    const carouselMenuData = transformShopifyMenuForCarousel(menuResult);
    
    return data({
      menuData: carouselMenuData,
      shop: menuResult.shop,
    });
  } catch (error) {
    console.error('[Homepage Loader] Error fetching menu data:', error);
    
    // Return fallback data if Shopify query fails
    return data({
      menuData: createFallbackMenuData(),
      shop: null,
      error: 'Failed to load menu from Shopify',
    });
  }
}

export default function Homepage() {
  const { menuData, error } = useLoaderData();
  
  if (error) {
    console.warn('[Homepage] Using fallback menu data due to error:', error);
  }

  // We'll need to create a way to pass storefront to the component
  // For now, we'll create a storefront context provider
  return <Carousel3DMenu menuData={menuData} />;
}

// app/routes/api.page.jsx
import { data } from 'react-router';
import { PAGE_QUERY } from '~/lib/fragments';

/**
 * API route to fetch Shopify page content
 * Usage: /api/page?handle=page-handle
 */
export async function loader({ request, context }) {
  const { storefront } = context;
  const url = new URL(request.url);
  const pageHandle = url.searchParams.get('handle');

  if (!pageHandle) {
    return data({ error: 'Page handle is required' }, { status: 400 });
  }

  try {
    const pageResult = await storefront.query(PAGE_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        handle: pageHandle,
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    });

    if (!pageResult.page) {
      return data({ error: 'Page not found' }, { status: 404 });
    }

    return data({
      page: pageResult.page,
      success: true
    });
  } catch (error) {
    console.error('[API] Error fetching page:', error);
    return data({ error: 'Failed to fetch page content' }, { status: 500 });
  }
}

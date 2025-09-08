// Serve /favicon.ico by redirecting to the public SVG asset to avoid 500s
// Using a public path keeps the SSR bundle lean with no asset import.

/** @type {import('@shopify/remix-oxygen').LoaderFunctionArgs} */
export async function loader() {
  return Response.redirect('/assets/favicon.svg', 302);
}

export default function FaviconIco() {
  // This route only serves via loader.
  return null;
}

import {useEffect, useState} from 'react';

/**
 * Forces child components to render **only in browser**, not during SSR.
 * This is your SSR shield 🛡️. Components wrapped in ClientOnly won’t be rendered on the server at all.
 */
export default function ClientOnly({ fallback = null, children }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    console.warn("👀 ClientOnly is running");
    setIsClient(true);
  }, []);

  if (!isClient) return fallback;
  return typeof children === 'function' ? children() : children;
}
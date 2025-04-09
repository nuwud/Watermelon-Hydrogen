import {useEffect, useState} from 'react';

/**
 * Forces child components to render **only in browser**, not during SSR.
 */
export default function ClientOnly({children, fallback = null}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? (typeof children === 'function' ? children() : children) : fallback;
}

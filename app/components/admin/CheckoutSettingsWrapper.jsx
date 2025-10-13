import {useState, useEffect} from 'react';
import ClientOnly from '../ClientOnly';
import {CheckoutSettings} from './CheckoutSettings';

/**
 * CheckoutSettingsWrapper Component
 * SSR-safe wrapper for checkout settings that integrates with watermelonAdmin
 */
export function CheckoutSettingsWrapper() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Initialize watermelonAdmin if it doesn't exist
    if (!window.watermelonAdmin) {
      window.watermelonAdmin = {};
    }

    // Add checkout settings interface to watermelonAdmin
    window.watermelonAdmin.checkoutSettings = {
      /**
       * Open checkout settings panel
       */
      open: () => {
        console.log('[Watermelon Admin] Opening checkout settings');
        setIsOpen(true);
      },

      /**
       * Close checkout settings panel
       */
      close: () => {
        console.log('[Watermelon Admin] Closing checkout settings');
        setIsOpen(false);
      },

      /**
       * Check if settings panel is open
       */
      isOpen: () => isOpen,
    };

    console.log('[Watermelon Admin] Checkout settings interface installed');
    console.log('📋 Use window.watermelonAdmin.checkoutSettings.open() to open settings');

    // Cleanup on unmount
    return () => {
      if (window.watermelonAdmin?.checkoutSettings) {
        delete window.watermelonAdmin.checkoutSettings;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ClientOnly fallback={null}>
      {() => <CheckoutSettings onClose={() => setIsOpen(false)} />}
    </ClientOnly>
  );
}

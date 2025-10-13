import ClientOnly from '../ClientOnly';
import {CheckoutPanel} from './CheckoutPanel';

/**
 * CheckoutPanelWrapper Component
 * SSR-safe wrapper for CheckoutPanel using ClientOnly
 * @param {Object} props - Props to pass to CheckoutPanel
 */
export function CheckoutPanelWrapper(props) {
  return (
    <ClientOnly fallback={null}>
      {() => <CheckoutPanel {...props} />}
    </ClientOnly>
  );
}

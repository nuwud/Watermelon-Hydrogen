// app/routes/_index.jsx

import {
  Links, Meta, Scripts, useRouteLoaderData, ScrollRestoration, Outlet,
} from '@remix-run/react';
import {useNonce} from '@shopify/hydrogen';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import carouselStyles from '~/styles/carousel.css?url';
import {CartUIProvider} from '~/components/context/cart-ui';
import {CheckoutProvider} from '~/components/context/checkout-context';
import {CheckoutPanelController} from '~/components/checkout-panel/CheckoutPanelController';

export default function Layout() {
  const nonce = useNonce();
  const data = useRouteLoaderData('root');

  function myFunction(data) {
    // do something with data
    console.warn(data);
  }

  myFunction(data);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={resetStyles} />
        <link rel="stylesheet" href={appStyles} />
        <link rel="stylesheet" href={carouselStyles} />
        <Meta />
        <Links />
      </head>
      <body style={{margin: 0, overflow: 'hidden'}}>
        {/* Wrap with context providers */}
        <CartUIProvider>
          <CheckoutProvider>
            <Outlet />
            {/* Checkout panel controller - always mounted to handle checkout state */}
            <CheckoutPanelController />
          </CheckoutProvider>
        </CartUIProvider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

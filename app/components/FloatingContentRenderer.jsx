// app/components/FloatingContentRenderer.jsx
import React, { useEffect, useState, Suspense } from 'react';
import { ClientOnly } from '../ClientOnly';
import { useFloatingContentStore } from '../stores/useFloatingContentStore';
//import CartPanel3D from './panels/CartPanel3D';


// Map string IDs to lazy-loaded content modules
// Lazy load components for floating panels
const contentRegistry = {
    about: React.lazy(() => import('./panels/AboutPanel3D')),
    favorites: React.lazy(() => import('./panels/FavoritesPanel3D')),
    productmodel: React.lazy(() => import('./panels/ProductModelPanel')),
    shopifymodel: React.lazy(() => import('./panels/ShopifyModelPanel')),
    // Verify this path and component structure:
    cart: React.lazy(() => import('../cart/CartDrawer3D')), // Adjusted path assumption
    // --- OR ---
    // Test by temporarily swapping with a known working panel:
    // cart: React.lazy(() => import('./panels/AboutPanel3D')),
    // Add other mappings here
    //cart: CartPanel3D, // Directly use the imported component for testing
};

export default function FloatingContentRenderer() {
    const activeContentId = useFloatingContentStore((state) => state.activeContentId);
    const [ActiveComponent, setActiveComponent] = useState(null);

    useEffect(() => {
        console.warn('[FloatingContentRenderer] Active Content ID:', activeContentId);
        if (activeContentId && contentRegistry[activeContentId]) {
            setActiveComponent(contentRegistry[activeContentId]);
        } else {
            setActiveComponent(null);
            if (activeContentId) {
                console.error(`[FloatingContentRenderer] No component registered for ID: ${activeContentId}`);
            }
        }
    }, [activeContentId]);

    useEffect(() => {
    console.group('[FloatingContentRenderer]');
        console.warn('🔍 activeContentId:', activeContentId);
        console.warn('🧩 ActiveComponent:', ActiveComponent ? 'Component Loaded' : 'None');
        console.groupEnd();
    }, [activeContentId, ActiveComponent]);

    const handleClose = () => {
        console.warn('[FloatingContentRenderer] Closing panel...');
        useFloatingContentStore.getState().clearActiveContentId();
    };

    return (
        <ClientOnly>
            <Suspense
                fallback={
                    // Consider a simpler DOM fallback if Html is removed entirely
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '5px', zIndex: 10000 }}>
                        Loading...
                    </div>
                }
            >
                {ActiveComponent && (
                    <div
                        className="floating-panel" // Use this class for styling if preferred
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 9999, // Ensure it's above the canvas
                            background: 'rgba(0,0,0,0.75)', // Example background
                            padding: '1rem',
                            borderRadius: '8px',
                            color: '#fff', // Example text color
                            pointerEvents: 'auto', // Allow interaction with the panel
                            // Add any other necessary styles
                            depth: 0.2,
                        }}
                    >
                        {/* Optional: Add debug border here if needed */}
                        {/* style={{ border: '2px dashed lime', padding: '1rem', background: 'rgba(0,0,0,0.25)' }} */}
                        <ActiveComponent onClose={handleClose} />
                    </div>
                )}
            </Suspense>
        </ClientOnly>
    );
}

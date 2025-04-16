// app/components/FloatingContentRenderer.jsx
import React, { useEffect, useState, Suspense } from 'react';
import { Html } from '@react-three/drei';
import { ClientOnly } from '../ClientOnly';
import { useFloatingContentStore } from '../stores/useFloatingContentStore';

// Map string IDs to lazy-loaded content modules
const contentRegistry = {
    // Ensure this line is present and correct
    cart: React.lazy(() => import('./cart-drawers/CartDrawer3D')), // Or CartDrawer3D.scene if that's the file name
    about: React.lazy(() => import('./panels/AboutPanel3D')), // placeholder
    favorites: React.lazy(() => import('./panels/FavoritesPanel3D')), // placeholder
    shopifyModel: React.lazy(() => import('./panels/ShopifyModelPanel')), // placeholder
    // Add other mappings here
};

export default function FloatingContentRenderer() {
    const activeContentId = useFloatingContentStore((state) => state.activeContentId);
    const [ActiveComponent, setActiveComponent] = useState(null);

    // Effect to register the window helper
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.__wm__ = {
                showContent: (id) => useFloatingContentStore.getState().setActiveContentId(id),
                clearContent: () => useFloatingContentStore.getState().clearActiveContentId(),
            };
            console.warn('✅ window.__wm__ helper registered');

            // Cleanup function to remove the helper when the component unmounts
            return () => {
                delete window.__wm__;
                console.warn('🗑️ window.__wm__ helper removed');
            };
        }
    }, []); // Empty dependency array ensures this runs only once on mount and cleanup on unmount

    useEffect(() => {
        console.warn('[FloatingContentRenderer] Active Content ID:', activeContentId); // Add this log
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
        console.groupCollapsed('[FloatingContentRenderer]');
        console.warn('🔍 activeContentId:', activeContentId);
        console.warn('🧩 ActiveComponent:', ActiveComponent ? 'Component Loaded' : 'None'); // Simplified log
        console.groupEnd();
    }, [activeContentId, ActiveComponent]);

    const handleClose = () => {
        console.warn('[FloatingContentRenderer] Closing panel...'); // Add this log
        useFloatingContentStore.getState().clearActiveContentId();
    };

    return (
        <ClientOnly>
            <Suspense
                fallback={
                    <Html center>
                        <div style={{ color: 'white', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '5px' }}>
                            Loading...
                        </div>
                    </Html>
                }
            >
                {ActiveComponent && (
                    <Html
                        position={[0, 0, -3]} // Push slightly backward from camera (adjust Z as needed)
                        center
                        distanceFactor={10} // Adjust perceived size with camera distance
                        transform // Makes it behave more like world space
                        occlude={false} // Prevent hiding if occluded
                        zIndexRange={[100, 0]}
                        style={{ pointerEvents: 'auto', outline: '2px dashed lime' }} // Keep outline for debugging, ensure pointer events
                    >
                        {/* Add a wrapper div for styling */}
                        <div className="floating-panel-wrapper">
                            <ActiveComponent onClose={handleClose} />
                        </div>
                    </Html>
                )}
            </Suspense>
        </ClientOnly>
    );
}

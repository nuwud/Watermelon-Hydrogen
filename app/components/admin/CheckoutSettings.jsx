import {useState, useEffect} from 'react';
import {useCheckout} from '../context/checkout-context';
import './CheckoutSettings.css';

/* eslint-disable jsx-a11y/label-has-associated-control */

/**
 * CheckoutSettings Component
 * Admin panel for configuring checkout behavior
 * Allows choosing checkout mode and animation style
 */
export function CheckoutSettings({onClose}) {
  const {
    animationStyle,
    checkoutMode,
    setAnimationStyle,
    setCheckoutMode,
    previewAnimation,
  } = useCheckout();

  const [selectedMode, setSelectedMode] = useState(checkoutMode);
  const [selectedStyle, setSelectedStyle] = useState(animationStyle);
  const [isPreviewingStyle, setIsPreviewingStyle] = useState(false);

  // Preview animation style
  const handlePreviewStyle = async (style) => {
    if (isPreviewingStyle) return;
    
    setIsPreviewingStyle(true);
    await previewAnimation(style);
    
    // Reset after 4 seconds (2s animation + 2s pause + 2s reverse)
    setTimeout(() => {
      setIsPreviewingStyle(false);
    }, 4000);
  };

  // Save settings
  const handleSave = () => {
    setAnimationStyle(selectedStyle);
    setCheckoutMode(selectedMode);
    console.log('[Checkout Settings] Settings saved:', {
      mode: selectedMode,
      style: selectedStyle,
    });
    onClose();
  };

  // Cancel changes
  const handleCancel = () => {
    setSelectedMode(checkoutMode);
    setSelectedStyle(animationStyle);
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        // Inline cancel logic to avoid dependency issue
        setSelectedMode(checkoutMode);
        setSelectedStyle(animationStyle);
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [checkoutMode, animationStyle, onClose]);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div 
      className="checkout-settings-backdrop"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
      onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
      role="dialog"
      aria-modal="true"
      aria-label="Checkout Settings"
      tabIndex={-1}
    >
      <div className="checkout-settings-panel">
        {/* Header */}
        <div className="checkout-settings-header">
          <h2>Checkout Settings</h2>
          <button
            className="checkout-settings-close"
            onClick={handleCancel}
            aria-label="Close settings"
            title="Close settings (Esc)"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="checkout-settings-content">
          {/* Checkout Mode Section */}
          <section className="settings-section">
            <h3>Checkout Mode</h3>
            <p className="settings-description">
              Choose how checkout opens for customers
            </p>

            <div className="settings-options">
              <label className="settings-option" htmlFor="mode-center-panel">
                <input
                  id="mode-center-panel"
                  type="radio"
                  name="checkoutMode"
                  value="center-panel"
                  checked={selectedMode === 'center-panel'}
                  onChange={(e) => setSelectedMode(e.target.value)}
                />
                <div className="option-content">
                  <strong>Center Panel</strong>
                  <span>Immersive 3D experience (recommended)</span>
                </div>
              </label>

              <label className="settings-option" htmlFor="mode-overlay-modal">
                <input
                  id="mode-overlay-modal"
                  type="radio"
                  name="checkoutMode"
                  value="overlay-modal"
                  checked={selectedMode === 'overlay-modal'}
                  onChange={(e) => setSelectedMode(e.target.value)}
                />
                <div className="option-content">
                  <strong>Overlay Modal</strong>
                  <span>Blurred background, no animations</span>
                </div>
              </label>

              <label className="settings-option" htmlFor="mode-full-page">
                <input
                  id="mode-full-page"
                  type="radio"
                  name="checkoutMode"
                  value="full-page"
                  checked={selectedMode === 'full-page'}
                  onChange={(e) => setSelectedMode(e.target.value)}
                />
                <div className="option-content">
                  <strong>Full Page</strong>
                  <span>Traditional redirect to Shopify</span>
                </div>
              </label>
            </div>
          </section>

          {/* Animation Style Section - only shown for center-panel mode */}
          {selectedMode === 'center-panel' && (
            <section className="settings-section">
              <h3>Animation Style</h3>
              <p className="settings-description">
                Choose how the carousel animates when checkout opens
              </p>

              <div className="settings-options">
                <label className="settings-option" htmlFor="style-dramatic">
                  <input
                    id="style-dramatic"
                    type="radio"
                    name="animationStyle"
                    value="dramatic"
                    checked={selectedStyle === 'dramatic'}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                  />
                  <div className="option-content">
                    <strong>Dramatic</strong>
                    <span>Push items outward radially</span>
                  </div>
                  <button
                    type="button"
                    className="preview-button"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePreviewStyle('dramatic');
                    }}
                    disabled={isPreviewingStyle}
                  >
                    Preview
                  </button>
                </label>

                <label className="settings-option" htmlFor="style-subtle">
                  <input
                    id="style-subtle"
                    type="radio"
                    name="animationStyle"
                    value="subtle"
                    checked={selectedStyle === 'subtle'}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                  />
                  <div className="option-content">
                    <strong>Subtle</strong>
                    <span>Fade items to low opacity</span>
                  </div>
                  <button
                    type="button"
                    className="preview-button"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePreviewStyle('subtle');
                    }}
                    disabled={isPreviewingStyle}
                  >
                    Preview
                  </button>
                </label>

                <label className="settings-option" htmlFor="style-elegant">
                  <input
                    id="style-elegant"
                    type="radio"
                    name="animationStyle"
                    value="elegant"
                    checked={selectedStyle === 'elegant'}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                  />
                  <div className="option-content">
                    <strong>Elegant</strong>
                    <span>Rotate items to backside (180°)</span>
                  </div>
                  <button
                    type="button"
                    className="preview-button"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePreviewStyle('elegant');
                    }}
                    disabled={isPreviewingStyle}
                  >
                    Preview
                  </button>
                </label>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="checkout-settings-footer">
          <button
            type="button"
            className="settings-button settings-button-cancel"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="settings-button settings-button-save"
            onClick={handleSave}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
/* eslint-enable jsx-a11y/label-has-associated-control */

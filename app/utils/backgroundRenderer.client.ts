/**
 * Client-side background renderer using iframe sandbox
 * Handles loading, error detection, timeout, and telemetry
 */

type RendererState = 'idle' | 'loading' | 'loaded' | 'error' | 'timeout';

type RendererEvent = {
  type: 'load' | 'error' | 'timeout';
  presetId: string;
  timestamp: number;
  details?: string;
};

type RendererOptions = {
  container: HTMLElement;
  html: string;
  css: string;
  js: string;
  presetId: string;
  versionHash: string;
  loadTimeout?: number;
  onEvent?: (event: RendererEvent) => void;
};

const DEFAULT_LOAD_TIMEOUT = 5000; // 5 seconds
const SANDBOX_PERMISSIONS = 'allow-scripts allow-same-origin';

export class BackgroundRenderer {
  private iframe: HTMLIFrameElement | null = null;
  private container: HTMLElement;
  private state: RendererState = 'idle';
  private loadTimeoutId: number | null = null;
  private options: RendererOptions;

  constructor(options: RendererOptions) {
    this.options = options;
    this.container = options.container;
  }

  /**
   * Render the background preset in an iframe sandbox
   */
  public render(): void {
    this.cleanup();
    this.state = 'loading';

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.sandbox.add(...SANDBOX_PERMISSIONS.split(' '));
    this.iframe.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
      pointer-events: none;
      z-index: -1;
    `;

    // Set up load/error handlers
    this.iframe.addEventListener('load', this.handleLoad);
    this.iframe.addEventListener('error', this.handleError);

    // Set timeout for load detection
    const timeout = this.options.loadTimeout ?? DEFAULT_LOAD_TIMEOUT;
    this.loadTimeoutId = window.setTimeout(() => this.handleTimeout(), timeout);

    // Build sandboxed document
    const doc = this.buildDocument();
    
    // Append iframe and write content
    this.container.appendChild(this.iframe);
    
    const iframeDoc = this.iframe.contentDocument;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(doc);
      iframeDoc.close();
    } else {
      this.handleError(new Error('Failed to access iframe document'));
    }
  }

  /**
   * Clean up iframe and event listeners
   */
  public cleanup(): void {
    if (this.loadTimeoutId !== null) {
      window.clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }

    if (this.iframe) {
      this.iframe.removeEventListener('load', this.handleLoad);
      this.iframe.removeEventListener('error', this.handleError);
      if (this.iframe.parentNode) {
        this.iframe.parentNode.removeChild(this.iframe);
      }
      this.iframe = null;
    }

    this.state = 'idle';
  }

  /**
   * Get current renderer state
   */
  public getState(): RendererState {
    return this.state;
  }

  /**
   * Build the HTML document for the iframe
   */
  private buildDocument(): string {
    const {html, css, js, presetId, versionHash} = this.options;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="preset-id" content="${this.escapeHtml(presetId)}">
  <meta name="version-hash" content="${this.escapeHtml(versionHash)}">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    (function() {
      'use strict';
      try {
        ${js}
        // Signal successful initialization
        window.parent.postMessage({
          type: 'background-renderer-ready',
          presetId: '${this.escapeJs(presetId)}',
          versionHash: '${this.escapeJs(versionHash)}'
        }, '*');
      } catch (error) {
        window.parent.postMessage({
          type: 'background-renderer-error',
          presetId: '${this.escapeJs(presetId)}',
          error: error.message
        }, '*');
      }
    })();
  </script>
</body>
</html>`;
  }

  /**
   * Handle successful iframe load
   */
  private handleLoad = (): void => {
    if (this.loadTimeoutId !== null) {
      window.clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }

    this.state = 'loaded';
    this.emitEvent({
      type: 'load',
      presetId: this.options.presetId,
      timestamp: Date.now(),
    });
  };

  /**
   * Handle iframe error
   */
  private handleError = (error: Event | Error): void => {
    if (this.loadTimeoutId !== null) {
      window.clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }

    this.state = 'error';
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    this.emitEvent({
      type: 'error',
      presetId: this.options.presetId,
      timestamp: Date.now(),
      details: message,
    });
  };

  /**
   * Handle load timeout
   */
  private handleTimeout = (): void => {
    this.loadTimeoutId = null;
    this.state = 'timeout';
    
    this.emitEvent({
      type: 'timeout',
      presetId: this.options.presetId,
      timestamp: Date.now(),
      details: `Load timeout after ${this.options.loadTimeout ?? DEFAULT_LOAD_TIMEOUT}ms`,
    });
  };

  /**
   * Emit telemetry event
   */
  private emitEvent(event: RendererEvent): void {
    if (this.options.onEvent) {
      this.options.onEvent(event);
    }

    // Also dispatch as custom DOM event for global listeners
    const customEvent = new CustomEvent('background-renderer-event', {
      detail: event,
    });
    window.dispatchEvent(customEvent);
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Escape JavaScript string for embedding in script
   */
  private escapeJs(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }
}

export type {RendererState, RendererEvent, RendererOptions};

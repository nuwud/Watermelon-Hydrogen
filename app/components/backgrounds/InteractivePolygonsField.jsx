/**
 * InteractivePolygonsField.jsx
 * Interactive polygon grid background with mouse influence
 * Part of the unified BackgroundStage system
 */

import {useEffect, useRef, useCallback} from 'react';

// Configuration constants
const CONFIG = {
  // Grid settings
  cols: 25,
  rows: 15,
  cellSize: 50,
  
  // Colors
  baseColor: 0x1a1a2e,
  accentColor: 0xff6b6b,
  hoverColor: 0x4ecdc4,
  
  // Animation
  waveSpeed: 0.002,
  mouseInfluence: 120,
  rotationSpeed: 0.001,
  
  // Visual
  polygonSides: 6, // Hexagons
  lineWidth: 1.5,
  opacity: 0.6,
};

/**
 * InteractivePolygonsField - Canvas-based animated polygon grid
 * Renders a grid of polygons that respond to mouse movement
 */
export function InteractivePolygonsField({isReducedMotion = false}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const mouseRef = useRef({x: -1000, y: -1000});
  const timeRef = useRef(0);

  // Create polygon path
  const createPolygonPath = useCallback((ctx, x, y, radius, sides, rotation = 0) => {
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i * 2 * Math.PI / sides) + rotation;
      const px = x + radius * Math.cos(angle);
      const py = y + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
  }, []);

  // Convert hex color to rgba
  const hexToRgba = useCallback((hex, alpha) => {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  // Lerp between two hex colors
  const lerpColor = useCallback((color1, color2, t) => {
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;
    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    // Mouse move handler
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    // Mouse leave handler
    const handleMouseLeave = () => {
      mouseRef.current = {x: -1000, y: -1000};
    };

    // Animation loop
    const animate = () => {
      if (!canvas || !ctx) return;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update time
      if (!isReducedMotion) {
        timeRef.current += CONFIG.waveSpeed;
      }

      // Calculate grid
      const cellWidth = CONFIG.cellSize * 1.5;
      const cellHeight = CONFIG.cellSize * Math.sqrt(3);
      const cols = Math.ceil(width / cellWidth) + 2;
      const rows = Math.ceil(height / cellHeight) + 2;

      // Draw polygons
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Offset for hex grid pattern
          const offsetX = row % 2 === 0 ? 0 : cellWidth / 2;
          const x = col * cellWidth + offsetX;
          const y = row * cellHeight * 0.75;

          // Distance from mouse
          const dx = x - mouseRef.current.x;
          const dy = y - mouseRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Mouse influence factor (0 to 1)
          const influence = Math.max(0, 1 - distance / CONFIG.mouseInfluence);

          // Wave effect based on position and time
          const wave = isReducedMotion 
            ? 0 
            : Math.sin(x * 0.02 + y * 0.02 + timeRef.current) * 0.5 + 0.5;

          // Calculate size with influence
          const baseSize = CONFIG.cellSize * 0.4;
          const size = baseSize + influence * baseSize * 0.5 + wave * 3;

          // Calculate rotation
          const rotation = isReducedMotion 
            ? 0 
            : timeRef.current * CONFIG.rotationSpeed + influence * 0.5;

          // Calculate color
          let color = CONFIG.baseColor;
          if (influence > 0) {
            color = lerpColor(CONFIG.accentColor, CONFIG.hoverColor, influence);
          } else if (wave > 0.5) {
            color = lerpColor(CONFIG.baseColor, CONFIG.accentColor, (wave - 0.5) * 0.3);
          }

          // Calculate opacity
          const opacity = CONFIG.opacity + influence * 0.3 + wave * 0.1;

          // Draw polygon
          ctx.lineWidth = CONFIG.lineWidth + influence * 2;
          ctx.strokeStyle = hexToRgba(color, opacity);
          ctx.fillStyle = hexToRgba(color, opacity * 0.1);

          createPolygonPath(ctx, x, y, size, CONFIG.polygonSides, rotation);
          ctx.fill();
          ctx.stroke();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    handleResize();
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isReducedMotion, createPolygonPath, hexToRgba, lerpColor]);

  return (
    <canvas
      ref={canvasRef}
      className="wm-background-stage__polygons"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
      }}
      aria-hidden="true"
    />
  );
}

export default InteractivePolygonsField;

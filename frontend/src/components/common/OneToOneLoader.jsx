import React from 'react';

/**
 * OneToOneLoader
 * 
 * Signature brand loading indicator featuring the iconic 2 vertical dots from the One to One logo,
 * rotating smoothly with brand-calibrated styling and fallback text.
 * 
 * @param {string} size - 'sm' (16px), 'md' (24px, default), 'lg' (36px), 'xl' (48px), or custom px number
 * @param {string} color - Dot color (default: '#e09924' / brand amber-gold or 'currentColor')
 * @param {string} text - Optional text below (e.g. "Loading...")
 * @param {boolean} inline - Whether to render inline or centered block
 * @param {object} style - Extra style overrides for the wrapper
 */
export default function OneToOneLoader({
  size = 'md',
  color = '#e09924',
  text = 'Loading...',
  inline = false,
  style = {}
}) {
  const pixelSizes = {
    sm: 16,
    md: 24,
    lg: 36,
    xl: 48
  };

  const dimension = typeof size === 'number' ? size : (pixelSizes[size] || 24);
  const dotSize = Math.max(3, Math.round(dimension * 0.30));

  return (
    <div 
      style={{
        display: inline ? 'inline-flex' : 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: inline ? '0' : '16px',
        ...style
      }}
    >
      <div
        className="oto-rotating-dots"
        style={{
          width: `${dimension}px`,
          height: `${dimension}px`,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'otoSpin 1.1s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite'
        }}
      >
        <span 
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}66`
          }}
        />
        <span 
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}66`
          }}
        />
      </div>

      {text && (
        <span 
          style={{ 
            fontSize: dimension > 24 ? '13px' : '11.5px', 
            fontWeight: 500, 
            letterSpacing: '0.5px',
            color: 'var(--text-secondary, #94a3b8)' 
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}

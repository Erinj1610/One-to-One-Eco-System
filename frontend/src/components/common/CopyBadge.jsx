import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * CopyBadge
 * 
 * Elegant click-to-copy pill for order IDs, PO numbers, client emails, SKUs, and tracking refs.
 * Displays a snappy green 'Copied!' toast/tooltip on click.
 * 
 * @param {string} text - The text value to copy to clipboard
 * @param {React.ReactNode} children - Optional custom children to render inside pill
 * @param {string} title - Tooltip hint (default: "Click to copy")
 * @param {object} style - Extra style overrides
 */
export default function CopyBadge({
  text,
  children,
  title = 'Click to copy',
  style = {}
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!text && typeof children !== 'string') return;
    const valueToCopy = String(text || children).trim();
    
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(valueToCopy).catch(() => {});
    } else {
      // Fallback
      const el = document.createElement('textarea');
      el.value = valueToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <span
      onClick={handleCopy}
      title={copied ? 'Copied to clipboard!' : title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '4px',
        background: copied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)',
        border: copied ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--border, rgba(255, 255, 255, 0.08))',
        color: copied ? '#4ade80' : 'inherit',
        fontFamily: 'monospace',
        fontSize: '11px',
        fontWeight: 600,
        transition: 'all 0.15s ease',
        userSelect: 'none',
        position: 'relative',
        ...style
      }}
    >
      {children || text}
      {copied ? (
        <Check size={11} color="#4ade80" style={{ flexShrink: 0 }} />
      ) : (
        <Copy size={10} style={{ opacity: 0.4, flexShrink: 0 }} />
      )}
      {copied && (
        <span
          style={{
            position: 'absolute',
            top: '-22px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#15803d',
            color: '#ffffff',
            fontSize: '9.5px',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          Copied!
        </span>
      )}
    </span>
  );
}

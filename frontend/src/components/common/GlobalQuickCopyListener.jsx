import React, { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * GlobalQuickCopyListener
 * 
 * Provides a dedicated custom right-click context menu across the entire portal:
 * Whenever you right-click on ANY text, order ID, table cell, or reference:
 * - A clean, sleek 1-to-1 branded context menu pops up right at your cursor: "Copy [text]"
 * - Clicking it copies the text directly to your clipboard and flashes "✓ Copied!"
 * - Left-clicking anywhere or pressing Escape closes the menu.
 */
export default function GlobalQuickCopyListener() {
  const [menu, setMenu] = useState(null); // { x, y, text }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleContextMenu = (e) => {
      // 1. Check if user already highlighted text
      let textToCopy = window.getSelection()?.toString()?.trim();

      // 2. If nothing is actively selected, extract text from clicked element or its nearest cell/badge
      if (!textToCopy) {
        const target = e.target;
        if (target) {
          // If input or textarea, take value
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            textToCopy = target.value?.trim();
          } else {
            // Find cleanest text in cell or badge
            const cell = target.closest('td, th, [class*="badge"], [class*="code"], a, span, p');
            textToCopy = (cell || target).innerText?.trim();
          }
        }
      }

      // Don't show menu if target is totally empty
      if (!textToCopy) {
        setMenu(null);
        return;
      }

      e.preventDefault();
      setCopied(false);

      // Keep menu within screen boundaries
      const x = Math.min(e.clientX, window.innerWidth - 220);
      const y = Math.min(e.clientY, window.innerHeight - 100);

      setMenu({ x, y, text: textToCopy });
    };

    const handleClickOutside = () => {
      setMenu(null);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMenu(null);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const executeCopy = (e) => {
    e.stopPropagation();
    if (!menu?.text) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(menu.text).catch(() => {});
    } else {
      const el = document.createElement('textarea');
      el.value = menu.text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setCopied(true);
    setTimeout(() => {
      setMenu(null);
      setCopied(false);
    }, 800);
  };

  if (!menu) return null;

  const displayText = menu.text.length > 28 ? menu.text.slice(0, 25) + '...' : menu.text;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: `${menu.x}px`,
        top: `${menu.y}px`,
        zIndex: 9999999,
        background: '#18181b',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        padding: '5px',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.2)',
        minWidth: '180px',
        maxWidth: '260px',
        fontFamily: "'Inter', sans-serif",
        animation: 'fadeIn 0.12s ease-out'
      }}
    >
      <button
        onClick={executeCopy}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: copied ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
          border: 'none',
          borderRadius: '6px',
          color: copied ? '#4ade80' : '#f4f4f5',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.1s ease'
        }}
        onMouseEnter={(e) => {
          if (!copied) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
        }}
        onMouseLeave={(e) => {
          if (!copied) e.currentTarget.style.background = 'transparent';
        }}
      >
        {copied ? (
          <>
            <Check size={14} color="#4ade80" />
            <span>Copied to Clipboard!</span>
          </>
        ) : (
          <>
            <Copy size={13} color="#a1a1aa" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Copy "{displayText}"
            </span>
          </>
        )}
      </button>
    </div>
  );
}

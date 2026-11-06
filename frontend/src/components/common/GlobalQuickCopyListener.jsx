import React, { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * GlobalQuickCopyListener
 * 
 * High-precision, professional quick-copy context menu:
 * - Triggers ONLY when right-clicking on specific data entities:
 *   1. Active user selection (highlighted text)
 *   2. Data cells (td, table cell values, codes, IDs, references, badges, monospace text)
 * - Ignores page headers, toolbars, buttons, cards, empty whitespace, and structural elements so native browser behavior is preserved.
 * - Features clean typography: concise "Copy Code" / "Copy [Label]" with subtle shadow, border, and 60fps micro-animation.
 */
export default function GlobalQuickCopyListener() {
  const [menu, setMenu] = useState(null); // { x, y, text, label }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleContextMenu = (e) => {
      // 1. Check if user actively highlighted text
      const selection = window.getSelection()?.toString()?.trim();
      let textToCopy = '';
      let copyLabel = 'Selection';

      if (selection) {
        textToCopy = selection;
        copyLabel = 'Selected Text';
      } else {
        const target = e.target;
        if (!target) return;

        // Never trigger on page headers, main containers, topbars, buttons, or navbars
        if (target.closest('h1, h2, h3, .topbar, .sidebar, .nav-item, button, .sb-logo, .portal-toggle-bar')) {
          setMenu(null);
          return;
        }

        // Only trigger on explicit data containers: table data cells, code elements, badges, or monospace references
        const dataCell = target.closest('td, code, pre, .badge, [data-copyable="true"]');
        if (!dataCell) {
          // If right-clicked on empty page background, card body, or whitespace, do not show custom menu
          setMenu(null);
          return;
        }

        // Determine specific label based on data cell
        const rawText = (target.textContent || dataCell.textContent || '').trim();
        // Ignore cells with excessive multiline content (e.g. whole tables or large text blocks)
        if (!rawText || rawText.length > 120 || rawText.includes('\n\n')) {
          setMenu(null);
          return;
        }

        textToCopy = rawText;

        // Detect smart labels
        if (/^(\d{4}|Q-\d+|PO-|DN-|PL-|INV-|CN-|REC-|RC-)/i.test(textToCopy)) {
          copyLabel = 'Reference ID';
        } else if (/^R\s?[\d,]+(\.\d{2})?$/i.test(textToCopy)) {
          copyLabel = 'Amount';
        } else if (/\S+@\S+\.\S+/.test(textToCopy)) {
          copyLabel = 'Email';
        } else if (textToCopy.length < 20 && !textToCopy.includes(' ')) {
          copyLabel = 'Code';
        } else {
          copyLabel = 'Value';
        }
      }

      if (!textToCopy) {
        setMenu(null);
        return;
      }

      e.preventDefault();
      setCopied(false);

      // Bound to viewport
      const x = Math.min(e.clientX, window.innerWidth - 220);
      const y = Math.min(e.clientY, window.innerHeight - 80);

      setMenu({ x, y, text: textToCopy, label: copyLabel });
    };

    const handleClickOutside = () => setMenu(null);
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
    if (window.otoToast) {
      const snippet = menu.text.length > 28 ? menu.text.slice(0, 25) + '…' : menu.text;
      window.otoToast(`Copied "${snippet}" to clipboard`, 'success', 2200);
    }
    setTimeout(() => {
      setMenu(null);
      setCopied(false);
    }, 400);
  };

  if (!menu) return null;

  const displaySnippet = menu.text.length > 22 ? menu.text.slice(0, 19) + '…' : menu.text;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: `${menu.x}px`,
        top: `${menu.y}px`,
        zIndex: 9999999,
        background: 'rgba(24, 24, 27, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        padding: '3px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
        minWidth: '160px',
        maxWidth: '240px',
        fontFamily: "'Inter', sans-serif",
        animation: 'fadeIn 0.08s ease-out'
      }}
    >
      <button
        onClick={executeCopy}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '6px 10px',
          background: copied ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
          border: 'none',
          borderRadius: '5px',
          color: copied ? '#4ade80' : '#f4f4f5',
          fontSize: '12px',
          fontWeight: 500,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden' }}>
          {copied ? <Check size={13} color="#4ade80" /> : <Copy size={13} color="#e09924" />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {copied ? 'Copied!' : `Copy ${menu.label}`}
          </span>
        </div>
        {!copied && (
          <span style={{ fontSize: '10px', color: '#a1a1aa', fontFamily: 'monospace', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displaySnippet}
          </span>
        )}
      </button>
    </div>
  );
}

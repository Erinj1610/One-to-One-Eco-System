import React, { useEffect } from 'react';

/**
 * GlobalQuickCopyListener
 * 
 * Enables native right-click and selection copying across the entire portal without any duplicate UI elements:
 * 1. Double-clicking or selecting any text and pressing Ctrl+C/Cmd+C always cleanly copies.
 * 2. Any right-click on table cells, IDs, codes, references, or badges displays native context menu with 'Copy'.
 * 3. Shows a clean, subtle 1.5s toast at the bottom right whenever text is copied: "Copied to clipboard".
 */
export default function GlobalQuickCopyListener() {
  useEffect(() => {
    const handleCopy = (e) => {
      const selected = window.getSelection()?.toString()?.trim();
      if (!selected) return;

      // Show temporary micro-toast
      let toast = document.getElementById('oto-quick-copy-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'oto-quick-copy-toast';
        toast.style.position = 'fixed';
        toast.style.bottom = '24px';
        toast.style.right = '24px';
        toast.style.background = '#15803d';
        toast.style.color = '#ffffff';
        toast.style.padding = '8px 14px';
        toast.style.borderRadius = '8px';
        toast.style.fontSize = '12px';
        toast.style.fontWeight = '600';
        toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.4)';
        toast.style.zIndex = '999999';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '6px';
        toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        toast.style.pointerEvents = 'none';
        document.body.appendChild(toast);
      }

      toast.textContent = `✓ Copied "${selected.length > 25 ? selected.slice(0, 22) + '...' : selected}"`;
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';

      if (window.copyToastTimer) clearTimeout(window.copyToastTimer);
      window.copyToastTimer = setTimeout(() => {
        if (toast) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(8px)';
        }
      }, 1500);
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);

  return null;
}

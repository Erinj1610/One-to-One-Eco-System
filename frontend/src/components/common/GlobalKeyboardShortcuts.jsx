import React, { useEffect } from 'react';

/**
 * GlobalKeyboardShortcuts
 * 
 * Portal-wide keyboard accessibility listener:
 * 1. Pressing '/' focuses the primary search input on the active page (unless already inside an input/textarea).
 * 2. Pressing 'Escape' closes any open modal, dialog, or drawer by dispatching a custom 'portal-escape' event
 *    and triggering close on the top-most modal backdrop or cancel/close button.
 */
export default function GlobalKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable
      );

      // 1. Shortcut: '/' key focuses the page search input
      if (e.key === '/' && !isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Find visible search input on active screen
        const searchInput = document.querySelector(
          'input[placeholder*="Search" i], input[type="search"], input[name="search"]'
        );
        if (searchInput && typeof searchInput.focus === 'function') {
          e.preventDefault();
          searchInput.focus();
          if (typeof searchInput.select === 'function') {
            searchInput.select();
          }
          return;
        }
      }

      // 2. Shortcut: 'Escape' key closes open modals, dialogs, drawers, or dropdowns
      if (e.key === 'Escape') {
        // First check if an input is focused; if so, blur it first
        if (isInputFocused) {
          activeEl.blur();
        }

        // Dispatch global portal escape event for any custom listeners
        window.dispatchEvent(new CustomEvent('portal-escape'));

        // Look for top-level modal close buttons or backdrop cancel handlers
        // Priority 1: standard close button inside visible modal container
        const modalContainers = Array.from(document.querySelectorAll(
          '.modal-backdrop, .modal, [role="dialog"], [class*="Modal"], [class*="Drawer"]'
        )).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

        if (modalContainers.length > 0) {
          const topModal = modalContainers[modalContainers.length - 1];
          // Find standard close or cancel button inside the top modal
          const closeBtn = topModal.querySelector(
            'button[aria-label="Close" i], button.btn-close, button[title*="Close" i], .close-button, button:has(svg.lucide-x)'
          );
          if (closeBtn && typeof closeBtn.click === 'function') {
            closeBtn.click();
            return;
          }

          // Otherwise look for standard "Cancel" button
          const cancelBtn = Array.from(topModal.querySelectorAll('button')).find(
            b => b.textContent && b.textContent.trim().toLowerCase() === 'cancel'
          );
          if (cancelBtn && typeof cancelBtn.click === 'function') {
            cancelBtn.click();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}

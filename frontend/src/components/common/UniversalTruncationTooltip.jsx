import React, { useEffect, useState, useRef } from 'react';

/**
 * UniversalTruncationTooltip
 * Automatically detects any table cell or truncated element (with text-overflow: ellipsis
 * or overflow hidden) when hovered, and renders a sleek luxury brand tooltip with full text.
 */
export default function UniversalTruncationTooltip() {
  const [tooltip, setTooltip] = useState({
    visible: false,
    text: '',
    x: 0,
    y: 0,
    placement: 'bottom'
  });
  
  const timerRef = useRef(null);

  useEffect(() => {
    const handleMouseOver = (e) => {
      const target = e.target.closest('td, th, .truncate, [style*="ellipsis"], [style*="hidden"]');
      if (!target) return;

      // Check if text is truncated or long enough
      const isTruncated = 
        target.scrollWidth > (target.clientWidth + 2) || 
        target.scrollHeight > (target.clientHeight + 2);

      const rawText = (target.innerText || target.textContent || '').trim();
      
      // If not truncated or very short, do not show tooltip
      if (!isTruncated || rawText.length < 15) return;
      // Do not duplicate if element already has native title attribute
      if (target.getAttribute('title')) return;

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        let x = rect.left + rect.width / 2;
        let y = rect.bottom + 6;
        let placement = 'bottom';

        if (y + 40 > screenH) {
          y = rect.top - 6;
          placement = 'top';
        }

        // Clamp x to window borders
        x = Math.max(120, Math.min(screenW - 120, x));

        setTooltip({
          visible: true,
          text: rawText,
          x,
          y,
          placement
        });
      }, 250); // Small 250ms delay for effortless feel
    };

    const handleMouseOut = (e) => {
      clearTimeout(timerRef.current);
      setTooltip(prev => prev.visible ? { ...prev, visible: false } : prev);
    };

    const handleScroll = () => {
      clearTimeout(timerRef.current);
      setTooltip(prev => prev.visible ? { ...prev, visible: false } : prev);
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  if (!tooltip.visible || !tooltip.text) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: tooltip.placement === 'top' ? tooltip.y : undefined,
        bottom: tooltip.placement === 'bottom' ? undefined : (window.innerHeight - tooltip.y),
        top: tooltip.placement === 'bottom' ? tooltip.y : undefined,
        left: tooltip.x,
        transform: tooltip.placement === 'top' 
          ? 'translate(-50%, -100%)' 
          : 'translate(-50%, 0)',
        zIndex: 999999,
        backgroundColor: '#12161f',
        color: '#f8fafc',
        border: '1px solid rgba(224, 153, 36, 0.4)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        borderRadius: '7px',
        padding: '6px 12px',
        fontSize: '11.5px',
        fontWeight: '500',
        lineHeight: '1.45',
        maxWidth: '380px',
        wordBreak: 'break-word',
        pointerEvents: 'none',
        whiteSpace: 'pre-wrap',
        animation: 'fadeIn 0.12s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#e09924', fontSize: '9px' }}>●</span>
        <span>{tooltip.text}</span>
      </div>
    </div>
  );
}

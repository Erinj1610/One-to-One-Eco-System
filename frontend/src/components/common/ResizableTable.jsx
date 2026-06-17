import { useState } from 'react';

/**
 * Reusable hook to add spreadsheet-like resizable columns to any table.
 * Supports LocalStorage persistence out of the box.
 * 
 * @param {string} tableId - Unique identifier for the table config in LocalStorage
 * @param {Object} defaultWidths - Initial mapping of column keys/indices to pixel widths
 */
export function useResizableTable(tableId, defaultWidths) {
  const [widths, setWidths] = useState(() => {
    const saved = localStorage.getItem(`table_widths_${tableId}`);
    if (saved) {
      try {
        return { ...defaultWidths, ...JSON.parse(saved) };
      } catch (e) {
        // ignore parsing errors
      }
    }
    return defaultWidths;
  });

  const onResizeStart = (colKey, e) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = widths[colKey] || 100;

    const handleMouseMove = (moveEvent) => {
      const currentX = moveEvent.pageX;
      const deltaX = currentX - startX;
      const newWidth = Math.max(40, startWidth + deltaX);
      
      setWidths((prev) => {
        const next = { ...prev, [colKey]: newWidth };
        localStorage.setItem(`table_widths_${tableId}`, JSON.stringify(next));
        return next;
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return { widths, onResizeStart };
}

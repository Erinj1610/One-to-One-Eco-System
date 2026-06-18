import { useState } from 'react';

/**
 * Reusable hook to add spreadsheet-like resizable columns to any table.
 * Supports LocalStorage persistence out of the box.
 * 
 * @param {string} tableId - Unique identifier for the table config in LocalStorage
 * @param {Object} defaultWidths - Initial mapping of column keys/indices to pixel widths
 * @param {Array<string>} [columnKeys] - Optional ordered list of column keys. If provided, resizing distributes width to the adjacent column, keeping total table width at 100%.
 */
export function useResizableTable(tableId, defaultWidths, columnKeys) {
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

    // Find the next column key to distribute width to
    const nextColKey = columnKeys ? columnKeys[columnKeys.indexOf(colKey) + 1] : null;
    const startWidthNext = nextColKey ? (widths[nextColKey] || 100) : null;

    const handleMouseMove = (moveEvent) => {
      const currentX = moveEvent.pageX;
      const deltaX = currentX - startX;
      
      if (nextColKey && startWidthNext !== null) {
        // Constrain both columns to a minimum of 40px
        const maxDelta = startWidthNext - 40;
        const minDelta = 40 - startWidth;
        const constrainedDelta = Math.max(minDelta, Math.min(maxDelta, deltaX));

        const newWidth = startWidth + constrainedDelta;
        const newWidthNext = startWidthNext - constrainedDelta;

        setWidths((prev) => {
          const next = { ...prev, [colKey]: newWidth, [nextColKey]: newWidthNext };
          localStorage.setItem(`table_widths_${tableId}`, JSON.stringify(next));
          return next;
        });
      } else {
        const newWidth = Math.max(40, startWidth + deltaX);
        setWidths((prev) => {
          const next = { ...prev, [colKey]: newWidth };
          localStorage.setItem(`table_widths_${tableId}`, JSON.stringify(next));
          return next;
        });
      }
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

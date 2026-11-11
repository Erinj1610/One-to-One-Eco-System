import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

/**
 * EmptyStateBanner
 * 
 * Standardized portal-wide empty state component.
 * Used whenever a list, table, or filter returns zero items.
 * 
 * @param {string} title - Main header (e.g. "No matching records found")
 * @param {string} subtitle - Explanatory helper text
 * @param {function} onClear - Optional callback to clear the active search/filters
 * @param {string} clearLabel - Label for the reset button (default: "Clear filters")
 * @param {React.ReactNode} icon - Optional custom icon (defaults to Search icon)
 * @param {number} colSpan - If rendered inside a table row `<tr>`, passes colSpan
 * @param {object} style - Extra styles for the container
 */
export default function EmptyStateBanner({
  title = 'No records match your criteria',
  subtitle = 'Try refining your search query or adjusting your active filters.',
  onClear = null,
  clearLabel = 'Clear search & filters',
  icon = null,
  colSpan = null,
  style = {}
}) {
  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--text-secondary, #94a3b8)',
        ...style
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
          color: 'var(--text-tertiary, #64748b)'
        }}
      >
        {icon || <Search size={20} />}
      </div>

      <div
        style={{
          fontSize: '13.5px',
          fontWeight: 600,
          color: 'var(--text-primary, #f1f5f9)',
          marginBottom: '6px'
        }}
      >
        {title}
      </div>

      {subtitle && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-tertiary, #64748b)',
            maxWidth: '380px',
            margin: '0 0 16px 0',
            lineHeight: 1.5
          }}
        >
          {subtitle}
        </p>
      )}

      {onClear && (
        <button
          onClick={onClear}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          <RotateCcw size={12} />
          {clearLabel}
        </button>
      )}
    </div>
  );

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan} style={{ padding: 0 }}>
          {content}
        </td>
      </tr>
    );
  }

  return content;
}

import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Check, Eye } from 'lucide-react';

/**
 * TableViewOptions
 * 
 * Clean, lightweight popover to:
 * 1. Switch density: 'comfortable' vs 'compact'
 * 2. Toggle visible columns on/off
 * 
 * Automatically persists preferences to localStorage under `storageKey`.
 */
export default function TableViewOptions({
  storageKey,
  columns = [], // Array of { id: string, label: string, defaultVisible?: boolean, locked?: boolean }
  visibleColumns = {}, // Record<string, boolean>
  onToggleColumn,
  density = 'comfortable', // 'comfortable' | 'compact'
  onChangeDensity
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const hiddenCount = columns.filter(c => !c.locked && visibleColumns[c.id] === false).length;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 11px',
          borderRadius: '7px',
          border: '1px solid #e2e8f0',
          background: isOpen ? '#f1f5f9' : '#ffffff',
          color: '#475569',
          fontSize: '11.5px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        title="Customize Table View & Columns"
      >
        <SlidersHorizontal size={13} style={{ color: '#64748b' }} />
        <span>View</span>
        {hiddenCount > 0 && (
          <span style={{
            fontSize: '10px',
            background: '#e0f2fe',
            color: '#0369a1',
            borderRadius: '10px',
            padding: '1px 5px',
            fontWeight: 700
          }}>
            -{hiddenCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          width: '230px',
          background: '#ffffff',
          borderRadius: '9px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
          zIndex: 50,
          padding: '10px',
          fontSize: '12px',
          animation: 'fadeIn 0.15s ease'
        }}>
          {/* DENSITY SELECTOR */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Row Density
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: '#f8fafc', padding: '3px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={() => onChangeDensity('comfortable')}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: density === 'comfortable' ? '#ffffff' : 'transparent',
                  color: density === 'comfortable' ? '#0f172a' : '#64748b',
                  fontWeight: density === 'comfortable' ? 700 : 500,
                  fontSize: '11px',
                  cursor: 'pointer',
                  boxShadow: density === 'comfortable' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => onChangeDensity('compact')}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: density === 'compact' ? '#ffffff' : 'transparent',
                  color: density === 'compact' ? '#0f172a' : '#64748b',
                  fontWeight: density === 'compact' ? 700 : 500,
                  fontSize: '11px',
                  cursor: 'pointer',
                  boxShadow: density === 'compact' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Compact
              </button>
            </div>
          </div>

          <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }} />

          {/* COLUMN VISIBILITY */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Toggle Columns
              </span>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    columns.forEach(col => {
                      if (!col.locked && visibleColumns[col.id] === false) {
                        onToggleColumn(col.id, true);
                      }
                    });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Reset all
                </button>
              )}
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {columns.map(col => {
                const isVisible = visibleColumns[col.id] !== false;
                return (
                  <label
                    key={col.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 6px',
                      borderRadius: '5px',
                      cursor: col.locked ? 'not-allowed' : 'pointer',
                      background: isVisible ? 'transparent' : '#f8fafc',
                      color: col.locked ? '#94a3b8' : (isVisible ? '#1e293b' : '#64748b'),
                      userSelect: 'none',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <input
                        type="checkbox"
                        checked={isVisible}
                        disabled={col.locked}
                        onChange={() => onToggleColumn(col.id, !isVisible)}
                        style={{ cursor: col.locked ? 'not-allowed' : 'pointer' }}
                      />
                      <span style={{ fontSize: '11px', fontWeight: isVisible ? 600 : 400 }}>
                        {col.label}
                      </span>
                    </div>
                    {col.locked && (
                      <span style={{ fontSize: '9.5px', color: '#94a3b8', textTransform: 'uppercase' }}>Locked</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * SearchableFilterDropdown
 * Sleek, filterable dropdown popup for long option lists (Projects, Clients, PMs).
 * Enables instant typing to filter without scrolling through hundreds of items.
 */
export default function SearchableFilterDropdown({
  value,
  onChange,
  options = [], // [{ value, label }] or string[]
  allLabel = 'All',
  width = '160px',
  maxHeight = '240px',
  icon: Icon
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options into { value, label } format
  const normalizedOptions = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return { 
          value: opt.value ?? opt.key ?? '', 
          label: opt.label ?? opt.name ?? String(opt.value ?? opt.key ?? '') 
        };
      }
      return { value: String(opt), label: String(opt) };
    });
  }, [options]);

  // Current display label
  const currentLabel = useMemo(() => {
    if (!value || value === 'All') return allLabel;
    const found = normalizedOptions.find(o => String(o.value) === String(value));
    return found ? found.label : value;
  }, [value, allLabel, normalizedOptions]);

  // Filtered options based on search query
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const q = searchTerm.toLowerCase().trim();
    return normalizedOptions.filter(o => 
      (o.label || '').toLowerCase().includes(q) || 
      (o.value || '').toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchTerm]);

  // Close when clicking outside & auto-focus input on open
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const isSelectedActive = value && value !== 'All';

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width, minWidth: width }}>
      <button
        type="button"
        className="form-control"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '100%',
          height: '34px',
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          cursor: 'pointer',
          textAlign: 'left',
          background: isSelectedActive ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-secondary)',
          borderColor: isSelectedActive ? 'var(--text-info)' : 'var(--border)',
          color: isSelectedActive ? 'var(--text-info)' : 'var(--text-secondary)',
          fontWeight: isSelectedActive ? 600 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        title={currentLabel}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {Icon && <Icon size={13} style={{ flexShrink: 0, opacity: 0.7 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentLabel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {isSelectedActive && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('All');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.12)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                marginRight: '2px'
              }}
              title="Clear filter"
            >
              <X size={10} />
            </span>
          )}
          <ChevronDown 
            size={13} 
            style={{ 
              opacity: 0.6, 
              transform: isOpen ? 'rotate(180deg)' : 'none', 
              transition: 'transform 0.15s ease' 
            }} 
          />
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1050,
            minWidth: Math.max(220, parseInt(width, 10) || 200),
            maxWidth: '320px',
            background: 'var(--bg-primary, #111827)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}
        >
          {/* Search Header */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              <input
                ref={searchInputRef}
                type="search"
                className="form-control"
                placeholder={`Search ${allLabel.replace(/^All\s*/, '')}...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  height: '28px',
                  paddingLeft: '26px',
                  paddingRight: '8px',
                  fontSize: '11px',
                  background: 'var(--bg-primary)'
                }}
              />
            </div>
          </div>

          {/* Options List */}
          <div style={{ maxHeight, overflowY: 'auto', padding: '4px' }}>
            {/* "All" Reset Option */}
            <div
              onClick={() => handleSelect('All')}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: (!value || value === 'All') ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: (!value || value === 'All') ? 'var(--text-info)' : 'var(--text-primary)',
                fontWeight: (!value || value === 'All') ? 600 : 400
              }}
              onMouseEnter={e => {
                if (value !== 'All') e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={e => {
                if (value !== 'All') e.currentTarget.style.background = 'transparent';
              }}
            >
              <span>{allLabel}</span>
              {(!value || value === 'All') && <span style={{ fontSize: '10px' }}>✓</span>}
            </div>

            {/* List options */}
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                No matches found
              </div>
            ) : (
              filtered.map(opt => {
                const isSelected = String(value) === String(opt.value);
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      color: isSelected ? 'var(--text-info)' : 'var(--text-primary)',
                      fontWeight: isSelected ? 600 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                    title={opt.label}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {isSelected && <span style={{ fontSize: '10px', marginLeft: '6px' }}>✓</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

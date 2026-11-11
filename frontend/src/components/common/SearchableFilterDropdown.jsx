import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * SearchableFilterDropdown
 * Sleek, luxury filterable dropdown for option lists across the portal.
 * Automatically enables instant typing for long lists (> 5 options).
 */
export default function SearchableFilterDropdown({
  value,
  onChange,
  options = [], // [{ value, label }] or string[]
  allLabel = 'All',
  width = '150px',
  maxHeight = '260px',
  icon: Icon,
  searchable = undefined // boolean override; defaults to options.length > 5
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

  const shouldShowSearch = searchable !== undefined ? searchable : normalizedOptions.length > 5;

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
      if (shouldShowSearch) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 40);
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, shouldShowSearch]);

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
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12.5px',
          cursor: 'pointer',
          textAlign: 'left',
          background: isSelectedActive ? 'rgba(255, 255, 255, 0.05)' : 'var(--bg-secondary)',
          borderColor: isSelectedActive ? 'var(--text-secondary)' : 'var(--border)',
          color: isSelectedActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontWeight: isSelectedActive ? 600 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'all 0.15s ease'
        }}
        title={currentLabel}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {Icon && <Icon size={13} style={{ flexShrink: 0, opacity: 0.6 }} />}
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
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                marginRight: '2px',
                transition: 'background 0.12s ease'
              }}
              title="Clear filter"
            >
              <X size={9} />
            </span>
          )}
          <ChevronDown 
            size={12} 
            style={{ 
              color: 'var(--text-tertiary)',
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
            minWidth: Math.max(180, parseInt(width, 10) || 180),
            maxWidth: '320px',
            background: 'var(--bg-primary, #111827)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.6), 0 4px 12px -2px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden'
          }}
        >
          {/* Search Header (rendered for longer lists) */}
          {shouldShowSearch && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
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
                    fontSize: '11.5px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div style={{ maxHeight, overflowY: 'auto', padding: '4px' }}>
            {/* "All" Reset Option */}
            <div
              onClick={() => handleSelect('All')}
              style={{
                padding: '6px 10px',
                borderRadius: '5px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: (!value || value === 'All') ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: (!value || value === 'All') ? 'var(--text-primary)' : 'var(--text-secondary)',
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
              {(!value || value === 'All') && <span style={{ fontSize: '10px', color: 'var(--text-info)' }}>✓</span>}
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
                      borderRadius: '5px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
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
                    {isSelected && <span style={{ fontSize: '10px', marginLeft: '6px', color: 'var(--text-info)' }}>✓</span>}
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

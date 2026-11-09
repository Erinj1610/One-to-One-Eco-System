import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Check, RefreshCw, X, ArrowLeft, Layers, Grid } from 'lucide-react';

export default function DropdownSettings({
  lookups,
  lookupCategories,
  selectedLookupCategory,
  setSelectedLookupCategory,
  lookupsLoading,
  newLookup,
  setNewLookup,
  editingLookup,
  setEditingLookup,
  handleSaveLookup,
  handleEditLookupClick,
  handleDeleteLookup,
  lookupError,
  lookupSuccess,
  setLookupCategories,
  onBack
}) {
  const displayNames = {
    client_type: 'Client Types',
    loss_reason: 'Loss Reasons',
    project_status: 'Project Statuses',
    delay_reason: 'Delay Reasons'
  };

  const currentOptions = lookups.filter(item => item.category === selectedLookupCategory);
  const activeCount = currentOptions.filter(item => item.is_active).length;

  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {onBack && (
              <button 
                type="button" 
                onClick={onBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  marginRight: '6px'
                }}
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b' }}>
              Workflow & Operations
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>
            System Dropdowns & Lookup Lists
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Configure and manage dynamic values for all dropdown lists and status fields in the portal.
          </p>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Lookup Lists
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {lookupCategories.length}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Available categories
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Selected List
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayNames[selectedLookupCategory] || selectedLookupCategory.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Key: <code>{selectedLookupCategory}</code>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Options
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {activeCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>/ {currentOptions.length}</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Operational values
          </div>
        </div>
      </div>

      {lookupError && (
        <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#dc2626', fontSize: '12.5px' }}>
          {lookupError}
        </div>
      )}
      {lookupSuccess && (
        <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#16a34a', fontSize: '12.5px' }}>
          {lookupSuccess}
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Column: Categories List & Add Category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
              Select Lookup List
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {lookupCategories.map(cat => {
                const isSelected = selectedLookupCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedLookupCategory(cat);
                      setEditingLookup(null);
                      setNewLookup({ label: '', value: '', sort_order: 1, is_active: true, color: 'default' });
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: isSelected ? '#f1f5f9' : 'transparent',
                      color: isSelected ? '#0f172a' : '#475569',
                      border: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 600 : 500,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {displayNames[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
              New Dropdown List
            </div>
            <input
              type="text"
              placeholder="e.g. lead_source..."
              style={{
                width: '100%',
                height: '34px',
                padding: '4px 10px',
                fontSize: '12px',
                color: '#0f172a',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                marginBottom: '6px'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const newCat = e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
                  if (lookupCategories.includes(newCat)) {
                    alert('Lookup category already exists');
                    return;
                  }
                  setLookupCategories(prev => [...prev, newCat].sort());
                  setSelectedLookupCategory(newCat);
                  e.target.value = '';
                }
              }}
            />
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Type key name and press Enter to initialize a new dropdown.
            </div>
          </div>
        </div>

        {/* Right Column: Add/Edit Option Form & Active Options Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Add/Edit Form Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                {editingLookup ? 'Edit Option' : 'Add New Option'} to list: <strong style={{ color: '#0f172a' }}>{selectedLookupCategory}</strong>
              </div>
              {editingLookup && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLookup(null);
                    setNewLookup({ label: '', value: '', sort_order: 1, is_active: true, color: 'default' });
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: '#64748b',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  <X size={12} /> Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveLookup} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr)) auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Display Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Consultant"
                  value={newLookup.label}
                  onChange={e => setNewLookup(prev => ({ ...prev, label: e.target.value, value: editingLookup ? prev.value : e.target.value }))}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  System Value
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Consultant"
                  value={newLookup.value}
                  onChange={e => setNewLookup(prev => ({ ...prev, value: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ maxWidth: '80px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Sort Order
                </label>
                <input
                  type="number"
                  required
                  value={newLookup.sort_order}
                  onChange={e => setNewLookup(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 8px',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Color Badge (Optional)
                </label>
                <select
                  value={newLookup.color}
                  onChange={e => setNewLookup(prev => ({ ...prev, color: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                >
                  <option value="default">Default (Gray)</option>
                  <option value="primary">Primary (Blue)</option>
                  <option value="success">Success (Green)</option>
                  <option value="info">Info (Cyan)</option>
                  <option value="warning">Warning (Orange)</option>
                  <option value="danger">Danger (Red)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', height: '34px', paddingBottom: '2px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newLookup.is_active}
                    onChange={e => setNewLookup(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  Active
                </label>
              </div>

              <div>
                <button 
                  type="submit" 
                  style={{
                    height: '34px',
                    padding: '0 18px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {editingLookup ? 'Update Option' : 'Add Option'}
                </button>
              </div>
            </form>
          </div>

          {/* Active Options Table Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                Active options in selected list
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {currentOptions.length} total options
              </span>
            </div>

            {lookupsLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', fontSize: '12.5px', color: '#64748b' }}>
                <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                Loading options...
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', margin: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ width: '60px', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sort</th>
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Display Label</th>
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Value</th>
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Color Badge</th>
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    <th style={{ width: '120px', textAlign: 'right', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOptions.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: item.is_active ? 1 : 0.5, transition: 'background 0.1s ease' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#64748b' }}>{item.sort_order}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{item.label}</td>
                      <td style={{ padding: '10px 14px' }}><code style={{ fontFamily: 'monospace', color: '#475569', fontSize: '11.5px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{item.value}</code></td>
                      <td style={{ padding: '10px 14px' }}>
                        {item.metadata_json?.color ? (
                          <span style={{ 
                            display: 'inline-block',
                            padding: '2px 8px', 
                            fontSize: '10.5px', 
                            fontWeight: 700, 
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            borderRadius: '4px',
                            background: item.metadata_json.color === 'success' ? '#f0fdf4' : item.metadata_json.color === 'danger' ? '#fef2f2' : item.metadata_json.color === 'warning' ? '#fffbeb' : '#f1f5f9',
                            color: item.metadata_json.color === 'success' ? '#16a34a' : item.metadata_json.color === 'danger' ? '#dc2626' : item.metadata_json.color === 'warning' ? '#d97706' : '#475569',
                            border: `1px solid ${item.metadata_json.color === 'success' ? '#bbf7d0' : item.metadata_json.color === 'danger' ? '#fecaca' : item.metadata_json.color === 'warning' ? '#fde68a' : '#cbd5e1'}`
                          }}>
                            {item.metadata_json.color}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: item.is_active ? '#f0fdf4' : '#f8fafc',
                          color: item.is_active ? '#16a34a' : '#94a3b8',
                          border: `1px solid ${item.is_active ? '#bbf7d0' : '#e2e8f0'}`
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.is_active ? '#16a34a' : '#94a3b8' }} />
                          {item.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 14px' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleEditLookupClick(item)}
                            style={{ background: 'transparent', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 500, cursor: 'pointer', padding: 0 }}
                          >
                            Edit
                          </button>
                          <span style={{ color: '#cbd5e1', fontSize: '10px' }}>|</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteLookup(item.id)}
                            style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 500, cursor: 'pointer', padding: 0 }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {currentOptions.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                        No options configured for this category yet. Add one above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

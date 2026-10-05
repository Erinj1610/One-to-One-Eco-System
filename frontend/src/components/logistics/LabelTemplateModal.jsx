import React, { useState } from 'react';
import { 
  X, Plus, Trash2, Edit3, Save, RotateCcw, Copy, 
  Tag, Box, Check, HelpCircle, Eye, Sliders, ChevronDown
} from 'lucide-react';
import { VARIABLE_DICTIONARY, DEFAULT_LABEL_TEMPLATES, generateCode128Svg } from '../../utils/labelGenerator';

export default function LabelTemplateModal({ isOpen, onClose, templates, onSaveTemplates }) {
  const [activeTemplates, setActiveTemplates] = useState(templates || DEFAULT_LABEL_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState(activeTemplates[0]?.id || 'hardware_item_50x25');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const currentTemplate = activeTemplates.find(t => t.id === selectedTemplateId) || activeTemplates[0];

  const handleStartEdit = (template) => {
    setEditForm(JSON.parse(JSON.stringify(template)));
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    const newId = `custom_label_${Date.now()}`;
    const newTemplate = {
      id: newId,
      name: 'New Custom Thermal Label',
      description: 'Custom dimensions configured for Argox O4-250.',
      widthMm: 50,
      heightMm: 25,
      orientation: 'landscape',
      type: 'item',
      fields: [
        { id: 'f1', type: 'text', content: 'ONE TO ONE • {{project.name}}', fontSize: 7, fontWeight: 700, align: 'center', borderBottom: true },
        { id: 'f2', type: 'text', content: '{{item.code}}', fontSize: 11, fontWeight: 800, align: 'center', marginTop: 1 },
        { id: 'f3', type: 'text', content: '{{item.description}}', fontSize: 7, fontWeight: 500, align: 'center', maxLines: 1 },
        { id: 'f4', type: 'barcode', barcodeValue: '{{item.code}}', barcodeHeight: 18, showBarcodeText: true, marginTop: 1 }
      ]
    };
    setEditForm(newTemplate);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    const exists = activeTemplates.some(t => t.id === editForm.id);
    let updated;
    if (exists) {
      updated = activeTemplates.map(t => t.id === editForm.id ? editForm : t);
    } else {
      updated = [...activeTemplates, editForm];
    }
    setActiveTemplates(updated);
    setSelectedTemplateId(editForm.id);
    setIsEditing(false);
    setEditForm(null);
    if (onSaveTemplates) onSaveTemplates(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDelete = (id) => {
    if (DEFAULT_LABEL_TEMPLATES.some(d => d.id === id)) {
      alert("Built-in templates cannot be deleted, but you can duplicate or customize them.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this custom template?")) return;
    const updated = activeTemplates.filter(t => t.id !== id);
    setActiveTemplates(updated);
    setSelectedTemplateId(updated[0]?.id || '');
    if (onSaveTemplates) onSaveTemplates(updated);
  };

  const handleDuplicate = (template) => {
    const copy = {
      ...JSON.parse(JSON.stringify(template)),
      id: `copy_${Date.now()}`,
      name: `${template.name} (Copy)`
    };
    const updated = [...activeTemplates, copy];
    setActiveTemplates(updated);
    setSelectedTemplateId(copy.id);
    if (onSaveTemplates) onSaveTemplates(updated);
  };

  const handleResetDefaults = () => {
    if (!window.confirm("Reset all templates back to factory default templates?")) return;
    setActiveTemplates(DEFAULT_LABEL_TEMPLATES);
    setSelectedTemplateId(DEFAULT_LABEL_TEMPLATES[0].id);
    if (onSaveTemplates) onSaveTemplates(DEFAULT_LABEL_TEMPLATES);
  };

  // Field manipulation helpers in edit mode
  const addField = (type) => {
    if (!editForm) return;
    const newField = {
      id: `f_${Date.now()}`,
      type,
      content: type === 'text' ? 'Text with {{item.code}}' : '',
      barcodeValue: type === 'barcode' ? '{{item.code}}' : '',
      barcodeHeight: 20,
      showBarcodeText: true,
      fontSize: 8,
      fontWeight: 600,
      align: 'left',
      marginTop: 2
    };
    setEditForm({
      ...editForm,
      fields: [...(editForm.fields || []), newField]
    });
  };

  const updateField = (index, updates) => {
    if (!editForm) return;
    const updatedFields = [...(editForm.fields || [])];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setEditForm({ ...editForm, fields: updatedFields });
  };

  const removeField = (index) => {
    if (!editForm) return;
    const updatedFields = (editForm.fields || []).filter((_, i) => i !== index);
    setEditForm({ ...editForm, fields: updatedFields });
  };

  // Mock context for preview
  const mockContext = {
    item: {
      code: 'DL-2223/31',
      oneOneCode: '2223/31',
      description: 'Downlight - 2223 Anti-Glare GU10 IP20 White',
      brand: 'Spazio',
      floor: 'First Floor',
      area: 'Kitchen',
      type: 'Downlight',
      dimming: 'Phase-Dim',
      boxNumber: 'Box 1',
      qtyDelivered: 14,
      serial: '1 of 14'
    },
    project: {
      name: 'Reid Stanford Villa',
      client: 'Stanford Holdings',
      deliveryAddress: '14 Mountain View Road, Camps Bay, Cape Town',
      pm: 'Dani'
    },
    order: {
      id: 'Q-2026-0576',
      quote_name: 'General Spec Option 2'
    },
    packingList: {
      id: 'PL-000000001',
      deliveryNoteId: 'DN-000000001'
    },
    box: {
      number: 'Box 1',
      index: '1',
      total: '3',
      itemsCount: '26',
      manifestSummary: '14x DL-2223/31 (Downlight)\n10x LA.4205 (5W Lamp)\n2x DRV-24V (Power Supply)'
    }
  };

  const activeObj = isEditing ? editForm : currentTemplate;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Top Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={18} style={{ color: 'var(--text-info)' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Thermal Label Template Manager & Custom Designer
              </h3>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Configure exact millimeter dimensions, barcode rules, and variable templates for your Argox O4-250 label printer
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saveSuccess && (
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> Saved Successfully
              </span>
            )}
            <button className="btn btn-ghost btn-xs" onClick={handleResetDefaults} title="Reset to standard default sizes" style={{ border: '1px solid var(--border)' }}>
              <RotateCcw size={12} /> Reset Defaults
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body Layout: Sidebar list vs Main Editor/Preview */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Left Column: Template List */}
          <div style={{ width: '280px', borderRight: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Saved Templates ({activeTemplates.length})
              </span>
              <button className="btn btn-primary btn-xs" onClick={handleCreateNew} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                <Plus size={12} /> New
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {activeTemplates.map(tmpl => {
                const isSelected = tmpl.id === selectedTemplateId && !isEditing;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      setIsEditing(false);
                      setEditForm(null);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '6px',
                      background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                      border: isSelected ? '1.5px solid var(--text-info)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>{tmpl.name}</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, background: tmpl.type === 'box' ? '#fef3c7' : '#e0f2fe', color: tmpl.type === 'box' ? '#92400e' : '#0369a1', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                        {tmpl.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'monospace' }}>
                      {tmpl.widthMm}mm × {tmpl.heightMm}mm ({tmpl.orientation})
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); handleDuplicate(tmpl); }} title="Duplicate">
                        <Copy size={11} />
                      </button>
                      <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); handleStartEdit(tmpl); }} title="Edit Design">
                        <Edit3 size={11} />
                      </button>
                      {!DEFAULT_LABEL_TEMPLATES.some(d => d.id === tmpl.id) && (
                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--text-danger)' }} onClick={(e) => { e.stopPropagation(); handleDelete(tmpl.id); }} title="Delete">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Designer / Live Preview */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
            
            {/* Action Bar */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {isEditing ? `Editing: ${editForm.name}` : currentTemplate.name}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '10px' }}>
                  ({activeObj.widthMm}mm × {activeObj.heightMm}mm)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isEditing ? (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setIsEditing(false); setEditForm(null); }}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Save size={14} /> Save Template
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => handleStartEdit(currentTemplate)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Edit3 size={14} /> Customize This Layout
                  </button>
                )}
              </div>
            </div>

            {/* Split: Editor controls (if editing) & Visual Thermal Preview */}
            <div style={{ display: 'flex', flex: 1, padding: '16px', gap: '16px', overflowY: 'auto' }}>
              
              {/* Controls Column (when editing) */}
              {isEditing && editForm && (
                <div style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                  
                  {/* General Config */}
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      📐 Dimensions & Target
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Width (mm)</label>
                        <input 
                          type="number" 
                          className="input input-sm" 
                          value={editForm.widthMm} 
                          onChange={e => setEditForm({ ...editForm, widthMm: Number(e.target.value) || 10 })}
                          style={{ width: '100%', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Height (mm)</label>
                        <input 
                          type="number" 
                          className="input input-sm" 
                          value={editForm.heightMm} 
                          onChange={e => setEditForm({ ...editForm, heightMm: Number(e.target.value) || 10 })}
                          style={{ width: '100%', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Type</label>
                        <select 
                          className="select select-sm" 
                          value={editForm.type} 
                          onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                          style={{ width: '100%', fontSize: '12px' }}
                        >
                          <option value="item">Item / Fitting Label</option>
                          <option value="box">Outer Box Manifest Label</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Orientation</label>
                        <select 
                          className="select select-sm" 
                          value={editForm.orientation} 
                          onChange={e => setEditForm({ ...editForm, orientation: e.target.value })}
                          style={{ width: '100%', fontSize: '12px' }}
                        >
                          <option value="landscape">Landscape</option>
                          <option value="portrait">Portrait</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Layout Blocks Editor */}
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Label Content Blocks
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => addField('text')} style={{ border: '1px solid var(--border)', fontSize: '10.5px' }}>
                          + Text
                        </button>
                        <button className="btn btn-ghost btn-xs" onClick={() => addField('barcode')} style={{ border: '1px solid var(--border)', fontSize: '10.5px' }}>
                          + Barcode
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(editForm.fields || []).map((f, idx) => (
                        <div key={f.id || idx} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', background: 'var(--bg-secondary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                              #{idx + 1} {f.type} block
                            </span>
                            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--text-danger)' }} onClick={() => removeField(idx)}>
                              <Trash2 size={11} />
                            </button>
                          </div>

                          {f.type === 'text' && (
                            <div>
                              <textarea
                                className="input input-sm"
                                rows={2}
                                value={f.content}
                                onChange={e => updateField(idx, { content: e.target.value })}
                                style={{ width: '100%', fontSize: '11.5px', fontFamily: 'monospace' }}
                                placeholder="Enter text or variables like {{item.code}}"
                              />
                              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Font Size:</label>
                                <input 
                                  type="number" 
                                  style={{ width: '50px', fontSize: '11px' }} 
                                  className="input input-xs" 
                                  value={f.fontSize || 8} 
                                  onChange={e => updateField(idx, { fontSize: Number(e.target.value) || 6 })} 
                                />
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '6px' }}>Align:</label>
                                <select 
                                  className="select select-xs" 
                                  value={f.align || 'left'} 
                                  onChange={e => updateField(idx, { align: e.target.value })}
                                  style={{ fontSize: '11px' }}
                                >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                  <option value="right">Right</option>
                                </select>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!f.borderBottom} 
                                    onChange={e => updateField(idx, { borderBottom: e.target.checked })} 
                                  /> Line
                                </label>
                              </div>
                            </div>
                          )}

                          {f.type === 'barcode' && (
                            <div>
                              <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Barcode Value / Token:</label>
                              <input 
                                type="text"
                                className="input input-sm"
                                value={f.barcodeValue}
                                onChange={e => updateField(idx, { barcodeValue: e.target.value })}
                                style={{ width: '100%', fontSize: '11.5px', fontFamily: 'monospace' }}
                                placeholder="e.g. {{item.code}}"
                              />
                              <div style={{ display: 'flex', gap: '10px', marginTop: '6px', alignItems: 'center' }}>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Bar Height:</label>
                                <input 
                                  type="number" 
                                  style={{ width: '50px', fontSize: '11px' }} 
                                  className="input input-xs" 
                                  value={f.barcodeHeight || 20} 
                                  onChange={e => updateField(idx, { barcodeHeight: Number(e.target.value) || 15 })} 
                                />
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={f.showBarcodeText !== false} 
                                    onChange={e => updateField(idx, { showBarcodeText: e.target.checked })} 
                                  /> Show Code Text
                                </label>
                              </div>
                            </div>
                          )}

                          {f.type === 'box_manifest' && (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Automatically renders a multi-line bullet table of packed items in this box.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Variable Dictionary Helper */}
                    <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                        Click to Copy Variables:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                        {VARIABLE_DICTIONARY.map(v => (
                          <span 
                            key={v.token}
                            onClick={() => {
                              navigator.clipboard.writeText(v.token);
                              alert(`Copied ${v.token} to clipboard! Paste it into any text block.`);
                            }}
                            title={`Click to copy: ${v.label} (e.g. ${v.example})`}
                            style={{ 
                              fontSize: '10px', 
                              background: 'var(--bg-secondary)', 
                              border: '1px solid var(--border)', 
                              borderRadius: '3px', 
                              padding: '2px 5px', 
                              fontFamily: 'monospace', 
                              cursor: 'pointer' 
                            }}
                          >
                            {v.token}
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* Visual Thermal Label Preview */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#334155', borderRadius: '10px', padding: '24px', overflow: 'auto' }}>
                <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={13} /> Live Scale Rendering on Argox O4-250 (203 DPI Continuous Roll)
                </div>

                {/* The Physical Thermal Label Container */}
                <div 
                  style={{
                    width: `${activeObj.widthMm * 3.78}px`, // ~3.78px per mm for 96 DPI CSS screen preview
                    minHeight: `${activeObj.heightMm * 3.78}px`,
                    background: '#ffffff',
                    color: '#000000',
                    padding: '8px 10px',
                    borderRadius: '2px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    {(activeObj.fields || []).map((field, fIdx) => {
                      if (field.type === 'text') {
                        // Replace tokens with mockContext
                        let text = field.content || '';
                        Object.entries({
                          '{{item.code}}': mockContext.item.code,
                          '{{item.one_one_code}}': mockContext.item.oneOneCode,
                          '{{item.description}}': mockContext.item.description,
                          '{{item.brand}}': mockContext.item.brand,
                          '{{item.floor}}': mockContext.item.floor,
                          '{{item.area}}': mockContext.item.area,
                          '{{item.type}}': mockContext.item.type,
                          '{{item.boxNumber}}': mockContext.item.boxNumber,
                          '{{project.name}}': mockContext.project.name,
                          '{{project.client}}': mockContext.project.client,
                          '{{project.deliveryAddress}}': mockContext.project.deliveryAddress,
                          '{{project.pm}}': mockContext.project.pm,
                          '{{order.id}}': mockContext.order.id,
                          '{{packing_list.id}}': mockContext.packingList.id,
                          '{{box.number}}': mockContext.box.number,
                          '{{box.total}}': mockContext.box.total,
                          '{{box.items_count}}': mockContext.box.itemsCount,
                          '{{date.today}}': new Date().toLocaleDateString('en-GB')
                        }).forEach(([tok, val]) => {
                          text = text.split(tok).join(val);
                        });

                        return (
                          <div 
                            key={fIdx}
                            style={{
                              fontSize: `${field.fontSize || 8}pt`,
                              fontWeight: field.fontWeight || 600,
                              textAlign: field.align || 'left',
                              marginTop: `${field.marginTop || 0}px`,
                              borderBottom: field.borderBottom ? '1.5px solid #000' : 'none',
                              borderTop: field.borderTop ? '1px solid #000' : 'none',
                              paddingBottom: field.borderBottom ? '2px' : '0',
                              lineHeight: 1.2,
                              overflow: 'hidden',
                              wordBreak: 'break-word'
                            }}
                          >
                            {text}
                          </div>
                        );
                      }

                      if (field.type === 'barcode') {
                        let barVal = field.barcodeValue || '{{item.code}}';
                        barVal = barVal.replace('{{item.code}}', mockContext.item.code)
                                       .replace('{{packing_list.id}}', mockContext.packingList.id)
                                       .replace('{{box.index}}', mockContext.box.index);
                        const svg = generateCode128Svg(barVal, field.barcodeHeight || 20, 1.5, field.showBarcodeText !== false);
                        return (
                          <div 
                            key={fIdx} 
                            style={{ marginTop: `${field.marginTop || 2}px` }}
                            dangerouslySetInnerHTML={{ __html: svg }} 
                          />
                        );
                      }

                      if (field.type === 'box_manifest') {
                        return (
                          <div key={fIdx} style={{ fontSize: '7.5pt', lineHeight: 1.3, marginTop: '2px', border: '1px solid #000', padding: '4px', background: '#fafafa' }}>
                            <div>• <strong>14x</strong> DL-2223/31 (Downlight - Kitchen)</div>
                            <div>• <strong>10x</strong> LA.4205 (5W GU10 Lamp - Kitchen)</div>
                            <div>• <strong>2x</strong> DRV-24V (Power Supply 100W)</div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>

                <div style={{ marginTop: '10px', fontSize: '11px', color: '#cbd5e1' }}>
                  Preview: Actual printer roll width is {activeObj.widthMm}mm by {activeObj.heightMm}mm
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

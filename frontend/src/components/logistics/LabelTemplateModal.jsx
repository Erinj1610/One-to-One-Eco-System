import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, Plus, Trash2, Edit3, Save, RotateCcw, Copy, 
  Tag, Box, Check, Eye, Sliders, ChevronDown,
  ArrowLeftRight, RotateCw, Move, Minus, Square, AlignCenter,
  AlignLeft, AlignRight, Maximize2, Grid, MousePointer, Info,
  ZoomIn, ZoomOut, Bold, Italic, Underline, Image as ImageIcon,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  WrapText, Minimize
} from 'lucide-react';
import { 
  VARIABLE_DICTIONARY, 
  DEFAULT_LABEL_TEMPLATES, 
  generateCode128Svg,
  renderLabelToDataUrl,
  evaluateTokens
} from '../../utils/labelGenerator';
import { API_BASE } from '../../api_config';

const STORAGE_KEY = 'oto_custom_label_templates';

export default function LabelTemplateModal({ isOpen, onClose, templates, onSaveTemplates }) {
  // Load initial templates from: 1) props, 2) localStorage cache, 3) factory defaults
  const [activeTemplates, setActiveTemplates] = useState(() => {
    if (templates && templates.length > 0) return templates;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Error reading localStorage templates:", e);
    }
    return DEFAULT_LABEL_TEMPLATES;
  });

  // Keep activeTemplates updated whenever parent passes loaded templates from Cloud SQL
  useEffect(() => {
    if (templates && templates.length > 0) {
      setActiveTemplates(templates);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      } catch (e) {}
    }
  }, [templates]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(activeTemplates[0]?.id || 'argox_item_50x32');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active selected field index in visual canvas
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(null);

  // Dragging state on visual canvas
  const [draggingFieldIdx, setDraggingFieldIdx] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1.5); // Default 1.5x (150%) for clear precision editing
  const canvasRef = useRef(null);

  // Mock context for preview
  const mockContext = useMemo(() => ({
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
  }), []);

  useEffect(() => {
    const handleGlobalUp = () => setDraggingFieldIdx(null);
    const handleKeyDown = (e) => {
      if (!isEditing || selectedFieldIndex === null) return;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateField(selectedFieldIndex);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeField(selectedFieldIndex);
      }
    };

    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, selectedFieldIndex, editForm]);

  if (!isOpen) return null;

  const currentTemplate = activeTemplates.find(t => t.id === selectedTemplateId) || activeTemplates[0];

  const handleStartEdit = (template) => {
    const clone = JSON.parse(JSON.stringify(template));
    // Ensure margin defaults
    if (!clone.marginMm) {
      clone.marginMm = { top: 1.5, bottom: 1.5, left: 2.0, right: 2.0 };
    }
    setEditForm(clone);
    setIsEditing(true);
    setSelectedFieldIndex(null);
  };

  const handleCreateNew = () => {
    const newId = `custom_label_${Date.now()}`;
    const newTemplate = {
      id: newId,
      name: 'New Argox Custom Label',
      description: 'Custom dimensions with interactive drag-and-drop alignment.',
      widthMm: 50,
      heightMm: 32,
      orientation: 'landscape',
      rotation: 0,
      marginMm: { top: 1.5, bottom: 1.5, left: 2.0, right: 2.0 },
      type: 'item',
      fields: [
        { id: 'f1', type: 'text', content: 'ONE TO ONE • {{project.name}}', fontSize: 7.5, fontWeight: 800, align: 'center', xMm: 2, yMm: 2, wMm: 46 },
        { id: 'f2', type: 'line', thicknessMm: 0.5, lineStyle: 'solid', orientation: 'horizontal', xMm: 2, yMm: 6, wMm: 46 },
        { id: 'f3', type: 'text', content: '{{item.code}}', fontSize: 11, fontWeight: 900, align: 'center', xMm: 2, yMm: 7.5, wMm: 46 },
        { id: 'f4', type: 'barcode', barcodeValue: '{{item.code}}', barcodeHeight: 18, showBarcodeText: true, xMm: 2, yMm: 12.5, wMm: 46 },
        { id: 'f5', type: 'line', thicknessMm: 0.5, lineStyle: 'solid', orientation: 'horizontal', xMm: 2, yMm: 25.5, wMm: 46 },
        { id: 'f6', type: 'text', content: '{{item.floor}} • {{item.area}} ({{item.boxNumber}})', fontSize: 7, fontWeight: 700, align: 'center', xMm: 2, yMm: 27, wMm: 46 }
      ]
    };
    setEditForm(newTemplate);
    setIsEditing(true);
    setSelectedFieldIndex(0);
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
    setSelectedFieldIndex(null);

    // Immediate redundant local save
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to cache templates in localStorage:", e);
    }

    // Direct background cloud sync
    fetch(`${API_BASE}/api/settings/label_templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: updated })
    }).catch(err => console.error('Cloud save label_templates error:', err));

    if (onSaveTemplates) onSaveTemplates(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDelete = (id) => {
    if (DEFAULT_LABEL_TEMPLATES.some(d => d.id === id)) {
      alert("Factory default templates cannot be deleted, but you can customize or duplicate them.");
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
    const wMm = editForm.widthMm || 50;
    const margins = editForm.marginMm || { top: 1.5, bottom: 1.5, left: 2.0, right: 2.0 };
    const defaultWidth = Math.max(10, wMm - (margins.left || 2) - (margins.right || 2));
    const nextY = Math.min((editForm.heightMm || 32) - 8, ((editForm.fields || []).length * 4) + (margins.top || 2));

    const newField = {
      id: `f_${Date.now()}`,
      type,
      xMm: Number(margins.left || 2),
      yMm: Math.round(nextY * 2) / 2,
      wMm: type === 'image' ? 20 : Math.round(defaultWidth * 2) / 2,
      hMm: type === 'line' ? 1 : type === 'box_frame' ? 8 : type === 'image' ? 12 : 6,
      content: type === 'text' ? 'ONE TO ONE • {{project.name}}' : '',
      barcodeValue: type === 'barcode' ? '{{item.code}}' : '',
      barcodeHeight: 18,
      showBarcodeText: true,
      fontSize: 8,
      fontWeight: 700,
      bold: true,
      italic: false,
      underline: false,
      align: 'center',
      vAlign: 'top',
      wrap: false,
      shrinkToFit: false,
      thicknessMm: type === 'line' ? 0.5 : 1,
      lineStyle: 'solid',
      orientation: 'horizontal',
      borderThicknessMm: 1,
      filled: false,
      imageData: ''
    };

    const newFields = [...(editForm.fields || []), newField];
    setEditForm({ ...editForm, fields: newFields });
    setSelectedFieldIndex(newFields.length - 1);
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
    if (selectedFieldIndex === index) {
      setSelectedFieldIndex(null);
    } else if (selectedFieldIndex > index) {
      setSelectedFieldIndex(selectedFieldIndex - 1);
    }
  };

  const duplicateField = (index) => {
    if (!editForm || index === null || !editForm.fields?.[index]) return;
    const source = editForm.fields[index];
    const clone = JSON.parse(JSON.stringify(source));
    clone.id = `f_${Date.now()}`;
    clone.xMm = Math.min((editForm.widthMm || 50) - (clone.wMm || 10), (clone.xMm || 2) + 2);
    clone.yMm = Math.min((editForm.heightMm || 32) - (clone.hMm || 4), (clone.yMm || 2) + 2);

    const newFields = [...(editForm.fields || []), clone];
    setEditForm({ ...editForm, fields: newFields });
    setSelectedFieldIndex(newFields.length - 1);
  };

  // Alignment tools
  const handleAlignSelected = (alignment) => {
    if (!editForm || selectedFieldIndex === null) return;
    const field = editForm.fields[selectedFieldIndex];
    if (!field) return;

    const labelW = editForm.widthMm || 50;
    const labelH = editForm.heightMm || 32;
    const margins = editForm.marginMm || { top: 1.5, bottom: 1.5, left: 2, right: 2 };
    const fieldW = field.wMm || (labelW - margins.left - margins.right);
    const fieldH = field.hMm || 6;

    if (alignment === 'center') {
      const newX = Math.max(0, (labelW - fieldW) / 2);
      updateField(selectedFieldIndex, { xMm: Math.round(newX * 2) / 2, align: 'center' });
    } else if (alignment === 'left') {
      updateField(selectedFieldIndex, { xMm: margins.left || 2, align: 'left' });
    } else if (alignment === 'right') {
      const newX = Math.max(0, labelW - (margins.right || 2) - fieldW);
      updateField(selectedFieldIndex, { xMm: Math.round(newX * 2) / 2, align: 'right' });
    } else if (alignment === 'full_width') {
      const fullW = Math.max(10, labelW - (margins.left || 2) - (margins.right || 2));
      updateField(selectedFieldIndex, { xMm: margins.left || 2, wMm: Math.round(fullW * 2) / 2 });
    } else if (alignment === 'top') {
      updateField(selectedFieldIndex, { yMm: margins.top || 1.5, vAlign: 'top' });
    } else if (alignment === 'middle') {
      const newY = Math.max(0, (labelH - fieldH) / 2);
      updateField(selectedFieldIndex, { yMm: Math.round(newY * 2) / 2, vAlign: 'middle' });
    } else if (alignment === 'bottom') {
      const newY = Math.max(0, labelH - (margins.bottom || 1.5) - fieldH);
      updateField(selectedFieldIndex, { yMm: Math.round(newY * 2) / 2, vAlign: 'bottom' });
    }
  };

  const activeObj = isEditing ? editForm : currentTemplate;

  // Scale multiplier: 1 mm = ~6.5 display pixels at 1.0x scale
  // Multiplied by zoomLevel (e.g. 1.0x to 2.5x) for crystal-clear interactive editing
  const BASE_PIXELS_PER_MM = 6.5;
  const PIXELS_PER_MM = BASE_PIXELS_PER_MM * zoomLevel;
  const canvasWidthPx = Math.round((activeObj.widthMm || 50) * PIXELS_PER_MM);
  const canvasHeightPx = Math.round((activeObj.heightMm || 32) * PIXELS_PER_MM);

  // Mouse drag handlers on visual canvas
  const handleCanvasMouseDown = (e, idx) => {
    if (!isEditing) return;
    e.stopPropagation();
    setSelectedFieldIndex(idx);
    setDraggingFieldIdx(idx);

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const clickMmX = (e.clientX - canvasRect.left) / PIXELS_PER_MM;
    const clickMmY = (e.clientY - canvasRect.top) / PIXELS_PER_MM;

    const field = editForm.fields[idx];
    const curX = field.xMm !== undefined ? field.xMm : (editForm.marginMm?.left || 2);
    const curY = field.yMm !== undefined ? field.yMm : 2;

    setDragOffset({
      x: clickMmX - curX,
      y: clickMmY - curY
    });
  };

  const handleCanvasMouseMove = (e) => {
    if (draggingFieldIdx === null || !canvasRef.current || !isEditing) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseMmX = (e.clientX - canvasRect.left) / PIXELS_PER_MM;
    const mouseMmY = (e.clientY - canvasRect.top) / PIXELS_PER_MM;

    let targetX = mouseMmX - dragOffset.x;
    let targetY = mouseMmY - dragOffset.y;

    // Raster Grid Snapping (0.5mm step)
    if (snapToGrid) {
      targetX = Math.round(targetX * 2) / 2;
      targetY = Math.round(targetY * 2) / 2;
    }

    // Boundary constraints
    const maxW = editForm.widthMm || 50;
    const maxH = editForm.heightMm || 32;
    const field = editForm.fields[draggingFieldIdx];
    const fieldW = field.wMm || 10;
    const fieldH = field.hMm || 4;

    targetX = Math.max(0, Math.min(maxW - fieldW, targetX));
    targetY = Math.max(0, Math.min(maxH - fieldH, targetY));

    // Center auto-snapping guide
    const centerX = (maxW - fieldW) / 2;
    if (Math.abs(targetX - centerX) < 0.8) {
      targetX = Math.round(centerX * 2) / 2;
    }

    updateField(draggingFieldIdx, {
      xMm: targetX,
      yMm: targetY
    });
  };

  const handleCanvasMouseUp = () => {
    setDraggingFieldIdx(null);
  };

  const selectedField = (isEditing && editForm && selectedFieldIndex !== null) 
    ? editForm.fields[selectedFieldIndex] 
    : null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
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
          borderRadius: '14px',
          width: '100%',
          maxWidth: '1240px',
          height: '94vh',
          maxHeight: '920px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Top Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={18} style={{ color: 'var(--text-info)' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Visual Label Template Designer & Vector Studio
              </h3>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--text-info)', fontFamily: 'monospace' }}>
                Argox O4-250 (203 DPI)
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Interactive drag-and-drop label designer with real millimeter grid snapping, divider lines, and outline frames
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saveSuccess && (
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> Saved Successfully
              </span>
            )}
            <button className="btn btn-ghost btn-xs" onClick={handleResetDefaults} title="Reset to standard factory templates" style={{ border: '1px solid var(--border)' }}>
              <RotateCcw size={12} /> Factory Defaults
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body Layout: Sidebar list vs Main Interactive Studio */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Left Column: Template Library (250px) */}
          <div style={{ width: '250px', borderRight: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Templates ({activeTemplates.length})
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
                      setSelectedFieldIndex(null);
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
                      {tmpl.widthMm}mm × {tmpl.heightMm}mm
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); handleDuplicate(tmpl); }} title="Duplicate">
                        <Copy size={11} />
                      </button>
                      <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); handleStartEdit(tmpl); }} title="Edit in Visual Designer">
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

          {/* Center + Right: Visual Studio & Inspector */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Action Bar & Quick Tooling */}
            <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {isEditing ? `Editing: ${editForm.name}` : currentTemplate.name}
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  ({activeObj.widthMm}mm × {activeObj.heightMm}mm)
                </span>
                {isEditing && (
                  <button 
                    onClick={() => setSnapToGrid(!snapToGrid)}
                    className="btn btn-ghost btn-xs"
                    style={{ 
                      border: '1px solid var(--border)',
                      fontSize: '11px',
                      background: snapToGrid ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      color: snapToGrid ? 'var(--text-info)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Toggle 0.5mm raster grid snapping"
                  >
                    <Grid size={12} /> Grid Snap {snapToGrid ? 'ON (0.5mm)' : 'OFF'}
                  </button>
                )}

                {/* ZOOM CONTROLS */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 4px', gap: '2px', marginLeft: '6px' }}>
                  <button 
                    className="btn btn-ghost btn-xs"
                    style={{ padding: '2px 6px', height: '22px' }}
                    onClick={() => setZoomLevel(prev => Math.max(0.75, Math.round((prev - 0.25) * 100) / 100))}
                    title="Zoom Out (-25%)"
                    disabled={zoomLevel <= 0.75}
                  >
                    <ZoomOut size={12} />
                  </button>
                  <button 
                    className="btn btn-ghost btn-xs"
                    style={{ padding: '2px 6px', height: '22px', fontSize: '11px', fontFamily: 'monospace', minWidth: '46px', textAlign: 'center' }}
                    onClick={() => setZoomLevel(1.5)}
                    title="Click to reset zoom to 150%"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <button 
                    className="btn btn-ghost btn-xs"
                    style={{ padding: '2px 6px', height: '22px' }}
                    onClick={() => setZoomLevel(prev => Math.min(3.0, Math.round((prev + 0.25) * 100) / 100))}
                    title="Zoom In (+25%)"
                    disabled={zoomLevel >= 3.0}
                  >
                    <ZoomIn size={12} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {isEditing ? (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setIsEditing(false); setEditForm(null); setSelectedFieldIndex(null); }}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Save size={14} /> Save Template
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => handleStartEdit(currentTemplate)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Edit3 size={14} /> Open Drag-and-Drop Designer
                  </button>
                )}
              </div>
            </div>

            {/* Main Interactive Studio Body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              
              {/* Visual Canvas Stage (Center) */}
              <div 
                style={{ 
                  flex: 1, 
                  background: '#0f172a', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '24px', 
                  overflow: 'auto',
                  position: 'relative',
                  userSelect: 'none'
                }}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              >
                {/* Canvas Status & Helper Bar */}
                <div style={{ marginBottom: '14px', color: '#94a3b8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span>Roll: <strong>{activeObj.widthMm}mm × {activeObj.heightMm}mm</strong></span>
                  <span>Margins: Top <strong>{activeObj.marginMm?.top ?? 1.5}mm</strong>, Left <strong>{activeObj.marginMm?.left ?? 2}mm</strong></span>
                  {isEditing && (
                    <span style={{ color: '#38bdf8' }}>💡 Click any element to drag, reposition, and edit</span>
                  )}
                </div>

                {/* THE PHYSICAL LABEL CANVAS */}
                <div
                  ref={canvasRef}
                  style={{
                    width: `${canvasWidthPx}px`,
                    height: `${canvasHeightPx}px`,
                    background: '#ffffff',
                    position: 'relative',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    // Raster Grid Dots
                    backgroundImage: isEditing && snapToGrid 
                      ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)' 
                      : 'none',
                    backgroundSize: `${PIXELS_PER_MM}px ${PIXELS_PER_MM}px`, // 1mm grid dots
                    cursor: isEditing ? 'default' : 'auto'
                  }}
                  onClick={(e) => {
                    // Only deselect if the user clicked directly on the canvas background, not on any element or boundary
                    if (e.target === e.currentTarget && isEditing) {
                      setSelectedFieldIndex(null);
                    }
                  }}
                >
                  {/* SAFE PRINT MARGIN BOUNDARY (Dotted Blue Line) */}
                  {isEditing && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: `${(activeObj.marginMm?.top ?? 1.5) * PIXELS_PER_MM}px`,
                        bottom: `${(activeObj.marginMm?.bottom ?? 1.5) * PIXELS_PER_MM}px`,
                        left: `${(activeObj.marginMm?.left ?? 2.0) * PIXELS_PER_MM}px`,
                        right: `${(activeObj.marginMm?.right ?? 2.0) * PIXELS_PER_MM}px`,
                        border: '1px dashed rgba(59, 130, 246, 0.45)',
                        pointerEvents: 'none',
                        zIndex: 1
                      }}
                    />
                  )}

                  {/* ELEMENT RENDERING */}
                  {(activeObj.fields || []).map((field, idx) => {
                    const isSelected = isEditing && selectedFieldIndex === idx;
                    const xPx = (field.xMm !== undefined ? field.xMm : (activeObj.marginMm?.left ?? 2)) * PIXELS_PER_MM;
                    const yPx = (field.yMm !== undefined ? field.yMm : (idx * 4 + 2)) * PIXELS_PER_MM;
                    const wPx = (field.wMm !== undefined ? field.wMm : (activeObj.widthMm - 4)) * PIXELS_PER_MM;
                    const hPx = (field.hMm !== undefined ? field.hMm : 6) * PIXELS_PER_MM;

                    return (
                      <div
                        key={field.id || idx}
                        onMouseDown={(e) => handleCanvasMouseDown(e, idx)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditing) setSelectedFieldIndex(idx);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${xPx}px`,
                          top: `${yPx}px`,
                          width: `${wPx}px`,
                          minHeight: field.type === 'line' ? (field.orientation === 'vertical' ? `${Math.round((field.hMm || 10) * PIXELS_PER_MM)}px` : '2px') : `${hPx}px`,
                          height: field.type === 'line' && field.orientation === 'vertical' ? `${Math.round((field.hMm || 10) * PIXELS_PER_MM)}px` : (field.hMm ? `${hPx}px` : 'auto'),
                          border: isSelected 
                            ? '1.5px solid #3b82f6' 
                            : isEditing ? '1px dashed rgba(0,0,0,0.15)' : 'none',
                          background: isSelected ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                          cursor: isEditing ? 'move' : 'default',
                          zIndex: isSelected ? 10 : 2,
                          padding: '1px 2px',
                          boxSizing: 'border-box',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: field.vAlign === 'middle' ? 'center' : field.vAlign === 'bottom' ? 'flex-end' : 'flex-start',
                          overflow: 'hidden'
                        }}
                      >
                        {/* TEXT FIELD */}
                        {field.type === 'text' && (
                          <div
                            style={{
                              fontSize: `${(field.fontSize || 8) * 1.3}px`,
                              fontWeight: field.fontWeight || (field.bold ? 700 : 600),
                              fontStyle: field.italic ? 'italic' : 'normal',
                              textDecoration: field.underline ? 'underline' : 'none',
                              textAlign: field.align || 'center',
                              color: '#000',
                              lineHeight: 1.15,
                              whiteSpace: field.wrap ? 'normal' : 'nowrap',
                              wordBreak: field.wrap ? 'break-word' : 'normal',
                              overflow: 'hidden',
                              textOverflow: field.wrap ? 'clip' : 'ellipsis',
                              fontFamily: 'Arial, Helvetica, sans-serif',
                              width: '100%'
                            }}
                          >
                            {evaluateTokens(field.content, mockContext) || 'Text'}
                          </div>
                        )}

                        {/* VECTOR DIVIDER LINE */}
                        {field.type === 'line' && (
                          <div 
                            style={{
                              width: field.orientation === 'vertical' ? `${Math.max(1, (field.thicknessMm || 0.5) * 1.5)}px` : '100%',
                              height: field.orientation === 'vertical' ? '100%' : `${Math.max(1, (field.thicknessMm || 0.5) * 1.5)}px`,
                              background: field.lineStyle === 'dashed' || field.lineStyle === 'dotted' ? 'transparent' : '#000',
                              borderTop: (field.orientation !== 'vertical' && field.lineStyle !== 'solid') ? `${(field.thicknessMm || 0.5) * 1.5}px ${field.lineStyle} #000` : 'none',
                              borderLeft: (field.orientation === 'vertical' && field.lineStyle !== 'solid') ? `${(field.thicknessMm || 0.5) * 1.5}px ${field.lineStyle} #000` : 'none',
                              margin: field.orientation === 'vertical' ? '0 auto' : '2px 0'
                            }}
                          />
                        )}

                        {/* OUTLINE BOX / FRAME */}
                        {field.type === 'box_frame' && (
                          <div 
                            style={{
                              width: '100%',
                              height: '100%',
                              minHeight: `${hPx}px`,
                              border: `${field.borderThicknessMm || 1}px solid #000`,
                              background: field.filled ? '#000' : 'transparent',
                              borderRadius: '1px'
                            }}
                          />
                        )}

                        {/* IMAGE / LOGO */}
                        {field.type === 'image' && (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {field.imageData ? (
                              <img 
                                src={field.imageData} 
                                alt="Label Logo" 
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'contrast(150%) grayscale(100%)' }} 
                              />
                            ) : (
                              <div style={{ fontSize: '9px', color: '#64748b', border: '1px dashed #cbd5e1', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                No Image Selected
                              </div>
                            )}
                          </div>
                        )}

                        {/* CODE 128 BARCODE */}
                        {field.type === 'barcode' && (
                          <div style={{ textAlign: 'center', width: '100%' }}>
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: generateCode128Svg(evaluateTokens(field.barcodeValue || '{{item.code}}', mockContext), (field.barcodeHeight || 18) * 1.1, 1.2, field.showBarcodeText !== false) 
                              }} 
                            />
                          </div>
                        )}

                        {/* BOX MANIFEST TABLE */}
                        {field.type === 'box_manifest' && (
                          <div style={{ fontSize: '8px', border: '1px solid #000', padding: '3px', background: '#fafafa', lineHeight: 1.2 }}>
                            <div><strong>14x</strong> DL-2223/31 (Downlight)</div>
                            <div><strong>10x</strong> LA.4205 (5W Lamp)</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '16px', color: '#64748b', fontSize: '11px', textAlign: 'center' }}>
                  Scale: 1mm = 6.5px • Argox O4-250 Continuous 203 DPI Thermal Feed
                </div>
              </div>

              {/* Element Library & Properties Inspector (Right - 360px) */}
              {isEditing && editForm && (
                <div style={{ width: '360px', borderLeft: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                  
                  {/* Tool Palette: Add Elements */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Add Elements to Label
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => addField('text')} style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        <Plus size={11} /> Text Block
                      </button>
                      <button className="btn btn-ghost btn-xs" onClick={() => addField('line')} style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        <Minus size={11} /> Divider Line
                      </button>
                      <button className="btn btn-ghost btn-xs" onClick={() => addField('box_frame')} style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        <Square size={11} /> Outline Box
                      </button>
                      <button className="btn btn-ghost btn-xs" onClick={() => addField('barcode')} style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        <Tag size={11} /> Barcode
                      </button>
                      <button className="btn btn-ghost btn-xs" onClick={() => addField('image')} style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', gridColumn: 'span 2' }}>
                        <ImageIcon size={11} /> Custom Logo / Image
                      </button>
                    </div>
                  </div>

                  {/* Alignment Toolbar (When element selected) */}
                  {selectedField && (
                    <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.05)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-info)' }}>
                          H-Align:
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-ghost btn-xs" onClick={() => handleAlignSelected('left')} title="Align Left (Safe Margin)">
                            <AlignLeft size={13} />
                          </button>
                          <button className="btn btn-ghost btn-xs" onClick={() => handleAlignSelected('center')} title="Align Center">
                            <AlignCenter size={13} />
                          </button>
                          <button className="btn btn-ghost btn-xs" onClick={() => handleAlignSelected('right')} title="Align Right (Safe Margin)">
                            <AlignRight size={13} />
                          </button>
                          <button className="btn btn-ghost btn-xs" onClick={() => handleAlignSelected('full_width')} title="Stretch Full Printable Width">
                            <Maximize2 size={13} /> Full Width
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-info)' }}>
                          V-Align:
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-ghost btn-xs" onClick={() => handleAlignSelected('top')} title="Align to Top Margin">
                            <AlignVerticalJustifyStart size={13} /> Top
                          </button>
                          <button className="btn btn-ghost btn-xs" onClick={() => handleAlignSelected('middle')} title="Center Vertically">
                            <AlignVerticalJustifyCenter size={13} /> Middle
                          </button>
                          <button className="btn btn-ghost btn-xs" onClick={() => handleAlignSelected('bottom')} title="Align to Bottom Margin">
                            <AlignVerticalJustifyEnd size={13} /> Bottom
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Properties Inspector */}
                  <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                    {selectedField ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                            #{selectedFieldIndex + 1} {selectedField.type} Settings
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-ghost btn-xs" style={{ border: '1px solid var(--border)' }} onClick={() => duplicateField(selectedFieldIndex)} title="Duplicate Element (Ctrl+D)">
                              <Copy size={11} /> Clone
                            </button>
                            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--text-danger)', border: '1px solid var(--border)' }} onClick={() => removeField(selectedFieldIndex)}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Coordinates (mm) */}
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Position & Size (Millimeters)
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>X Pos (mm)</label>
                              <input 
                                type="number" 
                                step="0.5" 
                                className="input input-xs" 
                                value={selectedField.xMm ?? 2} 
                                onChange={e => updateField(selectedFieldIndex, { xMm: Number(e.target.value) || 0 })}
                                style={{ width: '100%', fontSize: '11px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Y Pos (mm)</label>
                              <input 
                                type="number" 
                                step="0.5" 
                                className="input input-xs" 
                                value={selectedField.yMm ?? 2} 
                                onChange={e => updateField(selectedFieldIndex, { yMm: Number(e.target.value) || 0 })}
                                style={{ width: '100%', fontSize: '11px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Width (mm)</label>
                              <input 
                                type="number" 
                                step="0.5" 
                                className="input input-xs" 
                                value={selectedField.wMm ?? 46} 
                                onChange={e => updateField(selectedFieldIndex, { wMm: Number(e.target.value) || 10 })}
                                style={{ width: '100%', fontSize: '11px' }}
                              />
                            </div>
                            {selectedField.type !== 'line' && (
                              <div>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Height (mm)</label>
                                <input 
                                  type="number" 
                                  step="0.5" 
                                  className="input input-xs" 
                                  value={selectedField.hMm ?? 6} 
                                  onChange={e => updateField(selectedFieldIndex, { hMm: Number(e.target.value) || 4 })}
                                  style={{ width: '100%', fontSize: '11px' }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* TEXT SPECIFIC PROPERTIES */}
                        {selectedField.type === 'text' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Text / Variable Token:</label>
                              <textarea
                                className="input input-sm"
                                rows={2}
                                value={selectedField.content || ''}
                                onChange={e => updateField(selectedFieldIndex, { content: e.target.value })}
                                style={{ width: '100%', fontSize: '11px', fontFamily: 'monospace', marginTop: '4px' }}
                              />
                            </div>
                            {/* Typography Style Toolbar (B, I, U) */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>Format:</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  style={{
                                    border: '1px solid var(--border)',
                                    fontWeight: 'bold',
                                    background: (selectedField.bold || selectedField.fontWeight >= 700) ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                    color: (selectedField.bold || selectedField.fontWeight >= 700) ? 'var(--text-info)' : 'var(--text-primary)',
                                    width: '26px',
                                    height: '24px',
                                    padding: 0
                                  }}
                                  onClick={() => {
                                    const nextBold = !(selectedField.bold || selectedField.fontWeight >= 700);
                                    updateField(selectedFieldIndex, { bold: nextBold, fontWeight: nextBold ? 800 : 400 });
                                  }}
                                  title="Bold"
                                >
                                  <Bold size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  style={{
                                    border: '1px solid var(--border)',
                                    fontStyle: 'italic',
                                    background: selectedField.italic ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                    color: selectedField.italic ? 'var(--text-info)' : 'var(--text-primary)',
                                    width: '26px',
                                    height: '24px',
                                    padding: 0
                                  }}
                                  onClick={() => updateField(selectedFieldIndex, { italic: !selectedField.italic })}
                                  title="Italic"
                                >
                                  <Italic size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  style={{
                                    border: '1px solid var(--border)',
                                    textDecoration: 'underline',
                                    background: selectedField.underline ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                    color: selectedField.underline ? 'var(--text-info)' : 'var(--text-primary)',
                                    width: '26px',
                                    height: '24px',
                                    padding: 0
                                  }}
                                  onClick={() => updateField(selectedFieldIndex, { underline: !selectedField.underline })}
                                  title="Underline"
                                >
                                  <Underline size={12} />
                                </button>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Font Size (pt):</label>
                                <input 
                                  type="number" 
                                  step="0.5" 
                                  className="input input-xs" 
                                  value={selectedField.fontSize || 8} 
                                  onChange={e => updateField(selectedFieldIndex, { fontSize: Number(e.target.value) || 7 })}
                                  style={{ width: '100%', fontSize: '11px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>H-Align:</label>
                                <select 
                                  className="select select-xs" 
                                  value={selectedField.align || 'center'} 
                                  onChange={e => updateField(selectedFieldIndex, { align: e.target.value })}
                                  style={{ width: '100%', fontSize: '11px' }}
                                >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                  <option value="right">Right</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>V-Align:</label>
                                <select 
                                  className="select select-xs" 
                                  value={selectedField.vAlign || 'top'} 
                                  onChange={e => updateField(selectedFieldIndex, { vAlign: e.target.value })}
                                  style={{ width: '100%', fontSize: '11px' }}
                                >
                                  <option value="top">Top</option>
                                  <option value="middle">Middle (Center)</option>
                                  <option value="bottom">Bottom</option>
                                </select>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'flex-end' }}>
                                <label style={{ fontSize: '10.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!selectedField.wrap} 
                                    onChange={e => updateField(selectedFieldIndex, { wrap: e.target.checked })}
                                  /> Multi-line Wrap
                                </label>
                                <label style={{ fontSize: '10.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!selectedField.shrinkToFit} 
                                    onChange={e => updateField(selectedFieldIndex, { shrinkToFit: e.target.checked })}
                                  /> Auto Shrink to Fit
                                </label>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* LINE SPECIFIC PROPERTIES */}
                        {selectedField.type === 'line' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Orientation:</label>
                                <select 
                                  className="select select-xs" 
                                  value={selectedField.orientation || 'horizontal'} 
                                  onChange={e => updateField(selectedFieldIndex, { orientation: e.target.value })}
                                  style={{ width: '100%', fontSize: '11px' }}
                                >
                                  <option value="horizontal">Horizontal (Divider)</option>
                                  <option value="vertical">Vertical (Column)</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Thickness (mm):</label>
                                <input 
                                  type="number" 
                                  step="0.25" 
                                  className="input input-xs" 
                                  value={selectedField.thicknessMm || 0.5} 
                                  onChange={e => updateField(selectedFieldIndex, { thicknessMm: Number(e.target.value) || 0.5 })}
                                  style={{ width: '100%', fontSize: '11px' }}
                                />
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Line Style:</label>
                              <select 
                                className="select select-xs" 
                                value={selectedField.lineStyle || 'solid'} 
                                onChange={e => updateField(selectedFieldIndex, { lineStyle: e.target.value })}
                                style={{ width: '100%', fontSize: '11px' }}
                              >
                                <option value="solid">Solid Line</option>
                                <option value="dashed">Dashed Line</option>
                                <option value="dotted">Dotted Line</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {/* BOX SPECIFIC PROPERTIES */}
                        {selectedField.type === 'box_frame' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Border Thickness:</label>
                                <input 
                                  type="number" 
                                  step="0.5" 
                                  className="input input-xs" 
                                  value={selectedField.borderThicknessMm || 1} 
                                  onChange={e => updateField(selectedFieldIndex, { borderThicknessMm: Number(e.target.value) || 1 })}
                                  style={{ width: '100%', fontSize: '11px' }}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!selectedField.filled} 
                                    onChange={e => updateField(selectedFieldIndex, { filled: e.target.checked })}
                                  /> Solid Black Fill
                                </label>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* IMAGE / LOGO SPECIFIC PROPERTIES */}
                        {selectedField.type === 'image' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                Upload Logo / Image:
                              </label>
                              <input 
                                type="file" 
                                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                className="input input-xs"
                                style={{ width: '100%', fontSize: '11px', padding: '4px' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (uploadEvt) => {
                                    updateField(selectedFieldIndex, { imageData: uploadEvt.target.result });
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </div>
                            {selectedField.imageData && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Image Loaded</span>
                                <button 
                                  className="btn btn-ghost btn-xs" 
                                  style={{ color: 'var(--text-danger)', fontSize: '10px', height: '20px' }}
                                  onClick={() => updateField(selectedFieldIndex, { imageData: '' })}
                                >
                                  Clear Image
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* BARCODE SPECIFIC PROPERTIES */}
                        {selectedField.type === 'barcode' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Barcode Value / Token:</label>
                              <input 
                                type="text"
                                className="input input-sm"
                                value={selectedField.barcodeValue || ''}
                                onChange={e => updateField(selectedFieldIndex, { barcodeValue: e.target.value })}
                                style={{ width: '100%', fontSize: '11px', fontFamily: 'monospace', marginTop: '4px' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Show Code Text:</label>
                              <input 
                                type="checkbox" 
                                checked={selectedField.showBarcodeText !== false} 
                                onChange={e => updateField(selectedFieldIndex, { showBarcodeText: e.target.checked })}
                              />
                            </div>
                          </div>
                        )}

                      </div>
                    ) : (
                      /* Global Label & Margin Configuration (When no element selected) */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            📐 Label Roll Geometry
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Width (mm)</label>
                              <input 
                                type="number" 
                                className="input input-xs" 
                                value={editForm.widthMm} 
                                onChange={e => setEditForm({ ...editForm, widthMm: Number(e.target.value) || 10 })}
                                style={{ width: '100%', fontSize: '11px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pitch / Height (mm)</label>
                              <input 
                                type="number" 
                                className="input input-xs" 
                                value={editForm.heightMm} 
                                onChange={e => setEditForm({ ...editForm, heightMm: Number(e.target.value) || 10 })}
                                style={{ width: '100%', fontSize: '11px' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Millimeter Margins & Spacers */}
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Safe Margins (mm)
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Top (mm)</label>
                              <input 
                                type="number" 
                                step="0.5" 
                                className="input input-xs" 
                                value={editForm.marginMm?.top ?? 1.5} 
                                onChange={e => setEditForm({ 
                                  ...editForm, 
                                  marginMm: { ...editForm.marginMm, top: Number(e.target.value) || 0 } 
                                })}
                                style={{ width: '100%', fontSize: '11px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Bottom (mm)</label>
                              <input 
                                type="number" 
                                step="0.5" 
                                className="input input-xs" 
                                value={editForm.marginMm?.bottom ?? 1.5} 
                                onChange={e => setEditForm({ 
                                  ...editForm, 
                                  marginMm: { ...editForm.marginMm, bottom: Number(e.target.value) || 0 } 
                                })}
                                style={{ width: '100%', fontSize: '11px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Left (mm)</label>
                              <input 
                                type="number" 
                                step="0.5" 
                                className="input input-xs" 
                                value={editForm.marginMm?.left ?? 2.0} 
                                onChange={e => setEditForm({ 
                                  ...editForm, 
                                  marginMm: { ...editForm.marginMm, left: Number(e.target.value) || 0 } 
                                })}
                                style={{ width: '100%', fontSize: '11px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Right (mm)</label>
                              <input 
                                type="number" 
                                step="0.5" 
                                className="input input-xs" 
                                value={editForm.marginMm?.right ?? 2.0} 
                                onChange={e => setEditForm({ 
                                  ...editForm, 
                                  marginMm: { ...editForm.marginMm, right: Number(e.target.value) || 0 } 
                                })}
                                style={{ width: '100%', fontSize: '11px' }}
                              />
                            </div>
                          </div>
                        </div>

                        <div style={{ color: '#64748b', fontSize: '11px', lineHeight: 1.4, background: 'rgba(59, 130, 246, 0.05)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                          <strong>💡 Roll Note:</strong> Set <em>Width</em> and <em>Pitch</em> to your physical roll size (e.g. 50mm × 32mm). Safe margins are internal padding guides for element alignment and do <u>not</u> add extra millimeters to the physical paper size.
                        </div>
                      </div>
                    )}

                    {/* Variable Dictionary Helper */}
                    <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                        Click to Copy Variables:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '110px', overflowY: 'auto' }}>
                        {VARIABLE_DICTIONARY.map(v => (
                          <span 
                            key={v.token}
                            onClick={() => {
                              navigator.clipboard.writeText(v.token);
                              alert(`Copied ${v.token} to clipboard!`);
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

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

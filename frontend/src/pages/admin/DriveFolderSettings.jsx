import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../../api_config';
import { 
  Folder, Plus, Trash2, Edit3, Check, RefreshCw, 
  Layers, Sparkles, Save, X, Tag, FileText, ChevronRight, Compass, ShoppingBag, PlusCircle, CheckCircle2
} from 'lucide-react';

// Standard operational manual upload / attachment categories
const STANDARD_OPERATIONAL_UPLOADS = [
  // Design Scope
  { key: 'CAD', label: 'CAD Layouts & Technical Files (.dwg, .dxf)', scope: 'design', defaultFolder: '01 - Drawings & CAD' },
  { key: 'DRAWINGS', label: 'Architectural Plans & Elevation Drawings', scope: 'design', defaultFolder: '01 - Drawings & CAD' },
  { key: 'MOODBOARD', label: 'Concept Boards & Renderings', scope: 'design', defaultFolder: '05 - Moodboards & Presentations' },
  { key: 'SITE_PHOTO', label: 'Site Progress Photos & Snag Lists', scope: 'design', defaultFolder: '03 - Site Photos & Snags' },
  
  // Order Scope
  { key: 'PO', label: 'Manual PO Attachments & Allocations', scope: 'order', defaultFolder: '02 - Supplier POs & Confirmations' },
  { key: 'GRN', label: 'Goods Received Notes (GRN) & Delivery Slips', scope: 'order', defaultFolder: '03 - Logistics & Work Orders' },
  { key: 'LOGISTICS', label: 'Waybills, Couriers & Packing Lists', scope: 'order', defaultFolder: '03 - Logistics & Work Orders' },
  { key: 'WORK_ORDER', label: 'Cutting Lists, Production & Work Orders', scope: 'order', defaultFolder: '03 - Logistics & Work Orders' },
  { key: 'DEFAULT', label: 'General / Unclassified Documents', scope: 'order', defaultFolder: 'Documents' }
];

// Human-friendly labels for recognized system template keys
const TEMPLATE_LABEL_MAP = {
  'QUOTATION': 'Client Quotation',
  'QUOTE': 'Client Quotation',
  'BOQ': 'Bill of Quantities (BOQ)',
  'SUMMARY': 'Summary / Executive Costing',
  'PURCHASE_ORDER': 'Supplier Purchase Order (PO)',
  'TAX_INVOICE': 'Tax Invoice',
  'DEPOSIT_INVOICE': 'Deposit Invoice',
  'BALANCE_INVOICE': 'Balance Invoice',
  'PRO_FORMA_INVOICE': 'Pro Forma Invoice',
  'INVOICE': 'Invoice / Proof of Payment',
  'SCHEDULE': 'Lighting Specification Schedule',
  'DESIGN_FEE_PROPOSAL': 'Design Fee Proposal',
  'DESIGN_PROPOSAL': 'Design Concept Proposal',
  'DESIGN_SPECIFICATION': 'Design Specification Document'
};

export default function DriveFolderSettings() {
  const [activeScope, setActiveScope] = useState('order'); // 'order' | 'design'
  const [config, setConfig] = useState({
    order_folder_pattern: '[ORDER_NUMBER] - [ORDER_NAME]',
    design_folder_pattern: '[FEE_REF] - [DESIGN_NAME]',
    design_subfolders: [
      { name: '01 - Drawings & CAD', sort: 1, key: '01 - Drawings & CAD' },
      { name: '02 - Project Specifications', sort: 2, key: '02 - Project Specifications' },
      { name: '03 - Site Photos & Snags', sort: 3, key: '03 - Site Photos & Snags' },
      { name: '04 - Proposals & Contracts', sort: 4, key: '04 - Proposals & Contracts' },
      { name: '05 - Moodboards & Presentations', sort: 5, key: '05 - Moodboards & Presentations' }
    ],
    order_subfolders: [
      { name: '01 - Quotations & BOQs', sort: 1, key: '01 - Quotations & BOQs' },
      { name: '02 - Supplier POs & Confirmations', sort: 2, key: '02 - Supplier POs & Confirmations' },
      { name: '03 - Logistics & Work Orders', sort: 3, key: '03 - Logistics & Work Orders' },
      { name: '04 - Invoices & Proof of Payment', sort: 4, key: '04 - Invoices & Proof of Payment' },
      { name: 'Documents', sort: 5, key: 'Documents' }
    ],
    routing_matrix: {},
    custom_doc_categories: []
  });

  const [dbTemplates, setDbTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Editing & adding folders
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);

  // Routing Modal state
  const [routingFolder, setRoutingFolder] = useState(null);

  // Custom Category Creator
  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [newDocLabel, setNewDocLabel] = useState('');

  // Consolidation state
  const [consolidating, setConsolidating] = useState(false);
  const [consolidateMsg, setConsolidateMsg] = useState(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/drive-folder-config`);
      if (res.ok) {
        const data = await res.json();
        setConfig({
          order_folder_pattern: data.order_folder_pattern || '[ORDER_NUMBER] - [ORDER_NAME]',
          design_folder_pattern: data.design_folder_pattern || '[FEE_REF] - [DESIGN_NAME]',
          design_subfolders: (data.design_subfolders && data.design_subfolders.length > 0) ? data.design_subfolders : [
            { name: '01 - Drawings & CAD', sort: 1, key: '01 - Drawings & CAD' },
            { name: '02 - Project Specifications', sort: 2, key: '02 - Project Specifications' },
            { name: '03 - Site Photos & Snags', sort: 3, key: '03 - Site Photos & Snags' },
            { name: '04 - Proposals & Contracts', sort: 4, key: '04 - Proposals & Contracts' },
            { name: '05 - Moodboards & Presentations', sort: 5, key: '05 - Moodboards & Presentations' }
          ],
          order_subfolders: (data.order_subfolders && data.order_subfolders.length > 0) ? data.order_subfolders : [
            { name: '01 - Quotations & BOQs', sort: 1, key: '01 - Quotations & BOQs' },
            { name: '02 - Supplier POs & Confirmations', sort: 2, key: '02 - Supplier POs & Confirmations' },
            { name: '03 - Logistics & Work Orders', sort: 3, key: '03 - Logistics & Work Orders' },
            { name: '04 - Invoices & Proof of Payment', sort: 4, key: '04 - Invoices & Proof of Payment' },
            { name: 'Documents', sort: 5, key: 'Documents' }
          ],
          routing_matrix: data.routing_matrix || {},
          custom_doc_categories: data.custom_doc_categories || []
        });
      }
    } catch (err) {
      console.error('Error fetching drive config:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/templates/`);
      if (res.ok) {
        const data = await res.json();
        setDbTemplates(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchTemplates();
  }, []);

  const currentSubfolders = activeScope === 'order' ? config.order_subfolders : config.design_subfolders;
  const listKey = activeScope === 'order' ? 'order_subfolders' : 'design_subfolders';

  // Build the master list of all available document/upload categories across scopes
  const allAvailableDocCategories = useMemo(() => {
    const list = [];
    const seenKeys = new Set();

    // 1. Add database templates
    dbTemplates.forEach(tpl => {
      const k = (tpl.template_key || tpl.name || '').toUpperCase();
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        const isDesign = k.includes('DESIGN') || k.includes('DRAWING') || k.includes('SPECIFICATION') || k.includes('CAD');
        list.push({
          key: k,
          label: TEMPLATE_LABEL_MAP[k] || tpl.name || k,
          scope: isDesign ? 'design' : 'order',
          defaultFolder: isDesign ? '04 - Proposals & Contracts' : (k.includes('INVOICE') ? '04 - Invoices & Proof of Payment' : (k.includes('PO') ? '02 - Supplier POs & Confirmations' : '01 - Quotations & BOQs')),
          is_template: true
        });
      }
    });

    // 2. Add standard operational manual uploads
    STANDARD_OPERATIONAL_UPLOADS.forEach(doc => {
      const k = doc.key.toUpperCase();
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        list.push({
          ...doc,
          is_manual: true
        });
      }
    });

    // 3. Add user custom categories
    (config.custom_doc_categories || []).forEach(c => {
      const k = c.key.toUpperCase();
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        list.push({
          key: c.key,
          label: c.label,
          scope: c.scope,
          defaultFolder: c.defaultFolder || (c.scope === 'design' ? '04 - Proposals & Contracts' : 'Documents'),
          is_custom: true
        });
      }
    });

    return list;
  }, [dbTemplates, config.custom_doc_categories]);

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${API_BASE}/admin/drive-folder-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        if (window.otoToast) {
          window.otoToast('Drive Folder Hierarchy & Routing saved successfully!', 'success');
        } else {
          setSaveMsg('Configuration saved successfully!');
          setTimeout(() => setSaveMsg(''), 4000);
        }
      } else {
        const err = await res.json();
        const msg = `Failed to save: ${err.detail || 'Unknown error'}`;
        if (window.otoToast) {
          window.otoToast(msg, 'error');
        } else {
          setSaveMsg(msg);
        }
      }
    } catch (err) {
      const msg = `Error: ${err.message}`;
      if (window.otoToast) {
        window.otoToast(msg, 'error');
      } else {
        setSaveMsg(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    if (currentSubfolders.some(sf => sf.name.toLowerCase() === name.toLowerCase())) {
      if (window.otoToast) {
        window.otoToast('A folder with this name already exists.', 'error');
      } else {
        alert('A folder with this name already exists.');
      }
      return;
    }
    const newSf = { name, sort: currentSubfolders.length + 1, key: name };
    setConfig(prev => ({
      ...prev,
      [listKey]: [...currentSubfolders, newSf]
    }));
    setNewFolderName('');
    setShowAddRow(false);
    if (window.otoToast) {
      window.otoToast(`Folder "${name}" added to list. Click Save Configuration to persist.`, 'info');
    }
  };

  const handleDeleteFolder = async (idx) => {
    const target = currentSubfolders[idx];
    if (!target) return;
    if (currentSubfolders.length <= 1) {
      if (window.otoToast) {
        window.otoToast('At least one folder is required.', 'error');
      } else {
        alert('At least one folder is required.');
      }
      return;
    }
    if (window.otoConfirm) {
      const confirmed = await window.otoConfirm(`Delete folder "${target.name}"? Any mapped routing will revert to unclassified.`, { title: 'Delete Drive Folder', isDanger: true });
      if (!confirmed) return;
    } else if (!confirm(`Delete folder "${target.name}"?`)) {
      return;
    }

    const updated = currentSubfolders.filter((_, i) => i !== idx).map((sf, i) => ({ ...sf, sort: i + 1 }));
    const updatedMatrix = { ...config.routing_matrix };
    Object.keys(updatedMatrix).forEach(key => {
      if (updatedMatrix[key] === target.name) delete updatedMatrix[key];
    });

    setConfig(prev => ({
      ...prev,
      [listKey]: updated,
      routing_matrix: updatedMatrix
    }));
  };

  const handleRenameFolder = (idx) => {
    if (!editingText.trim()) {
      setEditingIndex(null);
      return;
    }
    const oldName = currentSubfolders[idx]?.name;
    const newName = editingText.trim();
    if (oldName === newName) {
      setEditingIndex(null);
      return;
    }

    const updated = currentSubfolders.map((sf, i) => i === idx ? { ...sf, name: newName, key: newName } : sf);
    const updatedMatrix = { ...config.routing_matrix };
    Object.keys(updatedMatrix).forEach(key => {
      if (updatedMatrix[key] === oldName) updatedMatrix[key] = newName;
    });

    setConfig(prev => ({
      ...prev,
      [listKey]: updated,
      routing_matrix: updatedMatrix
    }));
    setEditingIndex(null);
  };

  const toggleDocAssignment = (docKey, folderName) => {
    const currentMapped = config.routing_matrix[docKey];
    const defaultDoc = allAvailableDocCategories.find(c => c.key === docKey);
    const currentEffective = currentMapped || defaultDoc?.defaultFolder;

    const newMatrix = { ...config.routing_matrix };
    if (currentEffective === folderName) {
      newMatrix[docKey] = activeScope === 'design' ? '04 - Proposals & Contracts' : 'Documents';
    } else {
      newMatrix[docKey] = folderName;
    }

    setConfig(prev => ({
      ...prev,
      routing_matrix: newMatrix
    }));
  };

  const handleCreateCustomDocCategory = () => {
    if (!newDocLabel.trim() || !routingFolder) return;
    const label = newDocLabel.trim();
    const key = `CUSTOM_${label.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now()}`;

    const newCat = {
      key,
      label,
      scope: activeScope,
      defaultFolder: routingFolder
    };

    setConfig(prev => ({
      ...prev,
      custom_doc_categories: [...(prev.custom_doc_categories || []), newCat],
      routing_matrix: {
        ...(prev.routing_matrix || {}),
        [key]: routingFolder
      }
    }));

    setNewDocLabel('');
    setShowAddDocForm(false);
  };

  const handleDeleteCustomDocCategory = (catKey) => {
    setConfig(prev => {
      const updatedCats = (prev.custom_doc_categories || []).filter(c => c.key !== catKey);
      const updatedMatrix = { ...(prev.routing_matrix || {}) };
      delete updatedMatrix[catKey];
      return {
        ...prev,
        custom_doc_categories: updatedCats,
        routing_matrix: updatedMatrix
      };
    });
  };

  const handleConsolidateDuplicates = async () => {
    if (window.otoConfirm) {
      const confirmed = await window.otoConfirm(
        'Scan Google Drive for duplicate folders created by past exports and consolidate all files into canonical directories? This action touches real drive directories.',
        { title: 'Consolidate Duplicate Folders', isDanger: false, confirmText: 'Start Scan & Merge' }
      );
      if (!confirmed) return;
    } else if (!confirm('Scan Google Drive for duplicate order folders and consolidate files?')) {
      return;
    }

    setConsolidating(true);
    setConsolidateMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/drive-folder-config/consolidate-duplicates`, {
        method: 'POST'
      });
      const data = await res.json();
      setConsolidateMsg(data);
      if (data.status === 'success') {
        if (window.otoToast) {
          window.otoToast(`Consolidation complete: Merged ${data.merged_orders_count || 0} folders, ${data.files_moved || 0} files moved.`, 'success');
        }
      } else {
        if (window.otoToast) {
          window.otoToast(`Consolidation error: ${data.error || data.message}`, 'error');
        }
      }
    } catch (err) {
      const errObj = { status: 'error', message: err.message };
      setConsolidateMsg(errObj);
      if (window.otoToast) {
        window.otoToast(`Consolidation error: ${err.message}`, 'error');
      }
    } finally {
      setConsolidating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
        <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#0f172a' }} />
        Loading Drive Folder Configuration...
      </div>
    );
  }

  const assignedCountForCurrentScope = allAvailableDocCategories.filter(c => c.scope === activeScope).length;

  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '18px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
              Workflow & Operations
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Google Drive Hierarchy & Document Routing
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Master directory routing rules for generated quotations, purchase orders, technical schedules, and manual client attachments.
          </p>
        </div>

        <button 
          type="button"
          onClick={handleSaveConfig}
          disabled={saving}
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '9px 20px', 
            fontSize: '13px', 
            fontWeight: 600,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '7px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <Check size={16} /> {saving ? 'Saving Changes...' : 'Save Configuration'}
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>Canonical Subfolders</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>{currentSubfolders.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Active in {activeScope === 'order' ? 'Orders' : 'Designs'} scope</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>Routed Categories</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>
            {assignedCountForCurrentScope}
          </div>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>● Templates, attachments & specs</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>Active Overrides</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>
            {Object.keys(config.routing_matrix || {}).length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Custom routing path rules</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>Custom Document Types</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>
            {(config.custom_doc_categories || []).length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>User-defined categories</div>
        </div>
      </div>

      {/* Scope Segmented Control & Breadcrumb Preview */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => { setActiveScope('order'); setShowAddRow(false); setEditingIndex(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: activeScope === 'order' ? '#ffffff' : 'transparent',
              color: activeScope === 'order' ? '#0f172a' : '#64748b',
              boxShadow: activeScope === 'order' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ShoppingBag size={14} /> Orders Folder Hierarchy
          </button>
          <button
            type="button"
            onClick={() => { setActiveScope('design'); setShowAddRow(false); setEditingIndex(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: activeScope === 'design' ? '#ffffff' : 'transparent',
              color: activeScope === 'design' ? '#0f172a' : '#64748b',
              boxShadow: activeScope === 'design' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Compass size={14} /> Designs Folder Hierarchy
          </button>
        </div>

        {/* Directory Breadcrumb Preview */}
        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <span>01 - PROJECTS</span>
          <ChevronRight size={12} />
          <span>[Project Name]</span>
          <ChevronRight size={12} />
          <span style={{ fontWeight: 600, color: '#0f172a' }}>
            {activeScope === 'order' ? 'Orders / [ORDER_NUMBER] - [ORDER_NAME]' : 'Designs / [FEE_REF] - [DESIGN_NAME]'}
          </span>
        </div>
      </div>

      {/* Main Subfolder & Document Routing Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#64748b" /> {activeScope === 'order' ? 'Order Subfolders & Document Routing' : 'Design Subfolders & Document Routing'}
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Documents and uploads tagged in each row will be automatically filed into that Google Drive subfolder upon creation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddRow(true); setNewFolderName(''); }}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 12px', 
              fontSize: '12px', 
              fontWeight: 500,
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <Plus size={13} /> Add Subfolder
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ width: '60px', padding: '14px 20px', fontWeight: 600, textAlign: 'center' }}>#</th>
                <th style={{ width: '280px', padding: '14px 16px', fontWeight: 600 }}>Folder Name</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>Assigned Documents & Upload Categories</th>
                <th style={{ width: '130px', padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentSubfolders.map((sf, idx) => {
                const assignedDocs = allAvailableDocCategories.filter(c => 
                  c.scope === activeScope && (
                    config.routing_matrix[c.key] === sf.name || 
                    (!config.routing_matrix[c.key] && c.defaultFolder === sf.name)
                  )
                );
                const isEditing = editingIndex === idx;

                return (
                  <tr 
                    key={idx}
                    style={{ 
                      borderBottom: idx < currentSubfolders.length - 1 ? '1px solid #f1f5f9' : 'none',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ textAlign: 'center', padding: '14px 20px', color: '#64748b', fontSize: '11.5px', fontWeight: 600, fontFamily: 'monospace' }}>
                      {idx + 1}
                    </td>

                    {/* Folder Name & Inline Rename */}
                    <td style={{ padding: '14px 16px', fontWeight: 500 }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFolder(idx);
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                            autoFocus
                            style={{ 
                              height: '30px', 
                              fontSize: '12.5px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              outline: 'none',
                              color: '#0f172a'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameFolder(idx)}
                            style={{ padding: '4px 8px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            style={{ padding: '4px 8px', background: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Folder size={15} color="#d97706" style={{ flexShrink: 0 }} />
                          <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: 600 }}>{sf.name}</span>
                        </div>
                      )}
                    </td>

                    {/* Assigned Routing Tags (Subtle Monochromatic Pills) */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                        {assignedDocs.map(doc => (
                          <span
                            key={doc.key}
                            style={{ 
                              fontSize: '11.5px', 
                              padding: '3px 9px', 
                              borderRadius: '6px',
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '5px',
                              background: '#f8fafc',
                              color: '#334155',
                              border: '1px solid #e2e8f0',
                              fontWeight: 500
                            }}
                            title={`Routes ${doc.label} (${doc.key}) to this folder`}
                          >
                            <FileText size={11} color="#64748b" />
                            {doc.label}
                            {doc.is_template && (
                              <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#f0fdf4', color: '#15803d', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                                Template
                              </span>
                            )}
                            {doc.is_custom && (
                              <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 600, border: '1px solid #fde68a' }}>
                                Custom
                              </span>
                            )}
                          </span>
                        ))}

                        <button
                          type="button"
                          onClick={() => { setRoutingFolder(sf.name); setShowAddDocForm(false); }}
                          style={{
                            background: '#ffffff', 
                            border: '1px dashed #cbd5e1',
                            borderRadius: '6px', 
                            padding: '3px 9px', 
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#475569', 
                            cursor: 'pointer', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0f172a'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                          title="Assign or unassign document types to this folder"
                        >
                          <Tag size={11} /> {assignedDocs.length > 0 ? '+ Change' : '+ Assign Docs'}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => { setEditingIndex(idx); setEditingText(sf.name); }}
                          title="Rename Folder"
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 500,
                            color: '#334155',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(idx)}
                          title="Delete Folder"
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 500,
                            color: '#dc2626',
                            background: '#ffffff',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Add New Folder Row */}
              {showAddRow && (
                <tr style={{ background: '#f8fafc' }}>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>+</td>
                  <td style={{ padding: '12px 16px' }}>
                    <input
                      type="text"
                      placeholder="e.g. 05 - Shipping & Customs"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddFolder();
                        if (e.key === 'Escape') setShowAddRow(false);
                      }}
                      autoFocus
                      style={{ 
                        height: '30px', 
                        fontSize: '12.5px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        width: '100%'
                      }}
                    />
                  </td>
                  <td style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic', padding: '12px 16px' }}>
                    Press Enter to save folder, then assign document routing tags.
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={handleAddFolder}
                        style={{ padding: '4px 10px', fontSize: '11.5px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddRow(false)}
                        style={{ padding: '4px 10px', fontSize: '11.5px', background: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Duplicate Clean-up & Merge Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="#b45309" />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                Clean up & Merge Duplicate Folders
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Scan Google Drive for duplicate order folders created by past exports and automatically consolidate files into canonical directories.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConsolidateDuplicates}
            disabled={consolidating}
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px', 
              fontWeight: 500,
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              cursor: consolidating ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={13} className={consolidating ? 'spin' : ''} />
            {consolidating ? 'Scanning Drive...' : 'Scan & Merge Duplicates'}
          </button>
        </div>

        {consolidateMsg && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '6px', fontSize: '12px',
            background: consolidateMsg.status === 'success' ? '#f0fdf4' : '#fef2f2',
            color: consolidateMsg.status === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${consolidateMsg.status === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}>
            {consolidateMsg.status === 'success' 
              ? `${consolidateMsg.message} (Merged: ${consolidateMsg.merged_orders_count || 0} folders, ${consolidateMsg.files_moved || 0} files moved)`
              : `Error: ${consolidateMsg.error || consolidateMsg.message}`}
          </div>
        )}
      </div>

      {/* Modal: Document Routing Selector + Add Custom Category */}
      {routingFolder && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => { setRoutingFolder(null); setShowAddDocForm(false); }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ width: '560px', maxWidth: '95vw', background: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Folder size={16} color="#d97706" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  Assign Documents to: {routingFolder}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setRoutingFolder(null); setShowAddDocForm(false); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                  Select document types to automatically route into <strong>{routingFolder}</strong>:
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddDocForm(!showAddDocForm)}
                  style={{ 
                    fontSize: '11.5px', 
                    fontWeight: 500,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px' 
                  }}
                >
                  <PlusCircle size={12} /> {showAddDocForm ? 'Cancel' : '+ New Category'}
                </button>
              </div>

              {/* Add Custom Document Category Form */}
              {showAddDocForm && (
                <div style={{
                  marginBottom: '14px', padding: '12px 14px', borderRadius: '8px',
                  background: '#f8fafc', border: '1px solid #cbd5e1'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                    Add Custom Document or Manual Upload Category:
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. Electrical Compliance Certificates (COC)"
                      value={newDocLabel}
                      onChange={(e) => setNewDocLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateCustomDocCategory();
                      }}
                      autoFocus
                      style={{ 
                        flex: 1,
                        height: '32px', 
                        fontSize: '12.5px',
                        padding: '2px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        color: '#0f172a',
                        background: '#ffffff'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateCustomDocCategory}
                      style={{ 
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Add & Route
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                    Will be added as a custom {activeScope === 'design' ? 'Design' : 'Order'} category and routed to {routingFolder}.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allAvailableDocCategories
                  .filter(c => c.scope === activeScope)
                  .map(doc => {
                    const isAssigned = (config.routing_matrix[doc.key] === routingFolder) || 
                      (!config.routing_matrix[doc.key] && doc.defaultFolder === routingFolder);
                    const currentMapped = config.routing_matrix[doc.key] || doc.defaultFolder;

                    return (
                      <div
                        key={doc.key}
                        onClick={() => toggleDocAssignment(doc.key, routingFolder)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                          background: isAssigned ? '#f8fafc' : '#ffffff',
                          border: isAssigned ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                              {doc.label}
                            </span>
                            {doc.is_template && (
                              <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#f0fdf4', color: '#15803d', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                                Template
                              </span>
                            )}
                            {doc.is_custom && (
                              <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 600, border: '1px solid #fde68a' }}>
                                Custom
                              </span>
                            )}
                            {doc.is_manual && (
                              <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#f1f5f9', color: '#334155', fontWeight: 500, border: '1px solid #cbd5e1' }}>
                                Manual Upload
                              </span>
                            )}
                          </div>
                          {!isAssigned && currentMapped && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              Currently routed to: <strong>{currentMapped}</strong>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {doc.is_custom && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomDocCategory(doc.key);
                              }}
                              title="Delete custom category"
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '5px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isAssigned ? '#0f172a' : '#ffffff',
                            border: `1px solid ${isAssigned ? '#0f172a' : '#cbd5e1'}`,
                            color: '#fff'
                          }}>
                            {isAssigned && <Check size={13} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => { setRoutingFolder(null); setShowAddDocForm(false); }}
                style={{ 
                  padding: '8px 18px', 
                  fontSize: '12.5px', 
                  fontWeight: 600,
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

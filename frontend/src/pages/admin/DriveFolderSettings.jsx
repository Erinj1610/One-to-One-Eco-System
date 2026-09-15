import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api_config';
import { 
  Folder, Plus, Trash2, Edit3, Check, RefreshCw, 
  Layers, Sparkles, Save, X, Tag, FileText, ChevronRight, ChevronDown, Compass, ShoppingBag, PlusCircle
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

        if (data.db_templates) {
          setDbTemplates(data.db_templates);
        }
      }
    } catch (e) {
      console.error('Error fetching drive config:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const currentSubfolders = activeScope === 'order' ? config.order_subfolders : config.design_subfolders;
  const listKey = activeScope === 'order' ? 'order_subfolders' : 'design_subfolders';

  // Compute unified document list:
  // 1. Dynamic DB Templates (with friendly labels)
  // 2. Standard Operational Manual Uploads (POs, GRNs, Drawings, etc.)
  // 3. User-created custom categories
  const allAvailableDocCategories = React.useMemo(() => {
    const list = [];
    const seenKeys = new Set();

    // 1. Add all dynamic templates discovered from DB
    dbTemplates.forEach(t => {
      const k = t.key.toUpperCase();
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        const friendlyLabel = TEMPLATE_LABEL_MAP[k] || t.label || k.replace(/_/g, ' ');
        const isDesign = k.includes('DESIGN') || k.includes('PROPOSAL');
        list.push({
          key: t.key,
          label: friendlyLabel,
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
        setSaveMsg('Configuration saved successfully!');
        setTimeout(() => setSaveMsg(''), 4000);
      } else {
        const err = await res.json();
        setSaveMsg(`Failed to save: ${err.detail || 'Unknown error'}`);
      }
    } catch (err) {
      setSaveMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    if (currentSubfolders.some(sf => sf.name.toLowerCase() === name.toLowerCase())) {
      alert('A folder with this name already exists.');
      return;
    }
    const newSf = { name, sort: currentSubfolders.length + 1, key: name };
    setConfig(prev => ({
      ...prev,
      [listKey]: [...currentSubfolders, newSf]
    }));
    setNewFolderName('');
    setShowAddRow(false);
  };

  const handleDeleteFolder = (idx) => {
    const target = currentSubfolders[idx];
    if (!target) return;
    if (currentSubfolders.length <= 1) {
      alert('At least one folder is required.');
      return;
    }
    if (!window.confirm(`Delete folder "${target.name}"?`)) return;

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
    const oldName = currentSubfolders[idx].name;
    const newName = editingText.trim();
    if (oldName !== newName) {
      if (currentSubfolders.some((sf, i) => i !== idx && sf.name.toLowerCase() === newName.toLowerCase())) {
        alert('A folder with that name already exists.');
        return;
      }
      const updated = currentSubfolders.map((sf, i) => i === idx ? { ...sf, name: newName, key: newName } : sf);
      const updatedMatrix = { ...config.routing_matrix };
      Object.keys(updatedMatrix).forEach(k => {
        if (updatedMatrix[k] === oldName) updatedMatrix[k] = newName;
      });

      setConfig(prev => ({
        ...prev,
        [listKey]: updated,
        routing_matrix: updatedMatrix
      }));
    }
    setEditingIndex(null);
  };

  const toggleDocAssignment = (docKey, folderName) => {
    setConfig(prev => {
      const matrix = { ...prev.routing_matrix };
      if (matrix[docKey] === folderName) {
        delete matrix[docKey];
      } else {
        matrix[docKey] = folderName;
      }
      return { ...prev, routing_matrix: matrix };
    });
  };

  const handleCreateCustomDocCategory = () => {
    if (!newDocLabel.trim()) return;
    const label = newDocLabel.trim();
    const key = label.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');

    if (allAvailableDocCategories.some(c => c.key === key || c.label.toLowerCase() === label.toLowerCase())) {
      alert('A document or upload category with this name already exists.');
      return;
    }

    const newCategory = {
      key,
      label,
      scope: activeScope,
      defaultFolder: routingFolder || (activeScope === 'design' ? '04 - Proposals & Contracts' : 'Documents'),
      is_custom: true
    };

    setConfig(prev => ({
      ...prev,
      custom_doc_categories: [...(prev.custom_doc_categories || []), newCategory],
      routing_matrix: routingFolder ? { ...prev.routing_matrix, [key]: routingFolder } : prev.routing_matrix
    }));

    setNewDocLabel('');
    setShowAddDocForm(false);
  };

  const handleDeleteCustomDocCategory = (key) => {
    if (!window.confirm('Delete this custom category?')) return;
    setConfig(prev => {
      const updatedCustom = (prev.custom_doc_categories || []).filter(c => c.key !== key);
      const updatedMatrix = { ...prev.routing_matrix };
      delete updatedMatrix[key];
      return {
        ...prev,
        custom_doc_categories: updatedCustom,
        routing_matrix: updatedMatrix
      };
    });
  };

  const handleConsolidateDuplicates = async () => {
    if (!window.confirm('Scan Google Drive for duplicate folders and merge files into canonical folders?')) return;
    setConsolidating(true);
    setConsolidateMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/drive-consolidate-duplicates`, { method: 'POST' });
      const data = await res.json();
      setConsolidateMsg(data);
    } catch (err) {
      setConsolidateMsg({ status: 'error', error: err.message });
    } finally {
      setConsolidating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={20} className="spin" style={{ display: 'inline-block', marginBottom: '8px' }} />
        <div>Loading Google Drive Configuration...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Header Card */}
      <div className="card" style={{ margin: 0, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Folder size={18} color="#f59e0b" /> Google Drive Folder Hierarchy & Document Routing
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
              Control standard Google Drive subfolders and configure automatic routing for generated documents, custom templates, and manual uploads.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveConfig}
              disabled={saving}
              style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {saveMsg && (
          <div style={{
            marginTop: '12px', padding: '8px 14px', borderRadius: '6px', fontSize: '12px',
            background: saveMsg.startsWith('Failed') || saveMsg.startsWith('Error') ? 'var(--bg-danger)' : 'var(--bg-success)',
            color: saveMsg.startsWith('Failed') || saveMsg.startsWith('Error') ? 'var(--text-danger)' : 'var(--text-success)',
            border: `1px solid ${saveMsg.startsWith('Failed') || saveMsg.startsWith('Error') ? 'var(--border-danger)' : 'var(--border-success)'}`
          }}>
            {saveMsg}
          </div>
        )}
      </div>

      {/* Scope Segmented Control (Orders vs Designs) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => { setActiveScope('order'); setShowAddRow(false); setEditingIndex(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: activeScope === 'order' ? 'var(--text-primary)' : 'transparent',
              color: activeScope === 'order' ? '#fff' : 'var(--text-secondary)'
            }}
          >
            <ShoppingBag size={14} /> Orders Folder Hierarchy
          </button>
          <button
            type="button"
            onClick={() => { setActiveScope('design'); setShowAddRow(false); setEditingIndex(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: activeScope === 'design' ? 'var(--text-primary)' : 'transparent',
              color: activeScope === 'design' ? '#fff' : 'var(--text-secondary)'
            }}
          >
            <Compass size={14} /> Designs Folder Hierarchy
          </button>
        </div>

        {/* Directory Breadcrumb Preview */}
        <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>01 - PROJECTS</span>
          <ChevronRight size={12} />
          <span>[Project Name]</span>
          <ChevronRight size={12} />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {activeScope === 'order' ? 'Orders / [ORDER_NUMBER] - [ORDER_NAME]' : 'Designs / [FEE_REF] - [DESIGN_NAME]'}
          </span>
        </div>
      </div>

      {/* Subfolder Management Card */}
      <div className="card" style={{ margin: 0 }}>
        <div className="card-head">
          <div className="card-title">
            <Layers size={15} color="var(--text-info)" />
            <span>{activeScope === 'order' ? 'Order Subfolders & Document Routing' : 'Design Subfolders & Document Routing'}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => { setShowAddRow(true); setNewFolderName(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={13} /> Add Subfolder
          </button>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                <th style={{ width: '280px' }}>Folder Name</th>
                <th>Assigned Documents & Upload Categories</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
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
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600 }}>
                      {idx + 1}
                    </td>

                    {/* Folder Name & Inline Rename */}
                    <td style={{ fontWeight: 500 }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            className="form-control"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFolder(idx);
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                            autoFocus
                            style={{ height: '28px', fontSize: '12px' }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleRenameFolder(idx)}
                            style={{ padding: '3px 7px' }}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setEditingIndex(null)}
                            style={{ padding: '3px 7px' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Folder size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-primary)', fontSize: '12.5px' }}>{sf.name}</span>
                        </div>
                      )}
                    </td>

                    {/* Assigned Routing Tags */}
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                        {assignedDocs.map(doc => (
                          <span
                            key={doc.key}
                            className="badge b-info"
                            style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title={`Routes ${doc.label} (${doc.key}) to this folder`}
                          >
                            <FileText size={10} />
                            {doc.label}
                            {doc.is_template && (
                              <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                                Template
                              </span>
                            )}
                            {doc.is_custom && (
                              <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', fontWeight: 600 }}>
                                Custom
                              </span>
                            )}
                          </span>
                        ))}

                        <button
                          type="button"
                          onClick={() => { setRoutingFolder(sf.name); setShowAddDocForm(false); }}
                          style={{
                            background: 'var(--bg-secondary)', border: '1px dashed var(--border-strong)',
                            borderRadius: '100px', padding: '2px 8px', fontSize: '10.5px',
                            color: 'var(--text-info)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px'
                          }}
                          title="Assign or unassign document types to this folder"
                        >
                          <Tag size={10} /> {assignedDocs.length > 0 ? '+ Change' : '+ Assign Docs'}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => { setEditingIndex(idx); setEditingText(sf.name); }}
                          title="Rename Folder"
                          style={{ padding: '4px 7px' }}
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteFolder(idx)}
                          title="Delete Folder"
                          style={{ padding: '4px 7px' }}
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
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <td style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>+</td>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 05 - Shipping & Customs"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddFolder();
                        if (e.key === 'Escape') setShowAddRow(false);
                      }}
                      autoFocus
                      style={{ height: '28px', fontSize: '12px' }}
                    />
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '11.5px', fontStyle: 'italic' }}>
                    Press Enter to save folder, then assign document routing
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleAddFolder}
                        style={{ padding: '4px 8px' }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setShowAddRow(false)}
                        style={{ padding: '4px 8px' }}
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

      {/* Duplicate Clean-up Card */}
      <div className="card" style={{ margin: 0, padding: '16px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} color="#d97706" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Clean up & Merge Duplicate Folders
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Scan Google Drive for duplicate order folders created by past exports and automatically consolidate files into canonical directories.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn"
            onClick={handleConsolidateDuplicates}
            disabled={consolidating}
            style={{ fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={12} className={consolidating ? 'spin' : ''} />
            {consolidating ? 'Scanning...' : 'Scan & Merge Duplicates'}
          </button>
        </div>

        {consolidateMsg && (
          <div style={{
            marginTop: '10px', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px',
            background: consolidateMsg.status === 'success' ? 'var(--bg-success)' : 'var(--bg-danger)',
            color: consolidateMsg.status === 'success' ? 'var(--text-success)' : 'var(--text-danger)'
          }}>
            {consolidateMsg.status === 'success' 
              ? `${consolidateMsg.message} (Merged: ${consolidateMsg.merged_orders_count || 0} folders, ${consolidateMsg.files_moved || 0} files moved)`
              : `Error: ${consolidateMsg.error || consolidateMsg.message}`}
          </div>
        )}
      </div>

      {/* Modal: Document Routing Selector + Add Custom Category */}
      {routingFolder && (
        <div className="modal-backdrop" onClick={() => { setRoutingFolder(null); setShowAddDocForm(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '540px', maxWidth: '95vw' }}>
            <div className="modal-head" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Folder size={16} color="#f59e0b" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Assign Documents to: {routingFolder}
                </span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => { setRoutingFolder(null); setShowAddDocForm(false); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  Select document types and uploads to automatically route to <strong>{routingFolder}</strong>:
                </p>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setShowAddDocForm(!showAddDocForm)}
                  style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <PlusCircle size={12} /> {showAddDocForm ? 'Cancel' : '+ New Category'}
                </button>
              </div>

              {/* Add Custom Document / Upload Category Form */}
              {showAddDocForm && (
                <div style={{
                  marginBottom: '14px', padding: '10px 12px', borderRadius: '8px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)'
                }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Add Custom Document or Manual Upload Category:
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Electrical Compliance Certificates (COC)"
                      value={newDocLabel}
                      onChange={(e) => setNewDocLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateCustomDocCategory();
                      }}
                      autoFocus
                      style={{ height: '30px', fontSize: '12px' }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleCreateCustomDocCategory}
                      style={{ fontWeight: 600 }}
                    >
                      Add & Route
                    </button>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Will be added as a custom {activeScope === 'design' ? 'Design' : 'Order'} category and routed to {routingFolder}.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                          padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                          background: isAssigned ? 'var(--bg-info)' : 'var(--bg-secondary)',
                          border: `1px solid ${isAssigned ? 'var(--border-info)' : 'var(--border)'}`
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: isAssigned ? 'var(--text-info)' : 'var(--text-primary)' }}>
                              {doc.label}
                            </span>
                            {doc.is_template && (
                              <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                                Template
                              </span>
                            )}
                            {doc.is_custom && (
                              <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', fontWeight: 600 }}>
                                Custom
                              </span>
                            )}
                            {doc.is_manual && (
                              <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 500 }}>
                                Manual Upload
                              </span>
                            )}
                          </div>
                          {!isAssigned && currentMapped && (
                            <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                              Currently routed to: {currentMapped}
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
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isAssigned ? 'var(--text-info)' : 'var(--bg-primary)',
                            border: `1px solid ${isAssigned ? 'var(--text-info)' : 'var(--border-strong)'}`,
                            color: '#fff'
                          }}>
                            {isAssigned && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-secondary)' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => { setRoutingFolder(null); setShowAddDocForm(false); }}
                style={{ fontWeight: 600 }}
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

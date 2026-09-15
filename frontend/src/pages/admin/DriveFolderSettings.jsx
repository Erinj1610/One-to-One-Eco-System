import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api_config';
import { 
  FolderPlus, Folder, Trash2, Edit3, Plus, Check, RefreshCw, 
  Layers, ArrowDown, ArrowUp, AlertTriangle, Sparkles, Move, Save, Shield
} from 'lucide-react';

const SYSTEM_DOC_CATEGORIES = [
  { key: 'QUOTATION', label: 'Client Quotations & Estimates', defaultFolder: '01 - Quotations & BOQs' },
  { key: 'BOQ', label: 'Bill of Quantities (BOQ)', defaultFolder: '01 - Quotations & BOQs' },
  { key: 'PURCHASE_ORDER', label: 'Supplier Purchase Orders (PO)', defaultFolder: '02 - Supplier POs & Confirmations' },
  { key: 'PO', label: 'PO Attachments & Manual PO Allocations', defaultFolder: '02 - Supplier POs & Confirmations' },
  { key: 'GRN', label: 'Goods Received Notes (GRN) & Delivery Slips', defaultFolder: '03 - Logistics & Work Orders' },
  { key: 'LOGISTICS', label: 'Shipping, Waybills & Packing Lists', defaultFolder: '03 - Logistics & Work Orders' },
  { key: 'WORK_ORDER', label: 'Cutting Lists & Work Orders', defaultFolder: '03 - Logistics & Work Orders' },
  { key: 'TAX_INVOICE', label: 'Tax Invoices & Billing Statements', defaultFolder: '04 - Invoices & Proof of Payment' },
  { key: 'DEPOSIT_INVOICE', label: 'Deposit Invoices & Proforma Invoices', defaultFolder: '04 - Invoices & Proof of Payment' },
  { key: 'BALANCE_INVOICE', label: 'Balance Invoices', defaultFolder: '04 - Invoices & Proof of Payment' },
  { key: 'INVOICE', label: 'Invoice Attachments & Manual Invoicing Uploads', defaultFolder: '04 - Invoices & Proof of Payment' },
  { key: 'DEFAULT', label: 'General / Unclassified Documents', defaultFolder: 'Documents' }
];

export default function DriveFolderSettings() {
  const [config, setConfig] = useState({
    order_folder_pattern: '[ORDER_NUMBER] - [ORDER_NAME]',
    order_subfolders: [
      { name: '01 - Quotations & BOQs', sort: 1, key: '01 - Quotations & BOQs' },
      { name: '02 - Supplier POs & Confirmations', sort: 2, key: '02 - Supplier POs & Confirmations' },
      { name: '03 - Logistics & Work Orders', sort: 3, key: '03 - Logistics & Work Orders' },
      { name: '04 - Invoices & Proof of Payment', sort: 4, key: '04 - Invoices & Proof of Payment' },
      { name: 'Documents', sort: 5, key: 'Documents' }
    ],
    routing_matrix: {}
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [newSubfolderName, setNewSubfolderName] = useState('');
  
  // Deduplication tool state
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
          order_subfolders: data.order_subfolders || [],
          routing_matrix: data.routing_matrix || {}
        });
      }
    } catch (e) {
      console.error('Error fetching drive folder config:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

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
        setSaveMsg('✅ Folder hierarchy & routing configuration saved successfully!');
        setTimeout(() => setSaveMsg(''), 4000);
      } else {
        const err = await res.json();
        setSaveMsg(`❌ Failed to save: ${err.detail || 'Unknown error'}`);
      }
    } catch (err) {
      setSaveMsg(`❌ Network error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubfolder = () => {
    if (!newSubfolderName.trim()) return;
    const name = newSubfolderName.trim();
    if (config.order_subfolders.some(sf => sf.name.toLowerCase() === name.toLowerCase())) {
      alert('A subfolder with this name already exists.');
      return;
    }
    const newSf = {
      name,
      sort: config.order_subfolders.length + 1,
      key: name
    };
    setConfig(prev => ({
      ...prev,
      order_subfolders: [...prev.order_subfolders, newSf]
    }));
    setNewSubfolderName('');
  };

  const handleRemoveSubfolder = (index) => {
    const target = config.order_subfolders[index];
    if (!target) return;
    if (config.order_subfolders.length <= 1) {
      alert('You must keep at least one subfolder.');
      return;
    }
    const filtered = config.order_subfolders.filter((_, idx) => idx !== index);
    // Update any routing matrix items pointing to this deleted subfolder to the first available subfolder
    const fallback = filtered[0].name;
    const updatedMatrix = { ...config.routing_matrix };
    Object.keys(updatedMatrix).forEach(k => {
      if (updatedMatrix[k] === target.name) {
        updatedMatrix[k] = fallback;
      }
    });

    setConfig(prev => ({
      ...prev,
      order_subfolders: filtered,
      routing_matrix: updatedMatrix
    }));
  };

  const handleMoveSubfolder = (index, direction) => {
    const list = [...config.order_subfolders];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    list.forEach((sf, i) => sf.sort = i + 1);
    setConfig(prev => ({ ...prev, order_subfolders: list }));
  };

  const handleSubfolderRename = (index, newName) => {
    const oldName = config.order_subfolders[index].name;
    const list = [...config.order_subfolders];
    list[index] = { ...list[index], name: newName, key: newName };

    const updatedMatrix = { ...config.routing_matrix };
    Object.keys(updatedMatrix).forEach(k => {
      if (updatedMatrix[k] === oldName) {
        updatedMatrix[k] = newName;
      }
    });

    setConfig(prev => ({
      ...prev,
      order_subfolders: list,
      routing_matrix: updatedMatrix
    }));
  };

  const handleRoutingChange = (catKey, folderName) => {
    setConfig(prev => ({
      ...prev,
      routing_matrix: {
        ...prev.routing_matrix,
        [catKey]: folderName
      }
    }));
  };

  const handleConsolidateDuplicates = async () => {
    if (!window.confirm("Scan Google Drive for duplicate folders under Orders and merge files into a single primary folder?")) {
      return;
    }
    setConsolidating(true);
    setConsolidateMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/drive-consolidate-duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setConsolidateMsg({ type: 'success', text: data.message });
      } else {
        setConsolidateMsg({ type: 'error', text: data.detail || 'Consolidation notice' });
      }
    } catch (e) {
      setConsolidateMsg({ type: 'error', text: `Consolidation error: ${e.message}` });
    } finally {
      setConsolidating(false);
    }
  };

  // Preview generated order folder name
  const sampleFolderPreview = (config.order_folder_pattern || '[ORDER_NUMBER] - [ORDER_NAME]')
    .replace('[ORDER_NUMBER]', 'Q-2026-0582')
    .replace('[ORDER_NAME]', 'Saad (Landscape Lighting)')
    .replace('[SUPPLIER]', 'Lumenox Lighting')
    .replace('[PROJECT]', 'Villa Fresnaye');

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: '12px' }} />
        <div>Loading Drive & Folder System Hierarchy...</div>
      </div>
    );
  }

  return (
    <div className="animation-fade-in" style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div className="section-label" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderPlus size={20} color="var(--accent)" /> Google Drive & Folder System Hierarchy
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Fully customize the Google Drive folder structure, order folder naming conventions, standard subfolders, and document routing rules for both generated files and manual uploads (POs, Invoices, GRNs).
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSaveConfig} 
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
        >
          {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {saveMsg && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '20px',
          background: saveMsg.startsWith('✅') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: saveMsg.startsWith('✅') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          color: saveMsg.startsWith('✅') ? 'var(--text-success)' : 'var(--text-danger)',
          fontSize: '13px', fontWeight: 600
        }}>
          {saveMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: FOLDER TREE & ORDER NAMING */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* ORDER FOLDER NAMING PATTERN */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              📁 Order Folder Naming Format
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              Choose how the order folder is automatically named inside Google Drive when documents are generated or uploaded.
            </div>

            <div style={{ marginBottom: '12px' }}>
              <input 
                type="text" 
                className="form-control" 
                value={config.order_folder_pattern}
                onChange={e => setConfig(prev => ({ ...prev, order_folder_pattern: e.target.value }))}
                style={{ fontSize: '13px', fontWeight: 600 }}
                placeholder="e.g. [ORDER_NUMBER] - [ORDER_NAME]"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', alignSelf: 'center', marginRight: '4px' }}>Insert Token:</span>
              {[
                { tag: '[ORDER_NUMBER]', label: '+ Order No' },
                { tag: '[ORDER_NAME]', label: '+ Order Name' },
                { tag: '[SUPPLIER]', label: '+ Supplier' },
                { tag: '[PROJECT]', label: '+ Project' }
              ].map(t => (
                <button
                  key={t.tag}
                  type="button"
                  className="btn btn-sm"
                  style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
                  onClick={() => {
                    if (!config.order_folder_pattern.includes(t.tag)) {
                      setConfig(prev => ({ ...prev, order_folder_pattern: `${prev.order_folder_pattern} ${t.tag}`.trim() }));
                    }
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Drive Folder Preview</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
                📁 {sampleFolderPreview}
              </div>
            </div>
          </div>

          {/* ORDER SUBFOLDERS LIST */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                🗂️ Order Subfolder Structure
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {config.order_subfolders.length} Subfolders
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              These subfolders are automatically created inside each order folder. You can add new ones, rename them, reorder them, or delete ones you don't need.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {config.order_subfolders.map((sf, idx) => (
                <div 
                  key={sf.key || idx} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '10px', 
                    padding: '8px 12px', background: 'var(--bg-card)', 
                    border: '1px solid var(--border)', borderRadius: '6px' 
                  }}
                >
                  <Folder size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <input 
                    type="text" 
                    className="form-control"
                    value={sf.name}
                    onChange={e => handleSubfolderRename(idx, e.target.value)}
                    style={{ fontSize: '12.5px', height: '32px', flex: 1 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button 
                      type="button" 
                      className="btn btn-sm"
                      onClick={() => handleMoveSubfolder(idx, -1)}
                      disabled={idx === 0}
                      title="Move up"
                      style={{ padding: '4px 6px', opacity: idx === 0 ? 0.3 : 1 }}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm"
                      onClick={() => handleMoveSubfolder(idx, 1)}
                      disabled={idx === config.order_subfolders.length - 1}
                      title="Move down"
                      style={{ padding: '4px 6px', opacity: idx === config.order_subfolders.length - 1 ? 0.3 : 1 }}
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm"
                      onClick={() => handleRemoveSubfolder(idx)}
                      title="Remove folder"
                      style={{ padding: '4px 6px', color: 'var(--text-danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ADD SUBFOLDER INPUT */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                className="form-control"
                placeholder="New subfolder name (e.g. 05 - Shipping & Tracking)"
                value={newSubfolderName}
                onChange={e => setNewSubfolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubfolder(); } }}
                style={{ fontSize: '12.5px', height: '36px' }}
              />
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleAddSubfolder}
                disabled={!newSubfolderName.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontSize: '12.5px' }}
              >
                <Plus size={14} /> Add Folder
              </button>
            </div>
          </div>

          {/* DEDUPLICATION & CONSOLIDATION UTILITY */}
          <div className="card" style={{ padding: '20px', border: '1px solid rgba(251, 191, 36, 0.25)', background: 'rgba(251, 191, 36, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <AlertTriangle size={16} color="#fbbf24" />
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Clean Up & Consolidate Past Duplicate Folders
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              If past batch generation created duplicate folders in Google Drive, this scanner automatically groups folders with the same name, merges all their documents into the single primary folder, and removes empty duplicates.
            </div>

            <button 
              type="button"
              className="btn btn-secondary"
              onClick={handleConsolidateDuplicates}
              disabled={consolidating}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 600 }}
            >
              {consolidating ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} color="#fbbf24" />}
              {consolidating ? 'Scanning & Merging Drive Folders...' : 'Scan & Merge Duplicate Folders'}
            </button>

            {consolidateMsg && (
              <div style={{ 
                marginTop: '12px', padding: '10px 14px', borderRadius: '6px', 
                background: consolidateMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: consolidateMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                color: consolidateMsg.type === 'success' ? 'var(--text-success)' : 'var(--text-danger)',
                fontSize: '12px'
              }}>
                {consolidateMsg.text}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: DOCUMENT & UPLOAD ROUTING MATRIX */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            🔀 Document & Upload Routing Matrix
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Specify exactly which subfolder each document type must be saved or uploaded into. Both generated PDFs and manual invoice/PO attachments obey these rules.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {SYSTEM_DOC_CATEGORIES.map(cat => {
              const currentFolder = config.routing_matrix[cat.key] || cat.defaultFolder;
              return (
                <div 
                  key={cat.key}
                  style={{
                    padding: '12px 14px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {cat.label}
                    </div>
                    <code style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                      {cat.key}
                    </code>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Routes to:</span>
                    <select 
                      className="form-control"
                      value={currentFolder}
                      onChange={e => handleRoutingChange(cat.key, e.target.value)}
                      style={{ fontSize: '12px', height: '32px' }}
                    >
                      {config.order_subfolders.map(sf => (
                        <option key={sf.key || sf.name} value={sf.name}>
                          📁 {sf.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

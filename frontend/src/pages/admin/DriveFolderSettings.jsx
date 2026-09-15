import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api_config';
import { 
  Folder, FolderPlus, Trash2, Edit3, Plus, Check, RefreshCw, 
  Layers, AlertTriangle, Sparkles, Save, Shield, ChevronRight, ChevronDown,
  Tag, X, FileText, Upload, Compass, ShoppingCart
} from 'lucide-react';

const SYSTEM_DOC_CATEGORIES = [
  // Design Scope
  { key: 'DESIGN_FEE_PROPOSAL', label: 'Design Fee Proposals', scope: 'design', defaultFolder: '04 - Proposals & Contracts' },
  { key: 'DESIGN_PROPOSAL', label: 'Design Pitch / Client Proposals', scope: 'design', defaultFolder: '04 - Proposals & Contracts' },
  { key: 'DESIGN_SPECIFICATION', label: 'Design Specifications & Schedules', scope: 'design', defaultFolder: '02 - Project Specifications' },
  { key: 'CAD', label: 'CAD & Technical Layouts (.dwg, .dxf)', scope: 'design', defaultFolder: '01 - Drawings & CAD' },
  { key: 'DRAWINGS', label: 'Architectural Plans & Elevation Drawings', scope: 'design', defaultFolder: '01 - Drawings & CAD' },
  { key: 'MOODBOARD', label: 'Concept Boards & Renderings', scope: 'design', defaultFolder: '05 - Moodboards & Presentations' },
  { key: 'SITE_PHOTO', label: 'Site Progress Photos & Snag Lists', scope: 'design', defaultFolder: '03 - Site Photos & Snags' },
  // Order Scope
  { key: 'QUOTATION', label: 'Client Quotations & Estimates', scope: 'order', defaultFolder: '01 - Quotations & BOQs' },
  { key: 'BOQ', label: 'Bill of Quantities (BOQ)', scope: 'order', defaultFolder: '01 - Quotations & BOQs' },
  { key: 'PURCHASE_ORDER', label: 'Supplier Purchase Orders (PO)', scope: 'order', defaultFolder: '02 - Supplier POs & Confirmations' },
  { key: 'PO', label: 'Manual PO Attachments & Allocations', scope: 'order', defaultFolder: '02 - Supplier POs & Confirmations' },
  { key: 'GRN', label: 'Goods Received Notes (GRN) & Delivery Slips', scope: 'order', defaultFolder: '03 - Logistics & Work Orders' },
  { key: 'LOGISTICS', label: 'Waybills, Couriers & Packing Lists', scope: 'order', defaultFolder: '03 - Logistics & Work Orders' },
  { key: 'WORK_ORDER', label: 'Cutting Lists, Production & Work Orders', scope: 'order', defaultFolder: '03 - Logistics & Work Orders' },
  { key: 'TAX_INVOICE', label: 'Client Tax Invoices & Statements', scope: 'order', defaultFolder: '04 - Invoices & Proof of Payment' },
  { key: 'DEPOSIT_INVOICE', label: 'Deposit & Proforma Invoices', scope: 'order', defaultFolder: '04 - Invoices & Proof of Payment' },
  { key: 'BALANCE_INVOICE', label: 'Balance Invoices', scope: 'order', defaultFolder: '04 - Invoices & Proof of Payment' },
  { key: 'INVOICE', label: 'Supplier Invoices & Receipt Uploads', scope: 'order', defaultFolder: '04 - Invoices & Proof of Payment' },
  { key: 'DEFAULT', label: 'General / Unclassified Documents', scope: 'order', defaultFolder: 'Documents' }
];

export default function DriveFolderSettings() {
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
    routing_matrix: {}
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  
  // Expanded branch states
  const [expandedNodes, setExpandedNodes] = useState({
    root: true,
    sampleProject: true,
    designsBranch: true,
    sampleDesign: true,
    ordersBranch: true,
    sampleOrder: true
  });

  // Modal / Popover state for assigning doc types to a subfolder
  const [activeAssignFolder, setActiveAssignFolder] = useState(null); // { scope: 'design' | 'order', folderName: string }

  // Inline editing state: { scope: 'design' | 'order', index: number, name: string }
  const [editingFolder, setEditingFolder] = useState(null);
  const [newSubfolderScope, setNewSubfolderScope] = useState(null); // 'design' or 'order'
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

  const toggleNode = (nodeKey) => {
    setExpandedNodes(prev => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
  };

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

  const handleAddSubfolder = (scope) => {
    if (!newSubfolderName.trim()) return;
    const name = newSubfolderName.trim();
    const listKey = scope === 'design' ? 'design_subfolders' : 'order_subfolders';
    const currentList = config[listKey] || [];

    if (currentList.some(sf => sf.name.toLowerCase() === name.toLowerCase())) {
      alert(`A subfolder with this name already exists in ${scope === 'design' ? 'Designs' : 'Orders'}.`);
      return;
    }
    const newSf = {
      name,
      sort: currentList.length + 1,
      key: name
    };
    setConfig(prev => ({
      ...prev,
      [listKey]: [...currentList, newSf]
    }));
    setNewSubfolderName('');
    setNewSubfolderScope(null);
  };

  const handleDeleteSubfolder = (scope, index) => {
    const listKey = scope === 'design' ? 'design_subfolders' : 'order_subfolders';
    const list = config[listKey] || [];
    const sfToDelete = list[index];
    if (!sfToDelete) return;

    if (list.length <= 1) {
      alert('At least one subfolder is required.');
      return;
    }
    if (!window.confirm(`Delete folder "${sfToDelete.name}"? Any document types mapped to it will revert to unassigned.`)) {
      return;
    }

    const updated = list.filter((_, i) => i !== index).map((sf, idx) => ({ ...sf, sort: idx + 1 }));
    
    // Clean up routing matrix for any doc key assigned to this folder
    const updatedMatrix = { ...config.routing_matrix };
    Object.keys(updatedMatrix).forEach(docKey => {
      if (updatedMatrix[docKey] === sfToDelete.name) {
        delete updatedMatrix[docKey];
      }
    });

    setConfig(prev => ({
      ...prev,
      [listKey]: updated,
      routing_matrix: updatedMatrix
    }));
  };

  const handleSaveRename = (scope, index) => {
    if (!editingFolder || !editingFolder.name.trim()) {
      setEditingFolder(null);
      return;
    }
    const listKey = scope === 'design' ? 'design_subfolders' : 'order_subfolders';
    const list = config[listKey] || [];
    const oldName = list[index].name;
    const newName = editingFolder.name.trim();

    if (oldName !== newName) {
      if (list.some((sf, idx) => idx !== index && sf.name.toLowerCase() === newName.toLowerCase())) {
        alert('A folder with that name already exists in this section.');
        return;
      }
      const updated = list.map((sf, idx) => idx === index ? { ...sf, name: newName, key: newName } : sf);
      
      // Update routing matrix references
      const updatedMatrix = { ...config.routing_matrix };
      Object.keys(updatedMatrix).forEach(k => {
        if (updatedMatrix[k] === oldName) {
          updatedMatrix[k] = newName;
        }
      });

      setConfig(prev => ({
        ...prev,
        [listKey]: updated,
        routing_matrix: updatedMatrix
      }));
    }
    setEditingFolder(null);
  };

  const toggleDocAssignment = (docKey, targetFolderName) => {
    setConfig(prev => {
      const matrix = { ...prev.routing_matrix };
      if (matrix[docKey] === targetFolderName) {
        // Unassigning
        delete matrix[docKey];
      } else {
        // Assign to this folder
        matrix[docKey] = targetFolderName;
      }
      return { ...prev, routing_matrix: matrix };
    });
  };

  const handleConsolidateDuplicates = async () => {
    if (!window.confirm('Scan Google Drive for duplicate project, order, and design folders and consolidate them into canonical folders?')) {
      return;
    }
    setConsolidating(true);
    setConsolidateMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/drive-consolidate-duplicates`, {
        method: 'POST'
      });
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
      <div className="flex items-center justify-center p-12 text-gray-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading Drive Configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Folder className="w-7 h-7 text-amber-500" />
              <h1 className="text-2xl font-bold text-gray-900">Google Drive Folder Hierarchy & Document Routing</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Directly control the Google Drive folder architecture for both <strong>Designs</strong> and <strong>Orders</strong>.
              Add, rename, or delete subfolders, and click on any folder to assign document generation and manual upload categories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Hierarchy & Rules'}
            </button>
          </div>
        </div>

        {saveMsg && (
          <div className="mt-4 p-3 rounded-lg text-sm font-medium border bg-green-50 text-green-800 border-green-200">
            {saveMsg}
          </div>
        )}
      </div>

      {/* Main Visual Hierarchy Tree */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-800">Visual Folder Hierarchy Tree</span>
          </div>
          <span className="text-xs text-gray-500 bg-gray-200/60 px-2.5 py-1 rounded-full">
            Expand nodes to view subfolders and document routing
          </span>
        </div>

        <div className="p-6 font-mono text-sm space-y-3">
          {/* Level 0: 01 - PROJECTS */}
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
            <div 
              className="flex items-center gap-2 cursor-pointer select-none text-gray-800 font-bold hover:text-indigo-600 transition"
              onClick={() => toggleNode('root')}
            >
              {expandedNodes.root ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
              <Folder className="w-5 h-5 text-amber-500 fill-amber-100" />
              <span className="text-base tracking-wide">01 - PROJECTS /</span>
              <span className="text-xs font-normal text-gray-500 font-sans ml-2">(Shared Google Drive Master Root)</span>
            </div>

            {expandedNodes.root && (
              <div className="ml-6 pl-4 border-l-2 border-indigo-100 mt-3 space-y-4">
                {/* Level 1: [Project Name] */}
                <div>
                  <div 
                    className="flex items-center gap-2 cursor-pointer select-none text-gray-700 font-semibold hover:text-indigo-600 transition"
                    onClick={() => toggleNode('sampleProject')}
                  >
                    {expandedNodes.sampleProject ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <Folder className="w-4 h-4 text-amber-400" />
                    <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 text-xs font-sans font-medium">
                      [Project Name]
                    </span>
                    <span className="text-xs font-normal text-gray-400 font-sans">(e.g. "Kloof Road Villa")</span>
                  </div>

                  {expandedNodes.sampleProject && (
                    <div className="ml-6 pl-4 border-l-2 border-indigo-100 mt-3 space-y-5">
                      
                      {/* BRANCH A: DESIGNS */}
                      <div className="bg-blue-50/30 rounded-lg p-3.5 border border-blue-100">
                        <div 
                          className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-blue-100/60"
                          onClick={() => toggleNode('designsBranch')}
                        >
                          <div className="flex items-center gap-2 text-blue-900 font-semibold">
                            {expandedNodes.designsBranch ? <ChevronDown className="w-4 h-4 text-blue-500" /> : <ChevronRight className="w-4 h-4 text-blue-500" />}
                            <Compass className="w-4 h-4 text-blue-600" />
                            <Folder className="w-4 h-4 text-blue-500 fill-blue-50" />
                            <span>Designs /</span>
                            <span className="text-xs font-normal text-blue-600 font-sans">(Houses all design proposals, CAD & specs)</span>
                          </div>
                          <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-sans font-medium">
                            Design Scope
                          </span>
                        </div>

                        {expandedNodes.designsBranch && (
                          <div className="ml-5 pl-3 border-l-2 border-blue-200/80 mt-3 space-y-3">
                            {/* Design Package Container */}
                            <div>
                              <div 
                                className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium hover:text-blue-700"
                                onClick={() => toggleNode('sampleDesign')}
                              >
                                {expandedNodes.sampleDesign ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                <Folder className="w-4 h-4 text-amber-400" />
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-800 border border-gray-300 font-sans">
                                  {config.design_folder_pattern || '[FEE_REF] - [DESIGN_NAME]'}
                                </span>
                                <span className="text-xs text-gray-400 font-sans font-normal">(Design Folder)</span>
                              </div>

                              {expandedNodes.sampleDesign && (
                                <div className="ml-6 pl-3 border-l-2 border-blue-200/50 mt-2.5 space-y-2">
                                  {config.design_subfolders.map((sf, idx) => {
                                    const assignedDocs = SYSTEM_DOC_CATEGORIES.filter(c => c.scope === 'design' && (config.routing_matrix[c.key] === sf.name || (!config.routing_matrix[c.key] && c.defaultFolder === sf.name)));
                                    const isEditing = editingFolder && editingFolder.scope === 'design' && editingFolder.index === idx;

                                    return (
                                      <div key={idx} className="group flex flex-col md:flex-row md:items-center justify-between p-2 rounded bg-white hover:bg-blue-50/50 border border-gray-100 hover:border-blue-200 transition gap-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                                          {isEditing ? (
                                            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                                              <input
                                                type="text"
                                                value={editingFolder.name}
                                                onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                                                className="text-xs border border-blue-400 rounded px-2 py-1 flex-1 font-sans focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') handleSaveRename('design', idx);
                                                  if (e.key === 'Escape') setEditingFolder(null);
                                                }}
                                              />
                                              <button 
                                                onClick={() => handleSaveRename('design', idx)}
                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                              </button>
                                              <button 
                                                onClick={() => setEditingFolder(null)}
                                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-xs font-semibold text-gray-800 truncate">{sf.name}</span>
                                          )}

                                          {/* Assigned Routing Badges */}
                                          <div className="flex flex-wrap items-center gap-1 ml-2 font-sans">
                                            {assignedDocs.map(doc => (
                                              <span 
                                                key={doc.key}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-blue-100/70 text-blue-800 border border-blue-200"
                                                title={`Routes: ${doc.label}`}
                                              >
                                                <FileText className="w-3 h-3 text-blue-600" />
                                                {doc.label.split(' ')[0]}
                                              </span>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 font-sans shrink-0">
                                          <button
                                            onClick={() => setActiveAssignFolder({ scope: 'design', folderName: sf.name })}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition"
                                            title="Configure which design documents and uploads route to this folder"
                                          >
                                            <Tag className="w-3 h-3" />
                                            {assignedDocs.length > 0 ? `${assignedDocs.length} Docs` : 'Route Docs'}
                                          </button>
                                          <button
                                            onClick={() => setEditingFolder({ scope: 'design', index: idx, name: sf.name })}
                                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                            title="Rename Subfolder"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSubfolder('design', idx)}
                                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Delete Subfolder"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Add Design Subfolder */}
                                  {newSubfolderScope === 'design' ? (
                                    <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded border border-blue-200 font-sans">
                                      <input
                                        type="text"
                                        placeholder="e.g. 06 - 3D Visuals"
                                        value={newSubfolderName}
                                        onChange={(e) => setNewSubfolderName(e.target.value)}
                                        className="text-xs border border-gray-300 rounded px-2 py-1 flex-1 focus:ring-1 focus:ring-blue-500"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleAddSubfolder('design');
                                          if (e.key === 'Escape') setNewSubfolderScope(null);
                                        }}
                                      />
                                      <button 
                                        onClick={() => handleAddSubfolder('design')}
                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                                      >
                                        Add
                                      </button>
                                      <button 
                                        onClick={() => setNewSubfolderScope(null)}
                                        className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => { setNewSubfolderScope('design'); setNewSubfolderName(''); }}
                                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-sans py-1 px-2 hover:bg-blue-50 rounded transition"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Add Design Subfolder
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* BRANCH B: ORDERS */}
                      <div className="bg-emerald-50/30 rounded-lg p-3.5 border border-emerald-100">
                        <div 
                          className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-emerald-100/60"
                          onClick={() => toggleNode('ordersBranch')}
                        >
                          <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                            {expandedNodes.ordersBranch ? <ChevronDown className="w-4 h-4 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-emerald-600" />}
                            <ShoppingCart className="w-4 h-4 text-emerald-600" />
                            <Folder className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                            <span>Orders /</span>
                            <span className="text-xs font-normal text-emerald-700 font-sans">(Houses all client quotes, POs, GRNs & invoices)</span>
                          </div>
                          <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-sans font-medium">
                            Order Scope
                          </span>
                        </div>

                        {expandedNodes.ordersBranch && (
                          <div className="ml-5 pl-3 border-l-2 border-emerald-200/80 mt-3 space-y-3">
                            {/* Order Package Container */}
                            <div>
                              <div 
                                className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium hover:text-emerald-700"
                                onClick={() => toggleNode('sampleOrder')}
                              >
                                {expandedNodes.sampleOrder ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                                <Folder className="w-4 h-4 text-amber-400" />
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-800 border border-gray-300 font-sans">
                                  {config.order_folder_pattern || '[ORDER_NUMBER] - [ORDER_NAME]'}
                                </span>
                                <span className="text-xs text-gray-400 font-sans font-normal">(Order Folder)</span>
                              </div>

                              {expandedNodes.sampleOrder && (
                                <div className="ml-6 pl-3 border-l-2 border-emerald-200/50 mt-2.5 space-y-2">
                                  {config.order_subfolders.map((sf, idx) => {
                                    const assignedDocs = SYSTEM_DOC_CATEGORIES.filter(c => c.scope === 'order' && (config.routing_matrix[c.key] === sf.name || (!config.routing_matrix[c.key] && c.defaultFolder === sf.name)));
                                    const isEditing = editingFolder && editingFolder.scope === 'order' && editingFolder.index === idx;

                                    return (
                                      <div key={idx} className="group flex flex-col md:flex-row md:items-center justify-between p-2 rounded bg-white hover:bg-emerald-50/50 border border-gray-100 hover:border-emerald-200 transition gap-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                                          {isEditing ? (
                                            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                                              <input
                                                type="text"
                                                value={editingFolder.name}
                                                onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                                                className="text-xs border border-emerald-400 rounded px-2 py-1 flex-1 font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') handleSaveRename('order', idx);
                                                  if (e.key === 'Escape') setEditingFolder(null);
                                                }}
                                              />
                                              <button 
                                                onClick={() => handleSaveRename('order', idx)}
                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                              </button>
                                              <button 
                                                onClick={() => setEditingFolder(null)}
                                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-xs font-semibold text-gray-800 truncate">{sf.name}</span>
                                          )}

                                          {/* Assigned Routing Badges */}
                                          <div className="flex flex-wrap items-center gap-1 ml-2 font-sans">
                                            {assignedDocs.map(doc => (
                                              <span 
                                                key={doc.key}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-emerald-100/70 text-emerald-800 border border-emerald-200"
                                                title={`Routes: ${doc.label}`}
                                              >
                                                <FileText className="w-3 h-3 text-emerald-600" />
                                                {doc.key}
                                              </span>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 font-sans shrink-0">
                                          <button
                                            onClick={() => setActiveAssignFolder({ scope: 'order', folderName: sf.name })}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 transition"
                                            title="Configure which order documents, invoices and POs route to this folder"
                                          >
                                            <Tag className="w-3 h-3" />
                                            {assignedDocs.length > 0 ? `${assignedDocs.length} Docs` : 'Route Docs'}
                                          </button>
                                          <button
                                            onClick={() => setEditingFolder({ scope: 'order', index: idx, name: sf.name })}
                                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                            title="Rename Subfolder"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSubfolder('order', idx)}
                                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Delete Subfolder"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Add Order Subfolder */}
                                  {newSubfolderScope === 'order' ? (
                                    <div className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded border border-emerald-200 font-sans">
                                      <input
                                        type="text"
                                        placeholder="e.g. 05 - Shipping & Customs"
                                        value={newSubfolderName}
                                        onChange={(e) => setNewSubfolderName(e.target.value)}
                                        className="text-xs border border-gray-300 rounded px-2 py-1 flex-1 focus:ring-1 focus:ring-emerald-500"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleAddSubfolder('order');
                                          if (e.key === 'Escape') setNewSubfolderScope(null);
                                        }}
                                      />
                                      <button 
                                        onClick={() => handleAddSubfolder('order')}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium"
                                      >
                                        Add
                                      </button>
                                      <button 
                                        onClick={() => setNewSubfolderScope(null)}
                                        className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => { setNewSubfolderScope('order'); setNewSubfolderName(''); }}
                                      className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-sans py-1 px-2 hover:bg-emerald-50 rounded transition"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Add Order Subfolder
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Routing Tag Modal / Popover */}
      {activeAssignFolder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Assign Documents to Folder</h3>
                  <p className="text-xs text-gray-500 font-mono">{activeAssignFolder.folderName}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveAssignFolder(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-gray-600">
                Select which generated documents and manual uploads will automatically route to <strong>{activeAssignFolder.folderName}</strong>:
              </p>

              <div className="space-y-2 mt-3">
                {SYSTEM_DOC_CATEGORIES
                  .filter(c => c.scope === activeAssignFolder.scope)
                  .map(doc => {
                    const isAssigned = (config.routing_matrix[doc.key] === activeAssignFolder.folderName) || 
                      (!config.routing_matrix[doc.key] && doc.defaultFolder === activeAssignFolder.folderName);

                    const currentMappedTo = config.routing_matrix[doc.key] || doc.defaultFolder;

                    return (
                      <div 
                        key={doc.key}
                        onClick={() => toggleDocAssignment(doc.key, activeAssignFolder.folderName)}
                        className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition select-none ${
                          isAssigned 
                            ? 'bg-blue-50/70 border-blue-300' 
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900">{doc.label}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                              {doc.key}
                            </span>
                          </div>
                          {!isAssigned && currentMappedTo && (
                            <p className="text-[11px] text-gray-400">
                              Currently routed to: <span className="text-gray-600 font-medium">{currentMappedTo}</span>
                            </p>
                          )}
                        </div>

                        <div className={`w-5 h-5 rounded flex items-center justify-center border mt-0.5 transition ${
                          isAssigned 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : 'border-gray-300 bg-white'
                        }`}>
                          {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setActiveAssignFolder(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Consolidation Card */}
      <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">Cleanup & Merge Duplicate Folders</h3>
              <p className="text-xs text-amber-700 mt-1 max-w-2xl">
                If past batch exports created duplicate order or design folders in Google Drive, this tool scans 
                your projects and automatically merges files into the primary folder, removing duplicate empty directories.
              </p>
            </div>
          </div>

          <button
            onClick={handleConsolidateDuplicates}
            disabled={consolidating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold shadow-2xs transition disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${consolidating ? 'animate-spin' : ''}`} />
            {consolidating ? 'Consolidating...' : 'Scan & Merge Duplicates'}
          </button>
        </div>

        {consolidateMsg && (
          <div className="mt-4 p-3 rounded-lg text-xs font-mono bg-white border border-amber-200 text-gray-800">
            {consolidateMsg.status === 'success' ? (
              <span className="text-green-700">
                {consolidateMsg.message} (Merged: {consolidateMsg.merged_orders_count || 0} order folders, {consolidateMsg.files_moved || 0} files moved)
              </span>
            ) : (
              <span className="text-red-700">
                Error: {consolidateMsg.error || consolidateMsg.message}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

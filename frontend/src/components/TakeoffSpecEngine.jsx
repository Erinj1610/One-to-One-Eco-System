import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Search, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  FileSpreadsheet, 
  Save, 
  ArrowRight, 
  Sliders, 
  Grid, 
  List, 
  Check, 
  RefreshCw,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  X
} from 'lucide-react';
import { API_BASE } from '../api_config';

/**
 * TakeoffSpecEngine
 * 
 * Upstream architectural module for fast fixture count-up (Takeoff) by floor/room,
 * centralized specification mapping (Plan Tag -> Catalog Product), and dynamic accessory
 * attachment with configurable ratios.
 * 
 * Outputs cleanly into the manual BOQ Spreadsheet with Zero Disruption to existing workflows.
 */
export default function TakeoffSpecEngine({
  orderId,
  projectKey,
  orderSupplier,
  initialTakeoffData,
  onSaveTakeoffData,
  onGenerateBOQ,
  onCancel
}) {
  // Navigation inside engine: 'countup' | 'spec' | 'summary'
  const [activeTab, setActiveTab] = useState('countup');

  // Count-Up Rows: [{ id, tag, floor, area, qty, notes }]
  const [countUpRows, setCountUpRows] = useState(() => {
    if (initialTakeoffData && Array.isArray(initialTakeoffData.countUpRows) && initialTakeoffData.countUpRows.length > 0) {
      return initialTakeoffData.countUpRows;
    }
    // Default initial template rows
    return [
      { id: 'tu-' + Date.now() + '-1', tag: 'DL1', floor: 'Ground', area: 'Kitchen', qty: 6, notes: 'Recessed downlight' },
      { id: 'tu-' + Date.now() + '-2', tag: 'DL1', floor: 'Ground', area: 'Living', qty: 8, notes: 'Recessed downlight' },
      { id: 'tu-' + Date.now() + '-3', tag: 'SP1', floor: 'Ground', area: 'Kitchen Island', qty: 3, notes: 'Pendant light' }
    ];
  });

  // Specifications: { [tag]: { product: Object, accessories: Array } }
  const [specifications, setSpecifications] = useState(() => {
    if (initialTakeoffData && initialTakeoffData.specifications && typeof initialTakeoffData.specifications === 'object') {
      return initialTakeoffData.specifications;
    }
    return {};
  });

  // Save feedback state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Search & Filter in Count-Up
  const [countUpSearch, setCountUpSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState('All');

  // Bulk Paste Modal
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');

  // Catalog Picker Modal State
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogTargetTag, setCatalogTargetTag] = useState(null); // tag string
  const [catalogTargetMode, setCatalogTargetMode] = useState('product'); // 'product' | 'accessory'
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('All');
  const [catalogResults, setCatalogResults] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Generate BOQ Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMode, setGenerateMode] = useState('append'); // 'append' | 'replace'

  // Debounced catalog search
  useEffect(() => {
    if (!catalogModalOpen) return;
    const fetchCatalog = async () => {
      setCatalogLoading(true);
      try {
        const queryParams = [];
        if (catalogSearch.trim()) {
          queryParams.push(`q=${encodeURIComponent(catalogSearch.trim())}`);
        }
        if (catalogCategory && catalogCategory !== 'All') {
          queryParams.push(`category=${encodeURIComponent(catalogCategory)}`);
        }
        const url = `${API_BASE}/api/products/${queryParams.length ? '?' + queryParams.join('&') : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCatalogResults(Array.isArray(data) ? data : (data.items || []));
        }
      } catch (err) {
        console.error("Failed to fetch catalog in Takeoff Engine:", err);
      } finally {
        setCatalogLoading(false);
      }
    };

    const timer = setTimeout(fetchCatalog, 300);
    return () => clearTimeout(timer);
  }, [catalogModalOpen, catalogSearch, catalogCategory]);

  // Derived: Unique tags extracted from Count-Up
  const uniqueTags = useMemo(() => {
    const tagsMap = new Map();
    countUpRows.forEach(row => {
      const t = (row.tag || '').trim().toUpperCase();
      if (t) {
        if (!tagsMap.has(t)) {
          tagsMap.set(t, { tag: t, totalQty: 0, areas: new Set(), floors: new Set() });
        }
        const info = tagsMap.get(t);
        info.totalQty += Number(row.qty) || 0;
        if (row.area) info.areas.add(row.area.trim());
        if (row.floor) info.floors.add(row.floor.trim());
      }
    });
    return Array.from(tagsMap.values()).map(item => ({
      ...item,
      areasCount: item.areas.size,
      floorsCount: item.floors.size
    }));
  }, [countUpRows]);

  // Derived: Unique floors
  const uniqueFloors = useMemo(() => {
    const s = new Set();
    countUpRows.forEach(r => { if (r.floor && r.floor.trim()) s.add(r.floor.trim()); });
    return Array.from(s);
  }, [countUpRows]);

  // Derived: Stats
  const stats = useMemo(() => {
    const totalRows = countUpRows.length;
    const totalQty = countUpRows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const configuredTags = uniqueTags.filter(ut => specifications[ut.tag]?.product).length;
    return {
      totalRows,
      totalQty,
      uniqueTagsCount: uniqueTags.length,
      configuredTags,
      pendingTags: uniqueTags.length - configuredTags
    };
  }, [countUpRows, uniqueTags, specifications]);

  // -------------------------------------------------------------
  // Count-Up Row Operations
  // -------------------------------------------------------------
  const handleAddRow = (defaults = {}) => {
    const newId = 'tu-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const lastRow = countUpRows[countUpRows.length - 1];
    setCountUpRows(prev => [
      ...prev,
      {
        id: newId,
        tag: defaults.tag || (lastRow ? lastRow.tag : 'DL1'),
        floor: defaults.floor || (lastRow ? lastRow.floor : 'Ground'),
        area: defaults.area || (lastRow ? lastRow.area : ''),
        qty: defaults.qty || 1,
        notes: defaults.notes || ''
      }
    ]);
  };

  const handleAddMultipleRows = (count = 5) => {
    const lastRow = countUpRows[countUpRows.length - 1];
    const newRows = Array.from({ length: count }, (_, i) => ({
      id: 'tu-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 4),
      tag: lastRow ? lastRow.tag : 'DL1',
      floor: lastRow ? lastRow.floor : 'Ground',
      area: '',
      qty: 1,
      notes: ''
    }));
    setCountUpRows(prev => [...prev, ...newRows]);
  };

  const handleUpdateRow = (id, field, value) => {
    setCountUpRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      let formattedVal = value;
      if (field === 'tag') formattedVal = (value || '').toUpperCase();
      if (field === 'qty') formattedVal = Math.max(1, parseInt(value, 10) || 1);
      return { ...r, [field]: formattedVal };
    }));
  };

  const handleDeleteRow = (id) => {
    setCountUpRows(prev => prev.filter(r => r.id !== id));
  };

  const handleDuplicateRow = (id) => {
    const row = countUpRows.find(r => r.id === id);
    if (!row) return;
    const newId = 'tu-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const idx = countUpRows.findIndex(r => r.id === id);
    const updated = [...countUpRows];
    updated.splice(idx + 1, 0, { ...row, id: newId });
    setCountUpRows(updated);
  };

  const handleClearAllRows = () => {
    if (window.confirm("Are you sure you want to clear all Takeoff count-up rows?")) {
      setCountUpRows([]);
    }
  };

  // Bulk Paste Parser (handles TSV from Excel, CSV, or spaces)
  const handleProcessPaste = () => {
    if (!pasteRawText.trim()) {
      setShowPasteModal(false);
      return;
    }
    const lines = pasteRawText.trim().split(/\r?\n/);
    const parsedRows = [];
    
    lines.forEach((line, idx) => {
      if (!line.trim()) return;
      let parts = line.split('\t');
      if (parts.length < 2) parts = line.split(',');
      if (parts.length < 2) parts = line.split(';');

      const tag = (parts[0] || '').trim().toUpperCase();
      const floor = (parts[1] || 'Ground').trim();
      const area = (parts[2] || 'Area ' + (idx + 1)).trim();
      const qty = parseInt(parts[3] || '1', 10) || 1;
      const notes = (parts[4] || '').trim();

      if (tag) {
        parsedRows.push({
          id: 'tu-paste-' + Date.now() + '-' + idx,
          tag,
          floor,
          area,
          qty: Math.max(1, qty),
          notes
        });
      }
    });

    if (parsedRows.length > 0) {
      setCountUpRows(prev => [...prev, ...parsedRows]);
      alert(`Successfully imported ${parsedRows.length} count-up lines from clipboard!`);
    } else {
      alert("Could not parse rows. Please ensure columns are: Tag, Floor, Area, Quantity, Notes.");
    }
    setPasteRawText('');
    setShowPasteModal(false);
  };

  // -------------------------------------------------------------
  // Specification Mapping & Dynamic Accessories
  // -------------------------------------------------------------
  const openCatalogPicker = (tag, mode = 'product') => {
    setCatalogTargetTag(tag);
    setCatalogTargetMode(mode);
    setCatalogSearch('');
    setCatalogCategory('All');
    setCatalogModalOpen(true);
  };

  const handleSelectCatalogItem = async (product) => {
    if (!catalogTargetTag) return;

    if (catalogTargetMode === 'product') {
      // 1. Fetch any linked accessories from database
      let fetchedAccessories = [];
      try {
        const accRes = await fetch(`${API_BASE}/api/products/${product.id}/accessories`);
        if (accRes.ok) {
          const accData = await accRes.json();
          if (Array.isArray(accData)) {
            fetchedAccessories = accData.map(a => ({
              id: a.accessory_product_id || a.id,
              sku: a.sku,
              name: a.name,
              category: 'Accessory',
              cost_price: a.cost_price || 0,
              retail_price: a.retail_price || 0,
              ratio: 1.0,
              isDefault: true
            }));
          }
        }
      } catch (e) {
        console.warn("Could not load product accessories from DB:", e);
      }

      // Check if product requires an external driver based on specs
      if (
        product.driver_spec && 
        (!product.driver_incl || product.driver_incl.toLowerCase() !== 'yes') &&
        fetchedAccessories.length === 0
      ) {
        fetchedAccessories.push({
          id: 'acc-drv-' + Date.now(),
          sku: 'REMOTE-DRIVER',
          name: `Remote Driver (${product.driver_spec})`,
          category: 'Accessory',
          cost_price: 150,
          retail_price: 280,
          ratio: product.fittings_per_driver ? (1 / (parseFloat(product.fittings_per_driver) || 1)) : 1.0,
          isDefault: true
        });
      }

      setSpecifications(prev => ({
        ...prev,
        [catalogTargetTag]: {
          product,
          accessories: fetchedAccessories
        }
      }));
    } else if (catalogTargetMode === 'accessory') {
      const newAcc = {
        id: product.id,
        sku: product.sku || product.one_to_one_code || product.name,
        name: product.client_description || product.name,
        category: product.category || 'Accessory',
        cost_price: product.cost_price || 0,
        retail_price: product.retail_price || 0,
        ratio: 1.0,
        isDefault: false
      };

      setSpecifications(prev => {
        const currentSpec = prev[catalogTargetTag] || { product: null, accessories: [] };
        return {
          ...prev,
          [catalogTargetTag]: {
            ...currentSpec,
            accessories: [...(currentSpec.accessories || []), newAcc]
          }
        };
      });
    }

    setCatalogModalOpen(false);
  };

  const handleRemoveProductFromSpec = (tag) => {
    setSpecifications(prev => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
  };

  const handleUpdateAccessoryRatio = (tag, accIndex, newRatio) => {
    setSpecifications(prev => {
      const spec = prev[tag];
      if (!spec || !spec.accessories) return prev;
      const updatedAccessories = [...spec.accessories];
      updatedAccessories[accIndex] = {
        ...updatedAccessories[accIndex],
        ratio: Math.max(0.01, parseFloat(newRatio) || 1.0)
      };
      return {
        ...prev,
        [tag]: { ...spec, accessories: updatedAccessories }
      };
    });
  };

  const handleRemoveAccessory = (tag, accIndex) => {
    setSpecifications(prev => {
      const spec = prev[tag];
      if (!spec || !spec.accessories) return prev;
      const updatedAccessories = spec.accessories.filter((_, idx) => idx !== accIndex);
      return {
        ...prev,
        [tag]: { ...spec, accessories: updatedAccessories }
      };
    });
  };

  // -------------------------------------------------------------
  // Data Persistence (Cloud SQL & Parent Order)
  // -------------------------------------------------------------
  const handleSaveTakeoff = async () => {
    setIsSaving(true);
    const takeoffPayload = {
      countUpRows,
      specifications
    };

    try {
      if (onSaveTakeoffData) {
        await onSaveTakeoffData(takeoffPayload);
      }
      setLastSavedTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to save takeoff data:", err);
      alert("Error saving Takeoff & Spec data to server.");
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // BOQ Generation Logic
  // -------------------------------------------------------------
  const handleConfirmGenerateBOQ = () => {
    if (countUpRows.length === 0) {
      alert("No count-up rows to generate. Please add fixture counts first.");
      return;
    }

    const generatedItems = [];

    countUpRows.forEach((row, rowIdx) => {
      const tag = (row.tag || '').trim().toUpperCase();
      if (!tag) return;

      const spec = specifications[tag];
      const product = spec ? spec.product : null;
      const qty = Math.max(1, Number(row.qty) || 1);

      const fixtureId = 'I-' + Date.now() + '-' + rowIdx + '-' + Math.random().toString(36).substr(2, 4);
      
      if (product) {
        generatedItems.push({
          id: fixtureId,
          qty,
          type: product.category || 'Hardware',
          oneOneCode: product.one_to_one_code || '',
          code: product.sku || '',
          description: `[${tag}] ${product.client_description || product.name || ''}` + (row.notes ? ` — ${row.notes}` : ''),
          floor: row.floor || 'Ground',
          area: row.area || 'General Area',
          dimming: product.dimming_protocol || product.dimmable || 'Non-dim',
          brand: product.brand || '',
          supplier: product.supplier || product.supplier_name || orderSupplier || 'Molecule Dist.',
          unitCost: product.cost_price || 0,
          unitTrade: product.trade_price || 0,
          unitRetail: product.retail_price || 0,
          selection: product.selection || 'Selection',
          stockStatus: (product.stock_level || product.stock) > 0 ? 'Stock' : 'Ordered',
          eta: product.lead_time || '4 weeks',
          foh_code_description: product.foh_code_description || '',
          wetworks: product.wetworks || '',
          image_url: product.image_url || '',
          technical_image_url: product.technical_image_url || '',
          spec_sheet_url: product.qr_link || product.spec_sheet_url || ''
        });

        if (Array.isArray(spec.accessories) && spec.accessories.length > 0) {
          spec.accessories.forEach((acc, accIdx) => {
            const ratio = Number(acc.ratio) || 1.0;
            const accQty = Math.max(1, Math.ceil(qty * ratio));
            const accId = 'I-' + Date.now() + '-' + rowIdx + '-acc-' + accIdx + '-' + Math.random().toString(36).substr(2, 4);

            generatedItems.push({
              id: accId,
              qty: accQty,
              type: acc.category || 'Accessory',
              oneOneCode: acc.one_to_one_code || '',
              code: acc.sku || '',
              description: `[Acc for ${tag}] ${acc.name || acc.client_description || ''}` + (ratio !== 1.0 ? ` (${ratio} per fixture)` : ''),
              floor: row.floor || 'Ground',
              area: row.area || 'General Area',
              dimming: acc.dimming_protocol || acc.dimmable || '—',
              brand: acc.brand || product.brand || '',
              supplier: acc.supplier || acc.supplier_name || product.supplier || orderSupplier || 'Molecule Dist.',
              unitCost: acc.cost_price || 0,
              unitTrade: acc.trade_price || 0,
              unitRetail: acc.retail_price || 0,
              selection: 'Accessory',
              stockStatus: (acc.stock_level || acc.stock) > 0 ? 'Stock' : 'Ordered',
              eta: acc.lead_time || '4 weeks',
              foh_code_description: acc.foh_code_description || '',
              wetworks: acc.wetworks || '',
              image_url: acc.image_url || '',
              technical_image_url: acc.technical_image_url || '',
              spec_sheet_url: acc.qr_link || acc.spec_sheet_url || ''
            });
          });
        }
      } else {
        generatedItems.push({
          id: fixtureId,
          qty,
          type: 'Hardware',
          oneOneCode: '',
          code: tag,
          description: `[${tag}] Unconfigured Fixture` + (row.notes ? ` — ${row.notes}` : ''),
          floor: row.floor || 'Ground',
          area: row.area || 'General Area',
          dimming: 'Non-dim',
          brand: '',
          supplier: orderSupplier || 'Molecule Dist.',
          unitCost: 0,
          unitTrade: 0,
          unitRetail: 0,
          selection: 'Selection',
          stockStatus: 'Ordered',
          eta: '4 weeks',
          foh_code_description: '',
          wetworks: '',
          image_url: '',
          technical_image_url: '',
          spec_sheet_url: ''
        });
      }
    });

    setShowGenerateModal(false);

    if (onGenerateBOQ) {
      onGenerateBOQ(generatedItems, generateMode);
    }
  };

  const filteredCountUpRows = useMemo(() => {
    return countUpRows.filter(r => {
      if (floorFilter !== 'All' && r.floor !== floorFilter) return false;
      if (countUpSearch.trim()) {
        const q = countUpSearch.toLowerCase();
        return (
          (r.tag || '').toLowerCase().includes(q) ||
          (r.area || '').toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [countUpRows, floorFilter, countUpSearch]);

  const matrixData = useMemo(() => {
    const areasMap = new Map();
    countUpRows.forEach(r => {
      const areaKey = `${r.floor || 'Ground'} — ${r.area || 'Unassigned'}`;
      if (!areasMap.has(areaKey)) {
        areasMap.set(areaKey, { floor: r.floor || 'Ground', area: r.area || 'Unassigned', tags: {} });
      }
      const node = areasMap.get(areaKey);
      const t = (r.tag || '').toUpperCase();
      node.tags[t] = (node.tags[t] || 0) + (Number(r.qty) || 0);
    });
    return Array.from(areasMap.values());
  }, [countUpRows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* TOP STATUS & CONTROLS HEADER BAR */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--border)', 
        borderRadius: '8px', 
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
              color: '#fff', 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '11px', 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Sparkles size={12} /> UPSTREAM ACCELERATOR
            </span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Takeoff & Specification Engine
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
            Enter fixture counts by room & floor, map plan tags to master catalog items, configure dynamic accessories, and auto-compile directly into your BOQ spreadsheet.
          </p>
        </div>

        {/* METRICS & QUICK ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Fixtures Counted</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-info)' }}>{stats.totalQty}</div>
            </div>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Plan Tags</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {stats.configuredTags} / {stats.uniqueTagsCount} <span style={{ fontSize: '10px', fontWeight: 'normal', color: stats.pendingTags > 0 ? 'var(--text-warning)' : 'var(--text-success)' }}>({stats.pendingTags} pending)</span>
              </div>
            </div>
          </div>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleSaveTakeoff}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={14} /> {isSaving ? 'Saving...' : 'Save Takeoff'}
            {lastSavedTime && <span style={{ fontSize: '10px', opacity: 0.8 }}>({lastSavedTime})</span>}
          </button>

          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowGenerateModal(true)}
            style={{ 
              background: 'linear-gradient(135deg, #10b981, #059669)', 
              borderColor: '#059669',
              color: '#fff',
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontWeight: 600
            }}
          >
            <FileSpreadsheet size={14} /> 🚀 Generate into BOQ Spreadsheet
          </button>
        </div>
      </div>

      {/* INNER NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <button
          className={`btn btn-sm ${activeTab === 'countup' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('countup')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <List size={14} /> 1. Room-by-Room Count-Up ({countUpRows.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'spec' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('spec')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Sliders size={14} /> 2. Tag Specification & Accessories ({uniqueTags.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('summary')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Grid size={14} /> 3. Summary & Takeoff Matrix
        </button>
      </div>

      {/* TAB 1: COUNT-UP */}
      {activeTab === 'countup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-xs" onClick={() => handleAddRow()} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={12} /> Add Row
              </button>
              <button className="btn btn-secondary btn-xs" onClick={() => handleAddMultipleRows(5)}>
                + Add 5 Rows
              </button>
              <button 
                className="btn btn-secondary btn-xs" 
                onClick={() => setShowPasteModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FileText size={12} /> 📋 Paste from Excel / CSV
              </button>
              {countUpRows.length > 0 && (
                <button className="btn btn-ghost btn-xs" onClick={handleClearAllRows} style={{ color: 'var(--text-danger)' }}>
                  Clear All
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px' }}>
                <Search size={12} style={{ color: 'var(--text-secondary)', marginRight: '6px' }} />
                <input 
                  type="text" 
                  placeholder="Filter tag or room..." 
                  value={countUpSearch} 
                  onChange={e => setCountUpSearch(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '11px', color: 'var(--text-primary)', width: '130px' }}
                />
              </div>

              {uniqueFloors.length > 0 && (
                <select 
                  className="select select-xs" 
                  value={floorFilter} 
                  onChange={e => setFloorFilter(e.target.value)}
                  style={{ fontSize: '11px', height: '26px' }}
                >
                  <option value="All">All Floors ({countUpRows.length})</option>
                  {uniqueFloors.map(fl => (
                    <option key={fl} value={fl}>{fl}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflowX: 'auto', background: 'var(--bg-card)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 12px', width: '40px' }}>#</th>
                  <th style={{ padding: '8px 12px', width: '120px' }}>Plan Tag / Code</th>
                  <th style={{ padding: '8px 12px', width: '130px' }}>Floor Level</th>
                  <th style={{ padding: '8px 12px', minWidth: '180px' }}>Room / Area</th>
                  <th style={{ padding: '8px 12px', width: '90px' }}>Quantity</th>
                  <th style={{ padding: '8px 12px' }}>Mounting & Notes</th>
                  <th style={{ padding: '8px 12px', width: '140px' }}>Catalog Mapping</th>
                  <th style={{ padding: '8px 12px', width: '80px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCountUpRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No count-up entries found. Click <strong>+ Add Row</strong> or <strong>📋 Paste from Excel / CSV</strong> to begin your fixture takeoff.
                    </td>
                  </tr>
                ) : (
                  filteredCountUpRows.map((row, index) => {
                    const tag = (row.tag || '').trim().toUpperCase();
                    const isConfigured = specifications[tag]?.product;

                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {index + 1}
                        </td>
                        
                        <td style={{ padding: '6px 12px' }}>
                          <input 
                            type="text" 
                            className="input input-xs"
                            value={row.tag} 
                            placeholder="e.g. DL1"
                            onChange={e => handleUpdateRow(row.id, 'tag', e.target.value)}
                            style={{ 
                              width: '100%', 
                              fontWeight: 700, 
                              fontFamily: 'monospace', 
                              color: 'var(--text-info)',
                              textTransform: 'uppercase' 
                            }}
                          />
                        </td>

                        <td style={{ padding: '6px 12px' }}>
                          <input 
                            type="text" 
                            className="input input-xs"
                            value={row.floor} 
                            placeholder="Ground"
                            onChange={e => handleUpdateRow(row.id, 'floor', e.target.value)}
                            style={{ width: '100%' }}
                            list={`floors-list-${row.id}`}
                          />
                          <datalist id={`floors-list-${row.id}`}>
                            <option value="Basement" />
                            <option value="Ground" />
                            <option value="First Floor" />
                            <option value="Second Floor" />
                            <option value="Roof / Terrace" />
                            <option value="Exterior / Garden" />
                          </datalist>
                        </td>

                        <td style={{ padding: '6px 12px' }}>
                          <input 
                            type="text" 
                            className="input input-xs"
                            value={row.area} 
                            placeholder="e.g. Kitchen, Master Bedroom"
                            onChange={e => handleUpdateRow(row.id, 'area', e.target.value)}
                            style={{ width: '100%' }}
                          />
                        </td>

                        <td style={{ padding: '6px 12px' }}>
                          <input 
                            type="number" 
                            min="1"
                            className="input input-xs"
                            value={row.qty} 
                            onChange={e => handleUpdateRow(row.id, 'qty', e.target.value)}
                            style={{ width: '100%', fontWeight: 600, textAlign: 'right' }}
                          />
                        </td>

                        <td style={{ padding: '6px 12px' }}>
                          <input 
                            type="text" 
                            className="input input-xs"
                            value={row.notes} 
                            placeholder="e.g. Recessed 2.7m ceiling"
                            onChange={e => handleUpdateRow(row.id, 'notes', e.target.value)}
                            style={{ width: '100%', fontSize: '11px' }}
                          />
                        </td>

                        <td style={{ padding: '6px 12px' }}>
                          {isConfigured ? (
                            <span 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                color: 'var(--text-success)', 
                                fontSize: '11px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              onClick={() => setActiveTab('spec')}
                              title="Mapped! Click to view/edit specification"
                            >
                              <CheckCircle size={12} /> {specifications[tag].product.sku || 'Mapped'}
                            </span>
                          ) : (
                            <span 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                color: 'var(--text-warning)', 
                                fontSize: '11px',
                                background: 'rgba(245, 158, 11, 0.1)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              onClick={() => openCatalogPicker(tag, 'product')}
                              title="Click to select catalog product for this tag"
                            >
                              <AlertCircle size={12} /> Unassigned
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <button 
                              className="btn btn-ghost btn-xs" 
                              onClick={() => handleDuplicateRow(row.id)}
                              title="Duplicate row"
                              style={{ padding: '2px 4px' }}
                            >
                              <Copy size={12} />
                            </button>
                            <button 
                              className="btn btn-ghost btn-xs" 
                              onClick={() => handleDeleteRow(row.id)}
                              title="Delete row"
                              style={{ padding: '2px 4px', color: 'var(--text-danger)' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <button className="btn btn-ghost btn-xs" onClick={() => handleAddRow()} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={12} /> Add next row
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Showing {filteredCountUpRows.length} of {countUpRows.length} total rows
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: SPEC */}
      {activeTab === 'spec' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border)', 
            borderRadius: '6px', 
            padding: '12px 16px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <strong>Plan Code Mapping Engine:</strong> Select a master catalog fitting once for each unique Plan Tag (e.g. <code>DL1</code>). When compiling into the BOQ, every room having this tag will automatically inherit this fixture, pricing, and all attached accessories.
            </div>
            <button 
              className="btn btn-primary btn-xs"
              onClick={() => setShowGenerateModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
            >
              <FileSpreadsheet size={12} /> Generate BOQ
            </button>
          </div>

          {uniqueTags.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              No Plan Tags found yet. Head over to <strong>1. Room-by-Room Count-Up</strong> to enter fixture tags first.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
              {uniqueTags.map(tagInfo => {
                const tag = tagInfo.tag;
                const spec = specifications[tag];
                const product = spec ? spec.product : null;
                const accessories = (spec && spec.accessories) || [];

                return (
                  <div 
                    key={tag} 
                    style={{ 
                      background: 'var(--bg-card)', 
                      border: product ? '1px solid var(--border)' : '1px dashed var(--border-warning, #f59e0b)', 
                      borderRadius: '8px', 
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ 
                      background: 'var(--bg-secondary)', 
                      borderBottom: '1px solid var(--border)', 
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          background: 'var(--bg-info)', 
                          color: '#fff', 
                          fontFamily: 'monospace', 
                          fontWeight: 700, 
                          fontSize: '13px', 
                          padding: '3px 8px', 
                          borderRadius: '4px' 
                        }}>
                          {tag}
                        </span>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {tagInfo.totalQty} total fixtures
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            Across {tagInfo.areasCount} room(s) & {tagInfo.floorsCount} floor(s)
                          </div>
                        </div>
                      </div>

                      {product && (
                        <button 
                          className="btn btn-ghost btn-xs" 
                          onClick={() => handleRemoveProductFromSpec(tag)}
                          style={{ color: 'var(--text-danger)', fontSize: '11px' }}
                        >
                          Clear Mapping
                        </button>
                      )}
                    </div>

                    <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {product ? (
                        <div style={{ 
                          background: 'var(--bg-primary)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '6px', 
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                {product.brand || 'Catalog Product'} • {product.category || 'Hardware'}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                                {product.sku || product.one_to_one_code || 'Product'}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {product.client_description || product.name}
                              </div>
                            </div>
                            <button 
                              className="btn btn-secondary btn-xs"
                              onClick={() => openCatalogPicker(tag, 'product')}
                              style={{ fontSize: '10.5px' }}
                            >
                              Change
                            </button>
                          </div>

                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(3, 1fr)', 
                            gap: '8px', 
                            marginTop: '4px',
                            background: 'var(--bg-secondary)', 
                            padding: '8px', 
                            borderRadius: '4px',
                            fontSize: '11px' 
                          }}>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>Cost:</span> <strong>R {Number(product.cost_price || 0).toLocaleString()}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>Trade:</span> <strong>R {Number(product.trade_price || 0).toLocaleString()}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>Retail:</span> <strong style={{ color: 'var(--text-success)' }}>R {Number(product.retail_price || 0).toLocaleString()}</strong>
                            </div>
                          </div>

                          {(product.driver_spec || product.cutout || product.system_power > 0) && (
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              {product.driver_spec && <span>⚡ Driver: <strong>{product.driver_spec}</strong></span>}
                              {product.cutout && <span>⭕ Cutout: <strong>{product.cutout}</strong></span>}
                              {product.system_power > 0 && <span>💡 Power: <strong>{product.system_power}W</strong></span>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ 
                          padding: '20px', 
                          textAlign: 'center', 
                          border: '1px dashed var(--border)', 
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            No master product selected for <strong>{tag}</strong>.
                          </div>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => openCatalogPicker(tag, 'product')}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Search size={13} /> Select Product from Catalog
                          </button>
                        </div>
                      )}

                      {product && (
                        <div style={{ marginTop: '6px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Layers size={13} style={{ color: 'var(--text-info)' }} /> Dynamic Accessories ({accessories.length})
                            </span>
                            <button 
                              className="btn btn-ghost btn-xs"
                              onClick={() => openCatalogPicker(tag, 'accessory')}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: 'var(--text-info)' }}
                            >
                              <Plus size={11} /> Add Accessory
                            </button>
                          </div>

                          {accessories.length === 0 ? (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '6px 0' }}>
                              No accessories attached. Click "+ Add Accessory" if this fixture requires a driver, plaster kit, or optical attachment.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {accessories.map((acc, accIdx) => {
                                return (
                                  <div 
                                    key={acc.id + '-' + accIdx}
                                    style={{ 
                                      background: 'var(--bg-primary)', 
                                      border: '1px solid var(--border)', 
                                      borderRadius: '4px', 
                                      padding: '6px 8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      fontSize: '11px',
                                      gap: '8px'
                                    }}
                                  >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {acc.sku || acc.name}
                                      </div>
                                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {acc.name} • Cost: R {Number(acc.cost_price || 0).toLocaleString()} • Ret: R {Number(acc.retail_price || 0).toLocaleString()}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Ratio:</span>
                                      <input 
                                        type="number" 
                                        step="0.05"
                                        min="0.01"
                                        value={acc.ratio !== undefined ? acc.ratio : 1.0}
                                        onChange={e => handleUpdateAccessoryRatio(tag, accIdx, e.target.value)}
                                        style={{ width: '48px', height: '22px', fontSize: '11px', textAlign: 'center' }}
                                        className="input input-xs"
                                        title="Ratio of accessories per fixture (1.0 = 1:1, 0.25 = 1 per 4 fixtures)"
                                      />
                                    </div>

                                    <button 
                                      className="btn btn-ghost btn-xs"
                                      onClick={() => handleRemoveAccessory(tag, accIdx)}
                                      style={{ padding: '2px 4px', color: 'var(--text-danger)' }}
                                      title="Remove accessory"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUMMARY MATRIX */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border)', 
            borderRadius: '6px', 
            padding: '12px 16px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong>Cross-Tabulation Matrix:</strong> Summary of fixture counts mapped across rooms and floor levels.
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
              Total Fixtures: <span style={{ color: 'var(--text-info)' }}>{stats.totalQty}</span>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflowX: 'auto', background: 'var(--bg-card)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 12px' }}>Floor & Room / Area</th>
                  {uniqueTags.map(ut => (
                    <th key={ut.tag} style={{ padding: '8px 12px', textAlign: 'center', width: '80px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-info)' }}>{ut.tag}</span>
                    </th>
                  ))}
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '90px' }}>Room Total</th>
                </tr>
              </thead>
              <tbody>
                {matrixData.length === 0 ? (
                  <tr>
                    <td colSpan={uniqueTags.length + 2} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No count-up rows available to generate matrix.
                    </td>
                  </tr>
                ) : (
                  matrixData.map((row, idx) => {
                    let rowSum = 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginRight: '6px' }}>[{row.floor}]</span>
                          {row.area}
                        </td>
                        {uniqueTags.map(ut => {
                          const q = row.tags[ut.tag] || 0;
                          rowSum += q;
                          return (
                            <td key={ut.tag} style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {q > 0 ? (
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{q}</span>
                              ) : (
                                <span style={{ color: 'var(--border)' }}>—</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-info)' }}>
                          {rowSum}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {matrixData.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>Total by Tag</td>
                    {uniqueTags.map(ut => (
                      <td key={ut.tag} style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-info)' }}>
                        {ut.totalQty}
                      </td>
                    ))}
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-success)', fontSize: '13px' }}>
                      {stats.totalQty}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CATALOG SEARCH & PICKER */}
      {catalogModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '720px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                <Search size={16} style={{ color: 'var(--text-info)' }} /> 
                {catalogTargetMode === 'product' ? (
                  <span>Select Master Fixture for Tag <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{catalogTargetTag}</strong></span>
                ) : (
                  <span>Add Accessory for Tag <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{catalogTargetTag}</strong></span>
                )}
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setCatalogModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px' }}>
                <Search size={14} style={{ color: 'var(--text-secondary)', marginRight: '8px' }} />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search catalog by code, name, brand, or spec..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '12px' }}
                />
              </div>
              <select 
                className="select select-sm"
                value={catalogCategory}
                onChange={e => setCatalogCategory(e.target.value)}
                style={{ width: '150px', fontSize: '12px' }}
              >
                <option value="All">All Categories</option>
                <option value="Downlight">Downlight</option>
                <option value="Spotlight">Spotlight</option>
                <option value="Linear">Linear</option>
                <option value="Pendant">Pendant</option>
                <option value="Outdoor">Outdoor</option>
                <option value="Track">Track</option>
                <option value="Accessory">Accessory / Driver</option>
              </select>
            </div>

            <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {catalogLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  <RefreshCw size={18} className="spin" style={{ marginBottom: '8px' }} />
                  <div>Searching master catalog...</div>
                </div>
              ) : catalogResults.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  No catalog products found matching "{catalogSearch}".
                </div>
              ) : (
                catalogResults.map(prod => (
                  <div 
                    key={prod.id}
                    onClick={() => handleSelectCatalogItem(prod)}
                    style={{ 
                      background: 'var(--bg-primary)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '6px', 
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-info)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-info)', fontSize: '12.5px' }}>
                          {prod.sku || prod.one_to_one_code || 'PROD'}
                        </span>
                        {prod.brand && (
                          <span style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                            {prod.brand}
                          </span>
                        )}
                        {prod.category && (
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            • {prod.category}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {prod.client_description || prod.name}
                      </div>
                      {prod.driver_spec && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          ⚡ Driver: {prod.driver_spec}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-success)' }}>
                        R {Number(prod.retail_price || 0).toLocaleString()}
                      </div>
                      <button className="btn btn-primary btn-xs" style={{ fontSize: '10.5px', pointerEvents: 'none' }}>
                        Select
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setCatalogModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK PASTE */}
      {showPasteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="card-head" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: 'var(--text-info)' }} /> Paste Count-Up from Excel / CSV
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowPasteModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                Copy columns from your drawing schedule or Excel sheet and paste below. Expected order:
              </p>
              <div style={{ background: 'var(--bg-primary)', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-info)' }}>
                [Tag] &lt;tab&gt; [Floor] &lt;tab&gt; [Room] &lt;tab&gt; [Qty] &lt;tab&gt; [Notes]
              </div>
              <textarea 
                rows={8}
                value={pasteRawText}
                onChange={e => setPasteRawText(e.target.value)}
                placeholder={"DL1\tGround\tKitchen\t6\tRecessed\nSP1\tGround\tLiving\t4\tSpotlight"}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '11.5px', fontFamily: 'monospace', outline: 'none' }}
              />
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPasteModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleProcessPaste}>Import Rows</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GENERATE INTO BOQ CONFIRMATION */}
      {showGenerateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            
            <div className="card-head" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <FileSpreadsheet size={16} style={{ color: 'var(--text-success)' }} /> Compile into BOQ Spreadsheet
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowGenerateModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                This will expand your <strong>{countUpRows.length} count-up entries</strong> into room-by-room items and accessories, then populate them into the BOQ Spreadsheet.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  <input 
                    type="radio" 
                    name="genMode" 
                    value="append" 
                    checked={generateMode === 'append'} 
                    onChange={() => setGenerateMode('append')}
                  />
                  <span><strong>Append to Current BOQ</strong> (Keeps existing manual rows & appends new items)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  <input 
                    type="radio" 
                    name="genMode" 
                    value="replace" 
                    checked={generateMode === 'replace'} 
                    onChange={() => setGenerateMode('replace')}
                  />
                  <span style={{ color: 'var(--text-danger)' }}><strong>Replace Current BOQ</strong> (Clears current spreadsheet and generates fresh from takeoff)</span>
                </label>
              </div>

              {stats.pendingTags > 0 && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '10px 12px', fontSize: '11.5px', color: 'var(--text-warning)' }}>
                  ⚠️ You have <strong>{stats.pendingTags} unassigned plan tag(s)</strong>. They will be generated as placeholder rows with their plan tag so no counts are lost.
                </div>
              )}
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleConfirmGenerateBOQ}
                style={{ 
                  background: 'linear-gradient(135deg, #10b981, #059669)', 
                  borderColor: '#059669', 
                  color: '#fff',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={14} /> Generate & Open BOQ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

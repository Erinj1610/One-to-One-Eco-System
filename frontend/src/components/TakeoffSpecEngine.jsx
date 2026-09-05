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
  Sliders, 
  Grid, 
  List, 
  Check, 
  RefreshCw, 
  FileText, 
  Eye, 
  Download, 
  RotateCcw, 
  ArrowRight,
  Maximize2,
  ExternalLink,
  ChevronDown,
  X,
  Info,
  Compass
} from 'lucide-react';
import { API_BASE } from '../api_config';
import CadImportModal from './CadImportModal';

// Standard room suggestions for smart autocomplete
const COMMON_ROOM_SUGGESTIONS = [
  'Entrance Hall', 'Foyer', 'Living Room', 'Dining Room', 'Kitchen', 'Scullery', 'Pantry',
  'Master Bedroom', 'Master Ensuite', 'Master Dressing', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4',
  'Guest Bedroom', 'Guest Bathroom', 'Guest WC / Powder', 'Passage / Hallway', 'Staircase',
  'Study / Home Office', 'TV Lounge', 'Bar / Entertainment', 'Covered Patio', 'Balcony',
  'Terrace', 'Garage', 'Exterior Façade', 'Garden / Pathway', 'Pool Area', 'BOH / Staff'
];

const FLOOR_LEVEL_SUGGESTIONS = [
  'Basement', 'Lower Ground', 'Ground', 'First Floor', 'Second Floor', 'Roof / Terrace', 'Exterior / Garden'
];

const CATEGORY_OPTIONS = [
  { label: 'All Categories', value: 'All' },
  { label: 'Downlights', value: 'Downlight' },
  { label: 'Spotlights', value: 'Spotlight' },
  { label: 'Pendants & Decorative', value: 'Pendant' },
  { label: 'Linear Profiles', value: 'Linear' },
  { label: 'Track Systems', value: 'Track' },
  { label: 'LED Strips', value: 'LEDStrip' },
  { label: 'Exterior / Outdoor', value: 'Outdoor' },
  { label: 'Accessories & Drivers', value: 'Accessory' }
];

export default function TakeoffSpecEngine({
  orderId,
  projectKey,
  orderSupplier,
  initialTakeoffData,
  onSaveTakeoffData,
  onGenerateBOQ,
  onCancel
}) {
  // Navigation tabs: 'countup' | 'spec' | 'summary'
  const [activeTab, setActiveTab] = useState('countup');

  // Count-Up Rows: [{ id, tag, floor, area, qty, notes }]
  const [countUpRows, setCountUpRows] = useState(() => {
    if (initialTakeoffData && Array.isArray(initialTakeoffData.countUpRows) && initialTakeoffData.countUpRows.length > 0) {
      return initialTakeoffData.countUpRows;
    }
    return [
      { id: 'tu-' + Date.now() + '-1', tag: 'DL1', floor: 'Ground', area: 'Kitchen', qty: 6, notes: 'Recessed downlight' },
      { id: 'tu-' + Date.now() + '-2', tag: 'DL1', floor: 'Ground', area: 'Living', qty: 8, notes: 'Recessed downlight' },
      { id: 'tu-' + Date.now() + '-3', tag: 'SP1', floor: 'Ground', area: 'Kitchen Island', qty: 3, notes: 'Pendant light' }
    ];
  });

  // Specifications: { [tag]: { product, customCost, customTrade, customRetail, accessories: [] } }
  const [specifications, setSpecifications] = useState(() => {
    if (initialTakeoffData && initialTakeoffData.specifications && typeof initialTakeoffData.specifications === 'object') {
      return initialTakeoffData.specifications;
    }
    return {};
  });

  // UI & Feedback state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Search & Filter in Count-Up
  const [countUpSearch, setCountUpSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState('All');

  // Bulk Paste Modal
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');

  // CAD Drawing Ingestion Modal
  const [showCadModal, setShowCadModal] = useState(false);

  // Specification Section Sub-Tab ('fixtures' | 'leds' | 'tracks')
  const [specSubTab, setSpecSubTab] = useState('fixtures');

  // Summary & Cross-Tabulation Matrix Sub-Tab ('fixtures' | 'leds' | 'tracks' | 'all')
  const [summarySubTab, setSummarySubTab] = useState('fixtures');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixFloorFilter, setMatrixFloorFilter] = useState('All');
  const [hideEmptyRooms, setHideEmptyRooms] = useState(false);

  // Catalog Picker Modal State
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogTargetTag, setCatalogTargetTag] = useState(null);
  const [catalogTargetMode, setCatalogTargetMode] = useState('product'); // 'product' | 'accessory' | 'led_profile' | 'led_strip' | 'led_driver' | 'track_rail' | 'track_spot' | 'track_driver'
  const [catalogTargetSubId, setCatalogTargetSubId] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('All');
  const [catalogResults, setCatalogResults] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Fitting Specifications Modal (Preview before / after adding)
  const [inspectedProduct, setInspectedProduct] = useState(null);
  const [inspectedForTag, setInspectedForTag] = useState(null);

  // Copy Spec to another tag modal
  const [copySourceTag, setCopySourceTag] = useState(null);
  const [copyTargetTag, setCopyTargetTag] = useState('');
  const [showCustomCopyInput, setShowCustomCopyInput] = useState(false);

  // Generate BOQ Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMode, setGenerateMode] = useState('append'); // 'append' | 'replace'
  const [includeRoomSpacers, setIncludeRoomSpacers] = useState(true);

  // Focus ref for auto-focusing newly added rows
  const newRowTagInputRef = useRef(null);

  // Mark unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [countUpRows, specifications]);

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

    const timer = setTimeout(fetchCatalog, 250);
    return () => clearTimeout(timer);
  }, [catalogModalOpen, catalogSearch, catalogCategory]);

  // Derived: Unique tags extracted from Count-Up
  const uniqueTags = useMemo(() => {
    const tagsMap = new Map();
    countUpRows.forEach(row => {
      const t = (row.tag || '').trim().toUpperCase();
      if (t) {
        if (!tagsMap.has(t)) {
          tagsMap.set(t, { 
            tag: t, 
            totalQty: 0, 
            totalMeters: 0, 
            unit: row.unit || 'pcs', 
            itemType: row.itemType || 'fixture',
            areas: new Set(), 
            floors: new Set(),
            runs: []
          });
        }
        const info = tagsMap.get(t);
        const q = Math.max(0, Number(row.qty) || 0);
        info.totalQty += q;
        const m = Number(row.lengthMeters) || (row.unit === 'm' ? q : 0);
        info.totalMeters += m;
        if (row.itemType && row.itemType !== 'fixture') {
          info.itemType = row.itemType;
        }
        if (row.unit === 'm') info.unit = 'm';
        if (row.area) info.areas.add(row.area.trim());
        if (row.floor) info.floors.add(row.floor.trim());
        info.runs.push(row);
      }
    });

    return Array.from(tagsMap.values()).map(item => {
      let inferredType = item.itemType || 'fixture';
      if (inferredType === 'fixture') {
        const u = item.tag.toUpperCase();
        if (u.startsWith('L-') || u.startsWith('LED') || u.startsWith('LF_') || u.startsWith('LF-') || u.startsWith('LIN') || item.unit === 'm' || item.totalMeters > 0) {
          inferredType = 'linear_led';
        } else if (u.startsWith('TRK') || u.startsWith('TRACK')) {
          inferredType = 'track_system';
        }
      }
      return {
        ...item,
        itemType: inferredType,
        totalMeters: Math.round(item.totalMeters * 100) / 100,
        areasCount: item.areas.size,
        floorsCount: item.floors.size
      };
    });
  }, [countUpRows]);

  const pointFixtureTags = useMemo(() => {
    return uniqueTags.filter(ut => (specifications[ut.tag]?.itemType || ut.itemType) === 'fixture');
  }, [uniqueTags, specifications]);

  const linearLedTags = useMemo(() => {
    return uniqueTags.filter(ut => (specifications[ut.tag]?.itemType || ut.itemType) === 'linear_led');
  }, [uniqueTags, specifications]);

  const trackSystemTags = useMemo(() => {
    return uniqueTags.filter(ut => (specifications[ut.tag]?.itemType || ut.itemType) === 'track_system');
  }, [uniqueTags, specifications]);

  // Derived: Unique floors
  const uniqueFloors = useMemo(() => {
    const s = new Set();
    countUpRows.forEach(r => { if (r.floor && r.floor.trim()) s.add(r.floor.trim()); });
    return Array.from(s);
  }, [countUpRows]);

  // Target plan tags available for specification copying
  const availableTargetTags = useMemo(() => {
    if (!copySourceTag) return [];
    return uniqueTags.filter(ut => ut.tag !== copySourceTag);
  }, [uniqueTags, copySourceTag]);

  // Dynamic suggestions for Count-Up: user-typed entries automatically appear in lower rows alongside standard presets
  const dynamicFloorSuggestions = useMemo(() => {
    const custom = countUpRows
      .map(r => (r.floor || '').trim())
      .filter(Boolean);
    const seen = new Set();
    const result = [];
    [...custom, ...FLOOR_LEVEL_SUGGESTIONS].forEach(item => {
      const lower = item.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(item);
      }
    });
    return result;
  }, [countUpRows]);

  const dynamicRoomSuggestions = useMemo(() => {
    const custom = countUpRows
      .map(r => (r.area || '').trim())
      .filter(Boolean);
    const seen = new Set();
    const result = [];
    [...custom, ...COMMON_ROOM_SUGGESTIONS].forEach(item => {
      const lower = item.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(item);
      }
    });
    return result;
  }, [countUpRows]);

  const dynamicTagSuggestions = useMemo(() => {
    const custom = countUpRows
      .map(r => (r.tag || '').trim().toUpperCase())
      .filter(Boolean);
    return Array.from(new Set(custom));
  }, [countUpRows]);

  // Derived: Stats
  const stats = useMemo(() => {
    const totalRows = countUpRows.length;
    const totalQty = countUpRows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const configuredTags = uniqueTags.filter(ut => {
      const spec = specifications[ut.tag];
      if (!spec) return false;
      const itemType = spec.itemType || ut.itemType || 'fixture';
      if (itemType === 'linear_led') {
        return Boolean(spec.ledConfig?.profileProduct || spec.ledConfig?.stripProduct);
      }
      if (itemType === 'track_system') {
        return Boolean(spec.trackConfig?.railProduct || (spec.trackConfig?.spots && spec.trackConfig.spots.length > 0));
      }
      return Boolean(spec.product);
    }).length;
    
    // Financial estimates
    let estimatedCost = 0;
    let estimatedRetail = 0;

    countUpRows.forEach(row => {
      const tag = (row.tag || '').trim().toUpperCase();
      const spec = specifications[tag];
      const qty = Number(row.qty) || 0;
      const itemType = spec?.itemType || row.itemType || 'fixture';

      if (spec && itemType === 'linear_led') {
        const rowLen = Number(row.lengthMeters) || (row.unit === 'm' ? Number(row.qty) : (Number(row.qty) || 3));
        const profMeters = spec.ledConfig?.profileMeters !== undefined ? Number(spec.ledConfig.profileMeters) : rowLen;
        const stripMeters = spec.ledConfig?.stripMeters !== undefined ? Number(spec.ledConfig.stripMeters) : rowLen;
        const drvQty = spec.ledConfig?.driverQty !== undefined ? Number(spec.ledConfig.driverQty) : 1;

        const profCost = Number(spec.ledConfig?.profileCost !== undefined ? spec.ledConfig.profileCost : (spec.ledConfig?.profileProduct?.cost_price || 0));
        const profRet = Number(spec.ledConfig?.profileRetail !== undefined ? spec.ledConfig.profileRetail : (spec.ledConfig?.profileProduct?.retail_price || 0));
        const stripCost = Number(spec.ledConfig?.stripCost !== undefined ? spec.ledConfig.stripCost : (spec.ledConfig?.stripProduct?.cost_price || 0));
        const stripRet = Number(spec.ledConfig?.stripRetail !== undefined ? spec.ledConfig.stripRetail : (spec.ledConfig?.stripProduct?.retail_price || 0));
        const drvCost = Number(spec.ledConfig?.driverCost !== undefined ? spec.ledConfig.driverCost : (spec.ledConfig?.driverProduct?.cost_price || 0));
        const drvRet = Number(spec.ledConfig?.driverRetail !== undefined ? spec.ledConfig.driverRetail : (spec.ledConfig?.driverProduct?.retail_price || 0));

        estimatedCost += (profMeters * profCost) + (stripMeters * stripCost) + (drvQty * drvCost);
        estimatedRetail += (profMeters * profRet) + (stripMeters * stripRet) + (drvQty * drvRet);
      } else if (spec && itemType === 'track_system') {
        const rowLen = Number(row.lengthMeters) || (row.unit === 'm' ? Number(row.qty) : (Number(row.qty) || 3));
        const railMeters = spec.trackConfig?.railMeters !== undefined ? Number(spec.trackConfig.railMeters) : rowLen;
        const drvQty = spec.trackConfig?.driverQty !== undefined ? Number(spec.trackConfig.driverQty) : 1;

        const railCost = Number(spec.trackConfig?.railCost !== undefined ? spec.trackConfig.railCost : (spec.trackConfig?.railProduct?.cost_price || 0));
        const railRet = Number(spec.trackConfig?.railRetail !== undefined ? spec.trackConfig.railRetail : (spec.trackConfig?.railProduct?.retail_price || 0));
        const drvCost = Number(spec.trackConfig?.driverCost !== undefined ? spec.trackConfig.driverCost : (spec.trackConfig?.driverProduct?.cost_price || 0));
        const drvRet = Number(spec.trackConfig?.driverRetail !== undefined ? spec.trackConfig.driverRetail : (spec.trackConfig?.driverProduct?.retail_price || 0));

        let spotsCost = 0;
        let spotsRet = 0;
        if (Array.isArray(spec.trackConfig?.spots)) {
          spec.trackConfig.spots.forEach(sp => {
            spotsCost += (Number(sp.qty || 1) * Number(sp.cost_price || 0));
            spotsRet += (Number(sp.qty || 1) * Number(sp.retail_price || 0));
          });
        }

        estimatedCost += (railMeters * railCost) + spotsCost + (drvQty * drvCost);
        estimatedRetail += (railMeters * railRet) + spotsRet + (drvQty * drvRet);
      } else if (spec && spec.product) {
        const c = spec.customCost !== undefined ? Number(spec.customCost) : Number(spec.product.cost_price || 0);
        const r = spec.customRetail !== undefined ? Number(spec.customRetail) : Number(spec.product.retail_price || 0);
        estimatedCost += (qty * c);
        estimatedRetail += (qty * r);
      }

      // Dynamic accessories across all item types (fixtures, linear leds, tracks)
      if (spec && Array.isArray(spec.accessories)) {
        spec.accessories.forEach(acc => {
          const accUnits = acc.qtyPerFitting !== undefined 
            ? Math.max(1, parseInt(acc.qtyPerFitting, 10) || 1) 
            : (acc.ratio ? Math.max(1, Math.round(Number(acc.ratio))) : 1);
          const mult = itemType === 'fixture' ? qty : 1;
          const accQty = mult * accUnits;
          const acCost = acc.customCost !== undefined ? Number(acc.customCost) : Number(acc.cost_price || 0);
          const acRet = acc.customRetail !== undefined ? Number(acc.customRetail) : Number(acc.retail_price || 0);
          estimatedCost += (accQty * acCost);
          estimatedRetail += (accQty * acRet);
        });
      }
    });

    const estimatedMargin = estimatedRetail > 0 
      ? Math.round(((estimatedRetail - estimatedCost) / estimatedRetail) * 100)
      : 0;

    return {
      totalRows,
      totalQty,
      uniqueTagsCount: uniqueTags.length,
      configuredTags,
      pendingTags: uniqueTags.length - configuredTags,
      estimatedCost,
      estimatedRetail,
      estimatedMargin
    };
  }, [countUpRows, uniqueTags, specifications]);

  // -------------------------------------------------------------
  // Count-Up Row Operations
  // -------------------------------------------------------------
  const handleAddRow = (defaults = {}, focusAfter = true) => {
    const newId = 'tu-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const lastRow = countUpRows[countUpRows.length - 1];
    const newRow = {
      id: newId,
      tag: defaults.tag || (lastRow ? lastRow.tag : 'DL1'),
      floor: defaults.floor || (lastRow ? lastRow.floor : 'Ground'),
      area: defaults.area || (lastRow ? lastRow.area : ''),
      qty: defaults.qty || 1,
      notes: defaults.notes || ''
    };
    setCountUpRows(prev => [...prev, newRow]);

    if (focusAfter) {
      setTimeout(() => {
        if (newRowTagInputRef.current) {
          newRowTagInputRef.current.focus();
        }
      }, 50);
    }
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
      if (field === 'qty') {
        const parsed = parseFloat(value);
        formattedVal = isNaN(parsed) ? 1 : Math.max(0.01, parsed);
      }
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

  // Keyboard navigation on row input
  const handleKeyDown = (e, index, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If on the last row and in notes or qty, automatically add next row!
      if (index === countUpRows.length - 1 && (field === 'notes' || field === 'qty')) {
        handleAddRow();
      } else {
        // Focus the next row's same field or tag
        const nextInput = document.querySelector(`[data-row-index="${index + 1}"][data-field="${field}"]`);
        if (nextInput) nextInput.focus();
      }
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

  // CAD Import Handler (Append or Replace)
  const handleCadImport = (items, mode) => {
    if (!items || !items.length) return;
    const newRows = items.map((item, idx) => ({
      id: 'tu-cad-' + Date.now() + '-' + idx,
      tag: (item.tag || '').trim().toUpperCase(),
      floor: (item.floor || 'Ground').trim(),
      area: (item.area || 'Landscape').trim(),
      qty: Math.max(0.01, parseFloat(item.qty) || 1),
      unit: item.unit || (item.itemType === 'linear_led' || item.itemType === 'track_system' ? 'm' : 'pcs'),
      itemType: item.itemType || 'fixture',
      lengthMeters: Number(item.lengthMeters) || 0,
      runIndex: Number(item.runIndex) || 0,
      notes: item.notes || ''
    }));

    if (mode === 'replace') {
      setCountUpRows(newRows);
    } else {
      setCountUpRows(prev => [...prev, ...newRows]);
    }
    setHasUnsavedChanges(true);
  };

  // -------------------------------------------------------------
  // Specification Mapping & Dynamic Accessories
  // -------------------------------------------------------------
  const openCatalogPicker = (tag, mode = 'product', defaultCategory = 'All', subId = null) => {
    setCatalogTargetTag(tag);
    setCatalogTargetMode(mode);
    setCatalogTargetSubId(subId);
    setCatalogSearch('');
    setCatalogCategory(defaultCategory);
    setCatalogModalOpen(true);
  };

  const handleSelectCatalogItem = async (product, targetTag = null) => {
    const activeTag = targetTag || catalogTargetTag;
    if (!activeTag) return;

    if (catalogTargetMode === 'product') {
      // 1. Fetch linked accessories from DB
      let fetchedAccessories = [];
      try {
        const accRes = await fetch(`${API_BASE}/api/products/${product.id}/accessories`);
        if (accRes.ok) {
          const accData = await accRes.json();
          if (Array.isArray(accData)) {
            fetchedAccessories = accData.map(a => ({
              ...a,
              product: a,
              id: a.accessory_product_id || a.id,
              sku: a.sku,
              name: a.name,
              category: 'Accessory',
              cost_price: a.cost_price || 0,
              retail_price: a.retail_price || 0,
              customCost: a.cost_price || 0,
              customRetail: a.retail_price || 0,
              qtyPerFitting: 1,
              ratio: 1.0,
              isDefault: true
            }));
          }
        }
      } catch (e) {
        console.warn("Could not load product accessories from DB:", e);
      }

      // Check if external driver needed
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
          customCost: 150,
          customRetail: 280,
          qtyPerFitting: 1,
          ratio: 1.0,
          isDefault: true
        });
      }

      setSpecifications(prev => ({
        ...prev,
        [activeTag]: {
          product,
          customCost: product.cost_price !== undefined ? Number(product.cost_price) : 0,
          customTrade: product.trade_price !== undefined ? Number(product.trade_price) : 0,
          customRetail: product.retail_price !== undefined ? Number(product.retail_price) : 0,
          accessories: fetchedAccessories
        }
      }));
    } else if (catalogTargetMode === 'accessory') {
      const newAcc = {
        ...product,
        id: product.id,
        product: product,
        sku: product.sku || product.one_to_one_code || product.name,
        name: product.client_description || product.name,
        category: product.category || 'Accessory',
        cost_price: product.cost_price || 0,
        retail_price: product.retail_price || 0,
        customCost: product.cost_price || 0,
        customRetail: product.retail_price || 0,
        qtyPerFitting: 1,
        ratio: 1.0,
        isDefault: false
      };

      setSpecifications(prev => {
        const currentSpec = prev[activeTag] || { 
          product: null, 
          customCost: 0, 
          customTrade: 0, 
          customRetail: 0, 
          accessories: [] 
        };
        return {
          ...prev,
          [activeTag]: {
            ...currentSpec,
            accessories: [...(currentSpec.accessories || []), newAcc]
          }
        };
      });
    } else if (catalogTargetMode === 'led_profile') {
      setSpecifications(prev => {
        const current = prev[activeTag] || {};
        const ledConfig = current.ledConfig || {};
        return {
          ...prev,
          [activeTag]: {
            ...current,
            itemType: 'linear_led',
            ledConfig: {
              ...ledConfig,
              profileProduct: product,
              profileName: product.client_description || product.name,
              profileSku: product.sku || product.one_to_one_code,
              profileCost: product.cost_price !== undefined ? Number(product.cost_price) : 0,
              profileTrade: product.trade_price !== undefined ? Number(product.trade_price) : 0,
              profileRetail: product.retail_price !== undefined ? Number(product.retail_price) : 0
            }
          }
        };
      });
    } else if (catalogTargetMode === 'led_strip') {
      setSpecifications(prev => {
        const current = prev[activeTag] || {};
        const ledConfig = current.ledConfig || {};
        const w = parseFloat(product.wattage) || ledConfig.stripWattsPerMeter || 14.4;
        return {
          ...prev,
          [activeTag]: {
            ...current,
            itemType: 'linear_led',
            ledConfig: {
              ...ledConfig,
              stripProduct: product,
              stripName: product.client_description || product.name,
              stripSku: product.sku || product.one_to_one_code,
              stripWattsPerMeter: w,
              stripCost: product.cost_price !== undefined ? Number(product.cost_price) : 0,
              stripTrade: product.trade_price !== undefined ? Number(product.trade_price) : 0,
              stripRetail: product.retail_price !== undefined ? Number(product.retail_price) : 0
            }
          }
        };
      });
    } else if (catalogTargetMode === 'led_driver') {
      setSpecifications(prev => {
        const current = prev[activeTag] || {};
        const ledConfig = current.ledConfig || {};
        const w = parseFloat(product.wattage) || ledConfig.driverWattage || 150;
        return {
          ...prev,
          [activeTag]: {
            ...current,
            itemType: 'linear_led',
            ledConfig: {
              ...ledConfig,
              driverProduct: product,
              driverName: product.client_description || product.name,
              driverSku: product.sku || product.one_to_one_code,
              driverWattage: w,
              driverCost: product.cost_price !== undefined ? Number(product.cost_price) : 0,
              driverTrade: product.trade_price !== undefined ? Number(product.trade_price) : 0,
              driverRetail: product.retail_price !== undefined ? Number(product.retail_price) : 0
            }
          }
        };
      });
    } else if (catalogTargetMode === 'track_rail') {
      setSpecifications(prev => {
        const current = prev[activeTag] || {};
        const trackConfig = current.trackConfig || {};
        return {
          ...prev,
          [activeTag]: {
            ...current,
            itemType: 'track_system',
            trackConfig: {
              ...trackConfig,
              railProduct: product,
              railName: product.client_description || product.name,
              railSku: product.sku || product.one_to_one_code,
              railCost: product.cost_price !== undefined ? Number(product.cost_price) : 0,
              railTrade: product.trade_price !== undefined ? Number(product.trade_price) : 0,
              railRetail: product.retail_price !== undefined ? Number(product.retail_price) : 0
            }
          }
        };
      });
    } else if (catalogTargetMode === 'track_spot') {
      setSpecifications(prev => {
        const current = prev[activeTag] || {};
        const trackConfig = current.trackConfig || {};
        const currentSpots = trackConfig.spots || [];
        const newSpot = {
          id: 'spot-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          productId: product.id,
          product: product,
          name: product.client_description || product.name,
          sku: product.sku || product.one_to_one_code,
          qty: 1,
          beamAngle: product.beam_angle || '24°',
          cct: product.color_temperature || product.cct || '3000K',
          wattage: parseFloat(product.wattage) || 12,
          cost_price: product.cost_price !== undefined ? Number(product.cost_price) : 0,
          trade_price: product.trade_price !== undefined ? Number(product.trade_price) : 0,
          retail_price: product.retail_price !== undefined ? Number(product.retail_price) : 0,
          image_url: product.image_url || ''
        };
        return {
          ...prev,
          [activeTag]: {
            ...current,
            itemType: 'track_system',
            trackConfig: {
              ...trackConfig,
              spots: [...currentSpots, newSpot]
            }
          }
        };
      });
    } else if (catalogTargetMode === 'track_driver') {
      setSpecifications(prev => {
        const current = prev[activeTag] || {};
        const trackConfig = current.trackConfig || {};
        return {
          ...prev,
          [activeTag]: {
            ...current,
            itemType: 'track_system',
            trackConfig: {
              ...trackConfig,
              driverProduct: product,
              driverName: product.client_description || product.name,
              driverSku: product.sku || product.one_to_one_code,
              driverCost: product.cost_price !== undefined ? Number(product.cost_price) : 0,
              driverTrade: product.trade_price !== undefined ? Number(product.trade_price) : 0,
              driverRetail: product.retail_price !== undefined ? Number(product.retail_price) : 0
            }
          }
        };
      });
    }

    setCatalogModalOpen(false);
    setInspectedProduct(null);
  };

  const handleInspectItem = async (item, tag = null) => {
    if (!item) return;
    setInspectedForTag(tag);
    const targetProduct = item.product || item;
    setInspectedProduct(targetProduct);

    if (targetProduct.id && typeof targetProduct.id === 'number') {
      try {
        const res = await fetch(`${API_BASE}/api/products/${targetProduct.id}`);
        if (res.ok) {
          const fullProd = await res.json();
          if (fullProd && (fullProd.id || fullProd.sku)) {
            setInspectedProduct(prev => (prev && prev.id === targetProduct.id ? { ...prev, ...fullProd } : prev));
          }
        }
      } catch (err) {
        console.warn('Could not fetch full product details for inspector:', err);
      }
    }
  };

  const handleClearLedComponent = (tag, componentKey) => {
    setSpecifications(prev => {
      const cur = prev[tag] || {};
      const ledCfg = { ...(cur.ledConfig || {}) };
      if (componentKey === 'profile') {
        delete ledCfg.profileProduct;
        delete ledCfg.profileSku;
        delete ledCfg.profileName;
        delete ledCfg.profileCost;
        delete ledCfg.profileTrade;
        delete ledCfg.profileRetail;
        delete ledCfg.profileMeters;
      } else if (componentKey === 'strip') {
        delete ledCfg.stripProduct;
        delete ledCfg.stripSku;
        delete ledCfg.stripName;
        delete ledCfg.stripCost;
        delete ledCfg.stripTrade;
        delete ledCfg.stripRetail;
        delete ledCfg.stripMeters;
        delete ledCfg.stripWattsPerMeter;
      } else if (componentKey === 'driver') {
        delete ledCfg.driverProduct;
        delete ledCfg.driverSku;
        delete ledCfg.driverName;
        delete ledCfg.driverCost;
        delete ledCfg.driverTrade;
        delete ledCfg.driverRetail;
        delete ledCfg.driverQty;
        delete ledCfg.driverWattage;
      }
      return {
        ...prev,
        [tag]: {
          ...cur,
          ledConfig: ledCfg
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleClearTrackComponent = (tag, componentKey) => {
    setSpecifications(prev => {
      const cur = prev[tag] || {};
      const trackCfg = { ...(cur.trackConfig || {}) };
      if (componentKey === 'rail') {
        delete trackCfg.railProduct;
        delete trackCfg.railSku;
        delete trackCfg.railName;
        delete trackCfg.railCost;
        delete trackCfg.railTrade;
        delete trackCfg.railRetail;
        delete trackCfg.railMeters;
      } else if (componentKey === 'driver') {
        delete trackCfg.driverProduct;
        delete trackCfg.driverSku;
        delete trackCfg.driverName;
        delete trackCfg.driverCost;
        delete trackCfg.driverTrade;
        delete trackCfg.driverRetail;
        delete trackCfg.driverQty;
      }
      return {
        ...prev,
        [tag]: {
          ...cur,
          trackConfig: trackCfg
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateTagType = (tag, newType) => {
    setSpecifications(prev => {
      const cur = prev[tag] || {};
      return {
        ...prev,
        [tag]: {
          ...cur,
          itemType: newType
        }
      };
    });
    setCountUpRows(prev => prev.map(r => {
      if ((r.tag || '').trim().toUpperCase() === tag) {
        return {
          ...r,
          itemType: newType,
          unit: newType === 'fixture' ? 'pcs' : 'm'
        };
      }
      return r;
    }));
    setHasUnsavedChanges(true);
  };

  const handleUpdateLedConfig = (tag, field, value) => {
    setSpecifications(prev => {
      const cur = prev[tag] || {};
      const ledConfig = cur.ledConfig || {};
      return {
        ...prev,
        [tag]: {
          ...cur,
          itemType: 'linear_led',
          ledConfig: {
            ...ledConfig,
            [field]: value
          }
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateTrackConfig = (tag, field, value) => {
    setSpecifications(prev => {
      const cur = prev[tag] || {};
      const trackConfig = cur.trackConfig || {};
      return {
        ...prev,
        [tag]: {
          ...cur,
          itemType: 'track_system',
          trackConfig: {
            ...trackConfig,
            [field]: value
          }
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateTrackSpot = (tag, spotId, field, value) => {
    setSpecifications(prev => {
      const cur = prev[tag] || {};
      const trackConfig = cur.trackConfig || {};
      const spots = (trackConfig.spots || []).map(s => {
        if (s.id === spotId) {
          return { ...s, [field]: value };
        }
        return s;
      });
      return {
        ...prev,
        [tag]: {
          ...cur,
          trackConfig: {
            ...trackConfig,
            spots
          }
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleRemoveTrackSpot = (tag, spotId) => {
    setSpecifications(prev => {
      const cur = prev[tag] || {};
      const trackConfig = cur.trackConfig || {};
      const spots = (trackConfig.spots || []).filter(s => s.id !== spotId);
      return {
        ...prev,
        [tag]: {
          ...cur,
          trackConfig: {
            ...trackConfig,
            spots
          }
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateSpecPrice = (tag, field, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setSpecifications(prev => {
      const spec = prev[tag];
      if (!spec) return prev;
      return {
        ...prev,
        [tag]: {
          ...spec,
          [field]: num
        }
      };
    });
  };

  const handleResetSpecPrices = (tag) => {
    setSpecifications(prev => {
      const spec = prev[tag];
      if (!spec || !spec.product) return prev;
      return {
        ...prev,
        [tag]: {
          ...spec,
          customCost: spec.product.cost_price || 0,
          customTrade: spec.product.trade_price || 0,
          customRetail: spec.product.retail_price || 0
        }
      };
    });
  };

  const handleRemoveProductFromSpec = (tag) => {
    setSpecifications(prev => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
  };

  const handleUpdateAccessoryQtyPerFitting = (tag, accIndex, newQty) => {
    const units = Math.max(1, parseInt(newQty, 10) || 1);
    setSpecifications(prev => {
      const spec = prev[tag];
      if (!spec || !spec.accessories) return prev;
      const updatedAccessories = [...spec.accessories];
      updatedAccessories[accIndex] = {
        ...updatedAccessories[accIndex],
        qtyPerFitting: units,
        ratio: units
      };
      return {
        ...prev,
        [tag]: { ...spec, accessories: updatedAccessories }
      };
    });
  };

  const handleUpdateAccessoryRatio = handleUpdateAccessoryQtyPerFitting;

  const handleUpdateAccessoryPrice = (tag, accIndex, field, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setSpecifications(prev => {
      const spec = prev[tag];
      if (!spec || !spec.accessories) return prev;
      const updatedAccessories = [...spec.accessories];
      updatedAccessories[accIndex] = {
        ...updatedAccessories[accIndex],
        [field]: num
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

  // Copy spec from one tag to another
  const handleExecuteCopySpec = () => {
    if (!copySourceTag || !copyTargetTag.trim()) return;
    const cleanTarget = copyTargetTag.trim().toUpperCase();
    const sourceSpec = specifications[copySourceTag];
    if (!sourceSpec) return;

    setSpecifications(prev => ({
      ...prev,
      [cleanTarget]: JSON.parse(JSON.stringify(sourceSpec))
    }));
    setCopySourceTag(null);
    setCopyTargetTag('');
    alert(`Copied specification and accessories from ${copySourceTag} to ${cleanTarget}!`);
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
      setHasUnsavedChanges(false);
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
    const seenRooms = new Set();

    // Sort rows by floor and room for logical grouping in the spreadsheet
    const sortedRows = [...countUpRows].sort((a, b) => {
      const floorComp = (a.floor || '').localeCompare(b.floor || '');
      if (floorComp !== 0) return floorComp;
      return (a.area || '').localeCompare(b.area || '');
    });

    sortedRows.forEach((row, rowIdx) => {
      const tag = (row.tag || '').trim().toUpperCase();
      if (!tag) return;

      const roomKey = `${row.floor || 'Ground'}: ${row.area || 'General Area'}`;
      
      // Optional: insert room spacer row
      if (includeRoomSpacers && !seenRooms.has(roomKey) && row.area) {
        seenRooms.add(roomKey);
        generatedItems.push({
          id: 'SPACER-' + Date.now() + '-' + rowIdx,
          isSpacer: true,
          qty: 0,
          type: 'SPACER',
          oneOneCode: '',
          code: '',
          description: `— ${roomKey.toUpperCase()} —`,
          floor: row.floor || 'Ground',
          area: row.area || 'General Area',
          dimming: '',
          brand: '',
          supplier: '',
          unitCost: 0,
          unitTrade: 0,
          unitRetail: 0,
          selection: '',
          stockStatus: '',
          eta: ''
        });
      }

      const spec = specifications[tag];
      const itemType = spec?.itemType || row.itemType || 'fixture';
      const product = spec ? spec.product : null;
      const qty = Math.max(1, Number(row.qty) || 1);

      if (itemType === 'linear_led') {
        // -----------------------------------------------------------
        // EXPAND LINEAR LED RUN INTO ITEMIZED HARDWARE
        // -----------------------------------------------------------
        const len = Number(row.lengthMeters) || (row.unit === 'm' ? Number(row.qty) : (Number(row.qty) || 3));
        const cleanLen = Math.round(len * 100) / 100;
        const ledCfg = spec?.ledConfig || {};
        const profMeters = ledCfg.profileMeters !== undefined ? Number(ledCfg.profileMeters) : cleanLen;
        const stripMeters = ledCfg.stripMeters !== undefined ? Number(ledCfg.stripMeters) : cleanLen;
        const drvQty = ledCfg.driverQty !== undefined ? Number(ledCfg.driverQty) : 1;

        // 1. Aluminium Profile / Extrusion
        const profileCost = ledCfg.profileCost !== undefined ? Number(ledCfg.profileCost) : (ledCfg.profileProduct?.cost_price || 120);
        const profileRetail = ledCfg.profileRetail !== undefined ? Number(ledCfg.profileRetail) : (ledCfg.profileProduct?.retail_price || 220);
        generatedItems.push({
          id: 'I-' + Date.now() + '-' + rowIdx + '-prof-' + Math.random().toString(36).substr(2, 4),
          qty: profMeters,
          type: tag,
          itemType: 'Hardware',
          oneOneCode: ledCfg.profileProduct?.one_to_one_code || '',
          code: ledCfg.profileSku || 'LED-PROFILE',
          description: `${ledCfg.profileName || 'Aluminium LED Profile'} — ${profMeters}m run${row.notes ? ' — ' + row.notes : ''}`,
          floor: row.floor || 'Ground',
          area: row.area || 'General Area',
          dimming: '—',
          brand: ledCfg.profileProduct?.brand || '',
          supplier: ledCfg.profileProduct?.supplier || orderSupplier || 'Molecule Dist.',
          unitCost: profileCost,
          unitTrade: profileRetail * 0.8,
          unitRetail: profileRetail,
          selection: 'Profile',
          stockStatus: 'Stock',
          eta: '2 weeks',
          image_url: ledCfg.profileProduct?.image_url || ''
        });

        // 2. LED Strip Tape
        const stripCost = ledCfg.stripCost !== undefined ? Number(ledCfg.stripCost) : (ledCfg.stripProduct?.cost_price || 95);
        const stripRetail = ledCfg.stripRetail !== undefined ? Number(ledCfg.stripRetail) : (ledCfg.stripProduct?.retail_price || 185);
        generatedItems.push({
          id: 'I-' + Date.now() + '-' + rowIdx + '-strip-' + Math.random().toString(36).substr(2, 4),
          qty: stripMeters,
          type: tag,
          itemType: 'Hardware',
          oneOneCode: ledCfg.stripProduct?.one_to_one_code || '',
          code: ledCfg.stripSku || 'LED-STRIP-24V',
          description: `${ledCfg.stripName || 'LED Strip Tape'} — ${stripMeters}m`,
          floor: row.floor || 'Ground',
          area: row.area || 'General Area',
          dimming: ledCfg.stripProduct?.dimming_protocol || 'Phase Cut / 24V',
          brand: ledCfg.stripProduct?.brand || '',
          supplier: ledCfg.stripProduct?.supplier || orderSupplier || 'Molecule Dist.',
          unitCost: stripCost,
          unitTrade: stripRetail * 0.8,
          unitRetail: stripRetail,
          selection: 'Strip',
          stockStatus: 'Stock',
          eta: '2 weeks',
          image_url: ledCfg.stripProduct?.image_url || ''
        });

        // 3. LED Driver / Power Supply
        const driverCost = ledCfg.driverCost !== undefined ? Number(ledCfg.driverCost) : (ledCfg.driverProduct?.cost_price || 220);
        const driverRetail = ledCfg.driverRetail !== undefined ? Number(ledCfg.driverRetail) : (ledCfg.driverProduct?.retail_price || 395);
        generatedItems.push({
          id: 'I-' + Date.now() + '-' + rowIdx + '-drv-' + Math.random().toString(36).substr(2, 4),
          qty: drvQty,
          type: tag,
          itemType: 'Hardware',
          oneOneCode: ledCfg.driverProduct?.one_to_one_code || '',
          code: ledCfg.driverSku || 'LED-DRIVER-24V',
          description: `${ledCfg.driverName || '24V Constant Voltage Driver'}`,
          floor: row.floor || 'Ground',
          area: row.area || 'General Area',
          dimming: ledCfg.driverProduct?.dimming_protocol || 'Phase Cut',
          brand: ledCfg.driverProduct?.brand || '',
          supplier: ledCfg.driverProduct?.supplier || orderSupplier || 'Molecule Dist.',
          unitCost: driverCost,
          unitTrade: driverRetail * 0.8,
          unitRetail: driverRetail,
          selection: 'Driver',
          stockStatus: 'Stock',
          eta: '2 weeks',
          image_url: ledCfg.driverProduct?.image_url || ''
        });

        // 4. Dynamic Accessories / End Caps
        if (Array.isArray(spec?.accessories) && spec.accessories.length > 0) {
          spec.accessories.forEach((acc, accIdx) => {
            const accUnits = acc.qtyPerFitting !== undefined 
              ? Math.max(1, parseInt(acc.qtyPerFitting, 10) || 1) 
              : (acc.ratio ? Math.max(1, Math.round(Number(acc.ratio))) : 1);
            const accCost = acc.customCost !== undefined ? Number(acc.customCost) : (acc.cost_price || 0);
            const accRetail = acc.customRetail !== undefined ? Number(acc.customRetail) : (acc.retail_price || 0);
            generatedItems.push({
              id: 'I-' + Date.now() + '-' + rowIdx + '-acc-' + accIdx + '-' + Math.random().toString(36).substr(2, 4),
              qty: accUnits,
              type: tag,
              itemType: 'Hardware',
              oneOneCode: acc.one_to_one_code || '',
              code: acc.sku || 'LED-ACC',
              description: acc.name || acc.client_description || 'Linear LED Accessory',
              floor: row.floor || 'Ground',
              area: row.area || 'General Area',
              dimming: '—',
              brand: acc.brand || '',
              supplier: acc.supplier || orderSupplier || 'Molecule Dist.',
              unitCost: accCost,
              unitTrade: accRetail * 0.8,
              unitRetail: accRetail,
              selection: 'Accessory',
              stockStatus: 'Stock',
              eta: '2 weeks',
              image_url: acc.image_url || ''
            });
          });
        } else {
          // Fallback kit
          generatedItems.push({
            id: 'I-' + Date.now() + '-' + rowIdx + '-acc-kit-' + Math.random().toString(36).substr(2, 4),
            qty: 1,
            type: tag,
            itemType: 'Hardware',
            oneOneCode: '',
            code: 'LED-ENDCAPS-KIT',
            description: `Profile End Caps (Pair) & Mounting Clips for ${tag}`,
            floor: row.floor || 'Ground',
            area: row.area || 'General Area',
            dimming: '—',
            brand: '',
            supplier: orderSupplier || 'Molecule Dist.',
            unitCost: 25,
            unitTrade: 50,
            unitRetail: 65,
            selection: 'Accessory',
            stockStatus: 'Stock',
            eta: '2 weeks'
          });
        }

      } else if (itemType === 'track_system') {
        // -----------------------------------------------------------
        // EXPAND TRACK SYSTEM INTO RAILS + SPOTS + FEEDS + DRIVER
        // -----------------------------------------------------------
        const trackCfg = spec?.trackConfig || {};
        const len = Number(row.lengthMeters) || (row.unit === 'm' ? Number(row.qty) : (Number(row.qty) || 3));
        const cleanLen = Math.round(len * 100) / 100;
        const railMeters = trackCfg.railMeters !== undefined ? Number(trackCfg.railMeters) : cleanLen;
        const drvQty = trackCfg.driverQty !== undefined ? Number(trackCfg.driverQty) : 1;

        // 1. Track Rails
        const railCost = trackCfg.railCost !== undefined ? Number(trackCfg.railCost) : (trackCfg.railProduct?.cost_price || 450);
        const railRetail = trackCfg.railRetail !== undefined ? Number(trackCfg.railRetail) : (trackCfg.railProduct?.retail_price || 850);
        generatedItems.push({
          id: 'I-' + Date.now() + '-' + rowIdx + '-rail-' + Math.random().toString(36).substr(2, 4),
          qty: railMeters,
          type: tag,
          itemType: 'Hardware',
          oneOneCode: trackCfg.railProduct?.one_to_one_code || '',
          code: trackCfg.railSku || 'TRACK-RAIL',
          description: `${trackCfg.railName || 'Track Profile Rail'} — ${railMeters}m run${row.notes ? ' — ' + row.notes : ''}`,
          floor: row.floor || 'Ground',
          area: row.area || 'General Area',
          dimming: '—',
          brand: trackCfg.railProduct?.brand || '',
          supplier: trackCfg.railProduct?.supplier || orderSupplier || 'Molecule Dist.',
          unitCost: railCost,
          unitTrade: railRetail * 0.8,
          unitRetail: railRetail,
          selection: 'Track Rail',
          stockStatus: 'Stock',
          eta: '3 weeks',
          image_url: trackCfg.railProduct?.image_url || ''
        });

        // 2. Track-Mounted Spotlights / Luminaires
        if (Array.isArray(trackCfg.spots) && trackCfg.spots.length > 0) {
          trackCfg.spots.forEach((spot, spIdx) => {
            const spQty = Math.max(1, Number(spot.qty) || 1);
            const spCost = Number(spot.cost_price) || 0;
            const spRetail = Number(spot.retail_price) || 0;
            generatedItems.push({
              id: 'I-' + Date.now() + '-' + rowIdx + '-spot-' + spIdx + '-' + Math.random().toString(36).substr(2, 4),
              qty: spQty,
              type: tag,
              itemType: 'Hardware',
              oneOneCode: spot.product?.one_to_one_code || '',
              code: spot.sku || 'TRACK-SPOT',
              description: `${spot.name} — Track Luminaire`,
              floor: row.floor || 'Ground',
              area: row.area || 'General Area',
              dimming: spot.product?.dimming_protocol || 'DALI / 48V Dim',
              brand: spot.product?.brand || '',
              supplier: spot.product?.supplier || orderSupplier || 'Molecule Dist.',
              unitCost: spCost,
              unitTrade: spRetail * 0.8,
              unitRetail: spRetail,
              selection: 'Track Luminaire',
              stockStatus: 'Stock',
              eta: '3 weeks',
              image_url: spot.image_url || ''
            });
          });
        }

        // 3. Track Driver / Power Box
        if (trackCfg.driverProduct || trackCfg.driverName) {
          const drvCost = trackCfg.driverCost !== undefined ? Number(trackCfg.driverCost) : (trackCfg.driverProduct?.cost_price || 480);
          const drvRetail = trackCfg.driverRetail !== undefined ? Number(trackCfg.driverRetail) : (trackCfg.driverProduct?.retail_price || 890);
          generatedItems.push({
            id: 'I-' + Date.now() + '-' + rowIdx + '-tr-drv-' + Math.random().toString(36).substr(2, 4),
            qty: drvQty,
            type: tag,
            itemType: 'Hardware',
            oneOneCode: trackCfg.driverProduct?.one_to_one_code || '',
            code: trackCfg.driverSku || 'TRACK-DRIVER-48V',
            description: `${trackCfg.driverName || '48V DC Low-Voltage Track Power Supply Box'}`,
            floor: row.floor || 'Ground',
            area: row.area || 'General Area',
            dimming: '48V DALI / Dim',
            brand: trackCfg.driverProduct?.brand || '',
            supplier: trackCfg.driverProduct?.supplier || orderSupplier || 'Molecule Dist.',
            unitCost: drvCost,
            unitTrade: drvRetail * 0.8,
            unitRetail: drvRetail,
            selection: 'Driver',
            stockStatus: 'Stock',
            eta: '3 weeks',
            image_url: trackCfg.driverProduct?.image_url || ''
          });
        }

        // 4. Dynamic Accessories / Track Hardware Kit
        if (Array.isArray(spec?.accessories) && spec.accessories.length > 0) {
          spec.accessories.forEach((acc, accIdx) => {
            const accUnits = acc.qtyPerFitting !== undefined 
              ? Math.max(1, parseInt(acc.qtyPerFitting, 10) || 1) 
              : (acc.ratio ? Math.max(1, Math.round(Number(acc.ratio))) : 1);
            const accCost = acc.customCost !== undefined ? Number(acc.customCost) : (acc.cost_price || 0);
            const accRetail = acc.customRetail !== undefined ? Number(acc.customRetail) : (acc.retail_price || 0);
            generatedItems.push({
              id: 'I-' + Date.now() + '-' + rowIdx + '-tr-acc-' + accIdx + '-' + Math.random().toString(36).substr(2, 4),
              qty: accUnits,
              type: tag,
              itemType: 'Hardware',
              oneOneCode: acc.one_to_one_code || '',
              code: acc.sku || 'TRACK-ACC',
              description: acc.name || acc.client_description || 'Track Accessory',
              floor: row.floor || 'Ground',
              area: row.area || 'General Area',
              dimming: '—',
              brand: acc.brand || '',
              supplier: acc.supplier || orderSupplier || 'Molecule Dist.',
              unitCost: accCost,
              unitTrade: accRetail * 0.8,
              unitRetail: accRetail,
              selection: 'Accessory',
              stockStatus: 'Stock',
              eta: '3 weeks',
              image_url: acc.image_url || ''
            });
          });
        } else {
          // Fallback kit
          generatedItems.push({
            id: 'I-' + Date.now() + '-' + rowIdx + '-tr-kit-' + Math.random().toString(36).substr(2, 4),
            qty: 1,
            type: tag,
            itemType: 'Hardware',
            oneOneCode: '',
            code: 'TRACK-HARDWARE-KIT',
            description: `Track Hardware Kit (1x Live End Power Feed + 1x Dead End Cap for ${tag})`,
            floor: row.floor || 'Ground',
            area: row.area || 'General Area',
            dimming: '—',
            brand: '',
            supplier: orderSupplier || 'Molecule Dist.',
            unitCost: 140,
            unitTrade: 280,
            unitRetail: 350,
            selection: 'Accessory',
            stockStatus: 'Stock',
            eta: '3 weeks'
          });
        }

      } else if (product) {
        // -----------------------------------------------------------
        // STANDARD POINT FIXTURE
        // -----------------------------------------------------------
        const fixtureId = 'I-' + Date.now() + '-' + rowIdx + '-' + Math.random().toString(36).substr(2, 4);
        const costPrice = spec.customCost !== undefined ? Number(spec.customCost) : (product.cost_price || 0);
        const tradePrice = spec.customTrade !== undefined ? Number(spec.customTrade) : (product.trade_price || 0);
        const retailPrice = spec.customRetail !== undefined ? Number(spec.customRetail) : (product.retail_price || 0);

        generatedItems.push({
          id: fixtureId,
          qty,
          type: tag, // Type column holds Plan Code / Tag (e.g. A1, DL1)
          itemType: 'Hardware',
          oneOneCode: product.one_to_one_code || '',
          code: product.sku || '',
          description: (product.client_description || product.name || '') + (row.notes ? ` — ${row.notes}` : ''), // Plan code is in Type column, not in description
          floor: row.floor || 'Ground',
          area: row.area || 'General Area',
          dimming: product.dimming_protocol || product.dimmable || 'Non-dim',
          brand: product.brand || '',
          supplier: product.supplier || product.supplier_name || orderSupplier || 'Molecule Dist.',
          unitCost: costPrice,
          unitTrade: tradePrice,
          unitRetail: retailPrice,
          selection: product.selection || 'Selection',
          stockStatus: (product.stock_level || product.stock) > 0 ? 'Stock' : 'Ordered',
          eta: product.lead_time || '4 weeks',
          foh_code_description: product.foh_code_description || '',
          wetworks: product.wetworks || '',
          image_url: product.image_url || '',
          technical_image_url: product.technical_image_url || '',
          spec_sheet_url: product.qr_link || product.spec_sheet_url || ''
        });

        // Generate Dynamic Accessories
        if (Array.isArray(spec.accessories) && spec.accessories.length > 0) {
          spec.accessories.forEach((acc, accIdx) => {
            const accUnits = acc.qtyPerFitting !== undefined 
              ? Math.max(1, parseInt(acc.qtyPerFitting, 10) || 1) 
              : (acc.ratio ? Math.max(1, Math.round(Number(acc.ratio))) : 1);
            const accQty = qty * accUnits;
            const accId = 'I-' + Date.now() + '-' + rowIdx + '-acc-' + accIdx + '-' + Math.random().toString(36).substr(2, 4);

            const accCost = acc.customCost !== undefined ? Number(acc.customCost) : (acc.cost_price || 0);
            const accRetail = acc.customRetail !== undefined ? Number(acc.customRetail) : (acc.retail_price || 0);

            generatedItems.push({
              id: accId,
              qty: accQty,
              type: tag, // Type column holds Plan Code / Tag for accessories too
              itemType: 'Hardware',
              oneOneCode: acc.one_to_one_code || '',
              code: acc.sku || '',
              description: acc.name || acc.client_description || '', // Clean description without [Acc for...] tag
              floor: row.floor || 'Ground',
              area: row.area || 'General Area',
              dimming: acc.dimming_protocol || acc.dimmable || '—',
              brand: acc.brand || product.brand || '',
              supplier: acc.supplier || acc.supplier_name || product.supplier || orderSupplier || 'Molecule Dist.',
              unitCost: accCost,
              unitTrade: accRetail * 0.8,
              unitRetail: accRetail,
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
        // Fallback placeholder row for unassigned tag
        const fixtureId = 'I-' + Date.now() + '-' + rowIdx + '-' + Math.random().toString(36).substr(2, 4);
        generatedItems.push({
          id: fixtureId,
          qty,
          type: tag, // Type column holds Plan Code / Tag
          itemType: 'Hardware',
          oneOneCode: '',
          code: '',
          description: 'Unassigned Fixture' + (row.notes ? ` — ${row.notes}` : ''),
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

  // Cross-tabulation Matrix (Areas vs Tags)
  const matrixData = useMemo(() => {
    const areasMap = new Map();
    countUpRows.forEach(r => {
      const areaKey = `${r.floor || 'Ground'} — ${r.area || 'Unassigned'}`;
      if (!areasMap.has(areaKey)) {
        areasMap.set(areaKey, { floor: r.floor || 'Ground', area: r.area || 'Unassigned', tags: {} });
      }
      const node = areasMap.get(areaKey);
      const t = (r.tag || '').toUpperCase();
      const val = Number(r.lengthMeters) || Number(r.qty) || 0;
      node.tags[t] = Math.round(((node.tags[t] || 0) + val) * 100) / 100;
    });
    return Array.from(areasMap.values());
  }, [countUpRows]);

  // Category-specific stats for Summary Sub-Tabs (Fixtures, LEDs, Tracks, All)
  const categoryStats = useMemo(() => {
    const calcCategory = (tagList, type) => {
      const tagSet = new Set(tagList.map(ut => ut.tag.toUpperCase()));
      let totalQtyOrMeters = 0;
      let cost = 0;
      let retail = 0;
      const matchingAreas = new Set();

      countUpRows.forEach(row => {
        const tag = (row.tag || '').trim().toUpperCase();
        if (!tagSet.has(tag)) return;

        const spec = specifications[tag];
        const qty = Number(row.qty) || 0;
        const itemType = spec?.itemType || row.itemType || (type === 'leds' ? 'linear_led' : type === 'tracks' ? 'track_system' : 'fixture');
        const areaKey = `${row.floor || 'Ground'} — ${row.area || 'Unassigned'}`;
        matchingAreas.add(areaKey);

        if (spec && itemType === 'linear_led') {
          const rowLen = Number(row.lengthMeters) || (row.unit === 'm' ? Number(row.qty) : (Number(row.qty) || 3));
          const profMeters = spec.ledConfig?.profileMeters !== undefined ? Number(spec.ledConfig.profileMeters) : rowLen;
          const stripMeters = spec.ledConfig?.stripMeters !== undefined ? Number(spec.ledConfig.stripMeters) : rowLen;
          const drvQty = spec.ledConfig?.driverQty !== undefined ? Number(spec.ledConfig.driverQty) : 1;

          const profCost = Number(spec.ledConfig?.profileCost !== undefined ? spec.ledConfig.profileCost : (spec.ledConfig?.profileProduct?.cost_price || 0));
          const profRet = Number(spec.ledConfig?.profileRetail !== undefined ? spec.ledConfig.profileRetail : (spec.ledConfig?.profileProduct?.retail_price || 0));
          const stripCost = Number(spec.ledConfig?.stripCost !== undefined ? spec.ledConfig.stripCost : (spec.ledConfig?.stripProduct?.cost_price || 0));
          const stripRet = Number(spec.ledConfig?.stripRetail !== undefined ? spec.ledConfig.stripRetail : (spec.ledConfig?.stripProduct?.retail_price || 0));
          const drvCost = Number(spec.ledConfig?.driverCost !== undefined ? spec.ledConfig.driverCost : (spec.ledConfig?.driverProduct?.cost_price || 0));
          const drvRet = Number(spec.ledConfig?.driverRetail !== undefined ? spec.ledConfig.driverRetail : (spec.ledConfig?.driverProduct?.retail_price || 0));

          cost += (profMeters * profCost) + (stripMeters * stripCost) + (drvQty * drvCost);
          retail += (profMeters * profRet) + (stripMeters * stripRet) + (drvQty * drvRet);
          totalQtyOrMeters += rowLen;
        } else if (spec && itemType === 'track_system') {
          const rowLen = Number(row.lengthMeters) || (row.unit === 'm' ? Number(row.qty) : (Number(row.qty) || 3));
          const railMeters = spec.trackConfig?.railMeters !== undefined ? Number(spec.trackConfig.railMeters) : rowLen;
          const drvQty = spec.trackConfig?.driverQty !== undefined ? Number(spec.trackConfig.driverQty) : 1;

          const railCost = Number(spec.trackConfig?.railCost !== undefined ? spec.trackConfig.railCost : (spec.trackConfig?.railProduct?.cost_price || 0));
          const railRet = Number(spec.trackConfig?.railRetail !== undefined ? spec.trackConfig.railRetail : (spec.trackConfig?.railProduct?.retail_price || 0));
          const drvCost = Number(spec.trackConfig?.driverCost !== undefined ? spec.trackConfig.driverCost : (spec.trackConfig?.driverProduct?.cost_price || 0));
          const drvRet = Number(spec.trackConfig?.driverRetail !== undefined ? spec.trackConfig.driverRetail : (spec.trackConfig?.driverProduct?.retail_price || 0));

          let spotsCost = 0;
          let spotsRet = 0;
          if (Array.isArray(spec.trackConfig?.spots)) {
            spec.trackConfig.spots.forEach(sp => {
              spotsCost += (Number(sp.qty || 1) * Number(sp.cost_price || 0));
              spotsRet += (Number(sp.qty || 1) * Number(sp.retail_price || 0));
            });
          }

          cost += (railMeters * railCost) + spotsCost + (drvQty * drvCost);
          retail += (railMeters * railRet) + spotsRet + (drvQty * drvRet);
          totalQtyOrMeters += rowLen;
        } else if (spec && spec.product) {
          const c = spec.customCost !== undefined ? Number(spec.customCost) : Number(spec.product.cost_price || 0);
          const r = spec.customRetail !== undefined ? Number(spec.customRetail) : Number(spec.product.retail_price || 0);
          cost += (qty * c);
          retail += (qty * r);
          totalQtyOrMeters += qty;
        } else {
          totalQtyOrMeters += (type === 'fixtures' ? qty : (Number(row.lengthMeters) || (row.unit === 'm' ? qty : qty)));
        }

        if (spec && Array.isArray(spec.accessories)) {
          spec.accessories.forEach(acc => {
            const accUnits = acc.qtyPerFitting !== undefined 
              ? Math.max(1, parseInt(acc.qtyPerFitting, 10) || 1) 
              : (acc.ratio ? Math.max(1, Math.round(Number(acc.ratio))) : 1);
            const mult = itemType === 'fixture' ? qty : 1;
            const accQty = mult * accUnits;
            const acCost = acc.customCost !== undefined ? Number(acc.customCost) : Number(acc.cost_price || 0);
            const acRet = acc.customRetail !== undefined ? Number(acc.customRetail) : Number(acc.retail_price || 0);
            cost += (accQty * acCost);
            retail += (accQty * acRet);
          });
        }
      });

      const margin = retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0;
      return {
        totalQtyOrMeters: Math.round(totalQtyOrMeters * 100) / 100,
        areasCount: matchingAreas.size,
        tagsCount: tagList.length,
        cost,
        retail,
        margin
      };
    };

    return {
      fixtures: calcCategory(pointFixtureTags, 'fixtures'),
      leds: calcCategory(linearLedTags, 'leds'),
      tracks: calcCategory(trackSystemTags, 'tracks'),
      all: {
        totalQtyOrMeters: stats.totalQty,
        areasCount: matrixData.length,
        tagsCount: uniqueTags.length,
        cost: stats.estimatedCost,
        retail: stats.estimatedRetail,
        margin: stats.estimatedMargin
      }
    };
  }, [pointFixtureTags, linearLedTags, trackSystemTags, uniqueTags, countUpRows, specifications, stats, matrixData]);

  // Active matrix tags based on summarySubTab
  const activeMatrixTags = useMemo(() => {
    if (summarySubTab === 'fixtures') return pointFixtureTags;
    if (summarySubTab === 'leds') return linearLedTags;
    if (summarySubTab === 'tracks') return trackSystemTags;
    return uniqueTags;
  }, [summarySubTab, pointFixtureTags, linearLedTags, trackSystemTags, uniqueTags]);

  // Filtered Count-Up rows
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

  // Filtered Matrix rows for active filters, search, and hide empty rooms
  const filteredMatrixData = useMemo(() => {
    return matrixData.filter(row => {
      if (matrixFloorFilter !== 'All' && row.floor !== matrixFloorFilter) return false;
      if (matrixSearch.trim()) {
        const q = matrixSearch.toLowerCase();
        const matchesArea = (row.area || '').toLowerCase().includes(q);
        const matchesFloor = (row.floor || '').toLowerCase().includes(q);
        if (!matchesArea && !matchesFloor) return false;
      }
      if (hideEmptyRooms) {
        let rSum = 0;
        activeMatrixTags.forEach(ut => {
          rSum += (row.tags[ut.tag] || 0);
        });
        if (rSum <= 0) return false;
      }
      return true;
    });
  }, [matrixData, matrixFloorFilter, matrixSearch, hideEmptyRooms, activeMatrixTags]);

  // Export Matrix to CSV (Category-aware)
  const handleExportMatrixCSV = (targetSubTab = summarySubTab) => {
    let exportTags = activeMatrixTags;
    let categoryName = 'All_Tags';
    let unitLabel = 'Total';

    if (targetSubTab === 'fixtures') {
      exportTags = pointFixtureTags;
      categoryName = 'Point_Fixtures';
      unitLabel = 'Total (pcs)';
    } else if (targetSubTab === 'leds') {
      exportTags = linearLedTags;
      categoryName = 'Linear_LED';
      unitLabel = 'Total (m)';
    } else if (targetSubTab === 'tracks') {
      exportTags = trackSystemTags;
      categoryName = 'Track_Systems';
      unitLabel = 'Total (m)';
    }

    if (matrixData.length === 0 || exportTags.length === 0) return;
    const headers = ['Floor', 'Room / Area', ...exportTags.map(ut => ut.tag), unitLabel];
    const csvRows = [headers.join(',')];

    filteredMatrixData.forEach(row => {
      let rSum = 0;
      const cells = [
        `"${row.floor}"`,
        `"${row.area}"`,
        ...exportTags.map(ut => {
          const q = row.tags[ut.tag] || 0;
          rSum += q;
          return q > 0 ? q : 0;
        }),
        Math.round(rSum * 100) / 100
      ];
      csvRows.push(cells.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Takeoff_Matrix_${categoryName}_${orderId || 'Export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER CONTROLS BAR */}
      {/* ------------------------------------------------------------- */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--border)', 
        borderRadius: '10px', 
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', 
              color: '#fff', 
              padding: '3px 8px', 
              borderRadius: '4px', 
              fontSize: '10.5px', 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              letterSpacing: '0.4px'
            }}>
              <Sparkles size={12} /> UPSTREAM ACCELERATOR
            </span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Takeoff & Specification Engine
            </h2>
            {hasUnsavedChanges && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                • Unsaved Edits
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
            Enter fixture counts by room, assign master catalog items with editable pricing, pair dynamic accessories, and compile into your BOQ spreadsheet.
          </p>
        </div>

        {/* METRICS & QUICK ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', textAlign: 'center', minWidth: '80px' }}>
              <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Fixtures</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-info)' }}>{stats.totalQty}</div>
            </div>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', textAlign: 'center', minWidth: '90px' }}>
              <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Plan Tags</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stats.configuredTags} / {stats.uniqueTagsCount}
                <span style={{ fontSize: '10px', fontWeight: 'normal', color: stats.pendingTags > 0 ? 'var(--text-warning)' : 'var(--text-success)', marginLeft: '4px' }}>
                  ({stats.pendingTags} pending)
                </span>
              </div>
            </div>
          </div>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleSaveTakeoff}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
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
              fontWeight: 700,
              padding: '7px 14px'
            }}
          >
            <FileSpreadsheet size={15} /> 🚀 Generate into BOQ Spreadsheet
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* INNER NAVIGATION TABS */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
        <button
          className={`btn btn-sm ${activeTab === 'countup' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('countup')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px 6px 0 0', fontWeight: 600 }}
        >
          <List size={14} /> 1. Room-by-Room Count-Up ({countUpRows.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'spec' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('spec')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px 6px 0 0', fontWeight: 600 }}
        >
          <Sliders size={14} /> 2. Tag Specification & Accessories ({uniqueTags.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('summary')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px 6px 0 0', fontWeight: 600 }}
        >
          <Grid size={14} /> 3. Summary & Takeoff Matrix
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: COUNT-UP (SLEEK SPREADSHEET DATA GRID - NO BLOCKS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'countup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* TOOLBAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-primary btn-xs" 
                onClick={() => handleAddRow()} 
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
              >
                <Plus size={13} /> Add Row
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
              <button 
                className="btn btn-secondary btn-xs" 
                onClick={() => setShowCadModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                title="Import and count fittings from AutoCAD .dwg file"
              >
                <Compass size={12} /> 📐 Import CAD Plan (.dwg)
              </button>
              {countUpRows.length > 0 && (
                <button className="btn btn-ghost btn-xs" onClick={handleClearAllRows} style={{ color: 'var(--text-danger)' }}>
                  Clear All
                </button>
              )}
            </div>

            {/* SEARCH & FLOOR FILTER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 8px' }}>
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

          {/* SPREADSHEET TABLE: BORDERLESS SEAMLESS CELLS */}
          <div style={{ 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            overflowX: 'auto', 
            background: 'var(--bg-primary)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <datalist id="plan-tags-list">
              {dynamicTagSuggestions.map(t => <option key={t} value={t} />)}
            </datalist>
            <datalist id="common-rooms-list">
              {dynamicRoomSuggestions.map(r => <option key={r} value={r} />)}
            </datalist>
            <datalist id="floor-levels-list">
              {dynamicFloorSuggestions.map(f => <option key={f} value={f} />)}
            </datalist>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border)', color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                  <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '8px 10px', width: '130px' }}>Plan Tag / Code</th>
                  <th style={{ padding: '8px 10px', width: '140px' }}>Floor Level</th>
                  <th style={{ padding: '8px 10px', width: '220px' }}>Room / Area</th>
                  <th style={{ padding: '8px 10px', width: '105px', textAlign: 'center' }}>Qty / Length</th>
                  <th style={{ padding: '8px 10px' }}>Mounting & Notes</th>
                  <th style={{ padding: '8px 10px', width: '180px' }}>Catalog Mapping</th>
                  <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCountUpRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No count-up lines recorded. Click <strong>+ Add Row</strong>, <strong>📐 Import CAD Plan (.dwg)</strong>, or <strong>📋 Paste from Excel / CSV</strong> to start your takeoff.
                    </td>
                  </tr>
                ) : (
                  filteredCountUpRows.map((row, index) => {
                    const tag = (row.tag || '').trim().toUpperCase();
                    const spec = specifications[tag];
                    const isConfigured = Boolean(spec?.product);

                    return (
                      <tr 
                        key={row.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.1s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* INDEX */}
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px', userSelect: 'none' }}>
                          {index + 1}
                        </td>
                        
                        {/* TAG INPUT */}
                        <td style={{ padding: '4px 8px' }}>
                          <input 
                            ref={index === filteredCountUpRows.length - 1 ? newRowTagInputRef : null}
                            type="text" 
                            data-row-index={index}
                            data-field="tag"
                            value={row.tag} 
                            placeholder="e.g. DL1"
                            list="plan-tags-list"
                            onChange={e => handleUpdateRow(row.id, 'tag', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, index, 'tag')}
                            style={{ 
                              width: '100%', 
                              fontWeight: 700, 
                              fontFamily: 'monospace', 
                              color: 'var(--text-info)',
                              textTransform: 'uppercase',
                              background: 'transparent',
                              border: '1px solid transparent',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              outline: 'none',
                              fontSize: '12px'
                            }}
                            onFocus={e => e.target.style.border = '1px solid var(--text-info)'}
                            onBlur={e => e.target.style.border = '1px solid transparent'}
                          />
                        </td>

                        {/* FLOOR INPUT */}
                        <td style={{ padding: '4px 8px' }}>
                          <input 
                            type="text" 
                            data-row-index={index}
                            data-field="floor"
                            value={row.floor} 
                            placeholder="Ground"
                            list="floor-levels-list"
                            onChange={e => handleUpdateRow(row.id, 'floor', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, index, 'floor')}
                            style={{ 
                              width: '100%',
                              background: 'transparent',
                              border: '1px solid transparent',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              outline: 'none',
                              fontSize: '12px',
                              color: 'var(--text-primary)'
                            }}
                            onFocus={e => e.target.style.border = '1px solid var(--border-strong, #888)'}
                            onBlur={e => e.target.style.border = '1px solid transparent'}
                          />
                        </td>

                        {/* ROOM / AREA INPUT (WITH AUTOCOMPLETE) */}
                        <td style={{ padding: '4px 8px' }}>
                          <input 
                            type="text" 
                            data-row-index={index}
                            data-field="area"
                            value={row.area} 
                            placeholder="e.g. Kitchen, Master Bedroom"
                            list="common-rooms-list"
                            onChange={e => handleUpdateRow(row.id, 'area', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, index, 'area')}
                            style={{ 
                              width: '100%',
                              background: 'transparent',
                              border: '1px solid transparent',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              outline: 'none',
                              fontSize: '12px',
                              color: 'var(--text-primary)'
                            }}
                            onFocus={e => e.target.style.border = '1px solid var(--border-strong, #888)'}
                            onBlur={e => e.target.style.border = '1px solid transparent'}
                          />
                        </td>

                        {/* QUANTITY INPUT */}
                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            <input 
                              type="number" 
                              min="0.01"
                              step={row.unit === 'm' ? "0.01" : "1"}
                              data-row-index={index}
                              data-field="qty"
                              value={row.qty} 
                              onChange={e => handleUpdateRow(row.id, 'qty', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, index, 'qty')}
                              style={{ 
                                width: row.unit === 'm' ? '65px' : '100%', 
                                fontWeight: 700, 
                                textAlign: 'center',
                                background: 'transparent',
                                border: '1px solid transparent',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                outline: 'none',
                                fontSize: '12.5px',
                                color: 'var(--text-primary)'
                              }}
                              onFocus={e => e.target.style.border = '1px solid var(--text-info)'}
                              onBlur={e => e.target.style.border = '1px solid transparent'}
                            />
                            {row.unit === 'm' && (
                              <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>m</span>
                            )}
                          </div>
                        </td>

                        {/* NOTES INPUT */}
                        <td style={{ padding: '4px 8px' }}>
                          <input 
                            type="text" 
                            data-row-index={index}
                            data-field="notes"
                            value={row.notes} 
                            placeholder="e.g. Recessed 2.7m ceiling, beam angle 38°"
                            onChange={e => handleUpdateRow(row.id, 'notes', e.target.value)}
                            onKeyDown={e => handleKeyDown(e, index, 'notes')}
                            style={{ 
                              width: '100%', 
                              fontSize: '11.5px',
                              background: 'transparent',
                              border: '1px solid transparent',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              outline: 'none',
                              color: 'var(--text-secondary)'
                            }}
                            onFocus={e => e.target.style.border = '1px solid var(--border-strong, #888)'}
                            onBlur={e => e.target.style.border = '1px solid transparent'}
                          />
                        </td>

                        {/* CATALOG MAPPING STATUS */}
                        <td style={{ padding: '4px 8px' }}>
                          {isConfigured ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '120px'
                                }}
                                onClick={() => setActiveTab('spec')}
                                title="Mapped! Click to view/edit specification"
                              >
                                <CheckCircle size={12} /> {spec.product.sku || 'Mapped'}
                              </span>
                              <button 
                                className="btn btn-ghost btn-xs"
                                onClick={() => handleInspectItem(spec.product, tag)}
                                title="View full fitting specification sheet"
                                style={{ padding: '2px 4px', color: 'var(--text-info)' }}
                              >
                                <Eye size={12} />
                              </button>
                            </div>
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
                                cursor: 'pointer',
                                fontWeight: 500
                              }}
                              onClick={() => openCatalogPicker(tag, 'product')}
                              title="Click to select catalog product for this tag"
                            >
                              <Plus size={11} /> Assign Product
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                            <button 
                              className="btn btn-ghost btn-xs" 
                              onClick={() => handleDuplicateRow(row.id)}
                              title="Duplicate row"
                              style={{ padding: '2px 4px', color: 'var(--text-secondary)' }}
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <button 
              className="btn btn-ghost btn-xs" 
              onClick={() => handleAddRow()} 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-info)' }}
            >
              <Plus size={12} /> Add next row (Press Enter in last cell)
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Showing {filteredCountUpRows.length} of {countUpRows.length} total rows
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: SPECIFICATION & DYNAMIC ACCESSORIES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'spec' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            padding: '12px 16px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} style={{ color: 'var(--text-info)' }} />
              <div>
                <strong>Centralized Plan Tag Specification:</strong> Default prices automatically populate from the catalog, and you can <strong>edit Cost, Trade, and Retail prices directly</strong> for this project.
              </div>
            </div>
            <button 
              className="btn btn-primary btn-xs"
              onClick={() => setShowGenerateModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontWeight: 600 }}
            >
              <FileSpreadsheet size={12} /> Generate BOQ
            </button>
          </div>

          {uniqueTags.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              No Plan Tags found yet. Head over to <strong>1. Room-by-Room Count-Up</strong> to enter fixture tags first.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* SUB-TAB NAVIGATOR (Point Fixtures | Linear LED Builder | Track Systems Builder) */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                borderBottom: '1px solid var(--border)', 
                paddingBottom: '10px' 
              }}>
                <button
                  className={`btn btn-sm ${specSubTab === 'fixtures' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSpecSubTab('fixtures')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: specSubTab === 'fixtures' ? 700 : 500 }}
                >
                  💡 Point Fixtures ({pointFixtureTags.length})
                </button>
                <button
                  className={`btn btn-sm ${specSubTab === 'leds' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSpecSubTab('leds')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: specSubTab === 'leds' ? 700 : 500 }}
                >
                  〰️ Linear LED Builder ({linearLedTags.length})
                </button>
                <button
                  className={`btn btn-sm ${specSubTab === 'tracks' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSpecSubTab('tracks')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: specSubTab === 'tracks' ? 700 : 500 }}
                >
                  🛤️ Track Systems Builder ({trackSystemTags.length})
                </button>
              </div>

              {/* -------------------------------------------------------- */}
              {/* SUB-TAB 1: POINT FIXTURES */}
              {/* -------------------------------------------------------- */}
              {specSubTab === 'fixtures' && (
                pointFixtureTags.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '26px', marginBottom: '8px' }}>💡</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>No Point Fixtures Found</div>
                    <div style={{ fontSize: '12px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                      All detected plan tags are currently classified under Linear LED or Track Systems.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '16px' }}>
                    {pointFixtureTags.map(tagInfo => {
                      const tag = tagInfo.tag;
                      const spec = specifications[tag];
                      const product = spec ? spec.product : null;
                      const accessories = (spec && spec.accessories) || [];

                      const costPrice = spec?.customCost !== undefined ? spec.customCost : (product?.cost_price || 0);
                      const tradePrice = spec?.customTrade !== undefined ? spec.customTrade : (product?.trade_price || 0);
                      const retailPrice = spec?.customRetail !== undefined ? spec.customRetail : (product?.retail_price || 0);
                      
                      const marginPct = retailPrice > 0 
                        ? Math.round(((retailPrice - costPrice) / retailPrice) * 100)
                        : 0;

                      return (
                        <div 
                          key={tag} 
                          style={{ 
                            background: 'var(--bg-primary)', 
                            border: product ? '1px solid var(--border)' : '1.5px dashed var(--border-warning, #f59e0b)', 
                            borderRadius: '10px', 
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* TAG CARD HEADER */}
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
                                fontWeight: 800, 
                                fontSize: '13px', 
                                padding: '3px 8px', 
                                borderRadius: '4px' 
                              }}>
                                {tag}
                              </span>
                              <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {tagInfo.totalQty} total fixtures
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                  Across {tagInfo.areasCount} room(s) & {tagInfo.floorsCount} floor(s)
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <select
                                value="fixture"
                                onChange={(e) => handleUpdateTagType(tag, e.target.value)}
                                className="select select-xs"
                                style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', height: '24px', background: 'var(--bg-primary)' }}
                                title="Reclassify fixture type"
                              >
                                <option value="fixture">💡 Point Fixture</option>
                                <option value="linear_led">〰️ Linear LED</option>
                                <option value="track_system">🛤️ Track System</option>
                              </select>

                              {product && (
                                <>
                                  <button
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => {
                                      setCopySourceTag(tag);
                                      setCopyTargetTag('');
                                      setShowCustomCopyInput(false);
                                    }}
                                    title="Copy this fixture and accessories to another tag"
                                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                                  >
                                    <Copy size={11} /> Copy
                                  </button>
                                  <button 
                                    className="btn btn-ghost btn-xs" 
                                    onClick={() => handleRemoveProductFromSpec(tag)}
                                    style={{ color: 'var(--text-danger)', fontSize: '11px' }}
                                    title="Remove mapped product"
                                  >
                                    Clear
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* PRODUCT DETAILS & EDITABLE PRICING */}
                          <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {product ? (
                              <div style={{ 
                                background: 'var(--bg-secondary)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '8px', 
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                              }}>
                                {/* PRODUCT INFO HEADER WITH THUMBNAIL */}
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <div 
                                    style={{ 
                                      width: '64px', 
                                      height: '64px', 
                                      borderRadius: '6px', 
                                      background: 'var(--bg-primary)', 
                                      border: '1px solid var(--border)', 
                                      overflow: 'hidden', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      flexShrink: 0,
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => handleInspectItem(product, tag)}
                                    title="Click to view photo and specs"
                                  >
                                    {product.image_url ? (
                                      <img 
                                        src={product.image_url.startsWith('http') ? product.image_url : `${API_BASE}${product.image_url}`} 
                                        alt={product.name} 
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                      />
                                    ) : (
                                      <span style={{ fontSize: '20px', opacity: 0.5 }}>💡</span>
                                    )}
                                  </div>

                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-info)', fontSize: '13px' }}>
                                        {product.sku || product.one_to_one_code}
                                      </span>
                                      {product.brand && (
                                        <span style={{ fontSize: '10px', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                                          {product.brand}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {product.client_description || product.name}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px', flexWrap: 'wrap' }}>
                                      {product.wattage && <span>⚡ {product.wattage}W</span>}
                                      {product.color_temperature && <span>🌡️ {product.color_temperature}</span>}
                                      {product.beam_angle && <span>📐 {product.beam_angle}</span>}
                                      {product.ip_rating && <span>💧 IP{product.ip_rating}</span>}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <button 
                                      className="btn btn-secondary btn-xs"
                                      onClick={() => openCatalogPicker(tag, 'product', 'All')}
                                      style={{ fontSize: '11px' }}
                                    >
                                      Change
                                    </button>
                                    <button 
                                      className="btn btn-ghost btn-xs"
                                      onClick={() => handleInspectItem(product, tag)}
                                      style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                    >
                                      <Eye size={11} /> Specs
                                    </button>
                                  </div>
                                </div>

                                {/* EDITABLE PRICING BAR */}
                                <div style={{ 
                                  borderTop: '1px solid var(--border)', 
                                  paddingTop: '8px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '8px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {/* COST PRICE */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Cost:</span>
                                      <div style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'baseline', 
                                        borderBottom: '1.5px solid var(--border)', 
                                        paddingBottom: '1px',
                                        transition: 'border-color 0.15s'
                                      }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>R</span>
                                        <input 
                                          type="number"
                                          step="0.01"
                                          value={costPrice}
                                          onChange={e => handleUpdateSpecPrice(tag, 'customCost', e.target.value)}
                                          style={{ 
                                            minWidth: '70px', 
                                            width: '85px', 
                                            background: 'transparent', 
                                            border: 'none', 
                                            outline: 'none', 
                                            fontSize: '12.5px', 
                                            fontWeight: 600, 
                                            color: 'var(--text-primary)',
                                            padding: '0 2px'
                                          }}
                                          onFocus={e => e.target.parentElement.style.borderBottom = '1.5px solid var(--text-info)'}
                                          onBlur={e => e.target.parentElement.style.borderBottom = '1.5px solid var(--border)'}
                                        />
                                      </div>
                                    </div>

                                    {/* TRADE PRICE */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Trade:</span>
                                      <div style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'baseline', 
                                        borderBottom: '1.5px solid var(--border)', 
                                        paddingBottom: '1px',
                                        transition: 'border-color 0.15s'
                                      }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>R</span>
                                        <input 
                                          type="number"
                                          step="0.01"
                                          value={tradePrice}
                                          onChange={e => handleUpdateSpecPrice(tag, 'customTrade', e.target.value)}
                                          style={{ 
                                            minWidth: '70px', 
                                            width: '85px', 
                                            background: 'transparent', 
                                            border: 'none', 
                                            outline: 'none', 
                                            fontSize: '12.5px', 
                                            fontWeight: 600, 
                                            color: 'var(--text-primary)',
                                            padding: '0 2px'
                                          }}
                                          onFocus={e => e.target.parentElement.style.borderBottom = '1.5px solid var(--text-info)'}
                                          onBlur={e => e.target.parentElement.style.borderBottom = '1.5px solid var(--border)'}
                                        />
                                      </div>
                                    </div>

                                    {/* RETAIL PRICE */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Retail:</span>
                                      <div style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'baseline', 
                                        borderBottom: '1.5px solid var(--border)', 
                                        paddingBottom: '1px',
                                        transition: 'border-color 0.15s'
                                      }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-success)' }}>R</span>
                                        <input 
                                          type="number"
                                          step="0.01"
                                          value={retailPrice}
                                          onChange={e => handleUpdateSpecPrice(tag, 'customRetail', e.target.value)}
                                          style={{ 
                                            minWidth: '75px', 
                                            width: '90px', 
                                            background: 'transparent', 
                                            border: 'none', 
                                            outline: 'none', 
                                            fontSize: '13px', 
                                            fontWeight: 700, 
                                            color: 'var(--text-success)',
                                            padding: '0 2px'
                                          }}
                                          onFocus={e => e.target.parentElement.style.borderBottom = '1.5px solid var(--text-success)'}
                                          onBlur={e => e.target.parentElement.style.borderBottom = '1.5px solid var(--border)'}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ 
                                      fontSize: '10.5px', 
                                      fontWeight: 700, 
                                      padding: '2px 6px', 
                                      borderRadius: '4px',
                                      background: marginPct >= 30 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                      color: marginPct >= 30 ? 'var(--text-success)' : 'var(--text-warning)'
                                    }}>
                                      {marginPct}% Margin
                                    </span>
                                    <button 
                                      className="btn btn-ghost btn-xs" 
                                      onClick={() => handleResetSpecPrices(tag)}
                                      title="Reset prices back to master catalog defaults"
                                      style={{ padding: '2px 4px', fontSize: '10px' }}
                                    >
                                      <RotateCcw size={11} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ 
                                padding: '24px 16px', 
                                textAlign: 'center', 
                                background: 'var(--bg-secondary)', 
                                borderRadius: '8px', 
                                border: '1px dashed var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  No product mapped for plan tag <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{tag}</strong>
                                </div>
                                <button 
                                  className="btn btn-primary btn-sm"
                                  onClick={() => openCatalogPicker(tag, 'product', 'All')}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                                >
                                  <Search size={13} /> Select Fitting from Master Catalog
                                </button>
                              </div>
                            )}

                            {/* DYNAMIC ACCESSORIES SECTION */}
                            {product && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Dynamic Accessories & Drivers ({accessories.length})
                                  </span>
                                  <button 
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => openCatalogPicker(tag, 'accessory', 'Accessory')}
                                    style={{ fontSize: '11px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '3px' }}
                                  >
                                    <Plus size={12} /> Add Accessory
                                  </button>
                                </div>

                                {accessories.length === 0 ? (
                                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                    No linked accessories. Click "+ Add Accessory" to include remote drivers, honeycombs, or mounts.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {accessories.map((acc, accIdx) => {
                                      const accUnits = acc.qtyPerFitting !== undefined 
                                        ? Math.max(1, parseInt(acc.qtyPerFitting, 10) || 1) 
                                        : (acc.ratio ? Math.max(1, Math.round(Number(acc.ratio))) : 1);
                                      const accTotalQty = tagInfo.totalQty * accUnits;
                                      const accCost = acc.customCost !== undefined ? acc.customCost : (acc.cost_price || 0);
                                      const accRetail = acc.customRetail !== undefined ? acc.customRetail : (acc.retail_price || 0);

                                      return (
                                        <div 
                                          key={acc.id || accIdx}
                                          style={{ 
                                            background: 'var(--bg-secondary)', 
                                            border: '1px solid var(--border)', 
                                            borderRadius: '6px', 
                                            padding: '8px 10px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px'
                                          }}
                                        >
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                                                {acc.sku || acc.one_to_one_code || 'ACC'}
                                              </span>
                                              <span style={{ fontSize: '11.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {acc.name || acc.client_description}
                                              </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <button 
                                                className="btn btn-ghost btn-xs" 
                                                onClick={() => handleInspectItem(acc, tag)}
                                                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 6px' }}
                                                title="View accessory specifications"
                                              >
                                                <Eye size={11} /> Specs
                                              </button>
                                              <button 
                                                className="btn btn-ghost btn-xs" 
                                                onClick={() => handleRemoveAccessory(tag, accIdx)}
                                                style={{ color: 'var(--text-danger)', padding: '2px' }}
                                                title="Remove accessory"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          </div>

                                          {/* ACCESSORY RATIO & PRICING BAR */}
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11px', borderTop: '1px dashed var(--border)', paddingTop: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span style={{ color: 'var(--text-secondary)' }}>Units per Fitting:</span>
                                              <input 
                                                type="number"
                                                min="1"
                                                value={accUnits}
                                                onChange={e => handleUpdateAccessoryQtyPerFitting(tag, accIdx, e.target.value)}
                                                style={{ width: '42px', height: '22px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}
                                              />
                                              <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                                                (Total: {accTotalQty})
                                              </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                              {/* ACC COST */}
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Cost:</span>
                                                <div style={{ 
                                                  display: 'inline-flex', 
                                                  alignItems: 'baseline', 
                                                  borderBottom: '1.5px solid var(--border)', 
                                                  paddingBottom: '1px',
                                                  transition: 'border-color 0.15s'
                                                }}>
                                                  <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>R</span>
                                                  <input 
                                                    type="number"
                                                    step="0.01"
                                                    value={accCost}
                                                    onChange={e => handleUpdateAccessoryPrice(tag, accIdx, 'customCost', e.target.value)}
                                                    style={{ 
                                                      minWidth: '65px',
                                                      width: '75px', 
                                                      background: 'transparent', 
                                                      border: 'none', 
                                                      outline: 'none', 
                                                      fontSize: '11.5px', 
                                                      fontWeight: 600, 
                                                      color: 'var(--text-primary)',
                                                      padding: '0 2px'
                                                    }}
                                                    onFocus={e => e.target.parentElement.style.borderBottom = '1.5px solid var(--text-info)'}
                                                    onBlur={e => e.target.parentElement.style.borderBottom = '1.5px solid var(--border)'}
                                                  />
                                                </div>
                                              </div>

                                              {/* ACC RETAIL */}
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Retail:</span>
                                                <div style={{ 
                                                  display: 'inline-flex', 
                                                  alignItems: 'baseline', 
                                                  borderBottom: '1.5px solid var(--border)', 
                                                  paddingBottom: '1px',
                                                  transition: 'border-color 0.15s'
                                                }}>
                                                  <span style={{ fontSize: '10.5px', color: 'var(--text-success)' }}>R</span>
                                                  <input 
                                                    type="number"
                                                    step="0.01"
                                                    value={accRetail}
                                                    onChange={e => handleUpdateAccessoryPrice(tag, accIdx, 'customRetail', e.target.value)}
                                                    style={{ 
                                                      minWidth: '70px',
                                                      width: '80px', 
                                                      background: 'transparent', 
                                                      border: 'none', 
                                                      outline: 'none', 
                                                      fontSize: '11.5px', 
                                                      fontWeight: 700, 
                                                      color: 'var(--text-success)',
                                                      padding: '0 2px'
                                                    }}
                                                    onFocus={e => e.target.parentElement.style.borderBottom = '1.5px solid var(--text-success)'}
                                                    onBlur={e => e.target.parentElement.style.borderBottom = '1.5px solid var(--border)'}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </div>

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
                )
              )}

              {/* -------------------------------------------------------- */}
              {/* SUB-TAB 2: LINEAR LED BUILDER */}
              {/* -------------------------------------------------------- */}
              {specSubTab === 'leds' && (
                linearLedTags.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>〰️</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>No Linear LED Runs Found</div>
                    <div style={{ fontSize: '12px', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0', lineHeight: 1.5 }}>
                      Linear LED strips are automatically detected when CAD layers use the <code>0-LEDS-*</code> prefix, plan tags start with <code>L-</code> or <code>LED</code>, or units are in meters (<code>m</code>). You can also switch any Point Fixture to Linear LED using the type dropdown.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: '16px' }}>
                    {linearLedTags.map(tagInfo => {
                      const tag = tagInfo.tag;
                      const spec = specifications[tag];
                      const ledCfg = spec?.ledConfig || {};
                      const accessories = spec?.accessories || [];
                      const meters = tagInfo.totalMeters || tagInfo.totalQty || 3;
                      const cleanLen = Math.round(meters * 100) / 100;

                      const profileMeters = ledCfg.profileMeters !== undefined ? Number(ledCfg.profileMeters) : cleanLen;
                      const profileCost = ledCfg.profileCost !== undefined ? Number(ledCfg.profileCost) : Number(ledCfg.profileProduct?.cost_price || 0);
                      const profileRetail = ledCfg.profileRetail !== undefined ? Number(ledCfg.profileRetail) : Number(ledCfg.profileProduct?.retail_price || 0);

                      const stripMeters = ledCfg.stripMeters !== undefined ? Number(ledCfg.stripMeters) : cleanLen;
                      const stripCost = ledCfg.stripCost !== undefined ? Number(ledCfg.stripCost) : Number(ledCfg.stripProduct?.cost_price || 0);
                      const stripRetail = ledCfg.stripRetail !== undefined ? Number(ledCfg.stripRetail) : Number(ledCfg.stripProduct?.retail_price || 0);

                      const driverQty = ledCfg.driverQty !== undefined ? Number(ledCfg.driverQty) : 1;
                      const driverCost = ledCfg.driverCost !== undefined ? Number(ledCfg.driverCost) : Number(ledCfg.driverProduct?.cost_price || 0);
                      const driverRetail = ledCfg.driverRetail !== undefined ? Number(ledCfg.driverRetail) : Number(ledCfg.driverProduct?.retail_price || 0);

                      // Accessories totals
                      let accsCost = 0;
                      let accsRetail = 0;
                      accessories.forEach(acc => {
                        const units = acc.qtyPerFitting !== undefined ? Math.max(1, parseInt(acc.qtyPerFitting, 10) || 1) : 1;
                        const c = acc.customCost !== undefined ? Number(acc.customCost) : Number(acc.cost_price || 0);
                        const r = acc.customRetail !== undefined ? Number(acc.customRetail) : Number(acc.retail_price || 0);
                        accsCost += (units * c);
                        accsRetail += (units * r);
                      });

                      const totalRunCost = Math.round((profileMeters * profileCost) + (stripMeters * stripCost) + (driverQty * driverCost) + accsCost);
                      const totalRunRetail = Math.round((profileMeters * profileRetail) + (stripMeters * stripRetail) + (driverQty * driverRetail) + accsRetail);
                      const marginPct = totalRunRetail > 0 ? Math.round(((totalRunRetail - totalRunCost) / totalRunRetail) * 100) : 0;

                      return (
                        <div 
                          key={tag}
                          style={{ 
                            background: 'var(--bg-primary)', 
                            border: (ledCfg.profileProduct || ledCfg.stripProduct) ? '1px solid var(--border)' : '1.5px dashed var(--border-warning, #f59e0b)', 
                            borderRadius: '10px', 
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* BUILDER HEADER */}
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
                                fontWeight: 800, 
                                fontSize: '13px', 
                                padding: '3px 8px', 
                                borderRadius: '4px' 
                              }}>
                                〰️ {tag}
                              </span>
                              <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {cleanLen}m total linear run
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                  Across {tagInfo.areasCount} room(s) & {tagInfo.floorsCount} floor(s) [{tagInfo.runs.length} run(s)]
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <select
                                value="linear_led"
                                onChange={(e) => handleUpdateTagType(tag, e.target.value)}
                                className="select select-xs"
                                style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', height: '24px', background: 'var(--bg-primary)' }}
                              >
                                <option value="fixture">💡 Point Fixture</option>
                                <option value="linear_led">〰️ Linear LED</option>
                                <option value="track_system">🛤️ Track System</option>
                              </select>

                              <button 
                                className="btn btn-ghost btn-xs" 
                                onClick={() => handleRemoveProductFromSpec(tag)}
                                style={{ color: 'var(--text-danger)', fontSize: '11px' }}
                                title="Reset builder configuration"
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          {/* BUILDER CONTENT */}
                          <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            
                            {/* COMPONENT 1: PROFILE / EXTRUSION */}
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              border: '1px solid var(--border)', 
                              borderRadius: '8px', 
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  1. Aluminium Profile Extrusion
                                </span>
                                {!ledCfg.profileProduct && (
                                  <button 
                                    className="btn btn-primary btn-xs"
                                    onClick={() => openCatalogPicker(tag, 'led_profile', 'Linear')}
                                    style={{ fontSize: '11px' }}
                                  >
                                    + Select Profile
                                  </button>
                                )}
                              </div>

                              {ledCfg.profileProduct ? (
                                <>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div 
                                      style={{ 
                                        width: '56px', 
                                        height: '56px', 
                                        borderRadius: '6px', 
                                        background: 'var(--bg-primary)', 
                                        border: '1px solid var(--border)', 
                                        overflow: 'hidden', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        flexShrink: 0,
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => handleInspectItem(ledCfg.profileProduct, tag)}
                                      title="Click to view full specs"
                                    >
                                      {ledCfg.profileProduct.image_url ? (
                                        <img 
                                          src={ledCfg.profileProduct.image_url.startsWith('http') ? ledCfg.profileProduct.image_url : `${API_BASE}${ledCfg.profileProduct.image_url}`} 
                                          alt="profile" 
                                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                        />
                                      ) : (
                                        <span style={{ fontSize: '18px', opacity: 0.5 }}>📐</span>
                                      )}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-info)', fontSize: '12.5px' }}>
                                          {ledCfg.profileSku || ledCfg.profileProduct.sku || ledCfg.profileProduct.one_to_one_code}
                                        </span>
                                        {ledCfg.profileProduct.brand && (
                                          <span style={{ fontSize: '10px', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                                            {ledCfg.profileProduct.brand}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ledCfg.profileName || ledCfg.profileProduct.client_description || ledCfg.profileProduct.name}
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px', flexWrap: 'wrap' }}>
                                        {ledCfg.profileProduct.cutout && <span>Cutout: {ledCfg.profileProduct.cutout}</span>}
                                        {ledCfg.profileProduct.color && <span>Finish: {ledCfg.profileProduct.color}</span>}
                                        <span>📏 Extrusion</span>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <button 
                                        className="btn btn-secondary btn-xs"
                                        onClick={() => openCatalogPicker(tag, 'led_profile', 'Linear')}
                                        style={{ fontSize: '11px' }}
                                      >
                                        Change
                                      </button>
                                      <button 
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => handleInspectItem(ledCfg.profileProduct, tag)}
                                        style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                      >
                                        <Eye size={11} /> Specs
                                      </button>
                                      <button 
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => handleClearLedComponent(tag, 'profile')}
                                        style={{ color: 'var(--text-danger)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                        title="Clear profile"
                                      >
                                        <Trash2 size={11} /> Clear
                                      </button>
                                    </div>
                                  </div>

                                  {/* EDITABLE PROFILE METERS & PRICING BAR */}
                                  <div style={{ 
                                    borderTop: '1px solid var(--border)', 
                                    paddingTop: '8px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Run Meters:</span>
                                        <input 
                                          type="number" 
                                          step="0.1" 
                                          value={profileMeters} 
                                          onChange={e => handleUpdateLedConfig(tag, 'profileMeters', parseFloat(e.target.value) || 0)}
                                          style={{ width: '60px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}
                                        />
                                        <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>m</span>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Cost/m:</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>R</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={profileCost} 
                                          onChange={e => handleUpdateLedConfig(tag, 'profileCost', parseFloat(e.target.value) || 0)}
                                          style={{ width: '70px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}
                                        />
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Retail/m:</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-success)' }}>R</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={profileRetail} 
                                          onChange={e => handleUpdateLedConfig(tag, 'profileRetail', parseFloat(e.target.value) || 0)}
                                          style={{ width: '75px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 700, color: 'var(--text-success)' }}
                                        />
                                      </div>
                                    </div>

                                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      Total: <span style={{ color: 'var(--text-info)' }}>R {Math.round(profileMeters * profileRetail).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                                  No extrusion selected yet. Click "+ Select Profile" to choose from master catalog.
                                </div>
                              )}
                            </div>

                            {/* COMPONENT 2: LED STRIP TAPE */}
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              border: '1px solid var(--border)', 
                              borderRadius: '8px', 
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  2. LED Strip Tape
                                </span>
                                {!ledCfg.stripProduct && (
                                  <button 
                                    className="btn btn-primary btn-xs"
                                    onClick={() => openCatalogPicker(tag, 'led_strip', 'LEDStrip')}
                                    style={{ fontSize: '11px' }}
                                  >
                                    + Select Strip
                                  </button>
                                )}
                              </div>

                              {ledCfg.stripProduct ? (
                                <>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div 
                                      style={{ 
                                        width: '56px', 
                                        height: '56px', 
                                        borderRadius: '6px', 
                                        background: 'var(--bg-primary)', 
                                        border: '1px solid var(--border)', 
                                        overflow: 'hidden', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        flexShrink: 0,
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => handleInspectItem(ledCfg.stripProduct, tag)}
                                      title="Click to view full specs"
                                    >
                                      {ledCfg.stripProduct.image_url ? (
                                        <img 
                                          src={ledCfg.stripProduct.image_url.startsWith('http') ? ledCfg.stripProduct.image_url : `${API_BASE}${ledCfg.stripProduct.image_url}`} 
                                          alt="strip" 
                                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                        />
                                      ) : (
                                        <span style={{ fontSize: '18px', opacity: 0.5 }}>〰️</span>
                                      )}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-info)', fontSize: '12.5px' }}>
                                          {ledCfg.stripSku || ledCfg.stripProduct.sku || ledCfg.stripProduct.one_to_one_code}
                                        </span>
                                        {ledCfg.stripProduct.brand && (
                                          <span style={{ fontSize: '10px', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                                            {ledCfg.stripProduct.brand}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ledCfg.stripName || ledCfg.stripProduct.client_description || ledCfg.stripProduct.name}
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px', flexWrap: 'wrap' }}>
                                        {(ledCfg.stripProduct.wattage || ledCfg.stripWattsPerMeter) && <span>⚡ {ledCfg.stripProduct.wattage || ledCfg.stripWattsPerMeter}W/m</span>}
                                        {(ledCfg.stripProduct.color_temperature || ledCfg.stripProduct.kelvin) && <span>🌡️ {ledCfg.stripProduct.color_temperature || ledCfg.stripProduct.kelvin}</span>}
                                        {ledCfg.stripProduct.ip_rating && <span>💧 IP{ledCfg.stripProduct.ip_rating}</span>}
                                        {ledCfg.stripProduct.cri && <span>CRI {ledCfg.stripProduct.cri}</span>}
                                        <span>🔌 24V DC</span>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <button 
                                        className="btn btn-secondary btn-xs"
                                        onClick={() => openCatalogPicker(tag, 'led_strip', 'LEDStrip')}
                                        style={{ fontSize: '11px' }}
                                      >
                                        Change
                                      </button>
                                      <button 
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => handleInspectItem(ledCfg.stripProduct, tag)}
                                        style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                      >
                                        <Eye size={11} /> Specs
                                      </button>
                                      <button 
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => handleClearLedComponent(tag, 'strip')}
                                        style={{ color: 'var(--text-danger)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                        title="Clear strip"
                                      >
                                        <Trash2 size={11} /> Clear
                                      </button>
                                    </div>
                                  </div>

                                  {/* EDITABLE STRIP METERS & PRICING BAR */}
                                  <div style={{ 
                                    borderTop: '1px solid var(--border)', 
                                    paddingTop: '8px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Strip Meters:</span>
                                        <input 
                                          type="number" 
                                          step="0.1" 
                                          value={stripMeters} 
                                          onChange={e => handleUpdateLedConfig(tag, 'stripMeters', parseFloat(e.target.value) || 0)}
                                          style={{ width: '60px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}
                                        />
                                        <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>m</span>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Cost/m:</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>R</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={stripCost} 
                                          onChange={e => handleUpdateLedConfig(tag, 'stripCost', parseFloat(e.target.value) || 0)}
                                          style={{ width: '70px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}
                                        />
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Retail/m:</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-success)' }}>R</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={stripRetail} 
                                          onChange={e => handleUpdateLedConfig(tag, 'stripRetail', parseFloat(e.target.value) || 0)}
                                          style={{ width: '75px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 700, color: 'var(--text-success)' }}
                                        />
                                      </div>
                                    </div>

                                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      Total: <span style={{ color: 'var(--text-info)' }}>R {Math.round(stripMeters * stripRetail).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                                  No LED strip selected yet. Click "+ Select Strip" to choose from master catalog.
                                </div>
                              )}
                            </div>

                            {/* COMPONENT 3: 24V DRIVER */}
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              border: '1px solid var(--border)', 
                              borderRadius: '8px', 
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  3. 24V Constant Voltage Driver
                                </span>
                                {!ledCfg.driverProduct && (
                                  <button 
                                    className="btn btn-primary btn-xs"
                                    onClick={() => openCatalogPicker(tag, 'led_driver', 'Accessory')}
                                    style={{ fontSize: '11px' }}
                                  >
                                    + Select Driver
                                  </button>
                                )}
                              </div>

                              {ledCfg.driverProduct ? (
                                <>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div 
                                      style={{ 
                                        width: '56px', 
                                        height: '56px', 
                                        borderRadius: '6px', 
                                        background: 'var(--bg-primary)', 
                                        border: '1px solid var(--border)', 
                                        overflow: 'hidden', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        flexShrink: 0,
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => handleInspectItem(ledCfg.driverProduct, tag)}
                                      title="Click to view full specs"
                                    >
                                      {ledCfg.driverProduct.image_url ? (
                                        <img 
                                          src={ledCfg.driverProduct.image_url.startsWith('http') ? ledCfg.driverProduct.image_url : `${API_BASE}${ledCfg.driverProduct.image_url}`} 
                                          alt="driver" 
                                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                        />
                                      ) : (
                                        <span style={{ fontSize: '18px', opacity: 0.5 }}>⚡</span>
                                      )}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-info)', fontSize: '12.5px' }}>
                                          {ledCfg.driverSku || ledCfg.driverProduct.sku || ledCfg.driverProduct.one_to_one_code}
                                        </span>
                                        {ledCfg.driverProduct.brand && (
                                          <span style={{ fontSize: '10px', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                                            {ledCfg.driverProduct.brand}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ledCfg.driverName || ledCfg.driverProduct.client_description || ledCfg.driverProduct.name}
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px', flexWrap: 'wrap' }}>
                                        {(ledCfg.driverProduct.wattage || ledCfg.driverWattage) && <span>⚡ {ledCfg.driverProduct.wattage || ledCfg.driverWattage}W</span>}
                                        <span>🔌 24V DC</span>
                                        {(ledCfg.driverProduct.dimming_protocol || ledCfg.driverProduct.dimmable) && (
                                          <span>🎛️ {ledCfg.driverProduct.dimming_protocol || (ledCfg.driverProduct.dimmable === 'Yes' ? 'Dimmable' : 'Non-Dim')}</span>
                                        )}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <button 
                                        className="btn btn-secondary btn-xs"
                                        onClick={() => openCatalogPicker(tag, 'led_driver', 'Accessory')}
                                        style={{ fontSize: '11px' }}
                                      >
                                        Change
                                      </button>
                                      <button 
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => handleInspectItem(ledCfg.driverProduct, tag)}
                                        style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                      >
                                        <Eye size={11} /> Specs
                                      </button>
                                      <button 
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => handleClearLedComponent(tag, 'driver')}
                                        style={{ color: 'var(--text-danger)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                        title="Clear driver"
                                      >
                                        <Trash2 size={11} /> Clear
                                      </button>
                                    </div>
                                  </div>

                                  {/* EDITABLE DRIVER QTY & PRICING BAR */}
                                  <div style={{ 
                                    borderTop: '1px solid var(--border)', 
                                    paddingTop: '8px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Driver Qty:</span>
                                        <input 
                                          type="number" 
                                          min="1" 
                                          value={driverQty} 
                                          onChange={e => handleUpdateLedConfig(tag, 'driverQty', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                          style={{ width: '45px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}
                                        />
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Cost:</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>R</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={driverCost} 
                                          onChange={e => handleUpdateLedConfig(tag, 'driverCost', parseFloat(e.target.value) || 0)}
                                          style={{ width: '70px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}
                                        />
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Retail:</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-success)' }}>R</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={driverRetail} 
                                          onChange={e => handleUpdateLedConfig(tag, 'driverRetail', parseFloat(e.target.value) || 0)}
                                          style={{ width: '75px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 700, color: 'var(--text-success)' }}
                                        />
                                      </div>
                                    </div>

                                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      Total: <span style={{ color: 'var(--text-info)' }}>R {Math.round(driverQty * driverRetail).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                                  No driver selected yet. Click "+ Select Driver" to choose from master catalog.
                                </div>
                              )}
                            </div>

                            {/* DYNAMIC ACCESSORIES SECTION */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Dynamic Accessories & Hardware ({accessories.length})
                                </span>
                                <button 
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => openCatalogPicker(tag, 'accessory', 'Accessory')}
                                  style={{ fontSize: '11px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <Plus size={12} /> Add Accessory
                                </button>
                              </div>

                              {accessories.length === 0 ? (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                  No linked accessories. Click "+ Add Accessory" to include end caps, joiners, suspension kits, or mounting clips.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {accessories.map((acc, accIdx) => {
                                    const accUnits = acc.qtyPerFitting !== undefined 
                                      ? Math.max(1, parseInt(acc.qtyPerFitting, 10) || 1) 
                                      : (acc.ratio ? Math.max(1, Math.round(Number(acc.ratio))) : 1);
                                    const accCost = acc.customCost !== undefined ? acc.customCost : (acc.cost_price || 0);
                                    const accRetail = acc.customRetail !== undefined ? acc.customRetail : (acc.retail_price || 0);

                                    return (
                                      <div 
                                        key={acc.id || accIdx}
                                        style={{ 
                                          background: 'var(--bg-secondary)', 
                                          border: '1px solid var(--border)', 
                                          borderRadius: '6px', 
                                          padding: '8px 10px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '6px'
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                                              {acc.sku || acc.one_to_one_code || 'ACC'}
                                            </span>
                                            <span style={{ fontSize: '11.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {acc.name || acc.client_description}
                                            </span>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button 
                                              className="btn btn-ghost btn-xs" 
                                              onClick={() => handleInspectItem(acc, tag)}
                                              style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 6px' }}
                                              title="View accessory specifications"
                                            >
                                              <Eye size={11} /> Specs
                                            </button>
                                            <button 
                                              className="btn btn-ghost btn-xs" 
                                              onClick={() => handleRemoveAccessory(tag, accIdx)}
                                              style={{ color: 'var(--text-danger)', padding: '2px' }}
                                              title="Remove accessory"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>

                                        {/* ACCESSORY UNITS & PRICING BAR */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11px', borderTop: '1px dashed var(--border)', paddingTop: '6px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Units per Run:</span>
                                            <input 
                                              type="number"
                                              min="1"
                                              value={accUnits}
                                              onChange={e => handleUpdateAccessoryQtyPerFitting(tag, accIdx, e.target.value)}
                                              style={{ width: '42px', height: '22px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}
                                            />
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <span style={{ color: 'var(--text-secondary)' }}>Cost:</span>
                                              <span style={{ color: 'var(--text-tertiary)' }}>R</span>
                                              <input 
                                                type="number"
                                                step="0.01"
                                                value={accCost}
                                                onChange={e => handleUpdateAccessoryPrice(tag, accIdx, 'customCost', e.target.value)}
                                                style={{ width: '55px', height: '22px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: '11px', color: 'var(--text-primary)' }}
                                              />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <span style={{ color: 'var(--text-secondary)' }}>Retail:</span>
                                              <span style={{ color: 'var(--text-success)' }}>R</span>
                                              <input 
                                                type="number"
                                                step="0.01"
                                                value={accRetail}
                                                onChange={e => handleUpdateAccessoryPrice(tag, accIdx, 'customRetail', e.target.value)}
                                                style={{ width: '60px', height: '22px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--text-success)', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-success)' }}
                                              />
                                            </div>

                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                              Total: <span style={{ color: 'var(--text-info)' }}>R {Math.round(accUnits * accRetail).toLocaleString()}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* FINANCIALS SUMMARY FOOTER */}
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              borderTop: '1px solid var(--border)', 
                              margin: '0 -14px -14px -14px', 
                              padding: '10px 14px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Est. Assembly Cost: <strong style={{ color: 'var(--text-primary)' }}>R {totalRunCost.toLocaleString()}</strong>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', background: marginPct >= 30 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: marginPct >= 30 ? 'var(--text-success)' : 'var(--text-warning)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  {marginPct}% Margin
                                </span>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-success)' }}>
                                  R {totalRunRetail.toLocaleString()}
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* -------------------------------------------------------- */}
              {/* SUB-TAB 3: TRACK SYSTEMS BUILDER */}
              {/* -------------------------------------------------------- */}
              {specSubTab === 'tracks' && (
                trackSystemTags.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🛤️</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>No Track Systems Found</div>
                    <div style={{ fontSize: '12px', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0', lineHeight: 1.5 }}>
                      Track systems are automatically detected when CAD layers use the <code>0-TRACKS-*</code> prefix or plan tags start with <code>TRK</code> or <code>TRACK</code>. You can also switch any Point Fixture to Track System using the type dropdown.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(520px, 1fr))', gap: '16px' }}>
                    {trackSystemTags.map(tagInfo => {
                      const tag = tagInfo.tag;
                      const spec = specifications[tag];
                      const trackCfg = spec?.trackConfig || {};
                      const accessories = spec?.accessories || [];
                      const spots = trackCfg.spots || [];
                      const meters = tagInfo.totalMeters || tagInfo.totalQty || 3;
                      const cleanLen = Math.round(meters * 100) / 100;

                      const railMeters = trackCfg.railMeters !== undefined ? Number(trackCfg.railMeters) : cleanLen;
                      const railCost = trackCfg.railCost !== undefined ? Number(trackCfg.railCost) : Number(trackCfg.railProduct?.cost_price || 0);
                      const railRetail = trackCfg.railRetail !== undefined ? Number(trackCfg.railRetail) : Number(trackCfg.railProduct?.retail_price || 0);

                      const driverQty = trackCfg.driverQty !== undefined ? Number(trackCfg.driverQty) : 1;
                      const driverCost = trackCfg.driverCost !== undefined ? Number(trackCfg.driverCost) : Number(trackCfg.driverProduct?.cost_price || 0);
                      const driverRetail = trackCfg.driverRetail !== undefined ? Number(trackCfg.driverRetail) : Number(trackCfg.driverProduct?.retail_price || 0);

                      let spotsCost = 0;
                      let spotsRetail = 0;
                      spots.forEach(sp => {
                        const q = Number(sp.qty || 1);
                        spotsCost += (q * Number(sp.cost_price || 0));
                        spotsRetail += (q * Number(sp.retail_price || 0));
                      });

                      let accsCost = 0;
                      let accsRetail = 0;
                      accessories.forEach(acc => {
                        const units = acc.qtyPerFitting !== undefined ? Math.max(1, parseInt(acc.qtyPerFitting, 10) || 1) : 1;
                        const c = acc.customCost !== undefined ? Number(acc.customCost) : Number(acc.cost_price || 0);
                        const r = acc.customRetail !== undefined ? Number(acc.customRetail) : Number(acc.retail_price || 0);
                        accsCost += (units * c);
                        accsRetail += (units * r);
                      });

                      const totalTrackCost = Math.round((railMeters * railCost) + spotsCost + (driverQty * driverCost) + accsCost);
                      const totalTrackRetail = Math.round((railMeters * railRetail) + spotsRetail + (driverQty * driverRetail) + accsRetail);
                      const marginPct = totalTrackRetail > 0 ? Math.round(((totalTrackRetail - totalTrackCost) / totalTrackRetail) * 100) : 0;

                      return (
                        <div 
                          key={tag}
                          style={{ 
                            background: 'var(--bg-primary)', 
                            border: (trackCfg.railProduct || spots.length > 0) ? '1px solid var(--border)' : '1.5px dashed var(--border-warning, #f59e0b)', 
                            borderRadius: '10px', 
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* BUILDER HEADER */}
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
                                fontWeight: 800, 
                                fontSize: '13px', 
                                padding: '3px 8px', 
                                borderRadius: '4px' 
                              }}>
                                🛤️ {tag}
                              </span>
                              <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {cleanLen}m total track system
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                  Across {tagInfo.areasCount} room(s) & {tagInfo.floorsCount} floor(s) [{tagInfo.runs.length} run(s)]
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <select
                                value="track_system"
                                onChange={(e) => handleUpdateTagType(tag, e.target.value)}
                                className="select select-xs"
                                style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', height: '24px', background: 'var(--bg-primary)' }}
                              >
                                <option value="fixture">💡 Point Fixture</option>
                                <option value="linear_led">〰️ Linear LED</option>
                                <option value="track_system">🛤️ Track System</option>
                              </select>

                              <button 
                                className="btn btn-ghost btn-xs" 
                                onClick={() => handleRemoveProductFromSpec(tag)}
                                style={{ color: 'var(--text-danger)', fontSize: '11px' }}
                                title="Reset builder configuration"
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          {/* BUILDER CONTENT */}
                          <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            
                            {/* COMPONENT 1: TRACK RAILS */}
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              border: '1px solid var(--border)', 
                              borderRadius: '8px', 
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  1. Track Profile Rail
                                </span>
                                {!trackCfg.railProduct && (
                                  <button 
                                    className="btn btn-primary btn-xs"
                                    onClick={() => openCatalogPicker(tag, 'track_rail', 'Track')}
                                    style={{ fontSize: '11px' }}
                                  >
                                    + Select Rail
                                  </button>
                                )}
                              </div>

                              {trackCfg.railProduct ? (
                                <>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div 
                                      style={{ 
                                        width: '56px', 
                                        height: '56px', 
                                        borderRadius: '6px', 
                                        background: 'var(--bg-primary)', 
                                        border: '1px solid var(--border)', 
                                        overflow: 'hidden', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        flexShrink: 0,
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => handleInspectItem(trackCfg.railProduct, tag)}
                                      title="Click to view full specs"
                                    >
                                      {trackCfg.railProduct.image_url ? (
                                        <img 
                                          src={trackCfg.railProduct.image_url.startsWith('http') ? trackCfg.railProduct.image_url : `${API_BASE}${trackCfg.railProduct.image_url}`} 
                                          alt="rail" 
                                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                        />
                                      ) : (
                                        <span style={{ fontSize: '18px', opacity: 0.5 }}>🛤️</span>
                                      )}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-info)', fontSize: '12.5px' }}>
                                          {trackCfg.railSku || trackCfg.railProduct.sku || trackCfg.railProduct.one_to_one_code}
                                        </span>
                                        {trackCfg.railProduct.brand && (
                                          <span style={{ fontSize: '10px', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                                            {trackCfg.railProduct.brand}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {trackCfg.railName || trackCfg.railProduct.client_description || trackCfg.railProduct.name}
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px', flexWrap: 'wrap' }}>
                                        {trackCfg.railProduct.color && <span>Finish: {trackCfg.railProduct.color}</span>}
                                        <span>📏 Track Rail</span>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <button 
                                        className="btn btn-secondary btn-xs"
                                        onClick={() => openCatalogPicker(tag, 'track_rail', 'Track')}
                                        style={{ fontSize: '11px' }}
                                      >
                                        Change
                                      </button>
                                      <button 
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => handleInspectItem(trackCfg.railProduct, tag)}
                                        style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                      >
                                        <Eye size={11} /> Specs
                                      </button>
                                      <button 
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => handleClearTrackComponent(tag, 'rail')}
                                        style={{ color: 'var(--text-danger)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                        title="Clear rail"
                                      >
                                        <Trash2 size={11} /> Clear
                                      </button>
                                    </div>
                                  </div>

                                  {/* EDITABLE RAIL METERS & PRICING BAR */}
                                  <div style={{ 
                                    borderTop: '1px solid var(--border)', 
                                    paddingTop: '8px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Track Meters:</span>
                                        <input 
                                          type="number" 
                                          step="0.1" 
                                          value={railMeters} 
                                          onChange={e => handleUpdateTrackConfig(tag, 'railMeters', parseFloat(e.target.value) || 0)}
                                          style={{ width: '60px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}
                                        />
                                        <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>m</span>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Cost/m:</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>R</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={railCost} 
                                          onChange={e => handleUpdateTrackConfig(tag, 'railCost', parseFloat(e.target.value) || 0)}
                                          style={{ width: '70px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}
                                        />
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Retail/m:</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-success)' }}>R</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={railRetail} 
                                          onChange={e => handleUpdateTrackConfig(tag, 'railRetail', parseFloat(e.target.value) || 0)}
                                          style={{ width: '75px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 700, color: 'var(--text-success)' }}
                                        />
                                      </div>
                                    </div>

                                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      Total: <span style={{ color: 'var(--text-info)' }}>R {Math.round(railMeters * railRetail).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                                  No track profile selected yet. Click "+ Select Rail" to choose from master catalog.
                                </div>
                              )}
                            </div>

                            {/* COMPONENT 2: TRACK SPOTLIGHTS & LUMINAIRES */}
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              border: '1px solid var(--border)', 
                              borderRadius: '8px', 
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  2. Mounted Spotlights & Track Heads ({spots.length})
                                </span>
                                <button 
                                  className="btn btn-secondary btn-xs"
                                  onClick={() => openCatalogPicker(tag, 'track_spot', 'Spotlight')}
                                  style={{ fontSize: '11px' }}
                                >
                                  + Add Spotlight
                                </button>
                              </div>

                              {spots.length === 0 ? (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
                                  No spotlights mounted to this track yet. Click "+ Add Spotlight" to attach luminaires.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {spots.map(sp => (
                                    <div 
                                      key={sp.id}
                                      style={{ 
                                        background: 'var(--bg-primary)', 
                                        border: '1px solid var(--border)', 
                                        borderRadius: '6px', 
                                        padding: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                          <div 
                                            style={{ 
                                              width: '44px', 
                                              height: '44px', 
                                              borderRadius: '4px', 
                                              background: 'var(--bg-secondary)', 
                                              border: '1px solid var(--border)', 
                                              overflow: 'hidden', 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              justifyContent: 'center', 
                                              flexShrink: 0,
                                              cursor: 'pointer'
                                            }}
                                            onClick={() => handleInspectItem(sp.product || sp, tag)}
                                            title="Click to view full specs"
                                          >
                                            {sp.image_url || sp.product?.image_url ? (
                                              <img 
                                                src={(sp.image_url || sp.product?.image_url).startsWith('http') ? (sp.image_url || sp.product?.image_url) : `${API_BASE}${sp.image_url || sp.product?.image_url}`} 
                                                alt="spot" 
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                              />
                                            ) : (
                                              <span style={{ fontSize: '14px' }}>💡</span>
                                            )}
                                          </div>
                                          <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                                                {sp.sku || sp.product?.sku}
                                              </span>
                                              {sp.product?.brand && (
                                                <span style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                                                  {sp.product.brand}
                                                </span>
                                              )}
                                            </div>
                                            <div style={{ fontSize: '11.5px', color: 'var(--text-primary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {sp.name || sp.product?.client_description || sp.product?.name}
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', flexWrap: 'wrap' }}>
                                              {(sp.product?.wattage || sp.wattage) && <span>⚡ {sp.product?.wattage || sp.wattage}W</span>}
                                              {(sp.product?.color_temperature || sp.cct) && <span>🌡️ {sp.product?.color_temperature || sp.cct}</span>}
                                              {(sp.product?.beam_angle || sp.beamAngle) && <span>📐 {sp.product?.beam_angle || sp.beamAngle}</span>}
                                              {sp.product?.cri && <span>CRI {sp.product?.cri}</span>}
                                            </div>
                                          </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <button 
                                            className="btn btn-ghost btn-xs" 
                                            onClick={() => handleInspectItem(sp.product || sp, tag)}
                                            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 6px' }}
                                            title="View spotlight specifications"
                                          >
                                            <Eye size={11} /> Specs
                                          </button>
                                          <button 
                                            className="btn btn-ghost btn-xs" 
                                            onClick={() => handleRemoveTrackSpot(tag, sp.id)}
                                            style={{ padding: '2px', color: 'var(--text-danger)' }}
                                            title="Remove spotlight"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* SPOT QTY & PRICING BAR */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11px', borderTop: '1px dashed var(--border)', paddingTop: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: 'var(--text-secondary)' }}>Qty:</span>
                                          <input 
                                            type="number" 
                                            min="1" 
                                            value={sp.qty || 1} 
                                            onChange={e => handleUpdateTrackSpot(tag, sp.id, 'qty', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                            style={{ width: '42px', height: '22px', padding: '1px 3px', fontSize: '11px', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 600 }}
                                          />
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Cost:</span>
                                            <span style={{ color: 'var(--text-tertiary)' }}>R</span>
                                            <input 
                                              type="number" 
                                              step="0.01" 
                                              value={sp.cost_price || 0} 
                                              onChange={e => handleUpdateTrackSpot(tag, sp.id, 'cost_price', parseFloat(e.target.value) || 0)}
                                              style={{ width: '55px', height: '22px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: '11px', color: 'var(--text-primary)' }}
                                            />
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Retail:</span>
                                            <span style={{ color: 'var(--text-success)' }}>R</span>
                                            <input 
                                              type="number" 
                                              step="0.01" 
                                              value={sp.retail_price || 0} 
                                              onChange={e => handleUpdateTrackSpot(tag, sp.id, 'retail_price', parseFloat(e.target.value) || 0)}
                                              style={{ width: '60px', height: '22px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--text-success)', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-success)' }}
                                            />
                                          </div>

                                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                            Total: <span style={{ color: 'var(--text-info)' }}>R {Math.round((sp.qty || 1) * (sp.retail_price || 0)).toLocaleString()}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* COMPONENT 3: TRACK POWER SUPPLY / DRIVER */}
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              border: '1px solid var(--border)', 
                              borderRadius: '8px', 
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  3. Track Power Supply / Driver
                                </span>
                                {!trackCfg.driverProduct && (
                                  <button 
                                    className="btn btn-primary btn-xs"
                                    onClick={() => openCatalogPicker(tag, 'track_driver', 'Accessory')}
                                    style={{ fontSize: '11px' }}
                                  >
                                    + Select Driver
                                  </button>
                                )}
                              </div>

                              {trackCfg.driverProduct ? (
                                <>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div 
                                      style={{ 
                                        width: '56px', 
                                        height: '56px', 
                                        borderRadius: '6px', 
                                        background: 'var(--bg-primary)', 
                                        border: '1px solid var(--border)', 
                                        overflow: 'hidden', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        flexShrink: 0,
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => handleInspectItem(trackCfg.driverProduct, tag)}
                                      title="Click to view full specs"
                                    >
                                      {trackCfg.driverProduct.image_url ? (
                                        <img 
                                          src={trackCfg.driverProduct.image_url.startsWith('http') ? trackCfg.driverProduct.image_url : `${API_BASE}${trackCfg.driverProduct.image_url}`} 
                                          alt="driver" 
                                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                        />
                                      ) : (
                                        <span style={{ fontSize: '18px', opacity: 0.5 }}>⚡</span>
                                      )}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-info)', fontSize: '12.5px' }}>
                                          {trackCfg.driverSku || trackCfg.driverProduct.sku || trackCfg.driverProduct.one_to_one_code}
                                        </span>
                                        {trackCfg.driverProduct.brand && (
                                          <span style={{ fontSize: '10px', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                                            {trackCfg.driverProduct.brand}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {trackCfg.driverName || trackCfg.driverProduct.client_description || trackCfg.driverProduct.name}
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px', flexWrap: 'wrap' }}>
                                        {(trackCfg.driverProduct.wattage || trackCfg.driverWattage) && <span>⚡ {trackCfg.driverProduct.wattage || trackCfg.driverWattage}W</span>}
                                        <span>🔌 48V DC</span>
                                        {trackCfg.driverProduct.dimming_protocol && <span>🎛️ {trackCfg.driverProduct.dimming_protocol}</span>}
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <button 
                                        className="btn btn-secondary btn-xs"
                                        onClick={() => openCatalogPicker(tag, 'track_driver', 'Accessory')}
                                        style={{ fontSize: '11px' }}
                                      >
                                        Change
                                      </button>
                                      <button 
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => handleInspectItem(trackCfg.driverProduct, tag)}
                                        style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                      >
                                        <Eye size={11} /> Specs
                                      </button>
                                      <button 
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => handleClearTrackComponent(tag, 'driver')}
                                        style={{ color: 'var(--text-danger)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                        title="Clear driver"
                                      >
                                        <Trash2 size={11} /> Clear
                                      </button>
                                    </div>
                                  </div>

                                  {/* EDITABLE DRIVER QTY & PRICING BAR */}
                                  <div style={{ 
                                    borderTop: '1px solid var(--border)', 
                                    paddingTop: '8px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Driver Qty:</span>
                                        <input 
                                          type="number" 
                                          min="1" 
                                          value={driverQty} 
                                          onChange={e => handleUpdateTrackConfig(tag, 'driverQty', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                          style={{ width: '45px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}
                                        />
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Cost:</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>R</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={driverCost} 
                                          onChange={e => handleUpdateTrackConfig(tag, 'driverCost', parseFloat(e.target.value) || 0)}
                                          style={{ width: '70px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}
                                        />
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Retail:</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-success)' }}>R</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={driverRetail} 
                                          onChange={e => handleUpdateTrackConfig(tag, 'driverRetail', parseFloat(e.target.value) || 0)}
                                          style={{ width: '75px', height: '22px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 700, color: 'var(--text-success)' }}
                                        />
                                      </div>
                                    </div>

                                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      Total: <span style={{ color: 'var(--text-info)' }}>R {Math.round(driverQty * driverRetail).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                                  No driver selected yet. Click "+ Select Driver" to choose from master catalog.
                                </div>
                              )}
                            </div>

                            {/* DYNAMIC ACCESSORIES SECTION */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Dynamic Accessories & Hardware ({accessories.length})
                                </span>
                                <button 
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => openCatalogPicker(tag, 'accessory', 'Accessory')}
                                  style={{ fontSize: '11px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <Plus size={12} /> Add Accessory
                                </button>
                              </div>

                              {accessories.length === 0 ? (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                  No linked accessories. Click "+ Add Accessory" to include joiners, live feeds, dead ends, or suspension kits.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {accessories.map((acc, accIdx) => {
                                    const accUnits = acc.qtyPerFitting !== undefined 
                                      ? Math.max(1, parseInt(acc.qtyPerFitting, 10) || 1) 
                                      : (acc.ratio ? Math.max(1, Math.round(Number(acc.ratio))) : 1);
                                    const accCost = acc.customCost !== undefined ? acc.customCost : (acc.cost_price || 0);
                                    const accRetail = acc.customRetail !== undefined ? acc.customRetail : (acc.retail_price || 0);

                                    return (
                                      <div 
                                        key={acc.id || accIdx}
                                        style={{ 
                                          background: 'var(--bg-secondary)', 
                                          border: '1px solid var(--border)', 
                                          borderRadius: '6px', 
                                          padding: '8px 10px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '6px'
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                                              {acc.sku || acc.one_to_one_code || 'ACC'}
                                            </span>
                                            <span style={{ fontSize: '11.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {acc.name || acc.client_description}
                                            </span>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button 
                                              className="btn btn-ghost btn-xs" 
                                              onClick={() => handleInspectItem(acc, tag)}
                                              style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 6px' }}
                                              title="View accessory specifications"
                                            >
                                              <Eye size={11} /> Specs
                                            </button>
                                            <button 
                                              className="btn btn-ghost btn-xs" 
                                              onClick={() => handleRemoveAccessory(tag, accIdx)}
                                              style={{ color: 'var(--text-danger)', padding: '2px' }}
                                              title="Remove accessory"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>

                                        {/* ACCESSORY UNITS & PRICING BAR */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11px', borderTop: '1px dashed var(--border)', paddingTop: '6px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Units per System:</span>
                                            <input 
                                              type="number"
                                              min="1"
                                              value={accUnits}
                                              onChange={e => handleUpdateAccessoryQtyPerFitting(tag, accIdx, e.target.value)}
                                              style={{ width: '42px', height: '22px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}
                                            />
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <span style={{ color: 'var(--text-secondary)' }}>Cost:</span>
                                              <span style={{ color: 'var(--text-tertiary)' }}>R</span>
                                              <input 
                                                type="number"
                                                step="0.01"
                                                value={accCost}
                                                onChange={e => handleUpdateAccessoryPrice(tag, accIdx, 'customCost', e.target.value)}
                                                style={{ width: '55px', height: '22px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: '11px', color: 'var(--text-primary)' }}
                                              />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <span style={{ color: 'var(--text-secondary)' }}>Retail:</span>
                                              <span style={{ color: 'var(--text-success)' }}>R</span>
                                              <input 
                                                type="number"
                                                step="0.01"
                                                value={accRetail}
                                                onChange={e => handleUpdateAccessoryPrice(tag, accIdx, 'customRetail', e.target.value)}
                                                style={{ width: '60px', height: '22px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--text-success)', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-success)' }}
                                              />
                                            </div>

                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                              Total: <span style={{ color: 'var(--text-info)' }}>R {Math.round(accUnits * accRetail).toLocaleString()}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* FINANCIALS SUMMARY FOOTER */}
                            <div style={{ 
                              background: 'var(--bg-secondary)', 
                              borderTop: '1px solid var(--border)', 
                              margin: '0 -14px -14px -14px', 
                              padding: '10px 14px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Est. Track System Cost: <strong style={{ color: 'var(--text-primary)' }}>R {totalTrackCost.toLocaleString()}</strong>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', background: marginPct >= 30 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: marginPct >= 30 ? 'var(--text-success)' : 'var(--text-warning)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  {marginPct}% Margin
                                </span>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-success)' }}>
                                  R {totalTrackRetail.toLocaleString()}
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: SUMMARY & TAKEOFF MATRIX */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* TAB 3 SUB-TABS: POINT FIXTURES / LINEAR LED / TRACK SYSTEMS / ALL */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '10px',
            borderBottom: '1px solid var(--border)', 
            paddingBottom: '10px' 
          }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`btn btn-sm ${summarySubTab === 'fixtures' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSummarySubTab('fixtures')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: summarySubTab === 'fixtures' ? 700 : 500 }}
              >
                💡 Point Fixtures ({pointFixtureTags.length})
              </button>
              <button
                className={`btn btn-sm ${summarySubTab === 'leds' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSummarySubTab('leds')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: summarySubTab === 'leds' ? 700 : 500 }}
              >
                〰️ Linear LED ({linearLedTags.length})
              </button>
              <button
                className={`btn btn-sm ${summarySubTab === 'tracks' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSummarySubTab('tracks')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: summarySubTab === 'tracks' ? 700 : 500 }}
              >
                🛤️ Track Systems ({trackSystemTags.length})
              </button>
              <button
                className={`btn btn-sm ${summarySubTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSummarySubTab('all')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: summarySubTab === 'all' ? 700 : 500 }}
              >
                📋 All Plan Tags ({uniqueTags.length})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="btn btn-secondary btn-xs"
                onClick={() => handleExportMatrixCSV(summarySubTab)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                title={`Export ${summarySubTab === 'fixtures' ? 'Point Fixtures' : summarySubTab === 'leds' ? 'Linear LED' : summarySubTab === 'tracks' ? 'Track Systems' : 'All Tags'} Matrix to CSV`}
              >
                <Download size={12} /> Export {summarySubTab === 'fixtures' ? 'Fixtures' : summarySubTab === 'leds' ? 'Linear LED' : summarySubTab === 'tracks' ? 'Track' : 'Matrix'} CSV
              </button>
            </div>
          </div>

          {/* FINANCIAL PREVIEW CARDS */}
          {(() => {
            const curStats = categoryStats[summarySubTab] || categoryStats.all;
            const isFixtures = summarySubTab === 'fixtures';
            const isLeds = summarySubTab === 'leds';
            const isTracks = summarySubTab === 'tracks';

            const qtyLabel = isFixtures ? 'Total Fixtures Counted' : isLeds ? 'Total Linear LED Run' : isTracks ? 'Total Track Run' : 'Total Items & Runs';
            const qtyVal = isFixtures ? `${curStats.totalQtyOrMeters} pcs` : isLeds ? `${curStats.totalQtyOrMeters} m` : isTracks ? `${curStats.totalQtyOrMeters} m` : curStats.totalQtyOrMeters;
            const subtitle = `${curStats.tagsCount} active tags across ${curStats.areasCount} areas`;

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>{qtyLabel}</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {qtyVal}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{subtitle}</span>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Est. Cost (EX VAT)</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                    R {Math.round(curStats.cost).toLocaleString()}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    {isFixtures ? 'Fittings + Accessories' : isLeds ? 'Profiles, Tape, Drivers, Acc' : isTracks ? 'Rails, Spots, Drivers, Acc' : 'All Components & Hardware'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Est. Retail Total (EX VAT)</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-info)', marginTop: '2px' }}>
                    R {Math.round(curStats.retail).toLocaleString()}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Before volume discount</span>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${curStats.margin < 39 ? 'var(--text-danger)' : 'var(--text-success)'}` }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Estimated Margin</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: curStats.margin < 39 ? 'var(--text-danger)' : 'var(--text-success)', marginTop: '2px' }}>
                    {curStats.margin}%
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Baseline target &gt;= 39%</span>
                </div>
              </div>
            );
          })()}

          {/* MATRIX TOOLBAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {summarySubTab === 'fixtures' && '💡 Point Fixtures Matrix (Rooms vs Fixture Tags)'}
                {summarySubTab === 'leds' && '〰️ Linear LED Matrix (Rooms vs Run Lengths in Meters)'}
                {summarySubTab === 'tracks' && '🛤️ Track Systems Matrix (Rooms vs Track Rail Meters)'}
                {summarySubTab === 'all' && '📋 Master Cross-Tabulation Matrix (All Plan Tags)'}
              </span>
              <span className="badge b-info" style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 700 }}>
                {activeMatrixTags.length} {summarySubTab === 'fixtures' ? 'Fixtures' : summarySubTab === 'leds' ? 'LEDs' : summarySubTab === 'tracks' ? 'Tracks' : 'Tags'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Search Area */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 8px', width: '180px' }}>
                <Search size={13} style={{ color: 'var(--text-secondary)', marginRight: '6px' }} />
                <input 
                  type="text" 
                  placeholder="Filter rooms / areas..." 
                  value={matrixSearch}
                  onChange={e => setMatrixSearch(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '11.5px', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Floor Filter */}
              {uniqueFloors.length > 1 && (
                <select 
                  className="select select-xs"
                  value={matrixFloorFilter}
                  onChange={e => setMatrixFloorFilter(e.target.value)}
                  style={{ fontSize: '11.5px', padding: '2px 6px' }}
                >
                  <option value="All">All Floors</option>
                  {uniqueFloors.map(fl => (
                    <option key={fl} value={fl}>{fl}</option>
                  ))}
                </select>
              )}

              {/* Hide Empty Rooms Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={hideEmptyRooms} 
                  onChange={e => setHideEmptyRooms(e.target.checked)} 
                  style={{ cursor: 'pointer' }}
                />
                Hide empty rooms
              </label>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflowX: 'auto', background: 'var(--bg-primary)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 12px', minWidth: '180px' }}>Floor & Room / Area</th>
                  {activeMatrixTags.map(ut => {
                    const isFixture = (specifications[ut.tag]?.itemType || ut.itemType) === 'fixture';
                    const isLed = (specifications[ut.tag]?.itemType || ut.itemType) === 'linear_led';
                    const tagColor = isFixture ? 'var(--text-info)' : isLed ? '#8b5cf6' : '#f59e0b';
                    return (
                      <th key={ut.tag} style={{ padding: '8px 10px', textAlign: 'center', minWidth: '80px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: tagColor, fontSize: '12px' }}>
                            {ut.tag}
                          </span>
                          <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            {isFixture ? 'pcs' : 'm'}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th style={{ padding: '10px 12px', textAlign: 'right', minWidth: '95px' }}>
                    {summarySubTab === 'fixtures' ? 'Room Total (pcs)' : summarySubTab === 'leds' ? 'Room Total (m)' : summarySubTab === 'tracks' ? 'Room Total (m)' : 'Room Total'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMatrixData.length === 0 ? (
                  <tr>
                    <td colSpan={activeMatrixTags.length + 2} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {activeMatrixTags.length === 0 ? (
                        <div>
                          <div style={{ fontSize: '24px', marginBottom: '6px' }}>
                            {summarySubTab === 'fixtures' ? '💡' : summarySubTab === 'leds' ? '〰️' : summarySubTab === 'tracks' ? '🛤️' : '📋'}
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            No {summarySubTab === 'fixtures' ? 'Point Fixtures' : summarySubTab === 'leds' ? 'Linear LED Runs' : summarySubTab === 'tracks' ? 'Track Systems' : 'Plan Tags'} in this Project
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                            Switch sub-tabs above or configure tags in Tab 2.
                          </div>
                        </div>
                      ) : (
                        'No matching rooms or areas found with current filters.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredMatrixData.map((row, idx) => {
                    let rowSum = 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginRight: '6px' }}>[{row.floor}]</span>
                          {row.area}
                        </td>
                        {activeMatrixTags.map(ut => {
                          const q = row.tags[ut.tag] || 0;
                          rowSum += q;
                          const isFixture = (specifications[ut.tag]?.itemType || ut.itemType) === 'fixture';
                          const isLed = (specifications[ut.tag]?.itemType || ut.itemType) === 'linear_led';
                          const displayVal = q > 0 ? (isFixture ? Math.round(q) : `${Math.round(q * 100) / 100}m`) : null;
                          return (
                            <td key={ut.tag} style={{ padding: '8px 10px', textAlign: 'center' }}>
                              {displayVal ? (
                                <span style={{ 
                                  fontWeight: 700, 
                                  color: isFixture ? 'var(--text-primary)' : isLed ? '#7c3aed' : '#d97706' 
                                }}>
                                  {displayVal}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--border)' }}>—</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: summarySubTab === 'fixtures' ? 'var(--text-info)' : summarySubTab === 'leds' ? '#7c3aed' : summarySubTab === 'tracks' ? '#d97706' : 'var(--text-info)' }}>
                          {summarySubTab === 'fixtures' ? Math.round(rowSum) : `${Math.round(rowSum * 100) / 100}${summarySubTab === 'all' ? '' : 'm'}`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredMatrixData.length > 0 && activeMatrixTags.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>Total by Tag</td>
                    {activeMatrixTags.map(ut => {
                      const isFixture = (specifications[ut.tag]?.itemType || ut.itemType) === 'fixture';
                      const isLed = (specifications[ut.tag]?.itemType || ut.itemType) === 'linear_led';
                      const tagTotal = isFixture 
                        ? Math.round(ut.totalQty) 
                        : `${Math.round((ut.totalMeters || ut.totalQty) * 100) / 100}m`;
                      return (
                        <td key={ut.tag} style={{ padding: '10px 10px', textAlign: 'center', color: isFixture ? 'var(--text-info)' : isLed ? '#7c3aed' : '#d97706' }}>
                          {tagTotal}
                        </td>
                      );
                    })}
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-success)', fontSize: '13px' }}>
                      {summarySubTab === 'fixtures' 
                        ? `${categoryStats.fixtures.totalQtyOrMeters} pcs`
                        : summarySubTab === 'leds'
                        ? `${categoryStats.leds.totalQtyOrMeters} m`
                        : summarySubTab === 'tracks'
                        ? `${categoryStats.tracks.totalQtyOrMeters} m`
                        : stats.totalQty}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CATALOG SEARCH & PICKER */}
      {/* ------------------------------------------------------------- */}
      {catalogModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '780px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700 }}>
                <Search size={16} style={{ color: 'var(--text-info)' }} /> 
                {catalogTargetMode === 'product' && (
                  <span>Select Master Fitting for Tag <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{catalogTargetTag}</strong></span>
                )}
                {catalogTargetMode === 'accessory' && (
                  <span>Add Accessory for Tag <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{catalogTargetTag}</strong></span>
                )}
                {catalogTargetMode === 'led_profile' && (
                  <span>Select Aluminium Profile / Channel for Tag <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{catalogTargetTag}</strong></span>
                )}
                {catalogTargetMode === 'led_strip' && (
                  <span>Select LED Strip Tape for Tag <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{catalogTargetTag}</strong></span>
                )}
                {catalogTargetMode === 'led_driver' && (
                  <span>Select 24V Constant Voltage Driver for Tag <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{catalogTargetTag}</strong></span>
                )}
                {catalogTargetMode === 'track_rail' && (
                  <span>Select Track Rail / Profile for Tag <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{catalogTargetTag}</strong></span>
                )}
                {catalogTargetMode === 'track_spot' && (
                  <span>Add Spotlight / Track Luminaire for Tag <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{catalogTargetTag}</strong></span>
                )}
                {catalogTargetMode === 'track_driver' && (
                  <span>Select Power Supply / Track Driver for Tag <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{catalogTargetTag}</strong></span>
                )}
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setCatalogModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* SEARCH & WORKING CATEGORY FILTER BAR */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px' }}>
                <Search size={14} style={{ color: 'var(--text-secondary)', marginRight: '8px' }} />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search catalog by code, name, brand, or specs..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '12.5px' }}
                />
              </div>
              <select 
                className="select select-sm"
                value={catalogCategory}
                onChange={e => setCatalogCategory(e.target.value)}
                style={{ width: '180px', fontSize: '12px' }}
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* RESULTS LIST */}
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
                    style={{ 
                      background: 'var(--bg-primary)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px', 
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      transition: 'border-color 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-info)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {/* THUMBNAIL PHOTO */}
                    <div 
                      style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '6px', 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border)', 
                        overflow: 'hidden', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        flexShrink: 0,
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setInspectedProduct(prod);
                        setInspectedForTag(catalogTargetTag);
                      }}
                      title="Click to view full specifications and photo"
                    >
                      {prod.image_url ? (
                        <img 
                          src={prod.image_url.startsWith('http') ? prod.image_url : `${API_BASE}${prod.image_url}`} 
                          alt={prod.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: '16px', opacity: 0.5 }}>📷</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-info)', fontSize: '13px' }}>
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

                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-success)' }}>
                          R {Number(prod.retail_price || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          Cost: R {Number(prod.cost_price || 0).toLocaleString()}
                        </div>
                      </div>

                      <button 
                        className="btn btn-secondary btn-xs"
                        onClick={() => {
                          setInspectedProduct(prod);
                          setInspectedForTag(catalogTargetTag);
                        }}
                        style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                        title="Inspect full specifications before selecting"
                      >
                        <Eye size={12} /> View
                      </button>

                      <button 
                        className="btn btn-primary btn-xs"
                        onClick={() => handleSelectCatalogItem(prod)}
                        style={{ fontSize: '11px', fontWeight: 600 }}
                      >
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL: FULL FITTING SPECIFICATIONS PREVIEW (BEFORE / AFTER) */}
      {/* ------------------------------------------------------------- */}
      {inspectedProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1200
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '920px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            
            <div className="card-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📖 Fitting Specifications: {inspectedProduct.name || inspectedProduct.sku}
                </span>
                {inspectedProduct.one_to_one_code && (
                  <span className="badge b-info" style={{ fontSize: '11px', padding: '2px 8px', fontFamily: 'monospace', fontWeight: 700 }}>
                    {inspectedProduct.one_to_one_code}
                  </span>
                )}
                <span className="badge b-ghost" style={{ fontSize: '11px', padding: '2px 6px', fontFamily: 'monospace' }}>
                  SKU: {inspectedProduct.sku}
                </span>
                <span className={`badge ${inspectedProduct.selection?.toLowerCase().includes('non') ? 'b-ghost' : 'b-success'}`} style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 700 }}>
                  {inspectedProduct.selection || 'Selection'}
                </span>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setInspectedProduct(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="card-body" style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Description Heading */}
              {inspectedProduct.client_description && (
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Client Specification Description</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {inspectedProduct.client_description}
                  </div>
                </div>
              )}

              {/* DUAL COLUMN: Visuals on Left, Specs on Right */}
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '18px' }}>
                
                {/* Visual Assets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px', textAlign: 'left' }}>
                      📷 Product Visual Asset
                    </span>
                    <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                      {inspectedProduct.image_url ? (
                        <img
                          src={inspectedProduct.image_url.startsWith('http') ? inspectedProduct.image_url : `${API_BASE}${inspectedProduct.image_url}`}
                          alt={inspectedProduct.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)' }}>
                          <span style={{ fontSize: '28px', display: 'block', marginBottom: '4px', opacity: 0.6 }}>📷</span>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>No Visual Photo Available</div>
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {inspectedProduct.family || inspectedProduct.category || 'Catalog Spec'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                      📐 Technical / CAD Drawing
                    </span>
                    <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                      {inspectedProduct.technical_image_url ? (
                        <img
                          src={inspectedProduct.technical_image_url.startsWith('http') ? inspectedProduct.technical_image_url : `${API_BASE}${inspectedProduct.technical_image_url}`}
                          alt={`${inspectedProduct.name} CAD`}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)' }}>
                          <span style={{ fontSize: '28px', display: 'block', marginBottom: '4px', opacity: 0.6 }}>📐</span>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>No CAD Drawing</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {(inspectedProduct.qr_link || inspectedProduct.spec_sheet_url) && (
                    <a 
                      href={inspectedProduct.qr_link || inspectedProduct.spec_sheet_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-outline" 
                      style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', padding: '8px' }}
                    >
                      <FileText size={14} color="var(--text-info)" /> Open Official Spec Sheet (PDF) ↗
                    </a>
                  )}
                </div>

                {/* Technical Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      💡 Optical & Fitting Performance
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Power</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {inspectedProduct.system_power ? `${inspectedProduct.system_power} W` : '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Kelvin (CCT)</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {inspectedProduct.kelvin || '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Color Rendering</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {inspectedProduct.cri ? (String(inspectedProduct.cri).toUpperCase().startsWith('CRI') ? inspectedProduct.cri : `CRI ${inspectedProduct.cri}`) : '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Beam Angle</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {inspectedProduct.beam_angle || '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>IP Rating</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {inspectedProduct.ip_rating ? (String(inspectedProduct.ip_rating).toUpperCase().startsWith('IP') || String(inspectedProduct.ip_rating).toLowerCase().includes('non') ? inspectedProduct.ip_rating : `IP${inspectedProduct.ip_rating}`) : '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Cutout</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                          {inspectedProduct.cutout || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: 'var(--text-warning)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ⚡ Control, Dimming & Light Source
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '11.5px' }}>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Brand:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inspectedProduct.brand || '—'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Dimmable:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inspectedProduct.dimmable || '—'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Dimming Protocol:</span>
                        <div style={{ fontWeight: 700, color: 'var(--text-info)' }}>{inspectedProduct.dimming_protocol || 'On-Off'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Driver Included:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inspectedProduct.driver_incl || '—'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Light Source:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inspectedProduct.light_source_incl || '—'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Finish / Color:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inspectedProduct.color || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🌊 Wetworks & Installation Constraints
                    </h4>
                    <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', padding: '10px 12px', fontSize: '11.5px', color: 'var(--text-primary)' }}>
                      {inspectedProduct.wetworks ? inspectedProduct.wetworks : 'No special wetworks or installation constraints recorded.'}
                    </div>
                  </div>
                </div>

              </div>

              {/* Financial & Stock Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', background: 'rgba(24, 95, 165, 0.04)', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(24, 95, 165, 0.15)' }}>
                <div>
                  <h4 style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-info)', fontWeight: 700, marginBottom: '8px' }}>Default Catalog Pricing</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Cost Price:</span>
                      <div style={{ fontWeight: 600 }}>R {Number(inspectedProduct.cost_price || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Trade Price:</span>
                      <div style={{ fontWeight: 600 }}>R {Number(inspectedProduct.trade_price || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Retail Price:</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-info)' }}>R {Number(inspectedProduct.retail_price || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-info)', fontWeight: 700, marginBottom: '8px' }}>Inventory Summary</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Stock Level:</span>
                      <div style={{ fontWeight: 700, color: inspectedProduct.stock_level > 0 ? 'var(--text-success)' : 'var(--text-warning)' }}>
                        {inspectedProduct.stock_level > 0 ? `${inspectedProduct.stock_level} In Stock` : 'Ordered'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Lead Time:</span>
                      <div style={{ fontWeight: 600 }}>{inspectedProduct.lead_time || '4 weeks'}</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="card-foot" style={{ padding: '12px 20px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setInspectedProduct(null)}>Close</button>
              {inspectedForTag && catalogModalOpen && (
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => handleSelectCatalogItem(inspectedProduct, inspectedForTag)}
                  style={{ fontWeight: 700 }}
                >
                  ✓ Select {catalogTargetMode === 'accessory' ? 'Accessory' : catalogTargetMode?.startsWith('led_') || catalogTargetMode?.startsWith('track_') ? 'Item' : 'Fitting'} for Tag {inspectedForTag}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: BULK PASTE FROM EXCEL */}
      {/* ------------------------------------------------------------- */}
      {showPasteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <div className="card-head" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: 'var(--text-info)' }} /> Paste Count-Up from Excel / CSV
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowPasteModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                Copy columns from your drawing schedule or Excel sheet and paste below:
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
              <button className="btn btn-primary btn-sm" onClick={handleProcessPaste} style={{ fontWeight: 600 }}>Import Rows</button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CAD DRAWING (.DWG) INGESTION */}
      {/* ------------------------------------------------------------- */}
      {showCadModal && (
        <CadImportModal 
          isOpen={showCadModal}
          onClose={() => setShowCadModal(false)}
          onImportData={handleCadImport}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: COPY SPEC TO ANOTHER TAG */}
      {/* ------------------------------------------------------------- */}
      {copySourceTag && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <div className="card-head" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
              <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Copy size={15} style={{ color: 'var(--text-info)' }} /> Copy Specification from {copySourceTag}
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setCopySourceTag(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Select the target plan code on this order to duplicate this fitting, pricing, and all attached accessories to:
              </label>

              {!showCustomCopyInput ? (
                <div>
                  {availableTargetTags.length > 0 ? (
                    <select 
                      className="select select-sm"
                      value={copyTargetTag}
                      onChange={e => setCopyTargetTag(e.target.value)}
                      style={{ width: '100%', fontWeight: 600, fontSize: '12.5px', background: 'var(--bg-primary)' }}
                    >
                      <option value="">-- Select a Plan Code on this Order --</option>
                      {availableTargetTags.map(ut => {
                        const isConfigured = Boolean(specifications[ut.tag]?.product);
                        return (
                          <option key={ut.tag} value={ut.tag}>
                            {ut.tag} ({ut.totalQty} {ut.totalQty === 1 ? 'fixture' : 'fixtures'}) {isConfigured ? '— Already Specified (will overwrite)' : '— Pending Spec'}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                      No other plan codes found on this order. Add additional plan codes in the Count-Up tab first.
                    </div>
                  )}
                  <div style={{ marginTop: '8px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setShowCustomCopyInput(true)}
                      style={{ fontSize: '11px', color: 'var(--text-info)', padding: '2px 6px' }}
                    >
                      + Or enter a custom plan code
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input 
                    type="text" 
                    placeholder="e.g. DL2, DL3"
                    value={copyTargetTag}
                    onChange={e => setCopyTargetTag(e.target.value.toUpperCase())}
                    style={{ width: '100%', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px' }}
                    className="input input-sm"
                  />
                  <div style={{ marginTop: '8px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setShowCustomCopyInput(false)}
                      style={{ fontSize: '11px', color: 'var(--text-info)', padding: '2px 6px' }}
                    >
                      ← Back to order plan codes dropdown
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setCopySourceTag(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleExecuteCopySpec} disabled={!copyTargetTag.trim()}>
                Duplicate Spec
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: GENERATE INTO BOQ SPREADSHEET CONFIRMATION */}
      {/* ------------------------------------------------------------- */}
      {showGenerateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            
            <div className="card-head" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <FileSpreadsheet size={16} style={{ color: 'var(--text-success)' }} /> Compile into BOQ Spreadsheet
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowGenerateModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                This will expand your <strong>{countUpRows.length} count-up entries</strong> into room-by-room items and accessories with your customized pricing, then populate them into the BOQ Spreadsheet.
              </p>

              {/* GENERATION MODE SELECTION */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
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

              {/* ROOM SPACERS TOGGLE */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>
                <input 
                  type="checkbox" 
                  checked={includeRoomSpacers} 
                  onChange={e => setIncludeRoomSpacers(e.target.checked)}
                />
                <span>Automatically insert Room Header Spacers (e.g. <code>— GROUND: KITCHEN —</code>)</span>
              </label>

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
                  fontWeight: 700,
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

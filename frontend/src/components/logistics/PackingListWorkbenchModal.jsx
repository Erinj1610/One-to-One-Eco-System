import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, ClipboardList, Tag, Box, Package, Sparkles, Filter, Printer,
  ChevronDown, Check, ArrowUpDown, ArrowUp, ArrowDown, Split, Link2,
  CheckCircle2, AlertCircle, RefreshCw, Layers, ChevronRight
} from 'lucide-react';
import AttachAccessoryModal from './AttachAccessoryModal';
import PackingListLabelPrinterModal from './PackingListLabelPrinterModal';
import { API_BASE } from '../../api_config';

/**
 * 3-Stage Logistical Packing List Workbench:
 * Stage 1: Pick Sheet (Item & Accessory Organization, Clipboard Worksheet Print)
 * Stage 2: Fitting Labels (Argox Thermal Barcode Label Generation & Printing)
 * Stage 3: Boxing (Box Assignment, Box Manifests & Outer Carton Labels)
 */
export default function PackingListWorkbenchModal({
  isOpen,
  onClose,
  initialDoc = null,
  preselectedKey = '',
  projects = {},
  allOrders = [],
  labelTemplates = [],
  onOpenTemplateManager,
  onSaved
}) {
  if (!isOpen) return null;

  // ─── WORKBENCH STAGE STATE ────────────────────────────────────────────────
  // Stage 1: Pick Sheet | Stage 2: Fitting Labels | Stage 3: Boxing
  const [currentStage, setCurrentStage] = useState(() => {
    if (initialDoc) {
      const st = (initialDoc.status || '').toLowerCase();
      if (st.includes('box')) return 3;
      if (st.includes('label')) return 2;
      return 1;
    }
    return 1;
  });

  const [savedDoc, setSavedDoc] = useState(initialDoc || null);
  const [isSaving, setIsSaving] = useState(false);

  // ─── STAGE 1: PICK SHEET & ORDER LINE STATE ───────────────────────────────
  const [plOrderKey, setPlOrderKey] = useState(() => {
    if (initialDoc) return `${initialDoc.projectKey}:::${initialDoc.orderId}`;
    return preselectedKey || '';
  });
  const [plOrderSearchQuery, setPlOrderSearchQuery] = useState('');
  const [plOrderDropdownOpen, setPlOrderDropdownOpen] = useState(false);
  const [plNotes, setPlNotes] = useState(initialDoc?.notes || '');
  const [plRows, setPlRows] = useState([]);
  const [isLoadingPlItems, setIsLoadingPlItems] = useState(false);

  // Filters & Sorting in Stage 1
  const [plFilterArea, setPlFilterArea] = useState('ALL');
  const [plSortField, setPlSortField] = useState('default');
  const [plSortDirection, setPlSortDirection] = useState('asc');
  const [plSelectedRowKeys, setPlSelectedRowKeys] = useState({});
  const [attachModalTargetRow, setAttachModalTargetRow] = useState(null);
  const [draggedRowKey, setDraggedRowKey] = useState(null);

  // ─── STAGE 3: BOXING STATE ────────────────────────────────────────────────
  const [plAvailableBoxes, setPlAvailableBoxes] = useState(['Box 1', 'Box 2', 'Box 3']);
  const [plActiveBox, setPlActiveBox] = useState('Box 1');
  const [showOuterBoxLabelModal, setShowOuterBoxLabelModal] = useState(false);

  // ─── RESOLVE CURRENT PROJECT & ORDER OBJECTS ──────────────────────────────
  const activeOrderObj = useMemo(() => {
    if (!plOrderKey) return savedDoc?.orderObj || null;
    const [pKey, oId] = plOrderKey.split(':::');
    return allOrders.find(o => o.projectKey === pKey && String(o.id) === String(oId)) || savedDoc?.orderObj || null;
  }, [plOrderKey, allOrders, savedDoc]);

  const activeProjectObj = useMemo(() => {
    if (!plOrderKey) return projects[savedDoc?.projectKey] || null;
    const [pKey] = plOrderKey.split(':::');
    return projects[pKey] || { name: activeOrderObj?.projectName || savedDoc?.projectName || pKey, client: activeOrderObj?.projectClient || savedDoc?.projectClient || '' };
  }, [plOrderKey, projects, activeOrderObj, savedDoc]);

  // Filtered orders list for dropdown selector
  const filteredOrdersList = useMemo(() => {
    if (!plOrderSearchQuery.trim()) return allOrders;
    const q = plOrderSearchQuery.toLowerCase();
    return allOrders.filter(o =>
      (o.id && String(o.id).toLowerCase().includes(q)) ||
      (o.quote_name && o.quote_name.toLowerCase().includes(q)) ||
      (o.po_number && o.po_number.toLowerCase().includes(q)) ||
      (o.projectName && o.projectName.toLowerCase().includes(q)) ||
      (o.projectClient && o.projectClient.toLowerCase().includes(q))
    );
  }, [allOrders, plOrderSearchQuery]);

  // ─── LOAD ORDER ITEMS OR INITIAL SAVED ITEMS ──────────────────────────────
  const loadOrderItems = async (compositeKey, existingPlDoc = null) => {
    setPlOrderKey(compositeKey);
    setPlOrderDropdownOpen(false);
    setPlFilterArea('ALL');
    setPlSortField('default');
    setPlSortDirection('asc');
    setPlSelectedRowKeys({});

    if (!compositeKey) {
      setPlRows([]);
      return;
    }

    const [pKey, oId] = compositeKey.split(':::');

    // 1. If editing an existing PL, load its saved rows immediately
    if (existingPlDoc && Array.isArray(existingPlDoc.items) && existingPlDoc.items.length > 0) {
      const boxesSet = new Set(['Box 1', 'Box 2', 'Box 3']);
      const itemIdCounts = {};
      const editRows = existingPlDoc.items.map((it, idx) => {
        const b = it.box_number || it.boxNumber || 'Box 1';
        boxesSet.add(b);
        const oiId = String(it.order_item_id || `item_${idx}`);
        itemIdCounts[oiId] = (itemIdCounts[oiId] || 0) + 1;
        const isSplit = !it.is_accessory && !it.parent_item_id && itemIdCounts[oiId] > 1;
        return {
          rowKey: `row_${oiId}_${idx}`,
          order_item_id: oiId,
          parent_item_id: it.parent_item_id ? String(it.parent_item_id) : null,
          parent_fitting_code: it.parent_fitting_code || null,
          one_one_code: it.one_one_code || '',
          plan_code: it.plan_code || '',
          supplier_code: it.supplier_code || it.code || '',
          description: it.description || it.name || '',
          floor: it.floor || '',
          area: it.area || '',
          material_colour: it.material_colour || '',
          first_fix: it.first_fix || 'No',
          red_list: it.red_list || 'No',
          qty_ordered: Number(it.qty_ordered || it.qtyOrdered || 0),
          qty_already_packed: 0,
          remaining_to_pack: Number(it.qty_packed ?? it.qtyDelivered ?? 0),
          qty_packed: Number(it.qty_packed ?? it.qtyDelivered ?? 0),
          box_number: b,
          is_accessory: !!it.is_accessory || !!it.parent_item_id,
          is_split_child: isSplit,
          is_hidden_by_attachment: false,
        };
      });
      setPlAvailableBoxes(Array.from(boxesSet));
      setPlRows(editRows);
      return;
    }

    // 2. Fetch enriched order items from backend
    setIsLoadingPlItems(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/logistics/order-items/${encodeURIComponent(oId)}?project_key=${encodeURIComponent(pKey)}`
      );
      if (res.ok) {
        const data = await res.json();
        const apiItems = (data.items || []).filter(
          it => (it.plan_code || '').trim() !== 'SPACER' && ((it.description || '').trim() !== '' || it.one_one_code || it.supplier_code)
        );
        if (apiItems.length > 0) {
          const allRemainingZero = apiItems.every(it => Number(it.remaining_to_pack || 0) <= 0);
          const builtRows = apiItems.map((it, idx) => {
            const oiId = String(it.order_item_id || `item_${idx}`);
            const ordered = Number(it.qty_ordered || 0);
            const rem = Number(it.remaining_to_pack ?? ordered);
            const defaultPackQty = allRemainingZero ? ordered : rem;
            return {
              rowKey: `row_${oiId}_${idx}`,
              order_item_id: oiId,
              parent_item_id: null,
              parent_fitting_code: null,
              one_one_code: it.one_one_code || '',
              plan_code: it.plan_code || '',
              supplier_code: it.supplier_code || '',
              description: it.description || '',
              floor: it.floor || '',
              area: it.area || '',
              material_colour: it.material_colour || '',
              first_fix: it.first_fix || 'No',
              red_list: it.red_list || 'No',
              qty_ordered: ordered,
              qty_already_packed: Number(it.qty_already_packed || 0),
              remaining_to_pack: defaultPackQty,
              qty_packed: defaultPackQty,
              box_number: 'Box 1',
              is_accessory: false,
              is_accessory_candidate: !!it.is_accessory_candidate,
              is_split_child: false,
              is_hidden_by_attachment: false,
            };
          });
          setPlRows(builtRows);
        }
      }
    } catch (err) {
      console.error('Failed to load order items for PL:', err);
    } finally {
      setIsLoadingPlItems(false);
    }
  };

  useEffect(() => {
    if (initialDoc) {
      setSavedDoc(initialDoc);
      const composite = `${initialDoc.projectKey}:::${initialDoc.orderId}`;
      loadOrderItems(composite, initialDoc);
    } else if (preselectedKey) {
      loadOrderItems(preselectedKey, null);
    }
  }, [initialDoc, preselectedKey]);

  // Unique Areas for filtering
  const plUniqueAreas = useMemo(() => {
    const s = new Set();
    plRows.forEach(r => {
      const a = (r.area || '').trim();
      if (a) s.add(a);
    });
    return Array.from(s).sort();
  }, [plRows]);

  // ─── AUTO-NEST ACCESSORIES UNDER MATCHING FITTINGS ────────────────────────
  const handleAutoNestAccessories = () => {
    setPlRows(prev => {
      const accessoryRows = prev.filter(
        r => !r.is_accessory && (r.is_accessory_candidate || r.description?.toLowerCase().includes('lamp') || r.description?.toLowerCase().includes('driver') || r.description?.toLowerCase().includes('gu10'))
      );

      if (accessoryRows.length === 0) {
        alert('No unattached accessory or lamp lines detected to auto-nest.');
        return prev;
      }

      let newRows = [...prev];
      let nestedCount = 0;

      accessoryRows.forEach(acc => {
        const accPlan = (acc.plan_code || '').trim().toLowerCase();
        const accDesc = (acc.description || '').toLowerCase();

        // 1. Match by room & plan code
        let matchingParents = prev.filter(p => {
          if (p.rowKey === acc.rowKey || p.is_accessory || p.parent_item_id) return false;
          const pPlan = (p.plan_code || '').trim().toLowerCase();
          const pArea = (p.area || '').trim().toLowerCase();
          const accArea = (acc.area || '').trim().toLowerCase();
          const areaMatches = pArea && accArea && pArea === accArea;
          const planMatches = accPlan && pPlan && (accPlan === pPlan || accDesc.includes(pPlan));
          return areaMatches || planMatches;
        });

        // 2. Fallback: match by Plan Code anywhere
        if (matchingParents.length === 0 && accPlan) {
          matchingParents = prev.filter(p => !p.is_accessory && !p.parent_item_id && p.rowKey !== acc.rowKey && (p.plan_code || '').trim().toLowerCase() === accPlan);
        }

        // 3. Fallback: match lamps to pendants/downlights
        if (matchingParents.length === 0 && (accDesc.includes('gu10') || accDesc.includes('lamp') || accDesc.includes('bulb'))) {
          matchingParents = prev.filter(p => !p.is_accessory && !p.parent_item_id && p.rowKey !== acc.rowKey && ((p.description || '').toLowerCase().includes('pendant') || (p.description || '').toLowerCase().includes('downlight') || (p.description || '').toLowerCase().includes('spot')));
        }

        if (matchingParents.length > 0) {
          let remainingUnits = Number(acc.qty_packed || acc.remaining_to_pack || acc.qty_ordered || 0);
          const builtAttachments = [];

          matchingParents.forEach((parent, pIdx) => {
            if (remainingUnits <= 0) return;
            const neededQty = Math.min(Number(parent.qty_ordered || 1), remainingUnits);
            if (neededQty > 0) {
              builtAttachments.push({
                rowKey: `auto_att_${acc.order_item_id}_${parent.order_item_id}_${pIdx}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                order_item_id: String(acc.order_item_id),
                parent_item_id: String(parent.order_item_id),
                parent_fitting_code: `${parent.plan_code ? `[${parent.plan_code}] ` : ''}${parent.one_one_code || parent.supplier_code} (${parent.area || 'Site'})`,
                one_one_code: acc.one_one_code,
                plan_code: parent.plan_code || acc.plan_code || '',
                supplier_code: acc.supplier_code,
                description: acc.description,
                floor: parent.floor || acc.floor || '',
                area: parent.area || acc.area || '',
                material_colour: acc.material_colour || '',
                first_fix: acc.first_fix || 'No',
                red_list: acc.red_list || 'No',
                qty_ordered: neededQty,
                qty_packed: neededQty,
                box_number: parent.box_number || 'Box 1',
                is_accessory: true,
                is_split_child: false,
                is_hidden_by_attachment: false,
              });
              remainingUnits -= neededQty;
              nestedCount++;
            }
          });

          if (builtAttachments.length > 0) {
            newRows = newRows.map(r => (r.rowKey === acc.rowKey ? { ...r, is_hidden_by_attachment: true, qty_packed: 0 } : r));
            newRows = [...newRows, ...builtAttachments];
          }
        }
      });

      alert(`Auto-nested ${nestedCount} accessory items directly under matching room fittings!`);
      return newRows;
    });
  };

  // ─── ATTACH ACCESSORY HANDLER ─────────────────────────────────────────────
  const handleConfirmAccessoryAttachments = (accessoryOrderItemId, builtAttachments, unallocatedRemainder) => {
    setPlRows(prev => {
      // Remove any previous attachments from this same accessory order_item_id
      const withoutOld = prev.filter(
        r => !(r.is_accessory && String(r.order_item_id) === String(accessoryOrderItemId))
      );
      // Update the standalone accessory row's packed qty to whatever remains unattached,
      // and hide the standalone row if 100% of its units are now attached underneath parent fittings
      const remQty = Math.max(0, Number(unallocatedRemainder) || 0);
      const updatedMains = withoutOld.map(r => {
        if (!r.is_accessory && String(r.order_item_id) === String(accessoryOrderItemId)) {
          return {
            ...r,
            qty_packed: remQty,
            is_hidden_by_attachment: remQty === 0 && builtAttachments.length > 0,
          };
        }
        return r;
      });
      return [...updatedMains, ...builtAttachments];
    });
    setAttachModalTargetRow(null);
  };

  // ─── SPLIT ROW HANDLER ────────────────────────────────────────────────────
  const handleSplitRow = (row) => {
    const currentPacked = Number(row.qty_packed || 0);
    if (currentPacked <= 1) {
      alert('Packed quantity must be at least 2 to split into multiple lines.');
      return;
    }
    const splitQty = Math.floor(currentPacked / 2);
    const remainingQty = currentPacked - splitQty;

    setPlRows(prev => {
      const copy = [...prev];
      const targetIdx = copy.findIndex(r => r.rowKey === row.rowKey);
      if (targetIdx === -1) return prev;

      copy[targetIdx] = { ...copy[targetIdx], qty_packed: remainingQty };
      const newChild = {
        ...copy[targetIdx],
        rowKey: `split_${row.order_item_id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        qty_packed: splitQty,
        qty_ordered: splitQty,
        is_split_child: true,
      };
      copy.splice(targetIdx + 1, 0, newChild);
      return copy;
    });
  };

  const handleRemoveSubRow = (rowKey) => {
    setPlRows(prev => {
      const target = prev.find(r => r.rowKey === rowKey);
      if (!target) return prev;
      const filtered = prev.filter(r => r.rowKey !== rowKey);
      if (target.is_accessory) {
        const remainingAtts = filtered.filter(r => r.is_accessory && String(r.order_item_id) === String(target.order_item_id));
        if (remainingAtts.length === 0) {
          return filtered.map(r =>
            String(r.order_item_id) === String(target.order_item_id) && !r.is_accessory
              ? { ...r, is_hidden_by_attachment: false, qty_packed: Number(r.remaining_to_pack || r.qty_ordered || 0) }
              : r
          );
        }
      }
      return filtered;
    });
  };

  // ─── DRAG AND DROP REORDERING ─────────────────────────────────────────────
  const handleDragStart = (e, rowKey) => {
    setDraggedRowKey(rowKey);
    e.dataTransfer.setData('text/plain', rowKey);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDropOnRow = (e, targetRowKey) => {
    e.preventDefault();
    if (!draggedRowKey || draggedRowKey === targetRowKey) return;
    setPlRows(prev => {
      const copy = [...prev];
      const fromIdx = copy.findIndex(r => r.rowKey === draggedRowKey);
      const toIdx = copy.findIndex(r => r.rowKey === targetRowKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = copy.splice(fromIdx, 1);
      const targetItem = copy[toIdx];
      moved.area = targetItem.area;
      moved.floor = targetItem.floor;
      copy.splice(toIdx, 0, moved);
      return copy;
    });
    setDraggedRowKey(null);
  };

  // ─── FILTERED & SORTED ROWS (VISIBLE IN TABLE) ────────────────────────────
  const visiblePlRows = useMemo(() => {
    const mainRows = plRows.filter(r => !r.parent_item_id && !r.is_hidden_by_attachment);
    const attachedRows = plRows.filter(r => !!r.parent_item_id);

    let filteredMains = mainRows.filter(r => {
      if (plFilterArea !== 'ALL') {
        const rowArea = (r.area || '').trim() || 'General / Unspecified';
        if (rowArea !== plFilterArea) return false;
      }
      return true;
    });

    if (plSortField && plSortField !== 'default') {
      filteredMains = [...filteredMains].sort((a, b) => {
        let valA = '';
        let valB = '';
        if (plSortField === 'area') {
          valA = (a.area || '').toLowerCase();
          valB = (b.area || '').toLowerCase();
        } else if (plSortField === 'plan') {
          valA = (a.plan_code || '').toLowerCase();
          valB = (b.plan_code || '').toLowerCase();
        } else if (plSortField === 'one_one') {
          valA = (a.one_one_code || '').toLowerCase();
          valB = (b.one_one_code || '').toLowerCase();
        } else if (plSortField === 'sku') {
          valA = (a.supplier_code || '').toLowerCase();
          valB = (b.supplier_code || '').toLowerCase();
        }
        if (valA < valB) return plSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return plSortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const orderedResult = [];
    filteredMains.forEach(main => {
      orderedResult.push(main);
      if (!main.is_split_child) {
        attachedRows
          .filter(att => String(att.parent_item_id) === String(main.order_item_id))
          .forEach(att => orderedResult.push(att));
      }
    });
    return orderedResult;
  }, [plRows, plFilterArea, plSortField, plSortDirection]);

  // Toggle sort
  const handleTogglePlSort = (field) => {
    if (plSortField === field) {
      if (plSortDirection === 'asc') setPlSortDirection('desc');
      else { setPlSortField('default'); setPlSortDirection('asc'); }
    } else {
      setPlSortField(field);
      setPlSortDirection('asc');
    }
  };

  const renderPlSortIcon = (field) => {
    if (plSortField !== field) {
      return <ArrowUpDown size={11} style={{ opacity: 0.35, marginLeft: '4px', verticalAlign: 'middle' }} />;
    }
    return plSortDirection === 'asc'
      ? <ArrowUp size={11} style={{ color: 'var(--text-info)', marginLeft: '4px', verticalAlign: 'middle' }} />
      : <ArrowDown size={11} style={{ color: 'var(--text-info)', marginLeft: '4px', verticalAlign: 'middle' }} />;
  };

  // ─── PRINT WAREHOUSE PICK SHEET (A4 CLIPBOARD SHEET) ─────────────────────
  const handlePrintWarehouseWorksheet = () => {
    if (!plOrderKey || plRows.length === 0) {
      alert('Select an order with items first before printing a warehouse pack sheet.');
      return;
    }
    const [pKey, oId] = plOrderKey.split(':::');
    const orderTitle = activeOrderObj?.quote_name ? `${activeOrderObj.quote_name} (${activeOrderObj.id})` : (oId || 'Order');
    const projTitle = activeOrderObj?.projectName || pKey;
    const clientTitle = activeOrderObj?.projectClient || '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to open the warehouse pack sheet.');
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Warehouse Pick & Pack Sheet - ${orderTitle}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #1e293b; line-height: 1.4; margin: 0; padding: 15px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta { font-size: 11px; color: #475569; }
    .meta strong { color: #0f172a; }
    .instructions { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 6px 10px; font-size: 10.5px; margin-bottom: 14px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    th { background: #0f172a; color: #ffffff; text-align: left; padding: 6px 8px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; border: 1px solid #0f172a; }
    td { padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10.5px; vertical-align: top; }
    .row-accessory { background: #fdf4ff; }
    .row-accessory td { color: #6b21a8; }
    .badge { display: inline-block; padding: 2px 5px; font-size: 9.5px; font-weight: 700; border-radius: 3px; font-family: monospace; }
    .badge-plan { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-code { background: #f1f5f9; color: #334155; }
    .box-blank { width: 85px; border: 1.5px dashed #64748b; background: #ffffff; text-align: center; height: 20px; font-weight: 800; }
    .check-blank { width: 28px; text-align: center; font-size: 14px; }
    .footer { font-size: 9px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 20px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 6px;">
    <span><strong>Tip:</strong> Print on clipboard for warehouse floor picking. Mark Box # by hand as items are packed.</span>
    <button onclick="window.print()" style="background: #2563eb; color: #ffffff; border: none; padding: 6px 14px; border-radius: 4px; font-weight: 700; cursor: pointer;">Print Pick Sheet</button>
  </div>

  <div class="header">
    <div>
      <div class="title">Warehouse Pick & Pack Sheet</div>
      <div class="meta" style="margin-top: 4px;">
        Project: <strong>${projTitle}</strong> ${clientTitle ? `&bull; Client: <strong>${clientTitle}</strong>` : ''}
      </div>
      <div class="meta">
        Order: <strong>${orderTitle}</strong> &bull; Printed: <strong>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 13px; font-weight: 800; font-family: monospace; border: 1px solid #94a3b8; padding: 4px 8px; border-radius: 4px; display: inline-block;">
        STAGE 1: PICK SHEET
      </div>
      <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Total Items: <strong>${visiblePlRows.length}</strong></div>
    </div>
  </div>

  <div class="instructions">
    <strong>INSTRUCTIONS FOR WAREHOUSE PACKERS:</strong>
    1. Verify each fitting and nested accessory. Check [ ✓ ] when picked from shelf.<br/>
    2. Write the designated Box # (e.g. Box 1, Box 2) into the dashed box column.<br/>
    3. Return this sheet to enter box numbers into the system and print thermal carton labels.
  </div>

  <table>
    <thead>
      <tr>
        <th class="check-blank">✓</th>
        <th style="width: 110px;">1-to-1 Code</th>
        <th style="width: 75px; text-align: center;">Plan Code</th>
        <th style="width: 105px;">SKU / Supplier</th>
        <th>Description & Specification</th>
        <th style="width: 130px;">Floor & Room</th>
        <th style="width: 55px; text-align: center;">Qty</th>
        <th class="box-blank">Box # (Write)</th>
      </tr>
    </thead>
    <tbody>
      ${visiblePlRows.map(r => {
        const isAcc = r.is_accessory || r.parent_item_id;
        return `
          <tr class="${isAcc ? 'row-accessory' : ''}">
            <td class="check-blank" style="text-align: center; vertical-align: middle;">[ &nbsp; ]</td>
            <td style="font-family: monospace; font-weight: 700;">
              ${isAcc ? '&nbsp;&nbsp;↳ ' : ''}${r.one_one_code || '—'}
            </td>
            <td style="text-align: center;">
              ${r.plan_code ? `<span class="badge badge-plan">${r.plan_code}</span>` : '—'}
            </td>
            <td style="font-family: monospace; font-size: 10px; color: #475569;">
              ${r.supplier_code || '—'}
            </td>
            <td>
              <div style="font-weight: ${isAcc ? '600' : '700'};">${r.description || ''}</div>
              ${r.parent_fitting_code ? `<div style="font-size: 9px; color: #7e22ce;">Attached to fitting: ${r.parent_fitting_code}</div>` : ''}
              ${r.material_colour ? `<span style="font-size: 9.5px; color: #64748b;">Col: ${r.material_colour}</span>` : ''}
            </td>
            <td>
              <strong>${r.area || 'General / Unspecified'}</strong>
              ${r.floor ? `<div style="font-size: 9px; color: #64748b;">${r.floor}</div>` : ''}
            </td>
            <td style="text-align: center; font-size: 13px; font-weight: 800;">
              ${r.qty_packed || r.qty_ordered || 0}
            </td>
            <td class="box-blank"></td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    One to One Logistics Pick & Pack Engine &bull; Document Reference: ${savedDoc?.id || 'NEW'}
  </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ─── SAVE PACKING LIST (USED IN STAGE 1 & STAGE 3) ─────────────────────────
  const savePackingListToBackend = async (targetStageName = 'Pick Sheet Ready') => {
    if (!plOrderKey) {
      alert('Please select a destination order first.');
      return null;
    }
    const [pKey, oId] = plOrderKey.split(':::');

    const activeItems = plRows
      .filter(r => Number(r.qty_packed) > 0)
      .map(r => ({
        order_item_id: r.order_item_id ? String(r.order_item_id) : null,
        parent_item_id: r.parent_item_id ? String(r.parent_item_id) : null,
        parent_fitting_code: r.parent_fitting_code || null,
        one_one_code: r.one_one_code || '',
        plan_code: r.plan_code || '',
        supplier_code: r.supplier_code || '',
        description: r.description || '',
        floor: r.floor || '',
        area: r.area || '',
        material_colour: r.material_colour || '',
        first_fix: r.first_fix || 'No',
        red_list: r.red_list || 'No',
        qty_ordered: Number(r.qty_ordered || 0),
        qty_packed: Number(r.qty_packed || 0),
        qty_backorder: Math.max(0, Number(r.qty_ordered || 0) - Number(r.qty_packed || 0)),
        box_number: r.box_number || 'Box 1',
        is_accessory: !!r.is_accessory || !!r.parent_item_id,
      }));

    if (activeItems.length === 0) {
      alert('Please specify a Packed Qty greater than 0 for at least one item.');
      return null;
    }

    setIsSaving(true);
    try {
      const docId = savedDoc?.id || initialDoc?.id;
      const url = docId
        ? `${API_BASE}/api/logistics/packing-list/${encodeURIComponent(docId)}`
        : `${API_BASE}/api/logistics/packing-list`;
      const method = docId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_key: pKey,
          order_id: oId,
          notes: plNotes,
          status: targetStageName,
          items: activeItems,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save packing list');
      }

      const data = await res.json();
      const resultingDoc = data.packing_list || {
        id: data.id || docId,
        projectKey: pKey,
        orderId: oId,
        items: activeItems,
        status: targetStageName,
      };

      setSavedDoc(resultingDoc);
      if (onSaved) onSaved(resultingDoc);
      return resultingDoc;
    } catch (err) {
      alert(`Error saving packing list: ${err.message}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // ─── STAGE 1 TRANSITIONS ──────────────────────────────────────────────────
  const handleStage1SaveAndProceed = async () => {
    const doc = await savePackingListToBackend('Pick Sheet Ready');
    if (doc) {
      setCurrentStage(2); // Advance to Stage 2: Fitting Labels
    }
  };

  // ─── STAGE 2 TRANSITIONS ──────────────────────────────────────────────────
  const handleStage2AdvanceToBoxing = async () => {
    if (!savedDoc?.id) {
      setCurrentStage(3);
      return;
    }
    try {
      await fetch(`${API_BASE}/api/logistics/packing-list/${encodeURIComponent(savedDoc.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Labels Printed' }),
      });
      setSavedDoc(prev => (prev ? { ...prev, status: 'Labels Printed' } : prev));
      if (onSaved) onSaved({ ...savedDoc, status: 'Labels Printed' });
    } catch (e) {
      console.warn('Could not update stage status:', e);
    }
    setCurrentStage(3); // Advance to Stage 3: Boxing
  };

  // ─── STAGE 3: BOXING ACTIONS ──────────────────────────────────────────────
  const handleAddBox = () => {
    const nextNum = plAvailableBoxes.length + 1;
    const name = `Box ${nextNum}`;
    setPlAvailableBoxes(prev => [...prev, name]);
    setPlActiveBox(name);
  };

  const handleAssignSelectedToActiveBox = () => {
    const selectedKeys = Object.keys(plSelectedRowKeys).filter(k => plSelectedRowKeys[k]);
    if (selectedKeys.length === 0) {
      alert('Check at least one item in the table to assign to ' + plActiveBox);
      return;
    }
    setPlRows(prev =>
      prev.map(r => (selectedKeys.includes(r.rowKey) ? { ...r, box_number: plActiveBox } : r))
    );
    setPlSelectedRowKeys({});
  };

  // Summary counts per box
  const boxSummaryCounts = useMemo(() => {
    const map = {};
    plRows.forEach(r => {
      const b = r.box_number || 'Box 1';
      map[b] = (map[b] || 0) + Number(r.qty_packed || 0);
    });
    return map;
  }, [plRows]);

  const handleFinalizeBoxing = async () => {
    const doc = await savePackingListToBackend('Boxed');
    if (doc) {
      alert(`Packing List ${doc.id} is 100% Boxed and Ready for Delivery Note dispatch!`);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          width: '96vw',
          maxWidth: '1480px',
          height: '94vh',
          maxHeight: '920px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ─── WORKBENCH HEADER WITH 3-STAGE PIPELINE STEPPER ────────────────── */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {/* Left: Doc & Project Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--text-info)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {savedDoc?.id || initialDoc?.id || 'NEW PACKING LIST'}
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background:
                      currentStage === 3
                        ? 'rgba(16, 185, 129, 0.15)'
                        : currentStage === 2
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color:
                      currentStage === 3
                        ? '#10b981'
                        : currentStage === 2
                        ? 'var(--text-info)'
                        : '#f59e0b',
                    border: '1px solid currentColor',
                  }}
                >
                  Stage {currentStage}: {currentStage === 1 ? 'Pick Sheet' : currentStage === 2 ? 'Labels' : 'Boxing'}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Project: <strong style={{ color: 'var(--text-primary)' }}>{activeProjectObj?.name || 'Project'}</strong> &bull; Order: <strong style={{ color: 'var(--text-primary)' }}>{activeOrderObj?.quote_name || activeOrderObj?.id || '—'}</strong>
              </div>
            </div>
          </div>

          {/* Center: 3-Stage Stepper Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: currentStage === 1 ? 800 : 600,
                background: currentStage === 1 ? 'var(--bg-primary)' : 'transparent',
                color: currentStage === 1 ? 'var(--text-info)' : 'var(--text-secondary)',
                border: currentStage === 1 ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: currentStage === 1 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => setCurrentStage(1)}
            >
              <ClipboardList size={14} /> 1. Pick Sheet
            </button>

            <ChevronRight size={13} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />

            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: currentStage === 2 ? 800 : 600,
                background: currentStage === 2 ? 'var(--bg-primary)' : 'transparent',
                color: currentStage === 2 ? 'var(--text-info)' : 'var(--text-secondary)',
                border: currentStage === 2 ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: currentStage === 2 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                if (!savedDoc?.id && plRows.length === 0) {
                  alert('Please select an order and save your Pick Sheet first before advancing to Labels.');
                  return;
                }
                setCurrentStage(2);
              }}
            >
              <Tag size={14} /> 2. Fitting Labels
            </button>

            <ChevronRight size={13} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />

            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: currentStage === 3 ? 800 : 600,
                background: currentStage === 3 ? 'var(--bg-primary)' : 'transparent',
                color: currentStage === 3 ? 'var(--text-info)' : 'var(--text-secondary)',
                border: currentStage === 3 ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: currentStage === 3 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                if (!savedDoc?.id && plRows.length === 0) {
                  alert('Please select an order and save your Pick Sheet first before advancing to Boxing.');
                  return;
                }
                setCurrentStage(3);
              }}
            >
              <Box size={14} /> 3. Boxing & Carton Labels
            </button>
          </div>

          {/* Right: Close */}
          <div>
            <button onClick={onClose} className="btn btn-ghost btn-sm" title="Close Workbench">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── STAGE 1 VIEW: PICK SHEET & ITEM ORGANIZATION ─────────────────── */}
        {currentStage === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Top Toolbar: Order Selector & Pick Actions */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Order Dropdown if creating new */}
              {!initialDoc && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Destination Project & Quotation Order *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => setPlOrderDropdownOpen(!plOrderDropdownOpen)}
                      className="form-control"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', height: '34px', background: 'var(--bg-secondary)' }}
                    >
                      <span style={{ fontSize: '12.5px', color: plOrderKey ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: plOrderKey ? 700 : 400 }}>
                        {plOrderKey && activeOrderObj
                          ? `${activeOrderObj.quote_name ? `${activeOrderObj.quote_name} (${activeOrderObj.id})` : activeOrderObj.id} • ${activeOrderObj.projectName}`
                          : 'Select Quotation Order / BOQ...'}
                      </span>
                      <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                    </div>

                    {plOrderDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 15px 35px rgba(0,0,0,0.55)', marginTop: '4px', minHeight: '260px', maxHeight: '420px', overflowY: 'auto' }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-primary)' }}>
                          <input
                            type="text"
                            placeholder="Type to filter projects / orders..."
                            className="form-control"
                            style={{ height: '30px', fontSize: '12px' }}
                            value={plOrderSearchQuery}
                            onChange={e => setPlOrderSearchQuery(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div style={{ padding: '6px' }}>
                          {filteredOrdersList.map(ord => (
                            <div
                              key={`${ord.projectKey}:::${ord.id}`}
                              onClick={() => loadOrderItems(`${ord.projectKey}:::${ord.id}`, null)}
                              className="dropdown-item"
                              style={{ padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                            >
                              <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                                {ord.quote_name || ord.id}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                                <span>{ord.projectName}</span>
                                {ord.projectClient && <span>&bull; {ord.projectClient}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Toolbar: Area Filter, Auto-Nest & Worksheet Print */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Filter by Area */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Filter size={12} style={{ color: 'var(--text-info)' }} /> Area:
                    </span>
                    <select
                      className="form-control"
                      style={{ height: '30px', fontSize: '12px', fontWeight: 650, width: '200px', background: 'var(--bg-secondary)' }}
                      value={plFilterArea}
                      onChange={e => setPlFilterArea(e.target.value)}
                    >
                      <option value="ALL">All Rooms ({plRows.filter(r => !r.parent_item_id && !r.is_hidden_by_attachment).length})</option>
                      {plUniqueAreas.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  {/* 1-Click Auto-Nest */}
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    style={{ border: '1px solid rgba(168, 85, 247, 0.4)', background: 'rgba(168, 85, 247, 0.08)', color: '#a855f7', fontSize: '11.5px', fontWeight: 700, padding: '4px 10px' }}
                    title="Automatically group & nest accessories/lamps under matching fittings"
                    onClick={handleAutoNestAccessories}
                  >
                    <Sparkles size={13} /> Auto-Nest Accessories
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    style={{ border: '1px solid var(--border)', fontSize: '11px', padding: '4px 8px' }}
                    onClick={() =>
                      setPlRows(prev =>
                        prev
                          .filter(r => !r.is_split_child && !r.is_accessory)
                          .map(r => ({ ...r, qty_packed: Number(r.remaining_to_pack || r.qty_ordered || 0), is_hidden_by_attachment: false }))
                      )
                    }
                  >
                    Pack All
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    style={{ border: '1px solid var(--border)', fontSize: '11px', padding: '4px 8px' }}
                    onClick={() => setPlRows(prev => prev.map(r => ({ ...r, qty_packed: 0 })))}
                  >
                    Zero All
                  </button>
                </div>

                {/* 1-Click Print Warehouse Pick Sheet */}
                <button
                  type="button"
                  onClick={handlePrintWarehouseWorksheet}
                  className="btn btn-ghost btn-sm"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Print an A4 clipboard pick-and-pack worksheet ordered by Floor & Room"
                >
                  <Printer size={14} style={{ color: 'var(--text-info)' }} /> Print Warehouse Pick Sheet
                </button>
              </div>
            </div>

            {/* Scrollable Items Workbench Table */}
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)', boxShadow: '0 1px 0 var(--border)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 650 }}>
                    <th style={{ padding: '9px 8px', width: '32px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        onChange={e => {
                          const checked = e.target.checked;
                          const next = {};
                          visiblePlRows.forEach(r => { next[r.rowKey] = checked; });
                          setPlSelectedRowKeys(next);
                        }}
                      />
                    </th>
                    <th onClick={() => handleTogglePlSort('one_one')} style={{ padding: '9px 10px', minWidth: '115px', cursor: 'pointer', userSelect: 'none' }}>
                      One to One Code {renderPlSortIcon('one_one')}
                    </th>
                    <th onClick={() => handleTogglePlSort('plan')} style={{ padding: '9px 8px', width: '90px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                      Plan Code {renderPlSortIcon('plan')}
                    </th>
                    <th onClick={() => handleTogglePlSort('sku')} style={{ padding: '9px 10px', minWidth: '115px', cursor: 'pointer', userSelect: 'none' }}>
                      Supplier / SKU {renderPlSortIcon('sku')}
                    </th>
                    <th style={{ padding: '9px 10px' }}>Description & Spec</th>
                    <th onClick={() => handleTogglePlSort('area')} style={{ padding: '9px 10px', minWidth: '140px', cursor: 'pointer', userSelect: 'none', color: plSortField === 'area' ? 'var(--text-info)' : 'inherit' }}>
                      Area / Room {renderPlSortIcon('area')}
                    </th>
                    <th style={{ padding: '9px 8px', textAlign: 'center', width: '50px' }}>Ord</th>
                    <th style={{ padding: '9px 8px', width: '85px', textAlign: 'center' }}>Packed</th>
                    <th style={{ padding: '9px 8px', textAlign: 'center', width: '50px' }}>B/O</th>
                    <th style={{ padding: '9px 8px', textAlign: 'right', width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {isLoadingPlItems ? 'Loading order items & product specifications...' : `No items found for area "${plFilterArea}".`}
                      </td>
                    </tr>
                  ) : (
                    visiblePlRows.map(row => {
                      const totalPackedForItem = plRows
                        .filter(r => String(r.order_item_id) === String(row.order_item_id))
                        .reduce((s, r) => s + (Number(r.qty_packed) || 0), 0);
                      const backorder = Math.max(0, Number(row.qty_ordered || 0) - totalPackedForItem);
                      const isChecked = !!plSelectedRowKeys[row.rowKey];
                      const isSubRow = !!(row.is_split_child || row.is_accessory);

                      return (
                        <tr
                          key={row.rowKey}
                          draggable
                          onDragStart={e => handleDragStart(e, row.rowKey)}
                          onDragOver={handleDragOver}
                          onDrop={e => handleDropOnRow(e, row.rowKey)}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            cursor: 'grab',
                            background: draggedRowKey === row.rowKey
                              ? 'rgba(59, 130, 246, 0.15)'
                              : row.is_accessory
                              ? 'rgba(168, 85, 247, 0.08)'
                              : row.is_split_child
                              ? 'rgba(59, 130, 246, 0.06)'
                              : isChecked
                              ? 'rgba(59, 130, 246, 0.04)'
                              : 'transparent',
                          }}
                        >
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                const checked = e.target.checked;
                                setPlSelectedRowKeys(prev => ({ ...prev, [row.rowKey]: checked }));
                              }}
                            />
                          </td>

                          {/* One to One Code */}
                          <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {row.is_accessory && (
                                <span style={{ color: '#a855f7', fontWeight: 800, fontSize: '13px' }}>↳</span>
                              )}
                              <span>{row.one_one_code || '—'}</span>
                            </div>
                          </td>

                          {/* Plan Code */}
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {row.plan_code ? (
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--text-info)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                {row.plan_code}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>—</span>
                            )}
                          </td>

                          {/* Supplier / SKU */}
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            {row.supplier_code || '—'}
                          </td>

                          {/* Description & Spec */}
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: row.is_accessory ? 500 : 650, color: row.is_accessory ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: '12px', lineHeight: 1.3 }}>
                              {row.description}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                              {row.parent_fitting_code && (
                                <span style={{ fontSize: '10px', color: '#a855f7', fontWeight: 700, background: 'rgba(168, 85, 247, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                                  Attached to: {row.parent_fitting_code}
                                </span>
                              )}
                              {row.material_colour && row.material_colour !== '—' && (
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Col: <strong>{row.material_colour}</strong></span>
                              )}
                              {row.first_fix === 'Yes' && (
                                <span style={{ fontSize: '10px', color: 'var(--text-info)', background: 'rgba(59, 130, 246, 0.1)', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>1st Fix</span>
                              )}
                            </div>
                          </td>

                          {/* Area / Room Dropdown */}
                          <td style={{ padding: '8px 10px' }}>
                            <select
                              className="form-control"
                              style={{ height: '28px', fontSize: '11.5px', padding: '2px 6px', width: '135px', fontWeight: 600, background: 'var(--bg-secondary)' }}
                              value={row.area || 'General / Unspecified'}
                              onChange={e => {
                                const newArea = e.target.value;
                                setPlRows(prev => prev.map(r => (r.rowKey === row.rowKey ? { ...r, area: newArea } : r)));
                              }}
                            >
                              {plUniqueAreas.map(a => (
                                <option key={a} value={a}>{a}</option>
                              ))}
                              {row.area && !plUniqueAreas.includes(row.area) && (
                                <option value={row.area}>{row.area}</option>
                              )}
                            </select>
                            {row.floor && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '2px' }}>{row.floor}</span>}
                          </td>

                          {/* Ord */}
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 650, color: 'var(--text-secondary)' }}>
                            {row.qty_ordered || 0}
                          </td>

                          {/* Packed Input */}
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min={0}
                              max={Number(row.qty_ordered || 999)}
                              className="form-control"
                              style={{ width: '65px', height: '28px', padding: '2px 4px', fontSize: '12px', fontWeight: 800, textAlign: 'center', borderColor: Number(row.qty_packed || 0) > 0 ? 'var(--text-info)' : 'var(--border)' }}
                              value={row.qty_packed ?? 0}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setPlRows(prev => prev.map(r => (r.rowKey === row.rowKey ? { ...r, qty_packed: val } : r)));
                              }}
                            />
                          </td>

                          {/* Backorder */}
                          <td style={{ padding: '8px', textAlign: 'center', fontSize: '11.5px', fontWeight: backorder > 0 ? 800 : 400, color: backorder > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)' }}>
                            {backorder}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {!row.is_accessory && (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  style={{ border: '1px solid var(--border)', fontSize: '10.5px', padding: '2px 6px', color: 'var(--text-info)' }}
                                  title="Split quantity across multiple rooms/lines"
                                  onClick={() => handleSplitRow(row)}
                                >
                                  <Split size={11} /> Split
                                </button>
                              )}
                              {!row.is_split_child && (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  style={{ border: '1px solid rgba(168, 85, 247, 0.4)', fontSize: '10.5px', padding: '2px 6px', color: '#a855f7' }}
                                  title="Attach accessory to parent fitting"
                                  onClick={() => setAttachModalTargetRow(row)}
                                >
                                  <Link2 size={11} /> {row.is_accessory ? 'Re-Attach' : 'Attach'}
                                </button>
                              )}
                              {isSubRow && (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  style={{ color: 'var(--text-danger)', padding: '2px 5px' }}
                                  onClick={() => handleRemoveSubRow(row.rowKey)}
                                  title="Remove split line"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Stage 1 Footer: Notes & Transitions */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ flex: 1, maxWidth: '480px' }}>
                <input
                  type="text"
                  placeholder="Packing instructions or warehouse notes..."
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px' }}
                  value={plNotes}
                  onChange={e => setPlNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => savePackingListToBackend('Pick Sheet Ready')}
                  disabled={isSaving || !plOrderKey}
                  style={{ border: '1px solid var(--border)', fontSize: '12px' }}
                >
                  {isSaving ? 'Saving...' : 'Save Pick Sheet Progress'}
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700, fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleStage1SaveAndProceed}
                  disabled={isSaving || !plOrderKey}
                >
                  Save & Proceed to Stage 2: Labels →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STAGE 2 VIEW: FITTING & ACCESSORY THERMAL LABELS ─────────────── */}
        {currentStage === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <PackingListLabelPrinterModal
              isOpen={true}
              inline={true}
              initialMode="item"
              packingList={savedDoc || { id: 'PL-TEMP', projectName: activeProjectObj?.name, items: plRows.filter(r => Number(r.qty_packed) > 0) }}
              project={activeProjectObj}
              order={activeOrderObj}
              templates={labelTemplates}
              onOpenTemplateManager={onOpenTemplateManager}
              onNextStage={handleStage2AdvanceToBoxing}
              nextStageLabel="Mark Labels Printed & Next: Boxing →"
              onClose={() => setCurrentStage(1)}
            />
          </div>
        )}

        {/* ─── STAGE 3 VIEW: BOXING & CARTON LABELS ─────────────────────────── */}
        {currentStage === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Top Toolbar: Box Management & Buckets */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              {/* Left: Active Box Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '5px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <Box size={15} style={{ color: 'var(--text-info)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Active Box:</span>
                <select
                  className="form-control"
                  style={{ height: '28px', fontSize: '12px', fontWeight: 700, width: '110px', padding: '2px 6px' }}
                  value={plActiveBox}
                  onChange={e => setPlActiveBox(e.target.value)}
                >
                  {plAvailableBoxes.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  style={{ border: '1px solid var(--border)', fontSize: '11px', padding: '3px 8px' }}
                  onClick={handleAddBox}
                >
                  + Add Box
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  style={{ fontSize: '11.5px', fontWeight: 700, padding: '3px 10px' }}
                  onClick={handleAssignSelectedToActiveBox}
                >
                  Assign Checked to {plActiveBox}
                </button>
              </div>

              {/* Center: Live Box Counts */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {plAvailableBoxes.map(b => (
                  <span
                    key={b}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: plActiveBox === b ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)',
                      color: plActiveBox === b ? 'var(--text-info)' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {b}: <strong>{boxSummaryCounts[b] || 0} pcs</strong>
                  </span>
                ))}
              </div>

              {/* Right: Print Outer Box Carton Labels Button */}
              <div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ border: '1px solid rgba(59, 130, 246, 0.4)', background: 'rgba(59, 130, 246, 0.08)', color: 'var(--text-info)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowOuterBoxLabelModal(true)}
                  title="Print outer box manifest labels with QR/Barcode and list of fittings inside"
                >
                  <Tag size={14} /> Print Outer Box Carton Labels
                </button>
              </div>
            </div>

            {/* Boxing Items Table */}
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)', boxShadow: '0 1px 0 var(--border)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 650 }}>
                    <th style={{ padding: '9px 8px', width: '32px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        onChange={e => {
                          const checked = e.target.checked;
                          const next = {};
                          visiblePlRows.forEach(r => { next[r.rowKey] = checked; });
                          setPlSelectedRowKeys(next);
                        }}
                      />
                    </th>
                    <th style={{ padding: '9px 10px', minWidth: '115px' }}>One to One Code</th>
                    <th style={{ padding: '9px 8px', width: '90px', textAlign: 'center' }}>Plan Code</th>
                    <th style={{ padding: '9px 10px', minWidth: '115px' }}>Supplier / SKU</th>
                    <th style={{ padding: '9px 10px' }}>Description & Spec</th>
                    <th style={{ padding: '9px 10px', minWidth: '130px' }}>Area / Room</th>
                    <th style={{ padding: '9px 8px', width: '70px', textAlign: 'center' }}>Packed</th>
                    <th style={{ padding: '9px 10px', width: '140px', color: '#a855f7', fontWeight: 800 }}>Assigned Box #</th>
                    <th style={{ padding: '9px 8px', textAlign: 'right', width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlRows.filter(r => Number(r.qty_packed) > 0).map(row => {
                    const isChecked = !!plSelectedRowKeys[row.rowKey];
                    return (
                      <tr
                        key={row.rowKey}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isChecked ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const checked = e.target.checked;
                              setPlSelectedRowKeys(prev => ({ ...prev, [row.rowKey]: checked }));
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: 'monospace', fontSize: '12px' }}>
                          {row.one_one_code || '—'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {row.plan_code ? (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--text-info)' }}>
                              {row.plan_code}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          {row.supplier_code || '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 650, color: 'var(--text-primary)', fontSize: '12px' }}>{row.description}</div>
                          {row.parent_fitting_code && <div style={{ fontSize: '10px', color: '#a855f7', fontWeight: 700 }}>Attached to: {row.parent_fitting_code}</div>}
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {row.area || 'General / Unspecified'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, fontSize: '12.5px', color: 'var(--text-info)' }}>
                          {row.qty_packed}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <select
                            className="form-control"
                            style={{ height: '30px', fontSize: '12px', fontWeight: 700, width: '130px', borderColor: '#a855f7', background: 'var(--bg-secondary)' }}
                            value={row.box_number || 'Box 1'}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '__ADD_NEW__') {
                                const newBox = prompt('Enter new Box / Carton name (e.g. Box 4, Pallet A):');
                                if (newBox && newBox.trim()) {
                                  const trimmed = newBox.trim();
                                  if (!plAvailableBoxes.includes(trimmed)) {
                                    setPlAvailableBoxes(prev => [...prev, trimmed]);
                                  }
                                  setPlRows(prev => prev.map(r => (r.rowKey === row.rowKey ? { ...r, box_number: trimmed } : r)));
                                }
                              } else {
                                setPlRows(prev => prev.map(r => (r.rowKey === row.rowKey ? { ...r, box_number: val } : r)));
                              }
                            }}
                          >
                            {plAvailableBoxes.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                            {row.box_number && !plAvailableBoxes.includes(row.box_number) && (
                              <option value={row.box_number}>{row.box_number}</option>
                            )}
                            <option value="__ADD_NEW__">+ New Box...</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            style={{ border: '1px solid var(--border)', fontSize: '10.5px', padding: '2px 6px', color: 'var(--text-info)' }}
                            title="Split quantity into another box"
                            onClick={() => handleSplitRow(row)}
                          >
                            <Split size={11} /> Split Box
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Stage 3 Footer: Save & Finalize */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setCurrentStage(2)}
                style={{ border: '1px solid var(--border)', fontSize: '12px' }}
              >
                ← Back to Stage 2: Labels
              </button>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => savePackingListToBackend('Boxed')}
                  disabled={isSaving}
                  style={{ border: '1px solid var(--border)', fontSize: '12px' }}
                >
                  {isSaving ? 'Saving...' : 'Save Box Assignments'}
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 800, fontSize: '13px', background: '#10b981', borderColor: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleFinalizeBoxing}
                  disabled={isSaving}
                >
                  <Check size={16} /> Finalize Packing List (Mark 100% Boxed) ✓
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── ATTACH ACCESSORY SUB-MODAL ────────────────────────────────────── */}
        {attachModalTargetRow && (
          <AttachAccessoryModal
            isOpen={!!attachModalTargetRow}
            onClose={() => setAttachModalTargetRow(null)}
            accessoryRow={attachModalTargetRow}
            availableBoxes={plAvailableBoxes}
            candidateParentRows={plRows.filter(
              r => !r.is_accessory && !r.is_split_child && String(r.order_item_id) !== String(attachModalTargetRow?.order_item_id)
            )}
            existingAttachments={plRows.filter(
              r => r.is_accessory && String(r.order_item_id) === String(attachModalTargetRow?.order_item_id)
            )}
            onConfirmAttachments={handleConfirmAccessoryAttachments}
          />
        )}

        {/* ─── OUTER BOX CARTON LABELS MODAL ─────────────────────────────────── */}
        {showOuterBoxLabelModal && (
          <PackingListLabelPrinterModal
            isOpen={showOuterBoxLabelModal}
            onClose={() => setShowOuterBoxLabelModal(false)}
            initialMode="box"
            inline={false}
            packingList={savedDoc || { id: 'PL-TEMP', projectName: activeProjectObj?.name, items: plRows.filter(r => Number(r.qty_packed) > 0) }}
            project={activeProjectObj}
            order={activeOrderObj}
            templates={labelTemplates}
            onOpenTemplateManager={onOpenTemplateManager}
          />
        )}
      </div>
    </div>
  );
}

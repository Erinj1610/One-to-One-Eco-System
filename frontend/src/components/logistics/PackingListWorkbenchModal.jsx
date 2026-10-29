import React, { useState, useEffect, useMemo } from 'react';
import {
  X, ClipboardList, Tag, Box, Package, Sparkles, Filter, Printer,
  ChevronDown, Check, ArrowUpDown, ArrowUp, ArrowDown, Split, Link2,
  CheckCircle2, AlertCircle, RefreshCw, Layers, ChevronRight, Plus, Trash2, Unlink
} from 'lucide-react';
import PackingListLabelPrinterModal from './PackingListLabelPrinterModal';
import { API_BASE } from '../../api_config';

/**
 * Clean & Refined 4-Step Logistical Packing List Workbench:
 * Step 1: Summary & Kits (Consolidated Product Summary & Manual/Auto Kit Linker — No room noise, No AI guessing)
 * Step 2: Pick Sheet (Auto-Organized by Floor & Room with nested accessories, A4 Clipboard Print)
 * Step 3: Fitting Labels (Argox Barcode Label Printing)
 * Step 4: Boxing & Cartons (Box Assignment, Multi-Box Splitting & Outer Carton Labels)
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

  // ─── WORKBENCH STEP STATE (1 to 4) ────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(() => {
    if (initialDoc) {
      const st = (initialDoc.status || '').toLowerCase();
      if (st.includes('box')) return 4;
      if (st.includes('label')) return 3;
      if (st.includes('pick') || st.includes('ready')) return 2;
      return 1;
    }
    return 1;
  });

  // Order selection state
  const [plOrderKey, setPlOrderKey] = useState(() => {
    if (initialDoc) return `${initialDoc.projectKey}:::${initialDoc.orderId}`;
    if (preselectedKey) return preselectedKey;
    return '';
  });
  const [plOrderSearchQuery, setPlOrderSearchQuery] = useState('');
  const [plOrderDropdownOpen, setPlOrderDropdownOpen] = useState(false);
  const [plNotes, setPlNotes] = useState(initialDoc?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedDoc, setSavedDoc] = useState(initialDoc || null);

  // Raw BOQ line items (original items across all rooms)
  const [rawItems, setRawItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Step 1: Consolidated Summary Models state
  // Each model: { modelKey, plan_code, one_one_code, supplier_code, description, total_ordered, room_instances: [], attachedItems: [{ itemKey, ratio, name, plan_code }] }
  const [summaryModels, setSummaryModels] = useState([]);
  const [summarySearchQuery, setSummarySearchQuery] = useState('');
  const [attachingToModelKey, setAttachingToModelKey] = useState(null); // modelKey receiving an attachment
  const [attachSelectedItemKey, setAttachSelectedItemKey] = useState('');
  const [attachRatioInput, setAttachRatioInput] = useState(1);

  // Step 2 & 4: Exploded Room Pick Sheet rows
  const [plRows, setPlRows] = useState([]);
  const [plFilterArea, setPlFilterArea] = useState('ALL');
  const [plSelectedRowKeys, setPlSelectedRowKeys] = useState({});

  // Step 4: Boxing state
  const [plAvailableBoxes, setPlAvailableBoxes] = useState(['Box 1', 'Box 2', 'Box 3']);
  const [plActiveBox, setPlActiveBox] = useState('Box 1');
  const [showOuterBoxLabelModal, setShowOuterBoxLabelModal] = useState(false);

  // Resolve active Project & Order metadata
  const [activeProjectKey, activeOrderId] = (plOrderKey || '').split(':::');
  const activeProjectObj = projects[activeProjectKey] || (savedDoc ? { name: savedDoc.projectName, client: savedDoc.projectClient } : null);
  const activeOrderObj = useMemo(() => {
    if (!activeOrderId) return null;
    return allOrders.find(o => String(o.id) === String(activeOrderId) && o.projectKey === activeProjectKey) || null;
  }, [allOrders, activeOrderId, activeProjectKey]);

  // Filtered orders list for dropdown
  const filteredOrdersList = useMemo(() => {
    if (!plOrderSearchQuery.trim()) return allOrders.slice(0, 50);
    const q = plOrderSearchQuery.toLowerCase();
    return allOrders.filter(o => {
      const qn = (o.quote_name || '').toLowerCase();
      const oid = String(o.id).toLowerCase();
      const pn = (o.projectName || '').toLowerCase();
      const pc = (o.projectClient || '').toLowerCase();
      return qn.includes(q) || oid.includes(q) || pn.includes(q) || pc.includes(q);
    }).slice(0, 50);
  }, [allOrders, plOrderSearchQuery]);

  // Helper: clean description by stripping room quantity suffixes like " — 5 units", " - 1 units"
  const cleanDescription = (desc) => {
    if (!desc) return '';
    return desc
      .replace(/\s*[\u2010-\u2015\u2212\-]\s*\d+\s*(?:units?|pcs?|m?|fixtures?|items?)\s*$/i, '')
      .replace(/\s*\(\s*\d+\s*(?:units?|pcs?|m?|fixtures?|items?)\s*\)\s*$/i, '')
      .trim();
  };

  // Helper: generate unique model key based on (plan_code, clean_desc, supplier_code, one_one_code)
  const getModelKey = (item) => {
    const plan = (item.plan_code || '').trim().toUpperCase();
    const desc = cleanDescription(item.description || item.name || '').toUpperCase();
    const sup = (item.supplier_code || '').trim().toUpperCase();
    const oto = (item.one_one_code || '').trim().toUpperCase();

    // If item has a Plan Code and Description, group by Plan + Clean Description
    if (plan && desc) {
      return `${plan}:::${desc}`;
    }
    return `${plan}:::${sup}:::${oto}:::${desc}`;
  };

  // ─── BUILD CONSOLIDATED SUMMARY MODELS FROM RAW ITEMS ─────────────────────
  const buildSummaryModelsFromItems = (itemsList) => {
    const map = {};
    itemsList.forEach(it => {
      const key = getModelKey(it);
      const cleanedDesc = cleanDescription(it.description || it.name || '');
      if (!map[key]) {
        map[key] = {
          modelKey: key,
          plan_code: (it.plan_code || '').trim(),
          one_one_code: (it.one_one_code || '').trim(),
          supplier_code: (it.supplier_code || '').trim(),
          description: cleanedDesc,
          total_ordered: 0,
          room_instances: [],
          attachedItems: [], // user-defined attachments
        };
      }
      if (!map[key].one_one_code && it.one_one_code) map[key].one_one_code = it.one_one_code.trim();
      if (!map[key].supplier_code && it.supplier_code) map[key].supplier_code = it.supplier_code.trim();
      map[key].total_ordered += Number(it.qty_ordered || it.qty_packed || 0);
      map[key].room_instances.push({
        ...it,
        description: cleanedDesc,
      });
    });

    return Object.values(map);
  };

  // ─── LOAD RAW ORDER ITEMS ──────────────────────────────────────────────────
  const loadOrderItems = async (compositeKey, existingPlDoc = null) => {
    setPlOrderKey(compositeKey);
    setPlOrderDropdownOpen(false);
    setPlFilterArea('ALL');
    setPlSelectedRowKeys({});

    if (!compositeKey) {
      setRawItems([]);
      setSummaryModels([]);
      setPlRows([]);
      return;
    }

    const [pKey, oId] = compositeKey.split(':::');

    // 1. If editing existing packing list
    if (existingPlDoc && Array.isArray(existingPlDoc.items) && existingPlDoc.items.length > 0) {
      const boxesSet = new Set(['Box 1', 'Box 2', 'Box 3']);
      const existingRows = existingPlDoc.items.map((it, idx) => {
        const b = it.box_number || it.boxNumber || 'Box 1';
        boxesSet.add(b);
        return {
          rowKey: `row_${it.order_item_id || idx}_${idx}`,
          order_item_id: String(it.order_item_id || `item_${idx}`),
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
          qty_packed: Number(it.qty_packed ?? it.qtyDelivered ?? 0),
          box_number: b,
          is_accessory: !!it.is_accessory || !!it.parent_item_id,
          is_split_child: false,
        };
      });
      setPlAvailableBoxes(Array.from(boxesSet));
      setPlRows(existingRows);
      setRawItems(existingRows);
      setSummaryModels(buildSummaryModelsFromItems(existingRows));
      return;
    }

    // 2. Fetch fresh BOQ order items from backend
    setIsLoadingItems(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/logistics/order-items/${encodeURIComponent(oId)}?project_key=${encodeURIComponent(pKey)}`
      );
      if (res.ok) {
        const data = await res.json();
        const apiItems = (data.items || []).filter(
          it => (it.plan_code || '').trim() !== 'SPACER' && ((it.description || '').trim() !== '' || it.one_one_code || it.supplier_code)
        );
        const builtRaw = apiItems.map((it, idx) => ({
          order_item_id: String(it.order_item_id || `item_${idx}`),
          one_one_code: it.one_one_code || '',
          plan_code: it.plan_code || '',
          supplier_code: it.supplier_code || '',
          description: it.description || '',
          floor: it.floor || '',
          area: it.area || '',
          material_colour: it.material_colour || '',
          first_fix: it.first_fix || 'No',
          red_list: it.red_list || 'No',
          qty_ordered: Number(it.qty_ordered || 0),
          qty_packed: Number(it.remaining_to_pack ?? it.qty_ordered ?? 0),
          box_number: 'Box 1',
        }));
        setRawItems(builtRaw);
        const initialModels = buildSummaryModelsFromItems(builtRaw);
        setSummaryModels(initialModels);
      }
    } catch (err) {
      console.error('Failed to load order items:', err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  // On mount or when props change
  useEffect(() => {
    if (initialDoc) {
      setSavedDoc(initialDoc);
      const composite = `${initialDoc.projectKey}:::${initialDoc.orderId}`;
      loadOrderItems(composite, initialDoc);
    } else if (preselectedKey) {
      loadOrderItems(preselectedKey, null);
    }
  }, [initialDoc, preselectedKey]);

  // ─── STEP 1 ACTIONS: MANUAL & PLAN CODE LINKING ────────────────────────────
  // Auto-link items that share the exact same Plan Code (optional user-triggered shortcut)
  const handleAutoLinkByPlanCode = () => {
    setSummaryModels(prev => {
      const planGroups = {};
      prev.forEach(m => {
        const pc = (m.plan_code || '').trim().toUpperCase();
        if (pc && pc !== 'SPACER') {
          if (!planGroups[pc]) planGroups[pc] = [];
          planGroups[pc].push(m);
        }
      });

      const updated = prev.map(m => ({ ...m, attachedItems: [...(m.attachedItems || [])] }));

      Object.values(planGroups).forEach(group => {
        if (group.length > 1) {
          // The primary fixture is the first item or the one with the highest count of room instances
          const sorted = [...group].sort((a, b) => (b.room_instances?.length || 0) - (a.room_instances?.length || 0));
          const primary = sorted[0];
          const secondaries = sorted.slice(1);

          const targetModel = updated.find(m => m.modelKey === primary.modelKey);
          if (targetModel) {
            const newAtts = [...targetModel.attachedItems];
            secondaries.forEach(sec => {
              if (!newAtts.some(att => att.itemKey === sec.modelKey)) {
                const ratio = targetModel.total_ordered > 0
                  ? Math.max(1, Math.round(sec.total_ordered / targetModel.total_ordered))
                  : 1;
                newAtts.push({
                  itemKey: sec.modelKey,
                  ratio,
                  name: sec.description || sec.supplier_code || sec.plan_code,
                  plan_code: sec.plan_code,
                });
              }
            });
            targetModel.attachedItems = newAtts;
          }
        }
      });
      return updated;
    });
  };

  const handleClearAllPairings = () => {
    setSummaryModels(prev => prev.map(m => ({ ...m, attachedItems: [] })));
  };

  const handleRemoveAttachmentFromModel = (parentModelKey, attachedItemKey) => {
    setSummaryModels(prev => prev.map(m => {
      if (m.modelKey !== parentModelKey) return m;
      return {
        ...m,
        attachedItems: (m.attachedItems || []).filter(a => a.itemKey !== attachedItemKey),
      };
    }));
  };

  const handleConfirmManualAttach = () => {
    if (!attachingToModelKey || !attachSelectedItemKey) return;
    const targetItemModel = summaryModels.find(m => m.modelKey === attachSelectedItemKey);
    if (!targetItemModel) return;

    setSummaryModels(prev => prev.map(m => {
      if (m.modelKey !== attachingToModelKey) return m;
      const filtered = (m.attachedItems || []).filter(a => a.itemKey !== attachSelectedItemKey);
      return {
        ...m,
        attachedItems: [
          ...filtered,
          {
            itemKey: targetItemModel.modelKey,
            ratio: Number(attachRatioInput) || 1,
            name: targetItemModel.description || targetItemModel.supplier_code || targetItemModel.plan_code,
            plan_code: targetItemModel.plan_code,
          }
        ]
      };
    }));
    setAttachingToModelKey(null);
    setAttachSelectedItemKey('');
    setAttachRatioInput(1);
  };

  // Helper: map of which items have been attached underneath a parent
  const attachedItemKeyToParentMap = useMemo(() => {
    const map = {};
    summaryModels.forEach(parent => {
      (parent.attachedItems || []).forEach(att => {
        map[att.itemKey] = {
          parentKey: parent.modelKey,
          parentDesc: parent.description,
          parentPlan: parent.plan_code,
          ratio: att.ratio,
        };
      });
    });
    return map;
  }, [summaryModels]);

  // ─── EXPLODE SUMMARY KITS INTO AUTO-ORGANIZED ROOM PICK SHEET (STEP 2) ─────
  const generatePickSheetRows = () => {
    if (rawItems.length === 0) return;

    // Set of itemKeys that are attached to another item
    const attachedKeysSet = new Set(Object.keys(attachedItemKeyToParentMap));
    const explodedRows = [];

    // Group raw BOQ items by area / room
    const roomsMap = {};
    rawItems.forEach(it => {
      const room = it.area || 'General';
      if (!roomsMap[room]) roomsMap[room] = [];
      roomsMap[room].push(it);
    });

    // In each room, list primary items and nest their attached accessories
    Object.keys(roomsMap).sort().forEach(roomName => {
      const itemsInRoom = roomsMap[roomName];

      itemsInRoom.forEach(it => {
        const itModelKey = getModelKey(it);
        const modelDef = summaryModels.find(m => m.modelKey === itModelKey);
        const isAttachedToOther = attachedKeysSet.has(itModelKey);

        // If this item was designated as an attachment to another fitting,
        // it will be nested directly underneath its parent fitting per room!
        if (isAttachedToOther) return;

        // Primary Item Row
        const parentRowKey = `row_${it.order_item_id}_${roomName}_${Math.random().toString(36).slice(2, 6)}`;
        explodedRows.push({
          rowKey: parentRowKey,
          order_item_id: it.order_item_id,
          parent_item_id: null,
          parent_fitting_code: null,
          one_one_code: it.one_one_code || '',
          plan_code: it.plan_code || '',
          supplier_code: it.supplier_code || '',
          description: cleanDescription(it.description),
          floor: it.floor || '',
          area: it.area || '',
          material_colour: it.material_colour || '',
          first_fix: it.first_fix || 'No',
          red_list: it.red_list || 'No',
          qty_ordered: Number(it.qty_ordered || 0),
          qty_packed: Number(it.qty_packed ?? it.qty_ordered ?? 0),
          box_number: 'Box 1',
          is_accessory: false,
          is_split_child: false,
        });

        // Nest any attached items proportionally in this room
        if (modelDef && Array.isArray(modelDef.attachedItems)) {
          modelDef.attachedItems.forEach((att, attIdx) => {
            const attModel = summaryModels.find(m => m.modelKey === att.itemKey);
            if (!attModel) return;
            const parentQty = Number(it.qty_ordered || 0);
            const nestedQty = parentQty * (Number(att.ratio) || 1);

            explodedRows.push({
              rowKey: `att_${parentRowKey}_${attIdx}_${Math.random().toString(36).slice(2, 6)}`,
              order_item_id: `acc_${it.order_item_id}_${attIdx}`,
              parent_item_id: String(it.order_item_id),
              parent_fitting_code: it.plan_code || it.description || 'Parent Fitting',
              one_one_code: attModel.one_one_code || '',
              plan_code: attModel.plan_code || it.plan_code || '',
              supplier_code: attModel.supplier_code || '',
              description: attModel.description || '',
              floor: it.floor || '',
              area: it.area || '',
              material_colour: '',
              first_fix: 'No',
              red_list: 'No',
              qty_ordered: nestedQty,
              qty_packed: nestedQty,
              box_number: 'Box 1',
              is_accessory: true,
              is_split_child: false,
            });
          });
        }
      });
    });

    // Add any standalone items that were NOT attached to any other item
    rawItems.forEach(it => {
      const itModelKey = getModelKey(it);
      if (!attachedKeysSet.has(itModelKey)) {
        // Already processed above in roomsMap
      }
    });

    setPlRows(explodedRows);
  };

  const handleProceedToStep2PickSheet = () => {
    generatePickSheetRows();
    setCurrentStep(2);
  };

  // ─── STEP 2 FILTERS & ACTIONS ─────────────────────────────────────────────
  const plUniqueAreas = useMemo(() => {
    const s = new Set();
    plRows.forEach(r => {
      const a = (r.area || '').trim();
      if (a) s.add(a);
    });
    return Array.from(s).sort();
  }, [plRows]);

  const visiblePlRows = useMemo(() => {
    let rows = [...plRows];
    if (plFilterArea !== 'ALL') {
      rows = rows.filter(r => (r.area || '').trim().toLowerCase() === plFilterArea.trim().toLowerCase());
    }
    return rows;
  }, [plRows, plFilterArea]);

  const handlePackAll = () => {
    setPlRows(prev => prev.map(r => ({ ...r, qty_packed: Number(r.qty_ordered || 0) })));
  };

  const handleZeroAll = () => {
    setPlRows(prev => prev.map(r => ({ ...r, qty_packed: 0 })));
  };

  // Print warehouse pick sheet (A4 clipboard layout)
  const handlePrintWarehouseWorksheet = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=800');
    if (!printWindow) {
      alert('Please allow popups to print the Warehouse Pick Sheet.');
      return;
    }

    const rowsByRoom = {};
    visiblePlRows.forEach(r => {
      const room = r.area || 'General / Unspecified';
      if (!rowsByRoom[room]) rowsByRoom[room] = [];
      rowsByRoom[room].push(r);
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Warehouse Pick Sheet - ${activeOrderObj?.quote_name || activeOrderId || 'Order'}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 0; }
          .header { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta { font-size: 11px; color: #444; line-height: 1.4; }
          .room-section { margin-bottom: 14px; page-break-inside: avoid; }
          .room-title { font-size: 12px; font-weight: 800; background: #e2e8f0; padding: 4px 8px; border-radius: 4px; border-left: 4px solid #0f172a; margin-bottom: 6px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
          th { border-bottom: 1.5px solid #333; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 4px 6px; text-align: left; }
          td { border-bottom: 1px solid #e2e8f0; padding: 5px 6px; font-size: 10.5px; vertical-align: middle; }
          .acc-row { background: #f8fafc; color: #475569; }
          .acc-indent { padding-left: 14px; }
          .chk-box { width: 14px; height: 14px; border: 1.5px solid #111; display: inline-block; vertical-align: middle; border-radius: 2px; }
          .code-badge { font-weight: 800; font-family: monospace; }
          .signoff { margin-top: 20px; border-top: 1px dashed #94a3b8; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Warehouse Pick & Pack Sheet</div>
            <div class="meta">
              <strong>Project:</strong> ${activeProjectObj?.name || '—'} &bull;
              <strong>Client:</strong> ${activeProjectObj?.client || '—'}<br/>
              <strong>Order / BOQ:</strong> ${activeOrderObj?.quote_name || activeOrderId || '—'}
            </div>
          </div>
          <div style="text-align: right;" class="meta">
            <strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}<br/>
            <strong>Status:</strong> Floor Picking Ready
          </div>
        </div>

        ${Object.keys(rowsByRoom).map(room => `
          <div class="room-section">
            <div class="room-title">Room: ${room}</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">Pick</th>
                  <th style="width: 80px;">Plan Code</th>
                  <th style="width: 100px;">SKU / Code</th>
                  <th>Description & Specification</th>
                  <th style="width: 50px; text-align: center;">Ord</th>
                  <th style="width: 50px; text-align: center;">Picked</th>
                </tr>
              </thead>
              <tbody>
                ${rowsByRoom[room].map(r => `
                  <tr class="${r.is_accessory ? 'acc-row' : ''}">
                    <td style="text-align: center;"><div class="chk-box"></div></td>
                    <td class="code-badge">${r.plan_code || '—'}</td>
                    <td>${r.supplier_code || r.one_one_code || '—'}</td>
                    <td class="${r.is_accessory ? 'acc-indent' : ''}">
                      ${r.is_accessory ? '↳ [Attached] ' : ''}${r.description}
                    </td>
                    <td style="text-align: center; font-weight: 700;">${r.qty_ordered}</td>
                    <td style="text-align: center;">______</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}

        <div class="signoff">
          <div>Picked By: ___________________________ &nbsp;&nbsp; Date: _____________</div>
          <div>Checked By: ___________________________ &nbsp;&nbsp; Date: _____________</div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ─── SAVE PACKING LIST TO BACKEND ─────────────────────────────────────────
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

  // Step 2 Proceed
  const handleStep2SaveAndProceed = async () => {
    const doc = await savePackingListToBackend('Pick Sheet Ready');
    if (doc) setCurrentStep(3); // Advance to Step 3: Fitting Labels
  };

  // Step 3 Proceed
  const handleStep3AdvanceToBoxing = async () => {
    if (savedDoc?.id) {
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
    }
    setCurrentStep(4); // Advance to Step 4: Boxing
  };

  // ─── STEP 4 ACTIONS: BOXING & MULTI-BOX SPLITTING ─────────────────────────
  const handleAddBox = () => {
    const nextNum = plAvailableBoxes.length + 1;
    const name = `Box ${nextNum}`;
    setPlAvailableBoxes(prev => [...prev, name]);
    setPlActiveBox(name);
  };

  const handleAssignSelectedToActiveBox = () => {
    const selectedKeys = Object.keys(plSelectedRowKeys).filter(k => plSelectedRowKeys[k]);
    if (selectedKeys.length === 0) {
      alert(`Check at least one item in the table to assign to ${plActiveBox}`);
      return;
    }
    setPlRows(prev =>
      prev.map(r => (selectedKeys.includes(r.rowKey) ? { ...r, box_number: plActiveBox } : r))
    );
    setPlSelectedRowKeys({});
  };

  // Split quantity across multiple boxes in Step 4
  const handleSplitBoxRow = (row) => {
    const currentPacked = Number(row.qty_packed || 0);
    if (currentPacked <= 1) {
      alert('Packed quantity must be at least 2 to split into another box.');
      return;
    }
    const splitQty = Math.floor(currentPacked / 2);
    const remQty = currentPacked - splitQty;

    setPlRows(prev => {
      const copy = [...prev];
      const targetIdx = copy.findIndex(r => r.rowKey === row.rowKey);
      if (targetIdx === -1) return prev;

      copy[targetIdx] = { ...copy[targetIdx], qty_packed: remQty };
      const nextBoxNum = plAvailableBoxes.length + 1;
      const nextBoxName = `Box ${nextBoxNum}`;
      if (!plAvailableBoxes.includes(nextBoxName)) {
        setPlAvailableBoxes(b => [...b, nextBoxName]);
      }

      const newChild = {
        ...copy[targetIdx],
        rowKey: `split_box_${row.order_item_id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        qty_packed: splitQty,
        qty_ordered: splitQty,
        box_number: nextBoxName,
        is_split_child: true,
      };
      copy.splice(targetIdx + 1, 0, newChild);
      return copy;
    });
  };

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

  // Filtered summary models for search in Step 1
  const visibleSummaryModels = useMemo(() => {
    if (!summarySearchQuery.trim()) return summaryModels;
    const q = summarySearchQuery.toLowerCase();
    return summaryModels.filter(m =>
      (m.plan_code || '').toLowerCase().includes(q) ||
      (m.supplier_code || '').toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q)
    );
  }, [summaryModels, summarySearchQuery]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0,0,0,0.84)',
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
          width: '97vw',
          maxWidth: '1520px',
          height: '95vh',
          maxHeight: '940px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ─── WORKBENCH HEADER WITH 4-STEP PIPELINE STEPPER ──────────────────── */}
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
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-info)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {initialDoc ? `PACKING LIST — ${initialDoc.id}` : 'NEW PACKING LIST'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background:
                      currentStep === 4
                        ? 'rgba(16, 185, 129, 0.15)'
                        : currentStep === 3
                        ? 'rgba(168, 85, 247, 0.15)'
                        : currentStep === 2
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color:
                      currentStep === 4
                        ? '#10b981'
                        : currentStep === 3
                        ? '#a855f7'
                        : currentStep === 2
                        ? 'var(--text-info)'
                        : '#f59e0b',
                    border: '1px solid currentColor',
                  }}
                >
                  Step {currentStep}: {currentStep === 1 ? 'Product Summary (Consolidated)' : currentStep === 2 ? 'Pick Sheet' : currentStep === 3 ? 'Labels' : 'Boxing'} [v2.0 LIVE]
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Project: <strong style={{ color: 'var(--text-primary)' }}>{activeProjectObj?.name || 'Project'}</strong> &bull; Order: <strong style={{ color: 'var(--text-primary)' }}>{activeOrderObj?.quote_name || activeOrderObj?.id || '—'}</strong>
              </div>
            </div>
          </div>

          {/* Center: 4-Step Stepper Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: currentStep === 1 ? 800 : 600,
                background: currentStep === 1 ? 'var(--bg-primary)' : 'transparent',
                color: currentStep === 1 ? 'var(--text-info)' : 'var(--text-secondary)',
                border: currentStep === 1 ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: currentStep === 1 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => setCurrentStep(1)}
            >
              <Layers size={14} /> 1. Product Summary
            </button>

            <ChevronRight size={13} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />

            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: currentStep === 2 ? 800 : 600,
                background: currentStep === 2 ? 'var(--bg-primary)' : 'transparent',
                color: currentStep === 2 ? 'var(--text-info)' : 'var(--text-secondary)',
                border: currentStep === 2 ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: currentStep === 2 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                if (plRows.length === 0) generatePickSheetRows();
                setCurrentStep(2);
              }}
            >
              <ClipboardList size={14} /> 2. Pick Sheet
            </button>

            <ChevronRight size={13} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />

            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: currentStep === 3 ? 800 : 600,
                background: currentStep === 3 ? 'var(--bg-primary)' : 'transparent',
                color: currentStep === 3 ? 'var(--text-info)' : 'var(--text-secondary)',
                border: currentStep === 3 ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: currentStep === 3 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                if (!savedDoc?.id && plRows.length === 0) {
                  alert('Please generate and save your Pick Sheet first.');
                  return;
                }
                setCurrentStep(3);
              }}
            >
              <Tag size={14} /> 3. Fitting Labels
            </button>

            <ChevronRight size={13} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />

            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: currentStep === 4 ? 800 : 600,
                background: currentStep === 4 ? 'var(--bg-primary)' : 'transparent',
                color: currentStep === 4 ? '#10b981' : 'var(--text-secondary)',
                border: currentStep === 4 ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: currentStep === 4 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                if (plRows.length === 0) generatePickSheetRows();
                setCurrentStep(4);
              }}
            >
              <Box size={14} /> 4. Boxing & Cartons
            </button>
          </div>

          {/* Right: Close */}
          <div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ color: 'var(--text-secondary)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── STEP 1 VIEW: CONSOLIDATED PRODUCT SUMMARY & ATTACHMENTS ─────────── */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Top Toolbar */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

              {/* Action Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search summarized products..."
                    className="form-control"
                    style={{ height: '30px', fontSize: '12px', width: '240px', background: 'var(--bg-secondary)' }}
                    value={summarySearchQuery}
                    onChange={e => setSummarySearchQuery(e.target.value)}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {summaryModels.length} unique summarized products
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ border: '1px solid rgba(59, 130, 246, 0.4)', color: 'var(--text-info)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={handleAutoLinkByPlanCode}
                    title="Automatically link secondary items sharing the exact same Plan Code"
                  >
                    <Sparkles size={14} /> ⚡ Auto-Link Shared Plan Codes
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ border: '1px solid var(--border)', fontSize: '12px' }}
                    onClick={handleClearAllPairings}
                    title="Clear all attached items"
                  >
                    Clear All Links
                  </button>
                </div>
              </div>
            </div>

            {/* Consolidated Summary Table (NO ARTIFICIAL ROLE COLUMN) */}
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)', boxShadow: '0 1px 0 var(--border)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 650 }}>
                    <th style={{ padding: '9px 12px', width: '90px', textAlign: 'center' }}>Plan Code</th>
                    <th style={{ padding: '9px 12px', minWidth: '120px' }}>One to One Code</th>
                    <th style={{ padding: '9px 12px', minWidth: '120px' }}>Supplier / SKU</th>
                    <th style={{ padding: '9px 12px', minWidth: '260px' }}>Description & Specification</th>
                    <th style={{ padding: '9px 10px', width: '100px', textAlign: 'center' }}>Total Order</th>
                    <th style={{ padding: '9px 12px' }}>Attached Items / Accessories</th>
                    <th style={{ padding: '9px 12px', width: '140px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSummaryModels.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {isLoadingItems ? 'Loading & summarizing order items...' : 'No products found. Select an order to begin.'}
                      </td>
                    </tr>
                  ) : (
                    visibleSummaryModels.map(model => {
                      const hasAttachments = model.attachedItems && model.attachedItems.length > 0;
                      const attachedInfo = attachedItemKeyToParentMap[model.modelKey];

                      return (
                        <tr
                          key={model.modelKey}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: attachedInfo ? 'rgba(168, 85, 247, 0.03)' : 'transparent',
                          }}
                        >
                          {/* Plan Code */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {model.plan_code ? (
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--text-info)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                {model.plan_code}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                            )}
                          </td>

                          {/* One to One Code */}
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 650, color: 'var(--text-primary)' }}>
                            {model.one_one_code || '—'}
                          </td>

                          {/* Supplier / SKU */}
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {model.supplier_code || '—'}
                          </td>

                          {/* Description */}
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {model.description}
                          </td>

                          {/* Total Order Qty */}
                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                            {model.total_ordered}
                          </td>

                          {/* Attached Items / Accessories Column */}
                          <td style={{ padding: '10px 12px' }}>
                            {hasAttachments ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                {model.attachedItems.map(att => (
                                  <span
                                    key={att.itemKey}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      background: 'rgba(168, 85, 247, 0.12)',
                                      color: '#a855f7',
                                      border: '1px solid rgba(168, 85, 247, 0.35)',
                                      borderRadius: '6px',
                                      padding: '3px 8px',
                                      fontSize: '11.5px',
                                      fontWeight: 650,
                                    }}
                                  >
                                    <strong style={{ background: '#a855f7', color: '#fff', borderRadius: '3px', padding: '1px 4px', fontSize: '10.5px' }}>
                                      {att.ratio}x
                                    </strong>
                                    <span>{att.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAttachmentFromModel(model.modelKey, att.itemKey)}
                                      style={{ background: 'transparent', border: 'none', color: '#a855f7', cursor: 'pointer', padding: '0 2px' }}
                                      title="Remove attachment"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : attachedInfo ? (
                              <div style={{ fontSize: '11.5px', color: '#a855f7', fontWeight: 650 }}>
                                ↳ Attached to [{attachedInfo.parentPlan || 'Item'}] {attachedInfo.parentDesc} ({attachedInfo.ratio}x per unit)
                              </div>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                Standalone item
                              </span>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              style={{ border: '1px solid rgba(59, 130, 246, 0.4)', color: 'var(--text-info)', fontSize: '11px', padding: '3px 8px' }}
                              onClick={() => {
                                setAttachingToModelKey(model.modelKey);
                                const candidates = summaryModels.filter(m => m.modelKey !== model.modelKey && !model.attachedItems?.some(att => att.itemKey === m.modelKey));
                                if (candidates.length > 0) setAttachSelectedItemKey(candidates[0].modelKey);
                              }}
                            >
                              <Plus size={12} /> Attach Item
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Manual Attach Modal / Popover */}
            {attachingToModelKey && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 1300,
                  background: 'rgba(0,0,0,0.65)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                }}
                onClick={() => setAttachingToModelKey(null)}
              >
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    width: '480px',
                    padding: '20px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Attach Accessory / Component to Product
                  </h4>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Select Item to Attach:
                    </label>
                    <select
                      className="form-control"
                      style={{ width: '100%', height: '34px', fontSize: '12px', background: 'var(--bg-primary)' }}
                      value={attachSelectedItemKey}
                      onChange={e => setAttachSelectedItemKey(e.target.value)}
                    >
                      {summaryModels.filter(m => m.modelKey !== attachingToModelKey).map(item => (
                        <option key={item.modelKey} value={item.modelKey}>
                          {item.plan_code ? `[${item.plan_code}] ` : ''}{item.description} ({item.total_ordered} pcs available)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Quantity Ratio (Units of this item per 1 unit of parent):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className="form-control"
                      style={{ width: '100px', height: '34px', fontSize: '13px', fontWeight: 700, textAlign: 'center', background: 'var(--bg-primary)' }}
                      value={attachRatioInput}
                      onChange={e => setAttachRatioInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '8px' }}>
                      e.g. 2 for 2 lamps per pendant, or 1 for 1 driver per fitting
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setAttachingToModelKey(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ fontWeight: 700 }}
                      onClick={handleConfirmManualAttach}
                    >
                      Attach Item ✓
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1 Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Organize attachments here at the summary level, and the system automatically calculates rooms in Step 2!
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleProceedToStep2PickSheet}
                disabled={summaryModels.length === 0}
              >
                Proceed to Step 2: Auto-Organized Pick Sheet →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2 VIEW: AUTO-ORGANIZED ROOM PICK SHEET ─────────────────────── */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Top Toolbar */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                    <option value="ALL">All Rooms ({plRows.length} items)</option>
                    {plUniqueAreas.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    style={{ border: '1px solid var(--border)', fontSize: '11px' }}
                    onClick={handlePackAll}
                  >
                    Pack All
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    style={{ border: '1px solid var(--border)', fontSize: '11px' }}
                    onClick={handleZeroAll}
                  >
                    Zero All
                  </button>
                </div>

                <span style={{ fontSize: '11.5px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 650 }}>
                  ✓ Auto-Organized: Attached items are proportionally nested per room
                </span>
              </div>

              {/* Print Pick Sheet Button */}
              <div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 650 }}
                  onClick={handlePrintWarehouseWorksheet}
                  title="Print official A4 clipboard pick sheet for warehouse packers"
                >
                  <Printer size={14} /> Print Warehouse Pick Sheet
                </button>
              </div>
            </div>

            {/* Room Pick Sheet Table (NO SPLIT BUTTON HERE) */}
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)', boxShadow: '0 1px 0 var(--border)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 650 }}>
                    <th style={{ padding: '9px 10px', minWidth: '115px' }}>One to One Code</th>
                    <th style={{ padding: '9px 8px', width: '90px', textAlign: 'center' }}>Plan Code</th>
                    <th style={{ padding: '9px 10px', minWidth: '115px' }}>Supplier / SKU</th>
                    <th style={{ padding: '9px 10px', minWidth: '260px' }}>Description & Spec</th>
                    <th style={{ padding: '9px 10px', minWidth: '130px' }}>Area / Room</th>
                    <th style={{ padding: '9px 8px', width: '55px', textAlign: 'center' }}>Ord</th>
                    <th style={{ padding: '9px 8px', width: '75px', textAlign: 'center' }}>Packed</th>
                    <th style={{ padding: '9px 8px', width: '55px', textAlign: 'center' }}>B/O</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        No items found for area "{plFilterArea}".
                      </td>
                    </tr>
                  ) : (
                    visiblePlRows.map(row => {
                      const backorder = Math.max(0, Number(row.qty_ordered || 0) - Number(row.qty_packed || 0));

                      return (
                        <tr
                          key={row.rowKey}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: row.is_accessory ? 'rgba(168, 85, 247, 0.04)' : 'transparent',
                          }}
                        >
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

                          {/* Description */}
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: row.is_accessory ? 500 : 650, color: row.is_accessory ? '#a855f7' : 'var(--text-primary)' }}>
                              {row.description}
                            </div>
                            {row.is_accessory && row.parent_fitting_code && (
                              <span style={{ fontSize: '10.5px', color: '#a855f7', opacity: 0.85 }}>
                                ↳ Attached to {row.parent_fitting_code}
                              </span>
                            )}
                          </td>

                          {/* Area / Room */}
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {row.area || 'General / Unspecified'}
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
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Step 2 Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setCurrentStep(1)}
                style={{ border: '1px solid var(--border)', fontSize: '12px' }}
              >
                ← Back to Step 1: Product Summary
              </button>

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
                  onClick={handleStep2SaveAndProceed}
                  disabled={isSaving || !plOrderKey}
                >
                  Save & Proceed to Step 3: Labels →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3 VIEW: FITTING & ACCESSORY THERMAL LABELS ───────────────── */}
        {currentStep === 3 && (
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
              onNextStage={handleStep3AdvanceToBoxing}
              nextStageLabel="Mark Labels Printed & Next: Boxing →"
              onClose={() => setCurrentStep(2)}
            />
          </div>
        )}

        {/* ─── STEP 4 VIEW: BOXING & CARTON LABELS (WHERE SPLIT LIVES) ───────── */}
        {currentStep === 4 && (
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
                    <th style={{ padding: '9px 8px', textAlign: 'right', width: '110px' }}>Actions</th>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {row.is_accessory && (
                              <span style={{ color: '#a855f7', fontWeight: 800, fontSize: '13px' }}>↳</span>
                            )}
                            <span>{row.one_one_code || '—'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {row.plan_code ? (
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--text-info)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                              {row.plan_code}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          {row.supplier_code || '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: row.is_accessory ? 500 : 650, color: row.is_accessory ? '#a855f7' : 'var(--text-primary)' }}>
                            {row.description}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>
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
                            onClick={() => handleSplitBoxRow(row)}
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

            {/* Step 4 Footer: Save & Finalize */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setCurrentStep(3)}
                style={{ border: '1px solid var(--border)', fontSize: '12px' }}
              >
                ← Back to Step 3: Labels
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

import React, { useState, useEffect, useMemo } from 'react';
import { X, Link2, Check, ChevronDown, ChevronRight, Layers, Box } from 'lucide-react';

/**
 * Clean & Simple Attach Accessory Modal:
 * 1. Step 1: Select the Parent Fitting (grouped by Model / Code so user doesn't see 100 confusing duplicates)
 * 2. Step 2: Lists all Areas/Rooms where that fitting exists so the user simply checks which areas to attach to!
 */
export default function AttachAccessoryModal({
  isOpen,
  onClose,
  accessoryRow,
  candidateParentRows = [],
  existingAttachments = [],
  onConfirmAttachments,
}) {
  const existingAttachedSum = (existingAttachments || []).reduce(
    (s, a) => s + (Number(a.qty_packed) || 0),
    0
  );
  const standaloneQty = accessoryRow?.is_accessory ? 0 : Number(accessoryRow?.qty_packed || 0);
  const maxAvailable = Math.max(
    1,
    standaloneQty + existingAttachedSum ||
      Number(accessoryRow?.remaining_to_pack) ||
      Number(accessoryRow?.qty_ordered) ||
      1
  );

  // Group candidate parent rows by Unique Fitting Model (Plan Code + Made Code)
  const groupedFittingModels = useMemo(() => {
    const groups = {};
    candidateParentRows.forEach(p => {
      const plan = (p.plan_code || '').trim();
      const code = (p.one_one_code || p.supplier_code || 'Fitting').trim();
      const key = `${plan ? `[${plan}] ` : ''}${code}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          planCode: plan,
          oneOneCode: p.one_one_code || code,
          description: p.description || '',
          instances: [],
        };
      }
      groups[key].instances.push(p);
    });
    return Object.values(groups);
  }, [candidateParentRows]);

  // Selected fitting model key
  const [selectedModelKey, setSelectedModelKey] = useState('');

  // Per-instance allocation state: { [order_item_id]: { checked: boolean, qty: number, box: string } }
  const [areaAllocations, setAreaAllocations] = useState({});

  // Initialize when modal opens or target changes
  useEffect(() => {
    if (!isOpen || !accessoryRow) return;

    if (existingAttachments && existingAttachments.length > 0) {
      const firstParent = candidateParentRows.find(
        p => String(p.order_item_id) === String(existingAttachments[0].parent_item_id)
      );
      if (firstParent) {
        const plan = (firstParent.plan_code || '').trim();
        const code = (firstParent.one_one_code || firstParent.supplier_code || 'Fitting').trim();
        setSelectedModelKey(`${plan ? `[${plan}] ` : ''}${code}`);
      } else {
        setSelectedModelKey(groupedFittingModels[0]?.key || '');
      }

      const initial = {};
      existingAttachments.forEach(att => {
        initial[String(att.parent_item_id)] = {
          checked: true,
          qty: Number(att.qty_packed || 1),
          box: att.box_number || 'Box 1',
        };
      });
      setAreaAllocations(initial);
    } else {
      setSelectedModelKey(groupedFittingModels[0]?.key || '');
      setAreaAllocations({});
    }
  }, [isOpen, accessoryRow?.rowKey, accessoryRow?.order_item_id, groupedFittingModels]);

  if (!isOpen || !accessoryRow) return null;

  const currentModel = groupedFittingModels.find(m => m.key === selectedModelKey) || groupedFittingModels[0];
  const instances = currentModel?.instances || [];

  // Calculate total units allocated
  const totalAllocated = Object.entries(areaAllocations).reduce((sum, [itemId, alloc]) => {
    if (alloc.checked) {
      return sum + (Number(alloc.qty) || 0);
    }
    return sum;
  }, 0);

  const unallocated = Math.max(0, maxAvailable - totalAllocated);

  const handleToggleArea = (instance) => {
    const itemId = String(instance.order_item_id);
    const existing = areaAllocations[itemId];
    const isCurrentlyChecked = !!existing?.checked;

    if (isCurrentlyChecked) {
      setAreaAllocations(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], checked: false, qty: 0 },
      }));
    } else {
      // Allocate either default 1 per fitting unit or remaining available
      const defaultQty = Math.min(Number(instance.qty_ordered || 1), unallocated > 0 ? unallocated : 1);
      setAreaAllocations(prev => ({
        ...prev,
        [itemId]: {
          checked: true,
          qty: defaultQty,
          box: instance.box_number || 'Box 1',
        },
      }));
    }
  };

  const handleQtyChange = (itemId, val) => {
    const q = Math.max(0, parseInt(val, 10) || 0);
    setAreaAllocations(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { checked: true, box: 'Box 1' }),
        checked: q > 0,
        qty: q,
      },
    }));
  };

  const handleBoxChange = (itemId, boxVal) => {
    setAreaAllocations(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { checked: true, qty: 1 }),
        box: boxVal,
      },
    }));
  };

  const handleConfirm = () => {
    const selectedEntries = Object.entries(areaAllocations).filter(
      ([, alloc]) => alloc.checked && Number(alloc.qty) > 0
    );

    if (selectedEntries.length === 0) {
      alert('Please check at least one area where this accessory should be packed with the fitting.');
      return;
    }

    const builtAttachments = selectedEntries.map(([parentId, alloc], idx) => {
      const parentObj = candidateParentRows.find(p => String(p.order_item_id) === String(parentId));
      return {
        rowKey: `att_${accessoryRow.order_item_id}_${parentId}_${idx}_${Date.now()}`,
        order_item_id: String(accessoryRow.order_item_id),
        parent_item_id: String(parentId),
        parent_fitting_code: parentObj
          ? `${parentObj.plan_code ? `[${parentObj.plan_code}] ` : ''}${parentObj.one_one_code || parentObj.supplier_code} (${parentObj.area || 'Site'})`
          : `Fitting #${parentId}`,
        one_one_code: accessoryRow.one_one_code,
        plan_code: parentObj?.plan_code || accessoryRow.plan_code || '',
        supplier_code: accessoryRow.supplier_code,
        description: accessoryRow.description,
        floor: parentObj?.floor || accessoryRow.floor || '',
        area: parentObj?.area || accessoryRow.area || '',
        material_colour: accessoryRow.material_colour || '',
        first_fix: accessoryRow.first_fix || 'No',
        red_list: accessoryRow.red_list || 'No',
        qty_ordered: accessoryRow.qty_ordered,
        qty_packed: Number(alloc.qty),
        box_number: alloc.box || parentObj?.box_number || 'Box 1',
        is_accessory: true,
      };
    });

    onConfirmAttachments(accessoryRow.order_item_id, builtAttachments, unallocated);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1350,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '740px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 60px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 size={16} style={{ color: '#a855f7' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Attach Accessory to Main Fitting
              </h3>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Choose a fitting, then simply select which room areas to pack this accessory with!
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Accessory Context Banner */}
        <div style={{ padding: '10px 20px', background: 'rgba(168, 85, 247, 0.08)', borderBottom: '1px solid rgba(168, 85, 247, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Accessory / Component to Attach:
            </div>
            <div style={{ fontSize: '13px', fontWeight: 750, color: 'var(--text-primary)', marginTop: '1px' }}>
              <span style={{ fontFamily: 'monospace', marginRight: '6px' }}>{accessoryRow.one_one_code || accessoryRow.supplier_code}</span>
              — {accessoryRow.description}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Units:</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalAllocated} / {maxAvailable} Attached
            </div>
          </div>
        </div>

        {/* Content Body: 2 Simple Steps */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          {/* STEP 1: Select Main Fitting Model */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 750, color: 'var(--text-primary)', marginBottom: '5px' }}>
              1. Select Parent Fitting Model:
            </label>
            <select
              className="form-control"
              style={{ height: '36px', fontSize: '13px', fontWeight: 650, background: 'var(--bg-primary)' }}
              value={selectedModelKey}
              onChange={e => setSelectedModelKey(e.target.value)}
            >
              {groupedFittingModels.map(m => (
                <option key={m.key} value={m.key}>
                  {m.key} — {m.description?.slice(0, 50)} ({m.instances.length} rooms)
                </option>
              ))}
            </select>
          </div>

          {/* STEP 2: Pick Areas for this Fitting */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 750, color: 'var(--text-primary)', margin: 0 }}>
                2. Select which room areas to pack this with:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  style={{ border: '1px solid var(--border)', fontSize: '11px' }}
                  onClick={() => {
                    const next = {};
                    instances.forEach(inst => {
                      next[String(inst.order_item_id)] = {
                        checked: true,
                        qty: Number(inst.qty_ordered || 1),
                        box: inst.box_number || 'Box 1',
                      };
                    });
                    setAreaAllocations(next);
                  }}
                >
                  ✓ Select All Areas
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  style={{ border: '1px solid var(--border)', fontSize: '11px' }}
                  onClick={() => setAreaAllocations({})}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* List of room areas */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-primary)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontWeight: 650 }}>
                    <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center' }}>Attach</th>
                    <th style={{ padding: '8px 10px' }}>Room / Area</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '80px' }}>Fitting Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>Attach Qty</th>
                    <th style={{ padding: '8px 10px', width: '90px' }}>Box #</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map(inst => {
                    const itemId = String(inst.order_item_id);
                    const alloc = areaAllocations[itemId] || { checked: false, qty: 0, box: inst.box_number || 'Box 1' };
                    const isChecked = !!alloc.checked;

                    return (
                      <tr
                        key={itemId}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isChecked ? 'rgba(168, 85, 247, 0.08)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleArea(inst)}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div>{inst.area || 'General Site Area'}</div>
                          {inst.floor && <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', fontWeight: 400 }}>{inst.floor}</div>}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          {inst.qty_ordered}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="1"
                            disabled={!isChecked}
                            className="form-control"
                            style={{ height: '28px', padding: '2px 6px', fontSize: '12px', textAlign: 'center', fontWeight: 700, width: '100%', background: isChecked ? 'var(--bg-secondary)' : 'transparent' }}
                            value={alloc.qty || 1}
                            onChange={e => handleQtyChange(itemId, e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="text"
                            disabled={!isChecked}
                            className="form-control"
                            style={{ height: '28px', padding: '2px 6px', fontSize: '11.5px', width: '100%', background: isChecked ? 'var(--bg-secondary)' : 'transparent' }}
                            value={alloc.box || inst.box_number || 'Box 1'}
                            onChange={e => handleBoxChange(itemId, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            {unallocated > 0 ? (
              <span style={{ color: 'var(--text-info)' }}>
                ℹ️ {unallocated} units will remain as standalone packing lines.
              </span>
            ) : (
              <span style={{ color: 'var(--text-success)', fontWeight: 700 }}>
                ✓ 100% of accessory units allocated.
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="btn btn-primary btn-sm"
              style={{ background: '#a855f7', borderColor: '#a855f7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Check size={14} /> Attach to Selected Areas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

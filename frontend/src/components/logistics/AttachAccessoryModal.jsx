import React, { useState } from 'react';
import { X, Link2, Plus, Trash2, Check, Layers } from 'lucide-react';

/**
 * Modal allowing warehouse packers to allocate/attach lumped accessory, lamp, driver,
 * or track component quantities to specific parent fittings across different floors/areas
 * so they are packed in the same box and nested visually on the Packing List.
 */
export default function AttachAccessoryModal({
  isOpen,
  onClose,
  accessoryRow,
  candidateParentRows = [],
  existingAttachments = [],
  onConfirmAttachments,
}) {
  if (!isOpen || !accessoryRow) return null;

  const maxAvailable = Math.max(
    1,
    Number(accessoryRow.remaining_to_pack ?? accessoryRow.qty_ordered ?? 1)
  );

  const [allocations, setAllocations] = useState(() => {
    if (existingAttachments && existingAttachments.length > 0) {
      return existingAttachments.map((a, idx) => ({
        id: a.id || `alloc_${idx}`,
        parentOrderItemId: String(a.parent_item_id || ''),
        qty: Number(a.qty_packed || 1),
        boxOverride: a.box_number || '',
      }));
    }
    const defaultParent = candidateParentRows[0];
    return [
      {
        id: `alloc_${Date.now()}`,
        parentOrderItemId: defaultParent ? String(defaultParent.order_item_id) : '',
        qty: Math.min(maxAvailable, defaultParent ? Number(defaultParent.qty_packed || defaultParent.remaining_to_pack || 1) : 1),
        boxOverride: defaultParent ? defaultParent.box_number || 'Box 1' : 'Box 1',
      },
    ];
  });

  const totalAllocated = allocations.reduce((s, a) => s + (Number(a.qty) || 0), 0);
  const unallocated = Math.max(0, maxAvailable - totalAllocated);

  const handleAddRow = () => {
    const firstUnused = candidateParentRows.find(
      p => !allocations.some(a => String(a.parentOrderItemId) === String(p.order_item_id))
    ) || candidateParentRows[0];

    setAllocations(prev => [
      ...prev,
      {
        id: `alloc_${Date.now()}_${prev.length}`,
        parentOrderItemId: firstUnused ? String(firstUnused.order_item_id) : '',
        qty: Math.max(1, unallocated),
        boxOverride: firstUnused ? (firstUnused.box_number || 'Box 1') : 'Box 1',
      },
    ]);
  };

  const handleRemoveRow = (id) => {
    setAllocations(prev => prev.filter(a => a.id !== id));
  };

  const handleParentChange = (id, parentOrderItemId) => {
    const parentObj = candidateParentRows.find(p => String(p.order_item_id) === String(parentOrderItemId));
    setAllocations(prev =>
      prev.map(a =>
        a.id === id
          ? {
              ...a,
              parentOrderItemId,
              boxOverride: parentObj ? (parentObj.box_number || 'Box 1') : a.boxOverride,
            }
          : a
      )
    );
  };

  const handleQtyChange = (id, val) => {
    const q = Math.max(0, parseInt(val, 10) || 0);
    setAllocations(prev => prev.map(a => (a.id === id ? { ...a, qty: q } : a)));
  };

  const handleBoxChange = (id, boxVal) => {
    setAllocations(prev => prev.map(a => (a.id === id ? { ...a, boxOverride: boxVal } : a)));
  };

  const handleApply = () => {
    const valid = allocations.filter(a => a.parentOrderItemId && Number(a.qty) > 0);
    if (valid.length === 0) {
      alert('Please select at least one target fitting and enter a quantity > 0.');
      return;
    }

    const builtAttachments = valid.map((a, idx) => {
      const parentObj = candidateParentRows.find(
        p => String(p.order_item_id) === String(a.parentOrderItemId)
      );
      return {
        rowKey: `att_${accessoryRow.order_item_id}_${a.parentOrderItemId}_${idx}_${Date.now()}`,
        order_item_id: String(accessoryRow.order_item_id),
        parent_item_id: String(a.parentOrderItemId),
        parent_fitting_code: parentObj
          ? `${parentObj.plan_code ? `[${parentObj.plan_code}] ` : ''}${parentObj.one_one_code} (${parentObj.area || parentObj.floor || 'Site'})`
          : `Fitting #${a.parentOrderItemId}`,
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
        qty_packed: Number(a.qty),
        box_number: a.boxOverride || parentObj?.box_number || 'Box 1',
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
          maxWidth: '760px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Link2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Attach Accessory / Lamp / Driver to Main Fittings
              </h3>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Allocate specific quantities of this accessory so it packs inside the same box & room as its parent fitting
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Source Accessory Summary */}
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#a855f7' }}>
                Accessory / Component Line
              </span>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                {accessoryRow.one_one_code} {accessoryRow.supplier_code && accessoryRow.supplier_code !== accessoryRow.one_one_code ? `(${accessoryRow.supplier_code})` : ''}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{accessoryRow.description}</div>
            </div>

            <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Available Qty</span>
                <strong style={{ fontSize: '15px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{maxAvailable}</strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Allocated</span>
                <strong
                  style={{
                    fontSize: '15px',
                    fontFamily: 'monospace',
                    color: totalAllocated > maxAvailable ? 'var(--text-danger)' : 'var(--text-success)',
                  }}
                >
                  {totalAllocated}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Unattached Balance</span>
                <strong style={{ fontSize: '15px', fontFamily: 'monospace', color: 'var(--text-warning)' }}>{unallocated}</strong>
              </div>
            </div>
          </div>

          {/* Allocation Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {allocations.map((alloc, idx) => (
              <div
                key={alloc.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 110px 130px 36px',
                  gap: '10px',
                  alignItems: 'center',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                }}
              >
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                    Target Main Fitting (Room / Area) #{idx + 1}
                  </label>
                  <select
                    className="form-control"
                    style={{ height: '30px', fontSize: '12px', background: 'var(--bg-secondary)' }}
                    value={alloc.parentOrderItemId}
                    onChange={e => handleParentChange(alloc.id, e.target.value)}
                  >
                    <option value="">-- Select Parent Fitting --</option>
                    {candidateParentRows.map(p => (
                      <option key={p.order_item_id} value={String(p.order_item_id)}>
                        {p.plan_code ? `[${p.plan_code}] ` : ''}{p.one_one_code} — {p.description?.slice(0, 38)} ({p.floor || 'Floor'} / {p.area || 'Area'} • Qty: {p.qty_ordered})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                    Accessory Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxAvailable}
                    className="form-control"
                    style={{ height: '30px', fontSize: '12px', fontWeight: 700, textAlign: 'center', background: 'var(--bg-secondary)' }}
                    value={alloc.qty}
                    onChange={e => handleQtyChange(alloc.id, e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                    Pack Into Box
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '30px', fontSize: '12px', background: 'var(--bg-secondary)' }}
                    value={alloc.boxOverride}
                    onChange={e => handleBoxChange(alloc.id, e.target.value)}
                    placeholder="Box 1"
                  />
                </div>

                <div style={{ paddingTop: '16px', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    style={{ color: 'var(--text-danger)' }}
                    onClick={() => handleRemoveRow(alloc.id)}
                    title="Remove allocation split"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{ border: '1px solid var(--border)', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={handleAddRow}
            >
              <Plus size={13} /> Allocate to Another Fitting / Room
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Attached accessories inherit the parent fitting’s Floor, Area, and Box automatically.
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              onClick={handleApply}
            >
              <Check size={14} /> Attach to Selected Fittings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

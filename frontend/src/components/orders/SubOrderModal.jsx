import React, { useState, useMemo } from 'react';
import { 
  GitBranch, 
  X, 
  CheckSquare, 
  Square, 
  Layers, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { API_BASE } from '../../api_config';

export default function SubOrderModal({
  isOpen,
  onClose,
  masterOrder,
  items = [],
  onSubOrderCreated
}) {
  const [phaseName, setPhaseName] = useState('Phase 1: First Fix & Ground Floor');
  const [notes, setNotes] = useState('');
  const [selectedAllocations, setSelectedAllocations] = useState({}); // { [item_id]: qty_to_allocate }
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Eligible items (active, non-credit, non-spacer items on master order)
  const eligibleItems = useMemo(() => {
    return (items || []).filter(it => 
      !it.isSpacer && 
      it.type !== 'SPACER' && 
      !it.is_credit && 
      !it.isCredit && 
      it.revision_status !== 'Swapped'
    );
  }, [items]);

  // Group items by Area / Room
  const itemsByRoom = useMemo(() => {
    const groups = {};
    eligibleItems.forEach(it => {
      const room = it.area || 'General Scope';
      if (!groups[room]) groups[room] = [];
      groups[room].push(it);
    });
    return groups;
  }, [eligibleItems]);

  // Compute live sub-order statistics
  const { totalQty, totalRetail, selectedLineCount } = useMemo(() => {
    let q = 0;
    let r = 0;
    let lines = 0;
    eligibleItems.forEach(it => {
      const alloc = selectedAllocations[it.id];
      if (alloc && alloc > 0) {
        q += Number(alloc) || 0;
        r += (Number(alloc) || 0) * (Number(it.unitRetail || it.unit_retail) || 0);
        lines += 1;
      }
    });
    return { totalQty: q, totalRetail: r, selectedLineCount: lines };
  }, [eligibleItems, selectedAllocations]);

  if (!isOpen || !masterOrder) return null;

  const handleToggleRoom = (roomName) => {
    const roomItems = itemsByRoom[roomName] || [];
    const allSelected = roomItems.every(it => (selectedAllocations[it.id] || 0) === Number(it.qty || 1));

    setSelectedAllocations(prev => {
      const next = { ...prev };
      roomItems.forEach(it => {
        if (allSelected) {
          delete next[it.id];
        } else {
          next[it.id] = Number(it.qty || 1);
        }
      });
      return next;
    });
  };

  const handleToggleItem = (item) => {
    setSelectedAllocations(prev => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = Number(item.qty || 1);
      }
      return next;
    });
  };

  const handleQtyChange = (item, val) => {
    const maxQty = Number(item.qty || 1);
    const parsed = Math.max(0, Math.min(maxQty, parseInt(val, 10) || 0));
    setSelectedAllocations(prev => {
      const next = { ...prev };
      if (parsed === 0) {
        delete next[item.id];
      } else {
        next[item.id] = parsed;
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const next = {};
    eligibleItems.forEach(it => {
      next[it.id] = Number(it.qty || 1);
    });
    setSelectedAllocations(next);
  };

  const handleClearAll = () => {
    setSelectedAllocations({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!phaseName || !phaseName.strip?.() && !phaseName.trim()) {
      setErrorMsg('Please specify a Phase or Sub-Order Name (e.g. Phase 1: Ground Floor).');
      return;
    }

    const payloadItems = [];
    Object.entries(selectedAllocations).forEach(([itemId, qty]) => {
      if (qty > 0) {
        payloadItems.push({
          item_id: itemId,
          qty_to_allocate: qty
        });
      }
    });

    if (payloadItems.length === 0) {
      setErrorMsg('Please select at least one item or room to allocate to this sub-order.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${masterOrder.po_number}/sub-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase_name: phaseName.trim(),
          items: payloadItems,
          notes: notes.trim(),
          created_by: 'User'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${res.status}`);
      }

      const data = await res.json();
      if (onSubOrderCreated) {
        onSubOrderCreated(data);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create sub-order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-primary, #ffffff)',
        border: '1.5px solid var(--border)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-secondary, #f8fafc)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge b-info" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>
                Sub-Order Engine
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Master Order: <strong>{masterOrder.po_number}</strong>
              </span>
            </div>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitBranch size={18} color="var(--text-info)" /> Create Phase / Sub-Order (-01, -02)
            </h2>
          </div>
          <button 
            type="button" 
            className="btn btn-ghost btn-sm" 
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {errorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12.5px',
                color: 'var(--text-danger)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* PHASE DETAILS CONFIGURATION */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Phase / Sub-Order Name <span style={{ color: 'var(--text-danger)' }}>*</span>
                </label>
                <input 
                  type="text"
                  className="form-control"
                  style={{ fontSize: '13px', height: '34px', fontWeight: 600 }}
                  placeholder="e.g. Phase 1: First Fix & Ground Floor"
                  value={phaseName}
                  onChange={e => setPhaseName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Target Suffix Format
                </label>
                <div style={{
                  height: '34px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: 'var(--text-info)'
                }}>
                  {masterOrder.po_number}-01...
                </div>
              </div>
            </div>

            {/* SELECTION TOOLBAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  📦 Allocate Items to this Phase
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  (Select entire rooms or specify item counts)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost btn-xs"
                  onClick={handleSelectAll}
                  style={{ fontSize: '11px', border: '1px solid var(--border)' }}
                >
                  Select All Items
                </button>
                <button 
                  type="button" 
                  className="btn btn-ghost btn-xs"
                  onClick={handleClearAll}
                  style={{ fontSize: '11px', border: '1px solid var(--border)' }}
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* HIERARCHICAL ROOM & LINE ITEMS CHECKLIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(itemsByRoom).map(([roomName, roomItems]) => {
                const roomSelectedCount = roomItems.filter(it => (selectedAllocations[it.id] || 0) > 0).length;
                const isAllRoomSelected = roomItems.every(it => (selectedAllocations[it.id] || 0) === Number(it.qty || 1));
                const roomTotalVal = roomItems.reduce((s, it) => s + ((Number(it.qty) || 0) * (Number(it.unitRetail || it.unit_retail) || 0)), 0);

                return (
                  <div key={roomName} style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'var(--bg-primary)'
                  }}>
                    {/* ROOM HEADER ROW */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-secondary)',
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleRoom(roomName)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 0,
                            color: isAllRoomSelected ? 'var(--text-info)' : 'var(--text-secondary)'
                          }}
                        >
                          {isAllRoomSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          📍 {roomName}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          ({roomItems.length} line items)
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Selected: <strong>{roomSelectedCount}/{roomItems.length}</strong>
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          R {Math.round(roomTotalVal).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* ROOM ITEMS TABLE */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                      <tbody>
                        {roomItems.map(it => {
                          const isAllocated = (selectedAllocations[it.id] || 0) > 0;
                          const currentAlloc = selectedAllocations[it.id] || 0;
                          const maxQty = Number(it.qty) || 1;
                          const unitRet = Number(it.unitRetail || it.unit_retail) || 0;
                          const isAlreadyInSub = it.sub_order_ref || it.subOrderRef;

                          return (
                            <tr key={it.id} style={{
                              borderBottom: '1px solid var(--border)',
                              background: isAllocated ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                              transition: 'background 0.1s'
                            }}>
                              <td style={{ width: '36px', padding: '6px 10px', textAlign: 'center' }}>
                                <input 
                                  type="checkbox"
                                  checked={isAllocated}
                                  onChange={() => handleToggleItem(it)}
                                  style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                />
                              </td>
                              <td style={{ width: '110px', padding: '6px 8px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>
                                {it.one_one_code || it.code || '—'}
                              </td>
                              <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>
                                {it.description || 'Custom Fixture'}
                                {isAlreadyInSub && (
                                  <span className="badge b-warning" style={{ marginLeft: '8px', fontSize: '9.5px' }}>
                                    Already in {it.sub_order_ref || it.subOrderRef}
                                  </span>
                                )}
                              </td>
                              <td style={{ width: '100px', padding: '6px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                R {unitRet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ width: '130px', padding: '6px 8px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Alloc:</span>
                                  <input 
                                    type="number"
                                    min="0"
                                    max={maxQty}
                                    value={currentAlloc}
                                    onChange={e => handleQtyChange(it, e.target.value)}
                                    style={{
                                      width: '45px',
                                      height: '24px',
                                      textAlign: 'center',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      border: '1px solid var(--border-strong)',
                                      borderRadius: '4px',
                                      background: 'var(--bg-primary)'
                                    }}
                                  />
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>/ {maxQty}</span>
                                </div>
                              </td>
                              <td style={{ width: '110px', padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                                R {Math.round(currentAlloc * unitRet).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* AUDIT / SCOPE NOTES */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Phase Scope Notes & Instructions
              </label>
              <textarea 
                className="form-control"
                rows={2}
                style={{ fontSize: '12px' }}
                placeholder="Optional notes or instructions for this phase..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-secondary, #f8fafc)'
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Selected Scope</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {totalQty} Units ({selectedLineCount} Line Items)
                </span>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Sub-Order Total Retail</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-success)' }}>
                  R {Math.round(totalRetail).toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-secondary)' }}>Ex VAT</span>
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={onClose}
                disabled={loading}
                style={{ fontSize: '12.5px' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading || selectedLineCount === 0}
                style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
                {loading ? 'Creating Phase...' : `Create Sub-Order (${selectedLineCount} items)`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

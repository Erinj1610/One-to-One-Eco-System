import React, { useState, useMemo, useEffect } from 'react';
import {
  RotateCcw,
  X,
  Search,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Info,
  MapPin,
  Tag
} from 'lucide-react';
import { API_BASE } from '../../api_config';

export default function ItemSwapModal({
  isOpen,
  onClose,
  item,
  poNumber,
  catalogProducts = [],
  onSwapCompleted
}) {
  const [swapQty, setSwapQty] = useState(1);
  const [repQty, setRepQty] = useState(1);
  const [repCode, setRepCode] = useState('');
  const [repOneOne, setRepOneOne] = useState('');
  const [repDesc, setRepDesc] = useState('');
  const [repRetail, setRepRetail] = useState('');
  const [repCost, setRepCost] = useState('');
  const [repBrand, setRepBrand] = useState('');
  const [repSupplier, setRepSupplier] = useState('');
  const [repType, setRepType] = useState('');
  const [repArea, setRepArea] = useState('');
  const [repFloor, setRepFloor] = useState('');
  const [reason, setReason] = useState('');
  const [syncToTakeoff, setSyncToTakeoff] = useState(false);

  const [catalogBaseRetail, setCatalogBaseRetail] = useState(null);
  const [selectedFromCatalog, setSelectedFromCatalog] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false);
  const [apiSearchResults, setApiSearchResults] = useState([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  const [swapContext, setSwapContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !item || !poNumber) return;

    const initialQty = Math.max(1, Number(item.qty) || 1);
    setSwapQty(initialQty);
    setRepQty(initialQty);
    setRepBrand(item.brand || '');
    setRepSupplier(item.supplier || '');
    setRepType('');
    setRepArea('');
    setRepFloor('');
    setReason('');
    setSyncToTakeoff(false);
    setSearchQuery('');
    setRepCode('');
    setRepOneOne('');
    setRepDesc('');
    setRepRetail('');
    setRepCost('');
    setCatalogBaseRetail(null);
    setSelectedFromCatalog(false);
    setErrorMsg('');
    setSwapContext(null);

    let cancelled = false;
    setLoadingContext(true);
    fetch(`${API_BASE}/api/orders/${encodeURIComponent(poNumber)}/items/${encodeURIComponent(item.id)}/swap-context`)
      .then(r => (r.ok ? r.json() : null))
      .then(ctx => {
        if (cancelled || !ctx) return;
        setSwapContext(ctx);
        const maxQty = Math.max(1, Number(ctx.remaining_swappable_qty) || initialQty);
        setSwapQty(maxQty);
        setRepQty(maxQty);
      })
      .catch(err => console.warn('Could not load swap context:', err))
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item, isOpen, poNumber]);

  // Live API Search directly against Cloud SQL Master Products Database
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setApiSearchResults([]);
      setIsSearchingApi(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const res = await fetch(`${API_BASE}/api/products/?q=${encodeURIComponent(searchQuery.trim())}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data.items || data.products || []);
          setApiSearchResults(items);
        }
      } catch (err) {
        console.error('Failed to search live products:', err);
      } finally {
        setIsSearchingApi(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const matchingCatalog = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase().trim();

    const localMatches = (catalogProducts || []).filter(p =>
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.one_to_one_code && p.one_to_one_code.toLowerCase().includes(q)) ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );

    const seen = new Set();
    const combined = [];
    for (const p of [...apiSearchResults, ...localMatches]) {
      const key = (p.sku || p.one_to_one_code || p.id || '').toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        combined.push(p);
      }
    }
    return combined.slice(0, 12);
  }, [searchQuery, catalogProducts, apiSearchResults]);

  if (!isOpen || !item) return null;

  const maxSwappableQty = swapContext ? Number(swapContext.remaining_swappable_qty || 0) : (Number(item.qty) || 1);
  const effectiveSwapQty = Math.min(Math.max(1, Number(swapQty) || 1), Math.max(1, maxSwappableQty));
  const origRetail = Number(item.unitRetail || item.unit_retail) || 0;
  const minusLineVal = effectiveSwapQty * origRetail;

  const currentRepQty = Math.max(1, Number(repQty) || 1);
  const currentRepRetail = Number(repRetail) || 0;
  const plusLineVal = currentRepQty * currentRepRetail;
  const deltaVal = plusLineVal - minusLineVal;

  const isPriceOverridden = selectedFromCatalog && catalogBaseRetail !== null && Math.abs(currentRepRetail - catalogBaseRetail) > 0.01;
  const isManualPricing = !selectedFromCatalog || isPriceOverridden;

  const handleSelectProduct = (p) => {
    const code = p.sku || p.one_to_one_code || '';
    const desc = p.name || p.title || p.description || p.client_description || '';
    const retail = p.retail_price !== undefined && p.retail_price !== null ? p.retail_price : (p.price || p.recommended_retail_price || '');
    const cost = p.cost_price !== undefined && p.cost_price !== null ? p.cost_price : (p.internal_cost || p.supplier_cost || '');
    const brand = p.brand || (item && item.brand) || '';
    const supplier = p.supplier_name || (p.supplier && p.supplier.name) || (item && item.supplier) || '';
    const roundedRetail = retail !== '' ? Math.round(Number(retail) * 100) / 100 : '';

    setRepCode(code);
    setRepOneOne(p.one_to_one_code || code);
    setRepDesc(desc);
    setRepRetail(roundedRetail);
    setRepCost(cost !== '' ? Math.round(Number(cost) * 100) / 100 : '');
    setRepBrand(brand);
    setRepSupplier(supplier);
    setCatalogBaseRetail(roundedRetail !== '' ? Number(roundedRetail) : null);
    setSelectedFromCatalog(true);
    setShowCatalogSuggestions(false);
    setSearchQuery(code ? `${code} - ${desc.slice(0, 40)}` : desc);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (swapContext && !swapContext.can_swap) {
      setErrorMsg('No remaining swappable quantity on this row.');
      return;
    }

    if (!repCode.trim()) {
      setErrorMsg('Please specify a replacement item code or select one from the catalogue.');
      return;
    }

    if (effectiveSwapQty <= 0 || effectiveSwapQty > maxSwappableQty) {
      setErrorMsg(`Swap quantity must be between 1 and ${maxSwappableQty}.`);
      return;
    }

    if (!reason || !reason.trim() || reason.trim().length < 5) {
      setErrorMsg('A detailed reason is mandatory for variation audits (min 5 characters).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(poNumber)}/items/${encodeURIComponent(item.id)}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replacement: {
            code: repCode.trim(),
            one_one_code: repOneOne.trim() || repCode.trim(),
            description: repDesc.trim() || `Replacement for ${item.code || item.description}`,
            unit_retail: parseFloat(repRetail) || 0.0,
            unit_cost: parseFloat(repCost) || 0.0,
            brand: repBrand.trim(),
            supplier: repSupplier.trim(),
            type: repType.trim() || item.type,
            area: repArea.trim() || item.area,
            floor: repFloor.trim() || item.floor,
            first_fix: item.first_fix || 'No'
          },
          swap_qty: effectiveSwapQty,
          replacement_qty: currentRepQty,
          reason: reason.trim(),
          performed_by: 'User',
          sync_to_takeoff: syncToTakeoff,
          is_manual_price: isManualPricing,
          catalog_retail_price: catalogBaseRetail
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${res.status}`);
      }

      const data = await res.json();
      if (onSwapCompleted) {
        onSwapCompleted(data);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to execute item swap.');
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
        maxWidth: '780px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* HEADER */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-secondary, #f8fafc)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="badge b-warning" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>
                3-Row Variation Order
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Order: <strong>{poNumber}</strong> &bull; Baseline Room: <strong>{item.area || 'General'}</strong> &bull; Plan Code: <strong>{item.type || '—'}</strong>
              </span>
            </div>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw size={17} color="var(--text-warning)" /> On-Site Item Swap & Variation
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

        {/* BODY */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

            {/* EXPOSURE WARNINGS (DELIVERY / PO / INVOICE / SUB-ORDER) */}
            {loadingContext && (
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={13} className="animate-spin" /> Checking deliveries, POs, and phase allocations...
              </div>
            )}

            {swapContext && swapContext.delivered_qty > 0 && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '11.5px',
                color: '#92400e',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px', color: '#d97706' }} />
                <div>
                  <strong>Delivered Stock Alert:</strong> {swapContext.delivered_qty} unit(s) already delivered on{' '}
                  <strong>{swapContext.dn_refs.join(', ') || 'Delivery Note'}</strong>.
                  Confirming this swap will flag the Minus row (<code>-{effectiveSwapQty}</code>) as <strong>Site Return / Uplift Required</strong> for Logistics.
                </div>
              </div>
            )}

            {swapContext && (swapContext.po_allocated_qty > 0 || swapContext.grn_received_qty > 0 || swapContext.phase_has_invoice) && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '11.5px',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: '1px', color: '#2563eb' }} />
                <div>
                  <strong>Purchasing &amp; Invoicing Impact:</strong>{' '}
                  {swapContext.po_allocated_qty > 0 && `PO allocated (${swapContext.po_refs.join(', ')}: ${swapContext.po_allocated_qty} units). `}
                  {swapContext.grn_received_qty > 0 && `GRN received (${swapContext.grn_refs.join(', ')}: ${swapContext.grn_received_qty} units). `}
                  {swapContext.phase_has_invoice && `Phase/Item has active Client Invoice (${swapContext.invoice_refs.join(', ') || 'Invoiced'}). `}
                  Original PO/GRN/Invoice links stay untouched on the baseline row; the Minus row will be marked <strong>Awaiting Credit / Return</strong> so Credit Notes settle cleanly without double-subtracting.
                </div>
              </div>
            )}

            {(item?.sub_order_ref || item?.subOrderRef) && (
              <div style={{
                background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '11.5px',
                color: 'var(--text-primary)'
              }}>
                <strong style={{ color: '#7c3aed' }}>Phase Scope: {item.sub_order_ref || item.subOrderRef}</strong> — Both the Minus and Plus rows will inherit this Phase, updating both this Sub-Order and the Master Order.
              </div>
            )}

            {/* 3-ROW LEDGER PREVIEW: BASELINE | MINUS CREDIT | PLUS ADDITION */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* MINUS CREDIT */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.04)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-danger)' }}>
                    Minus Credit Row ({item.area || 'General'})
                  </span>
                  <span className="badge b-danger" style={{ fontSize: '9px' }}>
                    {item.type || 'Original'}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {item.one_one_code || item.code}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                  {item.description || 'Custom Fixture'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border)', fontSize: '11.5px' }}>
                  <span>
                    Baseline: <strong>{Number(item.qty) || 0}</strong> &bull; Swap Out: <strong style={{ color: 'var(--text-danger)' }}>-{effectiveSwapQty}</strong> &times; R {origRetail.toLocaleString()}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-danger)' }}>
                    -R {Math.round(minusLineVal).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* PLUS ADDITION */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.04)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-success)' }}>
                    Plus Addition ({repArea || item.area || 'General'})
                  </span>
                  <span className="badge b-success" style={{ fontSize: '9px' }}>
                    {repType || item.type || 'New'}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {repCode || 'Select or enter fitting below...'}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                  {repDesc || 'Description will appear here'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border)', fontSize: '11.5px' }}>
                  <span>Qty: <strong style={{ color: 'var(--text-success)' }}>+{currentRepQty}</strong> &times; R {currentRepRetail.toLocaleString()}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-success)' }}>
                    +R {Math.round(plusLineVal).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* CATALOGUE SEARCH & PICKER */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Quick Search from Product Catalogue</span>
                {repCode && (
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: isManualPricing ? 'rgba(245, 158, 11, 0.14)' : 'rgba(16, 185, 129, 0.12)',
                    color: isManualPricing ? '#b45309' : '#047857',
                    fontWeight: 700
                  }}>
                    {selectedFromCatalog
                      ? (isPriceOverridden ? 'Catalogue Item (Price Overridden)' : 'Catalogue Verified')
                      : 'Manual / Custom Fitting'}
                  </span>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '32px', paddingRight: isSearchingApi ? '32px' : '10px', fontSize: '12.5px', height: '34px' }}
                  placeholder="Type code, SKU or description to search master product database..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setShowCatalogSuggestions(true);
                  }}
                  onFocus={() => setShowCatalogSuggestions(true)}
                />
                {isSearchingApi && (
                  <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-info)' }} />
                )}
              </div>

              {showCatalogSuggestions && searchQuery.trim().length >= 2 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-primary, #ffffff)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                  zIndex: 9999,
                  maxHeight: '240px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  {matchingCatalog.length > 0 ? (
                    matchingCatalog.map(p => (
                      <div
                        key={p.id || p.sku || Math.random()}
                        onClick={() => handleSelectProduct(p)}
                        style={{
                          padding: '9px 14px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ flex: 1, paddingRight: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontFamily: 'monospace', color: '#0284c7', fontSize: '12.5px' }}>
                              {p.sku || p.one_to_one_code}
                            </strong>
                            <span style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                              {p.brand || p.supplier_name || 'One to One'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                            {p.name || p.title || p.description || p.client_description || 'Product'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, color: '#10b981', fontSize: '12.5px' }}>
                            R {Number(p.retail_price !== undefined ? p.retail_price : p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-tertiary)' }}>Retail Ex VAT</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {isSearchingApi ? 'Searching master catalogue...' : `No matching products found for "${searchQuery}". You can enter custom specs below.`}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SWAP QUANTITIES, PLAN CODE & TARGET ROOM */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-danger)', marginBottom: '3px' }}>
                  Swap Out Qty (Max {maxSwappableQty}) <span style={{ color: 'var(--text-danger)' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, maxSwappableQty)}
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px', fontWeight: 700 }}
                  value={swapQty}
                  onChange={e => {
                    const v = Math.min(Math.max(1, parseInt(e.target.value, 10) || 1), Math.max(1, maxSwappableQty));
                    setSwapQty(v);
                    setRepQty(v);
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-success)', marginBottom: '3px' }}>
                  New Addition Qty <span style={{ color: 'var(--text-danger)' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px', fontWeight: 700 }}
                  value={repQty}
                  onChange={e => setRepQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Tag size={11} /> New Plan Code / Type</span>
                  {swapContext?.suggested_plan_code && !repType && (
                    <button
                      type="button"
                      onClick={() => setRepType(swapContext.suggested_plan_code)}
                      style={{ fontSize: '9.5px', color: '#0284c7', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0px 5px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Use {swapContext.suggested_plan_code}
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700 }}
                  placeholder={`Keep ${item.type || 'original'} — or enter exact code`}
                  value={repType}
                  onChange={e => setRepType(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Replacement Item Code <span style={{ color: 'var(--text-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}
                  placeholder="e.g. 2223/30"
                  value={repCode}
                  onChange={e => {
                    setRepCode(e.target.value);
                    setSelectedFromCatalog(false);
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  <MapPin size={11} /> Target Room / Area
                </label>
                <input
                  type="text"
                  list="swap-target-rooms-list"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px' }}
                  placeholder={`Keep ${item.area || 'same room'} — or pick/type new`}
                  value={repArea}
                  onChange={e => setRepArea(e.target.value)}
                />
                <datalist id="swap-target-rooms-list">
                  {(swapContext?.existing_rooms || []).map(rm => (
                    <option key={rm} value={rm} />
                  ))}
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Target Floor
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px' }}
                  placeholder={`Keep ${item.floor || 'same floor'} — or type new`}
                  value={repFloor}
                  onChange={e => setRepFloor(e.target.value)}
                />
              </div>
            </div>

            {/* DESCRIPTION & PRICING */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Replacement Description
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px' }}
                  placeholder="e.g. Anti-Glare Downlight 10W GU10 Black"
                  value={repDesc}
                  onChange={e => setRepDesc(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Unit Retail (Ex VAT) <span style={{ color: 'var(--text-danger)' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px', fontWeight: 700 }}
                  placeholder="0.00"
                  value={repRetail}
                  onChange={e => setRepRetail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Unit Cost (Internal)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px' }}
                  placeholder="0.00"
                  value={repCost}
                  onChange={e => setRepCost(e.target.value)}
                />
              </div>
            </div>

            {/* MANDATORY REASON + TAKEOFF SYNC CHECKBOX */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                <span>Reason for Site Variation / Swap <span style={{ color: 'var(--text-danger)' }}>*</span></span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', fontWeight: 400 }}>Appears on Client Variation &amp; Quotation</span>
              </label>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                {[
                  'Client requested on-site snag walk variation',
                  'Partial quantity relocated to new area',
                  'Discontinued or unavailable from supplier',
                  'Architect revised fitting specification',
                  'Cost-engineered alternative approved by PM'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="btn btn-xs"
                    style={{
                      fontSize: '10.5px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: reason === chip ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-secondary)',
                      border: '1px solid',
                      borderColor: reason === chip ? '#f59e0b' : 'var(--border)',
                      color: reason === chip ? '#d97706' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setReason(chip);
                      setErrorMsg('');
                    }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              <textarea
                className="form-control"
                rows={2}
                style={{
                  fontSize: '12px',
                  border: !reason.trim() && errorMsg ? '2px solid var(--text-danger)' : '1px solid var(--border)',
                  background: 'var(--bg-primary)'
                }}
                placeholder="Click a quick reason above or type specific details here..."
                value={reason}
                onChange={e => {
                  setReason(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '11.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={syncToTakeoff}
                  onChange={e => setSyncToTakeoff(e.target.checked)}
                />
                <span>Also update <strong>Takeoff &amp; Spec Engine</strong> (deduct {effectiveSwapQty} from {item.type || 'original'} and add {currentRepQty} as {repType || 'new code'} in {repArea || item.area || 'room'})</span>
              </label>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-secondary, #f8fafc)'
          }}>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Net Financial Variance</span>
              <span style={{
                fontSize: '15px',
                fontWeight: 700,
                color: deltaVal > 0 ? 'var(--text-success)' : deltaVal < 0 ? 'var(--text-danger)' : 'var(--text-primary)'
              }}>
                {deltaVal > 0 ? `+R ${Math.round(deltaVal).toLocaleString()}` : deltaVal < 0 ? `-R ${Math.abs(Math.round(deltaVal)).toLocaleString()}` : 'R 0 (Even Swap)'}
                <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '4px' }}>Ex VAT</span>
              </span>
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
                className="btn btn-warning"
                disabled={loading || (swapContext && !swapContext.can_swap)}
                style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: loading ? 'wait' : 'pointer' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                {loading ? 'Processing Swap...' : 'Confirm 3-Row Swap'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

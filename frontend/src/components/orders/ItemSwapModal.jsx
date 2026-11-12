import React, { useState, useMemo, useEffect } from 'react';
import { 
  RotateCcw, 
  X, 
  Search, 
  AlertCircle, 
  Loader2, 
  Check, 
  ArrowRight, 
  Info,
  DollarSign
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
  const [repCode, setRepCode] = useState('');
  const [repOneOne, setRepOneOne] = useState('');
  const [repDesc, setRepDesc] = useState('');
  const [repRetail, setRepRetail] = useState('');
  const [repCost, setRepCost] = useState('');
  const [repBrand, setRepBrand] = useState('');
  const [repSupplier, setRepSupplier] = useState('');
  const [repQty, setRepQty] = useState(1);
  const [reason, setReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (item) {
      setRepQty(Number(item.qty) || 1);
      setRepBrand(item.brand || '');
      setRepSupplier(item.supplier || '');
      setReason('');
      setSearchQuery('');
      setRepCode('');
      setRepOneOne('');
      setRepDesc('');
      setRepRetail('');
      setRepCost('');
      setErrorMsg('');
    }
  }, [item, isOpen]);

  const [apiSearchResults, setApiSearchResults] = useState([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

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
        const res = await fetch(`${API_BASE}/api/products?q=${encodeURIComponent(searchQuery.trim())}&limit=15`);
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

  // Catalog search filtering combining local cache and live Cloud SQL results
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

  const origQty = Number(item.qty) || 1;
  const origRetail = Number(item.unitRetail || item.unit_retail) || 0;
  const origLineVal = origQty * origRetail;

  const currentRepQty = Number(repQty) || 1;
  const currentRepRetail = Number(repRetail) || 0;
  const currentRepLineVal = currentRepQty * currentRepRetail;
  const deltaVal = currentRepLineVal - origLineVal;

  const handleSelectProduct = (p) => {
    const code = p.sku || p.one_to_one_code || '';
    const desc = p.name || p.title || p.description || p.client_description || '';
    const retail = p.retail_price !== undefined && p.retail_price !== null ? p.retail_price : (p.price || p.recommended_retail_price || '');
    const cost = p.cost_price !== undefined && p.cost_price !== null ? p.cost_price : (p.internal_cost || p.supplier_cost || '');
    const brand = p.brand || (item && item.brand) || '';
    const supplier = p.supplier_name || (p.supplier && p.supplier.name) || (item && item.supplier) || '';

    setRepCode(code);
    setRepOneOne(p.one_to_one_code || code);
    setRepDesc(desc);
    setRepRetail(retail !== '' ? Math.round(Number(retail) * 100) / 100 : '');
    setRepCost(cost !== '' ? Math.round(Number(cost) * 100) / 100 : '');
    setRepBrand(brand);
    setRepSupplier(supplier);
    setShowCatalogSuggestions(false);
    setSearchQuery(code ? `${code} - ${desc.slice(0, 40)}` : desc);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!repCode.trim()) {
      setErrorMsg('Please specify a replacement item code or select one from the catalogue.');
      return;
    }

    if (!reason || !reason.trim() || reason.trim().length < 5) {
      setErrorMsg('A detailed reason is mandatory for variation audits (min 5 characters).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${poNumber}/items/${item.id}/swap`, {
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
            area: item.area,
            floor: item.floor,
            first_fix: item.first_fix || 'No'
          },
          replacement_qty: parseInt(repQty, 10) || 1,
          reason: reason.trim(),
          performed_by: 'User'
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
        maxWidth: '720px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* HEADER */}
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
              <span className="badge b-warning" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>
                Variation Order
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Order: <strong>{poNumber}</strong> &bull; Room: <strong>{item.area || 'General'}</strong>
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

            {/* SUB-ORDER & FINANCIAL PHASE ALLOCATION NOTICE */}
            {(item?.sub_order_ref || item?.subOrderRef) && (
              <div style={{
                background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <span style={{ fontSize: '18px', lineHeight: 1 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#8b5cf6' }}>
                    Allocated to Phase: {item.sub_order_ref || item.subOrderRef}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11.5px', marginTop: '2px' }}>
                    This fitting is assigned to an active phase. Swapping this fitting will generate an audited variation and automatically update the specification in that phase. If an invoice or deposit was already processed, financial adjustments will be tracked.
                  </div>
                </div>
              </div>
            )}

            {/* SIDE-BY-SIDE COMPARISON: ORIGINAL VS REPLACEMENT */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* ORIGINAL ITEM (TO BE SWAPPED OUT / CREDITED) */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.04)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '12px 14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-danger)' }}>
                    🔴 Original Fitting (Credited)
                  </span>
                  <span className="badge b-danger" style={{ fontSize: '9.5px' }}>
                    Swapped Out
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {item.one_one_code || item.code}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                  {item.description || 'Custom Fixture'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border)', fontSize: '12px' }}>
                  <span>Qty: <strong>{origQty}</strong> &times; R {origRetail.toLocaleString()}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-danger)' }}>
                    -R {Math.round(origLineVal).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* REPLACEMENT SUMMARY */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.04)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '12px 14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-success)' }}>
                    🟢 Replacement Addition
                  </span>
                  <span className="badge b-success" style={{ fontSize: '9.5px' }}>
                    New Fitting
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {repCode || 'Select or enter fitting below...'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                  {repDesc || 'Description will appear here'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border)', fontSize: '12px' }}>
                  <span>Qty: <strong>{currentRepQty}</strong> &times; R {currentRepRetail.toLocaleString()}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-success)' }}>
                    +R {Math.round(currentRepLineVal).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* CATALOGUE SEARCH & PICKER */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Quick Search from Product Catalogue
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

              {/* DROPDOWN SUGGESTIONS */}
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
                  maxHeight: '260px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  {matchingCatalog.length > 0 ? (
                    matchingCatalog.map(p => (
                      <div 
                        key={p.id || p.sku || Math.random()}
                        onClick={() => handleSelectProduct(p)}
                        style={{
                          padding: '10px 14px',
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

            {/* MANUAL REPLACEMENT FIELDS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Replacement Item Code <span style={{ color: 'var(--text-danger)' }}>*</span>
                </label>
                <input 
                  type="text"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}
                  placeholder="e.g. 224P618-2700K"
                  value={repCode}
                  onChange={e => setRepCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Quantity
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

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Replacement Description
                </label>
                <input 
                  type="text"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px' }}
                  placeholder="e.g. 01 PENDANT - 2700K Warm White with Brass Canopy"
                  value={repDesc}
                  onChange={e => setRepDesc(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Unit Retail Price (Ex VAT) <span style={{ color: 'var(--text-danger)' }}>*</span>
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

            {/* MANDATORY PROMPT FOR REASON */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                <span>📝 Reason for Site Variation / Swap <span style={{ color: 'var(--text-danger)' }}>*</span></span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', fontWeight: 400 }}>Appears on official Client Revision Document</span>
              </label>

              {/* QUICK REASON CHIPS */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {[
                  'Client requested on-site snag walk variation',
                  'Discontinued or unavailable from supplier',
                  'Architect revised fitting specification',
                  'Cost-engineered alternative approved by PM',
                  'CCT / Kelvin output change (e.g. 2700K Warm White)'
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
            </div>

            {/* ACCOUNTING SAFEGUARD INFO NOTICE */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'flex',
              gap: '10px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              lineHeight: 1.4
            }}>
              <Info size={16} color="var(--text-info)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Accounting & ERP Safeguard:</strong> This item will not be deleted. It will be marked as <code style={{ color: 'var(--text-danger)' }}>Swapped Out</code> in the audit ledger, ensuring that Palladium credit notes allocate cleanly without breaking historical references.
              </div>
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
                disabled={loading}
                style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', cursor: loading ? 'wait' : 'pointer' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                {loading ? 'Processing Swap...' : 'Confirm Variation & Swap'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

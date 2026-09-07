import React, { useState, useEffect } from 'react';
import { 
  X, Package, Box, Tag, Zap, Compass, CheckCircle2, AlertCircle, 
  Download, Layers, FileText, Image as ImageIcon, ExternalLink, 
  ShieldCheck, RefreshCw, ChevronRight, Eye
} from 'lucide-react';
import { API_BASE } from '../../api_config';

export default function MobileProductDetailDrawer({ product, onClose }) {
  const [activeTab, setActiveTab] = useState('visuals'); // 'visuals' | 'specs' | 'commercial' | 'accessories'
  const [accessories, setAccessories] = useState([]);
  const [loadingAccessories, setLoadingAccessories] = useState(false);
  const [fullImageView, setFullImageView] = useState(null);

  if (!product) return null;

  // Format image helper
  const resolveUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const photoUrl = resolveUrl(product.image_url || product.image);
  const technicalUrl = resolveUrl(product.technical_image_url || product.cad_image || product.technical_drawing);
  const specSheetUrl = product.spec_sheet_url || product.qr_link || product.datasheet_url || product.pdf_url;

  // Attached files list
  const attachedFiles = Array.isArray(product.files) ? product.files : [];

  // Basic identification
  const sku = product.sku || 'UNKNOWN-SKU';
  const name = product.name || product.description || 'Architectural Lighting Fitting';
  const clientDesc = product.client_description || product.client_desc;
  const oneToOneCode = product.one_to_one_code || product.client_code;
  const fohCode = product.foh_code_description;
  const brand = product.brand || product.supplier_name || product.supplier?.name || 'Standard';
  const family = product.family || 'General';
  const category = product.category || 'Downlight';
  const lightingType = product.lighting_type || product.fitting_type;

  // Logistics & Stock
  const qty = Number(product.stock_level ?? product.stock_qty ?? product.stock ?? product.quantity ?? 0);
  const reorder = Number(product.reorder_level ?? product.reorderLevel ?? 0);
  const location = product.location || 'Main Warehouse (STOCK)';
  const leadTime = product.lead_time || product.leadTime || (qty > 0 ? 'In Stock / 1-3 Days' : 'Import: 4-6 Weeks');
  const origin = product.local_or_import || (brand === 'Delta Light' ? 'Import (Belgium)' : 'Standard');
  const consignment = product.consignment;
  const redList = product.red_list;
  const firstFix = product.first_fix;
  const selection = product.selection;

  // Commercial Pricing
  const retail = Number(product.retail_price ?? product.retailPrice ?? product.recommended_retail_price ?? product.retail ?? product.price ?? 0);
  const trade = Number(product.trade_price ?? product.tradePrice ?? (retail > 0 ? retail * 0.9 : 0));
  const cost = Number(product.unit_cost ?? product.unitCost ?? product.internal_cost ?? product.cost_price ?? product.cost ?? 0);
  const margin = product.margin ?? (retail > 0 && cost > 0 ? Math.round(((retail - cost) / retail) * 100) : 0);
  const markup = product.markup;

  // Technical Specifications
  const power = product.system_power ?? product.systemPower ?? product.power ?? product.wattage;
  const kelvin = product.kelvin || product.cct || product.color_temperature;
  const beam = product.beam_angle ?? product.beamAngle ?? product.beam;
  const criRaw = product.cri || product.color_rendering_index;
  const cri = criRaw ? (String(criRaw).toUpperCase().startsWith('CRI') ? criRaw : `CRI ${criRaw}`) : null;
  const ipRaw = product.ip_rating ?? product.ipRating ?? product.ip;
  const ip = ipRaw ? (String(ipRaw).toUpperCase().startsWith('IP') || String(ipRaw).toLowerCase().includes('non') ? ipRaw : `IP${ipRaw}`) : null;
  const dimmable = product.dimmable;
  const dimming = product.dimming_protocol ?? product.dimmingProtocol ?? product.dimming;
  const driverIncl = product.driver_incl ?? product.driverIncl;
  const lightSourceIncl = product.light_source_incl ?? product.lightSourceIncl;
  const lightSourceType = product.light_source_type ?? product.lightSourceType;
  const cutout = product.cutout || product.cut_out;
  const color = product.color || product.finish;

  // Driver details
  const driverLocation = product.driver_location;
  const fittingsPerDriver = product.fittings_per_driver;
  const driverConnectionType = product.driver_connection_type;
  const driverMaxCable = product.driver_max_cable;
  const driverSpec = product.driver_spec || product.driverSpec;

  // Wetworks & constraints
  const wetworks = product.wetworks;

  // Fetch accessories when drawer mounts or accessories tab is opened
  useEffect(() => {
    if (!product.id) return;
    const fetchAcc = async () => {
      setLoadingAccessories(true);
      try {
        const res = await fetch(`${API_BASE}/api/products/${product.id}/accessories`);
        if (res.ok) {
          const data = await res.json();
          setAccessories(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load product accessories:', err);
      } finally {
        setLoadingAccessories(false);
      }
    };
    fetchAcc();
  }, [product.id]);

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '94vh' }}>
        <div className="mobile-drawer-handle" />

        {/* TOP HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                {sku}
              </span>
              {oneToOneCode && (
                <span className="badge b-info" style={{ fontSize: '10px', padding: '2px 7px', fontWeight: 700, fontFamily: 'monospace' }}>
                  {oneToOneCode}
                </span>
              )}
              <span className={`badge ${qty > 0 ? 'b-success' : 'b-danger'}`} style={{ fontSize: '10px', padding: '2px 7px' }}>
                {qty > 0 ? `${qty} in Stock` : 'Out of Stock'}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {name}
            </h3>
            {clientDesc && clientDesc !== name && (
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {clientDesc}
              </div>
            )}
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {brand} • {family} • {category}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px', borderRadius: '50%', background: 'var(--bg-secondary)', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* NAVIGATION TABS (4 TABS) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '12px', gap: '2px' }}>
          {[
            { id: 'visuals', label: 'Images & Files' },
            { id: 'specs', label: 'Full Specs' },
            { id: 'commercial', label: 'Pricing & Stock' },
            { id: 'accessories', label: `Accessories (${accessories.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '8px 2px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2.5px solid var(--text-info)' : '2.5px solid transparent',
                color: activeTab === tab.id ? 'var(--text-info)' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                textAlign: 'center'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '24px' }}>
          
          {/* ========================================================
              TAB 1: VISUALS, CAD DRAWINGS & FILES
              ======================================================== */}
          {activeTab === 'visuals' && (
            <>
              {/* PRIMARY VISUAL ASSET */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                    📷 Product Visual Photo
                  </span>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setFullImageView(photoUrl)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '11px', padding: '2px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={12} /> Expand
                    </button>
                  )}
                </div>

                <div style={{
                  width: '100%',
                  height: '210px',
                  borderRadius: '10px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={name}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', cursor: 'pointer' }}
                      onClick={() => setFullImageView(photoUrl)}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                      <span style={{ fontSize: '36px', display: 'block', marginBottom: '6px', opacity: 0.6 }}>📷</span>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>No Visual Photo Attached</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Sync from master Google Sheet Column F</div>
                    </div>
                  )}
                </div>
              </div>

              {/* TECHNICAL / CAD DIMENSION DRAWING */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                    📐 Technical Dimension & CAD Drawing
                  </span>
                  {technicalUrl && (
                    <button
                      type="button"
                      onClick={() => setFullImageView(technicalUrl)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '11px', padding: '2px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={12} /> Expand
                    </button>
                  )}
                </div>

                <div style={{
                  width: '100%',
                  height: '190px',
                  borderRadius: '10px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {technicalUrl ? (
                    <img
                      src={technicalUrl}
                      alt={`${name} - Technical`}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', cursor: 'pointer' }}
                      onClick={() => setFullImageView(technicalUrl)}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)' }}>
                      <span style={{ fontSize: '32px', display: 'block', marginBottom: '6px', opacity: 0.6 }}>📐</span>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>No CAD Drawing Linked</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Sync from master Google Sheet Column G</div>
                    </div>
                  )}
                </div>
              </div>

              {/* OFFICIAL PDF DATASHEET BUTTON */}
              {specSheetUrl && (
                <a
                  href={specSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '13px'
                  }}
                >
                  <FileText size={16} />
                  <span>Open Official Spec Sheet (PDF) ↗</span>
                </a>
              )}

              {/* ATTACHED DOCUMENTS & FILES */}
              {attachedFiles.length > 0 && (
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                    Attached Product Documents ({attachedFiles.length})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {attachedFiles.map((f, i) => {
                      const fileLink = resolveUrl(f.file_path);
                      return (
                        <a
                          key={f.id || i}
                          href={fileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-secondary)',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <FileText size={15} color="var(--text-info)" style={{ flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {f.file_name || `Document-${i + 1}`}
                            </span>
                          </div>
                          <ExternalLink size={13} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================
              TAB 2: FULL TECHNICAL & OPTICAL SPECIFICATIONS
              ======================================================== */}
          {activeTab === 'specs' && (
            <>
              {/* OPTICAL METRICS */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  💡 Lighting Performance & Photometrics
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>System Power</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                      {power ? `${power} W` : '—'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Color Temp (CCT)</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                      {kelvin || '—'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Color Rendering</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                      {cri || '—'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Beam Angle</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                      {beam || '—'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Ingress Protection</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                      {ip || '—'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Lighting Type</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                      {lightingType || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* ELECTRICAL & DRIVER */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text-warning)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  ⚡ Electrical, Driver & Dimming
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Dimmable</span>
                    <strong>{dimmable || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Dimming Protocol</span>
                    <strong className={dimming ? "badge b-info" : ""} style={{ fontSize: '11px', padding: '2px 8px' }}>
                      {dimming || 'Driver Dependent'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Driver Included</span>
                    <strong>{driverIncl || 'No (Remote Driver)'}</strong>
                  </div>
                  {driverLocation && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Driver Location</span>
                      <strong>{driverLocation}</strong>
                    </div>
                  )}
                  {fittingsPerDriver && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Fittings Per Driver</span>
                      <strong>{fittingsPerDriver}</strong>
                    </div>
                  )}
                  {driverConnectionType && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Connection Type</span>
                      <strong>{driverConnectionType}</strong>
                    </div>
                  )}
                  {driverMaxCable && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Max Distance / Cable</span>
                      <strong>{driverMaxCable}</strong>
                    </div>
                  )}
                  {driverSpec && (
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Driver Notes:</span>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px', whiteSpace: 'pre-line', marginTop: '2px' }}>
                        {driverSpec}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PHYSICAL & INSTALLATION */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  📐 Dimensions & Physical Construction
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ceiling Cutout</span>
                    <strong style={{ fontFamily: 'monospace', color: 'var(--text-info)' }}>{cutout || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Finish / Color</span>
                    <strong>{color || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Light Source Included</span>
                    <strong>{lightSourceIncl || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Light Source Type</span>
                    <strong>{lightSourceType || 'LED'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>First Fix Required</span>
                    <strong>{firstFix || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* WETWORKS & INSTALLATION CONSTRAINTS */}
              {wetworks && (
                <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '12px', padding: '12px 14px' }}>
                  <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                    🌊 Wetworks & Installation Constraints
                  </span>
                  <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                    {wetworks}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================
              TAB 3: COMMERCIAL PRICING & LOGISTICS
              ======================================================== */}
          {activeTab === 'commercial' && (
            <>
              {/* PRICING CARD */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Commercial Pricing (ZAR Ex VAT)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Retail Price</span>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {retail > 0 ? `R ${Math.round(retail).toLocaleString()}` : 'Custom Quote'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Trade Price</span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-info)', marginTop: '2px' }}>
                      {trade > 0 ? `R ${Math.round(trade).toLocaleString()}` : '—'}
                    </div>
                  </div>
                  {cost > 0 && (
                    <div>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Unit Cost</span>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-warning)', marginTop: '2px' }}>
                        R {Math.round(cost).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {margin > 0 && (
                    <div>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Profit Margin</span>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-success)', marginTop: '2px' }}>
                        {margin}% {markup ? `(Markup: ${markup})` : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* INVENTORY & WAREHOUSE CARD */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Warehouse & Stock Levels
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Stock on Hand</span>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: qty > 0 ? 'var(--text-success)' : 'var(--text-danger)', marginTop: '2px' }}>
                      {qty} Units
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Warehouse Bin</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {location}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Reorder Threshold</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {reorder > 0 ? `${reorder} Units` : 'Standard'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Lead Time</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {leadTime}
                    </div>
                  </div>
                </div>
              </div>

              {/* PROCUREMENT COMPLIANCE */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Procurement Classification
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Origin</span>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>{origin}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Consignment</span>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>{consignment || 'No'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Redlist</span>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>{redList || 'No'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Selection Type</span>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>{selection || 'Standard'}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 4: LINKED ACCESSORIES & DRIVERS
              ======================================================== */}
          {activeTab === 'accessories' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loadingAccessories ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                  Loading linked accessories and drivers...
                </div>
              ) : accessories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <Box size={24} color="var(--text-tertiary)" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>No Accessories Linked</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    This fitting has no linked accessories, plaster rings, or drivers.
                  </div>
                </div>
              ) : (
                accessories.map((acc, idx) => {
                  const accSku = acc.sku || acc.item_code || `ACC-${idx + 1}`;
                  const accName = acc.name || acc.description || 'Accessory Fitting';
                  const accPrice = Number(acc.retail_price || acc.price || 0);
                  const accImg = resolveUrl(acc.image_url);

                  return (
                    <div key={acc.id || idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {accImg ? (
                        <img src={accImg} alt={accName} style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'contain', background: 'var(--bg-secondary)', border: '1px solid var(--border)', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '44px', height: '44px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-info)', flexShrink: 0 }}>
                          <Box size={20} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                          {accSku}
                        </div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                          {accName}
                        </div>
                        {accPrice > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Retail: <strong style={{ color: 'var(--text-primary)' }}>R {Math.round(accPrice).toLocaleString()}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* CLOSE BUTTON */}
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '6px', padding: '10px', fontSize: '13px', fontWeight: 600 }}
            onClick={onClose}
          >
            Close Product Details
          </button>
        </div>
      </div>

      {/* FULLSCREEN IMAGE MODAL PREVIEW */}
      {fullImageView && (
        <div 
          onClick={() => setFullImageView(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <button
            type="button"
            onClick={() => setFullImageView(null)}
            className="btn btn-ghost"
            style={{ position: 'absolute', top: '20px', right: '20px', color: '#fff', padding: '8px' }}
          >
            <X size={24} />
          </button>
          <img
            src={fullImageView}
            alt="Product Preview"
            style={{ maxHeight: '85vh', maxWidth: '95vw', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      )}
    </div>
  );
}

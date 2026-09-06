import React from 'react';
import { X, Package, Box, Tag, Zap, Compass, CheckCircle2, AlertCircle, Download, Layers } from 'lucide-react';

export default function MobileProductDetailDrawer({ product, onClose }) {
  if (!product) return null;

  const sku = product.sku || 'UNKNOWN-SKU';
  const name = product.name || product.description || 'Architectural Lighting Product';
  const brand = product.brand || product.supplier || 'Standard';
  const family = product.family || product.category || 'General';
  const qty = Number(product.stock_qty || product.stockQty || product.stock || product.quantity || 0);
  const reorder = Number(product.reorderLevel || product.reorder_level || 0);
  const location = product.location || 'Main Warehouse (STOCK)';
  const leadTime = product.leadTime || product.lead_time || 'In Stock / 1-2 Weeks';

  const retail = Number(product.retailPrice || product.retail_price || product.retail || product.price || 0);
  const trade = Number(product.tradePrice || product.trade_price || 0);
  const cost = Number(product.unitCost || product.cost_price || product.cost || 0);
  const margin = product.margin || (retail > 0 && cost > 0 ? Math.round(((retail - cost) / retail) * 100) : 0);

  const power = product.systemPower || product.system_power || product.power || product.wattage;
  const kelvin = product.kelvin || product.cct || product.color_temperature;
  const beam = product.beamAngle || product.beam_angle || product.beam;
  const cri = product.cri || product.color_rendering_index;
  const ip = product.ipRating || product.ip_rating || product.ip;
  const dimming = product.dimmingProtocol || product.dimming || product.protocol;
  const cutout = product.cutout || product.cut_out;
  const driver = product.driverSpec || product.driver_spec || (product.driverIncl ? 'Driver Included' : 'Remote / External Driver');
  const lightSource = product.lightSourceType || product.light_source_type || 'LED';
  const accessories = Array.isArray(product.accessories) ? product.accessories : [];

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="mobile-drawer-handle" />

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                {sku}
              </span>
              <span className={`badge ${qty > 0 ? 'b-success' : 'b-danger'}`} style={{ fontSize: '10px' }}>
                {qty > 0 ? `${qty} in Stock` : 'Out of Stock'}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {name}
            </h3>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {brand} {family ? `• Family: ${family}` : ''}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', paddingBottom: '20px' }}>
          
          {/* IMAGE OR ICON PREVIEW */}
          {(product.image || product.image_url) ? (
            <div style={{ width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={product.image || product.image_url} alt={name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--text-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Box size={22} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Architectural Specification</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Professional lighting fitting with technical photometrics.</div>
              </div>
            </div>
          )}

          {/* STOCK & WAREHOUSE LOGISTICS CARD */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Inventory & Logistics
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '8px' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Location</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {location}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Lead Time</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {leadTime}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Stock on Hand</span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: qty > 0 ? 'var(--text-success)' : 'var(--text-danger)', marginTop: '1px' }}>
                  {qty} Units
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Reorder Threshold</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {reorder > 0 ? `${reorder} Units` : 'Standard'}
                </div>
              </div>
            </div>
          </div>

          {/* PRICING & FINANCIALS CARD */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Commercial Pricing (ZAR Ex VAT)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '8px' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Retail Price</span>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {retail > 0 ? `R ${Math.round(retail).toLocaleString()}` : 'Custom'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Trade Price</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-info)', marginTop: '1px' }}>
                  {trade > 0 ? `R ${Math.round(trade).toLocaleString()}` : (retail > 0 ? `R ${Math.round(retail * 0.9).toLocaleString()}` : '—')}
                </div>
              </div>
              {cost > 0 && (
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Unit Cost</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-warning)', marginTop: '1px' }}>
                    R {Math.round(cost).toLocaleString()}
                  </div>
                </div>
              )}
              {margin > 0 && (
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Target Margin</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-success)', marginTop: '1px' }}>
                    {margin}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TECHNICAL SPECIFICATIONS GRID */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Technical & Electrical Specifications
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '8px' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>System Power</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {power ? `${power}W` : 'Standard'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Color Temp (CCT)</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {kelvin || '2700K / 3000K'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Beam Angle</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {beam || '30° Medium'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>CRI Rating</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {cri ? `CRI ${cri}` : 'CRI 90+'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>IP Protection</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {ip || 'IP20'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Ceiling Cutout</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {cutout || '—'}
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Dimming & Protocol</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {dimming || 'Driver Dependent / DALI / Phase'}
                </div>
              </div>
              {driver && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Driver Specification</span>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px', whiteSpace: 'pre-line', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px' }}>
                    {driver}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ACCESSORIES */}
          {accessories.length > 0 && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Included & Compatible Accessories ({accessories.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {accessories.map((acc, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', fontSize: '11.5px' }}>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-info)' }}>{acc.code || acc.sku || `ACC-${i+1}`}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{acc.desc || acc.name || 'Accessory'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATASHEET LINK */}
          {(product.datasheet_url || product.pdf_url) && (
            <a
              href={product.datasheet_url || product.pdf_url}
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
              <Download size={16} />
              <span>Download Product Datasheet PDF</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

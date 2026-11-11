import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Percent, 
  Check, 
  Calculator, 
  Layers, 
  Sliders, 
  Globe2, 
  UserCheck, 
  HelpCircle,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { API_BASE } from '../../api_config';

export default function RateCardSettings() {
  const DEFAULT_COSTING_MATRIX = {
    currency_rates: { usdConv: 20.00 },
    phase_multipliers: { schematicPercent: 0.80, finalPercent: 0.65, siteSupportPercent: 0.2272, commissioningPercent: 0.1070 },
    area_rates: {
      experiential_living: { archFitting: 1050.00, conceptLighting: 180.00 },
      secondary_living: { archFitting: 750.00, conceptLighting: 105.00 },
      non_experiential_living: { archFitting: 300.00, conceptLighting: 30.00 },
      experiential_landscape: { archFitting: 825.00, conceptLighting: 140.00 },
      secondary_landscape: { archFitting: 525.00, conceptLighting: 55.00 }
    },
    default_discounts: { designDiscountRate: 0.20, archDiscountRate: 0.04 },
    signature_consultant_flat: { siteSupport: 4000.00, commissioning: 4000.00 }
  };

  const [costingRates, setCostingRates] = useState(DEFAULT_COSTING_MATRIX);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/configs/DESIGN_FEE_RATES`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.config_json && Object.keys(data.config_json).length > 0) {
          setCostingRates(data.config_json);
        }
      })
      .catch(err => console.error("Error fetching rate card:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (window.otoConfirm) {
      const confirmed = await window.otoConfirm(
        "Save master fee calculation rates and phase multipliers? New project fee proposals will immediately reflect these rates.",
        { title: "Save Rate Card Changes?", isDanger: false, confirmText: "Save Changes" }
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/configs/DESIGN_FEE_RATES`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(costingRates)
      });
      if (res.ok) {
        if (window.otoToast) {
          window.otoToast('Design Fee Costings Rate Card saved successfully!', 'success');
        } else {
          alert('Design Fee Costings Rate Card saved successfully!');
        }
      } else {
        if (window.otoToast) {
          window.otoToast('Failed to save rate card.', 'error');
        } else {
          alert('Failed to save rate card.');
        }
      }
    } catch (err) {
      if (window.otoToast) {
        window.otoToast('Error saving rate card.', 'error');
      } else {
        alert('Error saving rate card.');
      }
    } finally {
      setSaving(false);
    }
  };

  const areaRows = [
    { key: 'experiential_living', label: 'Experiential Living', desc: 'Primary living areas, master suites & main reception' },
    { key: 'secondary_living', label: 'Secondary Living', desc: 'Guest bedrooms, corridors, auxiliary indoor zones' },
    { key: 'non_experiential_living', label: 'Non-Experiential Living', desc: 'Garages, plant rooms, storage & service areas' },
    { key: 'experiential_landscape', label: 'Experiential Landscape', desc: 'Feature courtyards, pool pavilions & architectural terraces' },
    { key: 'secondary_landscape', label: 'Secondary Landscape', desc: 'Perimeter grounds, pathways & perimeter security lighting' }
  ];

  const multipliers = costingRates.phase_multipliers || {};

  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', maxWidth: '100%' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
              Commercial Architecture Engine
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Rate Cards & Target Margins
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Master base rates per square meter (R/m²), automated phase multipliers, and consultant fee baselines for project fee proposals.
          </p>
        </div>

        <button 
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '9px 20px', 
            fontSize: '13px', 
            fontWeight: 600,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '7px',
            cursor: saving || loading ? 'not-allowed' : 'pointer',
            opacity: saving || loading ? 0.7 : 1,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <Check size={16} /> {saving ? 'Saving Changes...' : 'Save Rate Card'}
        </button>
      </div>

      {/* Phase Multipliers Control Bar */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} color="#64748b" /> Master Phase Multipliers
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Percentages applied directly across Concept Lighting Design rates to dynamically derive subsequent phase rates and subtotal allocations.
            </p>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            Auto-Derived Formulas
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
          {/* Schematic */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Schematic Design (SD)</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>of Concept</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="number"
                step="1"
                min="0"
                max="200"
                value={Math.round((multipliers.schematicPercent * 100) || 80)}
                onChange={e => setCostingRates({
                  ...costingRates,
                  phase_multipliers: { ...multipliers, schematicPercent: (parseFloat(e.target.value) || 0) / 100 }
                })}
                style={{
                  width: '72px',
                  height: '32px',
                  padding: '4px 10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  textAlign: 'right'
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>%</span>
            </div>
          </div>

          {/* Final Design */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Final Design (FD)</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>of Concept</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="number"
                step="1"
                min="0"
                max="200"
                value={Math.round((multipliers.finalPercent * 100) || 65)}
                onChange={e => setCostingRates({
                  ...costingRates,
                  phase_multipliers: { ...multipliers, finalPercent: (parseFloat(e.target.value) || 0) / 100 }
                })}
                style={{
                  width: '72px',
                  height: '32px',
                  padding: '4px 10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  textAlign: 'right'
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>%</span>
            </div>
          </div>

          {/* Site Support */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Site Support Allocation</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>of Subtotal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={((multipliers.siteSupportPercent || 0.2272) * 100).toFixed(2)}
                onChange={e => setCostingRates({
                  ...costingRates,
                  phase_multipliers: { ...multipliers, siteSupportPercent: (parseFloat(e.target.value) || 0) / 100 }
                })}
                style={{
                  width: '84px',
                  height: '32px',
                  padding: '4px 10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  textAlign: 'right'
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>%</span>
            </div>
          </div>

          {/* Commissioning */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Commissioning Allocation</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>of Subtotal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={((multipliers.commissioningPercent || 0.1070) * 100).toFixed(2)}
                onChange={e => setCostingRates({
                  ...costingRates,
                  phase_multipliers: { ...multipliers, commissioningPercent: (parseFloat(e.target.value) || 0) / 100 }
                })}
                style={{
                  width: '84px',
                  height: '32px',
                  padding: '4px 10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  textAlign: 'right'
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table: Meterage & Architectural Base Rates */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={17} color="#64748b" /> Meterage & Phase Costing Rates (Excl. VAT)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Input base budget rates per square meter for fittings and design. Phase amounts on the right are computed live from your multipliers.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Area Classification</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: '170px' }}>Arch. Fitting (R/m²)</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, width: '170px' }}>Concept Design (R/m²)</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Schematic Dev.</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Final Design</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Site Support</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Commissioning</th>
              </tr>
            </thead>
            <tbody>
              {areaRows.map((row, idx) => {
                const concept = costingRates.area_rates?.[row.key]?.conceptLighting || 0;
                const schematic = concept * (multipliers.schematicPercent || 0.8);
                const finalD = concept * (multipliers.finalPercent || 0.65);
                const sitePct = ((multipliers.siteSupportPercent || 0.2272) * 100).toFixed(2);
                const commPct = ((multipliers.commissioningPercent || 0.1070) * 100).toFixed(2);

                return (
                  <tr 
                    key={row.key} 
                    style={{ 
                      borderBottom: idx < areaRows.length - 1 ? '1px solid #f1f5f9' : 'none',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{row.desc}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '10px', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>R</span>
                        <input 
                          type="number"
                          step="1"
                          style={{
                            width: '100%',
                            height: '34px',
                            padding: '4px 8px 4px 26px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#0f172a',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            outline: 'none'
                          }}
                          value={costingRates.area_rates?.[row.key]?.archFitting || 0}
                          onChange={e => setCostingRates({
                            ...costingRates,
                            area_rates: {
                              ...(costingRates.area_rates || {}),
                              [row.key]: {
                                ...(costingRates.area_rates?.[row.key] || {}),
                                archFitting: parseFloat(e.target.value) || 0
                              }
                            }
                          })}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '10px', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>R</span>
                        <input 
                          type="number"
                          step="1"
                          style={{
                            width: '100%',
                            height: '34px',
                            padding: '4px 8px 4px 26px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#0f172a',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            outline: 'none'
                          }}
                          value={costingRates.area_rates?.[row.key]?.conceptLighting || 0}
                          onChange={e => setCostingRates({
                            ...costingRates,
                            area_rates: {
                              ...(costingRates.area_rates || {}),
                              [row.key]: {
                                ...(costingRates.area_rates?.[row.key] || {}),
                                conceptLighting: parseFloat(e.target.value) || 0
                              }
                            }
                          })}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                      R {schematic.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                      R {finalD.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#64748b', fontSize: '11.5px' }}>
                      <span style={{ padding: '3px 8px', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 500 }}>
                        {sitePct}% of Subtotal
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#64748b', fontSize: '11.5px' }}>
                      <span style={{ padding: '3px 8px', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 500 }}>
                        {commPct}% of Subtotal
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row: Currency & Global Flat Consultant Fees */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Currency Conversion Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe2 size={16} color="#64748b" /> Currency Conversion Engine
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
            Standard baseline exchange rate applied when quoting international architectural packages in USD.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              USD Conversion Rate (ZAR / USD)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', width: '150px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>R</span>
                <input 
                  type="number"
                  step="0.1"
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 8px 4px 26px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                  value={costingRates.currency_rates?.usdConv || 20.00}
                  onChange={e => setCostingRates({
                    ...costingRates,
                    currency_rates: { ...costingRates.currency_rates, usdConv: parseFloat(e.target.value) || 20.00 }
                  })}
                />
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>per $1.00 USD</span>
            </div>
          </div>
        </div>

        {/* Signature Consultant Flat Fees */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={16} color="#64748b" /> Signature Consultant Flat Engagements
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
            Standard flat retainers for executive on-site coordination and handover commissioning.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Site Support Flat (R)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>R</span>
                <input 
                  type="number"
                  step="100"
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 8px 4px 26px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                  value={costingRates.signature_consultant_flat?.siteSupport || 4000}
                  onChange={e => setCostingRates({
                    ...costingRates,
                    signature_consultant_flat: { ...costingRates.signature_consultant_flat, siteSupport: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Commissioning Flat (R)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>R</span>
                <input 
                  type="number"
                  step="100"
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 8px 4px 26px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                  value={costingRates.signature_consultant_flat?.commissioning || 4000}
                  onChange={e => setCostingRates({
                    ...costingRates,
                    signature_consultant_flat: { ...costingRates.signature_consultant_flat, commissioning: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

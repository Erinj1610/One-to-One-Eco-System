import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api_config';

function buildTokens({
  sigConsult, conceptDesign, schematicDesign, finalDesign,
  archFittings, siteSupport, commissioning,
  livingArea, landscapeArea,
  sqExpLiving, sqSecLiving, sqNonExpLiving, sqExpLand, sqSecLand,
  ConceptCost, SchematicCost, FinalCost,
  rawDesignSubtotal, unifiedDiscountValue, designNet,
  depositValue, archSubtotalRaw, siteSupportCost, commissioningCost,
  absoluteProjectBudget, usdConv,
}) {
  const fmt = (v) => v > 0 ? `R ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
  const fmtUSD = (v) => `$ ${(v / usdConv).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const today = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  const proposalNum = `DFP-${Date.now().toString().slice(-6)}`;

  return {
    PROJECT_NAME: 'Project Name',
    CLIENT_NAME: 'Client Name',
    DATE: today,
    PROPOSAL_NUMBER: proposalNum,
    LIVING_AREA: livingArea.toString(),
    LANDSCAPE_AREA: landscapeArea.toString(),
    EXP_LIVING_SQM: sqExpLiving.toFixed(1),
    SEC_LIVING_SQM: sqSecLiving.toFixed(1),
    NONEXP_LIVING_SQM: sqNonExpLiving.toFixed(1),
    EXP_LAND_SQM: sqExpLand.toFixed(1),
    SEC_LAND_SQM: sqSecLand.toFixed(1),
    CONCEPT_COST: fmt(ConceptCost),
    SCHEMATIC_COST: fmt(SchematicCost),
    FINAL_COST: fmt(FinalCost),
    DISCOUNT_AMOUNT: fmt(unifiedDiscountValue),
    DESIGN_NET: fmt(designNet),
    DEPOSIT_REQUIRED: fmt(depositValue),
    ARCH_COST: fmt(archSubtotalRaw),
    SITE_SUPPORT_COST: fmt(siteSupportCost),
    COMMISSIONING_COST: fmt(commissioningCost),
    GRAND_TOTAL: fmt(absoluteProjectBudget),
    GRAND_TOTAL_USD: fmtUSD(absoluteProjectBudget),
    USD_RATE: usdConv.toFixed(2),
  };
}

// ─── MODAL COMPONENT ──────────────────────────────────────────────────────────
function PreviewModal({ url, onClose }) {
  if (!url) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    // Force the browser to treat this as a download with a .pdf extension
    a.setAttribute('download', `Proposal_${new Date().toISOString().split('T')[0]}.pdf`);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '2rem', animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        width: '100%', maxWidth: '1000px', height: '90vh',
        background: 'var(--panel-bg)', borderRadius: '16px',
        border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📄 Proposal Preview</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleDownload} className="glow-btn" style={{ margin: 0, padding: '0.4rem 1rem', background: '#10b981', border: 'none', fontSize: '0.85rem' }}>
              📥 Download PDF
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.42rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
              Close
            </button>
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative', background: '#333' }}>
           <iframe src={url} style={{ width: '100%', height: '100%', border: 'none' }} title="Proposal Preview" />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function DesignFeeBuilder({ isLocked, updateFee }) {
  // --- Section 1: Scope & Meterage ---
  const [livingArea, setLivingArea] = useState(995);
  const [landscapeArea, setLandscapeArea] = useState(0);
  
  const [expLiving, setExpLiving] = useState(30);
  const [secLiving, setSecLiving] = useState(60);
  const nonExpLiving = Math.max(0, 100 - expLiving - secLiving);

  const [expLand, setExpLand] = useState(0); 
  const secLand = Math.max(0, 100 - expLand);

  // --- Proposal Toggles ---
  const [sigConsult, setSigConsult] = useState(false);
  const [conceptDesign, setConceptDesign] = useState(true);
  const [schematicDesign, setSchematicDesign] = useState(true);
  const [finalDesign, setFinalDesign] = useState(true); 
  const [archFittings, setArchFittings] = useState(true);
  const [siteSupport, setSiteSupport] = useState(true);
  const [siteSupportQty, setSiteSupportQty] = useState(1);
  const [commissioning, setCommissioning] = useState(true);
  const [commissioningQty, setCommissioningQty] = useState(1);
  
  const usdConv = 20.00;
  const designDiscountRate = 0.20; 
  const archDiscountRate = 0.04;

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // --- Handlers ---
  const handleSigConsultChange = (checked) => {
    setSigConsult(checked);
    if (checked) setArchFittings(false);
  };
  const handleStandardToggle = () => { if (sigConsult) setSigConsult(false); };

  // --- CALCULATIONS ---
  const sqExpLiving = livingArea * (expLiving / 100);
  const sqSecLiving = livingArea * (secLiving / 100);
  const sqNonExpLiving = livingArea * (nonExpLiving / 100);
  const sqExpLand = landscapeArea * (expLand / 100);
  const sqSecLand = landscapeArea * (secLand / 100);

  const conceptTotalRaw = 
      (sqExpLiving * 207.00) + (sqSecLiving * 120.75) +
      (sqNonExpLiving * 34.50) + (sqExpLand * 161.00) + (sqSecLand * 63.25);

  let ConceptCost = 0, SchematicCost = 0, FinalCost = 0;
  if (sigConsult) {
      ConceptCost = conceptTotalRaw;
  } else {
      ConceptCost = conceptDesign ? conceptTotalRaw : 0;
      SchematicCost = schematicDesign ? (conceptTotalRaw * 0.80) : 0; 
      FinalCost = finalDesign ? (conceptTotalRaw * 0.65) : 0;         
  }

  const rawDesignSubtotal = ConceptCost + SchematicCost + FinalCost;

  let siteSupportCost = siteSupport
    ? (sigConsult ? 4000 * siteSupportQty : rawDesignSubtotal * 0.2272 * siteSupportQty)
    : 0;
  let commissioningCost = commissioning
    ? (sigConsult ? 4000 * commissioningQty : rawDesignSubtotal * 0.1070 * commissioningQty)
    : 0;

  const archSubtotalRaw = archFittings ? (
      (sqExpLiving * 1050) + (sqSecLiving * 750) + (sqNonExpLiving * 300) +
      (sqExpLand * 825) + (sqSecLand * 525)
  ) : 0;

  let unifiedDiscountValue = 0;
  if (!sigConsult && archFittings) {
      unifiedDiscountValue = (rawDesignSubtotal * designDiscountRate) + (archSubtotalRaw * archDiscountRate);
  }

  const designNet = rawDesignSubtotal - unifiedDiscountValue;
  const depositValue = ConceptCost;
  const absoluteProjectBudget = designNet + archSubtotalRaw + siteSupportCost + commissioningCost;

  const formatZAR = (val) => `R${val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  const formatUSD = (val) => `$${(val / usdConv).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  // --- PREVIEW GENERATOR (GOOGLE DOCS BRIDGE) ---
  const handlePreview = async () => {
    setLoadingPreview(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

    try {
      const tokens = buildTokens({
        sigConsult, conceptDesign, schematicDesign, finalDesign,
        archFittings, siteSupport, commissioning,
        livingArea, landscapeArea,
        sqExpLiving, sqSecLiving, sqNonExpLiving, sqExpLand, sqSecLand,
        ConceptCost, SchematicCost, FinalCost,
        rawDesignSubtotal, unifiedDiscountValue, designNet,
        depositValue, archSubtotalRaw, siteSupportCost, commissioningCost,
        absoluteProjectBudget, usdConv,
      });

      // --- NATIVE GOOGLE DOCS GENERATION ---
      const res = await fetch(`${API_BASE}/admin/generate/DESIGN_FEE_PROPOSAL`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Server Error' }));
        throw new Error(err.detail || 'The Google Docs service responded with an empty error. Please check your Hub settings and API permissions.');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      
    } catch (e) {
      console.error(e);
      const msg = e.name === 'AbortError' 
        ? 'Generation timed out. This usually happens on Windows when Google Auth discovery hangs. Please paste your Service Account JSON in the Branding Hub.'
        : `Error generating PDF: ${e.message}`;
      alert(msg);
    }
    setLoadingPreview(false);
  };

  const OutputRow = ({ label, value, isNegative, isHeader, isTotal, color, smallLabel }) => (
    <div style={{ 
        display: 'flex', justifyContent: 'space-between', 
        marginBottom: isTotal ? '0' : '0.4rem', 
        fontSize: isTotal ? '1.2rem' : '0.85rem',
        fontWeight: isHeader || isTotal ? 'bold' : 'normal',
        color: color || (isTotal ? '#10b981' : (isNegative ? '#f87171' : 'var(--text-secondary)')),
        paddingTop: isTotal ? '0.5rem' : '0',
        marginTop: isTotal ? '0.5rem' : '0',
    }}>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span>{label}</span>
        {smallLabel && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>{smallLabel}</span>}
      </span>
      <span>{isNegative && value > 0 ? '-' : ''}{formatZAR(Math.abs(value))}</span>
    </div>
  );

  return (
    <>
      <div className="stat-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-purple)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>💰 1. Master Design Fee Builder</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1.2fr) minmax(350px, 1fr)', gap: '2rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Site Setup */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>Site Setup (Meterage)</h4>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Living Area (m²)</label>
                  <input type="number" value={livingArea} onChange={e => setLivingArea(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Landscape Area (m²)</label>
                  <input type="number" value={landscapeArea} onChange={e => setLandscapeArea(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white' }} />
                </div>
              </div>

              <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Living Parameters</h5>
              <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '60px' }}>Exp {expLiving}%</span>
                <input type="range" min="0" max="100" value={expLiving} onChange={e => setExpLiving(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-blue)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '40px', textAlign: 'right' }}>{sqExpLiving.toFixed(0)}m²</span>
              </div>
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '60px' }}>Sec {secLiving}%</span>
                <input type="range" min="0" max="100" value={secLiving} onChange={e => setSecLiving(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-purple)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '40px', textAlign: 'right' }}>{sqSecLiving.toFixed(0)}m²</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '-1rem', paddingBottom: '1rem' }}>
                Non-Experiential: {nonExpLiving}% ({sqNonExpLiving.toFixed(0)}m²)
              </div>

              <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Landscape Parameters</h5>
              <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '60px' }}>Exp {expLand}%</span>
                <input type="range" min="0" max="100" value={expLand} onChange={e => setExpLand(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent-blue)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '40px', textAlign: 'right' }}>{sqExpLand.toFixed(0)}m²</span>
              </div>
            </div>

            {/* Proposal Selection */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>Proposal Selection</h4>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', background: sigConsult ? 'rgba(59, 130, 246, 0.1)' : 'transparent', borderRadius: '8px' }}>
                  <input type="checkbox" checked={sigConsult} onChange={e => handleSigConsultChange(e.target.checked)} />
                  <div style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: sigConsult ? 'bold' : 'normal', color: sigConsult ? 'var(--accent-blue)' : 'var(--text-primary)' }}>Signature Consult</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Standalone design consult, no hardware supply.</span>
                  </div>
                </label>
              </div>

              {!sigConsult && (
                <div style={{ marginBottom: '1.5rem', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                  <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>Standard Design Options</h5>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={conceptDesign} onChange={e => { setConceptDesign(e.target.checked); handleStandardToggle(); }} />
                    <span style={{ fontSize: '0.85rem' }}>Concept Lighting Design</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={schematicDesign} onChange={e => { setSchematicDesign(e.target.checked); handleStandardToggle(); }} />
                    <span style={{ fontSize: '0.85rem' }}>Schematic Design Development</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={finalDesign} onChange={e => { setFinalDesign(e.target.checked); handleStandardToggle(); }} />
                    <span style={{ fontSize: '0.85rem' }}>Final Design</span>
                  </label>
                </div>
              )}

              <div>
                <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>Extras & Services</h5>

                {!sigConsult && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={archFittings} onChange={e => { setArchFittings(e.target.checked); handleStandardToggle(); }} />
                    <span style={{ fontSize: '0.85rem', color: archFittings ? '#10b981' : 'var(--text-primary)' }}>Architectural Fittings (Enables Combined Supply Discount)</span>
                  </label>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}>
                    <input type="checkbox" checked={siteSupport} onChange={e => setSiteSupport(e.target.checked)} />
                    <span style={{ fontSize: '0.85rem' }}>Site Support</span>
                  </label>
                  {siteSupport && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Qty:</span>
                      <input type="number" min="1" value={siteSupportQty} onChange={e => setSiteSupportQty(Number(e.target.value))} style={{ width: '45px', padding: '0.1rem', borderRadius: '4px', background: 'transparent', border: '1px solid var(--panel-border)', color: 'white', fontSize: '0.8rem', textAlign: 'center' }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}>
                    <input type="checkbox" checked={commissioning} onChange={e => setCommissioning(e.target.checked)} />
                    <span style={{ fontSize: '0.85rem' }}>Commissioning Cap</span>
                  </label>
                  {commissioning && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Qty:</span>
                      <input type="number" min="1" value={commissioningQty} onChange={e => setCommissioningQty(Number(e.target.value))} style={{ width: '45px', padding: '0.1rem', borderRadius: '4px', background: 'transparent', border: '1px solid var(--panel-border)', color: 'white', fontSize: '0.8rem', textAlign: 'center' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Official Output */}
          <div style={{ position: 'sticky', top: '2rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--accent-blue)', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ marginBottom: '1.5rem', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Official Proposal Output</h4>
            
            {sigConsult
              ? <OutputRow label="Signature Consult (Concept Value)" value={ConceptCost} />
              : <>
                  <OutputRow label="Concept Lighting Design" value={ConceptCost} />
                  {schematicDesign && <OutputRow label="Schematic Design" value={SchematicCost} />}
                  {finalDesign && <OutputRow label="Final Design" value={FinalCost} />}
                </>
            }

            <div style={{ margin: '1rem 0', borderBottom: '1px dashed rgba(255,255,255,0.1)' }} />

            <OutputRow label="Design Total" value={rawDesignSubtotal} isHeader color="white" />

            {unifiedDiscountValue > 0 && !sigConsult && (
              <OutputRow label="Combined Supply Discount" value={unifiedDiscountValue} isNegative smallLabel="Applied to design phases & fittings only" />
            )}

            <div style={{ margin: '1rem 0', borderBottom: '1px solid rgba(16, 185, 129, 0.3)' }} />

            <OutputRow label="Total For Design" value={designNet} isTotal />

            <div style={{ marginTop: '0.8rem', padding: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '6px', border: '1px dashed var(--accent-blue)' }}>
              <OutputRow label="Deposit Required" value={depositValue} color="var(--accent-blue)" smallLabel="Equivalent to Concept Lighting base value" />
            </div>

            {!sigConsult && archSubtotalRaw > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: '#e5e7eb', marginBottom: '0.8rem' }}>Architectural Fittings Estimate</span>
                <OutputRow label="Total Fittings Budget" value={archSubtotalRaw} isHeader color="#e5e7eb" />
              </div>
            )}

            {(siteSupportCost > 0 || commissioningCost > 0) && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                {siteSupportCost > 0 && <OutputRow label="Site Support" value={siteSupportCost} />}
                {commissioningCost > 0 && <OutputRow label="Commissioning Cap" value={commissioningCost} />}
              </div>
            )}

            <div style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--accent-blue)' }}>
              <span style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem' }}>GRAND TOTAL</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 'bold', color: 'white', fontSize: '1.2rem', display: 'block' }}>{formatZAR(absoluteProjectBudget)}</span>
                <span style={{ color: 'var(--accent-blue)', fontSize: '0.8rem' }}>{formatUSD(absoluteProjectBudget)} USD</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="glow-btn"
                style={{ width: '100%', margin: 0, opacity: loadingPreview ? 0.7 : 1 }}
                onClick={handlePreview}
                disabled={loadingPreview}
              >
                {loadingPreview ? '⏳ Generating PDF...' : '📄 Preview & Print Proposal'}
              </button>
              <button
                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                onClick={() => {}}
              >
                💾 Save to Database
              </button>
            </div>
          </div>

        </div>
      </div>
      
      {/* Internal Preview Modal */}
      <PreviewModal 
        url={previewUrl} 
        onClose={() => {
          URL.revokeObjectURL(previewUrl); 
          setPreviewUrl(null);
        }} 
      />
    </>
  );
}

export default DesignFeeBuilder;

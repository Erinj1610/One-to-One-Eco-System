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
function DesignFeeBuilder({ isLocked, updateFee, initialLivingArea = 995, initialLandscapeArea = 0, projectId, initialRatesSnapshot }) {
  // --- Section 1: Scope & Meterage ---
  const [livingArea, setLivingArea] = useState(initialLivingArea);
  const [landscapeArea, setLandscapeArea] = useState(initialLandscapeArea);

  const DEFAULT_RATES = {
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

  const [activeRates, setActiveRates] = useState(initialRatesSnapshot || DEFAULT_RATES);
  const [rateActionMessage, setRateActionMessage] = useState(null);
  const [loadingRatesAction, setLoadingRatesAction] = useState(false);

  useEffect(() => {
    if (initialRatesSnapshot) {
      setActiveRates(initialRatesSnapshot);
    }
  }, [initialRatesSnapshot]);

  const handleResyncRates = async () => {
    if (!projectId) return;
    setLoadingRatesAction(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/resync-design-rates`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActiveRates(data.rates);
        setRateActionMessage("Resynced to latest global Settings rates!");
        setTimeout(() => setRateActionMessage(null), 3000);
      }
    } catch (err) {
      alert("Failed to resync rates");
    } finally {
      setLoadingRatesAction(false);
    }
  };

  const handleRevertRates = async () => {
    if (!projectId) return;
    setLoadingRatesAction(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/revert-design-rates`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActiveRates(data.rates);
        setRateActionMessage("Reverted to project creation rates!");
        setTimeout(() => setRateActionMessage(null), 3000);
      }
    } catch (err) {
      alert("Failed to revert rates");
    } finally {
      setLoadingRatesAction(false);
    }
  };
  
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
  
  const usdConv = activeRates.currency_rates?.usdConv || 20.00;
  const designDiscountRate = activeRates.default_discounts?.designDiscountRate || 0.20; 
  const archDiscountRate = activeRates.default_discounts?.archDiscountRate || 0.04;

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

  const areaRates = activeRates.area_rates || DEFAULT_RATES.area_rates;

  // Note: concept lighting rates in sheet are Excl. VAT (e.g. 180). Multiply by 1.15 for ZAR Incl. VAT rate (207)
  const rExpLiving = (areaRates.experiential_living?.conceptLighting || 180.00) * 1.15;
  const rSecLiving = (areaRates.secondary_living?.conceptLighting || 105.00) * 1.15;
  const rNonExpLiving = (areaRates.non_experiential_living?.conceptLighting || 30.00) * 1.15;
  const rExpLand = (areaRates.experiential_landscape?.conceptLighting || 140.00) * 1.15;
  const rSecLand = (areaRates.secondary_landscape?.conceptLighting || 55.00) * 1.15;

  const conceptTotalRaw = 
      (sqExpLiving * rExpLiving) + (sqSecLiving * rSecLiving) +
      (sqNonExpLiving * rNonExpLiving) + (sqExpLand * rExpLand) + (sqSecLand * rSecLand);

  const schematicMult = activeRates.phase_multipliers?.schematicPercent || 0.80;
  const finalMult = activeRates.phase_multipliers?.finalPercent || 0.65;
  const siteSupportMult = activeRates.phase_multipliers?.siteSupportPercent || 0.2272;
  const commissioningMult = activeRates.phase_multipliers?.commissioningPercent || 0.1070;

  const sigSiteFlat = activeRates.signature_consultant_flat?.siteSupport || 4000;
  const sigCommFlat = activeRates.signature_consultant_flat?.commissioning || 4000;

  let ConceptCost = 0, SchematicCost = 0, FinalCost = 0;
  if (sigConsult) {
      ConceptCost = conceptTotalRaw;
  } else {
      ConceptCost = conceptDesign ? conceptTotalRaw : 0;
      SchematicCost = schematicDesign ? (conceptTotalRaw * schematicMult) : 0; 
      FinalCost = finalDesign ? (conceptTotalRaw * finalMult) : 0;         
  }

  const rawDesignSubtotal = ConceptCost + SchematicCost + FinalCost;

  let siteSupportCost = siteSupport
    ? (sigConsult ? sigSiteFlat * siteSupportQty : rawDesignSubtotal * siteSupportMult * siteSupportQty)
    : 0;
  let commissioningCost = commissioning
    ? (sigConsult ? sigCommFlat * commissioningQty : rawDesignSubtotal * commissioningMult * commissioningQty)
    : 0;

  const archExpLiving = areaRates.experiential_living?.archFitting || 1050;
  const archSecLiving = areaRates.secondary_living?.archFitting || 750;
  const archNonExpLiving = areaRates.non_experiential_living?.archFitting || 300;
  const archExpLand = areaRates.experiential_landscape?.archFitting || 825;
  const archSecLand = areaRates.secondary_landscape?.archFitting || 525;

  const archSubtotalRaw = archFittings ? (
      (sqExpLiving * archExpLiving) + (sqSecLiving * archSecLiving) + (sqNonExpLiving * archNonExpLiving) +
      (sqExpLand * archExpLand) + (sqSecLand * archSecLand)
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

  const [projectName, setProjectName] = useState('Waterfall Estate');
  const [quoteBy, setQuoteBy] = useState('Thando Khumalo');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [billingDetails, setBillingDetails] = useState('');

  const [proposalType, setProposalType] = useState('Signature');
  const [sigDepositPercent, setSigDepositPercent] = useState(50);
  const [designIncreasePercent, setDesignIncreasePercent] = useState(0);
  const [productIncreasePercent, setProductIncreasePercent] = useState(0);
  const [sigConsultDiscount, setSigConsultDiscount] = useState(50);
  const [sigConsultExtra, setSigConsultExtra] = useState(0);

  const inputModernStyle = {
    background: '#FAF9F6',
    color: '#1a1a1a',
    fontWeight: '600',
    border: '1.5px solid #d1d5db',
    borderRadius: '8px',
    padding: '0.55rem 0.85rem',
    fontSize: '0.85rem',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none'
  };

  return (
    <>
      <div style={{ background: '#FAF9F6', borderRadius: '16px', border: '1px solid #e0ddd5', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e0ddd5', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, color: '#111827', fontSize: '1.1rem', fontWeight: 800 }}>Master Design Fee Calculator</h3>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 600 }}>
                Scope & Rates locked to project snapshot
              </span>
              {rateActionMessage && (
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  {rateActionMessage}
                </span>
              )}
            </div>
          </div>

          {projectId && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handleResyncRates} 
                disabled={loadingRatesAction}
                className="btn btn-ghost" 
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', border: '1px solid #d1d5db', background: '#ffffff', color: '#374151' }}
                title="Update this project's rates to match the latest global Settings rates"
              >
                Re-apply Latest Rates
              </button>
              <button 
                onClick={handleRevertRates} 
                disabled={loadingRatesAction}
                className="btn btn-ghost" 
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', border: '1px solid #d1d5db', background: '#ffffff', color: '#374151' }}
                title="Restore this project's rates back to its initial creation rates"
              >
                Revert to Original Rates
              </button>
            </div>
          )}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1.2fr) minmax(350px, 1fr)', gap: '2rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: 4 Step-by-Step Clean Light Input Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* STEP 1: Project & Client Details */}
            <div style={{ 
              background: '#ffffff', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ background: '#2563eb', color: 'white', fontWeight: 'bold', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>1</span>
                <h4 style={{ margin: 0, color: '#111827', fontSize: '0.95rem', fontWeight: 700 }}>Project & Client Details</h4>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem', fontWeight: 600 }}>Project Name</label>
                  <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} style={inputModernStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem', fontWeight: 600 }}>Quote By</label>
                  <input type="text" value={quoteBy} onChange={e => setQuoteBy(e.target.value)} style={inputModernStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem', fontWeight: 600 }}>Company Name</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Client Company..." style={inputModernStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem', fontWeight: 600 }}>Contact Person</label>
                  <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Client Contact..." style={inputModernStyle} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem', fontWeight: 600 }}>Billing Details</label>
                <input type="text" value={billingDetails} onChange={e => setBillingDetails(e.target.value)} placeholder="Billing Address / Reg No..." style={inputModernStyle} />
              </div>
            </div>

            {/* STEP 2: Meterage & Scope */}
            <div style={{ 
              background: '#ffffff', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ background: '#7c3aed', color: 'white', fontWeight: 'bold', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>2</span>
                <h4 style={{ margin: 0, color: '#111827', fontSize: '0.95rem', fontWeight: 700 }}>Site Meterage (m²) & Proposal Type</h4>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.3rem', fontWeight: 600 }}>Living Area (m²)</label>
                  <input type="number" value={livingArea} onChange={e => setLivingArea(Number(e.target.value))} style={{ ...inputModernStyle, fontSize: '1rem', fontWeight: 'bold', color: '#1d4ed8', borderColor: '#93c5fd' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.3rem', fontWeight: 600 }}>Landscape Area (m²)</label>
                  <input type="number" value={landscapeArea} onChange={e => setLandscapeArea(Number(e.target.value))} style={{ ...inputModernStyle, fontSize: '1rem', fontWeight: 'bold', color: '#6d28d9', borderColor: '#c4b5fd' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#4b5563', marginBottom: '0.2rem', fontWeight: 600 }}>Proposal Type</label>
                  <select value={proposalType} onChange={e => setProposalType(e.target.value)} style={{ ...inputModernStyle, height: '38px', padding: '0.2rem 0.5rem' }}>
                    <option value="Signature">Signature</option>
                    <option value="Standard">Standard</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#4b5563', marginBottom: '0.2rem', fontWeight: 600 }}>USD Conv. Rate</label>
                  <div style={{ ...inputModernStyle, textAlign: 'center', background: '#f3f4f6', color: '#1d4ed8', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>R{(1 / usdConv).toFixed(3)}</div>
                </div>
              </div>
            </div>

            {/* STEP 3: Area Split Percentages & Rate Adjustments */}
            <div style={{ 
              background: '#ffffff', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ background: '#0284c7', color: 'white', fontWeight: 'bold', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>3</span>
                <h4 style={{ margin: 0, color: '#111827', fontSize: '0.95rem', fontWeight: 700 }}>Area Split % & Rate Adjustments</h4>
              </div>
              
              <h5 style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Living Area Splits (%)</h5>
              
              <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f9fafb', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.8rem', color: '#1f2937', flex: 1, fontWeight: 600 }}>Experiential Living</span>
                <input type="number" min="0" max="100" value={expLiving} onChange={e => setExpLiving(Number(e.target.value))} style={{ width: '55px', padding: '0.2rem 0.4rem', borderRadius: '4px', background: '#ffffff', border: '1.5px solid #0284c7', color: '#0284c7', textAlign: 'center', fontWeight: 'bold' }} />
                <span style={{ fontSize: '0.75rem', color: '#4b5563', width: '65px', textAlign: 'right', fontWeight: 600 }}>{sqExpLiving.toFixed(0)} m²</span>
              </div>

              <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f9fafb', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.8rem', color: '#1f2937', flex: 1, fontWeight: 600 }}>Secondary Living</span>
                <input type="number" min="0" max="100" value={secLiving} onChange={e => setSecLiving(Number(e.target.value))} style={{ width: '55px', padding: '0.2rem 0.4rem', borderRadius: '4px', background: '#ffffff', border: '1.5px solid #9333ea', color: '#9333ea', textAlign: 'center', fontWeight: 'bold' }} />
                <span style={{ fontSize: '0.75rem', color: '#4b5563', width: '65px', textAlign: 'right', fontWeight: 600 }}>{sqSecLiving.toFixed(0)} m²</span>
              </div>

              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f3f4f6', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280', flex: 1, fontWeight: 500 }}>Non-Experiential Living (Bal.)</span>
                <input type="number" value={nonExpLiving} readOnly style={{ width: '55px', padding: '0.2rem 0.4rem', borderRadius: '4px', background: '#e5e7eb', border: '1px solid #d1d5db', color: '#4b5563', textAlign: 'center' }} />
                <span style={{ fontSize: '0.75rem', color: '#6b7280', width: '65px', textAlign: 'right' }}>{sqNonExpLiving.toFixed(0)} m²</span>
              </div>

              <h5 style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Landscape Area Splits (%)</h5>
              
              <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f9fafb', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.8rem', color: '#1f2937', flex: 1, fontWeight: 600 }}>Experiential Landscape</span>
                <input type="number" min="0" max="100" value={expLand} onChange={e => setExpLand(Number(e.target.value))} style={{ width: '55px', padding: '0.2rem 0.4rem', borderRadius: '4px', background: '#ffffff', border: '1.5px solid #0284c7', color: '#0284c7', textAlign: 'center', fontWeight: 'bold' }} />
                <span style={{ fontSize: '0.75rem', color: '#4b5563', width: '65px', textAlign: 'right', fontWeight: 600 }}>{sqExpLand.toFixed(0)} m²</span>
              </div>

              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f3f4f6', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280', flex: 1, fontWeight: 500 }}>Secondary Landscape (Bal.)</span>
                <input type="number" value={secLand} readOnly style={{ width: '55px', padding: '0.2rem 0.4rem', borderRadius: '4px', background: '#e5e7eb', border: '1px solid #d1d5db', color: '#4b5563', textAlign: 'center' }} />
                <span style={{ fontSize: '0.75rem', color: '#6b7280', width: '65px', textAlign: 'right' }}>{sqSecLand.toFixed(0)} m²</span>
              </div>

              <h5 style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Rate Modifiers (%)</h5>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#4b5563', marginBottom: '0.2rem', textAlign: 'center', fontWeight: 600 }}>Sig Deposit %</label>
                  <input type="number" value={sigDepositPercent} onChange={e => setSigDepositPercent(Number(e.target.value))} style={{ ...inputModernStyle, textAlign: 'center', padding: '0.2rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#4b5563', marginBottom: '0.2rem', textAlign: 'center', fontWeight: 600 }}>Design Inc. %</label>
                  <input type="number" value={designIncreasePercent} onChange={e => setDesignIncreasePercent(Number(e.target.value))} style={{ ...inputModernStyle, textAlign: 'center', padding: '0.2rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#4b5563', marginBottom: '0.2rem', textAlign: 'center', fontWeight: 600 }}>Product Inc. %</label>
                  <input type="number" value={productIncreasePercent} onChange={e => setProductIncreasePercent(Number(e.target.value))} style={{ ...inputModernStyle, textAlign: 'center', padding: '0.2rem' }} />
                </div>
              </div>
            </div>

            {/* STEP 4: Extras & Optional Services */}
            <div style={{ 
              background: '#ffffff', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ background: '#059669', color: 'white', fontWeight: 'bold', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>4</span>
                <h4 style={{ margin: 0, color: '#111827', fontSize: '0.95rem', fontWeight: 700 }}>Extras & Optional Services</h4>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.6rem', background: sigConsult ? '#eff6ff' : '#f9fafb', border: sigConsult ? '1.5px solid #2563eb' : '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <input type="checkbox" checked={sigConsult} onChange={e => handleSigConsultChange(e.target.checked)} />
                  <div style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: sigConsult ? '#2563eb' : '#111827' }}>Signature Consult</span>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#6b7280' }}>Standalone concept design consult with flat service fee structure.</span>
                  </div>
                </label>
              </div>

              {!sigConsult && (
                <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <h5 style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.6rem', textTransform: 'uppercase', fontWeight: 700 }}>Standard Design Phases Included</h5>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
                    <input type="checkbox" checked={conceptDesign} onChange={e => { setConceptDesign(e.target.checked); handleStandardToggle(); }} />
                    <span style={{ fontSize: '0.82rem' }}>Concept Lighting Design</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
                    <input type="checkbox" checked={schematicDesign} onChange={e => { setSchematicDesign(e.target.checked); handleStandardToggle(); }} />
                    <span style={{ fontSize: '0.82rem' }}>Schematic Design Development</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
                    <input type="checkbox" checked={finalDesign} onChange={e => { setFinalDesign(e.target.checked); handleStandardToggle(); }} />
                    <span style={{ fontSize: '0.82rem' }}>Final Design Deliverables</span>
                  </label>
                </div>
              )}

              <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h5 style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.6rem', textTransform: 'uppercase', fontWeight: 700 }}>Extras & On-Site Support</h5>

                {!sigConsult && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={archFittings} onChange={e => { setArchFittings(e.target.checked); handleStandardToggle(); }} />
                    <span style={{ fontSize: '0.82rem', color: archFittings ? '#059669' : '#374151', fontWeight: archFittings ? '600' : 'normal' }}>Architectural Fittings (15% Supply Incentive)</span>
                  </label>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, color: '#374151', fontWeight: 500 }}>
                    <input type="checkbox" checked={siteSupport} onChange={e => setSiteSupport(e.target.checked)} />
                    <span style={{ fontSize: '0.82rem' }}>Site Support Visits</span>
                  </label>
                  {siteSupport && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#ffffff', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Qty:</span>
                      <input type="number" min="1" value={siteSupportQty} onChange={e => setSiteSupportQty(Number(e.target.value))} style={{ width: '40px', padding: '0.1rem', borderRadius: '4px', background: 'transparent', border: 'none', color: '#111827', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, color: '#374151', fontWeight: 500 }}>
                    <input type="checkbox" checked={commissioning} onChange={e => setCommissioning(e.target.checked)} />
                    <span style={{ fontSize: '0.82rem' }}>Commissioning Cap</span>
                  </label>
                  {commissioning && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#ffffff', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Qty:</span>
                      <input type="number" min="1" value={commissioningQty} onChange={e => setCommissioningQty(Number(e.target.value))} style={{ width: '40px', padding: '0.1rem', borderRadius: '4px', background: 'transparent', border: 'none', color: '#111827', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>


          {/* RIGHT COLUMN: Official Output (Clean Paper Proposal Sheet) */}
          <div style={{ 
            position: 'sticky', 
            top: '2rem', 
            background: '#ffffff', 
            padding: '2rem', 
            borderRadius: '16px', 
            border: '1px solid #e0ddd5', 
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
            display: 'flex', 
            flexDirection: 'column',
            fontFamily: '"Outfit", "Inter", sans-serif'
          }}>
            <h4 style={{ marginBottom: '1.5rem', color: '#111827', borderBottom: '2px solid #111827', paddingBottom: '0.75rem', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.5px' }}>Official Proposal Output</h4>
            
            {sigConsult
              ? <OutputRow label="Signature Consult (Concept Value)" value={ConceptCost} color="#111827" />
              : <>
                  <OutputRow label="Concept Lighting Design" value={ConceptCost} color="#111827" />
                  {schematicDesign && <OutputRow label="Schematic Design" value={SchematicCost} color="#111827" />}
                  {finalDesign && <OutputRow label="Final Design" value={FinalCost} color="#111827" />}
                </>
            }

            <div style={{ margin: '1rem 0', borderBottom: '1px dashed #d1d5db' }} />

            <OutputRow label="Design Total" value={rawDesignSubtotal} isHeader color="#111827" />

            {unifiedDiscountValue > 0 && !sigConsult && (
              <OutputRow label="Combined Supply Discount" value={unifiedDiscountValue} isNegative color="#dc2626" smallLabel="Applied to design phases & fittings only" />
            )}

            <div style={{ margin: '1rem 0', borderBottom: '2px solid #059669' }} />

            <OutputRow label="Total For Design" value={designNet} isTotal color="#059669" />

            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#eff6ff', borderRadius: '8px', border: '1px dashed #2563eb' }}>
              <OutputRow label="Deposit Required" value={depositValue} color="#1d4ed8" smallLabel="Equivalent to Concept Lighting base value" />
            </div>

            {!sigConsult && archSubtotalRaw > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.5rem', fontWeight: 700 }}>Architectural Fittings Estimate</span>
                <OutputRow label="Total Fittings Budget" value={archSubtotalRaw} isHeader color="#111827" />
              </div>
            )}

            {(siteSupportCost > 0 || commissioningCost > 0) && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #d1d5db' }}>
                {siteSupportCost > 0 && <OutputRow label="Site Support" value={siteSupportCost} color="#374151" />}
                {commissioningCost > 0 && <OutputRow label="Commissioning Cap" value={commissioningCost} color="#374151" />}
              </div>
            )}

            <div style={{ marginTop: '1.5rem', background: '#111827', color: '#ffffff', padding: '1.25rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>GRAND TOTAL</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 900, color: '#ffffff', fontSize: '1.3rem', display: 'block' }}>{formatZAR(absoluteProjectBudget)}</span>
                <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>{formatUSD(absoluteProjectBudget)} USD</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 700, borderRadius: '8px', background: '#2563eb', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                onClick={handlePreview}
                disabled={loadingPreview}
              >
                {loadingPreview ? '⏳ Generating PDF...' : '📄 Preview & Print Proposal'}
              </button>
              <button
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#ecfdf5', border: '1.5px solid #059669', color: '#059669', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
                onClick={() => {
                  if (updateFee) {
                    updateFee({
                      feeValue: absoluteProjectBudget,
                      deposit: depositValue,
                      fittings: archSubtotalRaw,
                      livingArea,
                      landscapeArea,
                      sigConsult
                    });
                  }
                }}
              >
                💾 Save & Sync Project Financials
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

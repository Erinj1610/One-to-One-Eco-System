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

  const inputYellowStyle = {
    background: '#facc15',
    color: '#000000',
    fontWeight: 'bold',
    border: '1px solid #ca8a04',
    borderRadius: '4px',
    padding: '0.4rem 0.6rem',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box'
  };

  const resultGreyStyle = {
    background: '#e5e7eb',
    color: '#1f2937',
    fontWeight: 'bold',
    border: '1px solid #9ca3af',
    borderRadius: '4px',
    padding: '0.4rem 0.6rem',
    fontSize: '0.9rem',
    textAlign: 'right',
    width: '100%',
    boxSizing: 'border-box'
  };

  return (
    <>
      <div className="stat-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-purple)', background: 'var(--panel-bg)', color: 'var(--text-primary)' }}>
        
        {/* Top Header Card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '2px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Project Name :</label>
              <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} style={inputYellowStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Quote by :</label>
              <input type="text" value={quoteBy} onChange={e => setQuoteBy(e.target.value)} style={inputYellowStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Company Name :</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputYellowStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Contact Person :</label>
              <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} style={inputYellowStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Billing Details:</label>
            <textarea 
              rows={4} 
              value={billingDetails} 
              onChange={e => setBillingDetails(e.target.value)} 
              placeholder="Enter client billing address / tax details..." 
              style={{ ...inputYellowStyle, height: '110px', resize: 'vertical' }} 
            />
          </div>
        </div>

        {/* Rate Adjustments Control Bar */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>Proposal type:</label>
              <select value={proposalType} onChange={e => setProposalType(e.target.value)} style={{ ...inputYellowStyle, height: '36px' }}>
                <option value="Signature">Signature</option>
                <option value="Standard">Standard</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.3rem', textAlign: 'center' }}>Signature Deposit %</label>
              <input type="number" value={sigDepositPercent} onChange={e => setSigDepositPercent(Number(e.target.value))} style={{ ...inputYellowStyle, textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.3rem', textAlign: 'center' }}>Design Increase %</label>
              <input type="number" value={designIncreasePercent} onChange={e => setDesignIncreasePercent(Number(e.target.value))} style={{ ...inputYellowStyle, textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.3rem', textAlign: 'center' }}>Product Increase %</label>
              <input type="number" value={productIncreasePercent} onChange={e => setProductIncreasePercent(Number(e.target.value))} style={{ ...inputYellowStyle, textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.3rem', textAlign: 'center' }}>Signature Consult Discount %</label>
              <input type="number" value={sigConsultDiscount} onChange={e => setSigConsultDiscount(Number(e.target.value))} style={{ ...inputYellowStyle, textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.3rem', textAlign: 'center' }}>Signature Consult</label>
              <input type="number" value={sigConsultExtra} onChange={e => setSigConsultExtra(Number(e.target.value))} style={{ ...inputYellowStyle, textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.3rem', textAlign: 'center' }}>USD Conversion</label>
              <div style={{ ...inputYellowStyle, textAlign: 'center' }}>R{(1 / usdConv).toFixed(3)}</div>
              <div style={{ fontSize: '0.65rem', textAlign: 'center', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>1 DOLLAR = {usdConv} RAND</div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Project Size */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ borderBottom: '2px solid var(--text-primary)', paddingBottom: '0.4rem', margin: 0, textDecoration: 'underline' }}>Project Size</h3>

            {/* Living & Landscape Meterage Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Living</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="number" value={livingArea} onChange={e => setLivingArea(Number(e.target.value))} style={{ ...inputYellowStyle, textAlign: 'right' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Landscape</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="number" value={landscapeArea} onChange={e => setLandscapeArea(Number(e.target.value))} style={{ ...inputYellowStyle, textAlign: 'right' }} />
                </div>
              </div>
            </div>

            {/* Living Parameters % to m² */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 120px 120px', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Experiential Living</span>
                <input type="number" value={expLiving} onChange={e => setExpLiving(Number(e.target.value))} style={{ ...inputYellowStyle, textAlign: 'right' }} />
                <div style={resultGreyStyle}>{sqExpLiving.toFixed(0)}m²</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '180px 120px 120px', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Secondary Living</span>
                <input type="number" value={secLiving} onChange={e => setSecLiving(Number(e.target.value))} style={{ ...inputYellowStyle, textAlign: 'right' }} />
                <div style={resultGreyStyle}>{sqSecLiving.toFixed(0)}m²</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '180px 120px 120px', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Non-Experiential Living</span>
                <input type="number" value={nonExpLiving} readOnly style={{ ...inputYellowStyle, textAlign: 'right', opacity: 0.8 }} />
                <div style={resultGreyStyle}>{sqNonExpLiving.toFixed(0)}m²</div>
              </div>
            </div>

            {/* Landscape Parameters % to m² */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 120px 120px', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Experiential Landscape</span>
                <input type="number" value={expLand} onChange={e => setExpLand(Number(e.target.value))} style={{ ...inputYellowStyle, textAlign: 'right' }} />
                <div style={resultGreyStyle}>{sqExpLand.toFixed(0)}m²</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '180px 120px 120px', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Secondary Landscape</span>
                <input type="number" value={secLand} readOnly style={{ ...inputYellowStyle, textAlign: 'right', opacity: 0.8 }} />
                <div style={resultGreyStyle}>{sqSecLand.toFixed(0)}m²</div>
              </div>
            </div>

            {/* Optional Services */}
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ textDecoration: 'underline', marginBottom: '1rem', fontSize: '1.1rem' }}>Optional Services</h3>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Proposal 1</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input type="number" min="1" value={siteSupportQty} onChange={e => setSiteSupportQty(Number(e.target.value))} style={{ ...inputYellowStyle, width: '50px', textAlign: 'center', padding: '0.2rem' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Site Support</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input type="number" min="1" value={commissioningQty} onChange={e => setCommissioningQty(Number(e.target.value))} style={{ ...inputYellowStyle, width: '50px', textAlign: 'center', padding: '0.2rem' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Commissioning</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Proposal 2&3</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={siteSupport} onChange={e => setSiteSupport(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Site Support (hourly as required fee cap)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={commissioning} onChange={e => setCommissioning(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Commissioning cap (hourly as required fee cap)</span>
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Design Fee Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ borderBottom: '2px solid var(--text-primary)', paddingBottom: '0.4rem', margin: 0, textDecoration: 'underline' }}>Design Fee Breakdown</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Proposal 1 Section */}
              <div>
                <h4 style={{ fontSize: '0.95rem', textDecoration: 'underline', marginBottom: '0.6rem' }}>Proposal 1</h4>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sigConsult} onChange={e => handleSigConsultChange(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Signature Consult</span>
                </label>
              </div>

              {/* Proposal 2&3 Section */}
              <div>
                <h4 style={{ fontSize: '0.95rem', textDecoration: 'underline', marginBottom: '0.6rem' }}>Proposal 2&3</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={conceptDesign} onChange={e => { setConceptDesign(e.target.checked); handleStandardToggle(); }} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Concept Lighting Design</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={schematicDesign} onChange={e => { setSchematicDesign(e.target.checked); handleStandardToggle(); }} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Schematic design Development</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={finalDesign} onChange={e => { setFinalDesign(e.target.checked); handleStandardToggle(); }} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Final Design (Optional)</span>
                  </label>
                </div>
              </div>

              {/* Calculations Breakdown (Grey Outputs) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Subtotal</span>
                  <div style={resultGreyStyle}>{formatZAR(rawDesignSubtotal)}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Supply Discount</span>
                  <div style={resultGreyStyle}>{formatZAR(unifiedDiscountValue)}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Discount %</span>
                  <div style={resultGreyStyle}>{designDiscountRate * 100}%</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Total</span>
                  <div style={{ ...resultGreyStyle, fontSize: '1rem', background: '#d1d5db' }}>{formatZAR(designNet)}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Deposit</span>
                  <div style={resultGreyStyle}>{formatZAR(depositValue)}</div>
                </div>
              </div>

              {/* Estimated Project Budget Section */}
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ textDecoration: 'underline', marginBottom: '0.8rem', fontSize: '1.1rem' }}>Estimated Project Budget</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', marginBottom: '0.8rem' }}>
                  <input type="checkbox" checked={archFittings} onChange={e => setArchFittings(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Architectural Fittings</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Fittings Budget</span>
                  <div style={resultGreyStyle}>{formatZAR(archSubtotalRaw)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  className="glow-btn"
                  style={{ width: '100%', margin: 0, opacity: loadingPreview ? 0.7 : 1 }}
                  onClick={handlePreview}
                  disabled={loadingPreview}
                >
                  {loadingPreview ? '⏳ Generating PDF...' : '📄 Preview & Print Proposal'}
                </button>
                <button
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#10b981', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                  onClick={() => {
                    if (updateFee) {
                      updateFee({
                        feeValue: absoluteProjectBudget,
                        deposit: depositValue,
                        fittings: archSubtotalRaw,
                        livingArea,
                        landscapeArea,
                        sigConsult,
                        projectName,
                        quoteBy,
                        companyName,
                        contactPerson,
                        billingDetails
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

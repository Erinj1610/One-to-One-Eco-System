import React from 'react';
import { 
  Building2, 
  Receipt, 
  Percent, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  FileText, 
  Check, 
  Sparkles,
  ShieldCheck,
  Globe
} from 'lucide-react';

export default function CompanyProfileSettings({ general, setGeneral, onSave }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1080px' }}>
      {/* Header Introduction */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="var(--text-info)" /> Company Profile & Document Branding
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Master profile and commercial terms reflected across client quotations, tax invoices, delivery notes, and specification packs.
          </p>
        </div>

        <button 
          type="button"
          className="btn btn-primary"
          onClick={onSave}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
        >
          <Check size={15} /> Save Changes
        </button>
      </div>

      {/* 3-Column Structured Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        
        {/* Card 1: Official Brand Identity & Studio Location */}
        <div className="card" style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Identity & Studio Location</span>
          </div>
          <div className="card-body" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-row">
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Official Registered Company Name</label>
              <input 
                className="form-control" 
                value={general.companyName || ''} 
                onChange={e => setGeneral(g => ({ ...g, companyName: e.target.value }))}
                placeholder="e.g. One to One World (Pty) Ltd"
              />
            </div>

            <div className="form-row">
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Studio / Showroom Address</label>
              <textarea 
                className="form-control" 
                rows={2}
                value={general.address || ''} 
                onChange={e => setGeneral(g => ({ ...g, address: e.target.value }))}
                placeholder="Studio 14, The Palms, 145 Sir Lowry Rd, Woodstock, Cape Town"
                style={{ resize: 'vertical', fontSize: '12.5px', lineHeight: '1.4' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-row">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Studio Email</label>
                <input 
                  type="email"
                  className="form-control" 
                  value={general.email || ''} 
                  onChange={e => setGeneral(g => ({ ...g, email: e.target.value }))}
                  placeholder="studio@1-to-1.world"
                />
              </div>
              <div className="form-row">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Telephone</label>
                <input 
                  className="form-control" 
                  value={general.phone || ''} 
                  onChange={e => setGeneral(g => ({ ...g, phone: e.target.value }))}
                  placeholder="+27 21 000 0000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Legal, Tax & Banking Information */}
        <div className="card" style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Tax & Legal Entity</span>
          </div>
          <div className="card-body" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-row">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>VAT / Tax ID Number</label>
                <input 
                  className="form-control" 
                  value={general.vat || ''} 
                  onChange={e => setGeneral(g => ({ ...g, vat: e.target.value }))}
                  placeholder="4880123456"
                />
              </div>
              <div className="form-row">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Company Reg. No.</label>
                <input 
                  className="form-control" 
                  value={general.regNumber || ''} 
                  onChange={e => setGeneral(g => ({ ...g, regNumber: e.target.value }))}
                  placeholder="2021/123456/07"
                />
              </div>
            </div>

            <div className="form-row">
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Settlement Banking Details (Client Invoices)</label>
              <textarea 
                className="form-control" 
                rows={3}
                value={general.bankingDetails || 'Standard Bank\nAccount: 10123456789\nBranch Code: 051001\nSwift: SBZAJJ'} 
                onChange={e => setGeneral(g => ({ ...g, bankingDetails: e.target.value }))}
                placeholder="Bank Name, Account #, Branch Code, SWIFT"
                style={{ fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.4' }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Commercial Margins & Pricing Defaults */}
        <div className="card" style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Percent size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Commercial Defaults</span>
          </div>
          <div className="card-body" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-row">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Baseline Target Margin</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={general.defaultTargetMargin || 39} 
                    onChange={e => setGeneral(g => ({ ...g, defaultTargetMargin: parseInt(e.target.value) || 39 }))} 
                    style={{ paddingRight: '28px' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '8px', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>%</span>
                </div>
              </div>
              
              <div className="form-row">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Standard Currency</label>
                <select 
                  className="form-control" 
                  value={general.currency || 'ZAR'} 
                  onChange={e => setGeneral(g => ({ ...g, currency: e.target.value }))}
                >
                  <option value="ZAR">ZAR (R South African Rand)</option>
                  <option value="USD">USD ($ US Dollar)</option>
                  <option value="EUR">EUR (€ Euro)</option>
                  <option value="GBP">GBP (£ British Pound)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Default Payment & Deposit Schedule</label>
              <input 
                className="form-control" 
                value={general.paymentTerms || '50% Deposit to confirm order, 50% prior to dispatch'} 
                onChange={e => setGeneral(g => ({ ...g, paymentTerms: e.target.value }))}
                placeholder="e.g. 50% Deposit, Balance Prior to Dispatch"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Document Header Preview Banner */}
      <div 
        style={{
          border: '1px dashed var(--border-strong)',
          borderRadius: '10px',
          padding: '20px',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} /> Live Quotation & Invoice Header Rendering Preview
          </div>
          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} /> Synchronized with PDF generator
          </span>
        </div>

        <div 
          style={{
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 2px 0', fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
              {general.companyName || '1-to-1 World'}
            </h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b', fontWeight: 600 }}>
              LUXURY ARCHITECTURAL LIGHTING
            </p>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: '1.45', whiteSpace: 'pre-line' }}>
              {general.address || 'Woodstock, Cape Town'}{'\n'}
              Tel: {general.phone || '+27 21 000 0000'} | {general.email || 'studio@1-to-1.world'}
            </p>
          </div>

          <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#475569', lineHeight: '1.45' }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>TAX INVOICE / SPECIFICATION</p>
            <p style={{ margin: '2px 0 0 0' }}>VAT Registration: <span style={{ fontWeight: 600, color: '#0f172a' }}>{general.vat || '4880123456'}</span></p>
            <p style={{ margin: '2px 0 0 0' }}>Default Terms: <span style={{ fontWeight: 600, color: '#0f172a' }}>{general.paymentTerms || '50% Deposit'}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

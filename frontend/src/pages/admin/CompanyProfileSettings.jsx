import React from 'react';
import { 
  Building2, 
  Receipt, 
  Percent, 
  FileText, 
  Check, 
  ShieldCheck,
  CreditCard,
  MapPin,
  Mail,
  Phone
} from 'lucide-react';

export default function CompanyProfileSettings({ general, setGeneral, onSave }) {
  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', maxWidth: '100%' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Company Profile & Document Branding
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Master studio details, tax identity, and commercial terms synchronized across all client proposals, invoices, and spec sheets.
          </p>
        </div>

        <button 
          type="button"
          onClick={onSave}
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
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
        >
          <Check size={16} /> Save Changes
        </button>
      </div>

      {/* Modern 2-Column Full-Width Architectural Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.4fr) minmax(360px, 1fr)', gap: '40px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Clean Structured Settings Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Section 1: Studio Identity & Showroom */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <Building2 size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                Studio Identity & Location
              </span>
            </div>

            <div className="form-row">
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Official Registered Company Name
              </label>
              <input 
                className="input" 
                value={general.companyName || ''} 
                onChange={e => setGeneral(g => ({ ...g, companyName: e.target.value }))}
                placeholder="One to One World (Pty) Ltd"
              />
            </div>

            <div className="form-row">
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Studio & Showroom Address
              </label>
              <textarea 
                className="input" 
                rows={2}
                value={general.address || ''} 
                onChange={e => setGeneral(g => ({ ...g, address: e.target.value }))}
                placeholder="Studio 14, The Palms, 145 Sir Lowry Rd, Woodstock, Cape Town"
                style={{ resize: 'vertical', lineHeight: '1.45' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-row">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Studio Email
                </label>
                <input 
                  type="email"
                  className="input" 
                  value={general.email || ''} 
                  onChange={e => setGeneral(g => ({ ...g, email: e.target.value }))}
                  placeholder="studio@1-to-1.world"
                />
              </div>

              <div className="form-row">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Telephone
                </label>
                <input 
                  className="input" 
                  value={general.phone || ''} 
                  onChange={e => setGeneral(g => ({ ...g, phone: e.target.value }))}
                  placeholder="+27 21 000 0000"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tax, Registration & Banking Entity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <Receipt size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                Legal, Tax & Banking
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-row">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  VAT / Tax ID Number
                </label>
                <input 
                  className="input" 
                  value={general.vat || ''} 
                  onChange={e => setGeneral(g => ({ ...g, vat: e.target.value }))}
                  placeholder="4880123456"
                />
              </div>

              <div className="form-row">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Company Registration Number
                </label>
                <input 
                  className="input" 
                  value={general.regNumber || ''} 
                  onChange={e => setGeneral(g => ({ ...g, regNumber: e.target.value }))}
                  placeholder="2021/123456/07"
                />
              </div>
            </div>

            <div className="form-row">
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Settlement Banking Details (Wire Transfers)
              </label>
              <textarea 
                className="input" 
                rows={3}
                value={general.bankingDetails || 'Standard Bank\nAccount: 10123456789\nBranch Code: 051001\nSwift: SBZAJJ'} 
                onChange={e => setGeneral(g => ({ ...g, bankingDetails: e.target.value }))}
                placeholder="Bank Name, Account #, Branch Code, SWIFT"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px', lineHeight: '1.45' }}
              />
            </div>
          </div>

          {/* Section 3: Commercial Defaults & Target Margins */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <Percent size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                Commercial Defaults & Margins
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-row">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Baseline Target Margin
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    className="input" 
                    value={general.defaultTargetMargin || 39} 
                    onChange={e => setGeneral(g => ({ ...g, defaultTargetMargin: parseInt(e.target.value) || 39 }))} 
                    style={{ paddingRight: '28px' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '9px', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>%</span>
                </div>
              </div>

              <div className="form-row">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Standard Currency
                </label>
                <select 
                  className="input" 
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
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Default Payment & Deposit Schedule
              </label>
              <input 
                className="input" 
                value={general.paymentTerms || '50% Deposit to confirm order, 50% prior to dispatch'} 
                onChange={e => setGeneral(g => ({ ...g, paymentTerms: e.target.value }))}
                placeholder="e.g. 50% Deposit, Balance Prior to Dispatch"
              />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Sticky Live Document Header Preview */}
        <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} /> Live Export Preview
            </span>
            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} /> Synchronized
            </span>
          </div>

          <div 
            style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '28px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04), 0 0 1px 1px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}
          >
            {/* Document Header Preview Top */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {general.companyName || '1-to-1 World'}
                </h3>
                <p style={{ margin: '0 0 10px 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b', fontWeight: 600 }}>
                  LUXURY ARCHITECTURAL LIGHTING
                </p>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                  {general.address || 'Woodstock, Cape Town'}{'\n'}
                  Tel: {general.phone || '+27 21 000 0000'}{'\n'}
                  {general.email || 'studio@1-to-1.world'}
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#475569', lineHeight: '1.5' }}>
                <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', color: '#0f172a', marginBottom: '8px' }}>
                  TAX INVOICE / SPEC
                </span>
                <p style={{ margin: '4px 0 0 0' }}>VAT: <strong style={{ color: '#0f172a' }}>{general.vat || '4880123456'}</strong></p>
                <p style={{ margin: '2px 0 0 0' }}>Reg: <strong style={{ color: '#0f172a' }}>{general.regNumber || '2021/123456/07'}</strong></p>
              </div>
            </div>

            {/* Document Terms & Banking Info Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '11.5px', color: '#475569', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>
                  Commercial Terms
                </span>
                <p style={{ margin: 0, fontWeight: 500, color: '#0f172a' }}>
                  {general.paymentTerms || '50% Deposit to confirm order, 50% prior to dispatch'}
                </p>
                <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
                  Currency: {general.currency || 'ZAR'} (Base Target {general.defaultTargetMargin || 39}%)
                </p>
              </div>

              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>
                  Settlement Details
                </span>
                <pre style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '11px', color: '#0f172a', whiteSpace: 'pre-line' }}>
                  {general.bankingDetails || 'Standard Bank\nAccount: 10123456789\nBranch: 051001'}
                </pre>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
              Preview updates live as you edit studio fields on the left.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

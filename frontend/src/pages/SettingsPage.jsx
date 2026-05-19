import React, { useState } from 'react';

const TABS = ['General', 'Permissions', 'Rate card', 'Integrations'];

const ROLES = ['Admin', 'Senior Designer', 'Designer', 'Coordinator', 'Showroom'];
const MODULES = ['Dashboard', 'CRM', 'Pipeline', 'Design tracker', 'Projects', 'Design fee', 'Time tracking', 'Products', 'BOQ Maker', 'Orders', 'Invoices', 'Documents', 'HR & people', 'Reports', 'Support'];

const RATES = [
  { zone: 'Experiential living (30%)',     concept: 180, schematic: 144, final: 117,   budget: 1050 },
  { zone: 'Secondary living (60%)',         concept: 105, schematic: 84,  final: 68.25, budget: 750 },
  { zone: 'Non-experiential (10%)',         concept: 30,  schematic: 24,  final: 19.50, budget: 300 },
  { zone: 'Experiential landscape (40%)',   concept: 140, schematic: 112, final: 91,    budget: 825 },
  { zone: 'Secondary landscape (60%)',      concept: 55,  schematic: 44,  final: 35.75, budget: 525 },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('General');
  const [activeRole, setActiveRole] = useState('Admin');
  const [general, setGeneral] = useState({ companyName: '1-to-1 World', email: 'studio@1-to-1.world', phone: '+27 21 000 0000', address: 'Woodstock, Cape Town', vat: '4880123456', currency: 'ZAR' });

  return (
    <div className="animation-fade-in">
      <div className="tabs" style={{ marginBottom: 18 }}>
        {TABS.map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {activeTab === 'General' && (
        <div>
          <div className="section-label">Company details</div>
          <div className="card" style={{ marginBottom: 14, maxWidth: 560 }}>
            <div className="card-body">
              <div className="row-2">
                <div className="form-row"><label className="form-label">Company name</label><input className="form-control" value={general.companyName} onChange={e => setGeneral(g => ({...g, companyName: e.target.value}))} /></div>
                <div className="form-row"><label className="form-label">Studio email</label><input className="form-control" value={general.email} onChange={e => setGeneral(g => ({...g, email: e.target.value}))} /></div>
              </div>
              <div className="row-2">
                <div className="form-row"><label className="form-label">Phone</label><input className="form-control" value={general.phone} onChange={e => setGeneral(g => ({...g, phone: e.target.value}))} /></div>
                <div className="form-row"><label className="form-label">VAT number</label><input className="form-control" value={general.vat} onChange={e => setGeneral(g => ({...g, vat: e.target.value}))} /></div>
              </div>
              <div className="form-row"><label className="form-label">Address</label><input className="form-control" value={general.address} onChange={e => setGeneral(g => ({...g, address: e.target.value}))} /></div>
              <div className="form-row"><label className="form-label">Currency</label>
                <select className="form-control" value={general.currency} onChange={e => setGeneral(g => ({...g, currency: e.target.value}))}>
                  <option>ZAR</option><option>USD</option><option>EUR</option><option>GBP</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-primary">Save changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Permissions' && (
        <div>
          <div className="section-label">Role-based access control</div>
          <div className="perm-roles">
            {ROLES.map(r => (
              <button key={r} className={`perm-role-chip ${activeRole === r ? 'active' : ''}`} onClick={() => setActiveRole(r)}>{r}</button>
            ))}
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              {MODULES.map(mod => (
                <div key={mod} className="perm-row" style={{ padding: '8px 15px' }}>
                  <div className="perm-section" style={{ flex: 1, fontSize: 12 }}>{mod}</div>
                  <select className="form-control" style={{ width: 140 }} defaultValue={activeRole === 'Admin' ? 'Full access' : 'Can edit'}>
                    <option>Full access</option><option>Can edit</option><option>View only</option><option>No access</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Rate card' && (
        <div>
          <div className="section-label">Per-m² design fee rates</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
            These rates feed the design fee calculator. Edit and save to update all future quotes.
          </div>
          <div className="card">
            <table className="table">
              <thead><tr><th>Zone</th><th>Concept</th><th>Schematic</th><th>Final design</th><th>Product budget</th></tr></thead>
              <tbody>
                {RATES.map(r => (
                  <tr key={r.zone}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.zone}</td>
                    <td>R {r.concept}</td>
                    <td>R {r.schematic}</td>
                    <td>R {r.final}</td>
                    <td>R {r.budget}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn btn-primary">Save rate card</button>
          </div>
        </div>
      )}

      {activeTab === 'Integrations' && (
        <div>
          <div className="section-label">Connected integrations</div>
          {[
            { name: 'Xero',    desc: 'Sync invoices and payments to accounting',       status: 'Connected',    color: 'b-success' },
            { name: 'SAGE',    desc: 'Alternative accounting integration',              status: 'Disconnected', color: 'b-default' },
            { name: 'Resend',  desc: 'Transactional email delivery',                   status: 'Connected',    color: 'b-success' },
            { name: 'Firebase',desc: 'Authentication & real-time database',            status: 'Connected',    color: 'b-success' },
            { name: 'Palladium',desc: 'Read-only Kerridge CS cloud sync (BOQ/quotes)', status: 'Connected',    color: 'b-success' },
          ].map(int => (
            <div key={int.name} className="card" style={{ marginBottom: 10 }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, background: 'var(--bg-info)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-info)', fontWeight: 600, fontSize: 15 }}>{int.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{int.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{int.desc}</div>
                </div>
                <span className={`badge ${int.color}`}>{int.status}</span>
                <button className="btn btn-sm">{int.status === 'Connected' ? 'Configure' : 'Connect'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

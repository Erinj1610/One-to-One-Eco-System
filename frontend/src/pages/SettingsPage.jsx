import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';

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
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const { alertSettings, setAlertSettings, moduleConfig, setModuleConfig } = useStore();

  const availableTabs = isAdmin
    ? ['General', 'Users', 'Permissions', 'Rate card', 'Alerts', 'Modules', 'Integrations', 'Templates']
    : ['General', 'Permissions', 'Rate card', 'Alerts', 'Integrations'];

  const [activeTab, setActiveTab] = useState('General');
  const [activeRole, setActiveRole] = useState('Admin');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({ module: 'projects', parameter: 'margin', condition: 'less_than', value: '', label: '' });
  const [general, setGeneral] = useState({ companyName: '1-to-1 World', email: 'studio@1-to-1.world', phone: '+27 21 000 0000', address: 'Woodstock, Cape Town', vat: '4880123456', currency: 'ZAR' });

  // Users Management State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role_id: 3, department: 'Design' });
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  
  // Edit & Reset Password States
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role_id: 3, department: 'Design', disabled: false });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [resetPwLink, setResetPwLink] = useState('');

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setGeneratedLink('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      });
      const data = await res.json();
      if (res.ok) {
        setInviteSuccess(`Successfully invited ${inviteForm.name}!`);
        if (data.reset_link) {
          setGeneratedLink(data.reset_link);
        }
        setInviteForm({ name: '', email: '', role_id: 3, department: 'Design' });
        fetchUsers();
      } else {
        setInviteError(data.detail || 'Failed to invite user');
      }
    } catch (err) {
      setInviteError('Network error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This will also remove them from Firebase Auth.")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to delete user');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setEditForm({
      name: u.name,
      role_id: u.role_id || 3,
      department: u.department || 'Design',
      disabled: !!u.disabled
    });
    setEditError('');
    setEditSuccess('');
    setResetPwLink('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        setEditSuccess(`Successfully updated ${editForm.name}!`);
        fetchUsers();
        setTimeout(() => {
          setEditingUser(null);
        }, 1500);
      } else {
        setEditError(data.detail || 'Failed to update user');
      }
    } catch (err) {
      setEditError('Network error');
    }
  };

  const handleResetPassword = async (userId, userEmail) => {
    if (!window.confirm(`Trigger password reset email/link for ${userEmail}?`)) return;
    setResetPwLink('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/reset-password`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        alert("Password reset email triggered successfully!");
        if (data.reset_link) {
          setResetPwLink(data.reset_link);
        }
      } else {
        alert(data.detail || 'Failed to trigger password reset');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  return (
    <div className="animation-fade-in">
      <div className="tabs" style={{ marginBottom: 18 }}>
        {availableTabs.map(t => (
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

      {activeTab === 'Users' && isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          <div>
            <div className="section-label">System Users</div>
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                {usersLoading ? (
                  <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>Loading users...</div>
                ) : (
                  <table className="table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th style={{ width: 180, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} style={{ opacity: u.disabled ? 0.6 : 1 }}>
                          <td style={{ fontWeight: 600 }}>{u.name}</td>
                          <td>{u.email}</td>
                          <td>
                            <span className="badge" style={{ background: 'rgba(224, 153, 36, 0.1)', color: '#e09924', border: '1px solid rgba(224, 153, 36, 0.2)' }}>
                              {u.role}
                            </span>
                          </td>
                          <td>{u.department}</td>
                          <td>
                            <span className="badge" style={{ 
                              background: u.disabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
                              color: u.disabled ? '#ef4444' : '#10b981', 
                              border: u.disabled ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(34, 197, 94, 0.2)' 
                            }}>
                              {u.disabled ? 'Disabled' : 'Active'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              onClick={() => handleEditClick(u)}
                              style={{ background: 'transparent', border: 'none', color: '#e09924', cursor: 'pointer', fontSize: 11, padding: '4px 6px', marginRight: 4 }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleResetPassword(u.id, u.email)}
                              style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: 11, padding: '4px 6px', marginRight: 4 }}
                            >
                              Reset PW
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 11, padding: '4px 6px' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div>
            {editingUser ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div className="section-label" style={{ margin: 0 }}>Edit User</div>
                  <button 
                    type="button"
                    onClick={() => setEditingUser(null)} 
                    style={{ background: 'rgba(224, 153, 36, 0.1)', border: '1px solid rgba(224, 153, 36, 0.3)', color: '#e09924', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                  >
                    + Invite New User
                  </button>
                </div>
                <div className="card">
                  <div className="card-body">
                    <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                        Editing settings for: <strong>{editingUser.email}</strong>
                      </div>
                      
                      <div className="form-row">
                        <label className="form-label">Full Name</label>
                        <input 
                          className="form-control" 
                          required 
                          value={editForm.name} 
                          onChange={e => setEditForm(f => ({...f, name: e.target.value}))} 
                        />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Role</label>
                        <select 
                          className="form-control"
                          value={editForm.role_id}
                          onChange={e => setEditForm(f => ({...f, role_id: parseInt(e.target.value)}))}
                        >
                          <option value={1}>Admin</option>
                          <option value={2}>Senior Designer</option>
                          <option value={3}>Designer</option>
                          <option value={4}>Coordinator</option>
                          <option value={5}>Showroom</option>
                        </select>
                      </div>
                      <div className="form-row">
                        <label className="form-label">Department</label>
                        <input 
                          className="form-control" 
                          value={editForm.department} 
                          onChange={e => setEditForm(f => ({...f, department: e.target.value}))} 
                        />
                      </div>
                      
                      <div className="form-row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <input 
                          type="checkbox" 
                          id="user-disabled-check"
                          checked={editForm.disabled} 
                          onChange={e => setEditForm(f => ({...f, disabled: e.target.checked}))}
                          style={{ cursor: 'pointer' }}
                        />
                        <label htmlFor="user-disabled-check" style={{ fontSize: 12, color: '#f3f4f6', cursor: 'pointer', fontWeight: 600 }}>
                          Disable User (Lock account access)
                        </label>
                      </div>

                      {editError && (
                        <div style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>
                          {editError}
                        </div>
                      )}

                      {editSuccess && (
                        <div style={{ color: '#34d399', fontSize: 12, marginTop: 4 }}>
                          {editSuccess}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                          Save Changes
                        </button>
                        <button 
                          type="button" 
                          className="btn" 
                          onClick={() => setEditingUser(null)}
                          style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="section-label">Invite New User</div>
                <div className="card">
                  <div className="card-body">
                    <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="form-row">
                        <label className="form-label">Full Name</label>
                        <input 
                          className="form-control" 
                          required 
                          value={inviteForm.name} 
                          onChange={e => setInviteForm(f => ({...f, name: e.target.value}))} 
                        />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Email Address</label>
                        <input 
                          type="email"
                          className="form-control" 
                          required 
                          value={inviteForm.email} 
                          onChange={e => setInviteForm(f => ({...f, email: e.target.value}))} 
                        />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Role</label>
                        <select 
                          className="form-control"
                          value={inviteForm.role_id}
                          onChange={e => setInviteForm(f => ({...f, role_id: parseInt(e.target.value)}))}
                        >
                          <option value={1}>Admin</option>
                          <option value={2}>Senior Designer</option>
                          <option value={3}>Designer</option>
                          <option value={4}>Coordinator</option>
                          <option value={5}>Showroom</option>
                        </select>
                      </div>
                      <div className="form-row">
                        <label className="form-label">Department</label>
                        <input 
                          className="form-control" 
                          value={inviteForm.department} 
                          onChange={e => setInviteForm(f => ({...f, department: e.target.value}))} 
                        />
                      </div>

                      {inviteError && (
                        <div style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>
                          {inviteError}
                        </div>
                      )}

                      {inviteSuccess && (
                        <div style={{ color: '#34d399', fontSize: 12, marginTop: 4 }}>
                          {inviteSuccess}
                        </div>
                      )}

                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ marginTop: 8 }}
                      >
                        Send Invitation
                      </button>
                    </form>

                    {generatedLink && (
                      <div style={{ marginTop: 16, padding: 12, background: 'rgba(224, 153, 36, 0.05)', border: '1px solid rgba(224, 153, 36, 0.15)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: '#e09924', fontWeight: 600, marginBottom: 4 }}>Invitation / Setup Link:</div>
                        <textarea 
                          readOnly 
                          value={generatedLink} 
                          onClick={e => e.target.select()}
                          style={{ width: '100%', height: 60, fontSize: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: '#ccc', borderRadius: 4, padding: 4, resize: 'none', outline: 'none' }}
                        />
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Copy this link and send it directly to the user so they can set their password.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Display triggered reset password link if any */}
            {resetPwLink && (
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, marginBottom: 4 }}>Generated Reset Link:</div>
                <textarea 
                  readOnly 
                  value={resetPwLink} 
                  onClick={e => e.target.select()}
                  style={{ width: '100%', height: 60, fontSize: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: '#ccc', borderRadius: 4, padding: 4, resize: 'none', outline: 'none' }}
                />
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>The reset email has been sent. You can also copy and send this direct link manually.</div>
              </div>
            )}
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

      {activeTab === 'Templates' && isAdmin && (
        <div className="animation-fade-in">
          <div className="section-label">Document Templates</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Configure custom Microsoft Word (.docx) templates for automatic PDF generation. Upload custom designs with placeholders to style documents.
          </div>
          <div className="card" style={{ maxWidth: 600 }}>
            <div className="card-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  background: 'linear-gradient(135deg, #2b579a 0%, #1e3f70 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 22,
                  boxShadow: '0 4px 12px rgba(43, 87, 154, 0.2)'
                }}>
                  📝
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Word (.docx) Template Hub</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>
                    Upload and manage templates for proposals, quotes, invoices, packing lists, and delivery notes.
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                padding: '12px 16px',
                borderLeft: '4px solid #2b579a',
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: 24
              }}>
                <strong>Supported Templates:</strong>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: 18 }}>
                  <li>Design Fee Proposal (.docx)</li>
                  <li>Quotation (.docx)</li>
                  <li>Tax Invoice (.docx)</li>
                  <li>Packing List (.docx)</li>
                  <li>Delivery Note (.docx)</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/admin/template-editor')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  Manage & Upload Templates ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'Alerts' && (
        <div className="animation-fade-in" style={{ paddingBottom: '30px' }}>
          <div className="section-label">Manage Operational Alerts & Toggles</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Configure which events generate alerts in the collapsible sidebar for each module. These settings apply globally.
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* CRM MODULE ALERTS */}
            <div className="card">
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>CRM Module Alerts</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.crm?.lostClients} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        crm: { ...prev.crm, lostClients: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Lost Clients Warnings</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Prompt to review post-mortem / check inactive client re-engagement.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.crm?.inactiveClients} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        crm: { ...prev.crm, inactiveClients: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>At-Risk / Inactive Warnings</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when clients have Red health or haven't placed projects for long periods.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.crm?.npsReview} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        crm: { ...prev.crm, npsReview: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>NPS Detractor Alerts</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Flag feedback scores below 6/10 for immediate follow-up.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* DESIGN MODULE ALERTS */}
            <div className="card">
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Design Module Alerts</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.design?.outstandingFees} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        design: { ...prev.design, outstandingFees: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Outstanding Design Fees</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when design fee payments have unpaid outstanding balances.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.design?.upcomingDeadlines} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        design: { ...prev.design, upcomingDeadlines: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Delayed Design Phases</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when active concept design phases are past project timeline deadlines.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* PROJECTS MODULE ALERTS */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Projects Module Alerts</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.projects?.overdueDeadlines} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        projects: { ...prev.projects, overdueDeadlines: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Overdue Deadlines</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Flag projects that are behind schedule based on deadline.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.projects?.lowMargins} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        projects: { ...prev.projects, lowMargins: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Low Margins</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Flag projects whose dynamic margins fall below target margin threshold.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.projects?.outstandingDesignFees} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        projects: { ...prev.projects, outstandingDesignFees: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Outstanding Design Fee Balance</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Flag projects with unpaid design fees in the project dashboard.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.projects?.orderLogisticsAlerts} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        projects: { ...prev.projects, orderLogisticsAlerts: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Order Logistics Alerts</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when any order is delayed, in Customs hold, or backordered.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.projects?.productApprovalAlerts} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        projects: { ...prev.projects, productApprovalAlerts: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Product Approvals</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when client approvals or initial deposits are missing.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* ORDERS MODULE ALERTS */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Orders Module Alerts</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.orders?.logisticsHolds} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        orders: { ...prev.orders, logisticsHolds: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Logistics Customs Holds</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when imported hardware orders are flagged on Customs hold status.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.orders?.backorderedIssues} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        orders: { ...prev.orders, backorderedIssues: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Pending Deposit Clearances</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when initiated hardware orders are pending deposit confirmation.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.orders?.lowMarginOrders} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        orders: { ...prev.orders, lowMarginOrders: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Low Order Margins</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when specific hardware order profit margin drops below the standard 39% target.</span>
                  </div>
                </label>
              </div>
            </div>

          </div>

          {/* CUSTOM ALERTS RULE BUILDER SECTION */}
          <div style={{ marginTop: '24px' }}>
            <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Custom Alert Rules Builder</span>
              <button 
                className="btn btn-sm btn-primary"
                onClick={() => setShowRuleModal(true)}
              >
                + Add Custom Rule
              </button>
            </div>
            
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>Module</th>
                      <th>Parameter</th>
                      <th>Condition</th>
                      <th>Threshold Value</th>
                      <th>Alert Label Description</th>
                      <th style={{ textAlign: 'right', width: '80px', paddingRight: '14px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(alertSettings?.customRules || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                          No custom alert rules configured. Click "+ Add Custom Rule" to build one.
                        </td>
                      </tr>
                    ) : (
                      (alertSettings.customRules).map(rule => (
                        <tr key={rule.id}>
                          <td style={{ textTransform: 'uppercase', fontWeight: 600, padding: '10px 14px' }}>{rule.module}</td>
                          <td><code>{rule.parameter.replace('_',' ')}</code></td>
                          <td style={{ color: 'var(--text-info)' }}>{rule.condition.replace('_',' ')}</td>
                          <td style={{ fontWeight: 600 }}>{rule.value}</td>
                          <td>{rule.label}</td>
                          <td style={{ textAlign: 'right', paddingRight: '14px' }}>
                            <button 
                              className="btn btn-sm btn-ghost" 
                              style={{ color: 'var(--text-danger)', border: 'none', padding: '2px 8px' }}
                              onClick={() => {
                                setAlertSettings(prev => ({
                                  ...prev,
                                  customRules: prev.customRules.filter(r => r.id !== rule.id)
                                }));
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'Modules' && isAdmin && (
        <div className="animation-fade-in" style={{ paddingBottom: '30px' }}>
          <div className="section-label">Modules Layout & Custom Naming</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Configure visibility, custom names, section grouping, and navigation ordering for all modules. These changes propagate dynamically across the sidebar, page titles, and page headers.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '24px' }}>
            {/* SECTIONS MANAGER */}
            <div className="card">
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Navigation Sections / Categories</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    id="new-section-input" 
                    placeholder="New section name..." 
                    className="form-control" 
                    style={{ width: '180px', padding: '4px 8px', fontSize: '12px', height: 'auto' }} 
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const newName = e.target.value.trim();
                        const newId = newName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                        if (moduleConfig.sections.some(s => s.id === newId)) {
                          alert('Section ID already exists');
                          return;
                        }
                        const newSections = [
                          ...moduleConfig.sections,
                          { id: newId, label: newName, order: moduleConfig.sections.length }
                        ];
                        setModuleConfig(prev => ({ ...prev, sections: newSections }));
                        e.target.value = '';
                      }
                    }}
                  />
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      const input = document.getElementById('new-section-input');
                      if (input && input.value.trim()) {
                        const newName = input.value.trim();
                        const newId = newName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                        if (moduleConfig.sections.some(s => s.id === newId)) {
                          alert('Section ID already exists');
                          return;
                        }
                        const newSections = [
                          ...moduleConfig.sections,
                          { id: newId, label: newName, order: moduleConfig.sections.length }
                        ];
                        setModuleConfig(prev => ({ ...prev, sections: newSections }));
                        input.value = '';
                      }
                    }}
                  >
                    Add Section
                  </button>
                </div>
              </div>
              <div className="card-body" style={{ padding: '16px' }}>
                <table className="table" style={{ fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th>Section ID</th>
                      <th>Label / Name</th>
                      <th>Sort Order</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...moduleConfig.sections].sort((a, b) => a.order - b.order).map((sec, index, sortedArr) => (
                      <tr key={sec.id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{sec.id}</td>
                        <td>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ padding: '2px 6px', fontSize: '12px', height: 'auto', width: '180px' }}
                            value={sec.label}
                            onChange={e => {
                              const updatedSections = moduleConfig.sections.map(s => 
                                s.id === sec.id ? { ...s, label: e.target.value } : s
                              );
                              setModuleConfig(prev => ({ ...prev, sections: updatedSections }));
                            }}
                          />
                        </td>
                        <td>{sec.order}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button 
                              className="btn btn-xs"
                              disabled={index === 0}
                              onClick={() => {
                                const newSecs = [...moduleConfig.sections];
                                const current = newSecs.find(s => s.id === sec.id);
                                const prevSec = newSecs.find(s => s.id === sortedArr[index - 1].id);
                                if (current && prevSec) {
                                  const temp = current.order;
                                  current.order = prevSec.order;
                                  prevSec.order = temp;
                                  setModuleConfig(prev => ({ ...prev, sections: newSecs }));
                                }
                              }}
                            >
                              ▲
                            </button>
                            <button 
                              className="btn btn-xs"
                              disabled={index === sortedArr.length - 1}
                              onClick={() => {
                                const newSecs = [...moduleConfig.sections];
                                const current = newSecs.find(s => s.id === sec.id);
                                const nextSec = newSecs.find(s => s.id === sortedArr[index + 1].id);
                                if (current && nextSec) {
                                  const temp = current.order;
                                  current.order = nextSec.order;
                                  nextSec.order = temp;
                                  setModuleConfig(prev => ({ ...prev, sections: newSecs }));
                                }
                              }}
                            >
                              ▼
                            </button>
                            <button 
                              className="btn btn-xs btn-danger-outline"
                              disabled={['general', 'clients_sales', 'projects_sec', 'other_modules'].includes(sec.id)}
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete the section "${sec.label}"? Any modules in this section will be reassigned to General.`)) {
                                  const updatedSections = moduleConfig.sections.filter(s => s.id !== sec.id);
                                  const updatedModules = moduleConfig.modules.map(m => 
                                    m.sectionId === sec.id ? { ...m, sectionId: 'general' } : m
                                  );
                                  setModuleConfig({ sections: updatedSections, modules: updatedModules });
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODULES CONFIGURATION */}
            <div className="card">
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Modules Layout & Renaming</div>
              </div>
              <div className="card-body" style={{ padding: '16px' }}>
                <table className="table" style={{ fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>Show</th>
                      <th>Module ID</th>
                      <th>Display Name</th>
                      <th>Section</th>
                      <th>Sort Order</th>
                      <th style={{ textAlign: 'right' }}>Order Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...moduleConfig.modules].sort((a, b) => a.order - b.order).map((mod, index, sortedArr) => (
                      <tr key={mod.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={mod.visible}
                            onChange={e => {
                              const updatedModules = moduleConfig.modules.map(m => 
                                m.id === mod.id ? { ...m, visible: e.target.checked } : m
                              );
                              setModuleConfig(prev => ({ ...prev, modules: updatedModules }));
                            }}
                          />
                        </td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{mod.id}</td>
                        <td>
                          <input 
                            type="text"
                            className="form-control"
                            style={{ padding: '2px 6px', fontSize: '12px', height: 'auto', width: '180px' }}
                            value={mod.label}
                            onChange={e => {
                              const updatedModules = moduleConfig.modules.map(m => 
                                m.id === mod.id ? { ...m, label: e.target.value } : m
                              );
                              setModuleConfig(prev => ({ ...prev, modules: updatedModules }));
                            }}
                          />
                        </td>
                        <td>
                          <select
                            className="form-control"
                            style={{ padding: '2px 6px', fontSize: '12px', height: 'auto', width: '150px' }}
                            value={mod.sectionId}
                            onChange={e => {
                              const updatedModules = moduleConfig.modules.map(m => 
                                m.id === mod.id ? { ...m, sectionId: e.target.value } : m
                              );
                              setModuleConfig(prev => ({ ...prev, modules: updatedModules }));
                            }}
                          >
                            {moduleConfig.sections.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>{mod.order}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button 
                              className="btn btn-xs"
                              disabled={index === 0}
                              onClick={() => {
                                const newMods = [...moduleConfig.modules];
                                const current = newMods.find(m => m.id === mod.id);
                                const prevMod = newMods.find(m => m.id === sortedArr[index - 1].id);
                                if (current && prevMod) {
                                  const temp = current.order;
                                  current.order = prevMod.order;
                                  prevMod.order = temp;
                                  setModuleConfig(prev => ({ ...prev, modules: newMods }));
                                }
                              }}
                            >
                              ▲
                            </button>
                            <button 
                              className="btn btn-xs"
                              disabled={index === sortedArr.length - 1}
                              onClick={() => {
                                const newMods = [...moduleConfig.modules];
                                const current = newMods.find(m => m.id === mod.id);
                                const nextMod = newMods.find(m => m.id === sortedArr[index + 1].id);
                                if (current && nextMod) {
                                  const temp = current.order;
                                  current.order = nextMod.order;
                                  nextMod.order = temp;
                                  setModuleConfig(prev => ({ ...prev, modules: newMods }));
                                }
                              }}
                            >
                              ▼
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM ALERT RULE MODAL */}
      {showRuleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 700 }}>Add Custom Alert Rule</div>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }} onClick={() => setShowRuleModal(false)}>✕</button>
            </div>
            <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-row">
                <label className="form-label" style={{ color: 'var(--text-primary)' }}>Target Module</label>
                <select 
                  className="form-control" 
                  value={ruleForm.module} 
                  onChange={e => {
                    const mod = e.target.value;
                    let param = 'margin';
                    if (mod === 'crm') param = 'nps';
                    if (mod === 'design') param = 'outstanding';
                    setRuleForm(prev => ({ ...prev, module: mod, parameter: param }));
                  }}
                >
                  <option value="crm">CRM Module</option>
                  <option value="design">Design tracker Module</option>
                  <option value="projects">Projects Module</option>
                  <option value="orders">Orders Module</option>
                </select>
              </div>

              <div className="form-row">
                <label className="form-label" style={{ color: 'var(--text-primary)' }}>Condition Parameter</label>
                <select 
                  className="form-control" 
                  value={ruleForm.parameter}
                  onChange={e => setRuleForm(prev => ({ ...prev, parameter: e.target.value }))}
                >
                  {ruleForm.module === 'crm' && (
                    <>
                      <option value="nps">Client NPS Score</option>
                      <option value="days_dormant">Days since last project</option>
                      <option value="days_since_contact">Days since last contact</option>
                    </>
                  )}
                  {ruleForm.module === 'design' && (
                    <>
                      <option value="outstanding">Outstanding design fee balance (R)</option>
                      <option value="overdue_days">Drawing phase overdue days</option>
                    </>
                  )}
                  {ruleForm.module === 'projects' && (
                    <>
                      <option value="margin">Dynamic Project margin (%)</option>
                      <option value="overdue_days">Project overdue days</option>
                      <option value="outstanding">Outstanding design fee balance (R)</option>
                    </>
                  )}
                  {ruleForm.module === 'orders' && (
                    <>
                      <option value="margin">Order margin (%)</option>
                      <option value="value">Order retail value (R)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="row-2">
                <div className="form-row">
                  <label className="form-label" style={{ color: 'var(--text-primary)' }}>Condition</label>
                  <select 
                    className="form-control" 
                    value={ruleForm.condition}
                    onChange={e => setRuleForm(prev => ({ ...prev, condition: e.target.value }))}
                  >
                    <option value="less_than">Less Than (&lt;)</option>
                    <option value="greater_than">Greater Than (&gt;)</option>
                    <option value="equals">Equals (=)</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label" style={{ color: 'var(--text-primary)' }}>Threshold Value</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 18 or 5000" 
                    value={ruleForm.value}
                    onChange={e => setRuleForm(prev => ({ ...prev, value: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label" style={{ color: 'var(--text-primary)' }}>Alert Label Description</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Margin is below 18%" 
                  value={ruleForm.label}
                  onChange={e => setRuleForm(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (!ruleForm.value || !ruleForm.label) return;
                    const newRule = {
                      id: `rule-${Date.now()}`,
                      ...ruleForm,
                      value: Number(ruleForm.value)
                    };
                    setAlertSettings(prev => ({
                      ...prev,
                      customRules: [...(prev.customRules || []), newRule]
                    }));
                    setShowRuleModal(false);
                    setRuleForm({ module: 'projects', parameter: 'margin', condition: 'less_than', value: '', label: '' });
                  }}
                >
                  Save Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

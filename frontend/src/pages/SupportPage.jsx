import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, X, CheckCircle, AlertCircle, Clock, Tag, User, 
  Calendar, Star, Send, Image, MessageSquare, AlertTriangle, Play, Upload, Sparkles, ArrowLeft
} from 'lucide-react';

const INITIAL_TICKETS = [
  {
    id: 'TKT-001',
    title: 'BOQ export not generating PDF',
    raised: 'Dani',
    date: '13 May',
    priority: 'High',
    status: 'Open',
    cat: 'Bug',
    description: 'When clicking "Export PDF" on any BOQ specification page, the browser shows a blank download with 0 bytes. This is blocking project handovers and needs to be resolved before end of month. Affects all users on Chrome and Edge.',
    images: [],
    eta: '2026-05-25',
    adminNotes: 'Looking into PDF export library configuration.',
    rating: null,
    developerComments: []
  },
  {
    id: 'TKT-002',
    title: 'Design tracker column order',
    raised: 'Refilwe',
    date: '12 May',
    priority: 'Low',
    status: 'Closed',
    cat: 'Feature',
    description: 'The design tracker columns should be reorderable by drag-and-drop so each PM can customise their view. At minimum, the "Stage" and "Owner" columns should be movable. Already implemented — closing ticket.',
    images: [],
    eta: 'Completed',
    adminNotes: 'Drag-and-drop handles added to columns.',
    rating: 5,
    developerComments: [
      { sender: 'Martin', text: 'Looks awesome and makes my daily tracking so much faster!', date: '14 May' }
    ]
  },
  {
    id: 'TKT-003',
    title: 'Add Molecule to product catalog',
    raised: 'Sipho',
    date: '11 May',
    priority: 'Medium',
    status: 'In progress',
    cat: 'Feature',
    description: 'We need the full Molecule Distributions product range (drivers, track systems, and accessories) added to the product catalog item code lookup in the Sales Tracker spreadsheet. Sipho to provide the supplier CSV file. Estimated 3–5 days to complete.',
    images: [],
    eta: '2026-05-20',
    adminNotes: 'Awaiting CSV supplier sheet to import.',
    rating: null,
    developerComments: []
  },
  {
    id: 'TKT-004',
    title: 'Invoice email template missing logo',
    raised: 'Liana',
    date: '10 May',
    priority: 'High',
    status: 'Noted',
    cat: 'Bug',
    description: 'The invoice email template that gets sent when an invoice is marked "Sent" is missing the One to One company logo. The <img> tag is broken — the CDN path changed. Client-facing issue, needs urgent fix before next batch of invoices go out.',
    images: [],
    eta: '2026-05-18',
    adminNotes: 'Identified CDN link update. Applying fix soon.',
    rating: null,
    developerComments: []
  },
  {
    id: 'TKT-005',
    title: 'Time tracking export to CSV',
    raised: 'Martin',
    date: '8 May',
    priority: 'Low',
    status: 'Open',
    cat: 'Feature',
    description: 'PMs need to be able to export logged time entries to CSV for payroll and billing reporting. Should include columns: Date, Staff Member, Project, Task, Hours, Billable (Y/N). Nice-to-have: filter by date range before export.',
    images: [],
    eta: '',
    adminNotes: '',
    rating: null,
    developerComments: []
  },
];

const priorityColor = { High: 'b-danger', Medium: 'b-warning', Low: 'b-default' };
const statusColor = { 
  Open: 'b-warning', 
  'In progress': 'b-info', 
  Noted: 'b-default',
  Closed: 'b-success' 
};

export default function SupportPage() {
  const { user, isAdmin } = useAuth();
  
  const [tickets, setTickets] = useState(() => {
    const saved = localStorage.getItem('store_support_tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  const saveTickets = (updatedList) => {
    setTickets(updatedList);
    localStorage.setItem('store_support_tickets', JSON.stringify(updatedList));
  };

  const [filter, setFilter] = useState('All');
  
  // Views: 'list' | 'create' | 'detail'
  const [view, setView] = useState('list');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  
  // New ticket state
  const [form, setForm] = useState({ title: '', cat: 'Bug', priority: 'Medium', description: '' });
  const [formImages, setFormImages] = useState([]);

  // Admin response state
  const [adminEta, setAdminEta] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [adminStatus, setAdminStatus] = useState('Open');

  // Rating and staff feedback
  const [staffRating, setStaffRating] = useState(0);
  const [staffComment, setStaffComment] = useState('');

  // Find currently selected ticket
  const detailTicket = tickets.find(t => t.id === selectedTicketId);

  // Switch to detail view
  const handleOpenDetail = (t) => {
    setSelectedTicketId(t.id);
    setAdminEta(t.eta || '');
    setAdminNotes(t.adminNotes || '');
    setAdminStatus(t.status || 'Open');
    setStaffRating(t.rating || 0);
    setStaffComment('');
    setView('detail');
  };

  // Convert uploaded file to base64 for local persistence simulation
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Listen to clipboard paste inside the description field or the file-drop area
  const handlePasteImage = (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file') {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormImages(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  const handleRemoveImage = (index) => {
    setFormImages(prev => prev.filter((_, i) => i !== index));
  };

  const addTicket = () => {
    if (!form.title) return;
    const nextId = `TKT-${String(tickets.length + 1).padStart(3, '0')}`;
    const newTkt = {
      ...form,
      id: nextId,
      raised: user?.name || user?.email || 'Anonymous Staff',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      status: 'Open',
      images: formImages,
      eta: '',
      adminNotes: '',
      rating: null,
      developerComments: []
    };
    const updated = [...tickets, newTkt];
    saveTickets(updated);
    
    // Reset Form & Switch view
    setForm({ title: '', cat: 'Bug', priority: 'Medium', description: '' });
    setFormImages([]);
    setView('list');
  };

  const handleUpdateAdminResponse = () => {
    if (!detailTicket) return;
    const updated = tickets.map(t => {
      if (t.id === detailTicket.id) {
        const tObj = {
          ...t,
          eta: adminEta,
          adminNotes: adminNotes,
          status: adminStatus
        };
        // Auto set eta message for completed
        if (adminStatus === 'Closed') {
          tObj.eta = 'Completed';
        }
        return tObj;
      }
      return t;
    });
    saveTickets(updated);
    alert('Support ticket status and response updated successfully.');
  };

  const handleSubmittingFeedback = (e) => {
    e.preventDefault();
    if (!detailTicket) return;
    
    const updated = tickets.map(t => {
      if (t.id === detailTicket.id) {
        const comments = [...(t.developerComments || [])];
        if (staffComment.trim()) {
          comments.push({
            sender: user?.name || user?.email || 'Staff member',
            text: staffComment.trim(),
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          });
        }
        return {
          ...t,
          rating: staffRating || t.rating,
          developerComments: comments
        };
      }
      return t;
    });
    saveTickets(updated);
    setStaffComment('');
    alert('Thank you for rating my solution! Feedback submitted.');
  };

  const filtered = filter === 'All' ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 4px' }}>
      
      {/* 1. TICKET LIST VIEW */}
      {view === 'list' && (
        <>
          {/* HEADER BAR */}
          <div className="card" style={{ marginBottom: '16px', background: 'var(--bg-primary)' }}>
            <div className="card-body" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="av-md" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--text-danger)' }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Portal Upgrade & Support</h2>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>IT Desk: request system upgrades, report portal bugs, and track fix status.</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setView('create')}>+ New ticket</button>
            </div>
          </div>

          {/* KPI METRICS OVERVIEW */}
          <div className="stat-grid stat-grid-4" style={{ marginBottom: 18 }}>
            <div className="stat" style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700 }}>{tickets.length}</div>
              <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total tickets</div>
            </div>
            <div className="stat" style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid var(--text-warning)' }}>
              <div className="stat-value stat-warning" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-warning)' }}>
                {tickets.filter(t => t.status === 'Open').length}
              </div>
              <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Open tickets</div>
            </div>
            <div className="stat" style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid var(--text-info)' }}>
              <div className="stat-value stat-info" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-info)' }}>
                {tickets.filter(t => t.status === 'In progress').length}
              </div>
              <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>In progress</div>
            </div>
            <div className="stat" style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid var(--text-success)' }}>
              <div className="stat-value stat-success" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-success)' }}>
                {tickets.filter(t => t.status === 'Closed').length}
              </div>
              <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Resolved / Closed</div>
            </div>
          </div>

          {/* FILTER BUTTONS ROW */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '0.5px solid var(--border)' }}>
              {['All', 'Open', 'In progress', 'Noted', 'Closed'].map(s => (
                <button 
                  key={s} 
                  className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} 
                  style={{ border: 'none', background: filter === s ? 'var(--text-info)' : 'none', color: filter === s ? 'white' : 'var(--text-secondary)' }}
                  onClick={() => setFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* TICKETS LISTING TABLE */}
          <div className="card" style={{ border: '1px solid var(--border)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ padding: '12px' }}>Ticket</th>
                  <th>Title</th>
                  <th>Raised by</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Target ETA</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr
                    key={t.id}
                    className="clickable"
                    onClick={() => handleOpenDetail(t)}
                    style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                    title="Click to view full ticket details & response history"
                  >
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)', padding: '12px' }}>{t.id}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.title}</td>
                    <td>{t.raised}</td>
                    <td style={{ color: 'var(--text-tertiary)' }}>{t.date}</td>
                    <td><span className="badge b-default">{t.cat}</span></td>
                    <td><span className={`badge ${priorityColor[t.priority] || 'b-default'}`}>{t.priority}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-tertiary)' }}>{t.eta ? t.eta : '—'}</td>
                    <td><span className={`badge ${statusColor[t.status] || 'b-default'}`}>{t.status}</span></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                      No support tickets found in this section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 2. CREATE TICKET VIEW */}
      {view === 'create' && (
        <div className="card" style={{ maxWidth: '780px', margin: '0 auto', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <button className="btn btn-ghost" onClick={() => setView('list')} style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={16} style={{ marginRight: '4px' }} /> Back to List
            </button>
            <Sparkles size={20} color="var(--text-info)" />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Log System Error or Request Upgrade</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-row">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>Title *</label>
              <input 
                className="form-control" 
                placeholder="e.g. Sales tracker calculation margin bug..." 
                value={form.title} 
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
                style={{ borderRadius: '8px', padding: '10px 12px' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-row">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>Category</label>
                <select className="form-control" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))} style={{ borderRadius: '8px', padding: '8px 10px' }}>
                  <option>Bug</option>
                  <option>Feature Upgrade</option>
                  <option>Design Issue</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-row">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>Urgency / Priority</label>
                <select className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ borderRadius: '8px', padding: '8px 10px' }}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>Detailed Explanation *</label>
              <textarea
                className="form-control"
                rows={5}
                placeholder="Describe step-by-step what is wrong, what page, or what upgrade you would like... (You can paste copied screenshots directly in this field!)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                onPaste={handlePasteImage}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '13px', borderRadius: '8px', padding: '12px' }}
              />
            </div>

            <div className="form-row">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>Supporting Screen Mockups (Upload or Paste)</label>
              
              <div 
                onPaste={handlePasteImage}
                style={{ 
                  border: '2px dashed var(--border)', 
                  borderRadius: '12px', 
                  padding: '28px 16px', 
                  textAlign: 'center', 
                  background: 'var(--bg-secondary)', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => document.getElementById('support-file-uploader').click()}
              >
                <Upload size={24} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Click to upload files, or paste screenshots directly (Ctrl+V)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>PNG, JPG, JPEG supported</div>
                
                <input 
                  type="file" 
                  id="support-file-uploader" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                />
              </div>

              {formImages.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {formImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                      <img 
                        src={img} 
                        alt="preview" 
                        style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} 
                      />
                      <button 
                        type="button"
                        onClick={() => handleRemoveImage(idx)} 
                        style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: 'red', color: 'white', border: 'none', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn" onClick={() => setView('list')} style={{ borderRadius: '8px', padding: '8px 16px' }}>Cancel</button>
            <button className="btn btn-primary" onClick={addTicket} disabled={!form.title.trim()} style={{ borderRadius: '8px', padding: '8px 20px' }}>Submit Ticket</button>
          </div>
        </div>
      )}

      {/* 3. TICKET DETAIL VIEW */}
      {view === 'detail' && detailTicket && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <button className="btn btn-ghost" onClick={() => setView('list')} style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={16} style={{ marginRight: '4px' }} /> Back to List
            </button>
            <FileText size={20} color="var(--text-info)" />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{detailTicket.id} — {detailTicket.title}</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 320px' : '1fr', gap: '24px' }}>
            
            {/* LEFT COLUMN: Issue Info, Mockups & Feedback */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Meta Attributes Panel */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>RAISED BY</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{detailTicket.raised}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>DATE LOGGED</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{detailTicket.date}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>TICKET CATEGORY</span>
                  <span className="badge b-default" style={{ marginTop: '4px', display: 'inline-block' }}>{detailTicket.cat}</span>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>URGENCY LEVEL</span>
                  <span className={`badge ${priorityColor[detailTicket.priority] || 'b-default'}`} style={{ marginTop: '4px', display: 'inline-block' }}>{detailTicket.priority}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700, letterSpacing: '0.5px' }}>STATUS</span>
                  <span className={`badge ${statusColor[detailTicket.status] || 'b-default'}`} style={{ marginTop: '4px', display: 'inline-block' }}>{detailTicket.status}</span>
                </div>
              </div>

              {/* Ticket Description */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Explanation</h4>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', fontSize: '13.5px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {detailTicket.description}
                </div>
              </div>

              {/* Ticket Screenshot Mockups */}
              {detailTicket.images && detailTicket.images.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Attached Screenshots & Images</h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {detailTicket.images.map((img, i) => (
                      <a href={img} target="_blank" rel="noopener noreferrer" key={i} style={{ display: 'block', maxWidth: '30%' }}>
                        <img 
                          src={img} 
                          alt="ticket-attachment" 
                          style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'zoom-in', transition: 'transform 0.2s' }} 
                          className="hover-scale"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Developer Response Notes */}
              {(detailTicket.eta || detailTicket.adminNotes) && (
                <div style={{ padding: '16px', background: 'rgba(24, 95, 165, 0.05)', borderRadius: '12px', border: '1px solid rgba(24, 95, 165, 0.2)' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>IT Specialist Response</h4>
                  {detailTicket.eta && (
                    <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                      <strong>Estimated Delivery (ETA):</strong> <span style={{ fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '3px 6px', borderRadius: '4px', fontSize: '12px' }}>{detailTicket.eta}</span>
                    </div>
                  )}
                  {detailTicket.adminNotes && (
                    <div style={{ fontSize: '13.5px', fontStyle: 'italic', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      "{detailTicket.adminNotes}"
                    </div>
                  )}
                </div>
              )}

              {/* Staff Discussion & Feedback Timeline */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Staff discussion ({detailTicket.developerComments?.length || 0})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {detailTicket.developerComments?.map((comm, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        <strong>{comm.sender}</strong>
                        <span>{comm.date}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{comm.text}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STAFF REVIEW / RESOLUTION RATING FORM (visible to non-admins or once ticket is Closed) */}
              {detailTicket.status === 'Closed' ? (
                <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-success)', fontWeight: 700 }}>Solution Rating & Feedback</h4>
                  
                  {detailTicket.rating ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Staff Rating:</span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map(stars => (
                          <Star 
                            key={stars} 
                              size={18} 
                              fill={stars <= detailTicket.rating ? '#eab308' : 'none'} 
                              color={stars <= detailTicket.rating ? '#eab308' : 'var(--text-tertiary)'} 
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmittingFeedback}>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        This ticket has been marked completed. Rate the upgrade/fix quality:
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
                        {[1, 2, 3, 4, 5].map(stars => (
                          <button
                            type="button"
                            key={stars}
                            onClick={() => setStaffRating(stars)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <Star 
                              size={24} 
                              fill={stars <= staffRating ? '#eab308' : 'none'} 
                              color={stars <= staffRating ? '#eab308' : 'var(--text-tertiary)'} 
                            />
                          </button>
                        ))}
                      </div>

                      <div className="form-row">
                        <textarea 
                          className="form-control" 
                          rows={2} 
                          placeholder="Add a comment on how this resolution helps your workflow..." 
                          value={staffComment}
                          onChange={e => setStaffComment(e.target.value)}
                          style={{ fontSize: '12px', borderRadius: '8px' }}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '8px', background: 'var(--text-success)', borderColor: 'var(--text-success)', borderRadius: '6px' }}>
                        Submit Rating
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                // Open/In progress tickets staff can append chat/comments
                <form onSubmit={handleSubmittingFeedback} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Ask the IT Admin for updates..."
                    value={staffComment}
                    onChange={e => setStaffComment(e.target.value)}
                    style={{ fontSize: '13px', borderRadius: '8px' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ height: '34px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '8px' }}>
                    <Send size={14} /> Send
                  </button>
                </form>
              )}

            </div>

            {/* RIGHT COLUMN: IT ADMIN CONTROLS GATE (Visible only if logged in as Admin) */}
            {isAdmin && (
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px', color: 'var(--text-secondary)' }}>IT Admin Controls</h3>
                
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Resolution Status</label>
                  <select className="form-control" value={adminStatus} onChange={e => setAdminStatus(e.target.value)} style={{ borderRadius: '8px', padding: '8px 10px' }}>
                    <option value="Open">Open</option>
                    <option value="In progress">In progress</option>
                    <option value="Noted">Noted</option>
                    <option value="Closed">Closed (Completed)</option>
                  </select>
                </div>

                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Estimated Completion Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={adminStatus === 'Closed' ? 'Completed' : adminEta} 
                    disabled={adminStatus === 'Closed'}
                    onChange={e => setAdminEta(e.target.value)} 
                    style={{ borderRadius: '8px', padding: '8px 10px' }}
                  />
                </div>

                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Admin Response / ETA Notes</label>
                  <textarea 
                    className="form-control" 
                    rows={5} 
                    placeholder="Explain when this will be resolved, why it occurred, or specify what in progress work has started..." 
                    value={adminNotes} 
                    onChange={e => setAdminNotes(e.target.value)}
                    style={{ fontSize: '12px', borderRadius: '8px', padding: '10px' }}
                  />
                </div>

                <button className="btn btn-primary" onClick={handleUpdateAdminResponse} style={{ width: '100%', borderRadius: '8px', padding: '10px' }}>
                  Update Response
                </button>
              </div>
            )}

          </div>
          
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setView('list')} style={{ borderRadius: '8px', padding: '8px 16px' }}>Close Detail View</button>
          </div>
        </div>
      )}

    </div>
  );
}

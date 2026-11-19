import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Mail,
  RefreshCw,
  Search,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Save,
  Loader2,
  Calendar,
  Users
} from 'lucide-react';
import { API_BASE } from '../../api_config';

const REPORT_META = [
  { key: 'OPEN_POS', label: 'Open POs', color: '#0284c7' },
  { key: 'PF_SENT', label: 'PF Sent', color: '#8b5cf6' },
  { key: 'TO_BE_INVOICED', label: 'To Be Invoiced', color: '#d97706' },
  { key: 'SALES', label: 'Sales', color: '#059669' },
  { key: 'PIPELINE', label: 'Pipeline', color: '#2563eb' },
  { key: 'STOCK', label: 'Stock', color: '#475569' }
];

const DIVISIONS = [
  'ALL',
  'MODUS PROFESSIONAL ( Ryan )',
  'MODUS PROJECTS ( Dani )',
  'PROJECTS (Dani own)',
  'MODUS SIGNATURE ( Thando )',
  'MADE ( Jon-Peer)',
  'MOOD STORES',
  'LUXELINE'
];

const fmtZAR = (v) =>
  `R ${Number(v || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WeeklyReportsWorkspace({ initialMode = 'reports' }) {
  const navigate = useNavigate();
  const [subMode, setSubMode] = useState(initialMode); // 'reports' | 'schedule'
  const [activeReport, setActiveReport] = useState('OPEN_POS');
  const [allData, setAllData] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  // Schedule & Recipients state
  const [schedConfig, setSchedConfig] = useState({
    enabled: true,
    day_of_week: 'Monday',
    time_sast: '07:00',
    recipients: [],
    dispatch_history: [],
    smtp_configured: false
  });
  const [savingSched, setSavingSched] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchNotice, setDispatchNotice] = useState(null);
  const [newRecName, setNewRecName] = useState('');
  const [newRecEmail, setNewRecEmail] = useState('');
  const [newRecDiv, setNewRecDiv] = useState('ALL');

  const fetchWeeklyData = async () => {
    setLoading(true);
    try {
      const scope = divisionFilter !== 'ALL' ? 'OWN' : 'ALL';
      const url = `${API_BASE}/api/reports/weekly-data?report_type=ALL&scope=${scope}&division=${encodeURIComponent(divisionFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAllData(data || {});
      }
    } catch (err) {
      console.error('Failed to load weekly report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/schedule-config`);
      if (res.ok) {
        const data = await res.json();
        setSchedConfig(data);
      }
    } catch (err) {
      console.error('Failed to load schedule config:', err);
    }
  };

  useEffect(() => {
    fetchWeeklyData();
  }, [divisionFilter]);

  useEffect(() => {
    fetchScheduleConfig();
  }, []);

  useEffect(() => {
    setSubMode(initialMode);
  }, [initialMode]);

  const currentReport = allData[activeReport] || { title: activeReport, kpis: [], columns: [], rows: [] };

  const filteredRows = useMemo(() => {
    let rows = [...(currentReport.rows || [])];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter(r =>
        Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      rows.sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va;
        }
        return sortDir === 'asc'
          ? String(va ?? '').localeCompare(String(vb ?? ''))
          : String(vb ?? '').localeCompare(String(va ?? ''));
      });
    }
    return rows;
  }, [currentReport, searchQuery, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleDownloadExcel = () => {
    const scope = divisionFilter !== 'ALL' ? 'OWN' : 'ALL';
    const url = `${API_BASE}/api/reports/export-excel?report_type=${activeReport}&scope=${scope}&division=${encodeURIComponent(divisionFilter)}`;
    window.open(url, '_blank');
  };

  const handleSaveSchedule = async (overrideCfg = null) => {
    setSavingSched(true);
    setDispatchNotice(null);
    try {
      const payload = overrideCfg || schedConfig;
      const res = await fetch(`${API_BASE}/api/reports/schedule-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: payload.enabled,
          day_of_week: payload.day_of_week,
          time_sast: payload.time_sast,
          recipients: payload.recipients
        })
      });
      if (res.ok) {
        setDispatchNotice({ type: 'success', text: 'Schedule & recipient matrix saved.' });
      }
    } catch (err) {
      setDispatchNotice({ type: 'error', text: err.message || 'Failed to save schedule.' });
    } finally {
      setSavingSched(false);
    }
  };

  const handleAddRecipient = () => {
    if (!newRecEmail.trim()) return;
    const newRec = {
      id: `rec_${Date.now()}`,
      name: newRecName.trim() || newRecEmail.split('@')[0],
      email: newRecEmail.trim(),
      division: newRecDiv,
      scope: newRecDiv !== 'ALL' ? 'OWN' : 'ALL',
      reports: ['OPEN_POS', 'PF_SENT', 'TO_BE_INVOICED', 'SALES', 'PIPELINE', 'STOCK'],
      active: true
    };
    const updated = { ...schedConfig, recipients: [...(schedConfig.recipients || []), newRec] };
    setSchedConfig(updated);
    setNewRecName('');
    setNewRecEmail('');
    setNewRecDiv('ALL');
  };

  const toggleRecipientReport = (recId, reportKey) => {
    setSchedConfig(prev => ({
      ...prev,
      recipients: prev.recipients.map(r => {
        if (r.id !== recId) return r;
        const has = (r.reports || []).includes(reportKey);
        return {
          ...r,
          reports: has ? r.reports.filter(k => k !== reportKey) : [...(r.reports || []), reportKey]
        };
      })
    }));
  };

  const handleDispatchNow = async (recipientId = null) => {
    setDispatching(true);
    setDispatchNotice(null);
    try {
      // Save latest matrix first
      await handleSaveSchedule(schedConfig);
      const res = await fetch(`${API_BASE}/api/reports/weekly-dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipientId ? { recipient_id: recipientId } : {})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Dispatch failed');

      if (data.status === 'smtp_not_configured') {
        setDispatchNotice({
          type: 'warning',
          text: `${data.message} Verified ${data.would_send_to?.length || 0} recipient(s).`
        });
      } else {
        setDispatchNotice({
          type: 'success',
          text: `Sent weekly Excel emails to ${data.sent_count} recipient(s)!`
        });
        fetchScheduleConfig();
      }
    } catch (err) {
      setDispatchNotice({ type: 'error', text: err.message });
    } finally {
      setDispatching(false);
    }
  };

  const renderBadge = (val) => {
    const s = String(val || '');
    const low = s.toLowerCase();
    let bg = '#f1f5f9';
    let color = '#475569';
    if (low.includes('out of stock') || low.includes('unallocated') || low.includes('awaiting')) {
      bg = '#fef2f2'; color = '#dc2626';
    } else if (low.includes('partial') || low.includes('low stock')) {
      bg = '#fffbeb'; color = '#d97706';
    } else if (low.includes('allocated') || low.includes('in stock') || low.includes('this week')) {
      bg = '#ecfdf5'; color = '#059669';
    }
    return (
      <span style={{ background: bg, color, padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {s}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* SUB-MODE SWITCHER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${subMode === 'reports' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSubMode('reports')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FileSpreadsheet size={14} /> Weekly Action Reports
          </button>
          <button
            type="button"
            className={`btn btn-sm ${subMode === 'schedule' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSubMode('schedule')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Mail size={14} /> Schedule &amp; Recipients ({(schedConfig.recipients || []).filter(r => r.active).length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={fetchWeeklyData}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {subMode === 'reports' ? (
        <>
          {/* 6 REPORT SELECTOR CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '10px' }}>
            {REPORT_META.map(meta => {
              const rep = allData[meta.key];
              const isActive = activeReport === meta.key;
              const rowCount = rep?.rows?.length ?? '—';
              const primaryKpi = rep?.kpis?.find(k => k.format === 'currency') || rep?.kpis?.[0];
              return (
                <button
                  key={meta.key}
                  type="button"
                  onClick={() => { setActiveReport(meta.key); setSortKey(null); }}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid',
                    borderColor: isActive ? meta.color : 'var(--border)',
                    background: isActive ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                    boxShadow: isActive ? `0 4px 12px ${meta.color}22` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: isActive ? meta.color : 'var(--text-primary)' }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, background: 'var(--bg-primary)', padding: '1px 7px', borderRadius: '999px', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      {rowCount}
                    </span>
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {primaryKpi ? (primaryKpi.format === 'currency' ? fmtZAR(primaryKpi.value) : primaryKpi.value) : 'Loading...'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* FILTER BAR & EXCEL EXPORT */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            background: 'var(--bg-primary)',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '240px', flex: '0 1 300px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
                  placeholder={`Search ${currentReport.title}...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="form-control"
                style={{ width: 'auto', minWidth: '210px', height: '34px', fontSize: '12px' }}
                value={divisionFilter}
                onChange={e => setDivisionFilter(e.target.value)}
              >
                {DIVISIONS.map(d => (
                  <option key={d} value={d}>{d === 'ALL' ? 'All Divisions / Company-Wide' : d}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={handleDownloadExcel}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Download size={14} /> Download Excel (.xlsx)
            </button>
          </div>

          {/* REPORT KPI STRIP */}
          {currentReport.kpis && currentReport.kpis.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${currentReport.kpis.length}, minmax(0, 1fr))`, gap: '10px' }}>
              {currentReport.kpis.map((kpi, idx) => (
                <div key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{kpi.label}</div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    marginTop: '4px',
                    fontFamily: 'monospace',
                    color: kpi.tone === 'danger' ? '#dc2626' : kpi.tone === 'warning' ? '#d97706' : 'var(--text-primary)'
                  }}>
                    {kpi.format === 'currency' ? fmtZAR(kpi.value) : Number(kpi.value || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* REPORT DATA TABLE */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', maxHeight: '560px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2 }}>
                  <tr>
                    {(currentReport.columns || []).map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        style={{
                          padding: '11px 12px',
                          background: '#f8fafc',
                          color: '#0f172a',
                          borderBottom: '2px solid #cbd5e1',
                          textAlign: col.type === 'currency' || col.type === 'number' ? 'right' : 'left',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={(currentReport.columns || []).length || 1} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Loader2 size={20} className="animate-spin" style={{ display: 'inline-block', marginRight: '8px' }} />
                        Loading live report data...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={(currentReport.columns || []).length || 1} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No rows match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        {(currentReport.columns || []).map(col => {
                          const val = row[col.key];
                          if (col.type === 'currency') {
                            return (
                              <td key={col.key} style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {fmtZAR(val)}
                              </td>
                            );
                          }
                          if (col.type === 'number') {
                            return (
                              <td key={col.key} style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                {col.key === 'days_overdue' && Number(val) > 0 ? (
                                  <span style={{ color: '#dc2626', fontWeight: 700 }}>{val}d</span>
                                ) : (
                                  Number(val || 0).toLocaleString()
                                )}
                              </td>
                            );
                          }
                          if (col.type === 'badge') {
                            return <td key={col.key} style={{ padding: '9px 12px' }}>{renderBadge(val)}</td>;
                          }
                          if (col.key === 'po_number' && String(val).startsWith('Q-')) {
                            return (
                              <td key={col.key} style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700 }}>
                                <span
                                  onClick={() => navigate(`/orders?po=${encodeURIComponent(val)}`)}
                                  style={{ color: '#0284c7', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                  {val}
                                </span>
                              </td>
                            );
                          }
                          return (
                            <td key={col.key} style={{ padding: '9px 12px', color: 'var(--text-primary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(val ?? '')}>
                              {val ?? '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* SCHEDULE & RECIPIENTS MATRIX */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {dispatchNotice && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              background: dispatchNotice.type === 'success' ? '#ecfdf5' : dispatchNotice.type === 'warning' ? '#fffbeb' : '#fef2f2',
              color: dispatchNotice.type === 'success' ? '#047857' : dispatchNotice.type === 'warning' ? '#b45309' : '#dc2626',
              border: '1px solid currentColor'
            }}>
              {dispatchNotice.text}
            </div>
          )}

          {/* GLOBAL SCHEDULE HEADER */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!schedConfig.enabled}
                  onChange={e => setSchedConfig(p => ({ ...p, enabled: e.target.checked }))}
                />
                Weekly Auto-Send Enabled
              </label>

              <select
                className="form-control"
                style={{ width: 'auto', height: '32px', fontSize: '12px' }}
                value={schedConfig.day_of_week}
                onChange={e => setSchedConfig(p => ({ ...p, day_of_week: e.target.value }))}
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <input
                type="time"
                className="form-control"
                style={{ width: 'auto', height: '32px', fontSize: '12px' }}
                value={schedConfig.time_sast}
                onChange={e => setSchedConfig(p => ({ ...p, time_sast: e.target.value }))}
              />

              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: schedConfig.smtp_configured ? '#ecfdf5' : '#fffbeb',
                color: schedConfig.smtp_configured ? '#047857' : '#b45309',
                border: '1px solid currentColor'
              }}>
                {schedConfig.smtp_configured ? 'SMTP Email Ready' : 'SMTP Not Configured (Dry-Run Mode)'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleSaveSchedule()}
                disabled={savingSched}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Save size={13} /> {savingSched ? 'Saving...' : 'Save Schedule'}
              </button>
              <button
                type="button"
                className="btn btn-warning btn-sm"
                onClick={() => handleDispatchNow(null)}
                disabled={dispatching}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Send size={13} /> {dispatching ? 'Sending...' : 'Send Now to All Active'}
              </button>
            </div>
          </div>

          {/* ADD RECIPIENT BAR */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              className="form-control"
              style={{ width: '160px', height: '32px', fontSize: '12px' }}
              placeholder="Team Member Name"
              value={newRecName}
              onChange={e => setNewRecName(e.target.value)}
            />
            <input
              type="email"
              className="form-control"
              style={{ width: '230px', height: '32px', fontSize: '12px' }}
              placeholder="Email (e.g. ryan@1-to-1.world)"
              value={newRecEmail}
              onChange={e => setNewRecEmail(e.target.value)}
            />
            <select
              className="form-control"
              style={{ width: '220px', height: '32px', fontSize: '12px' }}
              value={newRecDiv}
              onChange={e => setNewRecDiv(e.target.value)}
            >
              {DIVISIONS.map(d => (
                <option key={d} value={d}>{d === 'ALL' ? 'Scope: All Company' : `Own: ${d}`}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleAddRecipient}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={13} /> Add Recipient
            </button>
          </div>

          {/* RECIPIENT MATRIX TABLE */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', textAlign: 'left', background: '#f8fafc', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>Team Member</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', background: '#f8fafc', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>Scope / Division</th>
                  {REPORT_META.map(m => (
                    <th key={m.key} style={{ padding: '10px 8px', textAlign: 'center', fontSize: '10.5px', background: '#f8fafc', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>{m.label}</th>
                  ))}
                  <th style={{ padding: '10px 10px', textAlign: 'center', background: '#f8fafc', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>Active</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', background: '#f8fafc', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(schedConfig.recipients || []).length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No recipients added yet. Add a team member above and click Save Schedule.
                    </td>
                  </tr>
                ) : (
                  schedConfig.recipients.map(rec => (
                    <tr key={rec.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700 }}>{rec.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{rec.email}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <select
                          className="form-control"
                          style={{ height: '28px', fontSize: '11px', width: '185px' }}
                          value={rec.scope === 'OWN' ? (rec.division || 'ALL') : 'ALL'}
                          onChange={e => {
                            const val = e.target.value;
                            setSchedConfig(prev => ({
                              ...prev,
                              recipients: prev.recipients.map(r =>
                                r.id === rec.id ? { ...r, division: val, scope: val === 'ALL' ? 'ALL' : 'OWN' } : r
                              )
                            }));
                          }}
                        >
                          {DIVISIONS.map(d => (
                            <option key={d} value={d}>{d === 'ALL' ? 'All Company' : `Own: ${d}`}</option>
                          ))}
                        </select>
                      </td>
                      {REPORT_META.map(m => (
                        <td key={m.key} style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={(rec.reports || []).includes(m.key)}
                            onChange={() => toggleRecipientReport(rec.id, m.key)}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!rec.active}
                          onChange={() => setSchedConfig(prev => ({
                            ...prev,
                            recipients: prev.recipients.map(r => (r.id === rec.id ? { ...r, active: !r.active } : r))
                          }))}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleDispatchNow(rec.id)}
                          title="Send test email to this person"
                          style={{ color: '#0284c7', marginRight: '6px' }}
                        >
                          <Send size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setSchedConfig(prev => ({ ...prev, recipients: prev.recipients.filter(r => r.id !== rec.id) }))}
                          title="Remove recipient"
                          style={{ color: '#dc2626' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

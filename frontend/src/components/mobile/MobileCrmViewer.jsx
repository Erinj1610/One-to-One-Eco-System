import React, { useState, useMemo } from 'react';
import { Search, Phone, Mail, User, Building2, Briefcase, ChevronRight, AlertCircle } from 'lucide-react';

export default function MobileCrmViewer({ contacts = [], projects = {}, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const filteredContacts = useMemo(() => {
    return (contacts || []).filter(c => {
      if (!c) return false;
      const name = (c.name || '').toLowerCase();
      const comp = (c.company || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || name.includes(term) || comp.includes(term) || email.includes(term) || phone.includes(term);
      const matchesType = typeFilter === 'All' || (c.type || '').toLowerCase() === typeFilter.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [contacts, searchTerm, typeFilter]);

  const typeColor = (type) => {
    switch (type) {
      case 'Architect': return 'b-info';
      case 'Developer': return 'b-success';
      case 'Interior': return 'b-warning';
      default: return 'b-default';
    }
  };

  return (
    <div style={{ paddingBottom: '24px' }}>
      {/* SEARCH AND TYPE FILTER */}
      <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search clients, companies, phones..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '13px', borderRadius: '10px', height: '38px', background: 'var(--bg-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {['All', 'Architect', 'Developer', 'Interior', 'Private'].map(filter => {
            const active = typeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setTypeFilter(filter)}
                className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: active ? 'none' : '1px solid var(--border)'
                }}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* CLIENT CARDS FEED */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredContacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <AlertCircle size={24} color="var(--text-tertiary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No clients found</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Try adjusting your search query or filter.
            </div>
          </div>
        ) : (
          filteredContacts.map(c => {
            const initials = (c.name || 'C').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
            const projCount = c.projects || Object.values(projects).filter(p => (p.client || '').toLowerCase() === (c.name || '').toLowerCase()).length || 0;

            return (
              <div key={c.id || c.name} className="mobile-feed-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: 'var(--text-info)',
                      fontWeight: 800,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {initials}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {c.name}
                      </h4>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                        {c.company || 'Direct Client'}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${typeColor(c.type)}`} style={{ fontSize: '9.5px', padding: '2px 7px' }}>
                    {c.type || 'Client'}
                  </span>
                </div>

                {/* METRICS ROW */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '6px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '11px',
                  marginTop: '2px'
                }}>
                  <div>
                    <span style={{ fontSize: '8.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Portfolio Projects
                    </span>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginTop: '1px' }}>
                      {projCount} Project(s)
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '8.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Lifetime Value
                    </span>
                    <strong style={{ color: 'var(--text-success)', display: 'block', marginTop: '1px' }}>
                      R {Number(c.lifetimeRevenue || 0) > 0 ? (Number(c.lifetimeRevenue) / 1000).toFixed(0) + 'k' : '—'}
                    </strong>
                  </div>
                </div>

                {/* ONE-TAP CONTACT ACTIONS */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="btn btn-sm"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        background: 'rgba(16, 185, 129, 0.08)',
                        color: '#10b981',
                        borderColor: 'rgba(16, 185, 129, 0.25)',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        padding: '6px 0'
                      }}
                    >
                      <Phone size={13} />
                      <span>{c.phone}</span>
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="btn btn-sm"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        background: 'rgba(59, 130, 246, 0.08)',
                        color: 'var(--text-info)',
                        borderColor: 'rgba(59, 130, 246, 0.25)',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        padding: '6px 0'
                      }}
                    >
                      <Mail size={13} />
                      <span>Email</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

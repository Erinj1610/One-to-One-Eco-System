import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Phone, ExternalLink, Copy, Check, Users } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

/**
 * ClientPeekCard
 * Wraps any client name in tables across the portal.
 * Hovering opens an instant floating studio peek card with contact info, LTV, and quick actions.
 */
export default function ClientPeekCard({ clientName, style = {}, className = '' }) {
  const [isHovered, setIsHovered] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const { contacts = [], projects = {} } = useStore();

  if (!clientName || clientName === '—' || clientName === '-') {
    return <span style={{ color: '#94a3b8' }}>—</span>;
  }

  // Find contact by matching name or company
  const contact = contacts.find(c => 
    c?.name?.toLowerCase().trim() === clientName.toLowerCase().trim() ||
    c?.company?.toLowerCase().trim() === clientName.toLowerCase().trim()
  );

  // Calculate active projects for this client
  const clientProjects = Object.values(projects || {}).filter(p => 
    p?.client?.toLowerCase().trim() === clientName.toLowerCase().trim()
  );

  const ltv = contact?.totalValue || clientProjects.reduce((sum, p) => {
    const orders = Array.isArray(p.orders) ? p.orders : Object.values(p.orders || {});
    return sum + orders.reduce((s, o) => s + Number(o.total_price || o.totalValue || o.value || 0), 0);
  }, 0);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 280);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsHovered(false);
  };

  const copyToClipboard = (e, text, field) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <span 
      style={{ position: 'relative', display: 'inline-block', ...style }}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={e => e.stopPropagation()}
    >
      <span 
        style={{ 
          color: '#0f172a', 
          fontWeight: 600, 
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'color 0.1s ease',
          borderBottom: '1px dotted #cbd5e1'
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#2563eb'}
        onMouseLeave={e => e.currentTarget.style.color = '#0f172a'}
        onClick={() => navigate('/crm', { state: { selectedClientName: clientName } })}
      >
        {clientName}
      </span>

      {isHovered && (
        <div 
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            width: '280px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.18), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
            padding: '14px 16px',
            zIndex: 9999,
            animation: 'fadeIn 0.15s ease',
            pointerEvents: 'auto',
            textAlign: 'left'
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: '2px' }}>
                CLIENT CARD
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                {contact?.name || clientName}
              </div>
              {contact?.company && contact.company !== contact.name && (
                <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Building2 size={11} color="#94a3b8" /> {contact.company}
                </div>
              )}
            </div>

            <span style={{ 
              fontSize: '10px', 
              fontWeight: 700, 
              padding: '2px 7px', 
              borderRadius: '4px', 
              background: '#f1f5f9', 
              color: '#475569',
              border: '1px solid #e2e8f0'
            }}>
              {contact?.type || 'Account'}
            </span>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '9.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Lifetime Value</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                R {Math.round(ltv).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '9.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Active Projects</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                {clientProjects.length} {clientProjects.length === 1 ? 'Site' : 'Sites'}
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', color: '#475569', marginBottom: '12px' }}>
            {contact?.email ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Mail size={12} color="#64748b" /> {contact.email}
                </span>
                <button
                  type="button"
                  onClick={e => copyToClipboard(e, contact.email, 'email')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 4px', color: copiedField === 'email' ? '#16a34a' : '#94a3b8' }}
                  title="Copy email"
                >
                  {copiedField === 'email' ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            ) : null}

            {contact?.phone ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={12} color="#64748b" /> {contact.phone}
                </span>
                <button
                  type="button"
                  onClick={e => copyToClipboard(e, contact.phone, 'phone')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 4px', color: copiedField === 'phone' ? '#16a34a' : '#94a3b8' }}
                  title="Copy phone"
                >
                  {copiedField === 'phone' ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            ) : null}
          </div>

          {/* Action Link to Full CRM Profile */}
          <button
            type="button"
            onClick={() => navigate('/crm', { state: { selectedClientName: clientName } })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <Users size={12} /> Open Full CRM Profile <ExternalLink size={10} />
          </button>
        </div>
      )}
    </span>
  );
}

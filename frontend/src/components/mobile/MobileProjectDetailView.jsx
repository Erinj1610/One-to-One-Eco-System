import React, { useState } from 'react';
import { 
  ArrowLeft, Phone, Mail, User, Briefcase, Calendar, 
  MapPin, Clock, DollarSign, CheckCircle2, ChevronRight, 
  Layers, PackageCheck, AlertCircle, FileText
} from 'lucide-react';

export default function MobileProjectDetailView({ project, onBack }) {
  const [activeTab, setActiveTab] = useState('fees');

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <AlertCircle size={32} color="var(--text-tertiary)" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Project Not Found</div>
        <button type="button" onClick={onBack} className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Projects
        </button>
      </div>
    );
  }

  const {
    key,
    name,
    client,
    clientCompany,
    clientPhone,
    clientEmail,
    pm,
    pmName,
    stage = 'Stage 1',
    status = 'On track',
    complete,
    start,
    end,
    feeValue = 0,
    paid = '0',
    outstanding = '0',
    designFees = [],
    orders = [],
    description,
    address
  } = project;

  const isComplete = complete === 'Complete';
  const numericFee = Number(feeValue) || 0;
  const numericPaid = parseInt(String(paid).replace(/[^\d]/g, ''), 10) || 0;
  const numericOutstanding = Math.max(0, numericFee - numericPaid);

  const displayClient = clientCompany || client || 'Direct Client';
  const displayPm = pmName || pm || 'Unassigned';

  // Orders total
  let totalOrderVal = 0;
  let totalOrderPaid = 0;
  orders.forEach(o => {
    totalOrderVal += Number(o.value || 0);
    totalOrderPaid += Number(o.paid || 0);
  });

  return (
    <div style={{ paddingBottom: '30px' }}>
      {/* SUB-PAGE BACK HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '14px',
        paddingTop: '2px'
      }}>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-ghost btn-sm"
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 700,
            background: 'var(--bg-primary)'
          }}
        >
          <ArrowLeft size={14} />
          <span>Projects Directory</span>
        </button>
      </div>

      {/* PROJECT TITLE & CLIENT SUMMARY CARD */}
      <div className="card" style={{ padding: '16px', marginBottom: '14px', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
            {key}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span className={`badge ${isComplete ? 'b-success' : stage === 'Stage 1' ? 'b-warning' : 'b-info'}`} style={{ fontSize: '10px' }}>
              {isComplete ? 'Complete' : stage}
            </span>
            {status && status !== 'On track' && (
              <span className="badge b-danger" style={{ fontSize: '10px' }}>
                {status}
              </span>
            )}
          </div>
        </div>

        <h2 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
          {name}
        </h2>

        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          {displayClient} • PM: <strong style={{ color: 'var(--text-primary)' }}>{displayPm}</strong>
        </div>

        {/* ONE-TAP CONTACT ACTIONS */}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
          {clientPhone && (
            <a
              href={`tel:${clientPhone}`}
              className="btn btn-sm"
              style={{
                flex: 1,
                justifyContent: 'center',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                textDecoration: 'none',
                fontWeight: 700
              }}
            >
              <Phone size={13} />
              <span>Call Client</span>
            </a>
          )}
          {clientEmail && (
            <a
              href={`mailto:${clientEmail}`}
              className="btn btn-sm"
              style={{
                flex: 1,
                justifyContent: 'center',
                background: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--text-info)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
                textDecoration: 'none',
                fontWeight: 700
              }}
            >
              <Mail size={13} />
              <span>Email Client</span>
            </a>
          )}
        </div>
      </div>

      {/* 2X2 FINANCIAL VITALS (NEVER CLIPPED ON MOBILE) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Project Value</span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            R {Math.round(numericFee).toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Value Paid</span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-success)', marginTop: '2px' }}>
            R {Math.round(numericPaid).toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Outstanding</span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: numericOutstanding > 0 ? 'var(--text-warning)' : 'var(--text-success)', marginTop: '2px' }}>
            R {Math.round(numericOutstanding).toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Status / Stage</span>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-info)', marginTop: '2px' }}>
            {isComplete ? 'Complete' : stage}
          </div>
        </div>
      </div>

      {/* READ-ONLY TABS */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-secondary)',
        borderRadius: '10px',
        padding: '3px',
        marginBottom: '14px'
      }}>
        {[
          { id: 'fees', label: `Design Sub-Fees (${designFees.length})` },
          { id: 'orders', label: `Orders (${orders.length})` },
          { id: 'info', label: 'Info' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '7px 4px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-info)' : 'var(--text-secondary)',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: DESIGN SUB-FEES */}
      {activeTab === 'fees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {designFees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No design sub-fees logged for this project.</div>
            </div>
          ) : (
            designFees.map((fee, idx) => {
              const feeVal = Number(fee.feeValue || 0);
              const feePaid = Number(fee.paid || 0);
              const feeBalance = Math.max(0, feeVal - feePaid);
              const feeStatus = fee.status || (feePaid >= feeVal && feeVal > 0 ? 'Paid' : feePaid > 0 ? 'Partially Paid' : 'Unpaid');

              return (
                <div key={fee.id || idx} className="mobile-feed-card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {fee.stageName || fee.name || `Stage ${idx + 1}`}
                    </span>
                    <span className={`badge ${feeStatus === 'Paid' ? 'b-success' : feeStatus === 'Partially Paid' ? 'b-info' : 'b-warning'}`} style={{ fontSize: '9.5px' }}>
                      {feeStatus}
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '4px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '11px',
                    marginTop: '4px'
                  }}>
                    <div>
                      <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Fee Ex</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                        R {Math.round(feeVal).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Paid</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-success)', marginTop: '1px' }}>
                        R {Math.round(feePaid).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Balance</span>
                      <div style={{ fontWeight: 700, color: feeBalance > 0 ? 'var(--text-warning)' : 'var(--text-success)', marginTop: '1px' }}>
                        R {Math.round(feeBalance).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: HARDWARE ORDERS */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No hardware orders attached to this project.</div>
            </div>
          ) : (
            orders.map((o, idx) => {
              const orderId = o.id || o.orderId || `Order-${idx + 1}`;
              const orderVal = Number(o.value || 0);
              const orderPaid = Number(o.paid || 0);
              const orderBalance = Math.max(0, orderVal - orderPaid);
              const orderStatus = o.status || 'Pending';

              return (
                <div key={orderId} className="mobile-feed-card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                      {orderId}
                    </span>
                    <span className={`badge ${orderStatus === 'Complete' ? 'b-success' : 'b-info'}`} style={{ fontSize: '9.5px' }}>
                      {orderStatus}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {o.name || o.quote_name || 'Hardware Specification'}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '4px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '11px',
                    marginTop: '4px'
                  }}>
                    <div>
                      <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Value</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                        R {Math.round(orderVal).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Paid</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-success)', marginTop: '1px' }}>
                        R {Math.round(orderPaid).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Due</span>
                      <div style={{ fontWeight: 700, color: orderBalance > 0 ? 'var(--text-warning)' : 'var(--text-success)', marginTop: '1px' }}>
                        R {Math.round(orderBalance).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT: PROJECT INFO */}
      {activeTab === 'info' && (
        <div className="card" style={{ padding: '16px', background: 'var(--bg-primary)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Site Address</span>
              <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '2px' }}>
                {address || 'No address specified'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Start Date</span>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {start || '—'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Deadline</span>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {end || '—'}
                </div>
              </div>
            </div>

            {description && (
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Scope / Description</span>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                  {description}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

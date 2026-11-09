import React from 'react';
import { AlertTriangle, Plus, Trash2, ArrowLeft } from 'lucide-react';

export default function SystemAlertSettings({
  alertSettings,
  setAlertSettings,
  setShowRuleModal,
  onBack
}) {
  const customRules = alertSettings?.customRules || [];

  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {onBack && (
              <button 
                type="button" 
                onClick={onBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  marginRight: '6px'
                }}
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b' }}>
              System & Releases
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>
            System Alerts & Operational Rules
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Configure which events generate alerts in the collapsible sidebar for each module. These settings apply globally.
          </p>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Module Toggles
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {[
              alertSettings?.crm?.lostClients,
              alertSettings?.crm?.inactiveClients,
              alertSettings?.crm?.npsReview,
              alertSettings?.design?.outstandingFees,
              alertSettings?.design?.upcomingDeadlines,
              alertSettings?.projects?.lowMargin,
              alertSettings?.projects?.overdueSchedule,
              alertSettings?.projects?.pendingDeposit,
              alertSettings?.orders?.lowMarginOrders
            ].filter(Boolean).length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>/ 9</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Operational triggers enabled
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Custom Alert Rules
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {customRules.length}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            User-defined thresholds
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Sidebar Propagation
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
            Active Real-Time
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Collapsible radar synced
          </div>
        </div>
      </div>

      {/* 2x2 Clean Modules Alert Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
        
        {/* CRM MODULE ALERTS */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            CRM Module Alerts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={alertSettings?.crm?.lostClients} 
                onChange={e => {
                  setAlertSettings(prev => ({
                    ...prev,
                    crm: { ...prev.crm, lostClients: e.target.checked }
                  }));
                }}
                style={{ marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', color: '#0f172a' }}>
                  Lost Clients Recovery Flag
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Prompt to review client re-engagement when an opportunity status is marked lost.
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={alertSettings?.crm?.inactiveClients} 
                onChange={e => {
                  setAlertSettings(prev => ({
                    ...prev,
                    crm: { ...prev.crm, inactiveClients: e.target.checked }
                  }));
                }}
                style={{ marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', color: '#0f172a' }}>
                  Dormant Client Inactivity Alert
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Alert when an existing client has had no interactions or active projects for over 60 days.
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={alertSettings?.crm?.npsReview} 
                onChange={e => {
                  setAlertSettings(prev => ({
                    ...prev,
                    crm: { ...prev.crm, npsReview: e.target.checked }
                  }));
                }}
                style={{ marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', color: '#0f172a' }}>
                  Client NPS Satisfaction Follow-up
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Flag feedback reviews that require executive outreach or management follow-up.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* DESIGN MODULE ALERTS */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            Design Module Alerts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={alertSettings?.design?.outstandingFees} 
                onChange={e => {
                  setAlertSettings(prev => ({
                    ...prev,
                    design: { ...prev.design, outstandingFees: e.target.checked }
                  }));
                }}
                style={{ marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', color: '#0f172a' }}>
                  Outstanding Design Fees Alert
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Alert when design fee proposals remain unbilled or unpaid past milestone handover.
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={alertSettings?.design?.upcomingDeadlines} 
                onChange={e => {
                  setAlertSettings(prev => ({
                    ...prev,
                    design: { ...prev.design, upcomingDeadlines: e.target.checked }
                  }));
                }}
                style={{ marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', color: '#0f172a' }}>
                  Drawing Phase Delivery Deadlines
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Trigger deadline proximity alerts for Schematic, Concept, and Final drawing deliverables.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* PROJECTS MODULE ALERTS */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            Projects Module Alerts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={alertSettings?.projects?.lowMargin} 
                onChange={e => {
                  setAlertSettings(prev => ({
                    ...prev,
                    projects: { ...prev.projects, lowMargin: e.target.checked }
                  }));
                }}
                style={{ marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', color: '#0f172a' }}>
                  Low Target Margin Breaches
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Flag active projects where blended gross margin dips below company baseline.
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={alertSettings?.projects?.overdueSchedule} 
                onChange={e => {
                  setAlertSettings(prev => ({
                    ...prev,
                    projects: { ...prev.projects, overdueSchedule: e.target.checked }
                  }));
                }}
                style={{ marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', color: '#0f172a' }}>
                  Overdue Project Milestones
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Alert when current project stage duration exceeds the expected SLA schedule.
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={alertSettings?.projects?.pendingDeposit} 
                onChange={e => {
                  setAlertSettings(prev => ({
                    ...prev,
                    projects: { ...prev.projects, pendingDeposit: e.target.checked }
                  }));
                }}
                style={{ marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', color: '#0f172a' }}>
                  Pending Deposit Commitment Flags
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Notify PM when a project is scheduled for procurement without confirmed deposit receipt.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* ORDERS MODULE ALERTS */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            Orders Module Alerts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={alertSettings?.orders?.lowMarginOrders} 
                onChange={e => {
                  setAlertSettings(prev => ({
                    ...prev,
                    orders: { ...prev.orders, lowMarginOrders: e.target.checked }
                  }));
                }}
                style={{ marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', color: '#0f172a' }}>
                  Low Order Margin Protection
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Alert when special client discounts drop individual hardware quotation margins below threshold.
                </span>
              </div>
            </label>
          </div>
        </div>

      </div>

      {/* CUSTOM ALERTS RULE BUILDER SECTION */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
              Custom Alert Rules Builder
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              Define automated threshold conditions and warning labels across modules.
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setShowRuleModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <Plus size={13} /> Add Custom Rule
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', margin: 0 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Module</th>
              <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parameter</th>
              <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Condition</th>
              <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Threshold Value</th>
              <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alert Description</th>
              <th style={{ width: '80px', textAlign: 'right', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customRules.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '12.5px' }}>
                  No custom alert rules configured. Click "+ Add Custom Rule" to build one.
                </td>
              </tr>
            ) : (
              customRules.map(rule => (
                <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ textTransform: 'uppercase', fontWeight: 600, padding: '10px 14px', color: '#0f172a' }}>
                    {rule.module}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <code style={{ fontFamily: 'monospace', color: '#475569', fontSize: '11.5px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                      {rule.parameter.replace('_',' ')}
                    </code>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#0284c7', fontWeight: 500 }}>
                    {rule.condition.replace('_',' ')}
                  </td>
                  <td style={{ fontWeight: 600, padding: '10px 14px', color: '#0f172a' }}>
                    {rule.value}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#334155' }}>
                    {rule.label}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 14px' }}>
                    <button 
                      type="button"
                      onClick={() => {
                        setAlertSettings(prev => ({
                          ...prev,
                          customRules: prev.customRules.filter(r => r.id !== rule.id)
                        }));
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 500, cursor: 'pointer', padding: 0 }}
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
  );
}

import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  ChevronRight, ChevronLeft, ShieldAlert, AlertTriangle, 
  TrendingUp, ShoppingBag, UserCheck, CheckCircle, Bell, Play 
} from 'lucide-react';

export default function CollapsibleAlertSidebar({ module, onNavigate, isCollapsed: propIsCollapsed, onToggle }) {
  const { projects, contacts, alertSettings } = useStore();
  const storageKey = `sidebar_collapsed_${module}`;
  const [localIsCollapsed, setLocalIsCollapsed] = useState(() => {
    return localStorage.getItem(storageKey) === 'true';
  });

  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : localIsCollapsed;
  const [currentPage, setCurrentPage] = useState(1);

  const toggleCollapse = () => {
    localStorage.setItem(storageKey, !isCollapsed ? 'true' : 'false');
    if (onToggle) {
      onToggle();
    } else {
      setLocalIsCollapsed(prev => !prev);
    }
  };

  // Generate alerts based on module, toggles and custom rules
  const alerts = useMemo(() => {
    const list = Object.values(projects).filter(p => !p.isDraft);
    const generated = [];

    // --- BUILT-IN ALERTS ---
    if (module === 'projects') {
      const activeSettings = alertSettings?.projects || {};
      list.forEach(p => {
        if (p.complete === 'Complete') return;

        // 1. Overdue Deadline
        if (activeSettings.overdueDeadlines && p.daysLeft && (p.daysLeft.startsWith('−') || p.daysLeft.startsWith('-') || Number(p.daysLeft) < 0)) {
          const days = p.daysLeft.replace('−', '').replace('-', '');
          generated.push({
            id: `${p.key}-overdue`,
            projectKey: p.key,
            type: 'delay',
            badge: 'OVERDUE',
            title: `Overdue Deadline: ${p.name}`,
            desc: `Project is behind schedule by ${days} days in ${p.stage}. Status: "${p.status}".`,
            action: 'Review schedule',
            navPath: `/projects/${p.key}`
          });
        }

        // 2. Outstanding Design Fees
        if (activeSettings.outstandingDesignFees && p.designFees && p.designFees.length > 0) {
          const totalOutstanding = p.designFees.reduce((sum, d) => sum + (d.outstanding || 0), 0);
          if (totalOutstanding > 0) {
            generated.push({
              id: `${p.key}-fees`,
              projectKey: p.key,
              type: 'finance',
              badge: 'PAYMENT',
              title: `Outstanding Design Fee: ${p.name}`,
              desc: `${p.client} has an outstanding balance of R ${totalOutstanding.toLocaleString()} on design fees.`,
              action: 'View payment status',
              navPath: `/projects/${p.key}`
            });
          }
        }

        // 3. Low Margin Warnings
        if (activeSettings.lowMargins) {
          let totalValue = p.feeValue || 0;
          let actualMargin = p.actualMargin || 39;
          if (p.designFees && p.orders) {
            const dfVal = p.designFees.reduce((sum, d) => sum + (d.feeValue || 0), 0);
            const poVal = p.orders.reduce((sum, o) => sum + (o.value || 0), 0);
            totalValue = dfVal + poVal;
            const totalCost = p.designFees.reduce((sum, d) => sum + (d.feeValue * (1 - (d.margin || 39)/100)), 0) +
                              p.orders.reduce((sum, o) => sum + (o.value * 0.8), 0);
            actualMargin = totalValue > 0 ? Math.round(((totalValue - totalCost) / totalValue) * 100) : 39;
          }
          if (actualMargin < (p.targetMargin || 39)) {
            generated.push({
              id: `${p.key}-margin`,
              projectKey: p.key,
              type: 'margin',
              badge: 'LOW MARGIN',
              title: `Low Margin Alert: ${p.name}`,
              desc: `Margin is at ${actualMargin}%, which is below target of ${p.targetMargin || 39}%.`,
              action: 'Review financials',
              navPath: `/projects/${p.key}`
            });
          }
        }

        // 4. Logistics
        if (activeSettings.orderLogisticsAlerts && p.orders && p.orders.length > 0) {
          p.orders.forEach(o => {
            if (o.status === 'Pending' || o.status === 'Customs hold' || o.status === 'Backordered') {
              generated.push({
                id: `${p.key}-order-${o.id}`,
                projectKey: p.key,
                type: 'logistics',
                badge: 'LOGISTICS',
                title: `Order Action Required: ${p.name}`,
                desc: `Order ${o.id} is currently "${o.status}" (ETA: ${o.eta || '—'}).`,
                action: 'Manage logistics',
                navPath: `/projects/${p.key}`
              });
            }
          });
        }

        // 5. Approvals
        if (activeSettings.productApprovalAlerts && (p.prodApproved === 'No' || p.status === 'Awaiting deposit')) {
          generated.push({
            id: `${p.key}-approval`,
            projectKey: p.key,
            type: 'approval',
            badge: 'APPROVAL',
            title: `Awaiting Sign-off: ${p.name}`,
            desc: `Hardware/product selection is awaiting client sign-off or deposit.`,
            action: 'Send approval request',
            navPath: `/projects/${p.key}`
          });
        }
      });
    }

    if (module === 'crm') {
      const activeSettings = alertSettings?.crm || {};
      contacts.forEach(c => {
        // At-risk clients
        if (activeSettings.inactiveClients && c.health === 'Red' && c.status !== 'Lost') {
          generated.push({
            id: `${c.id}-atrisk`,
            clientName: c.name,
            type: 'delay',
            badge: 'AT RISK',
            title: `At-Risk Client: ${c.name}`,
            desc: `Client health is currently Red. Last contact was ${c.lastContactDiff ? c.lastContactDiff.toFixed(0) : '30+'} days ago.`,
            action: 'Log client activity',
            navPath: '/crm',
            navState: { selectedClientId: c.id }
          });
        }
        
        // Lost clients
        if (activeSettings.lostClients && c.status === 'Inactive') {
          generated.push({
            id: `${c.id}-lost`,
            clientName: c.name,
            type: 'margin',
            badge: 'LOST CLIENT',
            title: `Lost Client Follow-up: ${c.name}`,
            desc: `Client is currently inactive. Review opportunity post-mortem or schedule re-engagement.`,
            action: 'Review client profile',
            navPath: '/crm',
            navState: { selectedClientId: c.id }
          });
        }

        // NPS review
        if (activeSettings.npsReview && c.nps && c.nps < 6) {
          generated.push({
            id: `${c.id}-nps`,
            clientName: c.name,
            type: 'finance',
            badge: 'NPS FEEDBACK',
            title: `NPS Detractor: ${c.name}`,
            desc: `NPS rating is low (${c.nps}/10). Immediate follow-up is recommended to address issues.`,
            action: 'Address feedback',
            navPath: '/crm',
            navState: { selectedClientId: c.id }
          });
        }
      });
    }

    if (module === 'design') {
      const activeSettings = alertSettings?.design || {};
      list.forEach(p => {
        if (p.complete === 'Complete') return;

        if (p.designFees && p.designFees.length > 0) {
          p.designFees.forEach(df => {
            if (activeSettings.outstandingFees && df.outstanding > 0) {
              generated.push({
                id: `design-${p.key}-${df.id}`,
                projectKey: p.key,
                type: 'finance',
                badge: 'OUTSTANDING FEE',
                title: `${df.name}`,
                desc: `Design fee outstanding balance of R ${df.outstanding.toLocaleString()} for project ${p.name}.`,
                action: 'Manage design fees',
                navPath: '/design',
                navState: { selectedProjectKey: p.key }
              });
            }

            if (activeSettings.upcomingDeadlines && df.status === 'WIP' && p.daysLeft && (p.daysLeft.startsWith('−') || p.daysLeft.startsWith('-') || Number(p.daysLeft) < 0)) {
              generated.push({
                id: `design-delay-${p.key}-${df.id}`,
                projectKey: p.key,
                type: 'delay',
                badge: 'OVERDUE PHASE',
                title: `${p.name} Phase Delay`,
                desc: `Design drawing phase is delayed. Project is past deadline by ${p.daysLeft.replace('−','').replace('-','')} days.`,
                action: 'Open design workspace',
                navPath: '/design',
                navState: { selectedProjectKey: p.key }
              });
            }
          });
        }
      });
    }

    if (module === 'orders') {
      const activeSettings = alertSettings?.orders || {};
      list.forEach(p => {
        if (p.complete === 'Complete') return;

        if (p.orders && p.orders.length > 0) {
          p.orders.forEach(o => {
            if (activeSettings.logisticsHolds && o.status === 'Customs hold') {
              generated.push({
                id: `order-customs-${o.id}`,
                projectKey: p.key,
                type: 'delay',
                badge: 'CUSTOMS HOLD',
                title: `Customs Hold: Order ${o.id}`,
                desc: `Project: ${p.name}. Hardware supplier: ${o.supplier}. Check documentation.`,
                action: 'Open order BOQ',
                navPath: '/orders',
                navState: { selectedOrderId: o.id, selectedProjectKey: p.key }
              });
            }

            if (activeSettings.backorderedIssues && o.status === 'Pending') {
              generated.push({
                id: `order-pending-${o.id}`,
                projectKey: p.key,
                type: 'logistics',
                badge: 'AWAITING DEPOSIT',
                title: `Order Pending: ${o.id}`,
                desc: `Order value R ${o.value.toLocaleString()} requires deposit clearance.`,
                action: 'Open order BOQ',
                navPath: '/orders',
                navState: { selectedOrderId: o.id, selectedProjectKey: p.key }
              });
            }

            if (activeSettings.lowMarginOrders) {
              const orderMargin = o.value > 0 ? Math.round(((o.value - (o.costValue || (o.value * 0.8))) / o.value) * 100) : 0;
              if (orderMargin < 39) {
                generated.push({
                  id: `order-margin-${o.id}`,
                  projectKey: p.key,
                  type: 'margin',
                  badge: 'LOW MARGIN',
                  title: `Low Order Margin: ${o.id}`,
                  desc: `Order margin is ${orderMargin}% (less than target 39%). Project: ${p.name}.`,
                  action: 'Open order BOQ',
                  navPath: '/orders',
                  navState: { selectedOrderId: o.id, selectedProjectKey: p.key }
                });
              }
            }
          });
        }
      });
    }

    // --- EVALUATE CUSTOM ALERTS RULES ---
    const customRules = alertSettings?.customRules || [];
    const moduleRules = customRules.filter(r => r.module === module);

    moduleRules.forEach(rule => {
      const conditionMatches = (val, ruleVal, cond) => {
        const valNum = Number(val);
        const ruleNum = Number(ruleVal);
        if (isNaN(valNum) || isNaN(ruleNum)) return false;
        if (cond === 'less_than') return valNum < ruleNum;
        if (cond === 'greater_than') return valNum > ruleNum;
        if (cond === 'equals') return valNum === ruleNum;
        return false;
      };

      if (module === 'crm') {
        contacts.forEach(c => {
          let paramValue = null;
          if (rule.parameter === 'nps') paramValue = c.nps;
          if (rule.parameter === 'days_dormant') paramValue = c.lastProjDiff;
          if (rule.parameter === 'days_since_contact') paramValue = c.lastContactDiff;

          if (paramValue !== null && conditionMatches(paramValue, rule.value, rule.condition)) {
            generated.push({
              id: `custom-crm-${c.id}-${rule.id}`,
              clientName: c.name,
              type: 'finance',
              badge: 'CUSTOM RULE',
              title: `${rule.label || 'Custom CRM Alert'}: ${c.name}`,
              desc: `${c.name} has ${rule.parameter.replace('_',' ')} of ${paramValue} (Threshold: ${rule.condition.replace('_',' ')} ${rule.value}).`,
              action: 'Review contact profile',
              navPath: '/crm',
              navState: { selectedClientId: c.id }
            });
          }
        });
      }

      if (module === 'projects') {
        list.forEach(p => {
          if (p.complete === 'Complete') return;

          let paramValue = null;
          if (rule.parameter === 'margin') {
            let totalValue = p.feeValue || 0;
            let actualMargin = p.actualMargin || 39;
            if (p.designFees && p.orders) {
              const dfVal = p.designFees.reduce((sum, d) => sum + (d.feeValue || 0), 0);
              const poVal = p.orders.reduce((sum, o) => sum + (o.value || 0), 0);
              totalValue = dfVal + poVal;
              const totalCost = p.designFees.reduce((sum, d) => sum + (d.feeValue * (1 - (d.margin || 39)/100)), 0) +
                                p.orders.reduce((sum, o) => sum + (o.value * 0.8), 0);
              actualMargin = totalValue > 0 ? Math.round(((totalValue - totalCost) / totalValue) * 100) : 39;
            }
            paramValue = actualMargin;
          }
          if (rule.parameter === 'overdue_days' && p.daysLeft) {
            paramValue = p.daysLeft.startsWith('−') || p.daysLeft.startsWith('-') ? Math.abs(Number(p.daysLeft.replace('−','').replace('-',''))) : 0;
          }
          if (rule.parameter === 'outstanding') {
            paramValue = p.designFees ? p.designFees.reduce((sum, d) => sum + (d.outstanding || 0), 0) : 0;
          }

          if (paramValue !== null && conditionMatches(paramValue, rule.value, rule.condition)) {
            generated.push({
              id: `custom-proj-${p.key}-${rule.id}`,
              projectKey: p.key,
              type: 'margin',
              badge: 'CUSTOM RULE',
              title: `${rule.label || 'Custom Project Alert'}: ${p.name}`,
              desc: `Project matches: ${rule.parameter} is ${paramValue} (Threshold: ${rule.condition.replace('_',' ')} ${rule.value}).`,
              action: 'Review project details',
              navPath: `/projects/${p.key}`
            });
          }
        });
      }

      if (module === 'design') {
        list.forEach(p => {
          if (p.complete === 'Complete') return;

          if (p.designFees && p.designFees.length > 0) {
            p.designFees.forEach(df => {
              let paramValue = null;
              if (rule.parameter === 'outstanding') paramValue = df.outstanding || 0;
              if (rule.parameter === 'overdue_days' && p.daysLeft) {
                paramValue = p.daysLeft.startsWith('−') || p.daysLeft.startsWith('-') ? Math.abs(Number(p.daysLeft.replace('−','').replace('-',''))) : 0;
              }

              if (paramValue !== null && conditionMatches(paramValue, rule.value, rule.condition)) {
                generated.push({
                  id: `custom-design-${p.key}-${df.id}-${rule.id}`,
                  projectKey: p.key,
                  type: 'finance',
                  badge: 'CUSTOM RULE',
                  title: `${rule.label || 'Custom Design Alert'}: ${df.name}`,
                  desc: `Drawing fee matches: ${rule.parameter} is R ${paramValue} (Threshold: ${rule.condition.replace('_',' ')} ${rule.value}).`,
                  action: 'Manage design fees',
                  navPath: '/design',
                  navState: { selectedProjectKey: p.key }
                });
              }
            });
          }
        });
      }

      if (module === 'orders') {
        list.forEach(p => {
          if (p.complete === 'Complete') return;

          if (p.orders && p.orders.length > 0) {
            p.orders.forEach(o => {
              let paramValue = null;
              if (rule.parameter === 'margin') {
                paramValue = o.value > 0 ? Math.round(((o.value - (o.costValue || (o.value * 0.8))) / o.value) * 100) : 0;
              }
              if (rule.parameter === 'value') paramValue = o.value || 0;

              if (paramValue !== null && conditionMatches(paramValue, rule.value, rule.condition)) {
                generated.push({
                  id: `custom-order-${o.id}-${rule.id}`,
                  projectKey: p.key,
                  type: 'logistics',
                  badge: 'CUSTOM RULE',
                  title: `${rule.label || 'Custom Order Alert'}: ${o.id}`,
                  desc: `Order matches: ${rule.parameter} is ${paramValue} (Threshold: ${rule.condition.replace('_',' ')} ${rule.value}).`,
                  action: 'Open order BOQ',
                  navPath: '/orders',
                  navState: { selectedOrderId: o.id, selectedProjectKey: p.key }
                });
              }
            });
          }
        });
      }
    });

    return generated;
  }, [projects, contacts, module, alertSettings]);

  // Reset pagination page on alert length or module changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [alerts.length, module]);

  const pageSize = 3;
  const pageAlerts = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return alerts.slice(startIdx, startIdx + pageSize);
  }, [alerts, currentPage]);

  if (isCollapsed) {
    return (
      <div 
        onClick={toggleCollapse}
        style={{ 
          width: '50px', 
          height: '100%', 
          minHeight: '600px', 
          borderLeft: '1px solid var(--border)', 
          background: 'var(--bg-primary)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          paddingTop: '20px', 
          cursor: 'pointer',
          position: 'sticky',
          top: '20px',
          borderRadius: '12px'
        }}
      >
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <Bell size={18} color="var(--text-secondary)" />
          {alerts.length > 0 && (
            <span style={{ 
              position: 'absolute', 
              top: '-3px', 
              right: '-3px', 
              width: '8px', 
              height: '8px', 
              background: 'var(--text-danger)', 
              borderRadius: '50%',
              boxShadow: '0 0 8px var(--text-danger)'
            }} />
          )}
        </div>
        <ChevronLeft size={16} color="var(--text-tertiary)" style={{ marginTop: 'auto', marginBottom: '20px' }} />
      </div>
    );
  }

  return (
    <div style={{ position: 'sticky', top: '20px', width: '340px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={14} color="var(--text-info)" />
            <span>Alerts & Prompts ({alerts.length})</span>
          </div>
          <button 
            className="btn btn-sm btn-ghost" 
            onClick={toggleCollapse}
            style={{ padding: '2px 6px', display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {pageAlerts.map((alert) => {
          let IconComp = AlertTriangle;
          let borderCol = 'var(--text-danger)';
          let badgeBg = 'b-danger';

          if (alert.type === 'finance') {
            IconComp = ShieldAlert;
            borderCol = 'var(--text-warning)';
            badgeBg = 'b-warning';
          } else if (alert.type === 'margin') {
            IconComp = TrendingUp;
            borderCol = 'var(--text-danger)';
            badgeBg = 'b-danger';
          } else if (alert.type === 'logistics') {
            IconComp = ShoppingBag;
            borderCol = 'var(--text-success)';
            badgeBg = 'b-success';
          } else if (alert.type === 'approval') {
            IconComp = UserCheck;
            borderCol = 'var(--text-info)';
            badgeBg = 'b-info';
          }

          return (
            <div 
              key={alert.id} 
              className="card" 
              style={{ 
                borderLeft: `4px solid ${borderCol}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                background: 'var(--bg-primary)'
              }}
            >
              <div className="card-body" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className={`badge ${badgeBg}`} style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px' }}>
                    {alert.badge}
                  </span>
                  <IconComp size={14} style={{ color: borderCol }} />
                </div>
                
                <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {alert.title}
                </h4>
                
                <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {alert.desc}
                </p>

                <button 
                  className="btn btn-sm btn-ghost" 
                  style={{ 
                    width: '100%', 
                    justifyContent: 'center', 
                    fontSize: '11px', 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text-info)'
                  }}
                  onClick={() => {
                    onNavigate(alert.navPath, alert.navState);
                  }}
                >
                  <Play size={10} style={{ marginRight: '4px' }} /> {alert.action}
                </button>
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-tertiary)', fontSize: '12px', background: 'var(--bg-primary)' }}>
            <CheckCircle size={18} color="var(--text-success)" style={{ margin: '0 auto 8px auto' }} />
            All parameters on track! No actions required.
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {alerts.length > pageSize && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
            <button 
              className="btn btn-sm btn-ghost" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Showing {Math.min(alerts.length, (currentPage - 1) * pageSize + 1)}–{Math.min(alerts.length, currentPage * pageSize)} of {alerts.length}
            </span>
            <button 
              className="btn btn-sm btn-ghost" 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(alerts.length / pageSize), p + 1))}
              disabled={currentPage >= Math.ceil(alerts.length / pageSize)}
              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: currentPage >= Math.ceil(alerts.length / pageSize) ? 'not-allowed' : 'pointer', opacity: currentPage >= Math.ceil(alerts.length / pageSize) ? 0.5 : 1 }}
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

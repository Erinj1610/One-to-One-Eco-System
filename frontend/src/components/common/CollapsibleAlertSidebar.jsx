import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../context/StoreContext';
import { 
  ChevronRight, ChevronLeft, ShieldAlert, AlertTriangle, 
  TrendingUp, ShoppingBag, UserCheck, CheckCircle, Bell, Play, X, Search, RotateCcw 
} from 'lucide-react';

export default function CollapsibleAlertSidebar({ module, onNavigate, isCollapsed: propIsCollapsed, onToggle }) {
  const { projects, contacts, alertSettings } = useStore();
  const storageKey = `sidebar_collapsed_${module}`;
  const dismissedStorageKey = `portal_dismissed_alerts_${module}`;

  const [localIsCollapsed, setLocalIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? saved === 'true' : true;
  });

  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : localIsCollapsed;
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('value_desc');

  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const raw = localStorage.getItem(dismissedStorageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    localStorage.setItem(storageKey, String(nextState));
    if (onToggle) {
      onToggle();
    } else {
      setLocalIsCollapsed(nextState);
    }
  };

  const handleDismiss = (id, e) => {
    if (e) e.stopPropagation();
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(dismissedStorageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleDismissAll = (idsToDismiss) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      idsToDismiss.forEach(id => next.add(id));
      try {
        localStorage.setItem(dismissedStorageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleRestoreAll = () => {
    setDismissedIds(new Set());
    try {
      localStorage.removeItem(dismissedStorageKey);
    } catch {}
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
                amount: Number(o.value) || 0,
                category: 'logistics',
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
                amount: Number(o.value) || 0,
                category: 'deposit',
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
                  amount: Number(o.value) || 0,
                  margin: orderMargin,
                  category: 'margin',
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
  // Filter out dismissed alerts and classify category
  const activeAlerts = useMemo(() => {
    return alerts.map(a => {
      let cat = a.category;
      if (!cat) {
        const b = (a.badge || '').toUpperCase();
        if (b.includes('DEPOSIT') || b.includes('PAYMENT') || b.includes('FEE')) cat = 'deposit';
        else if (b.includes('MARGIN')) cat = 'margin';
        else if (b.includes('HOLD') || b.includes('OVERDUE') || b.includes('LOGISTICS') || a.type === 'delay') cat = 'logistics';
        else cat = 'other';
      }
      return { ...a, category: cat, isDismissed: dismissedIds.has(a.id) };
    }).filter(a => !a.isDismissed);
  }, [alerts, dismissedIds]);

  // Category counts
  const counts = useMemo(() => {
    const c = { all: activeAlerts.length, deposit: 0, margin: 0, logistics: 0, other: 0 };
    activeAlerts.forEach(a => {
      if (a.category === 'deposit') c.deposit++;
      else if (a.category === 'margin') c.margin++;
      else if (a.category === 'logistics') c.logistics++;
      else c.other++;
    });
    return c;
  }, [activeAlerts]);

  // Filtered & Sorted alerts
  const filteredAlerts = useMemo(() => {
    let res = activeAlerts;
    if (activeTab === 'DEPOSIT') res = res.filter(a => a.category === 'deposit');
    else if (activeTab === 'MARGIN') res = res.filter(a => a.category === 'margin');
    else if (activeTab === 'LOGISTICS') res = res.filter(a => a.category === 'logistics');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      res = res.filter(a => 
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.desc && a.desc.toLowerCase().includes(q)) ||
        (a.id && a.id.toLowerCase().includes(q)) ||
        (a.projectKey && a.projectKey.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'value_desc') {
      res = [...res].sort((x, y) => (y.amount || 0) - (x.amount || 0));
    }
    return res;
  }, [activeAlerts, activeTab, searchQuery, sortBy]);

  // Reset pagination on filter or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, sortBy]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isCollapsed) {
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / pageSize));
  const pageAlerts = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredAlerts.slice(startIdx, startIdx + pageSize);
  }, [filteredAlerts, currentPage]);

  return (
    <>
      {/* 1. FLOATING DOCKED TAB (Always visible, 0px document width impact) */}
      <button
        type="button"
        onClick={toggleCollapse}
        style={{
          position: 'fixed',
          right: 0,
          top: '200px',
          zIndex: 9990,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRight: 'none',
          borderTopLeftRadius: '10px',
          borderBottomLeftRadius: '10px',
          boxShadow: '-4px 4px 14px rgba(0,0,0,0.1)',
          padding: '9px 12px 9px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateX(-3px)';
          e.currentTarget.style.boxShadow = '-6px 6px 18px rgba(0,0,0,0.16)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = '-4px 4px 14px rgba(0,0,0,0.1)';
        }}
        title="Open Alerts & Prompts Slide-over Drawer"
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Bell size={16} color="var(--text-primary)" />
          {activeAlerts.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '8px',
              height: '8px',
              background: 'var(--text-danger)',
              borderRadius: '50%',
              boxShadow: '0 0 6px var(--text-danger)'
            }} />
          )}
        </div>
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
          Alerts ({activeAlerts.length})
        </span>
      </button>

      {/* 2. SLIDE-OVER FLYOUT DRAWER (Portal overlay, 0px main layout space) */}
      {!isCollapsed && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }}>
          {/* Backdrop overlay */}
          <div
            onClick={toggleCollapse}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              zIndex: 99998,
              animation: 'fadeIn 0.2s ease'
            }}
          />

          {/* Right Flyout Panel */}
          <aside
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(92vw, 440px)',
              background: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-16px 0 40px rgba(0, 0, 0, 0.25)',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* TIER 1: DRAWER TOP HEADER */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={16} color="var(--text-info)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Alerts & Prompts
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      {activeAlerts.length}
                    </span>
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                    Operational triage & prioritized exceptions
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {dismissedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreAll}
                    className="btn btn-ghost btn-xs"
                    style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Restore all dismissed alerts"
                  >
                    <RotateCcw size={11} /> Restore ({dismissedIds.size})
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '6px', borderRadius: '6px', color: 'var(--text-secondary)' }}
                  title="Close Drawer (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* TIER 2: CATEGORY FILTER TABS & SEARCH */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Search Input */}
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-tertiary)' }} />
                <input
                  type="search"
                  placeholder="Filter by Order #, Client, Project..."
                  className="form-control"
                  style={{ paddingLeft: '30px', height: '30px', fontSize: '12px' }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ALL')}
                    className={`btn btn-xs ${activeTab === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px' }}
                  >
                    All ({counts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('DEPOSIT')}
                    className={`btn btn-xs ${activeTab === 'DEPOSIT' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px' }}
                  >
                    Deposits ({counts.deposit})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('MARGIN')}
                    className={`btn btn-xs ${activeTab === 'MARGIN' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px' }}
                  >
                    Margins ({counts.margin})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('LOGISTICS')}
                    className={`btn btn-xs ${activeTab === 'LOGISTICS' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px' }}
                  >
                    Logistics ({counts.logistics})
                  </button>
                </div>

                {filteredAlerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDismissAll(filteredAlerts.map(a => a.id))}
                    className="btn btn-ghost btn-xs"
                    style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', textDecoration: 'underline' }}
                    title="Dismiss currently visible alerts"
                  >
                    Dismiss current ({filteredAlerts.length})
                  </button>
                )}
              </div>
            </div>

            {/* TIER 3: SCROLLABLE ALERTS LIST */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pageAlerts.map(alert => {
                let IconComp = AlertTriangle;
                let borderCol = '#ef4444';
                let badgeClass = 'b-danger';

                if (alert.category === 'deposit') {
                  IconComp = ShieldAlert;
                  borderCol = '#f59e0b';
                  badgeClass = 'b-warning';
                } else if (alert.category === 'margin') {
                  IconComp = TrendingUp;
                  borderCol = '#ef4444';
                  badgeClass = 'b-danger';
                } else if (alert.category === 'logistics') {
                  IconComp = ShoppingBag;
                  borderCol = '#8b5cf6';
                  badgeClass = 'b-secondary';
                }

                return (
                  <div
                    key={alert.id}
                    className="card hover-scale"
                    style={{
                      borderLeft: `3px solid ${borderCol}`,
                      borderTop: '1px solid var(--border)',
                      borderRight: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--bg-primary)',
                      padding: '12px 14px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      position: 'relative'
                    }}
                  >
                    {/* Top Row: Badge + Amount + Dismiss */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: '9.5px', fontWeight: 700, padding: '2px 6px', textTransform: 'uppercase' }}>
                          {alert.badge}
                        </span>
                        {alert.amount > 0 && (
                          <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                            R {alert.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IconComp size={13} style={{ color: borderCol }} />
                        <button
                          type="button"
                          onClick={(e) => handleDismiss(alert.id, e)}
                          className="btn btn-ghost btn-xs"
                          style={{ padding: '2px', color: 'var(--text-tertiary)', borderRadius: '4px' }}
                          title="Dismiss this alert"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {alert.title}
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {alert.desc}
                    </div>

                    {/* Action Button */}
                    <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-info)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          borderRadius: '6px'
                        }}
                        onClick={() => {
                          toggleCollapse();
                          onNavigate(alert.navPath, alert.navState);
                        }}
                      >
                        <Play size={10} /> {alert.action} →
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredAlerts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                  <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Zero Alerts Found
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {dismissedIds.size > 0 
                      ? `${dismissedIds.size} alerts have been dismissed or resolved.`
                      : 'All items in this category are operating within acceptable parameters.'}
                  </div>
                </div>
              )}
            </div>

            {/* TIER 5: DRAWER FOOTER & PAGINATION */}
            <div style={{
              padding: '11px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11.5px',
              color: 'var(--text-secondary)'
            }}>
              <div>
                Showing <strong>{filteredAlerts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong>–<strong>{Math.min(currentPage * pageSize, filteredAlerts.length)}</strong> of <strong>{filteredAlerts.length}</strong>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    <ChevronLeft size={12} /> Prev
                  </button>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '0 4px', color: 'var(--text-primary)' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}

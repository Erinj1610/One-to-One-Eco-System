import React, { useState } from 'react';
import { 
  Zap, Check, ArrowLeft, ExternalLink, Link2, 
  FileText, ShieldCheck, Mail, Database, Layers, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';

export default function ApiIntegrationsSettings({
  projects,
  updateProject,
  onBack
}) {
  const [selectedOrderKey, setSelectedOrderKey] = useState('');
  const [docPrefix, setDocPrefix] = useState('');
  const [docDate, setDocDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Integrations Directory definition
  const integrations = [
    { 
      id: 'xero', 
      name: 'Xero Accounting', 
      desc: 'Sync invoices, tax breakdowns, and payment reconciliation directly to Xero ledger.',
      status: 'Connected', 
      isConnected: true,
      category: 'Accounting & Ledger',
      icon: 'X'
    },
    { 
      id: 'sage', 
      name: 'Sage One / Pastel', 
      desc: 'Enterprise financial management and ERP ledger sync.',
      status: 'Standby', 
      isConnected: false,
      category: 'Alternative Accounting',
      icon: 'S'
    },
    { 
      id: 'resend', 
      name: 'Resend Transactional Mailer', 
      desc: 'High-deliverability SMTP infrastructure for PDF quotes, delivery slips & invoices.',
      status: 'Connected', 
      isConnected: true,
      category: 'Email Services',
      icon: 'R'
    },
    { 
      id: 'firebase', 
      name: 'Firebase & Cloud Identity', 
      desc: 'User identity authentication, security tokens, and real-time state synchronization.',
      status: 'Connected', 
      isConnected: true,
      category: 'Security & Auth',
      icon: 'F'
    },
    { 
      id: 'palladium', 
      name: 'Palladium / Kerridge CS', 
      desc: 'Read-only cloud sync for legacy commercial fittings catalogue and historical BOQs.',
      status: 'Connected', 
      isConnected: true,
      category: 'Inventory Sync',
      icon: 'P'
    }
  ];

  const handleBulkAutoFill = async () => {
    if (!selectedOrderKey) {
      if (window.otoToast) {
        window.otoToast('Please select an order reference first.', 'error');
      } else {
        alert('Please select an order reference first.');
      }
      return;
    }

    const [pKey, oId] = selectedOrderKey.split('_');
    const project = projects[pKey];
    const order = (project?.orders || []).find(o => o.id === oId);
    if (!order) return;

    const customPrefix = docPrefix.trim();
    const finalDateObj = docDate ? new Date(docDate) : new Date();
    const formattedDate = finalDateObj.toISOString().split('T')[0];
    const dateStr = finalDateObj.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

    const prefixPart = customPrefix ? `${customPrefix}-` : '';

    const poId = `${prefixPart}PO-${order.id}`;
    const grnId = `${prefixPart}GRN-${order.id}`;
    const plId = `${prefixPart}PL-${order.id}`;
    const dnId = `${prefixPart}DN-${order.id}`;
    const invId = `${prefixPart}INV-${order.id}`;

    const confirmText = `This action will auto-generate all commercial documents for Order #${order.id}:\n- PO: ${poId}\n- GRN: ${grnId}\n- Packing List: ${plId}\n- Delivery Note: ${dnId}\n- Tax Invoice: ${invId}\n\nAll hardware line quantities will be marked fully ordered, received, and delivered. Proceed?`;

    const confirmed = window.otoConfirm
      ? await window.otoConfirm(confirmText, { title: 'Execute Bulk Auto-Fulfillment', isDanger: false })
      : confirm(confirmText);

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const hardwareItems = (order.itemsList || []).filter(item => (item.itemType || item.item_type) !== 'Service');
      const allItems = order.itemsList || [];

      const poItems = hardwareItems.map(item => ({
        code: item.code || 'NO-CODE',
        description: item.description,
        qtyAction: Number(item.qty) || 0,
        eta: formattedDate
      }));

      const grnItems = hardwareItems.map(item => ({
        code: item.code || 'NO-CODE',
        description: item.description,
        qtyAction: Number(item.qty) || 0
      }));

      const plItems = hardwareItems.map(item => ({
        id: item.id,
        code: item.code || 'NO-CODE',
        type: item.type || 'Fittings',
        description: item.description,
        qtyDelivered: Number(item.qty) || 0,
        boxNumber: 'Box 1',
        redList: 'No',
        firstFix: 'No'
      }));

      const invItems = allItems.map(item => ({
        code: item.code || 'NO-CODE',
        description: item.description,
        qtyAction: Number(item.qty) || 0,
        rate: Number(item.unitRetail || item.unit_retail || 0)
      }));

      const updatedItemsList = allItems.map(item => {
        const isService = (item.itemType || item.item_type) === 'Service';
        const qty = Number(item.qty) || 0;

        const pHist = isService ? [] : [{
          id: poId,
          ref: poId,
          date: formattedDate,
          qty: qty,
          eta: formattedDate,
          supplier: order.supplier || 'Warehouse Inventory'
        }];

        const rHist = isService ? [] : [{
          qty: qty,
          ref: grnId,
          poId: poId,
          date: formattedDate
        }];

        const dHist = isService ? [] : [{
          qty: qty,
          ref: dnId,
          date: formattedDate
        }];

        const iHist = [{
          qty: qty,
          ref: invId,
          date: formattedDate,
          rate: Number(item.unitRetail || item.unit_retail || 0)
        }];

        return {
          ...item,
          poQtyOrdered: isService ? 0 : qty,
          receivedQty: isService ? 0 : qty,
          receivedDate: isService ? '' : formattedDate,
          deliveryQty: isService ? 0 : qty,
          deliveryDate: isService ? '' : formattedDate,
          deliveryStatus: isService ? 'Pending' : 'Delivered',
          purchaseHistory: pHist,
          receivingHistory: rHist,
          deliveryHistory: dHist,
          invoiceHistory: iHist
        };
      });

      const newPo = { id: poId, date: dateStr, supplier: order.supplier || 'Warehouse Inventory', items: poItems };
      const newGrn = { id: grnId, poId: poId, date: dateStr, notes: 'Bulk Uploaded GRN', items: grnItems };
      const newPl = { id: plId, date: dateStr, notes: 'Bulk Uploaded PL', items: plItems };
      const newDn = { id: dnId, date: dateStr, notes: 'Bulk Uploaded DN', items: plItems };
      const newInv = { id: invId, date: dateStr, notes: 'Bulk Uploaded Invoice', items: invItems };

      const updatedOrders = project.orders.map(o => {
        if (o.id === oId) {
          return {
            ...o,
            purchaseOrders: [...(o.purchaseOrders || []), newPo],
            goodsReceivedNotes: [...(o.goodsReceivedNotes || []), newGrn],
            packingLists: [...(o.packingLists || []), newPl],
            deliveryNotes: [...(o.deliveryNotes || []), newDn],
            clientInvoices: [...(o.clientInvoices || []), newInv],
            itemsList: updatedItemsList
          };
        }
        return o;
      });

      updateProject(pKey, 'orders', updatedOrders);

      if (window.otoToast) {
        window.otoToast(`Successfully auto-fulfilled Order #${order.id}! Documents issued.`, 'success');
      } else {
        alert(`Successfully fully auto-filled order ${order.id}! All documents have been issued.`);
      }
      setSelectedOrderKey('');
      setDocPrefix('');
      setDocDate('');
    } catch (e) {
      if (window.otoToast) {
        window.otoToast(e.message, 'error');
      } else {
        alert(e.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const connectedCount = integrations.filter(i => i.isConnected).length;

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
            Connected API Integrations & Rapid Fulfillment
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Manage third-party financial and authentication APIs, or use the Fast-Track Order Auto-Fulfillment engine.
          </p>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Connected APIs
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {connectedCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>/ {integrations.length}</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Operational microservices
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Ledger & Accounting
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
            Xero Live Synced
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Invoices & credit notes
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Email Infrastructure
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
            Resend SMTP Active
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            High-deliverability mailer
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.8fr) minmax(320px, 1.2fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Column: Fast-Track Auto-Fulfillment Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="#0f172a" /> Fast-Track Order Auto-Fulfillment
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Bulk initialize past orders by generating matching Purchase Orders, Goods Received Notes, Packing Lists, Delivery Slips, and Client Tax Invoices in one click.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* SELECT ORDER */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Select Project Order to Fully Auto-Fill
              </label>
              <select 
                value={selectedOrderKey}
                onChange={e => setSelectedOrderKey(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '4px 10px',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">— Select Order Reference —</option>
                {Object.values(projects).flatMap(proj => 
                  (proj.orders || []).map(o => (
                    <option key={`${proj.key}_${o.id}`} value={`${proj.key}_${o.id}`}>
                      {o.id} — {proj.name} ({o.supplier || 'No Supplier'}) [{(o.itemsList || []).length} items]
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Custom Document ID Prefix
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. PO01 / INV001" 
                  value={docPrefix}
                  onChange={e => setDocPrefix(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Backdated Fulfillment Date
                </label>
                <input 
                  type="date" 
                  value={docDate}
                  onChange={e => setDocDate(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '6px' }}>
              <button 
                type="button" 
                onClick={handleBulkAutoFill}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Zap size={14} /> {isProcessing ? 'Issuing Commercial Documents...' : 'Fully Auto-Fill All Quantities & Issue Documents'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Connected Integrations Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {integrations.map(int => (
            <div 
              key={int.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '7px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: '#0f172a'
              }}>
                {int.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                  {int.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {int.desc}
                </div>
              </div>

              <div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  background: int.isConnected ? '#f0fdf4' : '#f8fafc',
                  color: int.isConnected ? '#16a34a' : '#64748b',
                  border: `1px solid ${int.isConnected ? '#bbf7d0' : '#e2e8f0'}`
                }}>
                  {int.status}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

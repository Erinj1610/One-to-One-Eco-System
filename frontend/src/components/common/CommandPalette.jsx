import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ArrowRight, 
  Folder, 
  FileText, 
  Users, 
  DollarSign, 
  Package, 
  Truck, 
  CreditCard, 
  Layout, 
  Bot, 
  Calendar, 
  Check, 
  X,
  Clock,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { projects = {}, contacts = [] } = useStore();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Static Navigation Destinations
  const navItems = [
    { id: 'nav-dashboard', type: 'page', title: 'Dashboard', subtitle: 'Executive overview & KPI tracking', icon: Layout, path: '/dashboard' },
    { id: 'nav-workspace', type: 'page', title: 'My Workspace', subtitle: 'Personal operational queue & tasks', icon: Clock, path: '/workspace' },
    { id: 'nav-orders', type: 'page', title: 'Orders & Quotations', subtitle: 'Area-by-Area BOQ Builder & Quotations Hub', icon: FileText, path: '/orders' },
    { id: 'nav-projects', type: 'page', title: 'Projects Ecosystem', subtitle: 'Active sites, deliverables & project tracking', icon: Folder, path: '/projects' },
    { id: 'nav-crm', type: 'page', title: 'Client Relations (CRM)', subtitle: 'Client directory, key accounts & spend', icon: Users, path: '/crm' },
    { id: 'nav-salestracker', type: 'page', title: 'Sales Tracker', subtitle: 'Revenue pipeline, progress & margins', icon: DollarSign, path: '/sales-tracker' },
    { id: 'nav-debtors', type: 'page', title: 'Debtors & Billing Forecast', subtitle: 'Cashflow milestones & ETA billing split', icon: CreditCard, path: '/debtors-hub' },
    { id: 'nav-purchasing', type: 'page', title: 'Purchasing & Receiving', subtitle: 'Procurement allocations, POs & GRNs', icon: Package, path: '/purchasing' },
    { id: 'nav-logistics', type: 'page', title: 'Logistics Hub', subtitle: 'Dispatches, delivery notes & fleet runs', icon: Truck, path: '/logistics' },
    { id: 'nav-invoices', type: 'page', title: 'Invoices Suite', subtitle: 'Tax invoices, billing runs & credit notes', icon: FileText, path: '/invoices' },
    { id: 'nav-payments', type: 'page', title: 'Payments Allocations', subtitle: 'Live ERP receipts & order balancing', icon: CreditCard, path: '/payments' },
    { id: 'nav-products', type: 'page', title: 'Products Database', subtitle: 'Catalog master, specs & supplier pricing', icon: Package, path: '/products' },
    { id: 'nav-ai', type: 'page', title: 'Management AI Studio', subtitle: 'Gemini enterprise assistants & Cloud SQL agent', icon: Bot, path: '/management-ai' }
  ];

  // Dynamic Orders & Projects
  const dynamicItems = [];

  // Add projects
  Object.values(projects || {}).forEach(proj => {
    if (proj?.name) {
      dynamicItems.push({
        id: `proj-${proj.key || proj.id}`,
        type: 'project',
        title: proj.name,
        subtitle: `Project • ${proj.client || 'Client Direct'} • ${proj.stage || 'Active'}`,
        icon: Folder,
        path: `/projects/${proj.key || proj.id}`
      });
    }

    // Add orders inside projects
    const ordersList = Array.isArray(proj?.orders) ? proj.orders : Object.values(proj?.orders || {});
    ordersList.forEach(order => {
      if (order?.id) {
        dynamicItems.push({
          id: `order-${order.id}`,
          type: 'order',
          title: `${order.id} — ${order.quote_name || order.quoteName || 'Order'}`,
          subtitle: `Order • ${proj.name} • ${order.status || 'Active'}`,
          icon: FileText,
          path: '/orders',
          state: { selectedOrderId: order.id, selectedProjectKey: proj.key }
        });
      }
    });
  });

  // Add top contacts/clients
  (contacts || []).forEach(contact => {
    if (contact?.name) {
      dynamicItems.push({
        id: `client-${contact.id}`,
        type: 'client',
        title: contact.name,
        subtitle: `Client • ${contact.company || contact.type || 'Key Account'}`,
        icon: Users,
        path: '/crm',
        state: { selectedClientId: contact.id }
      });
    }
  });

  // Combine and filter
  const allItems = [...navItems, ...dynamicItems];
  const q = query.trim().toLowerCase();

  const filteredItems = q === '' 
    ? navItems 
    : allItems.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.subtitle.toLowerCase().includes(q)
      ).slice(0, 10);

  const handleSelect = (item) => {
    setIsOpen(false);
    if (item.state) {
      navigate(item.path, { state: item.state });
    } else {
      navigate(item.path);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'fadeIn 0.15s ease'
      }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '580px',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          borderBottom: '1px solid #f1f5f9',
          background: '#ffffff'
        }}>
          <Search size={18} color="#64748b" />
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a module, order (e.g. Q-2026), project, or client..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14.5px',
              color: '#0f172a',
              background: 'transparent',
              fontFamily: 'inherit'
            }}
          />
          <div style={{
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '3px 6px',
            borderRadius: '4px',
            background: '#f1f5f9',
            color: '#64748b',
            border: '1px solid #e2e8f0'
          }}>
            ESC
          </div>
        </div>

        {/* Results List */}
        <div style={{
          maxHeight: '340px',
          overflowY: 'auto',
          padding: '6px'
        }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No matches found for <strong style={{ color: '#0f172a' }}>"{query}"</strong>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const IconComp = item.icon || ArrowRight;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? '#f8fafc' : 'transparent',
                    border: isSelected ? '1px solid #e2e8f0' : '1px solid transparent',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '6px',
                      background: isSelected ? '#0f172a' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.1s ease'
                    }}>
                      <IconComp size={15} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isSelected ? '#0f172a' : '#94a3b8',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isSelected ? '#ffffff' : 'transparent',
                    border: isSelected ? '1px solid #e2e8f0' : 'none',
                    flexShrink: 0,
                    marginLeft: '8px'
                  }}>
                    {item.type}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#f8fafc',
          borderTop: '1px solid #f1f5f9',
          fontSize: '11px',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span><kbd style={{ padding: '1px 5px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '3px', fontWeight: 600 }}>↑</kbd> <kbd style={{ padding: '1px 5px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '3px', fontWeight: 600 }}>↓</kbd> to navigate</span>
            <span><kbd style={{ padding: '1px 5px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '3px', fontWeight: 600 }}>↵</kbd> to jump</span>
          </div>
          <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>One to One Studio Search</span>
        </div>
      </div>
    </div>
  );
}

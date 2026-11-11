import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  FileText, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  DollarSign, 
  Calendar,
  Building
} from 'lucide-react';
import { API_BASE } from '../../api_config';

export default function ClientVariationDocument({
  poNumber,
  order,
  onBackToWorkspace
}) {
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!poNumber) return;
    setLoading(true);
    fetch(`${API_BASE}/api/orders/${poNumber}/variation-document-data`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setDocData(data);
        setErrorMsg('');
      })
      .catch(err => {
        console.error('Failed to load variation document data:', err);
        setErrorMsg('Failed to load official variation document data.');
      })
      .finally(() => setLoading(false));
  }, [poNumber]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block' }} />
        Compiling Revision & Variation Audit Document...
      </div>
    );
  }

  if (errorMsg || !docData) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <AlertCircle size={32} color="var(--text-danger)" style={{ margin: '0 auto 10px auto', display: 'block' }} />
        <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-danger)' }}>Failed to Load Document</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{errorMsg || 'No variation data found.'}</p>
        <button className="btn btn-secondary btn-sm" onClick={onBackToWorkspace} style={{ marginTop: '12px' }}>
          &larr; Return to Workspace
        </button>
      </div>
    );
  }

  const { client, project, financial_summary, itemized_ledger = [] } = docData;
  const isPositiveNet = financial_summary.net_variation > 0;
  const isNegativeNet = financial_summary.net_variation < 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ACTION TOOLBAR (HIDDEN ON PRINT) */}
      <div className="no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '12px 18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            type="button" 
            className="btn btn-ghost btn-sm"
            onClick={onBackToWorkspace}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={14} /> Back to BOQ Workspace
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>&bull;</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Client-Facing Revision & Variation Document
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={handlePrint}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={14} /> Print / Export PDF 📄
          </button>
        </div>
      </div>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #ffffff !important; color: #000000 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; }
          .variation-doc-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .page-break { page-break-before: always; }
        }
      `}</style>

      {/* HIGH-FIDELITY OFFICIAL DOCUMENT CANVAS */}
      <div className="variation-doc-container" style={{
        background: '#ffffff',
        color: '#0f172a',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        padding: '36px 44px',
        maxWidth: '1000px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* DOCUMENT HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '1px', color: '#0f172a' }}>
              ONE TO ONE
            </div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
              Architectural Lighting & Supply
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
              info@onetoone.co.za &bull; www.onetoone.co.za
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
              REVISION & VARIATION AUDIT
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: '#185fa5', marginTop: '4px' }}>
              {docData.document_ref}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
              Date Issued: <strong>{docData.document_date}</strong>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              Order Reference: <strong>{docData.order_po}</strong>
              {docData.is_sub_order && <span style={{ marginLeft: '6px', color: '#8b5cf6' }}>({docData.phase_name || 'Sub-Order'})</span>}
            </div>
          </div>
        </div>

        {/* PROJECT & CLIENT VITALS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px', background: '#f8fafc', padding: '16px 20px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
              Client Information
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              {client.company || client.name || 'Client Details'}
            </div>
            {client.contact && <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>Attn: {client.contact}</div>}
            {client.email && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{client.email}</div>}
            {client.phone && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{client.phone}</div>}
            {client.address && <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', lineHeight: 1.3 }}>Site: {client.address}</div>}
          </div>

          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
              Project Information
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              {docData.order_name}
            </div>
            <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>Project: {project.name || 'General Project'}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>PM: {project.pm || 'Dani'}</div>
            {project.pm_email && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{project.pm_email}</div>}
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>VAT Reg: 4420275822 &bull; Modus Holdings</div>
          </div>
        </div>

        {/* EXECUTIVE FINANCIAL RECONCILIATION SUMMARY */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#0f172a', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📊 Executive Financial Summary & Variation Balance</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            {/* PREVIOUS TOTAL */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', background: '#f8fafc' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                1. Previous Approved Total
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                R {financial_summary.original_order_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Excl. VAT</div>
            </div>

            {/* CREDITS / SWAPPED OUT */}
            <div style={{ border: '1px solid #fca5a5', borderRadius: '6px', padding: '12px', background: '#fef2f2' }}>
              <div style={{ fontSize: '10px', color: '#b91c1c', textTransform: 'uppercase', fontWeight: 700 }}>
                2. Less Credits (Swapped Out)
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>
                -R {financial_summary.total_credits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: '2px' }}>Original Scope Deductions</div>
            </div>

            {/* ADDITIONS / REPLACEMENTS */}
            <div style={{ border: '1px solid #86efac', borderRadius: '6px', padding: '12px', background: '#f0fdf4' }}>
              <div style={{ fontSize: '10px', color: '#15803d', textTransform: 'uppercase', fontWeight: 700 }}>
                3. Plus Additions (New Scope)
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                +R {financial_summary.total_additions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '10px', color: '#15803d', marginTop: '2px' }}>Replacement Fittings</div>
            </div>

            {/* NET VARIATION DIFFERENCE */}
            <div style={{ border: `1.5px solid ${isPositiveNet ? '#86efac' : isNegativeNet ? '#fca5a5' : '#cbd5e1'}`, borderRadius: '6px', padding: '12px', background: isPositiveNet ? '#f0fdf4' : isNegativeNet ? '#fef2f2' : '#f8fafc' }}>
              <div style={{ fontSize: '10px', color: isPositiveNet ? '#15803d' : isNegativeNet ? '#b91c1c' : '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                4. Net Variation Difference
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: isPositiveNet ? '#15803d' : isNegativeNet ? '#b91c1c' : '#0f172a', marginTop: '4px' }}>
                {isPositiveNet ? `+R ${financial_summary.net_variation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : isNegativeNet ? `-R ${Math.abs(financial_summary.net_variation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R 0.00 (Even)'}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Net Adjustment</div>
            </div>

            {/* REVISED CONTRACT TOTAL */}
            <div style={{ border: '1.5px solid #0f172a', borderRadius: '6px', padding: '12px', background: '#0f172a', color: '#ffffff' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                5. Revised Contract Total
              </div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff', marginTop: '4px' }}>
                R {financial_summary.revised_order_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '2px' }}>
                R {financial_summary.revised_order_value_incl_vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Incl. VAT
              </div>
            </div>
          </div>
        </div>

        {/* ARCHITECTURAL SCHEDULE OF VARIATIONS: SIDE-BY-SIDE BEFORE & AFTER */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#0f172a', fontWeight: 800 }}>
              ⚖️ Contractual Schedule of Variations (Before &rarr; After)
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Showing original approved specification versus approved replacement fitting
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left', border: '1px solid #cbd5e1' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#ffffff', fontWeight: 700 }}>
                <th style={{ padding: '10px 12px', width: '130px' }}>Room / Area</th>
                <th style={{ padding: '10px 12px', width: '260px' }}>Original Fitting (Before)</th>
                <th style={{ padding: '10px 12px', width: '260px' }}>Replacement Fitting (After)</th>
                <th style={{ padding: '10px 12px', width: '110px', textAlign: 'right' }}>Net Difference</th>
                <th style={{ padding: '10px 12px' }}>Reason & Site Instruction</th>
              </tr>
            </thead>
            <tbody>
              {((docData.paired_variations && docData.paired_variations.length > 0) ? docData.paired_variations : itemized_ledger).length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748b', background: '#f8fafc' }}>
                    No product variations or substitutions recorded on this order.
                  </td>
                </tr>
              ) : (
                ((docData.paired_variations && docData.paired_variations.length > 0) ? docData.paired_variations : []).map((pv, idx) => {
                  const isPositive = pv.line_net_diff > 0;
                  const isNegative = pv.line_net_diff < 0;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      {/* ROOM */}
                      <td style={{ padding: '12px', fontWeight: 700, color: '#334155', verticalAlign: 'top' }}>
                        {pv.room}
                      </td>

                      {/* ORIGINAL SPEC (BEFORE) */}
                      <td style={{ padding: '12px', verticalAlign: 'top', background: 'rgba(239, 68, 68, 0.03)', borderRight: '1px solid #e2e8f0' }}>
                        {pv.original_qty > 0 ? (
                          <>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#b91c1c', fontSize: '12px' }}>
                              {pv.original_code}
                            </div>
                            <div style={{ color: '#475569', fontSize: '11px', marginTop: '3px', lineHeight: 1.35 }}>
                              {pv.original_desc}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#991b1b', marginTop: '4px', fontWeight: 600 }}>
                              Qty: {pv.original_qty} &bull; R {pv.original_unit_retail.toLocaleString(undefined, { minimumFractionDigits: 2 })} ea &bull; <span style={{ textDecoration: 'line-through' }}>-R {pv.original_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          </>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>— None (New Scope Item)</span>
                        )}
                      </td>

                      {/* REPLACEMENT SPEC (AFTER) */}
                      <td style={{ padding: '12px', verticalAlign: 'top', background: 'rgba(22, 163, 74, 0.03)', borderRight: '1px solid #e2e8f0' }}>
                        {pv.replacement_qty > 0 ? (
                          <>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#15803d', fontSize: '12px' }}>
                              {pv.replacement_code}
                            </div>
                            <div style={{ color: '#1e293b', fontSize: '11px', marginTop: '3px', fontWeight: 500, lineHeight: 1.35 }}>
                              {pv.replacement_desc}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#166534', marginTop: '4px', fontWeight: 600 }}>
                              Qty: {pv.replacement_qty} &bull; R {pv.replacement_unit_retail.toLocaleString(undefined, { minimumFractionDigits: 2 })} ea &bull; +R {pv.replacement_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </>
                        ) : (
                          <span style={{ color: '#b91c1c', fontWeight: 600, fontSize: '11px' }}>Credit Only (Removed from Scope)</span>
                        )}
                      </td>

                      {/* NET DIFFERENCE */}
                      <td style={{ padding: '12px', verticalAlign: 'top', textAlign: 'right', fontWeight: 800, borderRight: '1px solid #e2e8f0', color: isPositive ? '#16a34a' : isNegative ? '#dc2626' : '#64748b' }}>
                        <div style={{ fontSize: '12.5px' }}>
                          {isPositive ? `+R ${pv.line_net_diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : isNegative ? `-R ${Math.abs(pv.line_net_diff).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'R 0.00'}
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                          {isPositive ? 'Cost Increase' : isNegative ? 'Cost Reduction' : 'Even Swap'}
                        </div>
                      </td>

                      {/* REASON */}
                      <td style={{ padding: '12px', verticalAlign: 'top', color: '#334155', fontSize: '11px', lineHeight: 1.4 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>Instruction:</div>
                        <em>{pv.reason}</em>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #0f172a', fontWeight: 800 }}>
                <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#0f172a' }}>
                  NET VARIATION IMPACT (EXCL. VAT):
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: isPositiveNet ? '#16a34a' : isNegativeNet ? '#dc2626' : '#0f172a' }}>
                  {isPositiveNet ? `+R ${financial_summary.net_variation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : isNegativeNet ? `-R ${Math.abs(financial_summary.net_variation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R 0.00'}
                </td>
                <td style={{ padding: '12px', fontSize: '11px', color: '#64748b' }}>
                  Reflected in revised order schedule
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* CLIENT ACCEPTANCE & SIGN-OFF BLOCK */}
        <div style={{
          border: '1.5px solid #cbd5e1',
          borderRadius: '8px',
          padding: '20px 24px',
          background: '#f8fafc',
          pageBreakInside: 'avoid'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.8px', marginBottom: '8px' }}>
            ✍️ Client Authorization & Acceptance of Scope Variation
          </div>
          <p style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.4, margin: '0 0 20px 0' }}>
            By signing below, the Client / Authorized Representative accepts and authorizes the product substitutions, credit adjustments, and revised contract totals set forth in this Revision & Variation Audit Document. These adjustments form an integral amendment to the primary procurement contract.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px' }}>
            {/* CLIENT SIGNATURE LINE */}
            <div>
              <div style={{ borderBottom: '1.5px solid #0f172a', height: '40px', marginBottom: '6px' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                <span>Authorized Client Signature</span>
                <span>Date: ____ / ____ / 2026</span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: 600, marginTop: '6px' }}>
                Printed Name: ___________________________
              </div>
            </div>

            {/* ONE TO ONE REPRESENTATIVE SIGNATURE LINE */}
            <div>
              <div style={{ borderBottom: '1.5px solid #0f172a', height: '40px', marginBottom: '6px' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                <span>One to One Lighting Representative</span>
                <span>Date: ____ / ____ / 2026</span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: 600, marginTop: '6px' }}>
                Printed Name: {project.pm || 'Dani'}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER METADATA */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '10.5px', color: '#94a3b8' }}>
          Generated via One to One Ecosystem Portal &bull; Order Ref: {docData.order_po} &bull; Document Ref: {docData.document_ref}
        </div>
      </div>
    </div>
  );
}

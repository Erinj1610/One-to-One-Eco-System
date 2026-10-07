import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Sparkles, 
  UploadCloud, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Save, 
  Trash2, 
  Layers, 
  ChevronRight, 
  Loader2, 
  RefreshCw,
  ExternalLink,
  Plus,
  Eye
} from 'lucide-react';
import { API_BASE } from '../../api_config';

/**
 * TechnicalPackModal:
 * Allows building, AI-analyzing, and exporting client/contractor-ready
 * One to One Technical Packs inside the Orders module.
 */
export default function TechnicalPackModal({
  isOpen,
  onClose,
  orderId,
  projectFullName,
  clientCompany,
  supplierName,
  orderItems = []
}) {
  const [fittingsData, setFittingsData] = useState([]);
  const [selectedMark, setSelectedMark] = useState(null);
  const [uploadedFilesByMark, setUploadedFilesByMark] = useState({});
  const [analyzingMarks, setAnalyzingMarks] = useState({});
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [savingToDrive, setSavingToDrive] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Group active order items by Type Code (A1, A2, AX1, etc.)
  useEffect(() => {
    if (!isOpen) return;

    const groups = {};
    orderItems.forEach(item => {
      // Exclude blank spacers or zero qty items if appropriate
      if (item.isSpacer || (!item.type && !item.code && !item.description)) return;
      
      const rawType = (item.type || '').trim().toUpperCase();
      const mark = rawType || 'UNSPECIFIED';

      if (!groups[mark]) {
        groups[mark] = {
          mark,
          items: []
        };
      }
      groups[mark].items.push(item);
    });

    // Structure each fitting entry
    const initializedFittings = Object.values(groups).map(g => {
      // First item is typically the luminaire
      const mainItem = g.items[0] || {};
      const siblingItems = g.items.slice(1);

      // Auto-extract accessories summary from sibling items
      const accessoriesSummary = siblingItems.map(sib => 
        `- ${sib.qty || 1}x ${sib.code || sib.description || sib.oneOneCode || 'Accessory'}`
      );

      return {
        type_code: g.mark,
        product_name: mainItem.description || mainItem.code || `Fixture ${g.mark}`,
        supplier_code: mainItem.code || mainItem.oneOneCode || '',
        supplier_name: mainItem.supplier || supplierName || '',
        category: 'Interior Architectural Downlight',
        ratings: {
          cost: 3,
          quality: 4,
          size: 3,
          difficulty: 2,
          versatility: 4
        },
        specifications: {
          cutout_mm: 'Ø76mm',
          ip_rating: 'IP20',
          dimming: mainItem.dimming || 'Phase Dimming',
          cri: '90+',
          cct: '3000K',
          finish: 'White',
          wattage: '7.5W'
        },
        electrical: {
          driver_location: 'Remote Wired (Ceiling Void)',
          fittings_per_driver: '1 fitting per driver',
          connection_used: 'Series Connection',
          max_length: 'Max 15m (1.5mm² cable)'
        },
        accessories_summary: accessoriesSummary.length > 0 ? accessoriesSummary : ['- Standard Mounting Frame'],
        installation_steps: [
          {
            step_number: 1,
            title: 'Cut-out',
            instruction: 'Adhere strictly to the cut-out diameter. Ensure ceiling void clearance exceeds luminaire depth.',
            site_note: 'Ceiling thickness must not exceed 20mm.'
          },
          {
            step_number: 2,
            title: 'Driver & Electrical Wiring',
            instruction: 'Isolate mains power. Connect primary AC leads to the driver. Run secondary DC cables to the fixture.',
            site_note: 'Ensure polarity matches driver markings.'
          },
          {
            step_number: 3,
            title: 'Fixture Mounting',
            instruction: 'Retract spring wings, insert housing into ceiling cut-out, and seat firmly.',
            site_note: 'Align bezel flush with ceiling finish.'
          }
        ]
      };
    });

    setFittingsData(initializedFittings);
    if (initializedFittings.length > 0) {
      setSelectedMark(initializedFittings[0].type_code);
    }
  }, [isOpen, orderItems, supplierName]);

  const activeFitting = useMemo(() => {
    return fittingsData.find(f => f.type_code === selectedMark) || fittingsData[0];
  }, [fittingsData, selectedMark]);

  if (!isOpen) return null;

  // Handle PDF file attachments
  const handleFileChange = (mark, e) => {
    const files = Array.from(e.target.files);
    setUploadedFilesByMark(prev => ({
      ...prev,
      [mark]: [...(prev[mark] || []), ...files]
    }));
  };

  const handleRemoveFile = (mark, index) => {
    setUploadedFilesByMark(prev => ({
      ...prev,
      [mark]: (prev[mark] || []).filter((_, i) => i !== index)
    }));
  };

  // Run Gemini Multimodal Analysis on uploaded supplier sheets
  const handleAnalyzeWithAI = async (mark) => {
    const targetFitting = fittingsData.find(f => f.type_code === mark);
    if (!targetFitting) return;

    const files = uploadedFilesByMark[mark] || [];
    setAnalyzingMarks(prev => ({ ...prev, [mark]: true }));
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append('fitting_meta_json', JSON.stringify({
        type_code: targetFitting.type_code,
        product_name: targetFitting.product_name,
        supplier_code: targetFitting.supplier_code,
        supplier_name: targetFitting.supplier_name,
        dimming: targetFitting.specifications?.dimming
      }));

      files.forEach(f => {
        formData.append('files', f);
      });

      const res = await fetch(`${API_BASE}/api/technical-pack/analyze-fitting`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Analysis failed');
      }

      const json = await res.json();
      const analyzed = json.data;

      // Merge analyzed results into fitting data
      setFittingsData(prev => prev.map(f => {
        if (f.type_code !== mark) return f;
        return {
          ...f,
          product_name: analyzed.product_name || f.product_name,
          category: analyzed.category || f.category,
          ratings: { ...f.ratings, ...(analyzed.ratings || {}) },
          specifications: { ...f.specifications, ...(analyzed.specifications || {}) },
          electrical: { ...f.electrical, ...(analyzed.electrical || {}) },
          accessories_summary: analyzed.accessories_summary?.length > 0 ? analyzed.accessories_summary : f.accessories_summary,
          installation_steps: analyzed.installation_steps?.length > 0 ? analyzed.installation_steps : f.installation_steps
        };
      }));

      setStatusMessage({ type: 'success', text: `AI successfully analyzed specifications for ${mark}!` });
    } catch (e) {
      console.error("AI Analysis error:", e);
      setStatusMessage({ type: 'danger', text: `AI analysis failed: ${e.message}` });
    } finally {
      setAnalyzingMarks(prev => ({ ...prev, [mark]: false }));
    }
  };

  // Update specific fitting field
  const updateActiveFittingField = (path, val) => {
    if (!activeFitting) return;
    setFittingsData(prev => prev.map(f => {
      if (f.type_code !== activeFitting.type_code) return f;
      const copy = JSON.parse(JSON.stringify(f));
      const parts = path.split('.');
      let curr = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!curr[parts[i]]) curr[parts[i]] = {};
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = val;
      return copy;
    }));
  };

  // Update installation step
  const updateInstallationStep = (index, field, val) => {
    if (!activeFitting) return;
    const steps = [...(activeFitting.installation_steps || [])];
    if (steps[index]) {
      steps[index][field] = val;
      updateActiveFittingField('installation_steps', steps);
    }
  };

  // Add installation step
  const addInstallationStep = () => {
    if (!activeFitting) return;
    const steps = [...(activeFitting.installation_steps || [])];
    steps.push({
      step_number: steps.length + 1,
      title: 'New Step',
      instruction: 'Enter electrician instruction...',
      site_note: 'Enter site or safety note...'
    });
    updateActiveFittingField('installation_steps', steps);
  };

  // Remove installation step
  const removeInstallationStep = (index) => {
    if (!activeFitting) return;
    const steps = (activeFitting.installation_steps || []).filter((_, i) => i !== index);
    const renumbered = steps.map((s, idx) => ({ ...s, step_number: idx + 1 }));
    updateActiveFittingField('installation_steps', renumbered);
  };

  // Download PDF directly
  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    setStatusMessage(null);
    try {
      const payload = {
        project_name: projectFullName || 'One to One Project',
        client_name: clientCompany || '',
        order_id: orderId || '',
        fittings: fittingsData
      };

      const res = await fetch(`${API_BASE}/api/technical-pack/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errDetail = 'PDF generation failed on server';
        try {
          const errJson = await res.json();
          errDetail = errJson.detail || errDetail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OneToOne_Technical_Pack_${orderId || 'Export'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setStatusMessage({ type: 'success', text: 'Technical pack PDF downloaded successfully!' });
    } catch (e) {
      console.error(e);
      setStatusMessage({ type: 'danger', text: `Failed to download PDF: ${e.message}` });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Save PDF directly to project Google Drive folder
  const handleSaveToDrive = async () => {
    setSavingToDrive(true);
    setStatusMessage(null);
    try {
      const payload = {
        order_id: orderId,
        project_name: projectFullName || '',
        client_name: clientCompany || '',
        supplier_name: supplierName || '',
        pdf_payload: {
          project_name: projectFullName || 'One to One Project',
          client_name: clientCompany || '',
          order_id: orderId || '',
          fittings: fittingsData
        }
      };

      const res = await fetch(`${API_BASE}/api/technical-pack/save-to-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Save to Drive failed');
      }

      const json = await res.json();
      setStatusMessage({ type: 'success', text: json.message || 'Saved to Google Drive!' });
    } catch (e) {
      console.error(e);
      setStatusMessage({ type: 'danger', text: `Failed to save to Drive: ${e.message}` });
    } finally {
      setSavingToDrive(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary, #ffffff)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '1280px',
        height: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-secondary, #f8fafc)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📘</span>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                One to One Technical Pack Builder
              </h2>
              <span style={{
                background: '#1e293b',
                color: '#fff',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
                letterSpacing: '0.5px'
              }}>
                ORDER {orderId}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Project: <strong>{projectFullName || 'N/A'}</strong> &bull; Client: <strong>{clientCompany || 'N/A'}</strong> &bull; Standardized contractor handover specification & wiring rules
            </p>
          </div>

          {/* ACTIONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleSaveToDrive}
              disabled={savingToDrive || generatingPdf}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Save directly to project Google Drive Documents folder"
            >
              {savingToDrive ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {savingToDrive ? 'Saving...' : 'Save to Drive'}
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={savingToDrive || generatingPdf}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {generatingPdf ? 'Rendering PDF...' : 'Download Technical Pack (PDF)'}
            </button>

            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '16px', fontWeight: 700, marginLeft: '8px' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* STATUS BANNER */}
        {statusMessage && (
          <div style={{
            padding: '8px 24px',
            fontSize: '12.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: statusMessage.type === 'success' ? '#10b981' : '#ef4444',
            borderBottom: '1px solid var(--border)'
          }}>
            {statusMessage.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* MODAL BODY (TWO COLUMNS: FITTINGS LIST ON LEFT, DETAIL EDITOR ON RIGHT) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* LEFT SIDEBAR: FITTING MARKS LIST */}
          <div style={{
            width: '280px',
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-secondary, #f8fafc)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
              Type Marks ({fittingsData.length})
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {fittingsData.map(f => {
                const isSelected = f.type_code === selectedMark;
                const isAnalyzing = analyzingMarks[f.type_code];
                const filesCount = (uploadedFilesByMark[f.type_code] || []).length;

                return (
                  <div
                    key={f.type_code}
                    onClick={() => setSelectedMark(f.type_code)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '6px',
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid #185fa5' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(24, 95, 165, 0.08)' : 'var(--bg-primary, #ffffff)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '13px', color: isSelected ? '#185fa5' : 'var(--text-primary)' }}>
                        {f.type_code}
                      </span>
                      {isAnalyzing && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#185fa5' }}>
                          <Loader2 size={11} className="animate-spin" /> AI
                        </span>
                      )}
                      {!isAnalyzing && filesCount > 0 && (
                        <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '1px 6px', borderRadius: '10px', fontWeight: 600 }}>
                          {filesCount} {filesCount === 1 ? 'doc' : 'docs'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.product_name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT MAIN PANEL: ACTIVE FITTING EDITOR */}
          {activeFitting ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              
              {/* TOP CARD: SUPPLIER PDF UPLOAD & AI SYNTHESIS */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(24, 95, 165, 0.05), rgba(16, 185, 129, 0.05))',
                border: '1.5px dashed rgba(24, 95, 165, 0.3)',
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} color="#185fa5" />
                      Multimodal AI Specification Ingestion ({activeFitting.type_code})
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      Upload supplier datasheets or installation manuals (PDF) to automatically populate cut-outs, ratings, wiring rules, and contractor steps.
                    </p>
                  </div>

                  <button
                    onClick={() => handleAnalyzeWithAI(activeFitting.type_code)}
                    disabled={analyzingMarks[activeFitting.type_code]}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {analyzingMarks[activeFitting.type_code] ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {analyzingMarks[activeFitting.type_code] ? 'Extracting...' : 'Analyze with AI'}
                  </button>
                </div>

                {/* FILE UPLOAD & ATTACHMENT LIST */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UploadCloud size={14} /> Attach Supplier PDF(s)
                    <input
                      type="file"
                      accept=".pdf"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileChange(activeFitting.type_code, e)}
                    />
                  </label>

                  {(uploadedFilesByMark[activeFitting.type_code] || []).map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--bg-primary, #ffffff)',
                        border: '1px solid var(--border)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                    >
                      <FileText size={12} color="#185fa5" />
                      <span>{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(activeFitting.type_code, idx)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 1: HEADER & RATINGS */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                  1. Front Technical Sheet Header & 5-Star Ratings
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Product Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.product_name || ''}
                      onChange={e => updateActiveFittingField('product_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Supplier Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.supplier_code || ''}
                      onChange={e => updateActiveFittingField('supplier_code', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Category</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.category || ''}
                      onChange={e => updateActiveFittingField('category', e.target.value)}
                    />
                  </div>
                </div>

                {/* RATINGS (1-5 DOTS) */}
                <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                    {['cost', 'quality', 'size', 'difficulty', 'versatility'].map(metric => (
                      <div key={metric} style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>
                          {metric}
                        </span>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                          {[1, 2, 3, 4, 5].map(star => {
                            const currentVal = activeFitting.ratings?.[metric] || 1;
                            const isActive = star <= currentVal;
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => updateActiveFittingField(`ratings.${metric}`, star)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  background: isActive ? '#1e293b' : '#cbd5e1',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 2: SPECIFICATIONS & ELECTRICAL RULES */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                  2. Architectural Specs & Electrical Calculations
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cut-out Diameter</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.specifications?.cutout_mm || ''}
                      onChange={e => updateActiveFittingField('specifications.cutout_mm', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>IP Rating</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.specifications?.ip_rating || ''}
                      onChange={e => updateActiveFittingField('specifications.ip_rating', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dimming Protocol</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.specifications?.dimming || ''}
                      onChange={e => updateActiveFittingField('specifications.dimming', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>CRI</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.specifications?.cri || ''}
                      onChange={e => updateActiveFittingField('specifications.cri', e.target.value)}
                    />
                  </div>
                </div>

                {/* ELECTRICAL WIRING RULES */}
                <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#185fa5', display: 'block', marginBottom: '10px' }}>
                    ⚡ Electrician Wiring Rules (Calculated from Driver & BOQ Pairing)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Driver Location</label>
                      <input
                        type="text"
                        className="form-control"
                        value={activeFitting.electrical?.driver_location || ''}
                        onChange={e => updateActiveFittingField('electrical.driver_location', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Fittings per Driver</label>
                      <input
                        type="text"
                        className="form-control"
                        value={activeFitting.electrical?.fittings_per_driver || ''}
                        onChange={e => updateActiveFittingField('electrical.fittings_per_driver', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Connection Type</label>
                      <input
                        type="text"
                        className="form-control"
                        value={activeFitting.electrical?.connection_used || ''}
                        onChange={e => updateActiveFittingField('electrical.connection_used', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Max Cable Run Length</label>
                      <input
                        type="text"
                        className="form-control"
                        value={activeFitting.electrical?.max_length || ''}
                        onChange={e => updateActiveFittingField('electrical.max_length', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: INCLUDED ACCESSORIES */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                  3. Ordered Accessories (Filtered to this BOQ Type Code)
                </h4>

                <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {(activeFitting.accessories_summary || []).map((acc, aIdx) => (
                    <div key={aIdx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <input
                        type="text"
                        className="form-control"
                        style={{ height: '30px', fontSize: '12px' }}
                        value={acc}
                        onChange={e => {
                          const updated = [...activeFitting.accessories_summary];
                          updated[aIdx] = e.target.value;
                          updateActiveFittingField('accessories_summary', updated);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = activeFitting.accessories_summary.filter((_, i) => i !== aIdx);
                          updateActiveFittingField('accessories_summary', updated);
                        }}
                        className="btn btn-ghost btn-xs"
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(activeFitting.accessories_summary || []), '- New accessory'];
                      updateActiveFittingField('accessories_summary', updated);
                    }}
                    className="btn btn-ghost btn-xs"
                    style={{ fontSize: '11px', color: '#185fa5' }}
                  >
                    + Add Accessory Line
                  </button>
                </div>
              </div>

              {/* SECTION 4: STEP-BY-STEP INSTALLATION INSTRUCTIONS */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                    4. Electrician Installation Steps
                  </h4>
                  <button
                    type="button"
                    onClick={addInstallationStep}
                    className="btn btn-ghost btn-xs"
                    style={{ fontSize: '11px', color: '#185fa5' }}
                  >
                    + Add Step
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(activeFitting.installation_steps || []).map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-primary, #ffffff)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '14px',
                        display: 'flex',
                        gap: '12px'
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#1e293b',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {step.step_number || idx + 1}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginBottom: '6px' }}>
                          <input
                            type="text"
                            placeholder="Step Title (e.g. Cut-out, Wiring, Assembly)"
                            className="form-control"
                            style={{ fontWeight: 700, height: '28px', fontSize: '12px' }}
                            value={step.title || ''}
                            onChange={e => updateInstallationStep(idx, 'title', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeInstallationStep(idx)}
                            className="btn btn-ghost btn-xs"
                          >
                            <Trash2 size={12} color="#ef4444" />
                          </button>
                        </div>

                        <textarea
                          rows={2}
                          placeholder="Electrician instruction..."
                          className="form-control"
                          style={{ fontSize: '11.5px', marginBottom: '6px' }}
                          value={step.instruction || ''}
                          onChange={e => updateInstallationStep(idx, 'instruction', e.target.value)}
                        />

                        <input
                          type="text"
                          placeholder="Site/Safety note (e.g. Ceiling thickness limit)..."
                          className="form-control"
                          style={{ fontSize: '11px', fontStyle: 'italic', height: '26px' }}
                          value={step.site_note || ''}
                          onChange={e => updateInstallationStep(idx, 'site_note', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              No fitting selected
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

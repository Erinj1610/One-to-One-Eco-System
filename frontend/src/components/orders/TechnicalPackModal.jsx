import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Eye,
  Image as ImageIcon,
  Sliders,
  Maximize2
} from 'lucide-react';
import { API_BASE } from '../../api_config';

/**
 * TechnicalPackModal:
 * Allows building, AI-analyzing (powered by Gemini 2.5 Pro with automatic PDF diagram extraction),
 * live split-screen previewing, and exporting client/contractor-ready
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
  
  // Live Split-Screen Interactive Preview State
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const previewDebounceRef = useRef(null);

  // Group active order items by Type Code (A1, A2, AX1, etc.)
  useEffect(() => {
    if (!isOpen) return;

    const groups = {};
    orderItems.forEach(item => {
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

    const initializedFittings = Object.values(groups).map(g => {
      const mainItem = g.items[0] || {};
      const siblingItems = g.items.slice(1);

      const accessoriesSummary = siblingItems.map(sib => 
        `- ${sib.qty || 1}x ${sib.code || sib.description || sib.oneOneCode || 'Accessory'}`
      );

      return {
        type_code: g.mark,
        range_name: 'Copper Range',
        installation_tag: 'Easy Installation',
        product_name: mainItem.description || mainItem.code || `Fixture ${g.mark}`,
        supplier_code: mainItem.code || mainItem.oneOneCode || '',
        supplier_name: mainItem.supplier || supplierName || '',
        category: 'Interior Architectural Downlight',
        hero_image_url: null,
        technical_drawing_url: null,
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
            title: 'Cut-out & Void Provisions',
            instruction: 'Adhere strictly to the cut-out diameter. Ensure ceiling void clearance exceeds luminaire depth.',
            site_note: 'Ceiling thickness must not exceed 20mm.',
            diagram_image_url: null
          },
          {
            step_number: 2,
            title: 'Driver & Electrical Connections',
            instruction: 'Isolate mains power. Connect primary AC leads to the driver. Run secondary DC cables to the fixture.',
            site_note: 'Ensure polarity matches driver markings.',
            diagram_image_url: null
          },
          {
            step_number: 3,
            title: 'Fixture Mounting & Outer Frame',
            instruction: 'Retract spring wings, insert housing into ceiling cut-out, and seat firmly.',
            site_note: 'Align bezel flush with ceiling finish.',
            diagram_image_url: null
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

  // Fetch Live Preview HTML with debouncing
  useEffect(() => {
    if (!isOpen || !showLivePreview || fittingsData.length === 0) return;

    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const payload = {
          project_name: projectFullName || 'One to One Project',
          client_name: clientCompany || '',
          order_id: orderId || '',
          fittings: fittingsData
        };

        const res = await fetch(`${API_BASE}/api/technical-pack/preview-html`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const json = await res.json();
          setPreviewHtml(json.html || '');
        }
      } catch (e) {
        console.error("Preview render failed:", e);
      } finally {
        setLoadingPreview(false);
      }
    }, 450);

    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [isOpen, showLivePreview, fittingsData, projectFullName, clientCompany, orderId]);

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

  // Run Gemini 2.5 Pro Multimodal Analysis on uploaded supplier sheets
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
        let errDetail = 'Analysis failed';
        try {
          const errJson = await res.json();
          errDetail = errJson.detail || errDetail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const json = await res.json();
      const analyzed = json.data;

      // Merge analyzed results and extracted image crops into fitting data
      setFittingsData(prev => prev.map(f => {
        if (f.type_code !== mark) return f;
        return {
          ...f,
          product_name: analyzed.product_name || analyzed.fitting?.description || f.product_name,
          range_name: analyzed.range_name || f.range_name,
          installation_tag: analyzed.installation_tag || f.installation_tag,
          category: analyzed.category || f.category,
          hero_image_url: analyzed.hero_image_url || f.hero_image_url,
          technical_drawing_url: analyzed.technical_drawing_url || f.technical_drawing_url,
          ratings: { ...f.ratings, ...(analyzed.ratings || {}) },
          specifications: {
            ...f.specifications,
            cutout_mm: analyzed.details?.cut_out || analyzed.specifications?.cutout_mm || f.specifications.cutout_mm,
            ip_rating: analyzed.details?.ingress_protection || analyzed.specifications?.ip_rating || f.specifications.ip_rating,
            dimming: analyzed.details?.dimming_protocol || analyzed.specifications?.dimming || f.specifications.dimming,
            cri: analyzed.details?.cri || analyzed.specifications?.cri || f.specifications.cri,
            wattage: analyzed.details?.light_source || analyzed.specifications?.wattage || f.specifications.wattage
          },
          electrical: {
            ...f.electrical,
            driver_location: analyzed.connection?.driver_location || analyzed.electrical?.driver_location || f.electrical.driver_location,
            fittings_per_driver: analyzed.connection?.fittings_per_driver || analyzed.electrical?.fittings_per_driver || f.electrical.fittings_per_driver,
            connection_used: analyzed.connection?.connection_used || analyzed.electrical?.connection_used || f.electrical.connection_used,
            max_length: analyzed.connection?.max_length || analyzed.electrical?.max_length || f.electrical.max_length
          },
          dimensions: { ...f.dimensions, ...(analyzed.dimensions || {}) },
          accessories_summary: analyzed.accessories_summary?.length > 0 ? analyzed.accessories_summary : f.accessories_summary,
          installation_steps: analyzed.installation_steps?.length > 0 ? analyzed.installation_steps : f.installation_steps
        };
      }));

      setStatusMessage({ type: 'success', text: `Gemini 2.5 Pro successfully analyzed specs & extracted diagrams for ${mark}!` });
    } catch (e) {
      console.error("AI Analysis error:", e);
      setStatusMessage({ type: 'danger', text: `AI analysis failed: ${e.message}` });
    } finally {
      setAnalyzingMarks(prev => ({ ...prev, [mark]: false }));
    }
  };

  // Direct manual image upload for hero or technical drawing
  const handleManualImageUpload = (field, e) => {
    const file = e.target.files[0];
    if (!file || !activeFitting) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      updateActiveFittingField(field, uploadEvent.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Direct manual image upload for an installation step
  const handleStepImageUpload = (stepIdx, e) => {
    const file = e.target.files[0];
    if (!file || !activeFitting) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const steps = [...(activeFitting.installation_steps || [])];
      if (steps[stepIdx]) {
        steps[stepIdx].diagram_image_url = uploadEvent.target.result;
        updateActiveFittingField('installation_steps', steps);
      }
    };
    reader.readAsDataURL(file);
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
      site_note: 'Enter site or safety note...',
      diagram_image_url: null
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
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary, #ffffff)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '1480px',
        height: '95vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '14px 24px',
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
                One to One Technical Pack Builder & AI Vision
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
              <span style={{
                background: 'rgba(24, 95, 165, 0.1)',
                color: '#185fa5',
                fontSize: '10.5px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 700
              }}>
                ✨ Powered by Gemini 2.5 Pro
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Project: <strong>{projectFullName || 'N/A'}</strong> &bull; Client: <strong>{clientCompany || 'N/A'}</strong> &bull; Adaptive Swiss-layout with visual diagram extraction
            </p>
          </div>

          {/* ACTIONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Live Preview Toggle */}
            <button
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`btn btn-sm ${showLivePreview ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Eye size={14} />
              {showLivePreview ? 'Live Preview (Active)' : 'Show Live Preview'}
            </button>

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

        {/* MAIN BODY: THREE PANELS (MARKS LIST | EDITOR | LIVE A4 PREVIEW) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* 1. LEFT SIDEBAR: FITTING MARKS LIST */}
          <div style={{
            width: '240px',
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
                const hasExtractedImages = !!(f.hero_image_url || f.technical_drawing_url);

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {hasExtractedImages && (
                          <span title="Visual diagrams extracted" style={{ fontSize: '11px' }}>🖼️</span>
                        )}
                        {isAnalyzing && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9.5px', color: '#185fa5' }}>
                            <Loader2 size={10} className="animate-spin" /> AI
                          </span>
                        )}
                        {!isAnalyzing && filesCount > 0 && (
                          <span style={{ fontSize: '9.5px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '1px 5px', borderRadius: '10px', fontWeight: 600 }}>
                            {filesCount} {filesCount === 1 ? 'doc' : 'docs'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.product_name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. MIDDLE PANEL: ACTIVE FITTING EDITOR */}
          {activeFitting ? (
            <div style={{ flex: showLivePreview ? 1.1 : 2, overflowY: 'auto', padding: '20px', borderRight: showLivePreview ? '1px solid var(--border)' : 'none' }}>
              
              {/* TOP CARD: SUPPLIER PDF UPLOAD & GEMINI 2.5 PRO EXTRACTION */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(24, 95, 165, 0.05), rgba(16, 185, 129, 0.05))',
                border: '1.5px dashed rgba(24, 95, 165, 0.3)',
                borderRadius: '8px',
                padding: '14px 18px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} color="#185fa5" />
                      Multimodal AI Diagram & Spec Extractor ({activeFitting.type_code})
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Upload supplier datasheets & manuals. Gemini 2.5 Pro automatically detects bounding boxes and crops diagrams for cut-outs and steps.
                    </p>
                  </div>

                  <button
                    onClick={() => handleAnalyzeWithAI(activeFitting.type_code)}
                    disabled={analyzingMarks[activeFitting.type_code]}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {analyzingMarks[activeFitting.type_code] ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {analyzingMarks[activeFitting.type_code] ? 'Extracting...' : 'Extract with Gemini 2.5 Pro'}
                  </button>
                </div>

                {/* FILE UPLOAD & ATTACHMENT LIST */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                        padding: '3px 8px',
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

              {/* SECTION: VISUAL DIAGRAM CROPS (HERO & CAD CUT-OUT) */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                  Extracted Architectural Diagrams & Images
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  
                  {/* HERO PHOTO CARD */}
                  <div style={{ background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>Hero Fitting Photo</span>
                      {activeFitting.hero_image_url && (
                        <button
                          onClick={() => updateActiveFittingField('hero_image_url', null)}
                          className="btn btn-ghost btn-xs"
                          style={{ color: '#ef4444', fontSize: '10px' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ height: '110px', background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '8px' }}>
                      {activeFitting.hero_image_url ? (
                        <img src={activeFitting.hero_image_url} alt="Hero" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>No photo extracted</span>
                      )}
                    </div>
                    <label className="btn btn-ghost btn-xs" style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px dashed var(--border)' }}>
                      <ImageIcon size={11} /> Upload / Replace Photo
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleManualImageUpload('hero_image_url', e)} />
                    </label>
                  </div>

                  {/* CAD CUT-OUT / DIMENSIONAL DRAWING CARD */}
                  <div style={{ background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>CAD Cut-Out & Dimensions</span>
                      {activeFitting.technical_drawing_url && (
                        <button
                          onClick={() => updateActiveFittingField('technical_drawing_url', null)}
                          className="btn btn-ghost btn-xs"
                          style={{ color: '#ef4444', fontSize: '10px' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ height: '110px', background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '8px' }}>
                      {activeFitting.technical_drawing_url ? (
                        <img src={activeFitting.technical_drawing_url} alt="Technical Drawing" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>No diagram extracted</span>
                      )}
                    </div>
                    <label className="btn btn-ghost btn-xs" style={{ cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px dashed var(--border)' }}>
                      <ImageIcon size={11} /> Upload / Replace Diagram
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleManualImageUpload('technical_drawing_url', e)} />
                    </label>
                  </div>

                </div>
              </div>

              {/* SECTION 1: HEADER & RATINGS */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                  1. Front Technical Sheet Header & 5-Star Ratings
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Product Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.product_name || ''}
                      onChange={e => updateActiveFittingField('product_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Range Sub-Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.range_name || 'Copper Range'}
                      onChange={e => updateActiveFittingField('range_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Installation Badge</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.installation_tag || 'Easy Installation'}
                      onChange={e => updateActiveFittingField('installation_tag', e.target.value)}
                    />
                  </div>
                </div>

                {/* RATINGS (1-5 DOTS) */}
                <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                    {['cost', 'quality', 'size', 'difficulty', 'versatility'].map(metric => (
                      <div key={metric} style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '5px' }}>
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
                                  width: '16px',
                                  height: '16px',
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
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                  2. Architectural Specs & Electrical Calculations
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Cut-out Diameter</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.specifications?.cutout_mm || ''}
                      onChange={e => updateActiveFittingField('specifications.cutout_mm', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '3px' }}>IP Rating</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.specifications?.ip_rating || ''}
                      onChange={e => updateActiveFittingField('specifications.ip_rating', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Dimming Protocol</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.specifications?.dimming || ''}
                      onChange={e => updateActiveFittingField('specifications.dimming', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '3px' }}>CRI</label>
                    <input
                      type="text"
                      className="form-control"
                      value={activeFitting.specifications?.cri || ''}
                      onChange={e => updateActiveFittingField('specifications.cri', e.target.value)}
                    />
                  </div>
                </div>

                {/* ELECTRICAL WIRING RULES */}
                <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: '#185fa5', display: 'block', marginBottom: '8px' }}>
                    ⚡ Electrician Wiring Rules (Calculated from Driver & BOQ Pairing)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Driver Location</label>
                      <input
                        type="text"
                        className="form-control"
                        value={activeFitting.electrical?.driver_location || ''}
                        onChange={e => updateActiveFittingField('electrical.driver_location', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Fittings per Driver</label>
                      <input
                        type="text"
                        className="form-control"
                        value={activeFitting.electrical?.fittings_per_driver || ''}
                        onChange={e => updateActiveFittingField('electrical.fittings_per_driver', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Connection Type</label>
                      <input
                        type="text"
                        className="form-control"
                        value={activeFitting.electrical?.connection_used || ''}
                        onChange={e => updateActiveFittingField('electrical.connection_used', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Max Cable Run Length</label>
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
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                    4. Electrician Installation Steps & Extracted Graphics
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
                        padding: '12px',
                        display: 'flex',
                        gap: '12px'
                      }}
                    >
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: '#1e293b',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '12px',
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
                          style={{ fontSize: '11px', fontStyle: 'italic', height: '26px', marginBottom: '8px' }}
                          value={step.site_note || ''}
                          onChange={e => updateInstallationStep(idx, 'site_note', e.target.value)}
                        />

                        {/* Step Diagram Image Attachment */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {step.diagram_image_url ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-secondary)' }}>
                              <img src={step.diagram_image_url} alt="Step Diagram" style={{ height: '36px', maxWidth: '60px', objectFit: 'contain' }} />
                              <button
                                onClick={() => {
                                  const steps = [...activeFitting.installation_steps];
                                  steps[idx].diagram_image_url = null;
                                  updateActiveFittingField('installation_steps', steps);
                                }}
                                className="btn btn-ghost btn-xs"
                                style={{ color: '#ef4444', fontSize: '10px' }}
                              >
                                ✕ Remove
                              </button>
                            </div>
                          ) : (
                            <label className="btn btn-ghost btn-xs" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', border: '1px dashed var(--border)', fontSize: '10.5px' }}>
                              <ImageIcon size={11} /> + Attach Step Diagram
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleStepImageUpload(idx, e)} />
                            </label>
                          )}
                        </div>
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

          {/* 3. RIGHT PANEL: LIVE A4 DOCUMENT PREVIEW (SPLIT-SCREEN) */}
          {showLivePreview && (
            <div style={{
              flex: 1.2,
              background: '#0f172a',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid var(--border)',
              position: 'relative'
            }}>
              <div style={{
                padding: '8px 16px',
                background: '#1e293b',
                color: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                fontWeight: 600
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={13} color="#38bdf8" />
                  <span>Real-Time A4 Handover Sheet Preview</span>
                  {loadingPreview && <Loader2 size={12} className="animate-spin" color="#38bdf8" />}
                </div>
                <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                  Auto-updates as you edit specs & images
                </span>
              </div>

              <div style={{ flex: 1, overflow: 'hidden', padding: '12px', display: 'flex', justifyContent: 'center' }}>
                <iframe
                  title="Technical Pack Live Preview"
                  srcDoc={previewHtml}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#ffffff',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                  }}
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

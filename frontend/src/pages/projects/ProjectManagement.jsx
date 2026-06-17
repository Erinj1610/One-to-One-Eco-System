import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import DesignFeeBuilder from './DesignFeeBuilder';
import { API_BASE } from '../../api_config';
import { 
  Lightbulb, ArrowLeft, RefreshCw, Upload, CheckCircle, Clock, Lock, 
  File, FileText, Receipt, Plus, Play, User, Users, ShieldAlert, 
  AlertTriangle, TrendingUp, DollarSign, Calendar, BarChart3, HelpCircle,
  ShoppingBag, ClipboardList, Wallet, Percent, Award, Folder, Download, Trash2,
  Copy, Save, AlertCircle, ChevronRight
} from 'lucide-react';

// Philosophy Contexts for the Right Panel
const PHI_ADVISORIES = {
  overview: {
    author: 'Marcus Aurelius (Meditations)',
    quote: '"If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it; and this you have the power to revoke at any moment."',
    advice: 'Stoic Administration: Review the core structural attributes. If scope parameters shift, transparently record and re-align in Overview to lock in stable design delivery.'
  },
  design: {
    author: 'Daniel Kahneman (Thinking, Fast and Slow)',
    quote: '"We are confident when we are in the dark, and we behave as if the dark was the only light that ever shined."',
    advice: 'De-Biased Sub-proposals: PMs typically commit to one design fee package. By utilizing multiple sub-fees (concept, revisions, extensions), you protect the portfolio from creep and planning fallacies.'
  },
  orders: {
    author: 'Eliyahu Goldratt (Theory of Constraints)',
    quote: '"An hour lost at the bottleneck is an hour lost for the entire system."',
    advice: 'Logistical Optimization: Track order ETA limits. If product lead times block Stage 4/5 wiring, use alternative supply channels immediately to keep target dates active.'
  },
  summary: {
    author: 'Daniel Kahneman (Thinking, Fast and Slow)',
    quote: '"Nothing in life is as important as you think it is, while you are thinking about it."',
    advice: 'Weighted Statements: PMs often focus on individual line invoicing. Tracking the combined Outstanding value balances visual progress with cashflow realities.'
  }
};

export default function ProjectManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, updateProject, saveDraftProject, deleteProject } = useStore();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (location.state) {
      if (location.state.activeTab) {
        setActiveTab(location.state.activeTab);
      }
      if (location.state.selectedDesignFeeId) {
        setSelectedDesignFeeId(location.state.selectedDesignFeeId);
      }
    }
  }, [location.state]);

  const p = projects[id];

  // Fallback lists if empty
  const designFees = p?.designFees || [];
  const orders = p?.orders || [];

  // Selected Design Fee for costing inside Design Fee Builder
  const [selectedDesignFeeId, setSelectedDesignFeeId] = useState(null);
  
  // Inner Sub-tab for active design fee (Costing vs Deliverables & Files)
  const [activeDfSubTab, setActiveDfSubTab] = useState('costing');

  // Reset inner sub-tab when switching design fee items
  useEffect(() => {
    setActiveDfSubTab('costing');
  }, [selectedDesignFeeId]);

  // Selected Order for detailed spreadsheet editing
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [activeOrderItems, setActiveOrderItems] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState(0);

  // Default Order specification items from their Google Sheet Template
  const DEFAULT_ORDER_ITEMS = useMemo(() => [
    {
      id: 'I-1',
      qty: 4,
      type: 'DL-01A',
      code: '28402 9240 W',
      description: 'Downlight - Entero RD-S 14W 2700K 30° White',
      clientDescription: 'Downlight - 14W 2700K 30° LED IP20 White',
      floor: 'Ground',
      area: 'Passage Way',
      dimming: 'Non-dim',
      brand: 'Delta Light',
      supplier: 'ELDC',
      unitCost: 2238.63,
      unitTrade: 2695.00,
      unitRetail: 2995.00,
      selection: 'Selection',
      stockStatus: 'Ordered'
    },
    {
      id: 'I-2',
      qty: 8,
      type: 'DL-01A',
      code: 'TA8-WWW',
      description: 'Downlight - Club Series TA8 GU10 White',
      clientDescription: 'Downlight - GU10/Module IP20 White',
      floor: 'Ground',
      area: 'Suite 04',
      dimming: 'Phase',
      brand: 'NEKO',
      supplier: 'ELDC',
      unitCost: 243.64,
      unitTrade: 295.00,
      unitRetail: 395.00,
      selection: 'Selection',
      stockStatus: 'Ordered'
    },
    {
      id: 'I-3',
      qty: 17,
      type: 'DL-01A.1',
      code: '86901.3',
      description: 'Lampholder - GU10 230V Conversion Kit',
      clientDescription: 'Lampholder - GU10 230V Conversion Kit Incl. Earth with Nylon Sleeve',
      floor: 'NA',
      area: 'NA',
      dimming: 'Non-dim',
      brand: 'Spazio',
      supplier: 'Spazio',
      unitCost: 9.95,
      unitTrade: 12.00,
      unitRetail: 15.00,
      selection: 'Non-Selection',
      stockStatus: 'In Stock'
    },
    {
      id: 'I-4',
      qty: 17,
      type: 'DL-01A.2',
      code: 'LA.42059030',
      description: 'Lamp - Classic 230V GU10 5W 36° Clear',
      clientDescription: 'Lamp - Classic 230V GU10 5W 36° 3000K Clear',
      floor: 'NA',
      area: 'NA',
      dimming: 'Non-dim',
      brand: 'Spazio',
      supplier: 'Spazio',
      unitCost: 60.55,
      unitTrade: 80.00,
      unitRetail: 90.00,
      selection: 'Non-Selection',
      stockStatus: 'In Stock'
    }
  ], []);

  const activeOrder = orders.find(o => o.id === selectedOrderId);

  // Sync selected order contents to state
  useEffect(() => {
    if (activeOrder) {
      setActiveOrderItems(activeOrder.itemsList || DEFAULT_ORDER_ITEMS);
      setOrderDiscount(activeOrder.discount || 0);
    } else {
      setActiveOrderItems([]);
      setOrderDiscount(0);
    }
  }, [selectedOrderId, activeOrder, DEFAULT_ORDER_ITEMS]);

  // Form state for uploading a file specifically linked to a design fee
  const [dfFileForm, setDfFileForm] = useState({ name: '', category: 'Concept Sketch' });

  // Initialize selected design fee once project loads
  useEffect(() => {
    if (p && p.designFees && p.designFees.length > 0 && !selectedDesignFeeId) {
      setSelectedDesignFeeId(p.designFees[0].id);
    }
  }, [p, selectedDesignFeeId]);

  // Documents Module: Fetch folders on tab activation
  useEffect(() => {
    if (activeTab === 'documents') {
      const fetchFolders = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/documents/${id}/folders`);
          const data = await res.json();
          setFolders(data);
          if (data.length > 0 && !selectedFolder) {
            setSelectedFolder(data[0]);
            setFilesLoading(true);
            const filesRes = await fetch(`${API_BASE}/api/documents/folders/${data[0].gdrive_folder_id}/files`);
            const filesData = await filesRes.json();
            setFiles(filesData);
            setFilesLoading(false);
          }
        } catch (err) {
          console.error("Failed to load folders:", err);
        }
      };
      fetchFolders();
    }
  }, [activeTab, id]);

  const handleFolderClick = async (folder) => {
    setSelectedFolder(folder);
    setFilesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/documents/folders/${folder.gdrive_folder_id}/files`);
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleFolderToggle = (folderId, e) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleFileUpload = async (e) => {
    const uploadedFiles = e.target.files || e.dataTransfer?.files;
    if (!uploadedFiles || uploadedFiles.length === 0 || !selectedFolder) return;
    
    setIsUploading(true);
    setUploadProgress(10);
    
    const formData = new FormData();
    formData.append("file", uploadedFiles[0]);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 80);
    
    try {
      const res = await fetch(`${API_BASE}/api/documents/folders/${selectedFolder.gdrive_folder_id}/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        clearInterval(progressInterval);
        setUploadProgress(100);
        setTimeout(async () => {
          setIsUploading(false);
          setUploadProgress(0);
          // Refresh files list
          const filesRes = await fetch(`${API_BASE}/api/documents/folders/${selectedFolder.gdrive_folder_id}/files`);
          const filesData = await filesRes.json();
          setFiles(filesData);
        }, 500);
      } else {
        clearInterval(progressInterval);
        alert("Upload failed.");
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error(err);
      alert("Error uploading file: " + err.message);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleTrashFile = async (fileId) => {
    if (!confirm("Are you sure you want to move this file to Google Drive Trash?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/documents/files/${fileId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
      } else {
        alert("Failed to trash file.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const folderTree = useMemo(() => {
    const map = {};
    const roots = [];
    folders.forEach(node => {
      map[node.id] = { ...node, children: [] };
    });
    folders.forEach(node => {
      if (node.parent_id && map[node.parent_id]) {
        map[node.parent_id].children.push(map[node.id]);
      } else {
        roots.push(map[node.id]);
      }
    });
    return roots;
  }, [folders]);

  const renderFolderTree = (nodes) => {
    return (
      <ul style={{ listStyleType: 'none', paddingLeft: '14px', margin: 0 }}>
        {nodes.map(node => {
          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = !!expandedFolders[node.id];
          const isSelected = selectedFolder?.id === node.id;
          
          return (
            <li key={node.id} style={{ margin: '4px 0' }}>
              <div 
                onClick={() => handleFolderClick(node)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(59,130,246,0.1)' : 'transparent',
                  color: isSelected ? 'var(--text-info)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                  fontWeight: isSelected ? 600 : 500
                }}
              >
                <span 
                  onClick={(e) => handleFolderToggle(node.id, e)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    marginRight: '4px',
                    opacity: hasChildren ? 0.8 : 0,
                    cursor: hasChildren ? 'pointer' : 'default',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <ChevronRight size={14} />
                </span>
                
                <Folder size={15} style={{ marginRight: '8px', color: isSelected ? 'var(--text-info)' : 'var(--text-tertiary)' }} />
                
                <span style={{ fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {node.name}
                </span>
              </div>
              
              {hasChildren && isExpanded && (
                <div style={{ borderLeft: '1px dashed var(--border)', marginLeft: '16px' }}>
                  {renderFolderTree(node.children)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  // Modals & Forms States
  const [showCreateDfModal, setShowCreateDfModal] = useState(false);
  const [newDfForm, setNewDfForm] = useState({ name: '', sqm: '', feeValue: '' });

  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    supplier: 'Modus Lighting',
    items: '',
    value: '',
    paid: '',
    status: 'Pending',
    eta: ''
  });

  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [targetDocStage, setTargetDocStage] = useState('Stage 1');
  const [docForm, setDocForm] = useState({ name: '', category: 'Design', visibility: 'Client visible' });



  if (!p) return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading Project...</div>;

  // Selected Design Fee detailed data
  const activeDesignFee = designFees.find(df => df.id === selectedDesignFeeId);

  // 1. LIVE CONSOLIDATED STATEMENTS (Calculated on-the-fly)
  const totalDesignVal = designFees.reduce((sum, d) => sum + (d.feeValue || 0), 0);
  const totalDesignPaid = designFees.reduce((sum, d) => sum + (d.paid || 0), 0);
  const totalDesignOutstanding = designFees.reduce((sum, d) => sum + (d.outstanding || 0), 0);

  const totalOrderVal = orders.reduce((sum, o) => sum + (o.value || 0), 0);
  const totalOrderPaid = orders.reduce((sum, o) => sum + (o.paid || 0), 0);
  const totalOrderOutstanding = orders.reduce((sum, o) => sum + (o.outstanding || 0), 0);

  // Combined totals
  const grandContractValue = totalDesignVal + totalOrderVal;
  const grandPaidValue = totalDesignPaid + totalOrderPaid;
  const grandOutstandingValue = Math.max(0, grandContractValue - grandPaidValue);

  // Deletion locks
  const hasDesignFees = designFees.length > 0;
  const hasOrders = orders.length > 0;
  const hasFiles = p?.designFees?.some(df => df.files && df.files.length > 0) || files.length > 0;
  const isLockedForDeletion = hasDesignFees || hasOrders || hasFiles;

  const handleDeleteProject = () => {
    if (!isAdmin) {
      alert("Admin Lock: Only administrators can delete projects.");
      return;
    }
    if (isLockedForDeletion) {
      alert("Deletion Blocked: This project contains active design fees, orders, or files and cannot be deleted.");
      return;
    }
    if (confirm("Are you sure you want to permanently delete this project?")) {
      deleteProject(id);
      alert("Project deleted successfully.");
      navigate('/projects');
    }
  };

  // Dynamic Blended Profit Margin
  const blendedMargin = useMemo(() => {
    if (grandContractValue === 0) return p.actualMargin || 18;
    
    // Weighted sum of actual design margins + detailed cost prices of order spec sheets
    const designMarginCost = designFees.reduce((sum, d) => sum + (d.feeValue * (1 - (d.margin || 18)/100)), 0);
    const orderMarginCost = orders.reduce((sum, o) => {
      // If we have actual itemized costValue, use it! Otherwise assume 20% margin (80% cost price)
      return sum + (o.costValue !== undefined ? o.costValue : (o.value * 0.8));
    }, 0);
    const blendedCost = designMarginCost + orderMarginCost;

    return Math.round(((grandContractValue - blendedCost) / grandContractValue) * 100);
  }, [designFees, orders, grandContractValue, p.actualMargin]);

  // Sync blended margin back to database store when calculated
  useEffect(() => {
    if (blendedMargin !== p.actualMargin) {
      updateProject(id, 'actualMargin', blendedMargin);
    }
  }, [blendedMargin, p.actualMargin, id, updateProject]);

  // Sync totals to main fields for backwards compatibility with overview ledger list
  useEffect(() => {
    const formattedFee = `R ${grandContractValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const formattedPaid = `R ${grandPaidValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const formattedOutstanding = `R ${grandOutstandingValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    if (p.feeValue !== grandContractValue) {
      updateProject(id, 'feeValue', grandContractValue);
      updateProject(id, 'feeExcl', formattedFee);
    }
    if (p.paid !== formattedPaid) {
      updateProject(id, 'paid', formattedPaid);
    }
    if (p.outstanding !== formattedOutstanding) {
      updateProject(id, 'outstanding', formattedOutstanding);
    }
  }, [grandContractValue, grandPaidValue, grandOutstandingValue, id, updateProject, p.feeValue, p.paid, p.outstanding]);

  // Create new Design Fee Sub-project
  const handleCreateDesignFee = (e) => {
    e.preventDefault();
    if (!newDfForm.name) return;

    const newFeeVal = 0; // Costing sheets will determine feeValue on Save & Sync!
    const newFee = {
      id: `DF-${id.toUpperCase()}-${Date.now().toString().slice(-4)}`,
      name: newDfForm.name,
      sqm: Number(newDfForm.sqm) || 995,
      feeValue: newFeeVal,
      paid: 0,
      outstanding: newFeeVal,
      margin: p.targetMargin || 18,
      status: 'Draft',
      proposalPdf: '',
      files: [] // Initialize with empty files array!
    };

    const updatedFees = [...designFees, newFee];
    updateProject(id, 'designFees', updatedFees);
    setSelectedDesignFeeId(newFee.id);
    setShowCreateDfModal(false);
    setNewDfForm({ name: '', sqm: '', feeValue: '' });
  };

  // Add document/file specifically linked to the active design fee sub-project
  const handleAddFileToDesignFee = (fileName, category) => {
    if (!fileName || !selectedDesignFeeId) return;
    const newFileObj = {
      id: `F-DF-${Date.now().toString().slice(-4)}`,
      name: fileName.trim(),
      category: category || 'Concept Sketch',
      date: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
      size: `${(Math.random() * 8 + 1).toFixed(1)} MB`
    };
    
    const updatedFees = designFees.map(df => {
      if (df.id === selectedDesignFeeId) {
        return {
          ...df,
          files: [...(df.files || []), newFileObj]
        };
      }
      return df;
    });
    
    updateProject(id, 'designFees', updatedFees);
  };

  // Delete file/document from the active design fee sub-project
  const handleRemoveFileFromDesignFee = (fileId) => {
    if (!selectedDesignFeeId) return;
    
    const updatedFees = designFees.map(df => {
      if (df.id === selectedDesignFeeId) {
        return {
          ...df,
          files: (df.files || []).filter(f => f.id !== fileId)
        };
      }
      return df;
    });
    
    updateProject(id, 'designFees', updatedFees);
  };

  // Sync calculations from active DesignFeeBuilder cost calculator
  const handleUpdateActiveDesignFee = ({ feeValue, deposit, fittings, livingArea, landscapeArea, sigConsult }) => {
    if (!selectedDesignFeeId) return;

    const proposalDocName = `DFP-${id.toUpperCase()}-${activeDesignFee.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;

    const updatedFees = designFees.map(df => {
      if (df.id === selectedDesignFeeId) {
        return {
          ...df,
          feeValue: feeValue,
          sqm: livingArea || df.sqm,
          outstanding: Math.max(0, feeValue - (df.paid || 0)),
          proposalPdf: proposalDocName,
          margin: sigConsult ? 22 : (p.targetMargin || 18),
          status: 'Approved'
        };
      }
      return df;
    });

    updateProject(id, 'designFees', updatedFees);
    alert(`Sub-project Costing synced!\n- Design Fee "${activeDesignFee.name}" updated successfully.\n- Saved proposal file: "${proposalDocName}".`);
  };

  // Create new Product Order
  const handleCreateProductOrder = (e) => {
    e.preventDefault();
    if (!newOrderForm.supplier || !newOrderForm.value) return;

    const orderVal = Number(newOrderForm.value) || 0;
    const paidVal = Number(newOrderForm.paid) || 0;
    const newOrder = {
      id: `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      supplier: newOrderForm.supplier,
      items: Number(newOrderForm.items) || 1,
      value: orderVal,
      paid: paidVal,
      outstanding: Math.max(0, orderVal - paidVal),
      status: newOrderForm.status,
      eta: newOrderForm.eta || '—'
    };

    const updatedOrders = [...orders, newOrder];
    updateProject(id, 'orders', updatedOrders);
    setShowCreateOrderModal(false);
    setNewOrderForm({ supplier: 'Modus Lighting', items: '', value: '', paid: '', status: 'Pending', eta: '' });
  };

  // Update a single cell in the active order spreadsheet state
  const handleUpdateSpreadsheetCell = (rowId, field, val) => {
    let finalVal = val;
    if (['qty', 'unitCost', 'unitTrade', 'unitRetail'].includes(field)) {
      finalVal = val === '' ? '' : Number(val) || 0;
    }
    setActiveOrderItems(prev => prev.map(item => {
      if (item.id === rowId) {
        return { ...item, [field]: finalVal };
      }
      return item;
    }));
  };

  // Add a new blank row to the spreadsheet spec sheet
  const handleAddSpreadsheetRow = () => {
    const newRow = {
      id: `I-NEW-${Date.now()}`,
      qty: 1,
      type: 'NEW-FIXTURE',
      code: '',
      description: 'New lighting fixture line item',
      clientDescription: 'New lighting fixture line item',
      floor: 'Ground',
      area: 'Area',
      dimming: 'Non-dim',
      brand: 'Standard',
      supplier: 'Standard',
      unitCost: 0,
      unitTrade: 0,
      unitRetail: 0,
      selection: 'Selection',
      stockStatus: 'Ordered'
    };
    setActiveOrderItems(prev => [...prev, newRow]);
  };

  // Duplicate an existing spreadsheet row
  const handleDuplicateSpreadsheetRow = (row) => {
    const duplicatedRow = {
      ...row,
      id: `I-DUP-${Date.now()}`,
      code: row.code ? `${row.code} (Copy)` : ''
    };
    setActiveOrderItems(prev => [...prev, duplicatedRow]);
  };

  // Delete a row from the spreadsheet spec sheet
  const handleDeleteSpreadsheetRow = (rowId) => {
    setActiveOrderItems(prev => prev.filter(item => item.id !== rowId));
  };

  // Save the entire spec sheet back to the project order context
  const handleSaveOrderSpreadsheet = () => {
    if (!selectedOrderId) return;
    
    // Sum retail ex VAT and cost ex VAT
    const rawRetailTotal = activeOrderItems.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
    const totalCostTotal = activeOrderItems.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
    
    // Apply discount
    const discountedValue = Math.max(0, rawRetailTotal * (1 - (Number(orderDiscount) || 0) / 100));
    
    const updatedOrders = orders.map(o => {
      if (o.id === selectedOrderId) {
        return {
          ...o,
          items: activeOrderItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
          value: Math.round(discountedValue),
          outstanding: Math.max(0, Math.round(discountedValue) - (o.paid || 0)),
          itemsList: activeOrderItems,
          discount: Number(orderDiscount) || 0,
          costValue: Math.round(totalCostTotal)
        };
      }
      return o;
    });

    updateProject(id, 'orders', updatedOrders);
    setSelectedOrderId(null);
    alert(`Order Spreadsheet Brain Synced!\n- Billed Value: R ${Math.round(discountedValue).toLocaleString()}\n- Total Cost: R ${Math.round(totalCostTotal).toLocaleString()}\n- Recalculated dynamic project blended margins.`);
  };

  // Toggle order status directly from Summary/Statement
  const handleUpdateOrderStatus = (orderId, newStatus) => {
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: newStatus };
      }
      return o;
    });
    updateProject(id, 'orders', updatedOrders);
  };

  // Toggle order payment updates
  const handleUpdateOrderPaid = (orderId, newPaidValue) => {
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        const val = o.value || 0;
        return { ...o, paid: newPaidValue, outstanding: Math.max(0, val - newPaidValue) };
      }
      return o;
    });
    updateProject(id, 'orders', updatedOrders);
  };

  // Context-specific sidebar philosophy details
  const sidebarAdvice = PHI_ADVISORIES[activeTab] || PHI_ADVISORIES.overview;

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 4px' }}>
      
      <button className="back-btn" onClick={() => navigate('/projects')} style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
        <ArrowLeft size={14} /> Back to Projects Directory
      </button>

      {/* Hero Header Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(24,95,165,0.02) 100%)', 
        border: '1.5px solid var(--border)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '20px 24px', 
        marginBottom: '20px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.01)',
        display: 'grid',
        gridTemplateColumns: '1.5fr 1.2fr',
        gap: '24px',
        alignItems: 'center'
      }}>
        {/* Left side: Project Info, Client, PM, badges */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <Lightbulb size={22} color="var(--text-info)" style={{ filter: 'drop-shadow(0 2px 8px rgba(24,95,165,0.2))' }} />
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{p.name || 'Draft Project'}</span>
            <span className={`badge ${p.status === 'On track' ? 'b-success' : p.isDraft ? 'b-muted' : 'b-danger'}`} style={{ fontSize: '10.5px', padding: '3px 10px', fontWeight: 600 }}>{p.status}</span>
            <span className="badge b-info" style={{ fontSize: '10.5px', padding: '3px 10px', fontWeight: 600 }}>{p.projectType}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              <User size={14} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.client || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              <Users size={14} style={{ color: 'var(--text-tertiary)' }} />
              <span>Project Manager: <strong style={{ color: 'var(--text-primary)' }}>{p.pm}</strong></span>
            </div>
            {p.sqm && p.sqm !== '—' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                <Award size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span>Scope Area: <strong style={{ color: 'var(--text-primary)' }}>{p.sqm} m²</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Vitals Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', background: 'rgba(255,255,255,0.6)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Active Stage</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-info)', display: 'block', marginTop: '2px' }}>{p.isDraft ? '—' : p.stage}</span>
          </div>
          <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Blended Margin</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: p.isDraft ? 'var(--text-secondary)' : blendedMargin < (p.targetMargin || 18) ? 'var(--text-danger)' : 'var(--text-success)', display: 'block', marginTop: '2px' }}>
              {p.isDraft ? '—' : `${blendedMargin}%`}
            </span>
          </div>
          <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Contract Value</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginTop: '2px' }}>{p.isDraft ? '—' : `R ${grandContractValue.toLocaleString()}`}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Outstanding</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: p.isDraft ? 'var(--text-secondary)' : grandOutstandingValue > 0 ? 'var(--text-warning)' : 'var(--text-success)', display: 'block', marginTop: '2px' }}>{p.isDraft ? '—' : `R ${grandOutstandingValue.toLocaleString()}`}</span>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation Switcher */}
      <div style={{ 
        display: 'flex', 
        background: 'var(--bg-secondary)', 
        padding: '5px', 
        borderRadius: 'var(--radius-lg)', 
        border: '1.5px solid var(--border)',
        marginBottom: '20px',
        gap: '4px'
      }}>
        {[
          { id: 'overview', label: '1. Overview (Project Info)', icon: <ClipboardList size={15} />, disabled: false },
          { id: 'design', label: '2. Design Section (Sub-fees)', icon: <Award size={15} />, disabled: p.isDraft || p.projectType === 'Orders-Only' },
          { id: 'orders', label: '3. Orders Section (Product Orders)', icon: <ShoppingBag size={15} />, disabled: p.isDraft || p.projectType === 'Design-Only' },
          { id: 'summary', label: '4. Summary (Statement Overview)', icon: <Wallet size={15} />, disabled: p.isDraft },
          { id: 'documents', label: '5. Documents (G-Drive Portal)', icon: <Folder size={15} />, disabled: p.isDraft }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                fontSize: '12.5px',
                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                color: tab.disabled ? 'var(--text-tertiary)' : isActive ? 'var(--text-info)' : 'var(--text-secondary)',
                opacity: tab.disabled ? 0.35 : 1,
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--bg-primary)' : 'transparent',
                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                fontFamily: 'inherit',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Active Tab Workspace Card Container */}
      <div className="card" style={{ border: '1.5px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.01)', background: 'var(--bg-primary)', overflow: 'visible' }}>
        <div className="card-body" style={{ padding: '24px' }}>
          
          {/* SECTION 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="animation-fade-in">
              <div style={{ background: 'var(--bg-info)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '24px', fontSize: '12.5px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={14} />
                <span><strong>Overview Section:</strong> Configure basic project criteria, target margin tolerances, and select project scope parameters.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                {/* Operational Details Card */}
                <div className="card" style={{ margin: 0, border: '1px solid var(--border)' }}>
                  <div className="card-head" style={{ padding: '12px 16px' }}><div className="card-title" style={{ fontSize: '12.5px' }}>Operational details</div></div>
                  <div className="card-body" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Client Name</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.client}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Design offering package</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.offering}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Meterage Scope</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.sqm} m²</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Start Date</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.start}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Deadline</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.deadline}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0 0', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Days Left badge</span>
                      <span className={`badge ${p.daysLeft && p.daysLeft.includes('−') ? 'b-danger' : 'b-success'}`} style={{ fontWeight: 600, padding: '2px 8px' }}>
                        {p.daysLeft || 'Ongoing'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Update Parameters Card */}
                <div className="card" style={{ margin: 0, border: '1px solid var(--border)' }}>
                  <div className="card-head" style={{ padding: '12px 16px' }}><div className="card-title" style={{ fontSize: '12.5px' }}>Update Active Parameters</div></div>
                  <div className="card-body" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>Project Name</div>
                          <input 
                            type="text" 
                            className="form-control"
                            value={p.name || ''} 
                            onChange={e => updateProject(id, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>Client Name</div>
                          <input 
                            type="text" 
                            className="form-control"
                            value={p.client || ''} 
                            onChange={e => updateProject(id, 'client', e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>Project Type Workflow</div>
                          <select className="form-control" value={p.projectType || 'Design & Orders'} onChange={e => updateProject(id, 'projectType', e.target.value)}>
                            <option>Design & Orders</option>
                            <option>Design-Only</option>
                            <option>Orders-Only</option>
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>Project Manager</div>
                          <select className="form-control" value={p.pm} onChange={e => updateProject(id, 'pm', e.target.value)}>
                            <option>Dani</option>
                            <option>Martin</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>Design Offering Package</div>
                          <select className="form-control" value={p.offering || 'Signature'} onChange={e => updateProject(id, 'offering', e.target.value)}>
                            <option>Signature</option>
                            <option>Modus</option>
                            <option>Essential</option>
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>Meterage Scope (m²)</div>
                          <input 
                            type="text" 
                            className="form-control"
                            value={p.sqm || ''} 
                            onChange={e => updateProject(id, 'sqm', e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>Target Margin (%)</div>
                          <input 
                            type="number" 
                            className="form-control"
                            value={p.targetMargin || 18} 
                            onChange={e => updateProject(id, 'targetMargin', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>Current Stage</div>
                          <select className="form-control" value={p.stage} onChange={e => updateProject(id, 'stage', e.target.value)}>
                            {['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Snags', 'Complete'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>Start Date</div>
                          <input 
                            type="text" 
                            className="form-control"
                            value={p.start || ''} 
                            onChange={e => updateProject(id, 'start', e.target.value)}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>Deadline</div>
                          <input 
                            type="text" 
                            className="form-control"
                            value={p.deadline || ''} 
                            onChange={e => updateProject(id, 'deadline', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: 600 }}>Delay / Blockers</div>
                        <select className="form-control" value={p.delay} onChange={e => updateProject(id, 'delay', e.target.value)}>
                          {['—', 'Awaiting feedback/approval', 'Complex design iteration/rework required', 'Unforeseen technical challenges', 'Snags/Site visit'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>

                      <div style={{ marginTop: '16px', borderTop: '0.5px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {p.isDraft && (
                          <button 
                            className="btn btn-primary" 
                            style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px', fontWeight: 600 }}
                            onClick={(e) => {
                              e.preventDefault();
                              if (!p.name?.trim()) {
                                alert("Please enter a Project Name to save!");
                                return;
                              }
                              if (!p.client?.trim()) {
                                alert("Please enter a Client Name to save!");
                                return;
                              }
                              // Save the draft project!
                              const finalKey = saveDraftProject(id, {
                                name: p.name,
                                client: p.client,
                                sqm: p.sqm || '1,000',
                                pm: p.pm,
                                offering: p.offering,
                                targetMargin: p.targetMargin || 18,
                                projectType: p.projectType || 'Design & Orders',
                                start: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
                                deadline: p.deadline === '—' || !p.deadline ? 'TBD' : p.deadline,
                                status: 'On track',
                                stage: 'Stage 1'
                              });
                              alert("Project created successfully!");
                              navigate(`/projects/${finalKey}`);
                            }}
                          >
                            Save & Create Project
                          </button>
                        )}
                        
                        <button 
                          type="button"
                          className="btn"
                          onClick={handleDeleteProject}
                          style={{ 
                            width: '100%', 
                            justifyContent: 'center', 
                            padding: '10px', 
                            fontSize: '13px', 
                            fontWeight: 600,
                            color: 'var(--text-danger)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            background: 'rgba(239, 68, 68, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Trash2 size={14} /> Delete Project {isLockedForDeletion && <Lock size={12} style={{ opacity: 0.6 }} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrated Plaque & Health Console Below */}
              {!p.isDraft && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginTop: '24px' }}>
                  
                  {/* Philosophical Advisor Plaque */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(24,95,165,0.05) 0%, rgba(139,92,246,0.02) 100%)', 
                    border: '1.5px dashed var(--border-info)', 
                    borderRadius: 'var(--radius-lg)', 
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stoic Advisory Context (Marcus Aurelius)</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{PHI_ADVISORIES.overview.author}</span>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                      "{PHI_ADVISORIES.overview.quote}"
                    </p>
                    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '8px', fontSize: '11.5px', color: 'var(--text-info)', lineHeight: 1.4 }}>
                      <strong>Strategic Practice:</strong> {PHI_ADVISORIES.overview.advice}
                    </div>
                  </div>

                  {/* Project Health Score Card */}
                  <div className="card" style={{ margin: 0, border: '1px solid var(--border)', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'block' }}>Project Health Scoring</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                          <span>Deadline Risk Index</span>
                          <span style={{ fontWeight: 600, color: p.status === 'Off track' ? 'var(--text-danger)' : 'var(--text-success)' }}>
                            {p.status === 'Off track' ? 'Critical' : 'Stable'}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--bg-secondary)', borderRadius: '2.5px' }}>
                          <div style={{ width: p.status === 'Off track' ? '90%' : '15%', height: '100%', background: p.status === 'Off track' ? 'var(--text-danger)' : 'var(--text-success)', borderRadius: '2.5px' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                          <span>Blended Margin Index</span>
                          <span style={{ fontWeight: 600, color: blendedMargin < (p.targetMargin || 18) ? 'var(--text-danger)' : 'var(--text-success)' }}>
                            {blendedMargin < (p.targetMargin || 18) ? 'Under Target' : 'Optimal'}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--bg-secondary)', borderRadius: '2.5px' }}>
                          <div style={{ width: blendedMargin < (p.targetMargin || 18) ? '80%' : '100%', height: '100%', background: blendedMargin < (p.targetMargin || 18) ? 'var(--text-danger)' : 'var(--text-success)', borderRadius: '2.5px' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
            {/* SECTION 2: DESIGN SECTION (Mirror of standalone DesignPage) */}
            {activeTab === 'design' && (
              <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.06) 0%, rgba(139,92,246,0.02) 100%)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className="badge b-info" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>Design Suite</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Central Design Fee Calculator & Deliverables Workspace</span>
                      </div>
                      <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🧠 Standalone Design Fees & CAD Module
                      </h2>
                      <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: '1.5' }}>
                        Create proportional scope costing plans, manage living zoning parameters, track drawings, upload technical sheets, and monitor blended project margins in real time.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/design', { state: { projectKey: p.key } })}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 600 }}
                      >
                        <span>Launch Design Workspace</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* PROJECT DESIGN FEES SUMMARY CARD */}
                <div className="card" style={{ border: '1.5px solid var(--border)' }}>
                  <div className="card-body" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', color: 'white', fontWeight: 600 }}>
                        Active Design Fees & Proposals for {p.name}
                      </h3>
                      <button className="btn btn-primary btn-sm" onClick={() => setShowCreateDfModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Plus size={14} /> Add Design Fee Sub-project
                      </button>
                    </div>

                    {designFees.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                        No design sub-fees or proposals have been created for this project yet. Launch the workspace or click above to get started.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                          <thead>
                            <tr>
                              <th>Fee Ref</th>
                              <th>Fee Title</th>
                              <th>Scope Size</th>
                              <th>Fee Value (EX VAT)</th>
                              <th>Amount Paid</th>
                              <th>Balance Outstanding</th>
                              <th>Design Margin</th>
                              <th>Status</th>
                              <th style={{ textAlign: 'right' }}>Workspace Link</th>
                            </tr>
                          </thead>
                          <tbody>
                            {designFees.map(f => (
                              <tr key={f.id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>{f.id}</td>
                                <td style={{ fontWeight: 500 }}>{f.name}</td>
                                <td>{f.sqm} m²</td>
                                <td style={{ fontWeight: 600, color: 'white' }}>R {f.feeValue?.toLocaleString()}</td>
                                <td style={{ color: 'var(--text-success)' }}>R {(f.paid || 0).toLocaleString()}</td>
                                <td style={{ fontWeight: 600, color: (f.outstanding || 0) > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)' }}>
                                  R {(f.outstanding || 0).toLocaleString()}
                                </td>
                                <td style={{ fontWeight: 700, color: 'var(--text-success)' }}>{f.margin || 18}%</td>
                                <td>
                                  <span className={`badge ${f.status === 'Approved' ? 'b-success' : f.status === 'In Review' ? 'b-warning' : 'b-default'}`}>
                                    {f.status}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button 
                                    className="btn btn-ghost btn-sm" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-info)', border: '1px solid var(--border)' }}
                                    onClick={() => navigate('/design', { state: { projectKey: p.key, openFeeId: f.id } })}
                                  >
                                    Open Builder 🧠
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stoic Planning Advisory Banner */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(24,95,165,0.05) 0%, rgba(139,92,246,0.02) 100%)', 
                  border: '1.5px dashed var(--border-info)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '14px 18px', 
                  display: 'flex', 
                  gap: '12px', 
                  alignItems: 'center' 
                }}>
                  <HelpCircle size={18} color="var(--text-info)" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Stoic Planning Advisory ({PHI_ADVISORIES.design.author})</span>
                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{PHI_ADVISORIES.design.quote}"</span>
                    <span style={{ color: 'var(--text-info)', display: 'block', marginTop: '4px' }}><strong>Strategic Practice:</strong> {PHI_ADVISORIES.design.advice}</span>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: ORDERS SECTION (Shortcut to Dedicated Workspace) */}
            {activeTab === 'orders' && (
              <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.06) 0%, rgba(139,92,246,0.02) 100%)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className="badge b-info" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>Operations Suite</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Project Orders & BOQ Controller</span>
                      </div>
                      <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🧠 Interactive Orders & BOQ Workspace
                      </h2>
                      <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: '1.5' }}>
                        Create client quotations, area-by-area Bills of Quantity (BOQ), and dynamically generate Quotations, Tax Invoices, technical Fitting Schedules, Delivery Notes, and progress statements.
                      </p>
                    </div>

                    <button 
                      className="btn btn-primary" 
                      onClick={() => navigate('/orders', { state: { projectKey: p.key } })}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 600 }}
                    >
                      <span>Launch Order Brain Workspace</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* PROJECT ORDERS SUMMARY VITALS CARD */}
                <div className="card" style={{ border: '1.5px solid var(--border)' }}>
                  <div className="card-body" style={{ padding: '20px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'white', fontWeight: 600 }}>
                      Active Quotations & BOQs for {p.name}
                    </h3>

                    {orders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                        No orders or quotations have been created for this project yet. Launch the workspace to get started.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                          <thead>
                            <tr>
                              <th>Quote/PO Ref</th>
                              <th>Hardware Supplier</th>
                              <th style={{ textAlign: 'center' }}>BOQ Items</th>
                              <th>Billed Retail (EX VAT)</th>
                              <th>Amount Paid</th>
                              <th>Balance Outstanding</th>
                              <th>ETA</th>
                              <th>Status</th>
                              <th style={{ textAlign: 'right' }}>Workspace Link</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map(o => {
                              const cost = o.costValue || 0;
                              const retail = o.value || 0;
                              const margin = retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0;
                              const isLowMargin = margin < 39;

                              return (
                                <tr key={o.id}>
                                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>{o.id}</td>
                                  <td>{o.supplier}</td>
                                  <td style={{ textAlign: 'center' }}>{o.items} items</td>
                                  <td style={{ fontWeight: 600, color: 'white' }}>R {retail.toLocaleString()}</td>
                                  <td>R {(o.paid || 0).toLocaleString()}</td>
                                  <td style={{ color: (o.outstanding || 0) > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                                    R {(o.outstanding || 0).toLocaleString()}
                                  </td>
                                  <td>{o.eta || '—'}</td>
                                  <td>
                                    <span className={`badge ${o.status === 'Delivered' ? 'b-success' : o.status === 'In transit' ? 'b-info' : o.status === 'Processing' ? 'b-warning' : 'b-default'}`}>

                                      {o.status}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <button 
                                      className="btn btn-ghost btn-sm" 
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-info)', border: '1px solid var(--border)' }}
                                      onClick={() => navigate('/orders', { state: { projectKey: p.key, openOrderId: o.id } })}
                                    >
                                      Open Brain Spec 🧠
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stoic Logistical Advisory plaque inline */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(24,95,165,0.05) 0%, rgba(139,92,246,0.02) 100%)', 
                  border: '1.5px dashed var(--border-info)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '14px 18px', 
                  display: 'flex', 
                  gap: '12px', 
                  alignItems: 'center' 
                }}>
                  <HelpCircle size={18} color="var(--text-info)" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Stoic Logistical Advisory ({PHI_ADVISORIES.orders.author})</span>
                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{PHI_ADVISORIES.orders.quote}"</span>
                    <span style={{ color: 'var(--text-info)', display: 'block', marginTop: '4px' }}><strong>Strategic Practice:</strong> {PHI_ADVISORIES.orders.advice}</span>
                  </div>
                </div>
              </div>
            )}

                        {/* SECTION 4: SUMMARY (Statement Overview Balance Sheet) */}
            {activeTab === 'summary' && (
              <div className="animation-fade-in">
                <div style={{ background: 'var(--bg-info)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', fontSize: '12.5px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet size={14} />
                  <span><strong>Statement Overview:</strong> Consolidated summary showing sub-contract items, payments made, and outstanding hardware supplier pipelines.</span>
                </div>

                {/* Grid Financial Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
                  <div className="stat-card" style={{ padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Design Portfolio</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-info)', marginTop: '4px' }}>R {totalDesignVal.toLocaleString()}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Hardware Orders</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-info)', marginTop: '4px' }}>R {totalOrderVal.toLocaleString()}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-success)', textTransform: 'uppercase', fontWeight: 600 }}>Total Payments</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-success)', marginTop: '4px' }}>R {grandPaidValue.toLocaleString()}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.02)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-warning)', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding ZAR</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-warning)', marginTop: '4px' }}>R {grandOutstandingValue.toLocaleString()}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Blended Margin</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{blendedMargin}%</div>
                  </div>
                </div>

                {/* Sub-ledgers list */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                  
                  {/* Design Sub-contracts Statement */}
                  <div>
                    <div className="section-label" style={{ marginBottom: '10px' }}>Design fees statement</div>
                    <div className="card" style={{ padding: '10px' }}>
                      <table className="table" style={{ margin: 0, fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th>Sub-fee Proposal</th>
                            <th>Fee Value</th>
                            <th>Paid</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {designFees.map(df => (
                            <tr key={df.id}>
                              <td style={{ fontWeight: 600, color: 'var(--text-info)' }}>{df.name}</td>
                              <td style={{ fontWeight: 600 }}>R {(df.feeValue || 0).toLocaleString()}</td>
                              <td style={{ color: 'var(--text-success)' }}>R {(df.paid || 0).toLocaleString()}</td>
                              <td>
                                <span className={`badge ${df.status === 'Approved' ? 'b-success' : 'b-default'}`}>{df.status}</span>
                              </td>
                            </tr>
                          ))}
                          {designFees.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No design sub-contracts.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Hardware Orders Statement */}
                  <div>
                    <div className="section-label" style={{ marginBottom: '10px' }}>Hardware orders pipeline</div>
                    <div className="card" style={{ padding: '10px' }}>
                      <table className="table" style={{ margin: 0, fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th>PO Number</th>
                            <th>Supplier</th>
                            <th>Order Value</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => (
                            <tr key={o.id}>
                              <td style={{ fontFamily: 'monospace', color: 'var(--text-info)' }}>{o.id}</td>
                              <td style={{ fontWeight: 500 }}>{o.supplier}</td>
                              <td style={{ fontWeight: 600 }}>R {(o.value || 0).toLocaleString()}</td>
                              <td>
                                <span className={`badge ${o.status === 'Delivered' ? 'b-success' : o.status === 'In transit' ? 'b-info' : 'b-warning'}`}>{o.status}</span>
                              </td>
                            </tr>
                          ))}
                          {orders.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No product orders pipeline.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* Sun Tzu Advisory Banner & Project Health scoring grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginTop: '24px' }}>
                  
                  {/* Sun Tzu plaque */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(24,95,165,0.05) 0%, rgba(139,92,246,0.02) 100%)', 
                    border: '1.5px dashed var(--border-info)', 
                    borderRadius: 'var(--radius-lg)', 
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stoic Strategic Advisory (Sun Tzu)</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{PHI_ADVISORIES.summary.author}</span>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontStyle: 'italic', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                      "{PHI_ADVISORIES.summary.quote}"
                    </p>
                    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '8px', fontSize: '11.5px', color: 'var(--text-info)', lineHeight: 1.4 }}>
                      <strong>Strategic Practice:</strong> {PHI_ADVISORIES.summary.advice}
                    </div>
                  </div>

                  {/* Vitals Console */}
                  <div className="card" style={{ margin: 0, border: '1px solid var(--border)', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'block' }}>Project Health Scoring</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                          <span>Deadline Risk Index</span>
                          <span style={{ fontWeight: 600, color: p.status === 'Off track' ? 'var(--text-danger)' : 'var(--text-success)' }}>
                            {p.status === 'Off track' ? 'Critical' : 'Stable'}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--bg-secondary)', borderRadius: '2.5px' }}>
                          <div style={{ width: p.status === 'Off track' ? '90%' : '15%', height: '100%', background: p.status === 'Off track' ? 'var(--text-danger)' : 'var(--text-success)', borderRadius: '2.5px' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                          <span>Blended Margin Index</span>
                          <span style={{ fontWeight: 600, color: blendedMargin < (p.targetMargin || 18) ? 'var(--text-danger)' : 'var(--text-success)' }}>
                            {blendedMargin < (p.targetMargin || 18) ? 'Under Target' : 'Optimal'}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--bg-secondary)', borderRadius: '2.5px' }}>
                          <div style={{ width: blendedMargin < (p.targetMargin || 18) ? '80%' : '100%', height: '100%', background: blendedMargin < (p.targetMargin || 18) ? 'var(--text-danger)' : 'var(--text-success)', borderRadius: '2.5px' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* SECTION 5: DOCUMENTS (G-Drive Portal) */}
            {activeTab === 'documents' && (
              <div className="animation-fade-in" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', minHeight: '450px', padding: '15px' }}>
                
                {/* Left Panel: Read-only Collapsible Folder Tree */}
                <div style={{ borderRight: '1px solid var(--border)', paddingRight: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
                    <Folder size={12} />
                    <span>Project Folders</span>
                  </div>
                  {folders.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '10px' }}>No folders loaded.</div>
                  ) : (
                    renderFolderTree(folderTree)
                  )}
                </div>

                {/* Right Panel: Lazy-loaded Files list & Drag and Drop Upload */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {selectedFolder ? (
                    <>
                      {/* Active Folder Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedFolder.name}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>G-Drive ID: <span style={{ fontFamily: 'monospace' }}>{selectedFolder.gdrive_folder_id}</span></span>
                        </div>
                        
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="file" 
                            id="file-upload-input" 
                            onChange={handleFileUpload} 
                            style={{ display: 'none' }} 
                            disabled={isUploading}
                          />
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => document.getElementById('file-upload-input').click()}
                            disabled={isUploading}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Upload size={13} />
                            <span>Upload File</span>
                          </button>
                        </div>
                      </div>

                      {/* Upload Progress Indicator */}
                      {isUploading && (
                        <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                            <span>Uploading directly to Google Drive...</span>
                            <strong>{uploadProgress}%</strong>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--text-info)', transition: 'width 0.1s ease', borderRadius: '3px' }} />
                          </div>
                        </div>
                      )}

                      {/* File Drag and Drop Zone */}
                      <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); handleFileUpload(e); }}
                        style={{
                          border: '2px dashed var(--border)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '30px 20px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: 'rgba(255, 255, 255, 0.01)',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => document.getElementById('file-upload-input').click()}
                      >
                        <Upload size={24} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Drag & drop files here, or click to browse
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                          Files are uploaded securely to Google Drive via backend Service Account credentials.
                        </div>
                      </div>

                      {/* Files List view */}
                      <div className="card" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 0 }}>
                        <div className="card-body" style={{ padding: 0 }}>
                          {filesLoading ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                              <RefreshCw size={20} className="animation-spin" />
                              <span style={{ fontSize: '12.5px' }}>Lazy-loading folder files from Google Drive...</span>
                            </div>
                          ) : files.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12.5px', fontStyle: 'italic' }}>
                              No files found in this folder.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {files.map(file => {
                                const ext = file.name.split('.').pop().toUpperCase();
                                const sizeStr = file.sizeBytes 
                                  ? (file.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB'
                                  : '0 KB';
                                const dateStr = file.createdTime 
                                  ? new Date(file.createdTime).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '—';

                                return (
                                  <div 
                                    key={file.id} 
                                    className="doc-row" 
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'space-between',
                                      padding: '12px 16px',
                                      borderBottom: '1px solid var(--border)'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                      <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '6px',
                                        background: 'var(--bg-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '15px'
                                      }}>
                                        {ext === 'PDF' ? '🗂' : ext === 'XLSX' || ext === 'XLS' ? '📊' : '📄'}
                                      </div>
                                      
                                      <div style={{ overflow: 'hidden' }}>
                                        <div 
                                          style={{ 
                                            fontSize: '13px', 
                                            fontWeight: 500, 
                                            color: 'var(--text-primary)',
                                            textOverflow: 'ellipsis',
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          {file.name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                          {sizeStr} · Created {dateStr}
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <a 
                                        href={file.webViewLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="btn btn-sm"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                      >
                                        <Download size={12} />
                                        <span>Download</span>
                                      </a>
                                      
                                      <button 
                                        onClick={() => handleTrashFile(file.id)}
                                        className="btn btn-sm btn-ghost"
                                        style={{ color: 'var(--text-danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                      <Folder size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                      <span>Select a folder from the tree view to browse files.</span>
                    </div>
                  )}
                </div>

              </div>
            )}

        </div>
      </div>

      {/* CREATE DESIGN FEE MODAL */}
      {showCreateDfModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', overflow: 'hidden' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Add Design Fee sub-project</div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowCreateDfModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreateDesignFee}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Fee Proposal Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Guest House design, Phase 2 Lighting"
                    value={newDfForm.name} 
                    onChange={e => setNewDfForm({...newDfForm, name: e.target.value})}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '13px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Sqm Area (m²)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 500"
                    value={newDfForm.sqm} 
                    onChange={e => setNewDfForm({...newDfForm, sqm: e.target.value})}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '13px' }}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn" onClick={() => setShowCreateDfModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Fee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT ORDER MODAL */}
      {showCreateOrderModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', overflow: 'hidden' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Create Product Order (PO)</div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowCreateOrderModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreateProductOrder}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Hardware Supplier</label>
                  <select 
                    className="t-sel" 
                    value={newOrderForm.supplier} 
                    onChange={e => setNewOrderForm({...newOrderForm, supplier: e.target.value})}
                    style={{ fontSize: '13px' }}
                  >
                    <option>Modus Lighting</option>
                    <option>Molecule Dist.</option>
                    <option>Philips Advance</option>
                    <option>Made by 1-to-1</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Items Count</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 15"
                      value={newOrderForm.items} 
                      onChange={e => setNewOrderForm({...newOrderForm, items: e.target.value})}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '13px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Order Value (ZAR)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 45000"
                      value={newOrderForm.value} 
                      onChange={e => setNewOrderForm({...newOrderForm, value: e.target.value})}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '13px' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Amount Paid (ZAR)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 20000"
                      value={newOrderForm.paid} 
                      onChange={e => setNewOrderForm({...newOrderForm, paid: e.target.value})}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Delivery ETA</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 28 May"
                      value={newOrderForm.eta} 
                      onChange={e => setNewOrderForm({...newOrderForm, eta: e.target.value})}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Initial Order Status</label>
                  <select 
                    className="t-sel" 
                    value={newOrderForm.status} 
                    onChange={e => setNewOrderForm({...newOrderForm, status: e.target.value})}
                    style={{ fontSize: '13px' }}
                  >
                    <option>Pending</option>
                    <option>Processing</option>
                    <option>In transit</option>
                    <option>Delivered</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn" onClick={() => setShowCreateOrderModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

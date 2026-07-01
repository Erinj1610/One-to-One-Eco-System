import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { useResizableTable } from '../../components/common/ResizableTable';
import DesignFeeBuilder from './DesignFeeBuilder';
import { API_BASE } from '../../api_config';
import { 
  Lightbulb, ArrowLeft, RefreshCw, Upload, CheckCircle, Clock, Lock, 
  File, FileText, Receipt, Plus, Play, User, Users, ShieldAlert, 
  AlertTriangle, TrendingUp, DollarSign, Calendar, BarChart3, HelpCircle,
  ShoppingBag, ClipboardList, Wallet, Percent, Award, Folder, Download, Trash2,
  Copy, Save, AlertCircle, ChevronRight, Layers
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

const formatDateForInput = (dateStr) => {
  if (!dateStr || dateStr === '—' || dateStr === 'TBD') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    try {
      return new Date(parsed).toISOString().split('T')[0];
    } catch (e) {
      // Ignore
    }
  }
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].trim().padStart(2, '0');
    const month = parts[1].trim().padStart(2, '0');
    const year = parts[2].trim();
    if (year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  return '';
};

export default function ProjectManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, updateProject, saveDraftProject, deleteProject, contacts, moveOrder, moveDesignFee, projectManagers, setProjectManagers } = useStore();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Link/Unlink shifting modal states
  const [linkModalItem, setLinkModalItem] = useState(null);
  const [linkClient, setLinkClient] = useState('');
  const [linkProjectKey, setLinkProjectKey] = useState('');

  const { widths: designWidths, onResizeStart: onDesignResizeStart } = useResizableTable('pm_design_subfees', {
    ref: 100,
    title: 250,
    sqm: 100,
    value: 150,
    paid: 120,
    outstanding: 150,
    margin: 100,
    status: 90
  }, ['ref', 'title', 'sqm', 'value', 'paid', 'outstanding', 'margin', 'status']);

  const { widths: ordersWidths, onResizeStart: onOrdersResizeStart } = useResizableTable('pm_orders_pipeline', {
    ref: 120,
    supplier: 180,
    items: 100,
    value: 150,
    paid: 120,
    outstanding: 150,
    eta: 100,
    status: 90
  }, ['ref', 'supplier', 'items', 'value', 'paid', 'outstanding', 'eta', 'status']);

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

  const userContact = useMemo(() => {
    if (isAdmin) return null;
    return contacts.find(c => c.email?.toLowerCase() === user?.email?.toLowerCase());
  }, [contacts, user, isAdmin]);

  const designFees = useMemo(() => {
    const list = p?.designFees || [];
    if (isAdmin) return list;
    return list.filter(df => {
      const matchEmail = df.clientEmail?.toLowerCase() === user?.email?.toLowerCase();
      const matchName = df.projectClient?.toLowerCase() === userContact?.name?.toLowerCase();
      return matchEmail || matchName;
    });
  }, [p?.designFees, isAdmin, user, userContact]);

  const orders = useMemo(() => {
    const list = p?.orders || [];
    if (isAdmin) return list;
    return list.filter(o => {
      const matchEmail = o.clientEmail?.toLowerCase() === user?.email?.toLowerCase();
      const matchName = o.clientContact?.toLowerCase() === userContact?.name?.toLowerCase();
      return matchEmail || matchName;
    });
  }, [p?.orders, isAdmin, user, userContact]);

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
  const [showCreatePMModal, setShowCreatePMModal] = useState(false);
  const [newPMForm, setNewPMForm] = useState({ name: '', email: '', phone: '' });

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
    if (!p) return 18;
    if (grandContractValue === 0) return p?.actualMargin || 18;
    
    // Weighted sum of actual design margins + detailed cost prices of order spec sheets
    const designMarginCost = designFees.reduce((sum, d) => sum + (d.feeValue * (1 - (d.margin || 18)/100)), 0);
    const orderMarginCost = orders.reduce((sum, o) => {
      // If we have actual itemized costValue, use it! Otherwise assume 20% margin (80% cost price)
      return sum + (o.costValue !== undefined ? o.costValue : (o.value * 0.8));
    }, 0);
    const blendedCost = designMarginCost + orderMarginCost;

    return Math.round(((grandContractValue - blendedCost) / grandContractValue) * 100);
  }, [designFees, orders, grandContractValue, p?.actualMargin]);

  // Sync blended margin back to database store when calculated
  useEffect(() => {
    if (p && blendedMargin !== p?.actualMargin) {
      updateProject(id, 'actualMargin', blendedMargin);
    }
  }, [blendedMargin, p?.actualMargin, id, updateProject]);

  // Sync totals to main fields for backwards compatibility with overview ledger list
  useEffect(() => {
    if (!p) return;
    const formattedFee = `R ${grandContractValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const formattedPaid = `R ${grandPaidValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const formattedOutstanding = `R ${grandOutstandingValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    if (p?.feeValue !== grandContractValue) {
      updateProject(id, 'feeValue', grandContractValue);
      updateProject(id, 'feeExcl', formattedFee);
    }
    if (p?.paid !== formattedPaid) {
      updateProject(id, 'paid', formattedPaid);
    }
    if (p?.outstanding !== formattedOutstanding) {
      updateProject(id, 'outstanding', formattedOutstanding);
    }
  }, [grandContractValue, grandPaidValue, grandOutstandingValue, id, updateProject, p?.feeValue, p?.paid, p?.outstanding]);

  if (!p) return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading Project...</div>;

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
      margin: p.targetMargin || 39,
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
          margin: sigConsult ? 22 : (p.targetMargin || 39),
          status: 'Approved'
        };
      }
      return df;
    });

    updateProject(id, 'designFees', updatedFees);
    alert(`Sub-project Costing synced!\n- Design Fee "${activeDesignFee.name}" updated successfully.\n- Saved proposal file: "${proposalDocName}".`);
  };

  // Create new Product Order
  const handleCreateProductOrder = () => {
    const newOrderId = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const newOrder = {
      id: newOrderId,
      supplier: 'Made by 1-to-1',
      items: 0,
      value: 0,
      paid: 0,
      outstanding: 0,
      status: 'Pending',
      eta: '—',
      itemsList: []
    };

    const updatedOrders = [...orders, newOrder];
    updateProject(id, 'orders', updatedOrders);
    navigate('/orders', { state: { projectKey: p.key, openOrderId: newOrderId } });
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
            <span style={{ fontSize: '13px', fontWeight: 700, color: p.isDraft || grandContractValue === 0 ? 'var(--text-secondary)' : blendedMargin < (p.targetMargin || 39) ? 'var(--text-danger)' : 'var(--text-success)', display: 'block', marginTop: '2px' }}>
              {p.isDraft || grandContractValue === 0 ? '—' : `${blendedMargin}%`}
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
          { id: 'orders', label: '3. Orders Section', icon: <ShoppingBag size={15} />, disabled: p.isDraft || p.projectType === 'Design-Only' },
          { id: 'summary', label: '4. Summary (Statement Overview)', icon: <Layers size={15} />, disabled: p.isDraft },
          { id: 'documents', label: '5. Documents (G-Drive Portal)', icon: <Folder size={15} />, disabled: p.isDraft },
          { id: 'payments', label: '💳 Payments Ledger', icon: <Wallet size={15} />, disabled: p.isDraft }
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
            <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: 'var(--bg-info)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '12.5px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={14} />
                <span><strong>Overview Section:</strong> Configure basic project criteria, stakeholder details, and manage the contacts directory.</span>
              </div>

              {/* 1. Project Information Details Card */}
              <div className="card" style={{ margin: 0, border: '1px solid var(--border)' }}>
                <div className="card-head" style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <div className="card-title" style={{ fontSize: '13px', color: 'var(--text-info)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClipboardList size={16} /> Project Information Details
                  </div>
                </div>
                <div className="card-body" style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Project Name:</span>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={p.name || ''} 
                      onChange={(e) => updateProject(id, 'name', e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Project Type Workflow:</span>
                    <select 
                      className="form-control" 
                      value={p.projectType || 'Design & Orders'} 
                      onChange={(e) => updateProject(id, 'projectType', e.target.value)}
                    >
                      <option value="Design & Orders">Design & Orders</option>
                      <option value="Design-Only">Design-Only</option>
                      <option value="Orders-Only">Orders-Only</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Project Manager:</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select 
                        className="form-control" 
                        value={p.pm || 'Dani'} 
                        onChange={(e) => updateProject(id, 'pm', e.target.value)}
                        style={{ flex: 1 }}
                      >
                        {(projectManagers || []).map(pm => (
                          <option key={pm.id} value={pm.name}>{pm.name} {pm.active === false ? '(Inactive)' : ''}</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ padding: '8px 12px', height: '36px', minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }} 
                        onClick={() => setShowCreatePMModal(true)}
                        title="Add New Project Manager"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Current Stage:</span>
                    <select 
                      className="form-control" 
                      value={p.stage || 'Pending'} 
                      onChange={(e) => updateProject(id, 'stage', e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Complete">Complete</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Start Date:</span>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={formatDateForInput(p.start)} 
                      onChange={(e) => updateProject(id, 'start', e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Deadline Date:</span>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={formatDateForInput(p.deadline)} 
                      onChange={(e) => updateProject(id, 'deadline', e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Meterage Scope (m²):</span>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={p.sqm || ''} 
                      onChange={(e) => updateProject(id, 'sqm', e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Target Margin (%):</span>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={p.targetMargin || 39} 
                      onChange={(e) => updateProject(id, 'targetMargin', Number(e.target.value) || 0)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Delay / Blockers:</span>
                    <select 
                      className="form-control" 
                      value={p.delay || 'None'} 
                      onChange={(e) => updateProject(id, 'delay', e.target.value)}
                    >
                      <option value="None">None</option>
                      <option value="Awaiting feedback/approval">Awaiting feedback/approval</option>
                      <option value="Supply Chain Blocked">Supply Chain Blocked</option>
                      <option value="Budget Constraint">Budget Constraint</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Client Information Card */}
              <div className="card" style={{ margin: 0, border: '1px solid var(--border)' }}>
                <div className="card-head" style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <div className="card-title" style={{ fontSize: '13px', color: 'var(--text-info)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} /> Client Information
                  </div>
                </div>
                <div className="card-body" style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Client Name:</span>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={p.client || ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        updateProject(id, 'client', val);
                        const contact = contacts.find(c => c.name === val);
                        if (contact) {
                          updateProject(id, 'clientCompany', contact.company || '');
                          updateProject(id, 'clientEmail', contact.email || '');
                          updateProject(id, 'clientPhone', contact.phone || '');
                          
                          // Pre-populate Billing details from client
                          updateProject(id, 'billingName', contact.name);
                          updateProject(id, 'billingEmail', contact.email || '');
                          updateProject(id, 'billingPhone', contact.phone || '');
                          updateProject(id, 'billingDetails', `${contact.name}\n${contact.company || ''}`);
                        }
                      }} 
                      placeholder="Type client name or select..."
                      list="client-datalist"
                    />
                    <datalist id="client-datalist">
                      {(contacts || []).map(c => (
                        <option key={c.id || c.name} value={c.name}>{c.company ? `${c.company} (${c.type})` : c.type}</option>
                      ))}
                    </datalist>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Company Name:</span>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={p.clientCompany || ''} 
                      onChange={(e) => updateProject(id, 'clientCompany', e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Client Email Address:</span>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={p.clientEmail || ''} 
                      onChange={(e) => updateProject(id, 'clientEmail', e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Client Mobile Number:</span>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={p.clientPhone || ''} 
                      onChange={(e) => updateProject(id, 'clientPhone', e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              {/* 3. Project Stakeholders & Billing Details Card */}
              <div className="card" style={{ margin: 0, border: '1px solid var(--border)' }}>
                <div className="card-head" style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <div className="card-title" style={{ fontSize: '13px', color: 'var(--text-info)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} /> Project Stakeholders & Billing Details
                  </div>
                </div>
                <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    
                    {/* Architect Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderRight: '1px dashed var(--border)', paddingRight: '20px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-info)' }}>Architect Details:</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Architect Name:</span>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={p.architectName || ''} 
                          list="architect-datalist"
                          onChange={(e) => {
                            const val = e.target.value;
                            updateProject(id, 'architectName', val);
                            const contact = contacts.find(c => c.name === val);
                            if (contact) {
                              updateProject(id, 'architectCompany', contact.company || '');
                              updateProject(id, 'architectEmail', contact.email || '');
                              updateProject(id, 'architectPhone', contact.phone || '');
                            }
                          }}
                          placeholder="Type or select architect..."
                        />
                        <datalist id="architect-datalist">
                          {(contacts || []).filter(c => c.type === 'Architect').map(c => (
                            <option key={c.id || c.name} value={c.name}>{c.company || 'Architect'}</option>
                          ))}
                        </datalist>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Company Name:</span>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={p.architectCompany || ''} 
                          onChange={(e) => updateProject(id, 'architectCompany', e.target.value)} 
                          placeholder="Architect Company"
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Email Address:</span>
                        <input 
                          type="email" 
                          className="form-control" 
                          value={p.architectEmail || ''} 
                          onChange={(e) => updateProject(id, 'architectEmail', e.target.value)} 
                          placeholder="architect@email.com"
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Contact Number:</span>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={p.architectPhone || ''} 
                          onChange={(e) => updateProject(id, 'architectPhone', e.target.value)} 
                          placeholder="Contact Number"
                        />
                      </div>
                    </div>

                    {/* Contractor Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-info)' }}>Contractor Details:</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Contractor Name:</span>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={p.contractorName || ''} 
                          list="contractor-datalist"
                          onChange={(e) => {
                            const val = e.target.value;
                            updateProject(id, 'contractorName', val);
                            const contact = contacts.find(c => c.name === val);
                            if (contact) {
                              updateProject(id, 'contractorCompany', contact.company || '');
                              updateProject(id, 'contractorEmail', contact.email || '');
                              updateProject(id, 'contractorPhone', contact.phone || '');
                            }
                          }}
                          placeholder="Type or select contractor..."
                        />
                        <datalist id="contractor-datalist">
                          {(contacts || []).filter(c => c.type === 'Contractor').map(c => (
                            <option key={c.id || c.name} value={c.name}>{c.company || 'Contractor'}</option>
                          ))}
                        </datalist>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Company Name:</span>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={p.contractorCompany || ''} 
                          onChange={(e) => updateProject(id, 'contractorCompany', e.target.value)} 
                          placeholder="Contractor Company"
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Email Address:</span>
                        <input 
                          type="email" 
                          className="form-control" 
                          value={p.contractorEmail || ''} 
                          onChange={(e) => updateProject(id, 'contractorEmail', e.target.value)} 
                          placeholder="contractor@email.com"
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Contact Number:</span>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={p.contractorPhone || ''} 
                          onChange={(e) => updateProject(id, 'contractorPhone', e.target.value)} 
                          placeholder="Contact Number"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px dashed var(--border)', margin: '10px 0' }}></div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-info)' }}>Billing Details Override:</span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Billing Name:</span>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={p.billingName || ''} 
                        list="billing-datalist"
                        onChange={(e) => {
                          const val = e.target.value;
                          updateProject(id, 'billingName', val);
                          
                          if (val === `Use Client Details (${p.client})` || val === p.client) {
                            updateProject(id, 'billingName', p.client || '');
                            updateProject(id, 'billingEmail', p.clientEmail || '');
                            updateProject(id, 'billingPhone', p.clientPhone || '');
                            updateProject(id, 'billingDetails', `${p.client || ''}\n${p.clientCompany || ''}`);
                            return;
                          }

                          const contact = contacts.find(c => c.name === val);
                          if (contact) {
                            updateProject(id, 'billingName', contact.name);
                            updateProject(id, 'billingEmail', contact.email || '');
                            updateProject(id, 'billingPhone', contact.phone || '');
                            updateProject(id, 'billingDetails', `${contact.name}\n${contact.company || ''}`);
                          }
                        }} 
                        placeholder="Type billing name or select..."
                      />
                      <datalist id="billing-datalist">
                        {p.client && <option value={`Use Client Details (${p.client})`} />}
                        {(contacts || []).map(c => (
                          <option key={c.id || c.name} value={c.name}>{c.company || c.type}</option>
                        ))}
                      </datalist>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Billing Email:</span>
                      <input 
                        type="email" 
                        className="form-control" 
                        value={p.billingEmail || ''} 
                        onChange={(e) => updateProject(id, 'billingEmail', e.target.value)} 
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Billing Mobile:</span>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={p.billingPhone || ''} 
                        onChange={(e) => updateProject(id, 'billingPhone', e.target.value)} 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Full Billing Address:</span>
                    <textarea 
                      className="form-control" 
                      rows={2} 
                      placeholder="Full business legal/VAT billing coordinates"
                      value={p.billingDetails || ''} 
                      onChange={(e) => updateProject(id, 'billingDetails', e.target.value)} 
                    />
                  </div>

                  <div style={{ borderTop: '1px dashed var(--border)', margin: '10px 0' }}></div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Site Delivery Address:</span>
                    <textarea 
                      className="form-control" 
                      rows={2} 
                      placeholder="Street name, City, Zip Code"
                      value={p.deliveryAddress || ''} 
                      onChange={(e) => updateProject(id, 'deliveryAddress', e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              {/* 4. Project Directory & Finance Contacts Card */}
              <div className="card" style={{ margin: 0, border: '1px solid var(--border)' }}>
                <div className="card-head" style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <div className="card-title" style={{ fontSize: '13px', color: 'var(--text-info)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} /> Project Directory & Finance Contacts
                  </div>
                </div>
                <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ margin: 0, fontSize: '12px', width: '100%' }}>
                      <thead>
                        <tr style={{ textAlign: 'left' }}>
                          <th>Category</th>
                          <th>Name</th>
                          <th>Company</th>
                          <th>Role</th>
                          <th>Email</th>
                          <th>Mobile</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const directory = p.contactsList || [
                            { category: 'Project Contact', name: p.client || 'Sarah Venter', company: p.clientCompany || 'Venter Architects', role: 'Client Attn', email: p.clientEmail || 'sarah@venterarch.co.za', phone: p.clientPhone || '082 456 7890' },
                            { category: 'Project Contact', name: 'Dani', company: '1-to-1 Lighting', role: 'Project Manager', email: 'dani@1-to-1.world', phone: '083 570 7795' }
                          ];

                          return directory.map((c, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td>
                                <span className={`badge ${c.category === 'Payment/Finance' ? 'b-success' : 'b-info'}`} style={{ fontSize: '9.5px', padding: '2px 6px' }}>
                                  {c.category}
                                </span>
                              </td>
                              <td>
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm" 
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                  value={c.name} 
                                  onChange={(e) => {
                                    const updated = [...directory];
                                    updated[idx].name = e.target.value;
                                    updateProject(id, 'contactsList', updated);
                                  }}
                                />
                              </td>
                              <td>
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm" 
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                  value={c.company} 
                                  onChange={(e) => {
                                    const updated = [...directory];
                                    updated[idx].company = e.target.value;
                                    updateProject(id, 'contactsList', updated);
                                  }}
                                />
                              </td>
                              <td>
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm" 
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                  value={c.role} 
                                  onChange={(e) => {
                                    const updated = [...directory];
                                    updated[idx].role = e.target.value;
                                    updateProject(id, 'contactsList', updated);
                                  }}
                                />
                              </td>
                              <td>
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm" 
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                  value={c.email} 
                                  onChange={(e) => {
                                    const updated = [...directory];
                                    updated[idx].email = e.target.value;
                                    updateProject(id, 'contactsList', updated);
                                  }}
                                />
                              </td>
                              <td>
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm" 
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                  value={c.phone} 
                                  onChange={(e) => {
                                    const updated = [...directory];
                                    updated[idx].phone = e.target.value;
                                    updateProject(id, 'contactsList', updated);
                                  }}
                                />
                              </td>
                              <td>
                                <button 
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--text-danger)', padding: '2px 6px', fontSize: '12px' }}
                                  onClick={() => {
                                    const updated = directory.filter((_, cIdx) => cIdx !== idx);
                                    updateProject(id, 'contactsList', updated);
                                  }}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ border: '1.5px dashed var(--border)', justifyContent: 'center', flex: 1, padding: '8px', fontSize: '12.5px' }}
                      onClick={() => {
                        const directory = p.contactsList || [
                          { category: 'Project Contact', name: p.client || 'Sarah Venter', company: p.clientCompany || 'Venter Architects', role: 'Client Attn', email: p.clientEmail || 'sarah@venterarch.co.za', phone: p.clientPhone || '082 456 7890' },
                          { category: 'Project Contact', name: 'Dani', company: '1-to-1 Lighting', role: 'Project Manager', email: 'dani@1-to-1.world', phone: '083 570 7795' }
                        ];
                        const updated = [
                          ...directory,
                          { category: 'Project Contact', name: '', company: '', role: '', email: '', phone: '' }
                        ];
                        updateProject(id, 'contactsList', updated);
                      }}
                    >
                      + Add Project Contact
                    </button>

                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ border: '1.5px dashed var(--border)', justifyContent: 'center', flex: 1, padding: '8px', fontSize: '12.5px' }}
                      onClick={() => {
                        const directory = p.contactsList || [
                          { category: 'Project Contact', name: p.client || 'Sarah Venter', company: p.clientCompany || 'Venter Architects', role: 'Client Attn', email: p.clientEmail || 'sarah@venterarch.co.za', phone: p.clientPhone || '082 456 7890' },
                          { category: 'Project Contact', name: 'Dani', company: '1-to-1 Lighting', role: 'Project Manager', email: 'dani@1-to-1.world', phone: '083 570 7795' }
                        ];
                        const updated = [
                          ...directory,
                          { category: 'Payment/Finance', name: '', company: '', role: '', email: '', phone: '' }
                        ];
                        updateProject(id, 'contactsList', updated);
                      }}
                    >
                      + Add Payment / Finance Contact
                    </button>
                  </div>
                </div>
              </div>

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
                    const finalKey = saveDraftProject(id, {
                      name: p.name,
                      client: p.client,
                      sqm: p.sqm || '1,000',
                      pm: p.pm,
                      offering: p.offering,
                      targetMargin: p.targetMargin || 39,
                      projectType: p.projectType || 'Design & Orders',
                      start: new Date().toISOString().split('T')[0],
                      deadline: p.deadline === '—' || !p.deadline ? '' : p.deadline,
                      status: 'On track',
                      stage: 'Pending'
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

              {/* Integrated Plaque & Health Console Below */}
              {!p.isDraft && (
                <div style={{ marginTop: '24px' }}>
                  {/* Project Health Score Card */}
                  <div className="card" style={{ margin: 0, border: '1px solid var(--border)', padding: '16px 20px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'block' }}>Project Health Scoring</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                          <span>Deadline Risk Index</span>
                          <span style={{ fontWeight: 600, color: (!p.start || p.start === '—' || p.start === '') ? 'var(--text-secondary)' : (p.status === 'Off track' ? 'var(--text-danger)' : 'var(--text-success)') }}>
                            {(!p.start || p.start === '—' || p.start === '') ? 'No data' : (p.status === 'Off track' ? 'Critical' : 'Stable')}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--bg-secondary)', borderRadius: '2.5px' }}>
                          <div style={{ width: (!p.start || p.start === '—' || p.start === '') ? '0%' : (p.status === 'Off track' ? '90%' : '15%'), height: '100%', background: (!p.start || p.start === '—' || p.start === '') ? 'var(--border)' : (p.status === 'Off track' ? 'var(--text-danger)' : 'var(--text-success)'), borderRadius: '2.5px' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                          <span>Blended Margin Index</span>
                          <span style={{ fontWeight: 600, color: grandContractValue === 0 ? 'var(--text-secondary)' : blendedMargin < (p.targetMargin || 39) ? 'var(--text-danger)' : 'var(--text-success)' }}>
                            {grandContractValue === 0 ? 'No data' : (blendedMargin < (p.targetMargin || 39) ? 'Under Target' : 'Optimal')}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--bg-secondary)', borderRadius: '2.5px' }}>
                          <div style={{ width: grandContractValue === 0 ? '0%' : (blendedMargin < (p.targetMargin || 39) ? '80%' : '100%'), height: '100%', background: grandContractValue === 0 ? 'var(--border)' : (blendedMargin < (p.targetMargin || 39) ? 'var(--text-danger)' : 'var(--text-success)'), borderRadius: '2.5px' }} />
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
                {/* PROJECT DESIGN FEES SUMMARY CARD */}
                <div className="card" style={{ border: '1.5px solid var(--border)' }}>
                   <div className="card-body" style={{ padding: '20px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                       <h3 style={{ margin: 0, fontSize: '15px', color: 'white', fontWeight: 600 }}>
                         Active Design Fees & Proposals for {p.name}
                       </h3>
                       <div style={{ display: 'flex', gap: '8px' }}>
                         <button className="btn btn-primary btn-sm" onClick={() => setShowCreateDfModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                           <Plus size={14} /> Add Design Fee Sub-project
                         </button>
                       </div>
                     </div>
 
                     {designFees.length === 0 ? (
                       <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                         No design sub-fees or proposals have been created for this project yet. Click above to get started.
                       </div>
                     ) : (
                       <div style={{ overflowX: 'auto' }}>
                         <table className="table" style={{ margin: 0, tableLayout: 'fixed', width: '100%', fontSize: '12.5px' }}>
                           <thead>
                             <tr>
                               <th style={{ width: designWidths.ref, position: 'relative' }}>
                                 Fee Ref
                                 <div className="resize-handle" onMouseDown={e => onDesignResizeStart('ref', e)} />
                               </th>
                               <th style={{ width: designWidths.title, position: 'relative' }}>
                                 Fee Title
                                 <div className="resize-handle" onMouseDown={e => onDesignResizeStart('title', e)} />
                               </th>
                               <th style={{ width: designWidths.sqm, position: 'relative' }}>
                                 Scope Size
                                 <div className="resize-handle" onMouseDown={e => onDesignResizeStart('sqm', e)} />
                               </th>
                               <th style={{ width: designWidths.value, position: 'relative' }}>
                                 Fee Value (EX VAT)
                                 <div className="resize-handle" onMouseDown={e => onDesignResizeStart('value', e)} />
                               </th>
                               <th style={{ width: designWidths.paid, position: 'relative' }}>
                                 Amount Paid
                                 <div className="resize-handle" onMouseDown={e => onDesignResizeStart('paid', e)} />
                               </th>
                               <th style={{ width: designWidths.outstanding, position: 'relative' }}>
                                 Balance Outstanding
                                 <div className="resize-handle" onMouseDown={e => onDesignResizeStart('outstanding', e)} />
                               </th>
                               <th style={{ width: designWidths.margin, position: 'relative' }}>
                                 Design Margin
                                 <div className="resize-handle" onMouseDown={e => onDesignResizeStart('margin', e)} />
                               </th>
                               <th style={{ width: designWidths.status, position: 'relative' }}>
                                 Status
                               </th>
                             </tr>
                           </thead>
                           <tbody>
                             {designFees.map(f => (
                               <tr key={f.id}>
                                 <td style={{ fontFamily: 'monospace', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                   <button 
                                     className="btn-link"
                                     style={{ 
                                       background: 'none', 
                                       border: 'none', 
                                       padding: 0, 
                                       fontFamily: 'inherit', 
                                       fontWeight: 'inherit', 
                                       color: 'var(--text-info)', 
                                       cursor: 'pointer',
                                       textDecoration: 'underline'
                                     }}
                                     onClick={() => navigate('/design', { state: { projectKey: p.key, openFeeId: f.id } })}
                                   >
                                     {f.id}
                                   </button>
                                   {isAdmin && (
                                     <button
                                       className="btn btn-ghost btn-sm"
                                       style={{ padding: '2px 4px', height: '20px', border: '1px solid var(--border)', fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'var(--bg-secondary)' }}
                                       title="Link / Shift Project or Client"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setLinkModalItem(f);
                                         setLinkClient(f.projectClient || '');
                                         setLinkProjectKey(f.projectKey || '');
                                       }}
                                     >
                                       <Layers size={10} /> Link
                                     </button>
                                   )}
                                 </td>
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
                 {/* PROJECT ORDERS SUMMARY VITALS CARD */}
                 <div className="card" style={{ border: '1.5px solid var(--border)' }}>
                   <div className="card-body" style={{ padding: '20px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                       <h3 style={{ margin: 0, fontSize: '15px', color: 'white', fontWeight: 600 }}>
                         Active Quotations & BOQs for {p.name}
                       </h3>
                       <button className="btn btn-primary btn-sm" onClick={handleCreateProductOrder} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <Plus size={14} /> Create Order
                       </button>
                     </div>
 
                     {orders.length === 0 ? (
                       <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                         No orders or quotations have been created for this project yet. Click above to get started.
                       </div>
                     ) : (
                       <div style={{ overflowX: 'auto' }}>
                         <table className="table" style={{ margin: 0, tableLayout: 'fixed', width: '100%', fontSize: '12.5px' }}>
                           <thead>
                             <tr>
                               <th style={{ width: ordersWidths.ref, position: 'relative' }}>
                                 Quote/Order Ref
                                 <div className="resize-handle" onMouseDown={e => onOrdersResizeStart('ref', e)} />
                               </th>
                               <th style={{ width: ordersWidths.supplier, position: 'relative' }}>
                                 Hardware Supplier
                                 <div className="resize-handle" onMouseDown={e => onOrdersResizeStart('supplier', e)} />
                               </th>
                               <th style={{ width: ordersWidths.items, position: 'relative', textAlign: 'center' }}>
                                 BOQ Items
                                 <div className="resize-handle" onMouseDown={e => onOrdersResizeStart('items', e)} />
                               </th>
                               <th style={{ width: ordersWidths.value, position: 'relative' }}>
                                 Billed Retail (EX VAT)
                                 <div className="resize-handle" onMouseDown={e => onOrdersResizeStart('value', e)} />
                               </th>
                               <th style={{ width: ordersWidths.paid, position: 'relative' }}>
                                 Amount Paid
                                 <div className="resize-handle" onMouseDown={e => onOrdersResizeStart('paid', e)} />
                               </th>
                               <th style={{ width: ordersWidths.outstanding, position: 'relative' }}>
                                 Balance Outstanding
                                 <div className="resize-handle" onMouseDown={e => onOrdersResizeStart('outstanding', e)} />
                               </th>
                               <th style={{ width: ordersWidths.eta, position: 'relative' }}>
                                 ETA
                                 <div className="resize-handle" onMouseDown={e => onOrdersResizeStart('eta', e)} />
                               </th>
                               <th style={{ width: ordersWidths.status, position: 'relative' }}>
                                 Status
                               </th>
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
                                   <td style={{ fontFamily: 'monospace', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                     <button 
                                       className="btn-link"
                                       style={{ 
                                         background: 'none', 
                                         border: 'none', 
                                         padding: 0, 
                                         fontFamily: 'inherit', 
                                         fontWeight: 'inherit', 
                                         color: 'var(--text-info)', 
                                         cursor: 'pointer',
                                         textDecoration: 'underline'
                                       }}
                                       onClick={() => navigate('/orders', { state: { projectKey: p.key, openOrderId: o.id } })}
                                     >
                                       {o.id}
                                     </button>
                                     {isAdmin && (
                                       <button
                                         className="btn btn-ghost btn-sm"
                                         style={{ padding: '2px 4px', height: '20px', border: '1px solid var(--border)', fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'var(--bg-secondary)' }}
                                         title="Link / Shift Project or Client"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setLinkModalItem(o);
                                           setLinkClient(o.projectClient || o.clientContact || '');
                                           setLinkProjectKey(o.projectKey || '');
                                         }}
                                       >
                                         <Layers size={10} /> Link
                                       </button>
                                     )}
                                   </td>
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

                        {/* SECTION: PAYMENTS LEDGER (Project-wide payments consolidation) */}
            {activeTab === 'payments' && (
              <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-info)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '12.5px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet size={14} />
                  <span><strong>Project Payments Ledger:</strong> Below is a consolidated log of all payments received across this project's orders. To log new payments, click on an order ref to open its dedicated sync panel.</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '20px', alignItems: 'start' }}>
                  
                  {/* Payments Table list */}
                  <div className="card" style={{ margin: 0, padding: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'white' }}>💳 Consolidated Payments Received</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ margin: 0, fontSize: '12px', width: '100%' }}>
                        <thead>
                          <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: '8px' }}>Date</th>
                            <th style={{ padding: '8px' }}>Order/Quote Ref</th>
                            <th style={{ padding: '8px' }}>Reference / Notes</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const allPayments = [];
                            orders.forEach(o => {
                              if (o.payments && Array.isArray(o.payments)) {
                                o.payments.forEach(p => {
                                  allPayments.push({
                                    orderId: o.id,
                                    date: p.date,
                                    reference: p.reference,
                                    amount: p.amount
                                  });
                                });
                              }
                            });

                            if (allPayments.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                                    No payments have been logged yet for any order in this project.
                                  </td>
                                </tr>
                              );
                            }

                            // Sort payments by date descending
                            allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

                            return allPayments.map((p, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '8px' }}>{p.date}</td>
                                <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 600 }}>
                                  <button 
                                    className="btn-link"
                                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-info)', cursor: 'pointer', textDecoration: 'underline', fontSize: '12px' }}
                                    onClick={() => navigate('/orders', { state: { projectKey: p.key || key, openOrderId: p.orderId } })}
                                  >
                                    {p.orderId}
                                  </button>
                                </td>
                                <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{p.reference || '—'}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: 'var(--text-success)' }}>
                                  R {Number(p.amount || 0).toLocaleString()}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="card" style={{ margin: 0, padding: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Finance Summary</div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        {/* Orders (Incl VAT) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Orders Billed (Incl VAT):</span>
                          <strong style={{ color: 'var(--text-primary)' }}>R {Math.round(totalOrderVal * 1.15).toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-success)' }}>↳ Orders Paid Received:</span>
                          <strong style={{ color: 'var(--text-success)' }}>R {totalOrderPaid.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>↳ Orders Outstanding:</span>
                          <strong style={{ color: 'var(--text-warning)' }}>R {Math.max(0, Math.round(totalOrderVal * 1.15) - totalOrderPaid).toLocaleString()}</strong>
                        </div>

                        {/* Design Fees (Incl VAT) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Design Fees Billed (Incl VAT):</span>
                          <strong style={{ color: 'var(--text-primary)' }}>R {Math.round(totalDesignVal * 1.15).toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-success)' }}>↳ Design Fees Paid Received:</span>
                          <strong style={{ color: 'var(--text-success)' }}>R {totalDesignPaid.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>↳ Design Outstanding:</span>
                          <strong style={{ color: 'var(--text-warning)' }}>R {Math.max(0, Math.round(totalDesignVal * 1.15) - totalDesignPaid).toLocaleString()}</strong>
                        </div>

                        {/* Combined Project Totals */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-success)', fontWeight: 600 }}>Total Payments Cleared:</span>
                          <strong style={{ color: 'var(--text-success)', fontWeight: 700 }}>R {grandPaidValue.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '2px solid var(--border)', paddingTop: '10px', fontWeight: 700 }}>
                          <span style={{ color: 'var(--text-warning)' }}>Total Outstanding Balance:</span>
                          <strong style={{ color: 'var(--text-warning)' }}>R {Math.max(0, Math.round(grandContractValue * 1.15) - grandPaidValue).toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      background: 'linear-gradient(135deg, rgba(24,95,165,0.03) 0%, rgba(139,92,246,0.01) 100%)', 
                      border: '1.5px dashed var(--border-info)', 
                      borderRadius: 'var(--radius-lg)', 
                      padding: '14px 18px',
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)'
                    }}>
                      <strong>💡 Accounting Ledger Tip:</strong> Payments are stored directly inside the specific Order JSON record. Shifting an order to a different project or client via the <strong>Link</strong> button automatically moves its associated payments.
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* SECTION 4: SUMMARY (Statement Overview Balance Sheet) */}
            {activeTab === 'summary' && (
              <div className="animation-fade-in">
                <div style={{ background: 'var(--bg-info)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', fontSize: '12.5px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet size={14} />
                  <span><strong>Statement Overview:</strong> Consolidated summary showing sub-contract items, payments made, and outstanding supplier pipelines.</span>
                </div>

                {/* Grid Financial Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
                  <div className="stat-card" style={{ padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Orders Pipeline</span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-info)', marginTop: '4px' }}>
                      Billed: R {totalOrderVal.toLocaleString()}<br />
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-success)' }}>Paid: R {totalOrderPaid.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="stat-card" style={{ padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Design Portfolio</span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-info)', marginTop: '4px' }}>
                      Billed: R {totalDesignVal.toLocaleString()}<br />
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-success)' }}>Paid: R {totalDesignPaid.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="stat-card" style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-success)', textTransform: 'uppercase', fontWeight: 600 }}>Grand Total Paid</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-success)', marginTop: '8px' }}>R {grandPaidValue.toLocaleString()}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.02)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-warning)', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding ZAR</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-warning)', marginTop: '8px' }}>R {grandOutstandingValue.toLocaleString()}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Blended Margin</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>{grandContractValue === 0 ? '—' : `${blendedMargin}%`}</div>
                  </div>
                </div>

                {/* Sub-ledgers list */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                  
                  {/* Orders Statement */}
                  <div>
                    <div className="section-label" style={{ marginBottom: '10px' }}>Orders pipeline</div>
                    <div className="card" style={{ padding: '10px' }}>
                      <table className="table" style={{ margin: 0, fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th>Order ID</th>
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

                </div>

                {/* Sun Tzu Advisory Banner & Project Health scoring grid */}
                <div style={{ marginTop: '24px' }}>
                  {/* Vitals Console */}
                  <div className="card" style={{ margin: 0, border: '1px solid var(--border)', padding: '16px 20px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'block' }}>Project Health Scoring</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                          <span>Deadline Risk Index</span>
                          <span style={{ fontWeight: 600, color: (!p.start || p.start === '—' || p.start === '') ? 'var(--text-secondary)' : (p.status === 'Off track' ? 'var(--text-danger)' : 'var(--text-success)') }}>
                            {(!p.start || p.start === '—' || p.start === '') ? 'No data' : (p.status === 'Off track' ? 'Critical' : 'Stable')}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--bg-secondary)', borderRadius: '2.5px' }}>
                          <div style={{ width: (!p.start || p.start === '—' || p.start === '') ? '0%' : (p.status === 'Off track' ? '90%' : '15%'), height: '100%', background: (!p.start || p.start === '—' || p.start === '') ? 'var(--border)' : (p.status === 'Off track' ? 'var(--text-danger)' : 'var(--text-success)'), borderRadius: '2.5px' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                          <span>Blended Margin Index</span>
                          <span style={{ fontWeight: 600, color: grandContractValue === 0 ? 'var(--text-secondary)' : blendedMargin < (p.targetMargin || 39) ? 'var(--text-danger)' : 'var(--text-success)' }}>
                            {grandContractValue === 0 ? 'No data' : (blendedMargin < (p.targetMargin || 39) ? 'Under Target' : 'Optimal')}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--bg-secondary)', borderRadius: '2.5px' }}>
                          <div style={{ width: grandContractValue === 0 ? '0%' : (blendedMargin < (p.targetMargin || 39) ? '80%' : '100%'), height: '100%', background: grandContractValue === 0 ? 'var(--border)' : (blendedMargin < (p.targetMargin || 39) ? 'var(--text-danger)' : 'var(--text-success)'), borderRadius: '2.5px' }} />
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
              <div className="card-title">Create Order</div>
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

      {/* LINK/UNLINK SHIFT PROJECT OR CLIENT MODAL */}
      {linkModalItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 700 }}>Link / Shift Document: {linkModalItem.id}</div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setLinkModalItem(null)}>✕</button>
            </div>
            
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Linked Project</label>
                <select 
                  className="form-control" 
                  value={linkProjectKey} 
                  onChange={e => {
                    const nextKey = e.target.value;
                    setLinkProjectKey(nextKey);
                    if (nextKey) {
                      const proj = projects[nextKey];
                      if (proj && proj.client) {
                        setLinkClient(proj.client);
                      }
                    }
                  }}
                >
                  <option value="">-- Client Direct / No Project --</option>
                  {Object.values(projects).filter(proj => proj.projectType !== 'Client-Direct').map(proj => (
                    <option key={proj.key} value={proj.key}>{proj.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Linked Client (Contact)</label>
                <select 
                  className="form-control" 
                  value={linkClient} 
                  onChange={e => setLinkClient(e.target.value)}
                  disabled={!!linkProjectKey}
                >
                  <option value="">-- Select Client --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.company || 'Private'})</option>
                  ))}
                </select>
                {linkProjectKey && (
                  <span style={{ fontSize: '10px', color: 'var(--text-info)', marginTop: '4px', display: 'block' }}>
                    🔒 Client locked to project client: <strong>{linkClient}</strong>
                  </span>
                )}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--bg-primary)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <strong>Linking Note:</strong> Changing links shifts this document. If unlinked from a project, it will be catalogued directly under the client's direct portfolio.
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn" onClick={() => setLinkModalItem(null)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  const targetClient = contacts.find(c => c.name === linkClient) || {};
                  const oldProjectKey = p.key;
                  
                  // Compute target project key
                  let newProjectKey = linkProjectKey;
                  if (!newProjectKey) {
                    if (!linkClient) {
                      alert('Please select a client to link to if unlinking from a project.');
                      return;
                    }
                    newProjectKey = `client-${linkClient.toLowerCase().trim().replace(/\s+/g, '-')}`;
                  }

                  const isOrder = orders.some(o => o.id === linkModalItem.id);
                  if (isOrder) {
                    moveOrder(
                      linkModalItem.id,
                      oldProjectKey,
                      newProjectKey,
                      linkClient,
                      targetClient.company || '',
                      targetClient.phone || '',
                      targetClient.email || ''
                    );
                  } else {
                    moveDesignFee(
                      linkModalItem.id,
                      oldProjectKey,
                      newProjectKey,
                      linkClient,
                      targetClient.company || ''
                    );
                  }
                  
                  setLinkModalItem(null);
                  alert(`Successfully shifted document ${linkModalItem.id}!`);
                }}
              >
                Save & Link Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PROJECT MANAGER MODAL */}
      {showCreatePMModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card animation-fade-in" style={{ width: '450px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 700 }}>Add New Project Manager</div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowCreatePMModal(false)}>✕</button>
            </div>
            <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Full Name:</span>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newPMForm.name} 
                  onChange={(e) => setNewPMForm(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder="e.g. Dani"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Email Address:</span>
                <input 
                  type="email" 
                  className="form-control" 
                  value={newPMForm.email} 
                  onChange={(e) => setNewPMForm(prev => ({ ...prev, email: e.target.value }))} 
                  placeholder="e.g. dani@1-to-1.world"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Phone Number:</span>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newPMForm.phone} 
                  onChange={(e) => setNewPMForm(prev => ({ ...prev, phone: e.target.value }))} 
                  placeholder="e.g. 083 570 7795"
                />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn" onClick={() => setShowCreatePMModal(false)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  if (!newPMForm.name.trim()) {
                    alert('Please enter a name!');
                    return;
                  }
                  const newPM = {
                    id: `pm-${Date.now()}`,
                    name: newPMForm.name.trim(),
                    email: newPMForm.email.trim(),
                    phone: newPMForm.phone.trim(),
                    active: true
                  };
                  setProjectManagers(prev => [...prev, newPM]);
                  updateProject(id, 'pm', newPM.name);
                  setNewPMForm({ name: '', email: '', phone: '' });
                  setShowCreatePMModal(false);
                  alert('Project Manager added and selected!');
                }}
              >
                Save Project Manager
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

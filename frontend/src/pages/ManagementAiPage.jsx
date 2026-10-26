import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api_config';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Plus,
  Trash2,
  Database,
  TrendingUp,
  Boxes,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Cpu,
  Terminal,
  Edit3,
  X,
  Bot,
  Sliders
} from 'lucide-react';

// Custom lightweight markdown renderer supporting tables, bold, italics, bullet lists, code blocks
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBlockLines = [];
  let inTable = false;
  let tableHeader = [];
  let tableRows = [];

  const flushTable = (key) => {
    if (tableHeader.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={`table-${key}`} style={{ overflowX: 'auto', margin: '14px 0' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {tableHeader.length > 0 && (
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.06)', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  {tableHeader.map((th, idx) => (
                    <th key={idx} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#e0e7ff' }}>
                      {renderInline(th.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', background: rIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ padding: '8px 12px', color: '#cbd5e1' }}>
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeader = [];
      tableRows = [];
    }
  };

  const flushCodeBlock = (key) => {
    if (codeBlockLines.length > 0) {
      elements.push(
        <pre key={`code-${key}`} style={{
          background: '#0d1117',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflowX: 'auto',
          fontSize: '12px',
          color: '#58a6ff',
          fontFamily: 'monospace'
        }}>
          <code>{codeBlockLines.join('\n')}</code>
        </pre>
      );
      codeBlockLines = [];
    }
  };

  const renderInline = (str) => {
    if (!str) return '';
    const parts = [];
    let idx = 0;

    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={idx++} style={{ color: '#fff', fontWeight: 650 }}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(<code key={idx++} style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 5px', borderRadius: '4px', fontSize: '12px', color: '#93c5fd' }}>{token.slice(1, -1)}</code>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }
    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(i);
        inCodeBlock = false;
      } else {
        if (inTable) { flushTable(i); inTable = false; }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      const cells = line.trim().slice(1, -1).split('|');
      if (cells.every(c => c.trim().match(/^:?-+:?$/))) {
        continue;
      }
      if (tableHeader.length === 0) {
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      if (inTable) {
        flushTable(i);
        inTable = false;
      }
    }

    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '8px', marginLeft: '12px', marginTop: '4px', marginBottom: '4px', color: '#cbd5e1' }}>
          <span style={{ color: '#818cf8' }}>•</span>
          <div>{renderInline(line.trim().substring(2))}</div>
        </div>
      );
      continue;
    }

    if (line.trim().startsWith('### ')) {
      elements.push(<h4 key={i} style={{ color: '#e0e7ff', marginTop: '16px', marginBottom: '6px', fontSize: '14px', fontWeight: 650 }}>{renderInline(line.trim().substring(4))}</h4>);
      continue;
    }
    if (line.trim().startsWith('## ')) {
      elements.push(<h3 key={i} style={{ color: '#e0e7ff', marginTop: '18px', marginBottom: '8px', fontSize: '15px', fontWeight: 700 }}>{renderInline(line.trim().substring(3))}</h3>);
      continue;
    }
    if (line.trim().startsWith('# ')) {
      elements.push(<h2 key={i} style={{ color: '#fff', marginTop: '20px', marginBottom: '10px', fontSize: '17px', fontWeight: 750 }}>{renderInline(line.trim().substring(2))}</h2>);
      continue;
    }

    if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: '8px' }} />);
    } else {
      elements.push(
        <p key={i} style={{ margin: '4px 0', lineHeight: 1.6, color: '#e2e8f0' }}>
          {renderInline(line)}
        </p>
      );
    }
  }

  if (inTable) flushTable(lines.length);
  if (inCodeBlock) flushCodeBlock(lines.length);

  return <div>{elements}</div>;
}

const DEFAULT_BUILTIN_AGENTS = [
  {
    id: 'executive-all',
    name: 'Executive Master Agent',
    category: 'google',
    icon: 'Sparkles',
    color: '#8b5cf6',
    model: 'gemini-3.8-flash',
    description: 'Full autonomous access to Palladium ERP, Sales, Margin KPIs, Procurement, Stock, Projects, and Logistics via live SQL & multi-step reasoning.',
    suggested_prompts: [
      {
        title: "Executive Revenue & KPI Summary",
        desc: "Live invoiced sales, credit notes, receipts & division budgets",
        query: "Run a full executive financial analysis: show our total invoiced sales, credit notes, and customer receipts by month for the last 6 months, and compare against our FY 2026-2027 division budgets."
      },
      {
        title: "Top 10 Clients & Outstanding Balances",
        desc: "Full SQL aggregation across all Palladium invoices & receipts",
        query: "Who are our top 10 clients by total invoiced revenue in Palladium, how much have they paid in receipts, and what orders do they currently have active in the portal?"
      },
      {
        title: "Overdue Supplier POs & Project Impact",
        desc: "Open Palladium POs grouped by vendor & affected projects",
        query: "Query all open Palladium purchase orders where open_qty > 0. Group them by vendor, show total outstanding value by currency, and list the oldest overdue POs."
      },
      {
        title: "Logistics & Dispatch Bottlenecks",
        desc: "Orders awaiting packing, pending PLs, and dispatched DNs",
        query: "Check our portal orders and logistics tables: which active orders have items remaining to pack or deliver, and what packing lists are currently Pending Dispatch?"
      }
    ]
  },
  {
    id: 'deep-sql-analyst',
    name: 'Data Insights & SQL Analyst',
    category: 'google',
    icon: 'Database',
    color: '#06b6d4',
    model: 'gemini-3.8-flash',
    description: 'Writes and executes multi-table PostgreSQL queries (SUM, GROUP BY, JOIN) across all 6,500+ products and ERP transactions.',
    suggested_prompts: [
      {
        title: "Sales Rep Leaderboard",
        desc: "Exact SQL aggregation of invoiced revenue by sales rep",
        query: "Write a SQL query on palladium_invoice_lines to rank all sales reps by total net invoiced revenue, total invoice count, and average invoice value."
      },
      {
        title: "Deadstock & High-Valuation Inventory",
        desc: "Cross-check stock valuation against historical invoice lines",
        query: "Run a SQL query joining products with palladium_invoice_lines to find the top 15 highest-valuation stock items (stock_on_hand * cost_price) that have had zero invoiced sales in the last 90 days."
      }
    ]
  },
  {
    id: 'procurement-stock',
    name: 'Procurement & Inventory Agent',
    category: 'google',
    icon: 'Boxes',
    color: '#f59e0b',
    model: 'gemini-3.8-flash',
    description: 'Monitors supplier Purchase Orders, Goods Received Notes (GRNs), stock-outs, reorder levels, and factory lead times.',
    suggested_prompts: [
      {
        title: "Vendor Open PO Exposure",
        desc: "Summary of open POs by supplier and currency",
        query: "Summarize all open Purchase Orders grouped by vendor_name and currency_code, showing total open lines, total open_qty, and total_value_excl."
      },
      {
        title: "Recent Goods Received (GRNs)",
        desc: "Latest warehouse deliveries logged in Palladium",
        query: "What Goods Received Notes (GRNs) have been logged most recently in palladium_grn_lines? Show vendor, document number, items, received quantities, and references."
      }
    ]
  },
  {
    id: 'logistics-operations',
    name: 'Projects & Logistics Tracker',
    category: 'google',
    icon: 'TrendingUp',
    color: '#10b981',
    model: 'gemini-3.8-flash',
    description: 'Tracks live portal Projects, Quotations/Orders, Packing Lists, Delivery Notes, POD status, and site snag tickets.',
    suggested_prompts: [
      {
        title: "Active Packing Lists & Delivery Notes",
        desc: "Live status of warehouse PLs and dispatched DNs",
        query: "Show all Logistics Packing Lists and Delivery Notes in the system, including their document numbers, order PO numbers, status, box counts, and whether POD is received."
      },
      {
        title: "Project Pipeline & Order Status",
        desc: "Overview of active projects, PMs, and order values",
        query: "List our active projects and orders in the portal with their project manager (pm_name), client, status, order value, and paid vs outstanding amounts."
      }
    ]
  }
];

function getAgentIcon(iconName, size = 16, color = '#fff') {
  switch (iconName) {
    case 'Database': return <Database size={size} color={color} />;
    case 'Boxes': return <Boxes size={size} color={color} />;
    case 'TrendingUp': return <TrendingUp size={size} color={color} />;
    case 'Bot': return <Bot size={size} color={color} />;
    default: return <Sparkles size={size} color={color} />;
  }
}

export default function ManagementAiPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState(DEFAULT_BUILTIN_AGENTS);
  const [availableModels, setAvailableModels] = useState([
    { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Fast Reasoning + Agentic Tools)' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Deep Analytical Reasoning)' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanced Speed & SQL)' }
  ]);
  const [selectedAgentId, setSelectedAgentId] = useState('executive-all');
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [agentTabFilter, setAgentTabFilter] = useState('all'); // 'all' | 'google' | 'custom'
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [expandedSqlIdx, setExpandedSqlIdx] = useState({});

  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('mgmt_ai_sessions');
      return saved ? JSON.parse(saved) : [{ id: 'default', title: 'New Agent Session', agentId: 'executive-all', messages: [] }];
    } catch {
      return [{ id: 'default', title: 'New Agent Session', agentId: 'executive-all', messages: [] }];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    try {
      const saved = localStorage.getItem('mgmt_ai_active_id');
      return saved || 'default';
    } catch {
      return 'default';
    }
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [syncStatus, setSyncStatus] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];
  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0] || DEFAULT_BUILTIN_AGENTS[0];

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mgmt_ai_sessions', JSON.stringify(sessions));
      localStorage.setItem('mgmt_ai_active_id', activeSessionId);
    } catch (e) {
      console.error("Failed to persist AI sessions:", e);
    }
  }, [sessions, activeSessionId]);

  // Fetch agents list and sync freshness status
  useEffect(() => {
    const fetchAgentsAndStatus = async () => {
      try {
        const [statusRes, agentsRes] = await Promise.all([
          fetch(`${API_BASE}/api/management-ai/status`),
          fetch(`${API_BASE}/api/management-ai/agents`)
        ]);
        if (statusRes.ok) {
          const data = await statusRes.json();
          setSyncStatus(data);
          if (Array.isArray(data.models) && data.models.length > 0) {
            setAvailableModels(data.models);
          }
        }
        if (agentsRes.ok) {
          const agData = await agentsRes.json();
          if (Array.isArray(agData.agents) && agData.agents.length > 0) {
            setAgents(agData.agents);
          }
        }
      } catch (e) {
        console.warn("Could not fetch AI status or agents:", e);
      }
    };
    fetchAgentsAndStatus();
    const interval = setInterval(fetchAgentsAndStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Web Speech API Voice Recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = 'en-ZA';

      recog.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputPrompt(transcript);
      };

      recog.onerror = () => setIsListening(false);
      recog.onend = () => setIsListening(false);
      recognitionRef.current = recog;
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Could not start speech recognition:", e);
      }
    }
  };

  const handleTextToSpeech = (text, idx) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingMsgIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_\|]/g, ' ').replace(/-+/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingMsgIdx(null);
    utterance.onerror = () => setSpeakingMsgIdx(null);
    setSpeakingMsgIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleCreateNewSession = (agentIdOverride) => {
    const targetAgentId = agentIdOverride || selectedAgentId;
    const targetAgent = agents.find(a => a.id === targetAgentId) || activeAgent;
    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      title: `${targetAgent.name} Chat`,
      agentId: targetAgentId,
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      setSessions([{ id: 'default', title: 'New Agent Session', agentId: selectedAgentId, messages: [] }]);
      setActiveSessionId('default');
      return;
    }
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
  };

  const handleSaveCustomAgent = async (e) => {
    e.preventDefault();
    if (!editingAgent?.name?.trim() || !editingAgent?.system_prompt?.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/management-ai/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAgent)
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.agents)) {
          setAgents(data.agents);
        }
        if (data.agent?.id) {
          setSelectedAgentId(data.agent.id);
          setSelectedModel(data.agent.model || 'gemini-3.8-flash');
        }
        setShowAgentModal(false);
        setEditingAgent(null);
      }
    } catch (err) {
      console.error("Failed to save custom agent:", err);
    }
  };

  const handleDeleteCustomAgent = async (agentId, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/management-ai/agents/${agentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.agents)) {
          setAgents(data.agents);
        }
        if (selectedAgentId === agentId) {
          setSelectedAgentId('executive-all');
        }
      }
    } catch (err) {
      console.error("Failed to delete custom agent:", err);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isLoading) return;

    setInputPrompt('');
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage = { role: 'user', content: query, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];

    let sessionTitle = activeSession.title;
    if (messages.length === 0) {
      sessionTitle = query.slice(0, 34) + (query.length > 34 ? '…' : '');
    }

    const assistantIndex = updatedMessages.length;
    const initialAssistantMessage = {
      role: 'assistant',
      content: '',
      agentName: activeAgent.name,
      model: selectedModel,
      tools_called: [],
      tool_steps: [],
      sql_queries: [],
      timestamp: new Date().toISOString()
    };

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, title: sessionTitle, agentId: selectedAgentId, messages: [...updatedMessages, initialAssistantMessage] };
      }
      return s;
    }));

    setIsLoading(true);
    setLoadingStatus(`${activeAgent.name} is reasoning & planning tool calls...`);

    try {
      const historyPayload = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`${API_BASE}/api/management-ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          agent_id: selectedAgentId,
          model: selectedModel,
          user_email: user?.email || '',
          user_name: user?.name || ''
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server responded with ${res.status}`);
      }

      if (!res.body) {
        throw new Error("ReadableStream not supported by browser or response.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';
      let activeTools = [];
      let activeSteps = [];
      let activeSqls = [];
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.status) {
                setLoadingStatus(parsed.status);
              }
              if (parsed.tools_called) {
                activeTools = parsed.tools_called;
              }
              if (parsed.tool_steps) {
                activeSteps = parsed.tool_steps;
              }
              if (parsed.sql_queries) {
                activeSqls = parsed.sql_queries;
              }
              if (parsed.text) {
                streamedContent += parsed.text;
              }
              if (parsed.text || parsed.tool_steps || parsed.tools_called) {
                setSessions(prev => prev.map(s => {
                  if (s.id === activeSessionId) {
                    const newMsgs = [...s.messages];
                    if (newMsgs[assistantIndex]) {
                      newMsgs[assistantIndex] = {
                        ...newMsgs[assistantIndex],
                        content: streamedContent,
                        tools_called: activeTools,
                        tool_steps: activeSteps,
                        sql_queries: activeSqls
                      };
                    }
                    return { ...s, messages: newMsgs };
                  }
                  return s;
                }));
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (jsonErr) {
              if (jsonErr.message && !jsonErr.message.includes('JSON')) {
                throw jsonErr;
              }
            }
          }
        }
      }

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          const newMsgs = [...s.messages];
          if (newMsgs[assistantIndex]) {
            newMsgs[assistantIndex] = {
              ...newMsgs[assistantIndex],
              content: streamedContent || 'Query completed.',
              tools_called: activeTools,
              tool_steps: activeSteps,
              sql_queries: activeSqls
            };
          }
          return { ...s, messages: newMsgs };
        }
        return s;
      }));

    } catch (err) {
      console.error("Management AI streaming error:", err);
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          const newMsgs = [...s.messages];
          if (newMsgs[assistantIndex]) {
            newMsgs[assistantIndex] = {
              ...newMsgs[assistantIndex],
              content: `⚠️ **Agent Execution Error**: Could not complete query.\n\n*Details*: ${err.message}`
            };
          }
          return { ...s, messages: newMsgs };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const filteredAgents = agents.filter(a => {
    if (agentTabFilter === 'google') return a.category !== 'custom';
    if (agentTabFilter === 'custom') return a.category === 'custom';
    return true;
  });

  const activePrompts = (activeAgent?.suggested_prompts && activeAgent.suggested_prompts.length > 0)
    ? activeAgent.suggested_prompts
    : DEFAULT_BUILTIN_AGENTS[0].suggested_prompts;

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 56px)',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 50%, #090d16 100%)',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      overflow: 'hidden'
    }}>
      {/* LEFT SIDEBAR: AGENT HUB & SESSIONS */}
      <div style={{
        width: '290px',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Top Action Buttons */}
        <div style={{ padding: '14px 14px 10px 14px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleCreateNewSession()}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12.5px',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
            }}
          >
            <Plus size={15} /> New Chat
          </button>

          <button
            onClick={() => {
              setEditingAgent({
                id: null,
                name: '',
                description: '',
                icon: 'Bot',
                color: '#8b5cf6',
                model: selectedModel,
                system_prompt: 'You are a specialized One to One World AI Agent. Always use tool_execute_readonly_sql to verify numbers from Cloud SQL before answering.',
                suggested_prompts: []
              });
              setShowAgentModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px'
            }}
            title="Create your own custom Gemini Agent"
          >
            <Sliders size={14} color="#c084fc" /> + Agent
          </button>
        </div>

        {/* Agent Category Filter Pill (Google-made vs Make your own) */}
        <div style={{ padding: '0 14px 10px 14px' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '3px',
            border: '1px solid rgba(255, 255, 255, 0.07)'
          }}>
            {[
              { id: 'all', label: 'All Agents' },
              { id: 'google', label: 'Built-In' },
              { id: 'custom', label: 'My Agents' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAgentTabFilter(tab.id)}
                style={{
                  flex: 1,
                  padding: '5px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  background: agentTabFilter === tab.id ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                  color: agentTabFilter === tab.id ? '#fff' : '#94a3b8'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Specialist Agents List */}
        <div style={{ padding: '0 10px 10px 10px', maxHeight: '245px', overflowY: 'auto', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px 6px 8px' }}>
            Active AI Agents ({filteredAgents.length})
          </div>
          {filteredAgents.map(ag => {
            const isSelected = ag.id === selectedAgentId;
            return (
              <div
                key={ag.id}
                onClick={() => {
                  setSelectedAgentId(ag.id);
                  if (ag.model) setSelectedModel(ag.model);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                  background: isSelected ? 'rgba(139, 92, 246, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? `1px solid ${ag.color || '#8b5cf6'}` : '1px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', overflow: 'hidden', flex: 1 }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '7px',
                    background: `${ag.color || '#8b5cf6'}22`,
                    border: `1px solid ${ag.color || '#8b5cf6'}55`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getAgentIcon(ag.icon, 14, ag.color || '#c084fc')}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 650 : 500,
                      color: isSelected ? '#fff' : '#e2e8f0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {ag.name}
                    </div>
                    <div style={{
                      fontSize: '10.5px',
                      color: '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {ag.category === 'custom' ? 'Custom Agent' : 'Autonomous SQL + Tools'}
                    </div>
                  </div>
                </div>

                {ag.category === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAgent(ag);
                        setShowAgentModal(true);
                      }}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '3px' }}
                      title="Edit Custom Agent"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCustomAgent(ag.id, e)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '3px' }}
                      title="Delete Custom Agent"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sessions List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 16px 10px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 8px' }}>
            Conversation History
          </div>
          {sessions.map(s => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => {
                  setActiveSessionId(s.id);
                  if (s.agentId) setSelectedAgentId(s.agentId);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  marginBottom: '3px',
                  background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  border: isActive ? '1px solid rgba(129, 140, 248, 0.3)' : '1px solid transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                  <MessageSquare size={13} color={isActive ? '#818cf8' : '#64748b'} />
                  <span style={{
                    fontSize: '12.5px',
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {s.title}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    opacity: isActive ? 0.8 : 0.3
                  }}
                  title="Delete chat"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info: Model status */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '11px', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <Cpu size={13} color="#a855f7" />
            <span style={{ fontWeight: 650, color: '#c084fc' }}>True ReAct SQL + Tool Loop</span>
          </div>
          <div style={{ fontSize: '10.5px', color: '#64748b' }}>Pay-per-query Vertex AI (~$0.0005/query)</div>
        </div>
      </div>

      {/* MAIN GEMINI CHAT CANVAS */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        {/* Top Header Bar */}
        <div style={{
          height: '60px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${activeAgent.color || '#6366f1'} 0%, #a855f7 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {getAgentIcon(activeAgent.icon, 18, '#ffffff')}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#f8fafc' }}>
                  {activeAgent.name}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 650,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  color: '#ddd6fe'
                }}>
                  LIVE SQL AGENT
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {activeAgent.description}
              </div>
            </div>
          </div>

          {/* Model Selector + Sync Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                background: 'rgba(30, 41, 59, 0.85)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '6px 10px',
                fontSize: '11.5px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
              title="Select underlying Vertex AI Gemini Model"
            >
              {availableModels.map(m => (
                <option key={m.id} value={m.id} style={{ background: '#0f172a', color: '#fff' }}>
                  {m.label}
                </option>
              ))}
            </select>

            {syncStatus && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '5px 12px',
                borderRadius: '16px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '11px',
                color: '#34d399',
                whiteSpace: 'nowrap'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                <span>Cloud SQL Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Message Stream */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px 140px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{ width: '100%', maxWidth: '860px' }}>
            {/* Empty State / Welcome Screen */}
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 0 20px 0' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  marginBottom: '16px',
                  boxShadow: '0 8px 30px rgba(124, 58, 237, 0.2)'
                }}>
                  {getAgentIcon(activeAgent.icon, 30, activeAgent.color || '#c084fc')}
                </div>
                <h1 style={{
                  fontSize: '26px',
                  fontWeight: 750,
                  margin: '0 0 8px 0',
                  background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #818cf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em'
                }}>
                  {activeAgent.name}
                </h1>
                <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '580px', margin: '0 auto 28px auto', lineHeight: 1.5 }}>
                  {activeAgent.description}
                </p>

                {/* Prompt Cards Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '12px',
                  textAlign: 'left'
                }}>
                  {activePrompts.map((sug, i) => (
                    <div
                      key={i}
                      onClick={() => handleSendMessage(sug.query)}
                      style={{
                        padding: '15px',
                        borderRadius: '14px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.4)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ fontSize: '13.5px', fontWeight: 650, color: '#f1f5f9', marginBottom: '5px' }}>
                        {sug.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                        {sug.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered Messages */}
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              const hasSql = Array.isArray(m.sql_queries) && m.sql_queries.length > 0;
              const hasSteps = Array.isArray(m.tool_steps) && m.tool_steps.length > 0;
              const isSqlOpen = !!expandedSqlIdx[idx];

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    marginBottom: '24px',
                    width: '100%'
                  }}
                >
                  {/* Sender Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                    padding: '0 4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isUser ? '#818cf8' : '#c084fc'
                  }}>
                    {isUser ? (
                      <span>You</span>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>{m.agentName || activeAgent.name}</span>
                        {m.model && (
                          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>
                            ({m.model})
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Message Bubble / Canvas */}
                  <div style={{
                    maxWidth: isUser ? '85%' : '100%',
                    padding: isUser ? '12px 18px' : '18px 22px',
                    borderRadius: isUser ? '20px 20px 4px 20px' : '16px',
                    background: isUser ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' : 'rgba(255, 255, 255, 0.035)',
                    border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isUser ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#f8fafc',
                    width: isUser ? 'auto' : '100%'
                  }}>
                    {isUser ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                    ) : (
                      <div>
                        {/* Real Executed Tool Steps & SQL Drawer */}
                        {(hasSteps || (m.tools_called && m.tools_called.length > 0)) && (
                          <div style={{
                            marginBottom: '14px',
                            borderRadius: '10px',
                            background: 'rgba(15, 23, 42, 0.65)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            overflow: 'hidden'
                          }}>
                            <div
                              onClick={() => setExpandedSqlIdx(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontSize: '11.5px',
                                color: '#a5b4fc'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Terminal size={13} color="#38bdf8" />
                                <span>
                                  Executed <strong>{hasSteps ? m.tool_steps.length : m.tools_called.length}</strong> live database tool call(s)
                                  {hasSql ? ` (${m.sql_queries.length} SQL query)` : ''}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                                <span>{isSqlOpen ? 'Hide SQL & Steps' : 'Inspect SQL & Steps'}</span>
                                {isSqlOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </div>
                            </div>

                            {isSqlOpen && (
                              <div style={{
                                padding: '10px 12px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                background: '#090d16',
                                fontSize: '11.5px'
                              }}>
                                {hasSteps ? m.tool_steps.map((st, sIdx) => (
                                  <div key={sIdx} style={{ marginBottom: sIdx < m.tool_steps.length - 1 ? '10px' : 0 }}>
                                    <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '3px' }}>
                                      Step {sIdx + 1}: <code style={{ color: '#38bdf8' }}>{st.tool}</code>
                                      {st.rows_matched !== undefined && st.rows_matched !== null && (
                                        <span style={{ color: '#34d399', marginLeft: '8px' }}>
                                          ✓ {st.rows_matched} rows returned
                                        </span>
                                      )}
                                      {st.error && (
                                        <span style={{ color: '#f87171', marginLeft: '8px' }}>
                                          ⚠️ {st.error}
                                        </span>
                                      )}
                                    </div>
                                    {st.sql && (
                                      <pre style={{
                                        margin: '4px 0 0 0',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        background: '#0d1117',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                        color: '#93c5fd',
                                        fontSize: '11px',
                                        overflowX: 'auto',
                                        fontFamily: 'monospace'
                                      }}>
                                        {st.sql}
                                      </pre>
                                    )}
                                  </div>
                                )) : (
                                  <div style={{ color: '#94a3b8' }}>Tools: {m.tools_called.join(', ')}</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <FormattedMessage text={m.content} />
                      </div>
                    )}

                    {/* Assistant Action Buttons */}
                    {!isUser && m.content && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '14px',
                        paddingTop: '10px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <button
                          onClick={() => handleCopy(m.content, idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedIdx === idx ? '#34d399' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          {copiedIdx === idx ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => handleTextToSpeech(m.content, idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: speakingMsgIdx === idx ? '#f43f5e' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          {speakingMsgIdx === idx ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          <span>{speakingMsgIdx === idx ? 'Stop Audio' : 'Read Aloud'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking / Autonomous Tool Calling Progress Indicator */}
            {isLoading && (!messages[messages.length - 1] || messages[messages.length - 1]?.content === '') && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                marginBottom: '24px',
                width: '100%'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#c084fc'
                }}>
                  <Sparkles size={14} />
                  <span>{activeAgent.name}</span>
                </div>
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(168, 85, 247, 0.2)',
                    borderTopColor: '#c084fc',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                    {loadingStatus || 'Reasoning & querying live Cloud SQL tables...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* BOTTOM FIXED INPUT BAR */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px 20px 24px',
          background: 'linear-gradient(to top, #090d16 80%, rgba(9, 13, 22, 0) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 20
        }}>
          <div style={{
            width: '100%',
            maxWidth: '860px',
            position: 'relative',
            background: 'rgba(30, 41, 59, 0.78)',
            border: isListening ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '28px',
            backdropFilter: 'blur(20px)',
            boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            padding: '6px 12px 6px 18px'
          }}>
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isListening ? "Listening to your voice... Speak now..." : `Ask ${activeAgent.name} any question across Palladium ERP, SQL, Stock, or Logistics...`}
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: '14px',
                padding: '8px 0'
              }}
            />

            <button
              onClick={toggleVoiceRecording}
              style={{
                background: isListening ? '#ef4444' : 'none',
                border: 'none',
                color: isListening ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '6px'
              }}
              title={isListening ? "Stop listening" : "Speak your query"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isLoading}
              style={{
                background: inputPrompt.trim() && !isLoading ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: inputPrompt.trim() && !isLoading ? '#ffffff' : '#64748b',
                cursor: inputPrompt.trim() && !isLoading ? 'pointer' : 'default',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={16} />
            </button>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '7px', textAlign: 'center' }}>
            Autonomous Vertex AI Agent • Executes live PostgreSQL aggregations & multi-step tool calls on Cloud SQL.
          </div>
        </div>
      </div>

      {/* MAKE YOUR OWN AGENT MODAL */}
      {showAgentModal && editingAgent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '580px',
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bot size={22} color="#c084fc" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                  {editingAgent.id ? 'Edit Custom Gemini Agent' : 'Create Your Own Gemini Agent'}
                </h3>
              </div>
              <button
                onClick={() => { setShowAgentModal(false); setEditingAgent(null); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomAgent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                  Agent Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Debtors & Cashflow Auditor, Lighting Spec Assistant"
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#fff',
                    fontSize: '13.5px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                    Gemini Reasoning Model
                  </label>
                  <select
                    value={editingAgent.model || 'gemini-3.8-flash'}
                    onChange={(e) => setEditingAgent({ ...editingAgent, model: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#fff',
                      fontSize: '13px'
                    }}
                  >
                    {availableModels.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                    Badge Color
                  </label>
                  <input
                    type="color"
                    value={editingAgent.color || '#8b5cf6'}
                    onChange={(e) => setEditingAgent({ ...editingAgent, color: e.target.value })}
                    style={{
                      width: '100%',
                      height: '40px',
                      borderRadius: '10px',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="What is this agent's specialty?"
                  value={editingAgent.description}
                  onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#fff',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                  Agent Instructions & System Persona *
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Define exactly how this agent should analyze data, which SQL tables or KPIs it should prioritize, and how it should format reports..."
                  value={editingAgent.system_prompt}
                  onChange={(e) => setEditingAgent({ ...editingAgent, system_prompt: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#fff',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    resize: 'vertical'
                  }}
                />
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  This agent automatically inherits full access to live PostgreSQL queries across Palladium ERP, Stock, Projects, Orders, and Logistics.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAgentModal(false); setEditingAgent(null); }}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Save Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

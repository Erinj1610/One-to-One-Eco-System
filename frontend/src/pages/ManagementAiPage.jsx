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
  RefreshCw,
  Plus,
  Trash2,
  Database,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Boxes,
  HelpCircle,
  MessageSquare
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
    // Format bold **text**
    const parts = [];
    let remaining = str;
    let idx = 0;

    // Replace bold **text** and backtick `code`
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

    // Markdown Table check
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      const cells = line.trim().slice(1, -1).split('|');
      // Check if separator line e.g. |---|---|
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

    // Bullet points
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '8px', marginLeft: '12px', marginY: '4px', color: '#cbd5e1' }}>
          <span style={{ color: '#818cf8' }}>•</span>
          <div>{renderInline(line.trim().substring(2))}</div>
        </div>
      );
      continue;
    }

    // Headers
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

    // Regular line / Paragraph
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

export default function ManagementAiPage() {
  const { user, isAdmin } = useAuth();
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('mgmt_ai_sessions');
      return saved ? JSON.parse(saved) : [{ id: 'default', title: 'New Executive Session', messages: [] }];
    } catch {
      return [{ id: 'default', title: 'New Executive Session', messages: [] }];
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
  const [syncStatus, setSyncStatus] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mgmt_ai_sessions', JSON.stringify(sessions));
      localStorage.setItem('mgmt_ai_active_id', activeSessionId);
    } catch (e) {
      console.error("Failed to persist AI sessions:", e);
    }
  }, [sessions, activeSessionId]);

  // Fetch sync freshness status
  useEffect(() => {
    const fetchFreshness = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/management-ai/status`);
        if (res.ok) {
          const data = await res.json();
          setSyncStatus(data);
        }
      } catch (e) {
        console.warn("Could not fetch sync freshness:", e);
      }
    };
    fetchFreshness();
    const interval = setInterval(fetchFreshness, 30000);
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
      recog.lang = 'en-ZA'; // South African English accent support

      recog.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputPrompt(transcript);
      };

      recog.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

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
    // Clean markdown formatting characters for speech
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

  const handleCreateNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = { id: newId, title: 'New Executive Session', messages: [] };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      setSessions([{ id: 'default', title: 'New Executive Session', messages: [] }]);
      setActiveSessionId('default');
      return;
    }
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
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

    // Auto-title session if first user message
    let sessionTitle = activeSession.title;
    if (messages.length === 0) {
      sessionTitle = query.slice(0, 32) + (query.length > 32 ? '…' : '');
    }

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, title: sessionTitle, messages: updatedMessages };
      }
      return s;
    }));

    setIsLoading(true);

    try {
      const historyPayload = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`${API_BASE}/api/management-ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          user_email: user?.email || '',
          user_name: user?.name || ''
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.content || data.reply || '';
      const assistantMessage = {
        role: 'assistant',
        content: replyText,
        tools_called: data.tools_called || [],
        timestamp: new Date().toISOString()
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...updatedMessages, assistantMessage] };
        }
        return s;
      }));
    } catch (err) {
      console.error("Management AI error:", err);
      const errorMessage = {
        role: 'assistant',
        content: `⚠️ **Executive Assistant Error**: Could not complete query.\n\n*Details*: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...updatedMessages, errorMessage] };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const PROMPT_SUGGESTIONS = [
    {
      title: "Executive Overview",
      desc: "Gross profit, sales vs budget, and high-level KPIs",
      query: "Give me an executive KPI summary across all divisions including total sales this month, YTD vs target, and overall gross profit margin."
    },
    {
      title: "Overdue Purchase Orders",
      desc: "Outstanding vendor deliveries from Palladium",
      query: "Show me all outstanding Palladium purchase orders that have not been fully received yet, grouped by vendor with total values."
    },
    {
      title: "Deadstock & Slow-Moving",
      desc: "High-value inventory sitting unsold",
      query: "Analyze our inventory: what are the top 10 highest-value items in stock with zero sales in the last 60 days?"
    },
    {
      title: "Top 5 Clients Revenue",
      desc: "Highest contributing accounts this financial year",
      query: "Who are our top 5 clients by total invoiced sales in Palladium over the last 12 months, and how much has each contributed?"
    }
  ];

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 56px)',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 50%, #090d16 100%)',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      overflow: 'hidden'
    }}>
      {/* LEFT SESSIONS DRAWER / SIDEBAR (Gemini Style) */}
      <div style={{
        width: '260px',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* New Chat Button */}
        <div style={{ padding: '16px' }}>
          <button
            onClick={handleCreateNewSession}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '11px 16px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} /> New Session
          </button>
        </div>

        {/* Sessions List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px 8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 650, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>
            Recent Conversations
          </div>
          {sessions.map(s => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  marginBottom: '3px',
                  background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  border: isActive ? '1px solid rgba(129, 140, 248, 0.3)' : '1px solid transparent',
                  transition: 'background 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                  <MessageSquare size={14} color={isActive ? '#818cf8' : '#64748b'} />
                  <span style={{
                    fontSize: '13px',
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
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '11px', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Sparkles size={13} color="#a855f7" />
            <span style={{ fontWeight: 650, color: '#c084fc' }}>Gemini 3.8 Flash Engine</span>
          </div>
          <div>Management Grounded Intelligence</div>
        </div>
      </div>

      {/* MAIN GEMINI CHAT CANVAS */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        {/* Top Header Bar */}
        <div style={{
          height: '56px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                Executive Intelligence
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Directly connected to Palladium ERP & Cloud SQL Data Warehouse
              </div>
            </div>
          </div>

          {/* Freshness Status Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                color: '#34d399'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                <span>Palladium Synced {syncStatus.last_synced_human || 'Active'}</span>
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
          <div style={{ width: '100%', maxWidth: '820px' }}>
            {/* Empty State / Welcome Screen */}
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0 20px 0' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  marginBottom: '20px',
                  boxShadow: '0 8px 30px rgba(124, 58, 237, 0.2)'
                }}>
                  <Sparkles size={32} color="#c084fc" />
                </div>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: 750,
                  margin: '0 0 10px 0',
                  background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #818cf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em'
                }}>
                  Hello, {user?.name ? user.name.split(' ')[0] : 'Executive'}
                </h1>
                <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '520px', margin: '0 auto 36px auto', lineHeight: 1.5 }}>
                  Ask me anything about One to One's sales, margins, overdue supplier POs, deadstock, or Palladium customer balances.
                </p>

                {/* Prompt Cards Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '14px',
                  textAlign: 'left'
                }}>
                  {PROMPT_SUGGESTIONS.map((sug, i) => (
                    <div
                      key={i}
                      onClick={() => handleSendMessage(sug.query)}
                      style={{
                        padding: '16px',
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
                      <div style={{ fontSize: '14px', fontWeight: 650, color: '#f1f5f9', marginBottom: '6px' }}>
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
                        <span>Gemini 3.8 Flash Executive</span>
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
                        {m.tools_called && m.tools_called.length > 0 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '12px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            fontSize: '11px',
                            color: '#a5b4fc'
                          }}>
                            <Database size={12} />
                            <span>Queried live Palladium tables: <strong>{m.tools_called.join(', ')}</strong></span>
                          </div>
                        )}
                        <FormattedMessage text={m.content} />
                      </div>
                    )}

                    {/* Assistant Action Buttons (Copy, Text-To-Speech) */}
                    {!isUser && (
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
                            borderRadius: '6px',
                            transition: 'color 0.15s'
                          }}
                          title="Copy response"
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
                            borderRadius: '6px',
                            transition: 'color 0.15s'
                          }}
                          title={speakingMsgIdx === idx ? "Stop speaking" : "Listen to answer"}
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

            {/* Thinking / Tool Calling Animation */}
            {isLoading && (
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
                  <span>Gemini 3.8 Flash Analyzing Palladium Data…</span>
                </div>
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(168, 85, 247, 0.2)',
                    borderTopColor: '#c084fc',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Querying Cloud SQL sales, POs, and stock tables…
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* BOTTOM FIXED INPUT BAR (Gemini Style) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px 24px 24px',
          background: 'linear-gradient(to top, #090d16 80%, rgba(9, 13, 22, 0) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 20
        }}>
          <div style={{
            width: '100%',
            maxWidth: '820px',
            position: 'relative',
            background: 'rgba(30, 41, 59, 0.75)',
            border: isListening ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '28px',
            backdropFilter: 'blur(20px)',
            boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            padding: '6px 12px 6px 18px',
            transition: 'border 0.2s, box-shadow 0.2s'
          }}>
            {/* Input textarea / text field */}
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
              placeholder={isListening ? "Listening to your voice... Speak now..." : "Ask Gemini about sales, budgets, POs, or Palladium stock..."}
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

            {/* Mic / Voice Button */}
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
                marginRight: '6px',
                transition: 'all 0.15s'
              }}
              title={isListening ? "Stop listening" : "Speak your query"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Send Button */}
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
                justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: inputPrompt.trim() && !isLoading ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none'
              }}
            >
              <Send size={16} />
            </button>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
            Gemini 3.8 Flash answers using live mirrored Cloud SQL records. Numbers and ZAR values are verified against Palladium ERP.
          </div>
        </div>
      </div>
    </div>
  );
}

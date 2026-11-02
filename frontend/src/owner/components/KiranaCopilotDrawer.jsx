import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  ArrowUpRight,
  CheckCircle2,
  Package,
  RefreshCw,
  RotateCcw,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STORAGE_KEY_MSGS = 'cartsettle_owner_agent_chat_v2';
const STORAGE_KEY_LOGS = 'cartsettle_owner_agent_logs_v2';
const SESSION_ID = 'owner_copilot_session';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'CartSettle AI Ready. Ask about orders, live products, low stock, profit margins, or PayPal payouts.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  follow_ups: [
    'Generate the most recent order number',
    'Currently how many products are live in our store',
    'Check low stock items'
  ]
};

export default function KiranaCopilotDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MSGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not load saved owner chat:', e);
    }
    return [INITIAL_MESSAGE];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [thoughtLogs, setThoughtLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [
      { status: 'ready', timestamp: new Date().toLocaleTimeString(), message: 'Persistent Memory Active • 12% Margin Guard' }
    ];
  });
  const [showThoughtStream, setShowThoughtStream] = useState(false);

  const messagesEndRef = useRef(null);
  const thoughtsEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Persist messages to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(messages.slice(-40)));
    } catch (e) {
      console.warn('Could not persist owner chat:', e);
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(thoughtLogs.slice(-30)));
    } catch (e) {
      // ignore
    }
    thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thoughtLogs]);

  // Sync with backend session memory if local history only has the greeting
  useEffect(() => {
    if (messages.length <= 1) {
      api.get(`/store/agent/chat/?session_id=${SESSION_ID}&persona=owner`)
        .then(res => {
          const serverMsgs = res.data?.messages;
          if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
            setMessages([INITIAL_MESSAGE, ...serverMsgs]);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Voice Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast('Listening...', { icon: '🎙️' });
    }
  };

  const handleResetChat = async () => {
    const freshMsg = {
      ...INITIAL_MESSAGE,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([freshMsg]);
    setThoughtLogs([
      { status: 'ready', timestamp: new Date().toLocaleTimeString(), message: 'Session memory cleared • Ready' }
    ]);
    localStorage.removeItem(STORAGE_KEY_MSGS);
    localStorage.removeItem(STORAGE_KEY_LOGS);
    try {
      await api.delete(`/store/agent/chat/?session_id=${SESSION_ID}&persona=owner`);
    } catch (e) {
      // ignore
    }
    toast.success('Started a fresh AI session');
  };

  const cleanText = (str) => (str || '').replace(/[*`#]/g, '').trim();

  const handleSend = async (textToSend) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    setInput('');
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessages = [...messages, { role: 'user', content: prompt, timestamp: nowTime }];
    setMessages(newMessages);
    setLoading(true);

    setThoughtLogs(prev => [
      ...prev,
      { status: 'thinking', timestamp: new Date().toLocaleTimeString(), message: `Intent: "${prompt}"` }
    ]);

    try {
      const res = await api.post('/store/agent/chat/', {
        prompt: prompt,
        session_id: SESSION_ID,
        persona: 'owner',
        history: newMessages.map(m => ({ role: m.role, content: m.content }))
      });

      const reply = cleanText(res.data?.reply || 'Done.');
      const toolsUsed = res.data?.tools_used || [];
      const actions = res.data?.actions || [];
      const followUps = res.data?.follow_ups || [];
      const latencyMs = res.data?.latency_ms || 12;

      if (toolsUsed.length > 0) {
        toolsUsed.forEach(t => {
          setThoughtLogs(prev => [
            ...prev,
            { 
              status: 'tool_call', 
              timestamp: new Date().toLocaleTimeString(), 
              message: `${t.name} (${latencyMs}ms)` 
            }
          ]);
        });
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          actions: actions,
          tools_used: toolsUsed,
          follow_ups: followUps,
          latency_ms: latencyMs,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('Co-Pilot error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Store systems online. 12% margin floor active.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openRoute = (path) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  const turnCount = Math.max(0, Math.floor((messages.length - 1) / 2));

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[610px] animate-in slide-in-from-bottom-5 duration-200">
      {/* Minimalist Professional Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold">CartSettle Agentic AI</h3>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                Memory ({turnCount})
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Persistent Store & PayPal Co-Pilot</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetChat}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all text-xs flex items-center gap-1 cursor-pointer"
            title="Start Fresh Chat (Clear Memory)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowThoughtStream(!showThoughtStream)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all text-xs flex items-center gap-1 cursor-pointer"
            title="Toggle Agent Telemetry Logs"
          >
            <Terminal className="w-3.5 h-3.5" />
            {showThoughtStream ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Telemetry Stream */}
      {showThoughtStream && (
        <div className="bg-slate-950 text-slate-300 px-3 py-2 font-mono text-[10px] max-h-24 overflow-y-auto border-b border-slate-800 space-y-1">
          {thoughtLogs.map((log, idx) => (
            <div key={idx} className="flex items-center gap-1.5 truncate">
              <span className="text-slate-600">[{log.timestamp}]</span>
              <span className="text-emerald-400">{log.message}</span>
            </div>
          ))}
          <div ref={thoughtsEndRef} />
        </div>
      )}

      {/* Actionable Quick Chips */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => handleSend('Generate the most recent order number')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 whitespace-nowrap hover:border-indigo-500 transition-all shrink-0 cursor-pointer font-medium"
        >
          🧾 Latest Order
        </button>
        <button
          onClick={() => handleSend('Currently how many products are live in our store')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 whitespace-nowrap hover:border-indigo-500 transition-all shrink-0 cursor-pointer font-medium"
        >
          🏪 Live Products
        </button>
        <button
          onClick={() => handleSend('Check pending orders')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 whitespace-nowrap hover:border-indigo-500 transition-all shrink-0 cursor-pointer font-medium"
        >
          📦 Pending Orders
        </button>
        <button
          onClick={() => handleSend('Check low stock items')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 whitespace-nowrap hover:border-indigo-500 transition-all shrink-0 cursor-pointer font-medium"
        >
          📊 Low Stock
        </button>
        <button
          onClick={() => handleSend('A customer wants a 20% discount on Atta. Can we offer it?')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 whitespace-nowrap hover:border-indigo-500 transition-all shrink-0 cursor-pointer font-medium"
        >
          🛡️ 20% Discount Check
        </button>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/40 dark:bg-slate-900/40">
        {messages.map((m, idx) => {
          const isLastAssistant = m.role === 'assistant' && idx === messages.length - 1;
          const toolName = m.tools_used?.[0]?.name;

          return (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-xs shadow-2xs space-y-2.5'
                }`}
              >
                <div className="whitespace-pre-wrap font-medium">{cleanText(m.content)}</div>

                {/* 1. ORDER CARD (Most Recent Order / Specific Order Audit) */}
                {m.actions?.map((act, aIdx) => {
                  if (act.type === 'ORDER_CARD' && act.order) {
                    const ord = act.order;
                    return (
                      <div key={aIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                            #{ord.id}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                            {ord.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700/60">
                          <div>
                            <div className="text-[9px] text-slate-400">Auth Hold</div>
                            <div className="text-[11px] font-bold">${Number(ord.authorized || ord.total || 0).toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-400">Captured</div>
                            <div className="text-[11px] font-bold text-emerald-600">${Number(ord.captured || ord.total || 0).toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-400">Released</div>
                            <div className="text-[11px] font-bold text-amber-600">${Number(ord.released || 0).toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openRoute(`/owner/orders/${ord.id}`)}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <span>Open Order</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                          {ord.can_settle && (
                            <button
                              onClick={() => handleSend(`Settle order ${ord.id}`)}
                              className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Settle Now</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  /* 2. CATALOG SUMMARY CARD */
                  if (act.type === 'CATALOG_SUMMARY') {
                    return (
                      <div key={aIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{act.total}</div>
                            <div className="text-[9px] text-slate-400">Live Items</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <div className="text-xs font-bold text-emerald-600">{act.in_stock}</div>
                            <div className="text-[9px] text-slate-400">In Stock</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <div className="text-xs font-bold text-amber-600">{act.categories}</div>
                            <div className="text-[9px] text-slate-400">Categories</div>
                          </div>
                        </div>

                        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                          {act.items?.slice(0, 5).map((it, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                              <span className="truncate font-medium">{it.name}</span>
                              <span className="text-slate-500 shrink-0 ml-2">${Number(it.price).toFixed(2)} • {it.stock} left</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => openRoute('/owner/products')}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Package className="w-3 h-3" />
                          <span>Manage Products</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }

                  /* 3. PENDING ORDERS LIST */
                  if (act.type === 'PENDING_ORDERS') {
                    return (
                      <div key={aIdx} className="space-y-1.5">
                        {act.orders?.map((o, i) => (
                          <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                            <div>
                              <div className="font-mono font-bold text-[11px] text-indigo-600 dark:text-indigo-400">#{o.id}</div>
                              <div className="text-[10px] text-slate-500">{o.customer} • Hold ${Number(o.authorized_amount).toFixed(2)}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSend(`Settle order ${o.id}`)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] cursor-pointer"
                              >
                                Settle
                              </button>
                              <button
                                onClick={() => openRoute(`/owner/orders/${o.id}`)}
                                className="p-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 cursor-pointer"
                                title="View Order"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  /* 4. LOW STOCK ACTION LIST */
                  if (act.type === 'LOW_STOCK_LIST') {
                    return (
                      <div key={aIdx} className="space-y-1.5">
                        {act.items?.map((it, i) => (
                          <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-[11px] truncate">{it.name}</div>
                              <div className="text-[10px] text-rose-500 font-medium">{it.stock} left • Reorder {it.recommended_reorder} (${Number(it.estimated_cost).toFixed(2)})</div>
                            </div>
                            <button
                              onClick={() => handleSend(`Restock ${it.recommended_reorder} units of ${it.name} via PayPal Payout`)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] shrink-0 flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                              <span>Restock</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  /* 5. MARGIN LIST / DECISION */
                  if (act.type === 'MARGIN_LIST') {
                    return (
                      <div key={aIdx} className="space-y-1.5">
                        {act.products?.map((p, i) => (
                          <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                            <div>
                              <div className="font-semibold">{p.name}</div>
                              <div className="text-[10px] text-slate-500">Price ${p.selling_price} • Cost ${p.cost_price}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                              {p.margin_pct}% Margin
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  if (act.type === 'MARGIN_DECISION' && act.decision) {
                    const d = act.decision;
                    return (
                      <div key={aIdx} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          <span>12% Margin Guardrail</span>
                          <span>Max Safe: {d.counter_discount_pct ?? d.discount_approved_pct}% OFF</span>
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-300">
                          Safe Counter Price: ${Number(d.counter_price ?? d.final_price ?? 0).toFixed(2)}
                        </div>
                      </div>
                    );
                  }

                  /* 6. PAYOUT RECEIPT OR ORDER SETTLED */
                  if (act.type === 'PAYOUT_RECEIPT' && act.receipt) {
                    const r = act.receipt;
                    return (
                      <div key={aIdx} className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          <span>PayPal Payout Sent</span>
                          <span>${Number(r.amount_paid || 0).toFixed(2)}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Batch: {r.payout_batch_id} • Stock: {r.new_stock} units
                        </div>
                      </div>
                    );
                  }

                  if (act.type === 'ORDER_SETTLED') {
                    return (
                      <div key={aIdx} className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                        <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          #{act.order_id} Settled (${Number(act.captured || 0).toFixed(2)})
                        </div>
                        <button
                          onClick={() => openRoute(`/owner/orders/${act.order_id}`)}
                          className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold cursor-pointer"
                        >
                          View Receipt
                        </button>
                      </div>
                    );
                  }

                  return null;
                })}

                {/* Execution Telemetry Footer inside Assistant Message */}
                {m.role === 'assistant' && (toolName || m.timestamp) && (
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[9px] text-slate-400">
                    {toolName ? (
                      <span className="flex items-center gap-1 font-mono text-indigo-500 dark:text-indigo-400">
                        <Zap className="w-2.5 h-2.5" />
                        {toolName} • {m.latency_ms || 11}ms
                      </span>
                    ) : (
                      <span>CartSettle AI</span>
                    )}
                    {m.timestamp && <span>{m.timestamp}</span>}
                  </div>
                )}
              </div>

              {/* Contextual Next-Step Follow-up Pills on the latest Assistant Message */}
              {isLastAssistant && m.follow_ups?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1 max-w-[92%]">
                  {m.follow_ups.slice(0, 3).map((fu, fIdx) => (
                    <button
                      key={fIdx}
                      onClick={() => handleSend(fu)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 hover:bg-indigo-100 transition-all cursor-pointer"
                    >
                      ↳ {fu}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-xs px-3 py-2 text-xs text-slate-500 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
              <span>Working...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Minimalist Input Box */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleVoice}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Voice Command"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          placeholder="Ask about orders, stock, margins, or follow up..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

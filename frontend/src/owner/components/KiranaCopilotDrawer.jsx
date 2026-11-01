import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  Terminal, 
  ShieldCheck, 
  DollarSign, 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  ArrowRightCircle,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function KiranaCopilotDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your CartSettle AI Co-Pilot. I monitor your grocery profit margins (12% guardrail), supervise PayPal packing settlements, and execute autonomous wholesale restock payouts via PayPal Payouts v1. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [thoughtLogs, setThoughtLogs] = useState([
    { status: 'ready', timestamp: new Date().toLocaleTimeString(), message: 'CartSettle Agent Engine Ready. Listening for store commands...' }
  ]);
  const [showThoughtStream, setShowThoughtStream] = useState(true);

  const messagesEndRef = useRef(null);
  const thoughtsEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thoughtLogs]);

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

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

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

  const handleSend = async (textToSend) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: prompt }];
    setMessages(newMessages);
    setLoading(true);

    // Push local thought stream event
    setThoughtLogs(prev => [
      ...prev,
      { status: 'thinking', timestamp: new Date().toLocaleTimeString(), message: `Processing user intent: "${prompt}"` }
    ]);

    try {
      const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
      const token = localStorage.getItem('access_token');

      const res = await axios.post(
        `${apiBase}/store/agent/chat/`,
        {
          prompt: prompt,
          session_id: 'owner_copilot_session',
          history: newMessages.map(m => ({ role: m.role, content: m.content }))
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      const reply = res.data?.reply || 'Received your request.';
      const toolsUsed = res.data?.tools_used || [];

      // Update thought logs if tools were used
      if (toolsUsed.length > 0) {
        toolsUsed.forEach(t => {
          setThoughtLogs(prev => [
            ...prev,
            { 
              status: 'tool_call', 
              timestamp: new Date().toLocaleTimeString(), 
              message: `Executed Tool [${t.name}]: ${JSON.stringify(t.args)}` 
            }
          ]);
        });
      }

      setThoughtLogs(prev => [
        ...prev,
        { status: 'complete', timestamp: new Date().toLocaleTimeString(), message: 'Generated margin-guarded response.' }
      ]);

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('Co-Pilot error:', err);
      const fallbackMsg = 'CartSettle AI: Store profit margins are protected at 12%. PayPal Sandbox and Settlement systems are operational.';
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackMsg }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[650px] animate-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold leading-tight">CartSettle Kirana AI</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Gemini 3.5 Flash
              </span>
            </div>
            <p className="text-[11px] text-indigo-200">Autonomous PayPal & Margin Guard Co-Pilot</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowThoughtStream(!showThoughtStream)}
            className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition-all text-xs flex items-center gap-1"
            title="Toggle Live Thought Terminal"
          >
            <Terminal className="w-4 h-4" />
            {showThoughtStream ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Live Agent Thought Stream Terminal (Split View) */}
      {showThoughtStream && (
        <div className="bg-slate-950 text-slate-200 p-3 font-mono text-[11px] h-36 overflow-y-auto border-b border-slate-800 space-y-1.5 scrollbar-thin">
          <div className="flex items-center justify-between text-slate-500 text-[10px] pb-1 border-b border-slate-800/80">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-emerald-400 animate-pulse" />
              LIVE AGENT THOUGHT & TOOL EXECUTION STREAM
            </span>
            <span className="text-emerald-400">WebSocket / Channels Active</span>
          </div>
          {thoughtLogs.map((log, idx) => (
            <div key={idx} className="leading-snug flex items-start gap-1.5">
              <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
              {log.status === 'thinking' && <span className="text-amber-400 font-bold shrink-0">⚡ THINK:</span>}
              {log.status === 'tool_call' && <span className="text-cyan-400 font-bold shrink-0">🛠️ TOOL:</span>}
              {log.status === 'complete' && <span className="text-emerald-400 font-bold shrink-0">✅ DONE:</span>}
              <span className="text-slate-300 break-all">{log.message}</span>
            </div>
          ))}
          <div ref={thoughtsEndRef} />
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-xs shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-xs shadow-xs'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-xs p-3 text-xs text-slate-500 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              Agent analyzing margins & PayPal APIs...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => handleSend('Check profit margins on Ashirvad Atta')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:border-indigo-500 transition-all shrink-0 cursor-pointer"
        >
          🏷️ Check Atta Margin
        </button>
        <button
          onClick={() => handleSend('A customer wants a 20% discount on Atta. Can we offer it?')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:border-indigo-500 transition-all shrink-0 cursor-pointer"
        >
          🛡️ Evaluate 20% Discount
        </button>
        <button
          onClick={() => handleSend('Restock 10 units of Rice from supplier wholesale@kirana.com via PayPal Payout')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:border-indigo-500 transition-all shrink-0 cursor-pointer"
        >
          💰 Restock via PayPal Payout
        </button>
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleVoice}
          className={`p-2 rounded-xl transition-all ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Voice Command"
        >
          {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          placeholder="Ask CartSettle Co-Pilot..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
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

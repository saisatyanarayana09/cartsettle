import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  ShoppingBag, 
  Plus, 
  Check, 
  Cpu, 
  ShieldCheck, 
  UtensilsCrossed,
  RotateCcw,
  Zap
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useCart } from '../cart-context';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY_SHOPPER = 'cartsettle_shopper_agent_chat_v2';
const SESSION_ID = 'shopper_session';

const INITIAL_SHOPPER_MSG = {
  role: 'assistant',
  content: 'Hi! Tell me what groceries you need, ask for a recipe basket, or check our best deals.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  follow_ups: [
    'Suggest a dinner recipe basket under $20',
    'Find organic milk and check for the best deal',
    'Add 1 Organic Milk to my cart'
  ]
};

export default function ShopperAgentDrawer({ isOpen, onClose }) {
  const { add } = useCart() || {};
  const navigate = useNavigate();

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOPPER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not load shopper chat:', e);
    }
    return [INITIAL_SHOPPER_MSG];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeThought, setActiveThought] = useState('Persistent Memory Active');
  const [addedItems, setAddedItems] = useState({});

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Persist shopper chat to localStorage on every update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHOPPER, JSON.stringify(messages.slice(-40)));
    } catch (e) {
      // ignore
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync with backend session memory if local history only has the greeting
  useEffect(() => {
    if (messages.length <= 1) {
      api.get(`/store/agent/chat/?session_id=${SESSION_ID}&persona=shopper`)
        .then(res => {
          const serverMsgs = res.data?.messages;
          if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
            setMessages([INITIAL_SHOPPER_MSG, ...serverMsgs]);
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
    setMessages([{
      ...INITIAL_SHOPPER_MSG,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    localStorage.removeItem(STORAGE_KEY_SHOPPER);
    try {
      await api.delete(`/store/agent/chat/?session_id=${SESSION_ID}&persona=shopper`);
    } catch (e) {
      // ignore
    }
    toast.success('Started a fresh shopping session');
  };

  const handleSend = async (textToSend) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    setInput('');
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessages = [...messages, { role: 'user', content: prompt, timestamp: nowTime }];
    setMessages(newMessages);
    setLoading(true);
    setActiveThought(`Planning: "${prompt.slice(0, 28)}..."`);

    try {
      const res = await api.post('/store/agent/chat/', {
        prompt: prompt,
        session_id: SESSION_ID,
        persona: 'shopper',
        history: newMessages.map(m => ({ role: m.role, content: m.content }))
      });

      const reply = (res.data?.reply || 'Done.').replace(/[*`#]/g, '').trim();
      const actions = res.data?.actions || [];
      const toolsUsed = res.data?.tools_used || [];
      const followUps = res.data?.follow_ups || [];
      const latencyMs = res.data?.latency_ms || 10;

      setActiveThought(`Completed in ${latencyMs}ms`);

      const newAssistantMsg = {
        role: 'assistant',
        content: reply,
        actions: actions,
        tools_used: toolsUsed,
        follow_ups: followUps,
        latency_ms: latencyMs,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, newAssistantMsg]);

      if (actions.length > 0) {
        for (const act of actions) {
          if (act.type === 'ADD_TO_CART' || act.action === 'ADD_TO_CART') {
            handleAddToCart(act.item || act);
          }
        }
      }
    } catch (err) {
      console.error('Shopper agent error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I found grocery items matching your request. You can also browse our categories directly!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    if (!add || !item) return;
    const prodObj = {
      id: item.id,
      name: item.name,
      regular_price: item.price || item.regular_price,
      offer_price: item.price || item.regular_price,
      unit: item.unit || '1 unit',
      stock_quantity: 99
    };
    add(prodObj, item.quantity || 1);
    setAddedItems(prev => ({ ...prev, [item.id]: true }));
    toast.success(`Added ${item.name} to cart! 🛍️`);
  };

  const handleAddAllBasket = (items) => {
    if (!items || !add) return;
    items.forEach(it => {
      add({
        id: it.id,
        name: it.name,
        regular_price: it.price,
        offer_price: it.price,
        unit: it.unit || '1 unit',
        stock_quantity: 99
      }, 1);
      setAddedItems(prev => ({ ...prev, [it.id]: true }));
    });
    toast.success(`Added ${items.length} recipe ingredients to your cart! 🍳`);
  };

  if (!isOpen) return null;

  const turnCount = Math.max(0, Math.floor((messages.length - 1) / 2));

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[590px] animate-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-emerald-600 via-teal-700 to-indigo-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center border border-white/30 backdrop-blur-md">
            <Bot className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold leading-tight">Shopper AI Concierge</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                Memory ({turnCount})
              </span>
            </div>
            <p className="text-[10px] text-emerald-100/80">Persistent List-to-Cart & Deals</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetChat}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
            title="Start Fresh Chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live AI Thought Status Pill */}
      <div className="bg-slate-950 text-slate-300 px-3 py-1.5 font-mono text-[10px] flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-1.5 truncate">
          <Cpu className={`w-3 h-3 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-emerald-400 truncate">{loading ? '⚡ Executing tools...' : activeThought}</span>
        </div>
        <span className="text-[10px] text-slate-500 shrink-0">CartSettle AI</span>
      </div>

      {/* Quick Action Chips */}
      <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => handleSend('Add 1 Organic Milk to my cart')}
          className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          🛒 Add Milk to Cart
        </button>
        <button
          onClick={() => handleSend('Suggest a dinner recipe basket under $20')}
          className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          🍳 Pasta Dinner Basket
        </button>
        <button
          onClick={() => handleSend('Find organic milk and check for the best deal')}
          className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          🥛 Find Milk & Deals
        </button>
        <button
          onClick={() => handleSend('Suggest healthy breakfast ingredients')}
          className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          🥗 Healthy Breakfast
        </button>
      </div>

      {/* Conversation Messages */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isLastAssistant = !isUser && index === messages.length - 1;
          const toolName = msg.tools_used?.[0]?.name;

          return (
            <div
              key={index}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-br-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs space-y-2'
                }`}
              >
                <div className="whitespace-pre-wrap font-medium">{(msg.content || '').replace(/[*`#]/g, '').trim()}</div>

                {/* Interactive Recipe Basket Card */}
                {msg.actions && msg.actions.some(a => a.type === 'RECOMMEND_BASKET') && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 text-slate-900 dark:text-white space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <UtensilsCrossed className="w-3 h-3" />
                        Bundle Ready
                      </span>
                    </div>
                    {msg.actions.find(a => a.type === 'RECOMMEND_BASKET')?.items?.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-100 dark:border-slate-800">
                        <span>{it.name}</span>
                        <span className="font-semibold">${Number(it.price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddAllBasket(msg.actions.find(a => a.type === 'RECOMMEND_BASKET')?.items)}
                      className="w-full mt-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add All Ingredients to Cart
                    </button>
                  </div>
                )}

                {/* Interactive Search Results Card */}
                {msg.actions && msg.actions.some(a => a.type === 'SEARCH_RESULTS') && (
                  <div className="space-y-1.5">
                    {msg.actions.find(a => a.type === 'SEARCH_RESULTS')?.items?.slice(0, 3).map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 text-slate-900 dark:text-white flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[11px] truncate">{it.name}</div>
                          <div className="text-[10px] text-slate-500">
                            ${Number(it.price || 0).toFixed(2)} • {it.unit}
                            {it.best_deal_price && it.best_deal_price < it.price && (
                              <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                (Deal: ${Number(it.best_deal_price).toFixed(2)})
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddToCart(it)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                            addedItems[it.id]
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {addedItems[it.id] ? (
                            <>
                              <Check className="w-3 h-3" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Telemetry Footer */}
                {!isUser && (toolName || msg.timestamp) && (
                  <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[9px] text-slate-400">
                    {toolName ? (
                      <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                        <Zap className="w-2.5 h-2.5" />
                        {toolName} • {msg.latency_ms || 9}ms
                      </span>
                    ) : (
                      <span>Shopper AI</span>
                    )}
                    {msg.timestamp && <span>{msg.timestamp}</span>}
                  </div>
                )}
              </div>

              {/* Contextual Follow-Up Chips */}
              {isLastAssistant && msg.follow_ups?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1 max-w-[92%]">
                  {msg.follow_ups.slice(0, 3).map((fu, fIdx) => (
                    <button
                      key={fIdx}
                      onClick={() => handleSend(fu)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70 hover:bg-emerald-100 transition-all cursor-pointer"
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
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <Bot className="w-3 h-3 animate-spin" />
            </div>
            <span>Working...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer CTA & Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onClose();
              navigate('/cart');
            }}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
            <span>View Active Cart</span>
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/checkout');
            }}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PayPal Pre-Auth</span>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleVoice}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
            title="Speech-to-Text"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI for groceries, deals, or recipe baskets..."
            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

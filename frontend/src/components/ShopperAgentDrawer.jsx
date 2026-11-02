import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  ShoppingBag, 
  Plus, 
  Check, 
  ArrowRight, 
  Cpu, 
  ShieldCheck, 
  UtensilsCrossed 
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useCart } from '../cart-context';
import { useNavigate } from 'react-router-dom';

export default function ShopperAgentDrawer({ isOpen, onClose }) {
  const { add } = useCart() || {};
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I am your CartSettle Shopping Concierge 🛒✨. Tell me what you need, ask for recipe baskets, or ask me to find the best deals within your budget! How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeThought, setActiveThought] = useState('CartSettle AI Ready');
  const [addedItems, setAddedItems] = useState({});

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleSend = async (textToSend) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: prompt }];
    setMessages(newMessages);
    setLoading(true);
    setActiveThought(`Planning action for: "${prompt.slice(0, 30)}..."`);

    try {
      const res = await api.post('/store/agent/chat/', {
        prompt: prompt,
        session_id: 'shopper_session',
        persona: 'shopper',
        history: newMessages.map(m => ({ role: m.role, content: m.content }))
      });

      const reply = res.data?.reply || 'Received your request.';
      const actions = res.data?.actions || [];
      const toolResult = res.data?.tool_result;

      setActiveThought('Action completed');

      // Check for autonomous cart actions
      const newAssistantMsg = {
        role: 'assistant',
        content: reply,
        actions: actions,
        toolResult: toolResult
      };

      setMessages(prev => [...prev, newAssistantMsg]);

      // If single item add action returned
      if (res.data?.actions) {
        for (const act of res.data.actions) {
          if (act.action === 'ADD_TO_CART' || act.id) {
            handleAddToCart(act);
          }
        }
      }
    } catch (err) {
      console.error('Shopper agent error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I found grocery items matching your request. You can also browse our categories directly!'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    if (!add) return;
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

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[580px] animate-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-emerald-600 via-teal-700 to-indigo-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center border border-white/30 backdrop-blur-md">
            <Bot className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold leading-tight">Shopper AI Concierge</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                Autonomous
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/80">List-to-Cart & Margin-Safe Deals</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Live AI Thought Status Pill */}
      <div className="bg-slate-950 text-slate-300 px-3 py-1.5 font-mono text-[11px] flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-1.5 truncate">
          <Cpu className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-slate-400">STATUS:</span>
          <span className="text-emerald-400 truncate">{loading ? '⚡ Planning & executing tools...' : activeThought}</span>
        </div>
        <span className="text-[10px] text-slate-500 shrink-0">Gemini 3.5 Flash</span>
      </div>

      {/* Quick Action Chips */}
      <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => handleSend('Suggest a dinner recipe basket under $20')}
          className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          🍳 Pasta Dinner Basket
        </button>
        <button
          onClick={() => handleSend('Find organic milk and check for the best deal')}
          className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          🥛 Find Milk & Deals
        </button>
        <button
          onClick={() => handleSend('Suggest healthy breakfast ingredients')}
          className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          🥗 Healthy Breakfast
        </button>
      </div>

      {/* Conversation Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-br-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Interactive Recipe Basket Card */}
                {msg.actions && msg.actions.some(a => a.type === 'RECOMMEND_BASKET') && (
                  <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 text-slate-900 dark:text-white space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        Bundle Ready
                      </span>
                    </div>
                    {msg.actions.find(a => a.type === 'RECOMMEND_BASKET')?.items?.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-100 dark:border-slate-800">
                        <span>{it.name}</span>
                        <span className="font-semibold">${it.price?.toFixed(2)}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddAllBasket(msg.actions.find(a => a.type === 'RECOMMEND_BASKET')?.items)}
                      className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add All Ingredients to Cart
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <Bot className="w-3 h-3 animate-spin" />
            </div>
            <span>Shopper AI is inspecting store inventory...</span>
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
            placeholder="Ask AI to find groceries or build a recipe basket..."
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

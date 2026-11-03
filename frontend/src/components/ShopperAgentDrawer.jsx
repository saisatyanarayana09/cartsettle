import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Mic,
  MicOff,
  ShoppingBag,
  Plus,
  Check,
  UtensilsCrossed,
  Trash2,
  ArrowUp,
  ArrowUpRight,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useCart } from "../cart-context";
import { GroceryRow } from "./shopper/GroceryRow";
import { ShopperMark } from "./shopper/ShopperMark";
import { SHOPPER_HISTORY_KEY, loadShopperHistory } from "./shopper/history";

const STARTERS = [
  { label: "Find groceries", prompt: "Find organic milk and check for the best deal", icon: Search },
  { label: "Plan a meal", prompt: "Suggest a pasta dinner basket under $20", icon: UtensilsCrossed },
  { label: "Explore deals", prompt: "Can I get 15% off Fresh Strawberries?", icon: ShoppingBag },
];

const STORAGE_KEY_SHOPPER = SHOPPER_HISTORY_KEY;
const SESSION_ID = "shopper_session";

const INITIAL_SHOPPER_MSG = {
  role: "assistant",
  content: "What’s on your shopping list today?",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  follow_ups: [],
};

const cleanText = (text = "") =>
  String(text)
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^#+\s*/gm, "")
    .trim();

export default function ShopperAgentDrawer({ isOpen, onClose }) {
  const { add, clearCart, cart, storeSettings } = useCart() || {};
  const navigate = useNavigate();

  const [messages, setMessages] = useState(() =>
    loadShopperHistory(typeof window !== "undefined" ? localStorage : null, INITIAL_SHOPPER_MSG)
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [addedItems, setAddedItems] = useState({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [openToolIdx, setOpenToolIdx] = useState({});

  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const sendRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHOPPER, JSON.stringify(messages.slice(-40)));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length <= 1) {
      api
        .get(`/store/agent/chat/?session_id=${SESSION_ID}&persona=shopper`)
        .then((res) => {
          const serverMsgs = res.data?.messages;
          if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
            setMessages([
              INITIAL_SHOPPER_MSG,
              ...serverMsgs.map((m) => ({
                ...m,
                content: cleanText(m.content),
              })),
            ]);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        sendRef.current?.(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
    return () => recognitionRef.current?.abort();
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch {
        return;
      }
      setIsListening(true);
      toast("Listening...", { icon: "🎙️" });
    }
  };

  const clearShopperHistory = () => {
    setMessages([
      {
        ...INITIAL_SHOPPER_MSG,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setAddedItems({});
    localStorage.removeItem(STORAGE_KEY_SHOPPER);
    api.delete(`/store/agent/chat/?session_id=${SESSION_ID}&persona=shopper`).catch(() => {});
  };

  const handleResetChat = () => {
    clearShopperHistory();
    setConfirmClear(false);
    toast.success("Cleared previous conversation");
  };

  // Clicking 'X' deletes all previous conversations and closes the drawer
  const handleCloseAndClear = () => {
    recognitionRef.current?.abort();
    setIsListening(false);
    setConfirmClear(false);
    clearShopperHistory();
    onClose();
  };

  const handleAddToCart = (item) => {
    if (!add || !item) return;
    const prodObj = {
      id: item.id,
      name: item.name,
      regular_price: item.price || item.regular_price,
      offer_price: item.price || item.regular_price,
      unit: item.unit || "1 unit",
      image: item.image || item.thumbnail,
      stock_quantity: 99,
    };
    add(prodObj, item.quantity || 1);
    setAddedItems((prev) => ({ ...prev, [item.id]: true }));
    toast.success(`Added ${item.name} to cart! 🛍️`);
  };

  const handleAddAllBasket = (items) => {
    if (!items || !add) return;
    items.forEach((it) => {
      add(
        {
          id: it.id,
          name: it.name,
          regular_price: it.price,
          offer_price: it.price,
          unit: it.unit || "1 unit",
          stock_quantity: 99,
        },
        1
      );
      setAddedItems((prev) => ({ ...prev, [it.id]: true }));
    });
    toast.success(`Added ${items.length} recipe ingredients to your cart! 🍳`);
  };

  const handleSend = async (textToSend) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    setInput("");
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMessages = [...messages, { role: "user", content: prompt, timestamp: nowTime }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await api.post("/store/agent/chat/", {
        prompt,
        session_id: SESSION_ID,
        persona: "shopper",
        history: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      const reply = cleanText(res.data?.reply || "Done.");
      const actions = res.data?.actions || [];
      const toolsUsed = res.data?.tools_used || [];
      const followUps = res.data?.follow_ups || [];
      const latencyMs = res.data?.latency_ms || 10;

      const newAssistantMsg = {
        role: "assistant",
        content: reply,
        actions,
        tools_used: toolsUsed,
        follow_ups: followUps,
        latency_ms: latencyMs,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, newAssistantMsg]);

      if (actions.length > 0) {
        for (const act of actions) {
          if (act.type === "ADD_TO_CART" || act.action === "ADD_TO_CART") {
            handleAddToCart(act.item || act);
          } else if (act.type === "CLEAR_CART") {
            clearCart?.();
            toast.success("Cleared your shopping cart!");
          } else if (act.type === "NAVIGATE" && act.path) {
            navigate(act.path);
            toast.success(reply);
          }
        }
      }
    } catch (err) {
      console.error("Shopper agent error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn’t complete that request. Please try again.",
          error: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  sendRef.current = handleSend;

  if (!isOpen) return null;
  const isWelcome = messages.length === 1;
  const cartCount =
    cart?.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0;

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shopper-title"
      className="fixed inset-0 md:inset-auto md:right-6 md:bottom-6 z-50 md:w-[430px] md:h-[min(700px,calc(100dvh-48px))] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 md:border md:border-slate-200 dark:md:border-slate-800 md:rounded-xl shadow-2xl flex flex-col overflow-hidden outline-none"
    >
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <ShopperMark className="size-10 shrink-0" />
          <div className="min-w-0">
            <h2 id="shopper-title" className="text-base font-extrabold leading-snug">
              Shopper AI <span className="font-normal">Concierge</span>
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {storeSettings?.store_name || "Narendra Kirana"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            title="Clear conversation"
            disabled={loading || isWelcome}
            onClick={() => setConfirmClear(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            type="button"
            title="Close and clear conversation"
            onClick={handleCloseAndClear}
            className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {confirmClear && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-5 py-3 text-xs font-medium"
        >
          <span>Clear this conversation?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="px-2.5 py-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleResetChat}
              className="px-2.5 py-1 rounded-md bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Conversation Body */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {isWelcome && (
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
            <span className="h-px w-6 bg-emerald-600" />
            Your shopping companion
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          const actions = msg.actions || [];
          const groceryActions = actions.filter(
            (a) => a.type === "RECOMMEND_BASKET" || a.type === "SEARCH_RESULTS"
          );
          const marginActions = actions.filter((a) => a.type === "MARGIN_DECISION");

          return (
            <div
              key={index}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2`}
            >
              {!isUser && !isWelcome && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <ShopperMark className="size-5" />
                  <span>Shopper AI</span>
                  {msg.latency_ms && (
                    <span className="text-[10px] font-normal text-slate-400">
                      • {msg.latency_ms}ms
                    </span>
                  )}
                </div>
              )}

              <div
                className={`${
                  isUser
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-slate-900 dark:bg-emerald-600 text-white px-4 py-2.5 text-sm"
                    : isWelcome
                    ? "w-full text-2xl font-bold leading-snug text-slate-900 dark:text-white"
                    : "w-full text-sm leading-relaxed text-slate-800 dark:text-slate-100"
                }`}
              >
                {cleanText(msg.content)}
              </div>

              {isWelcome && (
                <div className="mt-3 flex w-full flex-col gap-2">
                  {STARTERS.map(({ label, prompt, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      disabled={loading}
                      onClick={() => handleSend(prompt)}
                      className="flex h-12 w-full items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 px-4 text-sm font-medium transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="size-4 text-emerald-600" />
                        {label}
                      </span>
                      <ArrowUpRight className="size-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}

              {/* Grocery Basket / Search Results Cards */}
              {groceryActions.map((action, actionIndex) => (
                <div
                  key={actionIndex}
                  className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3"
                >
                  {action.type === "RECOMMEND_BASKET" && (
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      <UtensilsCrossed className="size-3.5" />
                      {action.recipe || "Meal ingredients"}
                    </h3>
                  )}
                  <div className="divide-y divide-slate-200 dark:divide-slate-700/60">
                    {(action.items || []).map((item, rowIndex) => (
                      <GroceryRow
                        key={item.id || rowIndex}
                        item={item}
                        currency="USD"
                        added={addedItems[item.id]}
                        onAdd={handleAddToCart}
                      />
                    ))}
                  </div>
                  {action.type === "RECOMMEND_BASKET" && (
                    <button
                      type="button"
                      onClick={() => handleAddAllBasket(action.items)}
                      className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      Add all ingredients
                    </button>
                  )}
                </div>
              ))}

              {/* Margin Negotiation Decision Card */}
              {marginActions.map((act, mIdx) => {
                const d = act.decision || {};
                const approved = d.status === "APPROVED";
                const dealPrice = approved ? d.final_price : d.counter_price;
                return (
                  <div
                    key={mIdx}
                    className={`w-full rounded-lg border p-3 ${
                      approved
                        ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30"
                        : "border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{d.product}</span>
                      <span className={approved ? "text-emerald-700" : "text-amber-700"}>
                        {approved
                          ? `${d.discount_approved_pct}% OFF APPROVED`
                          : `MAX DEAL: ${d.counter_discount_pct}% OFF`}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        Deal Price:{" "}
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          ${Number(dealPrice || 0).toFixed(2)}
                        </span>{" "}
                        <span className="line-through text-slate-400">
                          ${Number(d.original_price || 0).toFixed(2)}
                        </span>
                      </div>
                      {d.item && (
                        <button
                          type="button"
                          onClick={() => handleAddToCart({ ...d.item, price: dealPrice })}
                          className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                        >
                          Add Deal to Cart
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Expandable Tool Telemetry */}
              {!isUser &&
                msg.tools_used?.map((tool, toolIndex) => {
                  const tKey = `${index}-${toolIndex}`;
                  const isOpenTool = !!openToolIdx[tKey];
                  return (
                    <div
                      key={toolIndex}
                      className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenToolIdx((p) => ({ ...p, [tKey]: !p[tKey] }))
                        }
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="size-3 text-emerald-600" />
                          Tool: {tool.name || "shopping_agent"}
                        </span>
                        {isOpenTool ? (
                          <ChevronUp className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        )}
                      </button>
                      {isOpenTool && (
                        <pre className="border-t border-slate-200 dark:border-slate-800 px-3 py-2 text-[10px] text-slate-500 overflow-x-auto">
                          {JSON.stringify(tool.args || {}, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}

              {/* Follow-up suggestions */}
              {!isWelcome &&
                !isUser &&
                index === messages.length - 1 &&
                !loading &&
                msg.follow_ups?.length > 0 && (
                  <div className="flex flex-col items-start gap-1 pt-1">
                    {msg.follow_ups.slice(0, 2).map((followUp, fIndex) => (
                      <button
                        key={fIndex}
                        type="button"
                        onClick={() => handleSend(followUp)}
                        className="flex items-center gap-1.5 text-left text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        <ArrowUpRight className="size-3.5 shrink-0" />
                        {followUp}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          );
        })}

        {loading && (
          <div role="status" className="flex items-center gap-2 text-sm text-slate-500">
            <ShopperMark className="size-6 animate-pulse" />
            <span>Thinking…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4">
        <button
          type="button"
          onClick={() => {
            navigate("/cart");
          }}
          className="mb-2 flex h-9 w-full items-center justify-between rounded-lg px-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-emerald-600" />
            View cart
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            {cartCount > 0 && (
              <span>
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </span>
            )}
            <ArrowUpRight className="size-3.5" />
          </span>
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
        >
          <input
            type="text"
            aria-label="Message Shopper AI"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What do you need today?"
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
          />
          <button
            type="button"
            onClick={toggleVoice}
            disabled={loading}
            title={isListening ? "Stop listening" : "Use voice input"}
            className={`p-2 rounded-lg cursor-pointer ${
              isListening
                ? "text-rose-600 bg-rose-50"
                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-colors cursor-pointer"
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
      </footer>
    </section>
  );
}

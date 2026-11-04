import React, { useState, useEffect, useRef } from "react";
import { X, ShoppingBag, Plus, UtensilsCrossed, ArrowUp, ArrowUpRight, Search } from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useCart } from "../cart-context";
import { useNavigate } from "../router";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { GroceryRow } from "./shopper/GroceryRow";
import { SHOPPER_HISTORY_KEY, loadShopperHistory } from "./shopper/history";
import { useVoiceSession } from "./voice/useVoiceSession";
import { ModeSwitch, PanelMenu, VoiceView } from "./voice/VoiceView";
import { ActionCards } from "./voice/ActionCards";

const STARTERS = [
  { label: "Find groceries", prompt: "Help me find groceries from the store", icon: Search },
  { label: "Plan a meal", prompt: "Suggest a dinner recipe basket", icon: UtensilsCrossed },
  { label: "Explore deals", prompt: "Show me grocery deals", icon: ShoppingBag },
];

function IconControl({ label, children, ...props }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const STORAGE_KEY_SHOPPER = SHOPPER_HISTORY_KEY;
const SESSION_ID = "shopper_session";

const INITIAL_SHOPPER_MSG = {
  role: "assistant",
  content: "What’s on your list?",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  follow_ups: [],
};

export default function ShopperAgentDrawer({ isOpen, onClose }) {
  const { add, clearCart, cart, storeSettings } = useCart() || {};
  const navigate = useNavigate();

  const [messages, setMessages] = useState(() => {
    return loadShopperHistory(localStorage, INITIAL_SHOPPER_MSG);
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("voice");
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) {
        setMode(e.detail);
        if (e.detail === "text") {
          setTimeout(() => {
            const textarea = panelRef.current?.querySelector("textarea");
            textarea?.focus();
          }, 100);
        }
      }
    };
    window.addEventListener("shopper-switch-mode", handler);
    return () => window.removeEventListener("shopper-switch-mode", handler);
  }, []);

  const requestRef = useRef(false);
  const [addedItems, setAddedItems] = useState({});

  const [isFullScreen, setIsFullScreen] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY.current - touchEndY;
    // Swipe Up > 50px -> expand to full screen
    if (deltaY > 50 && !isFullScreen) {
      setIsFullScreen(true);
    }
    // Swipe Down > 50px -> collapse to 75% or close
    if (deltaY < -50) {
      if (isFullScreen) {
        setIsFullScreen(false);
      } else {
        close();
      }
    }
  };


  const panelRef = useRef(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Persist shopper chat to localStorage on every update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHOPPER, JSON.stringify(messages.slice(-40)));
    } catch (e) {
      // ignore
    }
  }, [messages]);

  // Sync with backend session memory if local history only has the greeting
  useEffect(() => {
    if (messages.length <= 1) {
      api
        .get(`/store/agent/chat/?session_id=${SESSION_ID}&persona=shopper`)
        .then((res) => {
          const serverMsgs = res.data?.messages;
          if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
            setMessages([INITIAL_SHOPPER_MSG, ...serverMsgs]);
          }
        })
        .catch(() => {});
    }
  }, []);

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

  const handleSend = async (textToSend, requestMode = mode) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || requestRef.current) return;
    requestRef.current = true;

    setInput("");
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMessages = [...messages, { role: "user", content: prompt, timestamp: nowTime }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await api.post("/store/agent/chat/", {
        prompt: prompt,
        session_id: SESSION_ID,
        persona: "shopper",
        ...(requestMode === "voice" ? { mode: "voice" } : {}),
        history: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      const reply = (res.data?.reply || "Done.").trim();
      const actions = res.data?.actions || [];
      const toolsUsed = res.data?.tools_used || [];
      const followUps = res.data?.follow_ups || [];
      const latencyMs = res.data?.latency_ms || 10;

      const newAssistantMsg = {
        role: "assistant",
        content: reply,
        actions: actions,
        tools_used: toolsUsed,
        follow_ups: followUps,
        latency_ms: latencyMs,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, newAssistantMsg]);

      if (actions.length > 0) {
        for (const act of actions) {
          const type = act.type || act.action;
          if (type === "ADD_TO_CART") {
            const items = act.items || (act.item ? [act.item] : [act]);
            items.filter((it) => it && it.id).forEach((it) => handleAddToCart(it));
          } else if (type === "CLEAR_CART") {
            clearCart?.();
            toast.success("Cleared your shopping cart!");
          } else if (type === "NAVIGATE" && act.path) {
            voice.stop();
            onClose();
            navigate(act.path);
          }
        }
      }
      return res.data;
    } catch (err) {
      console.error("Shopper agent error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Couldn’t complete that. Try again.",
          error: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      throw err;
    } finally {
      requestRef.current = false;
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
      unit: item.unit || "1 unit",
      image: item.image || item.thumbnail,
      stock_quantity: 99,
    };
    add(prodObj, item.quantity || 1);
    setAddedItems((prev) => ({ ...prev, [item.id]: true }));
    toast.success(`Added ${item.name}`);
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
        1,
      );
      setAddedItems((prev) => ({ ...prev, [it.id]: true }));
    });
    toast.success(`Added ${items.length} ingredients`);
  };

  const voice = useVoiceSession({
    active: isOpen && mode === "voice",
    onPrompt: (text) => handleSend(text, "voice"),
  });
  const changeMode = (next) => {
    voice.stop();
    setMode(next);
  };
  const latestReply = [...messages].reverse().find((message) => message.role === "assistant");

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        voice.stop();
        setConfirmClear(false);
        onClose();
      }
      if (event.key !== "Tab") return;
      const controls = panelRef.current?.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panelRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const close = () => {
    voice.stop();
    clearShopperHistory();
    setConfirmClear(false);
    onClose();
  };
  const isWelcome = messages.length === 1;

  return (
    <TooltipProvider delayDuration={250}>
      {/* Dimmed Background Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={close}
        aria-hidden="true"
      />

{/* 2-Stage Snap Sheet Modal on Mobile (75% to 100% Fullscreen on swipe-up), Side Drawer on Desktop */}
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shopper-title"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDownCapture={voice.interrupt}
        className={`shopper-theme bg-background text-foreground border-border fixed inset-x-0 bottom-0 z-50 flex flex-col ${
          isFullScreen ? "h-[100dvh] rounded-none" : "h-[75vh] max-h-[85vh] rounded-t-3xl"
        } border-t border-border shadow-[0_-12px_40px_rgba(0,0,0,0.3)] outline-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] md:inset-auto md:right-0 md:top-0 md:bottom-0 md:h-full md:w-[440px] md:rounded-none md:border-l md:border-t-0 md:animate-in md:slide-in-from-right overflow-hidden`}
      >
        {/* Mobile Top Drag Handle Indicator */}
        <div
          onClick={() => setIsFullScreen((prev) => !prev)}
          className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0 cursor-pointer hover:bg-slate-400 transition"
          title="Drag up for full screen"
        />

        {/* Top Header: Prominently displaying CartSettle brand (No close or mode buttons here!) */}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-5 py-3.5 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tighter">
              <span className="text-slate-800 dark:text-white">Cart</span>
              <span className="text-emerald-600 dark:text-emerald-400">Settle</span>
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              AI Assistant
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsFullScreen((prev) => !prev)}
            className="sm:hidden text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition"
          >
            {isFullScreen ? "Collapse" : "Full Screen"}
          </button>
        </header>
        {mode === "voice" ? (
          <VoiceView
            voice={voice}
            busy={loading}
            hint={isWelcome ? "Tap the orb and tell me what you need" : undefined}
          >
            <ActionCards
              key={messages.length}
              actions={latestReply?.actions}
              persona="shopper"
              currency={/\$\d/.test(latestReply?.content || "") ? "USD" : "INR"}
              onAdd={handleAddToCart}
              addedItems={addedItems}
              onSend={handleSend}
              onNavigate={(path) => {
                close();
                navigate(path);
              }}
              busy={loading}
            />
          </VoiceView>
        ) : (
          <Conversation className="min-h-0" initial="instant" resize="instant">
            <ConversationContent
              className={`gap-7 px-5 py-6 sm:px-6 ${isWelcome ? "shopper-welcome" : ""}`}
            >
              {isWelcome && (
                <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <span className="h-px w-6 bg-primary" />
                  Your shopping companion
                </div>
              )}
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                const actions = msg.actions || [];
                const groceryActions = actions.filter(
                  (a) => a.type === "RECOMMEND_BASKET" || a.type === "SEARCH_RESULTS",
                );
                return (
                  <Message
                    from={isUser ? "user" : "assistant"}
                    key={index}
                    className={isUser ? "max-w-[88%]" : "max-w-full"}
                  >
                    {!isUser && !isWelcome && (
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        Shopper
                      </div>
                    )}
                    <MessageContent
                      className={`w-full leading-relaxed ${isUser ? "shopper-user" : "bg-transparent"} ${isWelcome ? "text-2xl font-bold leading-snug" : "text-sm"}`}
                    >
                      <MessageResponse>{msg.content || ""}</MessageResponse>
                    </MessageContent>
                    {!isUser && /\$\d/.test(msg.content || "") && (
                      <p className="text-xs text-muted-foreground">
                        This reply contains dollar prices, not local ₹ prices.
                      </p>
                    )}
                    {isWelcome && (
                      <div className="mt-4 flex flex-col gap-2">
                        {STARTERS.map(({ label, prompt, icon: Icon }) => (
                          <Button
                            key={label}
                            variant="outline"
                            disabled={loading}
                            onClick={() => handleSend(prompt)}
                            className="h-12 w-full justify-between bg-background px-4 text-sm shadow-none"
                          >
                            <span className="flex items-center gap-3">
                              <Icon className="text-primary" />
                              {label}
                            </span>
                            <ArrowUpRight className="text-muted-foreground" />
                          </Button>
                        ))}
                      </div>
                    )}
                    {groceryActions.map((action, actionIndex) => (
                      <div key={actionIndex} className="mt-2 w-full">
                        {action.type === "RECOMMEND_BASKET" && (
                          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                            <UtensilsCrossed className="size-4 text-primary" />
                            {action.recipe || "Meal ingredients"}
                          </h3>
                        )}
                        <div className="divide-y divide-border">
                          {(action.items || []).map((item, rowIndex) => (
                            <GroceryRow
                              key={item.id || rowIndex}
                              item={item}
                              currency={/\$\d/.test(msg.content || "") ? "USD" : "INR"}
                              added={addedItems[item.id]}
                              onAdd={handleAddToCart}
                            />
                          ))}
                        </div>
                        {action.type === "RECOMMEND_BASKET" && (
                          <Button
                            variant="outline"
                            className="mt-3 w-full"
                            onClick={() => handleAddAllBasket(action.items)}
                          >
                            <Plus />
                            Add all ingredients
                          </Button>
                        )}
                      </div>
                    ))}
                    {!isWelcome &&
                      !isUser &&
                      index === messages.length - 1 &&
                      !loading &&
                      msg.follow_ups?.length > 0 && (
                        <div className="flex flex-col items-start gap-1">
                          {msg.follow_ups.slice(0, 2).map((followUp, fIndex) => (
                            <Button
                              key={fIndex}
                              variant="link"
                              className="h-auto max-w-full justify-start whitespace-normal px-0 py-1 text-left text-xs text-muted-foreground"
                              onClick={() => handleSend(followUp)}
                            >
                              <ArrowUpRight className="shrink-0" />
                              {followUp}
                            </Button>
                          ))}
                        </div>
                      )}
                  </Message>
                );
              })}
              {loading && (
                <div role="status" className="flex items-center gap-2 text-sm">
                  <Shimmer>One moment</Shimmer>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton aria-label="Scroll to latest message" />
          </Conversation>
        )}
        {mode === "chat" && (
          <footer className="shopper-footer shrink-0 border-t border-border bg-background px-4 pt-3">
            {mode === "chat" && (
              <PromptInput
                onSubmit={({ text }) => handleSend(text).catch(() => {})}
                className="shopper-composer"
              >
                <PromptInputTextarea
                  aria-label="Message Shopper"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="What do you need today?"
                  disabled={loading}
                  className="min-h-14 max-h-32 px-3 text-base"
                />
                <PromptInputFooter className="px-2 pb-2 pt-0">
                  <PromptInputSubmit
                    aria-label="Send message"
                    status={loading ? "submitted" : "ready"}
                    disabled={!input.trim() || loading}
                    className="size-10 shrink-0 rounded-md"
                  >
                    {!loading && <ArrowUp />}
                  </PromptInputSubmit>
                </PromptInputFooter>
              </PromptInput>
            )}
          </footer>
        )}
      
        {/* Built-In Bottom Toolbar with Keyboard Toggle & In-Place Close under thumb */}
        <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl px-3 py-2.5 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between z-10">
          <button
            type="button"
            onClick={() => {
              setMode((prev) => {
                const nextMode = prev === "voice" ? "chat" : "voice";
                if (nextMode === "chat") {
                  setTimeout(() => {
                    const textarea = panelRef.current?.querySelector("textarea");
                    textarea?.focus();
                  }, 120);
                }
                return nextMode;
              });
            }}
            className="flex items-center gap-2 h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all active:scale-95 cursor-pointer border border-slate-200/70 dark:border-slate-700/80 shadow-2xs"
          >
            {mode === "voice" ? (
              <>
                <Keyboard size={18} className="stroke-[2.25] text-emerald-600 dark:text-emerald-400" />
                <span>Keyboard</span>
              </>
            ) : (
              <>
                <Mic size={18} className="stroke-[2.25] text-emerald-600 dark:text-emerald-400" />
                <span>Voice Mode</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={close}
            className="flex items-center justify-center gap-2 h-11 w-[44%] max-w-[200px] rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-black text-xs shadow-lg active:scale-95 transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer border border-slate-700 dark:border-slate-300"
            aria-label="Close Assistant"
          >
            <X size={18} className="stroke-[2.5]" />
            <span>Close</span>
          </button>
        </div>
      </section>
    </TooltipProvider>
  );
}

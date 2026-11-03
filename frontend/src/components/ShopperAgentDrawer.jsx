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
  Package,
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useCart } from "../cart-context";
import { useNavigate } from "react-router-dom";
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
  PromptInputButton,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { GroceryRow } from "./shopper/GroceryRow";
import { ShopperMark } from "./shopper/ShopperMark";
import { SHOPPER_HISTORY_KEY, loadShopperHistory } from "./shopper/history";

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
  content: "Whatâ€™s on your shopping list today?",
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
  const [isListening, setIsListening] = useState(false);
  const [addedItems, setAddedItems] = useState({});

  const panelRef = useRef(null);
  const sendRef = useRef(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const recognitionRef = useRef(null);

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

  // Voice Recognition Setup
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
      toast("Listening...", { icon: "ðŸŽ™ï¸" });
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
        prompt: prompt,
        session_id: SESSION_ID,
        persona: "shopper",
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
          content: "I couldnâ€™t complete that request. Please try again.",
          error: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
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
      unit: item.unit || "1 unit",
      image: item.image || item.thumbnail,
      stock_quantity: 99,
    };
    add(prodObj, item.quantity || 1);
    setAddedItems((prev) => ({ ...prev, [item.id]: true }));
    toast.success(`Added ${item.name} to cart! ðŸ›ï¸`);
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
    toast.success(`Added ${items.length} recipe ingredients to your cart! ðŸ³`);
  };

  sendRef.current = handleSend;

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        recognitionRef.current?.abort();
        setIsListening(false);
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
    recognitionRef.current?.abort();
    setIsListening(false);
    setConfirmClear(false);
    clearShopperHistory();
    onClose();
  };
  const isWelcome = messages.length === 1;
  const cartCount =
    cart?.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0;

  return (
    <TooltipProvider delayDuration={250}>
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shopper-title"
        className="shopper-panel shopper-theme bg-background text-foreground border-border flex flex-col overflow-hidden outline-none"
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <ShopperMark className="size-10 shrink-0" />
            <div className="min-w-0">
              <h2 id="shopper-title" className="text-base font-extrabold leading-snug">
                Shopper AI <span className="font-normal">Concierge</span>
              </h2>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {storeSettings?.store_name || "Narendra Kirana"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <IconControl
              label="Clear conversation"
              disabled={loading || isWelcome}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 />
            </IconControl>
            <IconControl label="Close concierge" onClick={close}>
              <X />
            </IconControl>
          </div>
        </header>
        {confirmClear && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-5 py-3 text-sm"
          >
            <span>Clear this conversation?</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleResetChat}>
                Clear
              </Button>
            </div>
          </div>
        )}
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
                      <ShopperMark className="size-5" />
                      Shopper AI
                    </div>
                  )}
                  <MessageContent
                    className={`w-full leading-relaxed ${isUser ? "shopper-user" : "bg-transparent"} ${isWelcome ? "text-2xl font-bold leading-snug" : "text-sm"}`}
                  >
                    <MessageResponse>{msg.content || ""}</MessageResponse>
                  </MessageContent>
                  {!isUser && /\$\d/.test(msg.content || "") && (
                    <p className="text-xs text-muted-foreground">
                      This reply contains dollar prices, not local â‚¹ prices.
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
                  {!isUser &&
                    msg.tools_used?.map((tool, toolIndex) => (
                      <Tool
                        key={toolIndex}
                        defaultOpen={false}
                        className="shopper-tool mb-0 border-border"
                      >
                        <ToolHeader
                          type="dynamic-tool"
                          toolName={tool.name || "Shopping request"}
                          title="Shopping details"
                          state={tool.error || msg.error ? "output-error" : "output-available"}
                          className="gap-2 p-2.5"
                        />
                        <ToolContent className="space-y-3 p-3">
                          <ToolInput input={tool.args || {}} />
                          <ToolOutput
                            output={tool.result || tool.output || "Request processed"}
                            errorText={tool.error}
                          />
                        </ToolContent>
                      </Tool>
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
                <ShopperMark className="size-6" />
                <Shimmer>Thinkingâ€¦</Shimmer>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton aria-label="Scroll to latest message" />
        </Conversation>
        <footer className="shopper-footer shrink-0 border-t border-border bg-background px-4 pt-3">
          <Button
            variant="ghost"
            className="mb-3 h-10 w-full justify-between text-sm"
            onClick={() => {
              close();
              navigate("/cart");
            }}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag />
              View cart
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              {cartCount > 0 && (
                <span>
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </span>
              )}
              <ArrowUpRight />
            </span>
          </Button>
          <PromptInput onSubmit={({ text }) => handleSend(text)} className="shopper-composer">
            <PromptInputTextarea
              aria-label="Message Shopper AI"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="What do you need today?"
              disabled={loading}
              className="min-h-14 max-h-32 px-3 text-base"
            />
            <PromptInputFooter className="px-2 pb-2 pt-0">
              <PromptInputButton
                aria-label={isListening ? "Stop voice input" : "Use voice input"}
                tooltip={isListening ? "Stop listening" : "Use voice input"}
                onClick={toggleVoice}
                className={`size-10 ${isListening ? "text-destructive" : "text-muted-foreground"}`}
                disabled={loading}
              >
                {isListening ? <MicOff /> : <Mic />}
              </PromptInputButton>
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
        </footer>
      </section>
    </TooltipProvider>
  );
}

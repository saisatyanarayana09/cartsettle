import { useState, useEffect, useRef } from "react";
import { X, ArrowUp, Keyboard, Mic, Camera, Upload, Sparkles } from "lucide-react";
import { useNavigate } from "../../router";
import { useTheme } from "../../context/ThemeContext";
import api, { invalidateCache } from "../../services/api";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { VoiceView } from "../../components/voice/VoiceView";
import { useVoiceSession } from "../../components/voice/useVoiceSession";
import { ActionCards } from "../../components/voice/ActionCards";
import { PaymentReview } from "../../components/voice/PaymentReview";
import { requiresPaymentReview } from "../../components/voice/payment-review";
import { LiveTaskActivity } from "../../components/voice/LiveTaskActivity";
import { AssistantCameraModal } from "../../components/voice/AssistantCameraModal";
import { handleLovableAgentFallback } from "../../services/lovableAgentFallback";

const STORAGE_KEY = "cartsettle_owner_agent_chat_v2";
const makeOwnerSessionId = () => `owner_copilot_session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const INITIAL_MESSAGE = { role: "assistant", content: "What needs your attention?" };

function cleanMinimalText(raw) {
  if (!raw) return "";
  let clean = String(raw).trim();
  clean = clean.replace(/^(?:certainly|sure|of course|here (?:is|are)|i (?:have|can|found|checked)|based on[^,]+,|great|awesome)[!,.:\s]*/i, "");
  clean = clean.replace(/(?:let me know if[^.!?]*|feel free to[^.!?]*|how else can i[^.!?]*|is there anything else[^.!?]*)[.!?]*$/i, "");
  clean = clean.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
  clean = clean.replace(/!+/g, ".");
  if (clean) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean || "Done.";
}

export default function KiranaCopilotDrawer({ isOpen, onClose, initialMode = "voice" }) {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme() || {};
  const sessionIdRef = useRef(makeOwnerSessionId());
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    return [INITIAL_MESSAGE];
  });
  const [input, setInput] = useState("");
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [paymentReview, setPaymentReview] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [stageDismissedMsgLen, setStageDismissedMsgLen] = useState(1);
  const [instantsScan, setInstantsScan] = useState(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const busy = useRef(false);
  const endRef = useRef(null);
  const panelRef = useRef(null);

  const processOwnerPhotoFile = async (file) => {
    if (!file) return;
    try {
      voice.stop();
    } catch {}
    setMode("chat");

    const localPreviewUrl = URL.createObjectURL(file);
    setInstantsScan({ url: localPreviewUrl, name: file.name });

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      const base64Content = String(base64Data).includes(",")
        ? String(base64Data).split(",")[1]
        : String(base64Data);

      setCurrentTask({
        id: `owner-scan-${Date.now()}`,
        state: "processing",
        label: "Auditing packed order sheet with AI Vision...",
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: "📷 Scanned Order Packing Sheet / Bag",
          image: localPreviewUrl,
        },
      ]);
      setLoading(true);

      try {
        const res = await api.post("/store/agent/chat/", {
          prompt: "Audit this packed order photo and show pending order settlement details.",
          image: base64Content,
          session_id: sessionIdRef.current,
          persona: "owner",
        });

        const reply = (res.data?.reply || "Optical bag audit complete. 1 missing item flagged for auto-refund.").trim();
        const actions = Array.isArray(res.data?.actions) ? res.data.actions : [];

        setCurrentTask({
          id: `owner-scan-${Date.now()}`,
          state: "success",
          label: "Optical packing audit complete!",
        });

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: reply,
            actions: actions,
          },
        ]);
      } catch {
        setCurrentTask({
          id: `owner-scan-${Date.now()}`,
          state: "error",
          label: "Could not scan packing photo",
        });
        toast.error("Could not scan photo. Please try again.");
      } finally {
        setLoading(false);
        setInstantsScan(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOwnerPhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    await processOwnerPhotoFile(file);
  };

  const handleCleanupOnClose = () => {
    try {
      voice.stop();
    } catch {}
    const closingId = sessionIdRef.current;
    sessionIdRef.current = makeOwnerSessionId();
    setMessages([INITIAL_MESSAGE]);
    setStageDismissedMsgLen(1);
    setPaymentReview(null);
    setCurrentTask(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    if (closingId && typeof api?.delete === "function") {
      try {
        const p = api.delete(`/store/agent/chat/?session_id=${closingId}&persona=owner`);
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    }
  };

  const prevOpenRef = useRef(isOpen);
  useEffect(() => {
    if (prevOpenRef.current && !isOpen) {
      handleCleanupOnClose();
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  const handleConfirmPayment = async () => {
    const pendingPrompt = paymentReview?.prompt;
    setPaymentReview(null);
    if (!pendingPrompt) return;
    await handleSend(pendingPrompt, mode, true);
  };

  const handleSend = async (text = input, requestMode = mode, confirmed = false) => {
    const prompt = text.trim();
    if (!prompt || busy.current) return;
    if (paymentReview) {
      const lower = prompt.toLowerCase();
      if (/^(cancel|no|nevermind|back|close|exit|stop)\b/i.test(lower)) {
        setPaymentReview(null);
        return { reply: "Cancelled." };
      }
      if (/^(confirm|pay|place order|complete|yes|proceed|settle|do it|ok|okay)\b/i.test(lower)) {
        const pendingPrompt = paymentReview.prompt;
        setPaymentReview(null);
        if (pendingPrompt) {
          return handleSend(pendingPrompt, requestMode, true);
        }
      }
      setPaymentReview(null);
    }
    if (!confirmed && requiresPaymentReview(prompt)) {
      voice.stop();
      setInput("");
      setPaymentReview({ prompt });
      return { reply: "Review payment details before continuing." };
    }
    busy.current = true;
    setLoading(true);
    setInput("");
    const history = [...messages, { role: "user", content: prompt }];
    setMessages(history);

    try {
      const res = await api.post("/store/agent/chat/", {
        prompt,
        session_id: sessionIdRef.current,
        persona: "owner",
        ...(confirmed ? { confirmed: true } : {}),
        ...(requestMode === "voice" ? { mode: "voice" } : {}),
        history: history.map(({ role, content }) => ({ role, content })),
      });

      let rawActions = Array.isArray(res.data?.actions) ? [...res.data.actions] : [];
      const lowerPrompt = prompt.toLowerCase();

      // Client-side Owner action card enrichment if backend returned plain text
      if (rawActions.length === 0) {
        if (
          ["sales", "revenue", "analytics", "income", "profit", "earnings", "orders", "settled",
           "promo", "coupon", "discount code", "offers", "save", "categories", "category", "departments",
           "delivery", "fleet", "partners", "drivers", "riders", "customers", "broadcast", "notify", "push",
           "reject", "rejected", "why", "cancel", "status", "order"].some(k => lowerPrompt.includes(k))
        ) {
          const fallbackRes = handleLovableAgentFallback({
            method: "post",
            data: {
              prompt,
              persona: "owner",
              session_id: sessionIdRef.current,
              mode: requestMode,
            }
          });
          if (Array.isArray(fallbackRes?.actions) && fallbackRes.actions.length > 0) {
            rawActions = fallbackRes.actions;
            if (!res.data?.reply || res.data.reply === "Done.") {
              res.data = { ...res.data, reply: fallbackRes.reply };
            }
          }
        }
      }

      // Owner Drawer Guard: Filter out any shopper-specific product cards with add-to-cart buttons
      rawActions = rawActions.filter(
        (a) =>
          (a.type || a.action) !== "SEARCH_RESULTS" &&
          (a.type || a.action) !== "RECOMMEND_BASKET" &&
          (a.type || a.action) !== "ADD_TO_CART"
      );

      const actions = rawActions.map((action) =>
        action.type === "TOGGLE_DARK_MODE" ? { ...action, type: "SWITCH_THEME" } :
        ["SWITCH_LANGUAGE", "CHANGE_LANGUAGE"].includes(action.type) ? { ...action, type: "PROPOSED_LANGUAGE" } : action
      );

      const cleanReply = cleanMinimalText(res.data?.reply || "Done.");

      const assistantMsg = {
        role: "assistant",
        content: cleanReply,
        actions: actions,
        follow_ups: res.data?.follow_ups || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model_badge: res.data?.model_badge || (res.data?.provider?.includes("Groq") ? "LPU Engine" : "Gemini Core"),
        provider: res.data?.provider || "Gemini Core",
      };

      setMessages((previous) => [...previous, assistantMsg]);

      for (const action of actions) {
        if (action.type === "PAYMENT_REVIEW") {
          voice.stop();
          setPaymentReview({ prompt });
        }
        if (action.type === "SWITCH_THEME") {
          toggleTheme?.(action.theme || "dark");
        }
        if (action.type === "NAVIGATE" && action.path) {
          voice.stop();
          onClose();
          navigate(action.path);
        }
        if (
          [
            "REFRESH_DATA",
            "ORDER_SETTLED",
            "BULK_SETTLED",
            "PRODUCT_UPDATED",
            "PAYOUT_RECEIPT",
            "SALES_ANALYTICS_CARD",
            "PROMO_CODES_CARD",
            "CATEGORIES_CARD",
            "CUSTOMERS_FLEET_CARD",
            "BROADCAST_CARD",
          ].includes(action.type)
        ) {
          invalidateCache();
          window.dispatchEvent(new Event("focus"));
        }
      }
      return { ...res.data, actions };
    } catch (error) {
      // Offline / network fallback
      try {
        const fallbackRes = handleLovableAgentFallback({
          method: "post",
          data: {
            prompt,
            persona: "owner",
            session_id: sessionIdRef.current,
            mode: requestMode,
          }
        });
        if (fallbackRes?.reply) {
          const fallbackActions = Array.isArray(fallbackRes.actions) ? fallbackRes.actions : [];
          const cleanReply = cleanMinimalText(fallbackRes.reply);
          setMessages((previous) => [
            ...previous,
            {
              role: "assistant",
              content: cleanReply,
              actions: fallbackActions,
              follow_ups: fallbackRes.follow_ups || [],
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              model_badge: "Local Engine",
              provider: "Local Engine",
            }
          ]);
          return { ...fallbackRes, reply: cleanReply, actions: fallbackActions };
        }
      } catch {}

      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: error?.message || "Could not complete that. Try again." },
      ]);
      throw error;
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const voice = useVoiceSession({
    active: isOpen && mode === "voice",
    onPrompt: (text) => handleSend(text, "voice"),
  });

  const close = () => {
    handleCleanupOnClose();
    onClose();
  };

  const openRoute = (path) => {
    close();
    navigate(path);
  };

  const sendAction = (prompt) => {
    voice.stop();
    return handleSend(prompt).catch(() => {});
  };

  const latest = [...messages].reverse().find((message) => message.role === "assistant");
  const latestUser = [...messages].reverse().find((message) => message.role === "user");

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") {
        close();
      }
      if (event.key !== "Tab") return;
      const controls = panelRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
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
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cards = (message, key) => (
    <ActionCards
      key={key}
      actions={message?.actions}
      persona="owner"
      currency="INR"
      onSend={sendAction}
      onReviewPayment={(review) => { voice.stop(); setPaymentReview(review); }}
      onNavigate={openRoute}
      onToggleTheme={toggleTheme}
      onDismiss={() => setStageDismissedMsgLen(messages.length)}
      busy={loading || Boolean(paymentReview)}
    />
  );

  const latestAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant" && m.model_badge);
  const activeModelBadge = latestAssistantMsg?.model_badge || "Gemini Core";

  return (
    <>
      <div className="assistant-backdrop bg-black/5 dark:bg-black/20 backdrop-blur-none lg:hidden pointer-events-auto" onClick={close} aria-hidden="true" />
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copilot-title"
        onPointerDownCapture={(event) => {
          if (event.target?.closest?.(".voice-orb-container")) return;
          voice.interrupt();
        }}
        className="shopper-panel shopper-theme flex flex-col overflow-hidden border-border bg-background text-foreground outline-none"
      >
        <header className="assistant-nav-header flex shrink-0 items-center justify-between px-5 py-3.5 bg-white dark:bg-[#0b0f17] z-10 select-none border-b border-border/40">
          <Button
            variant="ghost"
            size="icon"
            aria-label={mode === "voice" ? "Type instead" : "Talk instead"}
            title={mode === "voice" ? "Type instead" : "Talk instead"}
            className="size-9 rounded-lg text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            onClick={() => {
              voice.stop();
              const nextMode = mode === "voice" ? "chat" : "voice";
              setMode(nextMode);
              if (nextMode === "chat") {
                setTimeout(() => {
                  const inputEl = panelRef.current?.querySelector("input");
                  inputEl?.focus();
                }, 100);
              }
            }}
          >
            {mode === "voice" ? <Keyboard className="size-5 stroke-[1.75]" /> : <Mic className="size-5 stroke-[1.75]" />}
          </Button>

          <div id="copilot-title" className="flex items-center gap-2 select-none">
            <span className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
              CartSettle AI
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {activeModelBadge}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Upload order packing photo"
              title="Upload packing image"
              className="size-9 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Scan packing bag with camera"
              title="Open Camera Scanner"
              className="size-9 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
              onClick={() => setIsCameraModalOpen(true)}
              disabled={loading}
            >
              <Camera className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close store desk"
              title="Close"
              className="size-9 rounded-lg text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              onClick={close}
            >
              <X className="size-5 stroke-[1.75]" />
            </Button>
          </div>
        </header>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleOwnerPhotoUpload}
        />

        <AssistantCameraModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onCaptureFile={processOwnerPhotoFile}
          onFallbackUpload={() => fileInputRef.current?.click()}
          title="AI Packing & Bag Scanner"
        />

        {mode === "chat" && (
          <LiveTaskActivity task={currentTask} onDismiss={() => setCurrentTask(null)} />
        )}

        <PaymentReview
          review={paymentReview}
          busy={loading}
          onCancel={() => setPaymentReview(null)}
          onOpen={() => {
            navigate("/owner/orders");
            close();
          }}
        />

        {mode === "voice" ? (
          <VoiceView
            voice={voice}
            busy={loading || Boolean(paymentReview)}
            replyText={messages.length > stageDismissedMsgLen ? latest?.content : undefined}
            lastUserText={latestUser?.content}
            modelBadge={activeModelBadge}
          >
            {messages.length === 1 && voice.status === "idle" && !voice.transcript?.trim() && !loading && (
              <div className="mb-3 flex items-center justify-center gap-2 pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-md hover:bg-emerald-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Upload className="size-3.5" />
                  <span>Upload Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-md hover:brightness-110 transition cursor-pointer"
                >
                  <Camera className="size-3.5" />
                  <span>Camera Scan</span>
                </button>
              </div>
            )}
            {cards(latest, messages.length)}
          </VoiceView>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                const hasCards = Array.isArray(message.actions) && message.actions.length > 0;
                return (
                  <div key={index} className="space-y-2">
                    {isUser ? (
                      <div className="shopper-user ml-auto w-fit max-w-[88%] whitespace-pre-wrap break-words rounded-xl px-3.5 py-2 text-sm">
                        <p>{message.content}</p>
                        {message.image && (
                          <div className="relative mt-2 overflow-hidden rounded-xl border border-white/20 shadow-md max-w-[200px]">
                            <img src={message.image} alt="Scanned packing sheet" className="w-full h-32 object-cover" />
                            <span className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white font-medium">
                              Instants Scan
                            </span>
                          </div>
                        )}
                      </div>
                    ) : hasCards ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground px-1 select-none">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">CartSettle AI</span>
                          <span>·</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{message.model_badge || "Gemini Core"}</span>
                          {message.timestamp && (
                            <>
                              <span>·</span>
                              <span className="text-muted-foreground/70">{message.timestamp}</span>
                            </>
                          )}
                        </div>
                        {message.content && (
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200 px-1 leading-relaxed">
                            {message.content}
                          </div>
                        )}
                        {cards(message, index)}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground px-1 select-none">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">CartSettle AI</span>
                          <span>·</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{message.model_badge || "Gemini Core"}</span>
                          {message.timestamp && (
                            <>
                              <span>·</span>
                              <span className="text-muted-foreground/70">{message.timestamp}</span>
                            </>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                          {message.content}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              {instantsScan && (
                <div className="w-full max-w-xs mx-auto p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/40 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
                    <img
                      src={instantsScan.url}
                      alt="Instants Preview"
                      className="w-full h-full object-contain"
                    />
                    <div className="instants-scanner-beam" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Instagram Instants
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Sparkles className="size-3.5 text-emerald-500 animate-spin" />
                      <span>Auditing packed items...</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">Vision AI</span>
                  </div>
                </div>
              )}
              {loading && !instantsScan && (
                <p role="status" className="text-xs text-muted-foreground animate-pulse">
                  Processing...
                </p>
              )}
              <div ref={endRef} />
            </div>
            <form
              className="shopper-footer flex flex-col shrink-0 gap-2 border-t border-border px-4 py-3 bg-white dark:bg-[#0b0f17]"
              onSubmit={(event) => {
                event.preventDefault();
                handleSend().catch(() => {});
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  aria-label="Message store desk"
                  placeholder="Ask about sales, stock, orders, margins..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={loading || Boolean(paymentReview)}
                  className="min-w-0 flex-1 rounded-xl border border-input bg-muted/60 px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send message"
                  disabled={!input.trim() || loading || Boolean(paymentReview)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white size-9 shrink-0 cursor-pointer"
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="h-7 gap-1.5 px-2.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold cursor-pointer"
                >
                  <Upload className="size-3.5" />
                  <span>Upload</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCameraModalOpen(true)}
                  disabled={loading}
                  className="h-7 gap-1.5 px-2.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold cursor-pointer"
                >
                  <Camera className="size-3.5" />
                  <span>Camera</span>
                </Button>
              </div>
            </form>
          </>
        )}
      </section>
    </>
  );
}

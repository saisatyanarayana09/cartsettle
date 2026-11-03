import { useState, useEffect, useRef } from "react";
import { X, ArrowUp } from "lucide-react";
import { useNavigate } from "../../router";
import api, { invalidateCache } from "../../services/api";
import { Button } from "@/components/ui/button";
import { ModeSwitch, PanelMenu, VoiceView } from "../../components/voice/VoiceView";
import { useVoiceSession } from "../../components/voice/useVoiceSession";
import { ActionCards } from "../../components/voice/ActionCards";

const STORAGE_KEY = "cartsettle_owner_agent_chat_v2";
const SESSION_ID = "owner_copilot_session";
const INITIAL_MESSAGE = { role: "assistant", content: "What needs your attention?" };

export default function KiranaCopilotDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {
      /* Ignore unavailable storage. */
    }
    return [INITIAL_MESSAGE];
  });
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("voice");
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const busy = useRef(false);
  const endRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* Ignore unavailable storage. */
    }
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (messages.length <= 1)
      api
        .get(`/store/agent/chat/?session_id=${SESSION_ID}&persona=owner`)
        .then((res) => {
          if (res.data?.messages?.length) setMessages([INITIAL_MESSAGE, ...res.data.messages]);
        })
        .catch(() => {});
  }, []);

  const handleSend = async (text = input, requestMode = mode) => {
    const prompt = text.trim();
    if (!prompt || busy.current) return;
    busy.current = true;
    setLoading(true);
    setInput("");
    const history = [...messages, { role: "user", content: prompt }];
    setMessages(history);
    try {
      const res = await api.post("/store/agent/chat/", {
        prompt,
        session_id: SESSION_ID,
        persona: "owner",
        ...(requestMode === "voice" ? { mode: "voice" } : {}),
        history: history.map(({ role, content }) => ({ role, content })),
      });
      const data = res.data;
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply || "Done.",
          actions: data.actions || [],
          follow_ups: data.follow_ups || [],
        },
      ]);
      for (const action of data.actions || []) {
        if (action.type === "NAVIGATE" && action.path) {
          voice.stop();
          onClose();
          navigate(action.path);
        }
        if (
          ["REFRESH_DATA", "ORDER_SETTLED", "PRODUCT_UPDATED", "PAYOUT_RECEIPT"].includes(
            action.type,
          )
        ) {
          invalidateCache();
          window.dispatchEvent(new Event("focus"));
        }
      }
      return data;
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: "Couldn’t complete that. Try again." },
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
    voice.stop();
    setConfirmClear(false);
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
  const clear = () => {
    voice.stop();
    setMessages([INITIAL_MESSAGE]);
    setConfirmClear(false);
    localStorage.removeItem(STORAGE_KEY);
    api.delete(`/store/agent/chat/?session_id=${SESSION_ID}&persona=owner`).catch(() => {});
  };
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") {
        voice.stop();
        onClose();
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
      currency={/\$\d/.test(message?.content || "") ? "USD" : "INR"}
      onSend={sendAction}
      onNavigate={openRoute}
      busy={loading}
    />
  );
  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="copilot-title"
      onPointerDownCapture={voice.interrupt}
      className="shopper-panel shopper-theme flex flex-col overflow-hidden border-border bg-background text-foreground outline-none"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-4">
        <h2 id="copilot-title" className="min-w-0 text-base font-bold">
          Store desk
        </h2>
        <div className="flex shrink-0 items-center gap-0.5">
          <ModeSwitch
            mode={mode}
            onChange={(next) => {
              voice.stop();
              setMode(next);
            }}
          />
          <PanelMenu
            disabled={loading || messages.length === 1}
            onClear={() => setConfirmClear(true)}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close store desk"
            title="Close"
            onClick={close}
          >
            <X />
          </Button>
        </div>
      </header>
      {confirmClear && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted px-4 py-3 text-sm">
          <span>Clear this conversation?</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={clear}>
              Clear
            </Button>
          </div>
        </div>
      )}
      {mode === "voice" ? (
        <VoiceView voice={voice} busy={loading}>
          {cards(latest, messages.length)}
        </VoiceView>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6">
            {messages.map((message, index) => (
              <div key={index} className="space-y-3">
                <p
                  className={
                    message.role === "user"
                      ? "shopper-user ml-auto w-fit max-w-[88%] whitespace-pre-wrap break-words rounded-md px-3 py-2 text-sm"
                      : "whitespace-pre-wrap break-words text-sm leading-relaxed"
                  }
                >
                  {message.content}
                </p>
                {message.role !== "user" && cards(message, index)}
                {index === messages.length - 1 && message.role === "assistant" && !loading && (
                  <div className="flex flex-col items-start gap-1">
                    {(message.follow_ups || []).slice(0, 2).map((prompt) => (
                      <Button
                        key={prompt}
                        variant="link"
                        className="h-auto whitespace-normal px-0 text-left text-xs text-muted-foreground"
                        onClick={() => sendAction(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2">
                {["Latest order", "Pending orders", "Low stock"].map((label) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => sendAction(`Show ${label.toLowerCase()}`)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
            {loading && (
              <p role="status" className="text-sm text-muted-foreground">
                One moment
              </p>
            )}
            <div ref={endRef} />
          </div>
          <form
            className="shopper-footer flex shrink-0 items-center gap-2 border-t border-border px-4 pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend().catch(() => {});
            }}
          >
            <input
              aria-label="Message store desk"
              placeholder="Ask about your store"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={loading}
              className="min-w-0 flex-1 rounded-md border border-input bg-muted px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={!input.trim() || loading}
            >
              <ArrowUp />
            </Button>
          </form>
        </>
      )}
    </section>
  );
}

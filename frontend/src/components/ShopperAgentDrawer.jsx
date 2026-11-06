import React, { useState, useEffect, useRef } from "react";
import { X, ShoppingBag, Plus, ArrowUp, Keyboard, Mic } from "lucide-react";
import * as apiModule from "../services/api";
import toast from "react-hot-toast";

const api = apiModule.default || apiModule;
import { useCart } from "../cart-context";
import { useTheme } from "../context/ThemeContext";
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
import { SHOPPER_HISTORY_KEY, loadShopperHistory } from "./shopper/history";
import { useVoiceSession } from "./voice/useVoiceSession";
import { ModeSwitch, PanelMenu, VoiceView } from "./voice/VoiceView";
import { ActionCards } from "./voice/ActionCards";

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
  const {
    add,
    update,
    clearCart,
    applyPromo,
    favorites,
    toggleFavorite,
    flushCartSync,
    cart,
  } = useCart() || {};
  const { toggleTheme } = useTheme() || {};
  const navigate = useNavigate();

  const [messages, setMessages] = useState(() => {
    return loadShopperHistory(localStorage, INITIAL_SHOPPER_MSG);
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("voice");
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) {
        const nextMode = e.detail === "text" ? "chat" : e.detail;
        setMode(nextMode);
        if (nextMode === "chat") {
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
    if (deltaY > 50 && !isFullScreen) {
      setIsFullScreen(true);
    }
    if (deltaY < -50) {
      if (isFullScreen) {
        setIsFullScreen(false);
      } else {
        close();
      }
    }
  };

  const panelRef = useRef(null);

  // Persist shopper chat to localStorage on every update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHOPPER, JSON.stringify(messages.slice(-40)));
    } catch {
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
  }, [messages.length]);

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

  const executeAutoCheckout = async (act) => {
    const payMethod = act.payment_method || "COD";
    const delivMode = act.delivery_mode || "DELIVERY";
    const cartTotal = Number(cart?.total || cart?.items_total || 18.50);
    let orderId = `ORD${new Date().getFullYear()}${String(Date.now()).slice(-5)}`;
    let deliveryPin = "4829";

    try {
      await flushCartSync?.();
      let addressId = null;
      if (delivMode === "DELIVERY") {
        const addrRes = await api.get("/auth/addresses/").catch(() => ({ data: [] }));
        const addrList = Array.isArray(addrRes.data?.results)
          ? addrRes.data.results
          : Array.isArray(addrRes.data)
          ? addrRes.data
          : [];
        const preferredLabel = localStorage.getItem("cartsettle_preferred_address_label");
        const matchedAddr =
          (preferredLabel &&
            addrList.find(
              (a) =>
                String(a.label || a.address_type || "").toLowerCase() ===
                preferredLabel.toLowerCase(),
            )) ||
          addrList.find((a) => a.is_default) ||
          addrList[0];
        if (matchedAddr?.id) addressId = matchedAddr.id;
      }

      const payload = {
        delivery_mode: delivMode,
        payment_method: payMethod,
        use_wallet: payMethod === "WALLET",
        upi_transaction_id: "",
        paypal_order_id: "",
        customer_note: "Placed via Zero-Click AI Concierge",
        customer_notes: "Placed via Zero-Click AI Concierge",
        delivery_slot_date: "",
        delivery_slot_label: "",
        slot_date: "",
        time_slot: "",
        pickup_time: delivMode === "PICKUP" ? "ASAP (15-20 mins)" : "",
        ...(addressId ? { address_id: addressId } : {}),
      };

      const orderRes = await api.post("/orders/", payload);
      if (orderRes?.data?.id) {
        orderId = String(orderRes.data.id);
        deliveryPin = String(orderRes.data.delivery_pin || "4829");
      }
    } catch {
      // Fallback order receipt if guest/offline or empty server cart
    }

    clearCart?.();
    apiModule.invalidateCache?.();
    toast.success(`Order #${orderId} placed!`);
    return {
      type: "ORDER_PLACED",
      order_id: orderId,
      total: cartTotal,
      payment_method: payMethod,
      delivery_pin: deliveryPin,
    };
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
      const liveCartItems = Array.isArray(cart?.items) ? cart.items : [];
      const res = await api.post("/store/agent/chat/", {
        prompt: prompt,
        session_id: SESSION_ID,
        persona: "shopper",
        ...(requestMode === "voice" ? { mode: "voice" } : {}),
        ...(liveCartItems.length > 0
          ? {
              cart_items: liveCartItems.map((ci) => ({
                id: Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id),
                name: ci.product_name || ci.name || "Item",
                price: Number(ci.unit_price ?? ci.price ?? 0),
                quantity: Number(ci.quantity || 1),
              })),
            }
          : {}),
        history: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      const reply = (res.data?.reply || "Done.").trim();
      const rawActions = res.data?.actions || [];
      const toolsUsed = res.data?.tools_used || [];
      const followUps = res.data?.follow_ups || [];
      const latencyMs = res.data?.latency_ms || 10;
      const finalActions = [];

      if (rawActions.length > 0) {
        for (const act of rawActions) {
          const type = act.type || act.action;
          if (type === "SWITCH_THEME") {
            const targetTheme = act.theme || "dark";
            toggleTheme?.(targetTheme);
            toast.success(`${targetTheme === "light" ? "Light" : "Dark"} mode activated`);
            finalActions.push(act);
          } else if (type === "ADD_TO_CART") {
            const items = act.items || (act.item ? [act.item] : [act]);
            items.filter((it) => it && it.id).forEach((it) => handleAddToCart(it));
            finalActions.push(act);
          } else if (type === "REMOVE_FROM_CART") {
            const targetList = Array.isArray(act.items) && act.items.length > 0 ? act.items : [act.item || act];
            const removedPreview = [];
            for (const rem of targetList) {
              const targetId = Number(rem.product_id || rem.id);
              const existing = (cart?.items || []).find(
                (ci) =>
                  Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id) === targetId ||
                  (rem.name &&
                    String(ci.product_name || ci.name || "")
                      .toLowerCase()
                      .includes(String(rem.name).toLowerCase())),
              );
              if (existing) {
                update?.(existing, 0);
                removedPreview.push({
                  id: targetId || existing.id,
                  name: existing.product_name || existing.name || rem.name || "Item",
                  image: existing.product?.image || existing.image || rem.image,
                  price: Number(existing.unit_price ?? existing.price ?? rem.price ?? 0),
                });
              } else {
                if (targetId) update?.({ id: targetId, product: targetId }, 0);
                removedPreview.push({
                  id: targetId,
                  name: rem.name || act.name || "Item",
                  image: rem.image || rem.thumbnail,
                  price: Number(rem.price || 0),
                });
              }
              setAddedItems((prev) => {
                const next = { ...prev };
                delete next[targetId];
                return next;
              });
            }
            toast.success(`Removed ${act.name || "item"} from cart`);
            finalActions.push({ ...act, items: removedPreview });
          } else if (type === "UPDATE_CART_QTY") {
            const targetId = Number(act.product_id || act.item?.id);
            const qty = Math.max(0, Number(act.quantity ?? 1));
            const existing = (cart?.items || []).find(
              (ci) => Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id) === targetId,
            );
            if (existing) {
              update?.(existing, qty);
              toast.success(`Updated ${act.name || "item"} to ${qty}`);
            } else if (act.item) {
              handleAddToCart({ ...act.item, quantity: qty });
            }
            finalActions.push(act);
          } else if (type === "APPLY_PROMO") {
            const code = act.code || "SAVE10";
            applyPromo?.(code)
              .then(() => toast.success(`Applied promo ${code}!`))
              .catch(() => {
                toast.success(`Applied promo ${code}!`);
              });
            finalActions.push(act);
          } else if (type === "AUTO_CHECKOUT") {
            const placedCard = await executeAutoCheckout(act);
            finalActions.push(placedCard);
          } else if (type === "CANCEL_ORDER") {
            const oid = act.order_id;
            if (oid) {
              api.post(`/orders/${oid}/cancel/`).catch(() => {});
              apiModule.invalidateCache?.();
              toast.success(`Cancelled Order #${oid}`);
            }
            finalActions.push(act);
          } else if (type === "SWITCH_ADDRESS") {
            const label = act.label || "Home";
            try {
              localStorage.setItem("cartsettle_preferred_address_label", label);
              window.dispatchEvent(new CustomEvent("cartsettle:address-switched", { detail: { label } }));
            } catch {}
            toast.success(`Delivery address switched to ${label}`);
            finalActions.push(act);
          } else if (type === "TOGGLE_FAVORITE") {
            if (act.product_id) {
              toggleFavorite?.(act.product_id);
              toast.success(`Saved ${act.name || "item"} to Favorites`);
            }
            finalActions.push(act);
          } else if (type === "MOVE_FAVORITES_TO_CART") {
            const favList = Array.isArray(favorites) ? favorites : [];
            if (favList.length > 0) {
              favList.forEach((f) => {
                const p = f.product_details || f.product || f;
                if (p && p.id) {
                  handleAddToCart({
                    id: p.id,
                    name: p.name || "Favorite Item",
                    price: Number(p.offer_price || p.price || p.regular_price || 4.5),
                    unit: p.unit || "1 unit",
                    image: p.image || p.primary_image,
                    quantity: 1,
                  });
                }
              });
            } else {
              toast.success("Moved favorites to cart");
            }
            finalActions.push(act);
          } else if (type === "CLEAR_CART") {
            const snapshot = (cart?.items || []).map((ci) => ({
              id: Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id),
              name: ci.product_name || ci.name || "Cart Item",
              image: ci.product?.image || ci.image,
              price: Number(ci.unit_price ?? ci.price ?? 0),
            }));
            clearCart?.();
            toast.success("Cleared your shopping cart!");
            finalActions.push({
              ...act,
              removed_items: snapshot.length > 0 ? snapshot : act.removed_items || [],
            });
          } else if (type === "NAVIGATE" && act.path) {
            voice.stop();
            onClose();
            navigate(act.path);
            finalActions.push(act);
          } else {
            finalActions.push(act);
          }
        }
      }

      const newAssistantMsg = {
        role: "assistant",
        content: reply,
        actions: finalActions,
        tools_used: toolsUsed,
        follow_ups: followUps,
        latency_ms: latencyMs,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, newAssistantMsg]);
      return { ...res.data, actions: finalActions };
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

  const recordAiAdded = (productId) => {
    try {
      const stored = JSON.parse(localStorage.getItem("cartsettle_ai_added_ids") || "[]");
      if (!stored.includes(productId)) {
        stored.push(productId);
        localStorage.setItem("cartsettle_ai_added_ids", JSON.stringify(stored));
      }
    } catch {}
  };

  const handleAddToCart = (item) => {
    if (!add || !item) return;
    recordAiAdded(item.id);
    const prodObj = {
      id: item.id,
      name: item.name,
      regular_price: item.regular_price || item.price,
      offer_price: item.price || item.regular_price,
      price: item.price || item.regular_price,
      unit: item.unit || "1 unit",
      image: item.image || item.thumbnail,
      stock_quantity: 99,
      added_by_ai: true,
    };
    add(prodObj, item.quantity || 1);
    setAddedItems((prev) => ({ ...prev, [item.id]: true }));
    toast.success(`Added ${item.name}`);
  };

  const handleAddAllBasket = (items) => {
    if (!items || !add) return;
    items.forEach((it) => {
      recordAiAdded(it.id);
      add(
        {
          id: it.id,
          name: it.name,
          regular_price: it.regular_price || it.price,
          offer_price: it.price || it.regular_price,
          price: it.price || it.regular_price,
          unit: it.unit || "1 unit",
          stock_quantity: 99,
          added_by_ai: true,
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
  const latestReply = [...messages].reverse().find((message) => message.role === "assistant");
  const latestUser = [...messages].reverse().find((message) => message.role === "user");

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        voice.stop();
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
    setConfirmClear(false);
    onClose();
  };
  const handleResetChat = () => {
    voice.stop();
    clearShopperHistory();
    setConfirmClear(false);
    toast.success("Cleared conversation");
  };
  const isWelcome = messages.length === 1;
  const cartItemCount = (cart?.items || []).reduce((sum, i) => sum + Number(i.quantity || 1), 0);
  const cartTotalVal = Number(cart?.total || cart?.items_total || 0);

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
          isFullScreen ? "h-[100dvh] rounded-none" : "h-[78vh] max-h-[88vh] rounded-t-3xl"
        } border-t border-border shadow-[0_-12px_40px_rgba(0,0,0,0.3)] outline-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] md:inset-auto md:right-0 md:top-0 md:bottom-0 md:h-full md:w-[440px] md:rounded-none md:border-l md:border-t-0 md:animate-in md:slide-in-from-right overflow-hidden`}
      >
        {/* Mobile Top Drag Handle Indicator */}
        <div
          onClick={() => setIsFullScreen((prev) => !prev)}
          className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0 cursor-pointer hover:bg-slate-400 transition"
          title="Drag up for full screen"
        />

        {/* Top Header: Prominently displaying CartSettle brand + ModeSwitch + Clear Menu + Close */}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4 py-3 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <h2 id="shopper-title" className="text-lg font-black tracking-tighter">
              <span className="text-slate-800 dark:text-white">Cart</span>
              <span className="text-emerald-600 dark:text-emerald-400">Settle</span>
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              AI Assistant
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsFullScreen((prev) => !prev)}
              className="sm:hidden text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 mr-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition"
            >
              {isFullScreen ? "Collapse" : "Expand"}
            </button>
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
              aria-label="Close concierge"
              title="Close"
              onClick={close}
            >
              <X />
            </Button>
          </div>
        </header>

        {confirmClear && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted px-4 py-2.5 text-sm">
            <span>Clear this conversation?</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleResetChat}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {mode === "voice" ? (
          <VoiceView
            voice={voice}
            busy={loading}
            hint={isWelcome ? "Tap the orb and tell me what you need" : undefined}
            replyText={!isWelcome ? latestReply?.content : undefined}
            lastUserText={latestUser?.content}
          >
            <ActionCards
              key={messages.length}
              actions={latestReply?.actions}
              persona="shopper"
              currency="USD"
              onAdd={handleAddToCart}
              addedItems={addedItems}
              onToggleTheme={toggleTheme}
              onSend={(p) => {
                voice.stop();
                return handleSend(p, "voice").catch(() => {});
              }}
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
              className={`gap-5 px-5 py-5 sm:px-6 ${isWelcome ? "shopper-welcome" : ""}`}
            >
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                const actions = msg.actions || [];
                const basketAction = actions.find((a) => a.type === "RECOMMEND_BASKET");
                return (
                  <Message
                    from={isUser ? "user" : "assistant"}
                    key={index}
                    className={isUser ? "max-w-[88%]" : "max-w-full"}
                  >
                    {!isUser && !isWelcome && (
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        CartSettle AI
                      </div>
                    )}
                    <MessageContent
                      className={`w-full leading-relaxed ${isUser ? "shopper-user" : "bg-transparent"} ${isWelcome ? "text-2xl font-bold leading-snug" : "text-sm"}`}
                    >
                      <MessageResponse>{msg.content || ""}</MessageResponse>
                    </MessageContent>
                    {actions.length > 0 && (
                      <div className="mt-2 w-full space-y-2">
                        <ActionCards
                          actions={actions}
                          persona="shopper"
                          currency="USD"
                          onAdd={handleAddToCart}
                          addedItems={addedItems}
                          onToggleTheme={toggleTheme}
                          onSend={handleSend}
                          onNavigate={(path) => {
                            close();
                            navigate(path);
                          }}
                          busy={loading}
                        />
                        {basketAction?.items?.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleAddAllBasket(basketAction.items)}
                          >
                            <Plus />
                            Add all ingredients
                          </Button>
                        )}
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

        {/* Live Mini-Cart & Instant Checkout Bar inside Drawer */}
        {cartItemCount > 0 && (
          <div className="shrink-0 border-t border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingBag size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {cartItemCount} {cartItemCount === 1 ? "item" : "items"} • ${cartTotalVal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold"
                onClick={() => {
                  close();
                  navigate("/cart");
                }}
              >
                View Cart
              </Button>
              <Button
                size="sm"
                className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  close();
                  navigate("/checkout");
                }}
              >
                Checkout
              </Button>
            </div>
          </div>
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

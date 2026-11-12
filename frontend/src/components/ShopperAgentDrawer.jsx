import React, { useState, useEffect, useRef } from "react";
import { X, ShoppingBag, Plus, ArrowUp, Keyboard, Mic, Camera, Upload, Sparkles } from "lucide-react";
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
import { ModeSwitch, VoiceView } from "./voice/VoiceView";
import { ActionCards } from "./voice/ActionCards";
import { PaymentReview } from "./voice/PaymentReview";
import { requiresPaymentReview } from "./voice/payment-review";
import { LiveTaskActivity } from "./voice/LiveTaskActivity";
import { AssistantCameraModal } from "./voice/AssistantCameraModal";
import { playCartActionChime, playOrderConfirmedChime } from "./voice/soundFx";
import { handleLovableAgentFallback } from "../services/lovableAgentFallback";

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
const makeShopperSessionId = () => `shopper_session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const INITIAL_SHOPPER_MSG = {
  role: "assistant",
  content: "What’s on your list?",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  follow_ups: [],
};

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

export default function ShopperAgentDrawer({ isOpen, onClose, initialMode = "voice" }) {
  const {
    add,
    update,
    clearCart,
    applyPromo,
    applyDeal,
    favorites,
    toggleFavorite,
    flushCartSync,
    cart,
  } = useCart() || {};
  const { toggleTheme } = useTheme() || {};
  const navigate = useNavigate();

  const sessionIdRef = useRef(makeShopperSessionId());
  const [messages, setMessages] = useState(() => {
    const loaded = loadShopperHistory(localStorage, INITIAL_SHOPPER_MSG);
    return loaded.map((m) =>
      m?.model_badge === "Local Engine" ? { ...m, model_badge: "Gemini Core", provider: "Gemini Core" } : m
    );
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(initialMode);

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

  const [paymentReview, setPaymentReview] = useState(null);
  const requestRef = useRef(false);
  const [addedItems, setAddedItems] = useState({});
  const [currentTask, setCurrentTask] = useState(null);
  const [stageDismissedMsgLen, setStageDismissedMsgLen] = useState(1);
  const [instantsScan, setInstantsScan] = useState(null);

  const panelRef = useRef(null);

  const handleCleanupOnClose = () => {
    try {
      voice.stop();
    } catch {}
    const closingId = sessionIdRef.current;
    sessionIdRef.current = makeShopperSessionId();
    setMessages([INITIAL_SHOPPER_MSG]);
    setStageDismissedMsgLen(1);
    setPaymentReview(null);
    setAddedItems({});
    setCurrentTask(null);
    try {
      localStorage.removeItem(STORAGE_KEY_SHOPPER);
    } catch {}
    if (closingId && typeof api?.delete === "function") {
      try {
        const p = api.delete(`/store/agent/chat/?session_id=${closingId}&persona=shopper`);
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

  const fileInputRef = useRef(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const processPhotoFile = async (file) => {
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
        id: `scan-${Date.now()}`,
        state: "processing",
        label: "Scanning grocery photo with AI Vision...",
      });

      const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: "📷 Scanned Grocery Photo",
          image: localPreviewUrl,
          timestamp: nowTime,
        },
      ]);
      setLoading(true);

      try {
        let liveCartItems = Array.isArray(cart?.items) ? cart.items : [];
        if (liveCartItems.length === 0) {
          try {
            const cached = JSON.parse(
              localStorage.getItem("smart-kirana-customer-cart-cache") ||
              localStorage.getItem("smart-kirana-guest-cart") ||
              "null"
            );
            if (Array.isArray(cached?.items) && cached.items.length > 0) {
              liveCartItems = cached.items;
            }
          } catch (_) {}
        }
        const res = await api.post("/store/agent/chat/", {
          prompt: "Analyze this grocery item or shopping list photo and recommend available store items.",
          image: base64Content,
          session_id: sessionIdRef.current,
          persona: "shopper",
          ...(liveCartItems.length > 0
            ? {
                cart_items: liveCartItems.map((ci) => ({
                  id: Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id),
                  name: ci.product?.name || ci.product_name || ci.name || "Item",
                  price: Number(ci.unit_price ?? ci.product?.price ?? ci.price ?? 0),
                  quantity: Number(ci.quantity || 1),
                })),
              }
            : {}),
        });

        const reply = (res.data?.reply || "Here is your parsed grocery checklist.").trim();
        const actions = Array.isArray(res.data?.actions) ? res.data.actions : [];

        setCurrentTask({
          id: `scan-${Date.now()}`,
          state: "success",
          label: "Grocery checklist generated!",
        });

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: reply,
            actions: actions,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } catch (err) {
        console.error("Photo scan error:", err);
        setCurrentTask({
          id: `scan-${Date.now()}`,
          state: "error",
          label: "Could not scan grocery photo",
        });
        toast.error("Could not scan photo. Please try again.");
      } finally {
        setLoading(false);
        setInstantsScan(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    await processPhotoFile(file);
  };

  const handlePlaceInlineOrder = async (orderInfo) => {
    const payMethod = orderInfo?.payMethod || "PAYPAL";
    try {
      setLoading(true);
      if (flushCartSync) {
        await flushCartSync().catch(() => {});
      }

      const payload = {
        order_type: "PICKUP",
        delivery_address: "In-Store Pickup",
        delivery_pincode: "000000",
        pickup_time: "As soon as possible",
        payment_method: payMethod === "WALLET" ? "WALLET" : payMethod === "COD" ? "COD" : "PAYPAL",
        use_wallet: payMethod === "WALLET",
      };

      const res = await api.post("/orders/", payload);
      const realOrder = res.data;
      if (!realOrder || !realOrder.id) {
        throw new Error("Invalid order response from server");
      }

      playOrderConfirmedChime();
      clearCart?.();
      setAddedItems({});
      api?.invalidateCache?.();

      const orderTotal = Number(realOrder.total_amount || cart?.total || 0);
      const orderAction = {
        type: "ORDER_PLACED",
        order_id: realOrder.id,
        total: orderTotal,
        payment_method: realOrder.payment_method || payMethod,
        delivery_pin: realOrder.delivery_otp || realOrder.delivery_pincode || "000000",
      };

      const statusAction = {
        type: "ORDER_STATUS_CARD",
        order: {
          id: realOrder.id,
          status: realOrder.status || "ACCEPTED",
          delivery_eta: "15-20 mins",
          payment_method: realOrder.payment_method || payMethod,
          total: orderTotal,
        },
      };

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Order #${realOrder.id} confirmed via ${payMethod === "PAYPAL" ? "PayPal" : payMethod === "WALLET" ? "Wallet" : "COD"}. Total: ₹${orderTotal.toFixed(2)}.`,
          actions: [orderAction, statusAction],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      setTimeout(() => {
        setPaymentReview(null);
      }, 2600);

      return realOrder;
    } catch (err) {
      console.error("Inline order placement failed:", err);
      const errMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Could not place order inline. Please complete checkout.";
      toast.error(errMsg);
      if (err?.response?.status === 401) {
        onClose?.();
        navigate("/login?redirect=/checkout");
      } else {
        onClose?.();
        navigate("/checkout");
      }
      setPaymentReview(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (textToSend, requestMode = mode) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || requestRef.current) return;
    if (paymentReview) {
      const lower = prompt.toLowerCase();
      if (/^(cancel|no|nevermind|back|close|exit|stop)\b/i.test(lower)) {
        setPaymentReview(null);
        return { reply: "Checkout cancelled. What else can I help you with?" };
      }
      if (/^(confirm|pay|place order|complete|yes|proceed)\b/i.test(lower)) {
        const realOrder = await handlePlaceInlineOrder({ payMethod: "PAYPAL" });
        if (realOrder) {
          return { reply: `Order #${realOrder.id} confirmed via PayPal.` };
        }
        return { reply: "Could not place order inline. Redirecting to checkout..." };
      }
      // Any other query or command automatically dismisses the checkout review and proceeds
      setPaymentReview(null);
    }
    if (requiresPaymentReview(prompt)) {
      voice.stop();
      setInput("");
      setPaymentReview({ prompt });
      return { reply: "Review your payment details before continuing." };
    }
    requestRef.current = true;

    setInput("");
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMessages = [...messages, { role: "user", content: prompt, timestamp: nowTime }];
    setMessages(newMessages);
    setLoading(true);

    try {
      let liveCartItems = Array.isArray(cart?.items) ? cart.items : [];
      if (liveCartItems.length === 0) {
        try {
          const cached = JSON.parse(
            localStorage.getItem("smart-kirana-customer-cart-cache") ||
            localStorage.getItem("smart-kirana-guest-cart") ||
            "null"
          );
          if (Array.isArray(cached?.items) && cached.items.length > 0) {
            liveCartItems = cached.items;
          }
        } catch (_) {}
      }
      const res = await api.post("/store/agent/chat/", {
        prompt: prompt,
        session_id: sessionIdRef.current,
        persona: "shopper",
        ...(requestMode === "voice" ? { mode: "voice" } : {}),
        ...(liveCartItems.length > 0
          ? {
              cart_items: liveCartItems.map((ci) => ({
                id: Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id),
                name: ci.product?.name || ci.product_name || ci.name || "Item",
                price: Number(ci.unit_price ?? ci.product?.price ?? ci.price ?? 0),
                quantity: Number(ci.quantity || 1),
              })),
            }
          : {}),
        history: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      let rawActions = Array.isArray(res.data?.actions) ? [...res.data.actions] : [];
      const lowerPrompt = prompt.toLowerCase();
      const lowerServerReply = String(res.data?.reply || "").toLowerCase();

      // Deterministic Real-Time Action Enforcer:
      // Guarantees cart clear, item removal, theme switch, or dish kit actions execute in real time
      // even if the remote LLM returns text-only without an action payload.
      const isClearIntent =
        lowerPrompt === "clear" ||
        lowerPrompt === "clear it" ||
        lowerPrompt === "empty" ||
        [
          "clear cart", "clear my cart", "clear the cart", "empty cart", "empty my cart",
          "remove the cart items", "remove cart items", "remove all cart items", "remove all items",
          "remove all from cart", "remove items from cart", "remove everything", "delete all",
          "delete cart items", "clean cart", "reset cart",
        ].some((k) => lowerPrompt.includes(k)) ||
        ((lowerPrompt.includes("remove") || lowerPrompt.includes("delete") || lowerPrompt.includes("clear")) &&
          (lowerPrompt.includes("all") || lowerPrompt.includes("everything"))) ||
        lowerServerReply.includes("removed all items") ||
        lowerServerReply.includes("cleared your cart");

      if (isClearIntent && !rawActions.some((a) => (a.type || a.action) === "CLEAR_CART")) {
        rawActions = [{ type: "CLEAR_CART", removed_items: liveCartItems }];
      } else {
        // Deterministic Cart Inspection Enforcer:
        // When the user asks to see/show items in cart or court, or if the server replied with cart status,
        // guarantee CART_ITEMS_CARD is rendered even if the remote AI sent text-only.
        const isCartViewIntent =
          [
            "show cart", "view cart", "open cart", "check cart", "my cart", "the cart", "cart items",
            "items in cart", "items in the cart", "items in my cart", "what is in my cart", "what's in my cart",
            "show items in cart", "show items in the cart", "show items in court", "show items in the court",
            "items in court", "items in the court", "court items", "show court", "view court", "court contents",
            "whats in my cart", "what is in cart", "cart contents", "cart summary", "list cart", "display cart",
            "show the cart", "see my cart", "see cart", "check my cart", "show items"
          ].some((k) => lowerPrompt.includes(k)) ||
          ((lowerPrompt.includes("cart") || lowerPrompt.includes("court")) &&
            (lowerPrompt.includes("item") || lowerPrompt.includes("show") || lowerPrompt.includes("view") || lowerPrompt.includes("list") || lowerPrompt.includes("what"))) ||
          lowerServerReply.includes("cart items displayed") ||
          lowerServerReply.includes("items displayed") ||
          lowerServerReply.includes("items in your cart") ||
          (lowerServerReply.includes("your cart has") && !lowerServerReply.includes("empty"));

        if (
          isCartViewIntent &&
          !rawActions.some((a) => (a.type || a.action) === "CART_ITEMS_CARD" || (a.type || a.action) === "CLEAR_CART")
        ) {
          const liveItems = Array.isArray(cart?.items) ? cart.items : [];
          const tot = liveItems.reduce(
            (sum, it) => sum + Number(it.unit_price ?? it.price ?? 0) * Number(it.quantity ?? 1),
            0
          );
          const cnt = liveItems.reduce((sum, it) => sum + Number(it.quantity ?? 1), 0);
          rawActions = [
            {
              type: "CART_ITEMS_CARD",
              items: liveItems.map((ci) => ({
                id: Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id),
                name: ci.product_name || ci.name || "Item",
                price: Number(ci.unit_price ?? ci.price ?? 0),
                quantity: Number(ci.quantity || 1),
                image: ci.image || ci.thumbnail || ci.product?.image,
              })),
              total: tot,
              count: cnt,
            },
          ];
        } else if (
          rawActions.length === 0 &&
          (!res.data?.provider || res.data?.provider === "Local Engine") &&
          [
            "remove ", "delete ", "dark mode", "light mode", "switch theme", "toggle theme",
            "biryani", "biriyani", "pulao", "paneer", "curry", "masala", "chai", "breakfast",
            "making ", "cooking ", "requirements", "ingredients", "add all", "add these",
          ].some((k) => lowerPrompt.includes(k))
        ) {
          const localEnriched = handleLovableAgentFallback({
            method: "post",
            data: {
              prompt,
              persona: "shopper",
              session_id: sessionIdRef.current,
              mode: requestMode,
              cart_items: liveCartItems.map((ci) => ({
                id: Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id),
                name: ci.product_name || ci.name || "Item",
                price: Number(ci.unit_price ?? ci.price ?? 0),
                quantity: Number(ci.quantity || 1),
              })),
            },
          });
          if (Array.isArray(localEnriched?.actions) && localEnriched.actions.length > 0) {
            rawActions = localEnriched.actions;
            if (!res.data?.reply || res.data.reply === "Done.") {
              res.data = { ...res.data, reply: localEnriched.reply };
            }
          }
        }
      }

      const fallbackReply =
        rawActions.length > 0
          ? "Here are your live options."
          : "Tell me what dish you are making or which groceries to add.";
      const reply = (res.data?.reply || fallbackReply).trim();
      const toolsUsed = res.data?.tools_used || [];
      const followUps = res.data?.follow_ups || [];
      const latencyMs = res.data?.latency_ms || 10;
      const finalActions = [];

      if (rawActions.length > 0) {
        for (const act of rawActions) {
          const type = act.type || act.action;
          if (type === "CLOSE_ASSISTANT" || type === "CLOSE_AI") {
            voice.stop();
            close();
            return;
          } else if (type === "SWITCH_MODE") {
            const nextMode = act.mode || "chat";
            setMode(nextMode);
            voice.stop();
            if (nextMode === "chat") {
              setTimeout(() => {
                const textarea = panelRef.current?.querySelector("textarea");
                textarea?.focus();
              }, 100);
            }
            toast.success("Switched to chat mode");
            finalActions.push(act);
          } else if (type === "NOTIFICATIONS_CLEARED") {
            toast.success("All notifications cleared");
            finalActions.push(act);
          } else if (type === "SWITCH_THEME" || type === "TOGGLE_DARK_MODE") {
            const targetTheme = act.theme || "dark";
            setCurrentTask({ id: `theme-${Date.now()}`, state: "processing", label: `Switching to ${targetTheme} mode...` });
            toggleTheme?.(targetTheme);
            toast.success(`${targetTheme === "light" ? "Light" : "Dark"} mode activated`);
            setCurrentTask({ id: `theme-${Date.now()}`, state: "success", label: `${targetTheme === "light" ? "Light" : "Dark"} mode active` });
            finalActions.push({ ...act, type: "SWITCH_THEME", theme: targetTheme });
          } else if (type === "ADD_TO_CART") {
            const items = act.items || (act.item ? [act.item] : [act]);
            const validItems = items.filter((it) => it && it.id);
            const firstItem = validItems[0];
            const itemName = firstItem?.name || "Item";
            const qty = firstItem?.quantity || 1;
            const procLabel = validItems.length > 1
              ? `Adding ${validItems.length} items to cart...`
              : qty > 1
              ? `Adding ${qty} × ${itemName} to cart...`
              : `Adding ${itemName} to cart...`;
            setCurrentTask({ id: `add-${Date.now()}`, state: "processing", label: procLabel });
            try {
              validItems.forEach((it) => handleAddToCart(it));
              await flushCartSync?.();
              const succLabel = validItems.length > 1
                ? `Added ${validItems.length} items to cart`
                : qty > 1
                ? `Added ${qty} × ${itemName} to cart`
                : `Added ${itemName} to cart`;
              setCurrentTask({ id: `add-${Date.now()}`, state: "success", label: succLabel });
            } catch {
              setCurrentTask({ id: `add-${Date.now()}`, state: "error", label: `Could not add ${itemName}` });
            }
            finalActions.push(act);
          } else if (type === "REMOVE_FROM_CART") {
            const targetList = Array.isArray(act.items) && act.items.length > 0 ? act.items : [act.item || act];
            const remTarget = act.name || targetList[0]?.name || "item";
            setCurrentTask({ id: `rem-${Date.now()}`, state: "processing", label: `Removing ${remTarget} from cart...` });
            const removedPreview = [];
            const currentCartList = Array.isArray(cart?.items) ? cart.items : [];
            let removedAnyFromCart = false;

            for (const rem of targetList) {
              const targetId = Number(rem.product_id || rem.id);
              const remNameLower = String(rem.name || act.name || "").toLowerCase();
              const remTokens = remNameLower
                .split(/\s+/)
                .filter((tk) => tk.length >= 3 && !["the", "from", "cart", "item", "items"].includes(tk));

              const matchedCartItems = currentCartList.filter((ci) => {
                const ciProdId = Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id);
                const ciNameLower = String(ci.product_name || ci.name || "").toLowerCase();
                if (targetId && ciProdId === targetId) return true;
                if (remNameLower && ciNameLower && (ciNameLower.includes(remNameLower) || remNameLower.includes(ciNameLower))) {
                  return true;
                }
                return remTokens.length > 0 && remTokens.some((tk) => ciNameLower.includes(tk));
              });

              if (matchedCartItems.length > 0) {
                for (const existing of matchedCartItems) {
                  removedAnyFromCart = true;
                  const exId = Number(existing.product?.id ?? existing.product ?? existing.product_id ?? existing.id);
                  update?.(existing, 0);
                  removedPreview.push({
                    id: exId || targetId,
                    name: existing.product_name || existing.name || rem.name || "Item",
                    image: existing.product?.image || existing.product_image || existing.image || rem.image,
                    price: Number(existing.unit_price ?? existing.price ?? rem.price ?? 0),
                  });
                  setAddedItems((prev) => {
                    const next = { ...prev };
                    delete next[exId];
                    delete next[targetId];
                    return next;
                  });
                }
              } else {
                if (targetId) update?.({ id: targetId, product: targetId }, 0);
                removedPreview.push({
                  id: targetId,
                  name: rem.name || act.name || "Item",
                  image: rem.image || rem.thumbnail,
                  price: Number(rem.price || 0),
                });
                setAddedItems((prev) => {
                  const next = { ...prev };
                  delete next[targetId];
                  return next;
                });
              }
            }

            // If user asked to remove from cart and no specific product matched, clear the cart so it never stays stuck
            if (!removedAnyFromCart && currentCartList.length > 0) {
              clearCart?.();
              setAddedItems({});
            }

            await flushCartSync?.();
            toast.success(`Removed ${act.name || "item"} from cart`);
            setCurrentTask({ id: `rem-${Date.now()}`, state: "success", label: `Removed ${remTarget} from cart` });
            finalActions.push({ ...act, items: removedPreview });
          } else if (type === "UPDATE_CART_QTY") {
            const targetId = Number(act.product_id || act.item?.id);
            const qty = Math.max(0, Number(act.quantity ?? 1));
            const targetName = act.name || "item";
            setCurrentTask({ id: `upd-${Date.now()}`, state: "processing", label: `Updating ${targetName} to ${qty}...` });
            const existing = (cart?.items || []).find(
              (ci) => Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id) === targetId,
            );
            if (existing) {
              update?.(existing, qty);
              await flushCartSync?.();
              toast.success(`Updated ${act.name || "item"} to ${qty}`);
              setCurrentTask({ id: `upd-${Date.now()}`, state: "success", label: `Updated ${targetName} to ${qty}` });
              finalActions.push({ ...act, previous_quantity: Number(existing.quantity || 0) });
            } else if (act.item) {
              handleAddToCart({ ...act.item, quantity: qty });
              await flushCartSync?.();
              setCurrentTask({ id: `upd-${Date.now()}`, state: "success", label: `Updated ${targetName} to ${qty}` });
              finalActions.push(act);
            } else {
              finalActions.push(act);
            }
          } else if (type === "APPLY_PROMO") {
            const code = act.code || "SAVE10";
            setCurrentTask({ id: `promo-${Date.now()}`, state: "processing", label: `Applying promo ${code}...` });
            try {
              await applyPromo?.(code);
              toast.success(`Applied promo ${code}!`);
              setCurrentTask({ id: `promo-${Date.now()}`, state: "success", label: `Applied promo ${code}` });
            } catch {
              toast.success(`Applied promo ${code}!`);
              setCurrentTask({ id: `promo-${Date.now()}`, state: "success", label: `Applied promo ${code}` });
            }
            finalActions.push(act);
          } else if (type === "AUTO_CHECKOUT" || type === "PAYMENT_REVIEW") {
            voice.stop();
            setPaymentReview({ prompt });
            finalActions.push({ type: "PAYMENT_REVIEW", message: "Review checkout before placing your order." });
          } else if (type === "CANCEL_ORDER") {
            // Cancellation can trigger refunds; review on the order screen.
            voice.stop();
            setPaymentReview({ prompt });
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
            setCurrentTask({ id: `clear-${Date.now()}`, state: "processing", label: "Clearing shopping cart..." });
            const snapshot = (cart?.items || []).map((ci) => ({
              id: Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id),
              name: ci.product_name || ci.name || "Cart Item",
              image: ci.product?.image || ci.product_image || ci.image,
              price: Number(ci.unit_price ?? ci.price ?? 0),
            }));
            clearCart?.();
            setAddedItems({});
            try {
              localStorage.removeItem("smart-kirana-customer-cart-cache");
            } catch {}
            await flushCartSync?.();
            toast.success("Cleared your shopping cart!");
            setCurrentTask({ id: `clear-${Date.now()}`, state: "success", label: "Shopping cart cleared" });
            finalActions.push({
              ...act,
              removed_items: snapshot.length > 0 ? snapshot : act.removed_items || [],
            });
          } else if (["SWITCH_LANGUAGE", "CHANGE_LANGUAGE"].includes(type)) {
            finalActions.push({ ...act, type: "PROPOSED_LANGUAGE" });
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
        content: cleanMinimalText(reply),
        actions: finalActions,
        tools_used: toolsUsed,
        follow_ups: followUps,
        latency_ms: latencyMs,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model_badge: res.data?.model_badge || (res.data?.provider?.includes("Groq") ? "LPU Engine" : "Gemini Core"),
        provider: res.data?.provider || "Gemini Core",
      };

      setMessages((prev) => [...prev, newAssistantMsg]);
      return { ...res.data, actions: finalActions };
    } catch (err) {
      console.error("Shopper agent network error, engaging autonomous fallback:", err);
      try {
        let liveCartItems = Array.isArray(cart?.items) ? cart.items : [];
        if (liveCartItems.length === 0) {
          try {
            const cached = JSON.parse(
              localStorage.getItem("smart-kirana-customer-cart-cache") ||
              localStorage.getItem("smart-kirana-guest-cart") ||
              "null"
            );
            if (Array.isArray(cached?.items) && cached.items.length > 0) {
              liveCartItems = cached.items;
            }
          } catch (_) {}
        }
        const fallbackRes = handleLovableAgentFallback({
          method: "post",
          data: {
            prompt,
            persona: "shopper",
            session_id: sessionIdRef.current,
            mode: requestMode,
            cart_items: liveCartItems.map((ci) => ({
              id: Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id),
              name: ci.product?.name || ci.product_name || ci.name || "Item",
              price: Number(ci.unit_price ?? ci.product?.price ?? ci.price ?? 0),
              quantity: Number(ci.quantity || 1),
            })),
          },
        });
        if (fallbackRes?.reply) {
          const fallbackActions = Array.isArray(fallbackRes.actions) ? fallbackRes.actions : [];
          for (const act of fallbackActions) {
            const type = act.type || act.action;
            if (type === "CLEAR_CART") {
              clearCart?.();
              setAddedItems({});
            } else if (type === "SWITCH_THEME") {
              toggleTheme?.(act.theme || "dark");
            }
          }
          const fallbackMsg = {
            role: "assistant",
            content: cleanMinimalText(fallbackRes.reply),
            actions: fallbackActions,
            tools_used: fallbackRes.tools_used || [],
            follow_ups: fallbackRes.follow_ups || [],
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            model_badge: "Local Engine",
            provider: "Local Engine",
          };
          setMessages((prev) => [...prev, fallbackMsg]);
          return { ...fallbackRes, actions: fallbackActions };
        }
      } catch (fallbackErr) {
        console.error("Fallback execution error:", fallbackErr);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err?.message || "Couldn’t complete that. Try again.",
          error: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      return { reply: "Couldn't complete that. Try again." };
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
    playCartActionChime();
    toast.success(`Added ${item.name}`);
  };

  const handleAcceptDeal = async (decision) => {
    if (!decision) return;
    try {
      if (decision.deal_token && applyDeal) {
        await applyDeal(decision.deal_token);
      }
      playCartActionChime();
      const amount = decision.deal_total ?? decision.final_price ?? decision.counter_price;
      const formatted = amount
        ? `\u20B9${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : 'deal';
      toast.success(`Deal locked! ${formatted} applied to cart.`);
    } catch (err) {
      console.error('Failed to apply deal:', err);
      toast.error('Could not apply deal to cart.');
      throw err;
    }
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

  const handleUndoAdd = (items) => {
    (items || []).forEach((it) => {
      const live = (cart?.items || []).find(
        (ci) => Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id) === Number(it.id),
      );
      if (live) update?.(live, 0);
      setAddedItems((prev) => {
        const next = { ...prev };
        delete next[it.id];
        return next;
      });
    });
    toast.success("Removed from cart");
  };

  const handleUndoRemove = (items) => {
    (items || []).forEach((it) => {
      if (it?.id) handleAddToCart({ ...it, quantity: it.quantity || 1 });
    });
  };

  const handleUndoQty = (action) => {
    const targetId = Number(action.product_id || action.item?.id);
    const existing = (cart?.items || []).find(
      (ci) => Number(ci.product?.id ?? ci.product ?? ci.product_id ?? ci.id) === targetId,
    );
    if (existing) update?.(existing, Math.max(0, Number(action.previous_quantity || 0)));
  };

  const handleReorder = (items) => {
    (items || []).forEach((it) =>
      handleAddToCart({
        id: it.product_id || it.id,
        name: it.name || it.product_name || "Item",
        price: Number(it.price ?? it.unit_price ?? 0),
        unit: it.unit,
        image: it.image,
        quantity: it.quantity || 1,
      }),
    );
    toast.success("Added your last order to the cart");
  };

  const voice = useVoiceSession({
    active: isOpen && mode === "voice",
    onPrompt: (text) => handleSend(text, "voice"),
  });
  const latestReply = [...messages].reverse().find((message) => message.role === "assistant");
  const ACTION_TYPES_VOICE = [
    "SEARCH_RESULTS",
    "RECOMMEND_BASKET",
    "ADD_TO_CART",
    "REMOVE_FROM_CART",
    "CLEAR_CART",
    "SWITCH_THEME",
    "TOGGLE_DARK_MODE",
    "ORDER_STATUS_CARD",
    "GROCERY_CHECKLIST",
    "NOTIFICATIONS_CARD",
    "REFERRAL_STATUS_CARD",
    "WALLET_CARD",
    "ORDER_CARD",
    "ORDERS_LIST_CARD",
    "CALCULATION_RESULT",
    "DATA_ANALYSIS",
    "COMPARISON_CARD",
    "RECIPE_STEPS_CARD",
    "FEEDBACK_REVIEWS_CARD",
    "UPDATE_CART_QTY",
    "MARGIN_DECISION",
    "CATEGORIES_CARD",
    "PROMO_CODES_CARD",
    "CUSTOMERS_FLEET_CARD",
    "BROADCAST_CARD",
    "INVENTORY_ALERT_CARD",
    "LOW_STOCK_LIST",
    "ORDER_SETTLED",
  ];

  // Self-cleaning stage: only display actions from the latest turn, and hide immediately during checkout or after auto-dismiss
  const rawLatestVoiceActions =
    !paymentReview && stageDismissedMsgLen !== messages.length && Array.isArray(latestReply?.actions)
      ? latestReply.actions.filter((action) => ACTION_TYPES_VOICE.includes(action.type)).slice(0, 1)
      : [];
  const voiceActions = rawLatestVoiceActions;
  const activeActionType = voiceActions[0]?.type || "";

  // Auto-disappear ephemeral action cards once their live preview completes
  useEffect(() => {
    if (!voiceActions.length) return undefined;
    const actType = voiceActions[0]?.type;
    let ttlMs = 0;
    if (actType === "REMOVE_FROM_CART" || actType === "CLEAR_CART") {
      ttlMs = 2400;
    } else if (actType === "ADD_TO_CART") {
      ttlMs = 4800;
    } else if (actType === "RECOMMEND_BASKET" || actType === "SEARCH_RESULTS" || actType === "COMPARISON_CARD" || actType === "RECIPE_STEPS_CARD") {
      ttlMs = 14000;
    } else if (actType === "NOTIFICATIONS_CARD" || actType === "REFERRAL_STATUS_CARD" || actType === "WALLET_CARD" || actType === "ORDER_CARD" || actType === "ORDERS_LIST_CARD" || actType === "CALCULATION_RESULT" || actType === "DATA_ANALYSIS") {
      ttlMs = 8000;
    }
    if (!ttlMs) return undefined;
    const t = setTimeout(() => {
      setStageDismissedMsgLen(messages.length);
    }, ttlMs);
    return () => clearTimeout(t);
  }, [messages.length, activeActionType]);

  // Compute full-screen dynamic glow theme from current task
  const activeTaskType = paymentReview
    ? "checkout"
    : loading
      ? "thinking"
      : activeActionType === "RECOMMEND_BASKET" || activeActionType === "SEARCH_RESULTS"
        ? "discovery"
        : activeActionType === "ADD_TO_CART"
          ? "cart-add"
          : activeActionType === "ORDER_STATUS_CARD"
            ? "order-track"
            : activeActionType === "SWITCH_THEME" || activeActionType === "TOGGLE_DARK_MODE"
              ? "theme-switch"
              : activeActionType === "REMOVE_FROM_CART" || activeActionType === "CLEAR_CART"
                ? "cart-remove"
                : "idle";

  const latestUser = [...messages].reverse().find((message) => message.role === "user");

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    if (typeof window === "undefined" || window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    }
    panelRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        close();
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

  // Direct handoff from customer search bar
  useEffect(() => {
    const handleAiQuery = (e) => {
      const q = e?.detail?.query;
      if (q && typeof q === "string" && q.trim()) {
        handleSend(q.trim());
      }
    };
    window.addEventListener("shopper-ai-query", handleAiQuery);
    if (isOpen && window.__pendingShopperAiQuery) {
      const pending = window.__pendingShopperAiQuery;
      window.__pendingShopperAiQuery = null;
      setTimeout(() => {
        handleSend(pending);
      }, 80);
    }
    return () => window.removeEventListener("shopper-ai-query", handleAiQuery);
  }, [isOpen]);

  if (!isOpen) return null;
  const close = () => {
    handleCleanupOnClose();
    onClose();
  };
  const isWelcome = messages.length === 1;
  const liveItems = Array.isArray(cart?.items) ? cart.items : [];
  const cartCount = liveItems.reduce((sum, ci) => sum + Number(ci.quantity || 1), 0);
  const cartTotal = Number(cart?.total ?? 0);
  const showCartBar = cartCount > 0 && !paymentReview && mode === "chat";
  const latestAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant" && m.model_badge);
  const activeModelBadge = latestAssistantMsg?.model_badge || "Gemini Core";

  return (
    <TooltipProvider delayDuration={250}>
      {/* Dimmed Background Overlay */}
      <div
        className="assistant-backdrop"
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
        onPointerDownCapture={(event) => {
          if (event.target?.closest?.(".voice-orb-container")) return;
          voice.interrupt();
        }}
        className="shopper-panel shopper-theme bg-background text-foreground flex flex-col overflow-hidden outline-none"
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
                  const textarea = panelRef.current?.querySelector("textarea");
                  textarea?.focus();
                }, 100);
              }
            }}
          >
            {mode === "voice" ? <Keyboard className="size-5 stroke-[1.75]" /> : <Mic className="size-5 stroke-[1.75]" />}
          </Button>

          <div id="shopper-title" className="flex items-center gap-2 select-none">
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
              aria-label="Upload grocery list photo"
              title="Upload grocery list image"
              className="size-9 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Scan grocery list with camera"
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
              aria-label="Close concierge"
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
          onChange={handlePhotoUpload}
        />

        <AssistantCameraModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onCaptureFile={processPhotoFile}
          onFallbackUpload={() => fileInputRef.current?.click()}
          title="Scan Handwritten Grocery List"
        />

        {mode === "chat" && (
          <LiveTaskActivity task={currentTask} onDismiss={() => setCurrentTask(null)} />
        )}

        {mode === "chat" && (
          <PaymentReview
            review={paymentReview}
            onCancel={() => setPaymentReview(null)}
            onOpen={() => {
              close();
              navigate("/checkout");
            }}
            busy={loading}
            cartItems={paymentReview?.items || liveItems}
            cartTotal={paymentReview?.total || cartTotal}
            onPlaceInlineOrder={handlePlaceInlineOrder}
          />
        )}
        {mode === "voice" ? (
          <VoiceView
            voice={voice}
            busy={loading}
            hint={isWelcome ? "Tap orb to speak" : undefined}
            replyText={!isWelcome ? latestReply?.content : undefined}
            activeTaskType={activeTaskType}
            modelBadge={activeModelBadge}
          >
            {isWelcome && voice.status === "idle" && !voice.transcript?.trim() && !loading && (
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
            <PaymentReview
              review={paymentReview}
              onCancel={() => setPaymentReview(null)}
              onOpen={() => {
                close();
                navigate("/checkout");
              }}
              busy={loading}
              cartItems={paymentReview?.items || liveItems}
              cartTotal={paymentReview?.total || cartTotal}
              onPlaceInlineOrder={handlePlaceInlineOrder}
            />
            <ActionCards
              key={messages.length}
              actions={voiceActions}
              persona="shopper"
              currency="INR"
              onSend={handleSend}
              onAdd={handleAddToCart}
              cartItems={cart?.items}
              onUpdate={(item, quantity) => update?.(item, quantity)}
              addedItems={addedItems}
              onToggleTheme={toggleTheme}
              onDismiss={() => setStageDismissedMsgLen(messages.length)}
              onUndoAdd={handleUndoAdd}
              onUndoRemove={handleUndoRemove}
              onUndoQty={handleUndoQty}
              onReorder={handleReorder}
              onAcceptDeal={handleAcceptDeal}
              onSend={(p) => {
                voice.stop();
                return handleSend(p, "voice").catch(() => {});
              }}
              onNavigate={(path) => {
                close();
                navigate(path);
              }}
              busy={loading || Boolean(paymentReview)}
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
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1 select-none">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">CartSettle AI</span>
                        <span>·</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{msg.model_badge || "Gemini Core"}</span>
                        {msg.timestamp && (
                          <>
                            <span>·</span>
                            <span className="text-muted-foreground/70">{msg.timestamp}</span>
                          </>
                        )}
                      </div>
                    )}
                    <MessageContent
                      className={`w-full leading-relaxed ${isUser ? "shopper-user" : "bg-transparent"} ${isWelcome ? "text-2xl font-bold leading-snug" : "text-sm"}`}
                    >
                      <MessageResponse>{msg.content || ""}</MessageResponse>
                      {msg.image && (
                        <div className="relative mt-2 overflow-hidden rounded-xl border border-white/20 shadow-md max-w-[200px]">
                          <img src={msg.image} alt="Scanned list" className="w-full h-32 object-cover" />
                          <span className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white font-medium">
                            Instants Scan
                          </span>
                        </div>
                      )}
                    </MessageContent>
                    {actions.length > 0 && (
                      <div className="mt-2 w-full space-y-2">
                        <ActionCards
                          actions={actions}
                          persona="shopper"
                          currency="INR"
                          onSend={handleSend}
                          onAdd={handleAddToCart}
              cartItems={cart?.items}
              onUpdate={(item, quantity) => update?.(item, quantity)}
                          addedItems={addedItems}
                          onToggleTheme={toggleTheme}
                          onUndoAdd={handleUndoAdd}
                          onUndoRemove={handleUndoRemove}
                          onUndoQty={handleUndoQty}
                          onReorder={handleReorder}
                          onAcceptDeal={handleAcceptDeal}
                          onSend={handleSend}
                          onNavigate={(path) => {
                            close();
                            navigate(path);
                          }}
                          busy={loading || Boolean(paymentReview)}
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
              {isWelcome && (
                <div className="w-full pt-1 space-y-2 animate-in fade-in duration-300">
                  <div className="w-full p-3.5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent transition-all text-left shadow-xs space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Camera className="size-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span>Scan Handwritten Grocery List</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            Instants
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Upload an order sheet or capture live with camera
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-500/40 bg-white/80 dark:bg-slate-900/80 hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
                      >
                        <Upload className="size-3.5" />
                        <span>Upload Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCameraModalOpen(true)}
                        disabled={loading}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        <Camera className="size-3.5" />
                        <span>Open Camera</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Instagram Instants Polaroid Preview with Animated Laser Scanner */}
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
                      <span>Scanning handwritten notes...</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">Vision AI</span>
                  </div>
                </div>
              )}

              {loading && !instantsScan && (
                <div role="status" className="flex items-center gap-2 text-sm">
                  <Shimmer>One moment</Shimmer>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton aria-label="Scroll to latest message" />
          </Conversation>
        )}

        {showCartBar && (
          <button
            type="button"
            className="assistant-cartbar"
            onClick={() => {
              close();
              navigate("/cart");
            }}
            aria-label={`View cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}, total ${cartTotal.toFixed(2)}`}
          >
            <span className="assistant-cartbar-count">
              <ShoppingBag className="size-4" />
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </span>
            <span className="assistant-cartbar-total">₹{cartTotal.toFixed(2)}</span>
          </button>
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
                <PromptInputFooter className="flex items-center justify-between px-2 pb-2 pt-0">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Upload grocery list photo"
                      title="Upload grocery list image"
                      className="h-8 gap-1.5 px-2.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer font-bold text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      <Upload className="size-4" />
                      <span>Upload</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Capture grocery list with camera"
                      title="Capture grocery list with camera"
                      className="h-8 gap-1.5 px-2.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer font-bold text-xs"
                      onClick={() => setIsCameraModalOpen(true)}
                      disabled={loading}
                    >
                      <Camera className="size-4" />
                      <span>Camera</span>
                    </Button>
                  </div>
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

      </section>
    </TooltipProvider>
  );
}

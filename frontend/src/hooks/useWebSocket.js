import { useEffect, useRef, useState, useCallback } from 'react';

const getBaseWsUrl = () => {
  const apiUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'https://narendra-kirana.onrender.com/api/v1';
  return apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
};

const getPrefix = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('delivery')) return 'smart-kirana-delivery';
    if (window.location.hostname.includes('owner') || window.location.hostname.includes('admin')) return 'smart-kirana-owner';
    if (window.location.pathname.startsWith('/owner')) return 'smart-kirana-owner';
    if (window.location.pathname.startsWith('/delivery')) return 'smart-kirana-delivery';
  }
  return 'smart-kirana-customer';
};

export function useWebSocket({
  path,
  enabled = true,
  onMessage,
  onOpen,
  onClose,
  onError,
  autoReconnect = true,
  heartbeatIntervalMs = 25000,
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const clearHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const clearReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const connect = useCallback(() => {
    if (!enabled || !path || typeof window === 'undefined') return;

    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {}
      socketRef.current = null;
    }

    clearReconnect();
    clearHeartbeat();

    try {
      const prefix = getPrefix();
      const token = localStorage.getItem(`${prefix}-token`);
      const baseWsUrl = getBaseWsUrl();
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const separator = cleanPath.includes('?') ? '&' : '?';
      const url = token
        ? `${baseWsUrl}${cleanPath}${separator}token=${encodeURIComponent(token)}`
        : `${baseWsUrl}${cleanPath}`;

      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onOpenRef.current?.();

        if (heartbeatIntervalMs > 0) {
          clearHeartbeat();
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: 'PING' }));
              } catch {}
            }
          }, heartbeatIntervalMs);
        }
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.type === 'PONG') return;
          setLastMessage(parsed);
          onMessageRef.current?.(parsed);
        } catch {
          setLastMessage(event.data);
          onMessageRef.current?.(event.data);
        }
      };

      ws.onerror = (err) => {
        if (!isMountedRef.current) return;
        onErrorRef.current?.(err);
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        clearHeartbeat();
        onCloseRef.current?.(event);

        if (autoReconnect && enabled && isMountedRef.current) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 16000);
          reconnectAttemptsRef.current += 1;
          clearReconnect();
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && enabled) {
              connect();
            }
          }, delay);
        }
      };
    } catch (e) {
      console.warn('[useWebSocket] Web connection error:', e);
    }
  }, [path, enabled, autoReconnect, heartbeatIntervalMs]);

  const sendMessage = useCallback((data) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      socketRef.current.send(payload);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      clearReconnect();
      clearHeartbeat();
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {}
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnect: connect,
  };
}

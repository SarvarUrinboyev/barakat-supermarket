// STOMP-over-WebSocket subscription hook.
//
// Connects once per app load, auto-reconnects with exponential backoff,
// and exposes a `subscribe(topic, handler)` cleanup-aware effect.
//
// The connection lives at the module level so every component shares
// one socket — opening N sockets per N subscribed components would
// hammer the broker.

import { Client } from '@stomp/stompjs';
import { useEffect } from 'react';

let client = null;
let connected = false;
const pending = new Set(); // {topic, handler} waiting for the socket to open
const subs = new Map();    // topic -> Set<handler>

function endpoint() {
  // Same-origin: nginx on the VPS proxies /ws → 8086. On the desktop
  // electron the backend is local, so this Just Works either way.
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || '127.0.0.1:8086';
  return `${proto}//${host}/ws`;
}

function ensureClient() {
  if (client) return client;
  client = new Client({
    brokerURL: endpoint(),
    reconnectDelay: 5000,
    heartbeatIncoming: 20000,
    heartbeatOutgoing: 20000,
    onConnect: () => {
      connected = true;
      // Replay subscriptions on reconnect.
      for (const [topic, handlers] of subs.entries()) {
        client.subscribe(topic, (frame) => {
          let payload;
          try { payload = JSON.parse(frame.body); } catch { payload = frame.body; }
          handlers.forEach((h) => { try { h(payload); } catch { /* */ } });
        });
      }
      // Drain anything queued before the socket opened.
      for (const { topic, handler } of pending) {
        subscribeNow(topic, handler);
      }
      pending.clear();
    },
    onStompError: (frame) => {
      // Broker rejected our frame — log + reconnect handles itself.
      // eslint-disable-next-line no-console
      console.warn('STOMP error', frame.headers, frame.body);
    },
    onWebSocketClose: () => { connected = false; },
  });
  client.activate();
  return client;
}

function subscribeNow(topic, handler) {
  const handlers = subs.get(topic) || new Set();
  handlers.add(handler);
  subs.set(topic, handlers);
  if (handlers.size === 1 && client) {
    client.subscribe(topic, (frame) => {
      let payload;
      try { payload = JSON.parse(frame.body); } catch { payload = frame.body; }
      handlers.forEach((h) => { try { h(payload); } catch { /* */ } });
    });
  }
}

/**
 * useRealtime('/topic/sales', (event) => { ... });
 */
export function useRealtime(topic, handler) {
  useEffect(() => {
    ensureClient();
    if (connected) {
      subscribeNow(topic, handler);
    } else {
      pending.add({ topic, handler });
    }
    return () => {
      const handlers = subs.get(topic);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) subs.delete(topic);
      }
      pending.forEach((p) => {
        if (p.topic === topic && p.handler === handler) pending.delete(p);
      });
    };
  }, [topic, handler]);
}

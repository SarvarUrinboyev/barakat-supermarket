// STOMP-over-WebSocket subscription hook.
//
// Connects once per app load, auto-reconnects with exponential backoff,
// and exposes a `subscribe(topic, handler)` cleanup-aware effect.
//
// The connection lives at the module level so every component shares one
// socket — opening N sockets per N subscribed components would hammer the
// broker.
//
// Security/tenancy (matches the backend WebSocketAuthInterceptor):
//   - the STOMP CONNECT frame carries the JWT as a Bearer header;
//   - logical topics ('/topic/sales') are auto-scoped to the active shop
//     ('/topic/shops/{shopId}/sales') so a merchant only receives its own feed.

import { Client } from '@stomp/stompjs';
import { useEffect } from 'react';
import { wsOrigin } from '../config.js';
import { getToken } from '../api/client.js';

let client = null;
let connected = false;
const pending = new Set(); // {topic, handler} waiting for the socket to open
const subs = new Map();    // resolved destination -> Set<handler>

const ACTIVE_SHOP_KEY = 'savdopro.activeShopId';

function endpoint() {
  return `${wsOrigin()}/ws`;
}

/** Bearer headers for the STOMP CONNECT frame (the backend authenticates it). */
function connectHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Map a logical topic ('/topic/sales') to the tenant-scoped destination the
 * backend publishes to ('/topic/shops/{shopId}/sales'). In consolidated "ALL"
 * mode (or with no active shop) we leave it un-scoped — realtime is a
 * convenience and the REST data is always authoritative.
 */
function resolveDestination(topic) {
  const shopId = localStorage.getItem(ACTIVE_SHOP_KEY);
  if (shopId && shopId !== 'ALL'
      && topic.startsWith('/topic/') && !topic.startsWith('/topic/shops/')) {
    return `/topic/shops/${shopId}/${topic.slice('/topic/'.length)}`;
  }
  return topic;
}

function fanOut(handlers) {
  return (frame) => {
    let payload;
    try { payload = JSON.parse(frame.body); } catch { payload = frame.body; }
    handlers.forEach((h) => { try { h(payload); } catch { /* */ } });
  };
}

function ensureClient() {
  if (client) return client;
  client = new Client({
    brokerURL: endpoint(),
    reconnectDelay: 5000,
    heartbeatIncoming: 20000,
    heartbeatOutgoing: 20000,
    // Refresh the bearer on every (re)connect so a rotated token still
    // authenticates after a socket drop.
    beforeConnect: () => { client.connectHeaders = connectHeaders(); },
    onConnect: () => {
      connected = true;
      // Replay subscriptions on reconnect.
      for (const [dest, handlers] of subs.entries()) {
        client.subscribe(dest, fanOut(handlers));
      }
      // Drain anything queued before the socket opened.
      for (const { topic, handler } of pending) {
        subscribeNow(topic, handler);
      }
      pending.clear();
    },
    onStompError: (frame) => {
      // Broker rejected our frame (e.g. bad token / forbidden shop).
      // eslint-disable-next-line no-console
      console.warn('STOMP error', frame.headers, frame.body);
    },
    onWebSocketClose: () => { connected = false; },
  });
  client.activate();
  return client;
}

function subscribeNow(dest, handler) {
  const handlers = subs.get(dest) || new Set();
  handlers.add(handler);
  subs.set(dest, handlers);
  if (handlers.size === 1 && client) {
    client.subscribe(dest, fanOut(handlers));
  }
}

/**
 * useRealtime('/topic/sales', (event) => { ... });
 * The topic is auto-scoped to the active shop.
 */
export function useRealtime(topic, handler) {
  useEffect(() => {
    const dest = resolveDestination(topic);
    ensureClient();
    if (connected) {
      subscribeNow(dest, handler);
    } else {
      pending.add({ topic: dest, handler });
    }
    return () => {
      const handlers = subs.get(dest);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) subs.delete(dest);
      }
      pending.forEach((p) => {
        if (p.topic === dest && p.handler === handler) pending.delete(p);
      });
    };
  }, [topic, handler]);
}

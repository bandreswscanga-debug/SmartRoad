const crypto = require('crypto');

const TICKET_TTL_MS = 30_000;
const MAX_TICKETS = 500;

function createTicketStore({ ttlMs = TICKET_TTL_MS, maxTickets = MAX_TICKETS } = {}) {
  const tickets = new Map();

  function prune() {
    const now = Date.now();
    for (const [id, record] of tickets) {
      if (record.expiresAt <= now) tickets.delete(id);
    }
    while (tickets.size >= maxTickets) {
      const oldest = tickets.keys().next().value;
      if (oldest === undefined) break;
      tickets.delete(oldest);
    }
  }

  function issue(claims = {}) {
    prune();
    const id = crypto.randomBytes(24).toString('base64url');
    const expiresAt = Date.now() + ttlMs;
    tickets.set(id, { claims, expiresAt });
    return { ticket: id, expira_en_ms: ttlMs, expira_en: new Date(expiresAt).toISOString() };
  }

  /** Un ticket es de un solo uso: se elimina en el primer intento, válido o no. */
  function consume(id) {
    if (!id || typeof id !== 'string') return null;
    const record = tickets.get(id);
    tickets.delete(id);
    if (!record) return null;
    if (record.expiresAt <= Date.now()) return null;
    return record.claims;
  }

  return { issue, consume, size: () => tickets.size };
}

module.exports = { createTicketStore, TICKET_TTL_MS };

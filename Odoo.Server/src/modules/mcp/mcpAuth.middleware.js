/**
 * Bearer API key auth for /api/mcp/* (ADR-0007).
 * Does not replace session authMiddleware for /api/admin.
 */
import bcrypt from 'bcrypt';
import { ApiKey } from './apiKey.model.js';

function parseBearer(req) {
  const h = req.get('authorization') || req.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : '';
}

function parseKey(raw) {
  // ck_live_<prefix>_<secret>
  const parts = String(raw || '').split('_');
  if (parts.length < 4 || parts[0] !== 'ck' || parts[1] !== 'live') return null;
  const prefix = parts[2];
  const secret = parts.slice(3).join('_');
  if (!prefix || !secret) return null;
  return { prefix, secret, raw };
}

export function requireMcpAuth(requiredScope = 'mcp.read') {
  return async (req, res, next) => {
    try {
      const token = parseBearer(req);
      const parsed = parseKey(token);
      if (!parsed) {
        return res.status(401).json({
          isOk: false,
          status: 401,
          message: 'Missing or invalid MCP API key',
          error: 'UNAUTHENTICATED',
        });
      }

      const doc = await ApiKey.findOne({ prefix: parsed.prefix }).lean();
      if (!doc || doc.revokedAt) {
        return res.status(401).json({
          isOk: false,
          status: 401,
          message: 'API key revoked or unknown',
          error: 'UNAUTHENTICATED',
        });
      }
      if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
        return res.status(401).json({
          isOk: false,
          status: 401,
          message: 'API key expired',
          error: 'UNAUTHENTICATED',
        });
      }

      const ok = await bcrypt.compare(parsed.secret, doc.secretHash);
      if (!ok) {
        return res.status(401).json({
          isOk: false,
          status: 401,
          message: 'Invalid API key',
          error: 'UNAUTHENTICATED',
        });
      }

      const scopes = doc.scopes || [];
      const scopeRank = { 'mcp.read': 1, 'mcp.write': 2, 'mcp.admin': 3 };
      const have = Math.max(0, ...scopes.map((s) => scopeRank[s] || 0));
      const need = scopeRank[requiredScope] || 1;
      if (have < need) {
        return res.status(403).json({
          isOk: false,
          status: 403,
          message: `Scope ${requiredScope} required`,
          error: { code: 'FORBIDDEN', details: { scopes } },
        });
      }

      // fire-and-forget lastUsed
      ApiKey.updateOne({ _id: doc._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});

      const user = {
        id: doc.actingUserId,
        role: doc.actingRole || 'ADMIN',
        email: doc.actingUserEmail || '',
        name: doc.actingUserName || doc.name,
        stringPermissions: doc.stringPermissions || [],
      };

      req.user = user;
      req.apiKey = {
        id: String(doc._id),
        name: doc.name,
        prefix: doc.prefix,
        scopes,
      };
      req.ctx = {
        user,
        permissions: new Set(user.stringPermissions || []),
        requestId: req.requestId || req.id,
        ip: req.ip,
        source: 'mcp',
        apiKeyId: String(doc._id),
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export default { requireMcpAuth };

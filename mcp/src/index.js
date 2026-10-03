/**
 * Hosted MCP HTTP — Streamable HTTP at /mcp (ChatGPT / remote Claude).
 * Patterns adapted from project360-mcp-server (do not import that package).
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './config.js';
import { ArambhApiClient } from './apiClient.js';
import { createArambhMcpServer } from './createServer.js';

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    name: config.name,
    version: config.version,
    apiUrl: config.apiUrl,
    hasApiKey: Boolean(config.apiKey),
    mcpUrl: `${config.publicUrl}/mcp`,
  });
});

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html><head><title>Arambh MCP</title>
<style>body{font-family:system-ui;max-width:640px;margin:2rem auto;padding:0 1rem;line-height:1.5}
code{background:#eef5f0;padding:.1rem .35rem;border-radius:4px}</style>
</head><body>
<h1>Arambh Sports Arena MCP</h1>
<p>Admin management tools for ChatGPT / Claude. Backend: <code>${config.apiUrl}</code></p>
<p>Connector URL: <code>${config.publicUrl}/mcp</code></p>
<p>Health: <a href="/healthz">/healthz</a> · See <code>mcp/CONNECT.md</code></p>
</body></html>`);
});

/** @type {Map<string, StreamableHTTPServerTransport>} */
const transports = new Map();

function requireConfiguredKey(req, res, next) {
  if (!config.apiKey) {
    return res.status(503).json({
      error: 'ARAMBH_MCP_API_KEY not configured on MCP host',
    });
  }
  // Optional: allow client to override with its own key
  const auth = req.get('authorization') || '';
  const m = /^Bearer\s+(ck_live_.+)$/i.exec(auth);
  req.mcpApiKey = m ? m[1] : config.apiKey;
  return next();
}

app.all('/mcp', requireConfiguredKey, async (req, res) => {
  try {
    const sessionId = req.get('mcp-session-id');
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      const client = new ArambhApiClient(req.mcpApiKey, config.apiUrl);
      const server = createArambhMcpServer({ client });
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports.set(sid, transport);
        },
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) transports.delete(sid);
      };
      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('[mcp] handle error', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'MCP error' });
    }
  }
});

app.listen(config.port, config.host, () => {
  console.error(
    `[arambh-mcp] listening on http://${config.host}:${config.port}/mcp → API ${config.apiUrl}`,
  );
});

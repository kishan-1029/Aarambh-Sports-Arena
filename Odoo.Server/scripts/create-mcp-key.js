/**
 * Create a demo MCP API key (owner scopes) without admin UI.
 * Usage: node scripts/create-mcp-key.js "Claude desktop"
 */
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { createApiKey } from '../src/modules/mcp/mcp.service.js';
import { ROLE_PERMISSIONS } from '../src/modules/auth/permissions.js';

const name = process.argv[2] || 'Demo MCP key';

await connectDb();
const data = await createApiKey(
  {
    name,
    scopes: ['mcp.read', 'mcp.write'],
    expiresInDays: 90,
  },
  {
    id: 'seed-owner',
    role: 'ADMIN',
    email: 'owner@arambh.local',
    name: 'Owner',
    stringPermissions: [...ROLE_PERMISSIONS.owner],
  },
);
console.log(JSON.stringify(data, null, 2));
console.log('\nCopy apiKey into mcp/.env as ARAMBH_MCP_API_KEY');
await disconnectDb();

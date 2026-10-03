/**
 * stdio transport for Claude Desktop / Cursor.
 * Logs go to stderr only.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './config.js';
import { ArambhApiClient } from './apiClient.js';
import { createArambhMcpServer } from './createServer.js';

async function main() {
  if (!config.apiKey) {
    console.error('ARAMBH_MCP_API_KEY is required for stdio MCP');
    process.exit(1);
  }
  const client = new ArambhApiClient(config.apiKey, config.apiUrl);
  const server = createArambhMcpServer({ client });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[arambh-mcp] stdio ready → ${config.apiUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

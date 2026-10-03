import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { config } from './config.js';
import { toToolText, toToolError, formatPaise } from './format.js';

const INSTRUCTIONS = `Arambh Sports Arena admin MCP.
All money is integer paise (divide by 100 for ₹). Times are Asia/Kolkata (IST).
Read tools are safe. Write tools only PREPARE an action and return confirmation_required —
call confirm_action only after the human explicitly approves the summary in their latest message.
Never invent revenue or booking numbers; always call a tool.`;

/**
 * @param {{ client: import('./apiClient.js').ArambhApiClient }} ctx
 */
export function createArambhMcpServer(ctx) {
  const server = new McpServer(
    { name: config.name, version: config.version },
    { instructions: INSTRUCTIONS },
  );

  server.tool(
    'get_club_summary',
    'Club pulse for today/MTD: revenue, collections, bookings, members, courts, leads. Times IST.',
    { period: z.enum(['today', 'week', 'month']).optional() },
    async ({ period }) => {
      try {
        const data = await ctx.client.get('/api/mcp/club-summary', { period });
        const text = [
          `Arambh summary (${data.period?.today || 'today'} IST)`,
          `Earned today: ${formatPaise(data.earnedPaise)} · MTD: ${formatPaise(data.earnedMonthPaise)}`,
          `Collected today: ${formatPaise(data.collectedTodayPaise)} · MTD: ${formatPaise(data.collectedMonthPaise)}`,
          `Bookings today: ${data.bookingsToday} · week: ${data.bookingsWeek} · util ~${data.occupancyHintPct}%`,
          `Active members: ${data.membersActive} · expiring ≤7d: ${data.membershipsExpiringSoon}`,
          `Courts online: ${data.courtsActive} · open leads: ${data.leadsOpen}`,
          '',
          JSON.stringify(data),
        ].join('\n');
        return toToolText(text);
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.tool(
    'get_revenue',
    'Revenue breakdown. groupBy=day returns last 7 days; stream/method note Phase 13.',
    {
      period: z.enum(['today', 'week', 'month']).optional(),
      groupBy: z.enum(['stream', 'day', 'method']).optional(),
    },
    async (args) => {
      try {
        const data = await ctx.client.get('/api/mcp/revenue', args);
        return toToolText(data, { title: 'Revenue (IST)' });
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.tool(
    'get_booking_summary',
    'Booking counts, status and sport mix.',
    { period: z.enum(['today', 'week', 'month']).optional() },
    async (args) => {
      try {
        return toToolText(await ctx.client.get('/api/mcp/booking-summary', args));
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.tool(
    'get_court_availability',
    'Free/busy court slots for a local date (YYYY-MM-DD IST).',
    {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      sportId: z.string().optional(),
    },
    async (args) => {
      try {
        return toToolText(await ctx.client.get('/api/mcp/court-availability', args));
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.tool(
    'search_members',
    'Search members by name, phone or member code (top 10).',
    {
      query: z.string().min(1),
      tier: z.string().optional(),
      status: z.string().optional(),
    },
    async (args) => {
      try {
        return toToolText(await ctx.client.get('/api/mcp/members/search', args));
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.tool(
    'get_member',
    'Member profile by id or memberCode.',
    {
      memberId: z.string().optional(),
      memberCode: z.string().optional(),
    },
    async (args) => {
      try {
        return toToolText(await ctx.client.get('/api/mcp/members/one', args));
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.tool(
    'get_expiring_memberships',
    'Memberships ending within N days.',
    { withinDays: z.number().int().min(1).max(90).optional() },
    async (args) => {
      try {
        return toToolText(await ctx.client.get('/api/mcp/memberships/expiring', args));
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.tool(
    'get_financial_summary',
    'Quick finance snapshot (posted invoice totals today + MTD).',
    {},
    async () => {
      try {
        const data = await ctx.client.get('/api/mcp/finance/snapshot');
        const text = `Finance IST — today ${formatPaise(data.todayPaise)}, MTD ${formatPaise(data.monthPaise)}\n${JSON.stringify(data)}`;
        return toToolText(text);
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.tool(
    'create_booking',
    'PREPARE a booking. Returns confirmation_required — do not assume created until confirm_action.',
    {
      courtId: z.string(),
      startUtc: z.string(),
      memberId: z.string().optional(),
      type: z.enum(['member', 'walk_in', 'trial', 'admin']).optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      paymentMode: z.enum(['cash', 'card', 'upi', 'online', 'mock']).optional(),
    },
    async (args) => {
      try {
        return toToolText(
          await ctx.client.post('/api/mcp/actions/prepare-create-booking', args),
        );
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.tool(
    'cancel_booking',
    'PREPARE booking cancel. Requires confirm_action after user approval.',
    {
      bookingId: z.string(),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        return toToolText(
          await ctx.client.post('/api/mcp/actions/prepare-cancel-booking', args),
        );
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.tool(
    'confirm_action',
    'Execute a prepared write after the user explicitly approved the summary.',
    {
      confirmationId: z.string(),
      reason: z.string().optional(),
    },
    async (args) => {
      try {
        return toToolText(await ctx.client.post('/api/mcp/actions/confirm', args));
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  server.tool(
    'cancel_action',
    'Discard a pending confirmation.',
    { confirmationId: z.string() },
    async (args) => {
      try {
        return toToolText(await ctx.client.post('/api/mcp/actions/cancel', args));
      } catch (err) {
        return toToolError(err);
      }
    },
  );

  return server;
}

export default createArambhMcpServer;

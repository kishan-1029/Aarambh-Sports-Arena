const listQuery = [
  { name: "page", in: "query", schema: { type: "integer", default: 1 } },
  { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
  { name: "sort", in: "query", schema: { type: "string" } },
  { name: "q", in: "query", schema: { type: "string" }, description: "Search text" },
];

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
};

const ok = (description = "Success") => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/SuccessResponse" },
    },
  },
});

const err = (description) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
    },
  },
});

const jsonBody = (properties, required) => ({
  required: true,
  content: {
    "application/json": {
      schema: { type: "object", required, properties },
    },
  },
});

function op({
  tags,
  summary,
  description,
  security,
  parameters,
  requestBody,
  responses,
}) {
  const doc = {
    tags,
    summary,
    description,
    responses: {
      200: ok(),
      400: err("Validation error"),
      401: err("Authentication required"),
      403: err("Permission denied"),
      ...responses,
    },
  };
  if (security === false) doc.security = [];
  else if (security) doc.security = security;
  if (parameters) doc.parameters = parameters;
  if (requestBody) doc.requestBody = requestBody;
  return doc;
}

export const arambhPaths = {
  "/api": {
    get: op({
      tags: ["Health"],
      summary: "API ping",
      description: "Public liveness check. No auth. Safe to demo.",
      security: false,
      responses: {
        200: {
          description: "API is up",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "ok" },
                  message: { type: "string" },
                  database: { type: "string", example: "Connected" },
                  timestamp: { type: "string" },
                },
              },
            },
          },
        },
      },
    }),
  },
  "/api/health": {
    get: op({
      tags: ["Health"],
      summary: "Liveness",
      security: false,
    }),
  },
  "/api/health/ready": {
    get: op({
      tags: ["Health"],
      summary: "Readiness (Mongo connected)",
      security: false,
    }),
  },

  "/api/public/club": {
    get: op({
      tags: ["Public"],
      summary: "Club profile for the website",
      security: false,
    }),
  },
  "/api/public/sports": {
    get: op({
      tags: ["Public"],
      summary: "Sports offered",
      security: false,
    }),
  },
  "/api/public/membership-plans": {
    get: op({
      tags: ["Public"],
      summary: "Public membership plans",
      security: false,
    }),
  },
  "/api/public/blogs": {
    get: op({
      tags: ["Public"],
      summary: "Published blogs",
      security: false,
      parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }],
    }),
  },
  "/api/public/availability": {
    get: op({
      tags: ["Public"],
      summary: "Free/busy court availability (no PII)",
      security: false,
      parameters: [
        {
          name: "localDate",
          in: "query",
          required: true,
          schema: { type: "string", example: "2026-10-04" },
        },
        { name: "sportId", in: "query", schema: { type: "string" } },
        { name: "days", in: "query", schema: { type: "integer", default: 1 } },
      ],
    }),
  },
  "/api/public/enquiries": {
    post: op({
      tags: ["Public"],
      summary: "Submit a contact enquiry",
      security: false,
      requestBody: jsonBody(
        {
          name: { type: "string", example: "Aditya" },
          phone: { type: "string", example: "9876543210" },
          email: { type: "string", example: "guest@example.com" },
          message: { type: "string", example: "Looking for a padel trial" },
          interest: { type: "array", items: { type: "string" }, example: ["padel"] },
        },
        ["name", "phone"],
      ),
      responses: { 201: ok("Enquiry created") },
    }),
  },
  "/api/public/trials": {
    post: op({
      tags: ["Public"],
      summary: "Book a trial lead",
      security: false,
      requestBody: jsonBody(
        {
          name: { type: "string", example: "Aditya" },
          phone: { type: "string", example: "9876543210" },
          email: { type: "string" },
          sportId: { type: "string" },
          localDate: { type: "string", example: "2026-10-05" },
          message: { type: "string" },
        },
        ["name", "phone"],
      ),
      responses: { 201: ok("Trial created") },
    }),
  },
  "/api/public/shop/categories": {
    get: op({ tags: ["Public Shop"], summary: "Shop categories", security: false }),
  },
  "/api/public/shop/brands": {
    get: op({ tags: ["Public Shop"], summary: "Shop brands", security: false }),
  },
  "/api/public/shop/products": {
    get: op({
      tags: ["Public Shop"],
      summary: "Browse products (guest or member pricing)",
      security: false,
      parameters: [
        { name: "category", in: "query", schema: { type: "string" } },
        { name: "q", in: "query", schema: { type: "string" } },
        { name: "sort", in: "query", schema: { type: "string", example: "featured" } },
        { name: "availability", in: "query", schema: { type: "string" } },
        { name: "brand", in: "query", schema: { type: "string" } },
        { name: "pageSize", in: "query", schema: { type: "integer" } },
      ],
    }),
  },
  "/api/public/shop/products/{slug}": {
    get: op({
      tags: ["Public Shop"],
      summary: "Product detail",
      security: false,
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
    }),
  },
  "/api/public/auth/register": {
    post: op({
      tags: ["Portal Auth"],
      summary: "Member self-register",
      security: false,
      requestBody: jsonBody(
        {
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          password: { type: "string" },
        },
        ["email", "password"],
      ),
      responses: { 201: ok("Registered") },
    }),
  },
  "/api/public/auth/login": {
    post: op({
      tags: ["Portal Auth"],
      summary: "Member login (returns Bearer token)",
      security: false,
      requestBody: jsonBody(
        {
          email: { type: "string", example: "member@example.com" },
          password: { type: "string" },
        },
        ["email", "password"],
      ),
    }),
  },
  "/api/public/auth/me": {
    get: op({
      tags: ["Portal Auth"],
      summary: "Current portal member",
      security: [{ bearerAuth: [] }],
    }),
  },

  "/api/v1/auth/company/login": {
    post: op({
      tags: ["Auth"],
      summary: "Club admin / employee login (sets sessionId cookie)",
      description:
        "Use this first for admin Try it out. Swagger sends the session cookie on later calls. Body: `{ email, password }`.",
      security: false,
      requestBody: { $ref: "#/components/requestBodies/Login" },
    }),
  },

  "/api/admin/dashboard": {
    get: op({
      tags: ["Dashboard"],
      summary: "Admin dashboard KPIs",
      parameters: [
        { name: "period", in: "query", schema: { type: "string" } },
        { name: "from", in: "query", schema: { type: "string" } },
        { name: "to", in: "query", schema: { type: "string" } },
      ],
    }),
  },

  "/api/admin/members": {
    get: op({
      tags: ["Members"],
      summary: "List members",
      parameters: [
        ...listQuery,
        { name: "status", in: "query", schema: { type: "string" } },
        { name: "tier", in: "query", schema: { type: "string" } },
      ],
    }),
    post: op({
      tags: ["Members"],
      summary: "Register a member",
      requestBody: jsonBody(
        {
          firstName: { type: "string", example: "Dimple" },
          lastName: { type: "string" },
          phone: { type: "string", example: "8456546595" },
          email: { type: "string" },
          source: { type: "string", example: "front_desk" },
        },
        ["firstName"],
      ),
      responses: { 201: ok("Member registered") },
    }),
  },
  "/api/admin/members/search": {
    get: op({
      tags: ["Members"],
      summary: "Typeahead member search",
      parameters: [
        { name: "q", in: "query", required: true, schema: { type: "string" } },
        { name: "fullPhone", in: "query", schema: { type: "boolean" } },
      ],
    }),
  },
  "/api/admin/members/{id}": {
    get: op({ tags: ["Members"], summary: "Member 360", parameters: [idParam] }),
    patch: op({
      tags: ["Members"],
      summary: "Update member",
      parameters: [idParam],
      requestBody: jsonBody({
        firstName: { type: "string" },
        lastName: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
      }),
    }),
  },
  "/api/admin/members/{id}/timeline": {
    get: op({
      tags: ["Members"],
      summary: "Member timeline",
      parameters: [
        idParam,
        { name: "cursor", in: "query", schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer" } },
      ],
    }),
  },
  "/api/admin/members/{id}/qr": {
    get: op({ tags: ["Members"], summary: "QR token", parameters: [idParam] }),
  },
  "/api/admin/members/{id}/archive": {
    post: op({ tags: ["Members"], summary: "Archive member", parameters: [idParam] }),
  },

  "/api/admin/membership-plans": {
    get: op({ tags: ["Membership"], summary: "List plans", parameters: listQuery }),
    post: op({
      tags: ["Membership"],
      summary: "Create plan",
      requestBody: jsonBody(
        {
          name: { type: "string" },
          key: { type: "string" },
          pricePaise: { type: "integer", example: 199900 },
        },
        ["name"],
      ),
      responses: { 201: ok("Plan created") },
    }),
  },
  "/api/admin/membership-plans/{id}": {
    get: op({ tags: ["Membership"], summary: "Get plan", parameters: [idParam] }),
    patch: op({
      tags: ["Membership"],
      summary: "Update plan (versions if in use)",
      parameters: [idParam],
      requestBody: jsonBody({
        name: { type: "string" },
        pricePaise: { type: "integer" },
      }),
    }),
  },
  "/api/admin/membership-plans/{id}/archive": {
    post: op({ tags: ["Membership"], summary: "Archive plan", parameters: [idParam] }),
  },
  "/api/admin/memberships": {
    get: op({ tags: ["Membership"], summary: "List memberships", parameters: listQuery }),
    post: op({
      tags: ["Membership"],
      summary: "Purchase membership",
      requestBody: jsonBody(
        {
          memberId: { type: "string" },
          planId: { type: "string" },
        },
        ["memberId", "planId"],
      ),
      responses: { 201: ok("Purchased") },
    }),
  },
  "/api/admin/memberships/{id}/renew": {
    post: op({
      tags: ["Membership"],
      summary: "Renew",
      parameters: [idParam],
      requestBody: jsonBody({ months: { type: "integer", example: 12 } }),
    }),
  },
  "/api/admin/memberships/{id}/upgrade": {
    post: op({
      tags: ["Membership"],
      summary: "Upgrade",
      parameters: [idParam],
      requestBody: jsonBody({ planId: { type: "string" } }, ["planId"]),
    }),
  },
  "/api/admin/memberships/{id}/cancel": {
    post: op({
      tags: ["Membership"],
      summary: "Cancel",
      parameters: [idParam],
      requestBody: jsonBody({ reason: { type: "string" } }),
    }),
  },

  "/api/admin/sports": {
    get: op({ tags: ["Facilities"], summary: "List sports", parameters: listQuery }),
    post: op({
      tags: ["Facilities"],
      summary: "Create sport",
      requestBody: jsonBody({ name: { type: "string" }, key: { type: "string" } }, ["name"]),
      responses: { 201: ok() },
    }),
  },
  "/api/admin/sports/{id}": {
    patch: op({
      tags: ["Facilities"],
      summary: "Update sport",
      parameters: [idParam],
      requestBody: jsonBody({ name: { type: "string" }, active: { type: "boolean" } }),
    }),
  },
  "/api/admin/courts": {
    get: op({ tags: ["Facilities"], summary: "List courts", parameters: listQuery }),
    post: op({
      tags: ["Facilities"],
      summary: "Create court",
      requestBody: jsonBody(
        { name: { type: "string" }, sportId: { type: "string" } },
        ["name", "sportId"],
      ),
      responses: { 201: ok() },
    }),
  },
  "/api/admin/courts/{id}": {
    get: op({ tags: ["Facilities"], summary: "Get court", parameters: [idParam] }),
    patch: op({
      tags: ["Facilities"],
      summary: "Update court",
      parameters: [idParam],
      requestBody: jsonBody({ name: { type: "string" }, status: { type: "string" } }),
    }),
  },
  "/api/admin/court-blocks": {
    get: op({ tags: ["Facilities"], summary: "List court blocks", parameters: listQuery }),
    post: op({
      tags: ["Facilities"],
      summary: "Block a court window",
      requestBody: jsonBody(
        {
          courtId: { type: "string" },
          startUtc: { type: "string", format: "date-time" },
          endUtc: { type: "string", format: "date-time" },
          reason: { type: "string" },
        },
        ["courtId", "startUtc", "endUtc"],
      ),
      responses: { 201: ok() },
    }),
  },
  "/api/admin/court-blocks/{id}": {
    delete: op({ tags: ["Facilities"], summary: "Remove block", parameters: [idParam] }),
  },

  "/api/admin/availability": {
    get: op({
      tags: ["Bookings"],
      summary: "Staff availability",
      parameters: [
        { name: "localDate", in: "query", required: true, schema: { type: "string" } },
        { name: "sportId", in: "query", schema: { type: "string" } },
        { name: "courtIds", in: "query", schema: { type: "string" } },
        { name: "forMember", in: "query", schema: { type: "string" } },
      ],
    }),
  },
  "/api/admin/bookings/calendar": {
    get: op({
      tags: ["Bookings"],
      summary: "Day calendar for front desk",
      parameters: [
        { name: "date", in: "query", required: true, schema: { type: "string", example: "2026-10-04" } },
        { name: "sportId", in: "query", schema: { type: "string" } },
      ],
    }),
  },
  "/api/admin/bookings": {
    get: op({
      tags: ["Bookings"],
      summary: "List bookings",
      parameters: [
        ...listQuery,
        { name: "localDate", in: "query", schema: { type: "string" } },
        { name: "status", in: "query", schema: { type: "string" } },
      ],
    }),
    post: op({
      tags: ["Bookings"],
      summary: "Create booking (walk-in or member)",
      requestBody: jsonBody(
        {
          courtId: { type: "string" },
          startUtc: { type: "string", format: "date-time" },
          type: { type: "string", enum: ["member", "walk_in", "trial", "admin"] },
          paymentMode: { type: "string", enum: ["cash", "card", "upi", "desk", "free", "mock"] },
          customer: {
            type: "object",
            properties: {
              name: { type: "string" },
              phone: { type: "string" },
            },
          },
          memberId: { type: "string" },
          isDemo: { type: "boolean" },
        },
        ["courtId", "startUtc"],
      ),
      responses: { 201: ok("created") },
    }),
  },
  "/api/admin/bookings/{id}": {
    get: op({ tags: ["Bookings"], summary: "Get booking", parameters: [idParam] }),
  },
  "/api/admin/bookings/{id}/cancel": {
    post: op({
      tags: ["Bookings"],
      summary: "Cancel booking",
      parameters: [idParam],
      requestBody: jsonBody({ reason: { type: "string" } }),
    }),
  },
  "/api/admin/bookings/{id}/reschedule": {
    post: op({
      tags: ["Bookings"],
      summary: "Reschedule",
      parameters: [idParam],
      requestBody: jsonBody({ startUtc: { type: "string", format: "date-time" } }, ["startUtc"]),
    }),
  },
  "/api/admin/bookings/{id}/check-in": {
    post: op({ tags: ["Bookings"], summary: "Check in", parameters: [idParam] }),
  },
  "/api/admin/bookings/{id}/no-show": {
    post: op({ tags: ["Bookings"], summary: "Mark no-show", parameters: [idParam] }),
  },
  "/api/admin/bookings/{id}/confirm-payment": {
    post: op({ tags: ["Bookings"], summary: "Confirm payment", parameters: [idParam] }),
  },
  "/api/admin/social-sessions": {
    get: op({ tags: ["Bookings"], summary: "List social sessions", parameters: listQuery }),
    post: op({
      tags: ["Bookings"],
      summary: "Create social session",
      requestBody: jsonBody({ courtId: { type: "string" }, startUtc: { type: "string" } }),
      responses: { 201: ok() },
    }),
  },

  "/api/admin/customers": {
    get: op({ tags: ["Customers"], summary: "List customers", parameters: listQuery }),
    post: op({
      tags: ["Customers"],
      summary: "Create customer",
      requestBody: jsonBody(
        { name: { type: "string" }, phone: { type: "string" }, email: { type: "string" } },
        ["name"],
      ),
      responses: { 201: ok() },
    }),
  },
  "/api/admin/customers/{id}": {
    get: op({ tags: ["Customers"], summary: "Get customer", parameters: [idParam] }),
    patch: op({
      tags: ["Customers"],
      summary: "Update customer",
      parameters: [idParam],
      requestBody: jsonBody({
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
      }),
    }),
  },
  "/api/admin/customers/{id}/archive": {
    post: op({ tags: ["Customers"], summary: "Archive customer", parameters: [idParam] }),
  },

  "/api/admin/invoices": {
    get: op({ tags: ["Finance"], summary: "List invoices", parameters: listQuery }),
    post: op({
      tags: ["Finance"],
      summary: "Create invoice",
      requestBody: jsonBody({ customerId: { type: "string" }, lines: { type: "array", items: { type: "object" } } }),
      responses: { 201: ok() },
    }),
  },
  "/api/admin/invoices/{id}": {
    get: op({ tags: ["Finance"], summary: "Get invoice", parameters: [idParam] }),
  },
  "/api/admin/invoices/{id}/pdf": {
    get: op({ tags: ["Finance"], summary: "Invoice PDF", parameters: [idParam] }),
  },
  "/api/admin/invoices/{id}/post": {
    post: op({ tags: ["Finance"], summary: "Post invoice", parameters: [idParam] }),
  },
  "/api/admin/invoices/{id}/credit-note": {
    post: op({ tags: ["Finance"], summary: "Credit note", parameters: [idParam] }),
  },
  "/api/admin/invoices/{id}/record-payment": {
    post: op({
      tags: ["Finance"],
      summary: "Record payment (paise)",
      parameters: [idParam],
      requestBody: jsonBody(
        {
          amountPaise: { type: "integer", example: 150000 },
          method: { type: "string", example: "cash" },
        },
        ["amountPaise"],
      ),
    }),
  },
  "/api/admin/payments": {
    get: op({ tags: ["Finance"], summary: "List payments", parameters: listQuery }),
  },
  "/api/admin/payments/settings": {
    get: op({ tags: ["Finance"], summary: "Payment provider settings" }),
  },

  "/api/admin/settings": {
    get: op({ tags: ["Settings"], summary: "Club settings" }),
    patch: op({
      tags: ["Settings"],
      summary: "Patch club settings",
      requestBody: jsonBody({ clubName: { type: "string" } }),
    }),
  },
  "/api/admin/locations": {
    get: op({ tags: ["Settings"], summary: "List locations", parameters: listQuery }),
    post: op({
      tags: ["Settings"],
      summary: "Create location",
      requestBody: jsonBody({ name: { type: "string" } }, ["name"]),
      responses: { 201: ok() },
    }),
  },
  "/api/admin/locations/{id}": {
    patch: op({
      tags: ["Settings"],
      summary: "Update location",
      parameters: [idParam],
      requestBody: jsonBody({ name: { type: "string" } }),
    }),
  },
  "/api/admin/taxes": {
    get: op({ tags: ["Settings"], summary: "List taxes", parameters: listQuery }),
    post: op({
      tags: ["Settings"],
      summary: "Create tax",
      requestBody: jsonBody(
        { name: { type: "string" }, rateBps: { type: "integer", example: 1800 } },
        ["name"],
      ),
      responses: { 201: ok() },
    }),
  },
  "/api/admin/taxes/{id}": {
    patch: op({
      tags: ["Settings"],
      summary: "Update tax",
      parameters: [idParam],
      requestBody: jsonBody({ name: { type: "string" }, rateBps: { type: "integer" } }),
    }),
  },

  "/api/admin/ecommerce/dashboard": {
    get: op({ tags: ["Shop Admin"], summary: "Shop dashboard" }),
  },
  "/api/admin/product-categories": {
    get: op({ tags: ["Shop Admin"], summary: "List categories", parameters: listQuery }),
    post: op({
      tags: ["Shop Admin"],
      summary: "Create category",
      requestBody: jsonBody({ name: { type: "string" } }, ["name"]),
      responses: { 201: ok() },
    }),
  },
  "/api/admin/products": {
    get: op({ tags: ["Shop Admin"], summary: "List products", parameters: listQuery }),
    post: op({
      tags: ["Shop Admin"],
      summary: "Create product",
      requestBody: jsonBody({ name: { type: "string" } }, ["name"]),
      responses: { 201: ok() },
    }),
  },
  "/api/admin/products/{id}": {
    get: op({ tags: ["Shop Admin"], summary: "Get product", parameters: [idParam] }),
    patch: op({
      tags: ["Shop Admin"],
      summary: "Update product",
      parameters: [idParam],
      requestBody: jsonBody({ name: { type: "string" }, active: { type: "boolean" } }),
    }),
  },
  "/api/admin/inventory": {
    get: op({ tags: ["Shop Admin"], summary: "Inventory list", parameters: listQuery }),
  },
  "/api/admin/inventory/low-stock": {
    get: op({ tags: ["Shop Admin"], summary: "Low stock" }),
  },
  "/api/admin/inventory/movements": {
    get: op({ tags: ["Shop Admin"], summary: "Stock movements", parameters: listQuery }),
  },
  "/api/admin/inventory/stock-in": {
    post: op({
      tags: ["Shop Admin"],
      summary: "Stock in",
      requestBody: jsonBody(
        { productId: { type: "string" }, quantity: { type: "integer" } },
        ["productId", "quantity"],
      ),
    }),
  },
  "/api/admin/inventory/adjust": {
    post: op({
      tags: ["Shop Admin"],
      summary: "Stock adjust",
      requestBody: jsonBody(
        { productId: { type: "string" }, quantity: { type: "integer" }, reason: { type: "string" } },
        ["productId", "quantity"],
      ),
    }),
  },
  "/api/admin/shop-orders": {
    get: op({ tags: ["Shop Admin"], summary: "List shop orders", parameters: listQuery }),
  },
  "/api/admin/shop-orders/{id}": {
    get: op({ tags: ["Shop Admin"], summary: "Order detail", parameters: [idParam] }),
  },
  "/api/admin/shop-orders/{id}/status": {
    patch: op({
      tags: ["Shop Admin"],
      summary: "Update order status",
      parameters: [idParam],
      requestBody: jsonBody({ status: { type: "string" } }, ["status"]),
    }),
  },
  "/api/admin/shop-orders/{id}/cancel": {
    post: op({ tags: ["Shop Admin"], summary: "Cancel order (restores stock)", parameters: [idParam] }),
  },

  "/api/admin/pos/cafes": {
    get: op({ tags: ["POS"], summary: "List cafés" }),
    post: op({
      tags: ["POS"],
      summary: "Create café",
      requestBody: jsonBody({ name: { type: "string" } }, ["name"]),
    }),
  },
  "/api/admin/pos/products": {
    get: op({ tags: ["POS"], summary: "POS products" }),
    post: op({
      tags: ["POS"],
      summary: "Create POS product",
      requestBody: jsonBody({ name: { type: "string" }, pricePaise: { type: "integer" } }, ["name"]),
    }),
  },
  "/api/admin/pos/orders/today": {
    get: op({ tags: ["POS"], summary: "Today's POS orders" }),
  },
  "/api/admin/pos/orders/pay": {
    post: op({
      tags: ["POS"],
      summary: "Pay a POS ticket",
      requestBody: jsonBody({ cafeId: { type: "string" }, lines: { type: "array", items: { type: "object" } } }),
    }),
  },

  "/api/admin/mcp-keys": {
    get: op({ tags: ["MCP"], summary: "List MCP API keys" }),
    post: op({
      tags: ["MCP"],
      summary: "Create MCP key (shown once)",
      requestBody: jsonBody({ name: { type: "string" }, scopes: { type: "array", items: { type: "string" } } }),
      responses: { 201: ok() },
    }),
  },
  "/api/admin/mcp-keys/{id}/revoke": {
    post: op({ tags: ["MCP"], summary: "Revoke key", parameters: [idParam] }),
  },

  "/api/portal/cart": {
    get: op({ tags: ["Portal Shop"], summary: "Get cart", security: [{ bearerAuth: [] }] }),
  },
  "/api/portal/cart/items": {
    post: op({
      tags: ["Portal Shop"],
      summary: "Add cart line",
      security: [{ bearerAuth: [] }],
      requestBody: jsonBody({ productId: { type: "string" }, quantity: { type: "integer" } }, ["productId"]),
    }),
  },
  "/api/portal/checkout": {
    post: op({
      tags: ["Portal Shop"],
      summary: "Checkout",
      security: [{ bearerAuth: [] }],
      requestBody: jsonBody({
        fulfillmentType: { type: "string", example: "pickup" },
        paymentMethod: { type: "string", example: "pay_at_club" },
      }),
    }),
  },
  "/api/portal/my-orders": {
    get: op({ tags: ["Portal Shop"], summary: "My orders", security: [{ bearerAuth: [] }] }),
  },

  "/api/mcp/health": {
    get: op({ tags: ["MCP"], summary: "MCP health", security: false }),
  },
  "/api/mcp/club-summary": {
    get: op({
      tags: ["MCP"],
      summary: "Club summary",
      security: [{ mcpKey: [] }],
    }),
  },
  "/api/mcp/revenue": {
    get: op({ tags: ["MCP"], summary: "Revenue", security: [{ mcpKey: [] }] }),
  },
  "/api/mcp/booking-summary": {
    get: op({ tags: ["MCP"], summary: "Booking summary", security: [{ mcpKey: [] }] }),
  },
  "/api/mcp/court-availability": {
    get: op({ tags: ["MCP"], summary: "Court availability", security: [{ mcpKey: [] }] }),
  },
  "/api/mcp/members/search": {
    get: op({
      tags: ["MCP"],
      summary: "Search members",
      security: [{ mcpKey: [] }],
      parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
    }),
  },
};

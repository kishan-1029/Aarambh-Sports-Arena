/**
 * OpenAPI annotations for Arambh module routes (public / portal / admin).
 * Loaded by config/swagger.js via swagger-jsdoc.
 */

/**
 * @swagger
 * tags:
 *   - name: Public
 *     description: Customer website public APIs (no auth)
 *   - name: Public Auth
 *     description: Customer portal login / register
 *   - name: Portal
 *     description: Logged-in member portal (Bearer token)
 *   - name: Shop Public
 *     description: Pro Shop catalogue (optional Bearer for member pricing)
 *   - name: Shop Portal
 *     description: Cart, checkout, my orders
 *   - name: Admin Finance
 *     description: Customers, invoices, payments (session cookie)
 *   - name: Admin Ecommerce
 *     description: Pro Shop admin (session + permissions)
 *   - name: Admin POS
 *     description: Café POS (session + permissions)
 */

/**
 * @swagger
 * /api/public/club:
 *   get:
 *     tags: [Public]
 *     summary: Club profile + public feature flags
 *     responses:
 *       200:
 *         description: Club settings for the website
 */

/**
 * @swagger
 * /api/public/sports:
 *   get:
 *     tags: [Public]
 *     summary: List active sports
 *     responses:
 *       200:
 *         description: Sports list
 */

/**
 * @swagger
 * /api/public/membership-plans:
 *   get:
 *     tags: [Public]
 *     summary: Public membership plans with benefits
 *     responses:
 *       200:
 *         description: Plans including entitlements.perks / benefits lines
 */

/**
 * @swagger
 * /api/public/faqs:
 *   get:
 *     tags: [Public]
 *     summary: Active FAQs grouped by category
 *     responses:
 *       200:
 *         description: "{ categories: [{ name, faqs: [{ question, answer }] }] }"
 */

/**
 * @swagger
 * /api/public/blogs:
 *   get:
 *     tags: [Public]
 *     summary: Published blogs
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Blog list
 */

/**
 * @swagger
 * /api/public/availability:
 *   get:
 *     tags: [Public]
 *     summary: Court free/busy availability (no member PII)
 *     parameters:
 *       - in: query
 *         name: localDate
 *         schema: { type: string, example: "2026-10-04" }
 *       - in: query
 *         name: sportId
 *         schema: { type: string }
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Availability grid
 */

/**
 * @swagger
 * /api/public/enquiries:
 *   post:
 *     tags: [Public]
 *     summary: Contact Us enquiry (creates lead + thank-you email)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, email, interest, message]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               interest: { type: string, enum: [membership, trial, coaching, corporate, other] }
 *               message: { type: string }
 *               companyName: { type: string }
 *     responses:
 *       201:
 *         description: Enquiry created
 */

/**
 * @swagger
 * /api/public/trials:
 *   post:
 *     tags: [Public]
 *     summary: Book a trial request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               sportId: { type: string }
 *               courtId: { type: string }
 *               startUtc: { type: string, format: date-time }
 *               localDate: { type: string }
 *     responses:
 *       201:
 *         description: Trial lead (+ optional booking)
 */

/**
 * @swagger
 * /api/public/shop/categories:
 *   get:
 *     tags: [Shop Public]
 *     summary: Shop categories
 *     responses:
 *       200:
 *         description: Categories
 */

/**
 * @swagger
 * /api/public/shop/brands:
 *   get:
 *     tags: [Shop Public]
 *     summary: Shop brands
 *     responses:
 *       200:
 *         description: Brands
 */

/**
 * @swagger
 * /api/public/shop/products:
 *   get:
 *     tags: [Shop Public]
 *     summary: Shop products (member price if Bearer present)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product cards with memberPricePaise when eligible
 */

/**
 * @swagger
 * /api/public/shop/products/{slug}:
 *   get:
 *     tags: [Shop Public]
 *     summary: Product detail by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product detail
 */

/**
 * @swagger
 * /api/public/auth/login:
 *   post:
 *     tags: [Public Auth]
 *     summary: Customer portal login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: JWT + profile
 */

/**
 * @swagger
 * /api/public/auth/register:
 *   post:
 *     tags: [Public Auth]
 *     summary: Customer portal register
 *     responses:
 *       201:
 *         description: Account created
 */

/**
 * @swagger
 * /api/public/auth/me:
 *   get:
 *     tags: [Public Auth]
 *     summary: Current portal user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile + membership tier
 */

/**
 * @swagger
 * /api/portal/cart:
 *   get:
 *     tags: [Shop Portal]
 *     summary: Get server-priced cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart with member discounts applied
 *   put:
 *     tags: [Shop Portal]
 *     summary: Replace cart lines
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated cart
 */

/**
 * @swagger
 * /api/portal/checkout:
 *   post:
 *     tags: [Shop Portal]
 *     summary: Place Pro Shop order
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Order created (ASA-ORD-…)
 */

/**
 * @swagger
 * /api/portal/my-orders:
 *   get:
 *     tags: [Shop Portal]
 *     summary: List my shop orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders with status timeline
 */

/**
 * @swagger
 * /api/portal/my-orders/{orderNumber}:
 *   get:
 *     tags: [Shop Portal]
 *     summary: Order detail + status timeline
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderNumber
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order with timeline
 */

/**
 * @swagger
 * /api/admin/invoices:
 *   get:
 *     tags: [Admin Finance]
 *     summary: List invoices (filter by channel)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: channel
 *         description: ecom | pos | membership | booking | other
 *         schema: { type: string, enum: [ecom, pos, membership, booking, other] }
 *       - in: query
 *         name: sourceType
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Invoice page (sourceType drives channel badge)
 */

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     tags: [Admin Finance]
 *     summary: List payments (filter by channel)
 *     parameters:
 *       - in: query
 *         name: channel
 *         schema: { type: string, enum: [ecom, pos] }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment page
 */

/**
 * @swagger
 * /api/admin/customers:
 *   get:
 *     tags: [Admin Finance]
 *     summary: List customers (filter by tag / channel)
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: tag
 *         description: ecom | shop | pos | member | walk-in | portal
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Customers (tags include ecom/shop after online orders)
 */

/**
 * @swagger
 * /api/admin/ecommerce/orders/{id}/status:
 *   patch:
 *     tags: [Admin Ecommerce]
 *     summary: Update shop order status (customer timeline updates)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Status changed
 */

export default {};

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { arambhPaths } from "./swagger.arambh.paths.js";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Arambh Sports Arena API",
      version: "1.0.0",
      description: [
        "Live Try it out documentation for Arambh Sports Arena.",
        "",
        "**Public (no login):** Health, Public, Public Shop.",
        "**Admin:** first run `POST /api/v1/auth/company/login` with `{ email, password }`. The session cookie is stored and reused.",
        "**Portal:** Authorize with the Bearer token from `/api/public/auth/login`.",
        "**MCP:** Authorize with an `X-API-Key` from Club & Reports → MCP access.",
        "",
        "Money is integer paise. List endpoints accept `page`, `pageSize`, `sort`, `q`.",
      ].join("\n"),
      contact: {
        name: "Arambh Sports Arena",
      },
    },
    servers: [
      {
        url: "/",
        description: "This server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "sessionId",
          description: "Admin session cookie. Set automatically after company login.",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Portal member token from POST /api/public/auth/login",
        },
        mcpKey: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "MCP key from Club & Reports → MCP access",
        },
      },
      requestBodies: {
        Login: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
      },
      schemas: {
        // Common response schemas
        SuccessResponse: {
          type: "object",
          properties: {
            isOk: { type: "boolean", example: true },
            message: { type: "string" },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            isOk: { type: "boolean", example: false },
            message: { type: "string" },
          },
        },
        PaginatedResponse: {
          type: "object",
          properties: {
            isOk: { type: "boolean", example: true },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  data: { type: "array", items: { type: "object" } },
                  count: { type: "integer" },
                },
              },
            },
          },
        },
        SearchParams: {
          type: "object",
          properties: {
            skip: {
              type: "integer",
              default: 0,
              description: "Number of records to skip",
            },
            per_page: {
              type: "integer",
              default: 10,
              description: "Records per page",
            },
            sorton: { type: "string", description: "Field to sort on" },
            sortdir: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort direction",
            },
            match: { type: "string", description: "Search query" },
            isActive: {
              type: "boolean",
              description: "Filter by active status",
            },
          },
        },
        // Country schemas
        Country: {
          type: "object",
          properties: {
            _id: { type: "string" },
            countryName: { type: "string" },
            countryCode: { type: "string" },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateCountry: {
          type: "object",
          required: ["countryName"],
          properties: {
            countryName: { type: "string", example: "India" },
            countryCode: { type: "string", example: "IN" },
            isActive: { type: "boolean", default: true },
          },
        },
        // State schemas
        State: {
          type: "object",
          properties: {
            _id: { type: "string" },
            stateName: { type: "string" },
            stateCode: { type: "string" },
            countryId: { type: "string" },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateState: {
          type: "object",
          required: ["stateName", "countryId"],
          properties: {
            stateName: { type: "string", example: "Maharashtra" },
            stateCode: { type: "string", example: "MH" },
            countryId: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // City schemas
        City: {
          type: "object",
          properties: {
            _id: { type: "string" },
            cityName: { type: "string" },
            stateId: { type: "string" },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateCity: {
          type: "object",
          required: ["cityName", "stateId"],
          properties: {
            cityName: { type: "string", example: "Mumbai" },
            stateId: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Currency schemas
        Currency: {
          type: "object",
          properties: {
            _id: { type: "string" },
            currencyName: { type: "string" },
            currencyCode: { type: "string" },
            currencySymbol: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateCurrency: {
          type: "object",
          required: ["currencyName", "currencyCode"],
          properties: {
            currencyName: { type: "string", example: "Indian Rupee" },
            currencyCode: { type: "string", example: "INR" },
            currencySymbol: { type: "string", example: "₹" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Role schemas
        Role: {
          type: "object",
          properties: {
            _id: { type: "string" },
            roleName: { type: "string" },
            description: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateRole: {
          type: "object",
          required: ["roleName"],
          properties: {
            roleName: { type: "string", example: "Manager" },
            description: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Menu Group schemas
        MenuGroup: {
          type: "object",
          properties: {
            _id: { type: "string" },
            menuGroupName: { type: "string" },
            icon: { type: "string" },
            displayOrder: { type: "integer" },
            isActive: { type: "boolean" },
          },
        },
        CreateMenuGroup: {
          type: "object",
          required: ["menuGroupName"],
          properties: {
            menuGroupName: { type: "string", example: "Master" },
            icon: { type: "string", example: "ri-settings-line" },
            displayOrder: { type: "integer", example: 1 },
            isActive: { type: "boolean", default: true },
          },
        },
        // Menu schemas
        Menu: {
          type: "object",
          properties: {
            _id: { type: "string" },
            menuName: { type: "string" },
            menuGroupId: { type: "string" },
            parentMenuId: { type: "string" },
            menuPath: { type: "string" },
            icon: { type: "string" },
            displayOrder: { type: "integer" },
            isActive: { type: "boolean" },
          },
        },
        CreateMenu: {
          type: "object",
          required: ["menuName", "menuGroupId"],
          properties: {
            menuName: { type: "string", example: "Country" },
            menuGroupId: { type: "string" },
            parentMenuId: { type: "string" },
            menuPath: { type: "string", example: "/master/country" },
            icon: { type: "string" },
            displayOrder: { type: "integer", example: 1 },
            isActive: { type: "boolean", default: true },
          },
        },
        // Department schemas
        Department: {
          type: "object",
          properties: {
            _id: { type: "string" },
            departmentName: { type: "string" },
            description: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateDepartment: {
          type: "object",
          required: ["departmentName"],
          properties: {
            departmentName: { type: "string", example: "Sales" },
            description: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Employee schemas
        Employee: {
          type: "object",
          properties: {
            _id: { type: "string" },
            employeeName: { type: "string" },
            emailOffice: { type: "string" },
            mobileNumber: { type: "string" },
            departmentId: { type: "string" },
            roleId: { type: "string" },
            countryId: { type: "string" },
            stateId: { type: "string" },
            cityId: { type: "string" },
            address: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateEmployee: {
          type: "object",
          required: ["employeeName", "emailOffice"],
          properties: {
            employeeName: { type: "string", example: "John Doe" },
            emailOffice: { type: "string", example: "john@example.com" },
            mobileNumber: { type: "string" },
            departmentId: { type: "string" },
            roleId: { type: "string" },
            password: { type: "string" },
            countryId: { type: "string" },
            stateId: { type: "string" },
            cityId: { type: "string" },
            address: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Employee Roles schemas
        EmployeeRoles: {
          type: "object",
          properties: {
            _id: { type: "string" },
            roleId: { type: "string" },
            roles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  menuId: { type: "string" },
                  read: { type: "boolean" },
                  write: { type: "boolean" },
                  edit: { type: "boolean" },
                  delete: { type: "boolean" },
                  print: { type: "boolean" },
                  mail: { type: "boolean" },
                },
              },
            },
          },
        },
        // Email Setup schemas
        EmailSetup: {
          type: "object",
          properties: {
            _id: { type: "string" },
            emailHost: { type: "string" },
            emailPort: { type: "integer" },
            emailUser: { type: "string" },
            emailPassword: { type: "string" },
            emailFrom: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateEmailSetup: {
          type: "object",
          required: ["emailHost", "emailPort", "emailUser"],
          properties: {
            emailHost: { type: "string", example: "smtp.gmail.com" },
            emailPort: { type: "integer", example: 587 },
            emailUser: { type: "string", example: "user@gmail.com" },
            emailPassword: { type: "string" },
            emailFrom: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Email For schemas
        EmailFor: {
          type: "object",
          properties: {
            _id: { type: "string" },
            emailForName: { type: "string" },
            description: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateEmailFor: {
          type: "object",
          required: ["emailForName"],
          properties: {
            emailForName: { type: "string", example: "Welcome Email" },
            description: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Email Template schemas
        EmailTemplate: {
          type: "object",
          properties: {
            _id: { type: "string" },
            templateName: { type: "string" },
            emailForId: { type: "string" },
            emailSetupId: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateEmailTemplate: {
          type: "object",
          required: ["templateName", "emailForId"],
          properties: {
            templateName: { type: "string", example: "User Welcome" },
            emailForId: { type: "string" },
            emailSetupId: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Company schemas
        Company: {
          type: "object",
          properties: {
            _id: { type: "string" },
            companyName: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            address: { type: "string" },
            logo: { type: "string" },
            favicon: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        // Auth schemas
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "admin@example.com" },
            password: { type: "string", example: "password123" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            isOk: { type: "boolean", example: true },
            message: { type: "string" },
            token: { type: "string" },
            role: { type: "string" },
            data: { type: "object" },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
    tags: [
      { name: "Health", description: "Public liveness / readiness — try these first" },
      { name: "Public", description: "Website APIs. No staff login." },
      { name: "Public Shop", description: "Pro Shop catalogue" },
      { name: "Portal Auth", description: "Member login / register" },
      { name: "Portal Shop", description: "Member cart and checkout (Bearer)" },
      { name: "Auth", description: "Club admin / employee login" },
      { name: "Dashboard", description: "Admin KPIs" },
      { name: "Members", description: "Member 360 and search" },
      { name: "Membership", description: "Plans and memberships" },
      { name: "Facilities", description: "Sports, courts, blocks" },
      { name: "Bookings", description: "Court bookings and calendar" },
      { name: "Customers", description: "Walk-in / billed customers" },
      { name: "Finance", description: "Invoices and payments (paise)" },
      { name: "Settings", description: "Club, locations, taxes" },
      { name: "Shop Admin", description: "Catalogue, inventory, shop orders" },
      { name: "POS", description: "Café POS" },
      { name: "MCP", description: "Management MCP tools" },
      { name: "Companies", description: "Company / tenant admin" },
      { name: "Countries", description: "Country master" },
      { name: "States", description: "State master" },
      { name: "Cities", description: "City master" },
      { name: "Currencies", description: "Currency master" },
      { name: "Roles", description: "Role management" },
      { name: "Menu Groups", description: "Menu group management" },
      { name: "Menus", description: "Menu management" },
      { name: "Departments", description: "Department management" },
      { name: "Employees", description: "Employee management" },
      { name: "Employee Roles", description: "Employee role permissions" },
      { name: "Email Setup", description: "Email SMTP configuration" },
      { name: "Email For", description: "Email purpose/category management" },
      { name: "Email Templates", description: "Email template management" },
    ],
  },
  apis: ["./routes/v1/*.js"],
};

function buildSwaggerSpec() {
  const spec = swaggerJsdoc(options);
  const prefixed = {};
  for (const [pathKey, def] of Object.entries(spec.paths || {})) {
    if (pathKey.startsWith("/api/")) prefixed[pathKey] = def;
    else prefixed[`/api/v1${pathKey.startsWith("/") ? pathKey : `/${pathKey}`}`] = def;
  }
  spec.paths = { ...prefixed, ...arambhPaths };
  spec.servers = [{ url: "/", description: "This server" }];
  return spec;
}

const swaggerSpec = buildSwaggerSpec();

const swaggerUiOptions = {
  explorer: true,
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Arambh Sports Arena API",
  swaggerOptions: {
    persistAuthorization: true,
    withCredentials: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
    filter: true,
    requestInterceptor: (req) => {
      req.credentials = "include";
      return req;
    },
  },
};

export const setupSwagger = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.get("/docs", (_req, res) => res.redirect(302, "/api-docs"));

  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log("📚 Swagger UI available at /api-docs");
};

export default swaggerSpec;

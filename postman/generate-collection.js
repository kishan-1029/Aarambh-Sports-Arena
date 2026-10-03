/**
 * Builds an ordered Postman collection for Aarambh Sports Arena.
 * Run: node postman/generate-collection.js
 */
const fs = require('fs');
const path = require('path');

const SKIP = `
if (pm.collectionVariables.get('includeManual') !== 'true') {
  console.log('Skipped. Set collection variable includeManual to true to run this request.');
  pm.execution.skipRequest();
}
`.trim();

function lines(src) {
  return src.replace(/^\n/, '').replace(/\n$/, '').split('\n');
}

function tests(extra = '') {
  return `
let body = {};
try { body = pm.response.json(); } catch (e) { body = {}; }
pm.test('HTTP success', function () {
  pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});
if (body && Object.prototype.hasOwnProperty.call(body, 'isOk')) {
  pm.test('isOk true', function () { pm.expect(body.isOk).to.eql(true); });
}
${extra}`.trim();
}

function saveExpr(varName, expr) {
  return tests(`
const id = ${expr};
if (id) pm.collectionVariables.set('${varName}', String(id));
pm.test('${varName} captured', function () {
  pm.expect(pm.collectionVariables.get('${varName}'), '${varName}').to.be.a('string').and.not.empty;
});
`);
}

function saveData(varName) {
  return saveExpr(varName, 'body.data && (body.data._id || body.data.id)');
}

function saveByField(varName, field, prefix) {
  return tests(`
const wanted = '${prefix}' + pm.collectionVariables.get('runId');
const rows = Array.isArray(body.data) ? body.data : (body.data && Array.isArray(body.data.data) ? body.data.data : []);
const row = rows.find(function (r) { return r && String(r.${field} || '') === wanted; });
pm.test('found ${varName}', function () { pm.expect(row, 'match ' + wanted).to.be.an('object'); });
if (row && (row._id || row.id)) pm.collectionVariables.set('${varName}', String(row._id || row.id));
`);
}

function req(opts) {
  const {
    name,
    method = 'GET',
    url,
    body,
    form,
    test,
    manual,
    description,
    headers,
  } = opts;
  const request = {
    method,
    header: headers || (body ? [{ key: 'Content-Type', value: 'application/json' }] : []),
    url: '{{baseUrl}}' + url,
    description: description || '',
  };
  if (form) {
    request.body = { mode: 'formdata', formdata: form };
    request.header = [];
  } else if (body !== undefined) {
    request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }
  const event = [];
  if (manual) {
    event.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: lines(SKIP) } });
  }
  if (test) {
    event.push({ listen: 'test', script: { type: 'text/javascript', exec: lines(test) } });
  }
  const item = { name, request };
  if (event.length) item.event = event;
  return item;
}

const SEARCH = {
  skip: 0,
  per_page: 20,
  sorton: 'createdAt',
  sortdir: 'desc',
  match: '{{runId}}',
  isActive: true,
};

const ok = tests();

const boot = `
if (!pm.variables.get('runBooted')) {
  pm.variables.set('runBooted', '1');
  const runId = Date.now().toString(36);
  pm.collectionVariables.set('runId', runId);
  const n = Date.now().toString();
  pm.collectionVariables.set('phoneA', '9' + n.slice(-9));
  pm.collectionVariables.set('phoneB', '8' + n.slice(-9));
  pm.collectionVariables.set('phoneC', '7' + n.slice(-9));
  pm.collectionVariables.set('phoneD', '6' + n.slice(-9));
  pm.collectionVariables.set('phoneE', '5' + n.slice(-9));
  pm.collectionVariables.set('phoneF', '4' + n.slice(-9));
  pm.collectionVariables.set('phoneG', '3' + n.slice(-9));
  pm.collectionVariables.set('phoneH', '2' + n.slice(-9));
  function kolkata(dayOffset, hour, minute) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const parts = fmt.format(new Date()).split('-').map(Number);
    const ms = Date.UTC(parts[0], parts[1] - 1, parts[2] + dayOffset, hour, minute || 0) - (5.5 * 60 * 60 * 1000);
    return new Date(ms).toISOString();
  }
  function day(offset) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const parts = fmt.format(new Date()).split('-').map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + offset)).toISOString().slice(0, 10);
  }
  pm.collectionVariables.set('day2', day(2));
  pm.collectionVariables.set('day3', day(3));
  pm.collectionVariables.set('day4', day(4));
  pm.collectionVariables.set('slotA', kolkata(2, 8, 0));
  pm.collectionVariables.set('slotB', kolkata(2, 10, 0));
  pm.collectionVariables.set('slotC', kolkata(2, 12, 0));
  pm.collectionVariables.set('slotD', kolkata(2, 14, 0));
  pm.collectionVariables.set('slotE', kolkata(2, 16, 0));
  pm.collectionVariables.set('slotF', kolkata(2, 18, 0));
  pm.collectionVariables.set('slotMove', kolkata(3, 8, 0));
  pm.collectionVariables.set('slotSocialStart', kolkata(5, 8, 0));
  pm.collectionVariables.set('slotSocialEnd', kolkata(5, 10, 0));
  pm.collectionVariables.set('slotBlockStart', kolkata(4, 8, 0));
  pm.collectionVariables.set('slotBlockEnd', kolkata(4, 10, 0));
  pm.collectionVariables.set('slotMcp', kolkata(6, 8, 0));
}
`.trim();

const ordered = [];
const manual = [];

function add(target, item) {
  target.push(item);
}

add(ordered, req({ name: 'GET /api', url: '/api', test: ok }));
add(ordered, req({ name: 'GET /api/health', url: '/api/health', test: ok }));
add(ordered, req({ name: 'GET /api/health/ready', url: '/api/health/ready', test: ok }));

add(ordered, req({
  name: 'POST /api/v1/auth/company/login',
  method: 'POST',
  url: '/api/v1/auth/company/login',
  description: 'Cookie session (sessionId). Postman must save cookies. Do not log in again as an employee during this run.',
  body: {
    email: '{{adminEmail}}',
    password: '{{adminPassword}}',
    locationConsent: true,
    ipConsent: true,
    clientLatitude: '22.3072',
    clientLongitude: '73.1812',
  },
  test: tests(`
const user = body.data || body.user || body;
const id = user && (user._id || user.id || (user.user && (user.user._id || user.user.id)));
if (id) pm.collectionVariables.set('adminUserId', String(id));
`),
}));

add(ordered, req({ name: 'GET /api/v1/auth/me', url: '/api/v1/auth/me', test: ok }));
add(ordered, req({ name: 'GET /api/v1/auth/verify-session', url: '/api/v1/auth/verify-session', test: ok }));
add(ordered, req({ name: 'GET /api/v1/companies/public', url: '/api/v1/companies/public', test: ok }));
add(ordered, req({ name: 'GET /api/v1/companies/getCompanyDetails', url: '/api/v1/companies/getCompanyDetails', test: ok }));
add(ordered, req({ name: 'GET /api/v1/companies', url: '/api/v1/companies', test: ok }));
add(ordered, req({
  name: 'POST /api/v1/auth/login-status-by-email',
  method: 'POST',
  url: '/api/v1/auth/login-status-by-email',
  body: { email: '{{adminEmail}}' },
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/v1/currencies',
  method: 'POST',
  url: '/api/v1/currencies',
  body: { currencyName: 'PM Cur {{runId}}', currencyCode: 'P{{runId}}', currencySymbol: 'P', isActive: true },
  test: saveData('currencyId'),
}));
add(ordered, req({ name: 'GET /api/v1/currencies', url: '/api/v1/currencies', test: ok }));
add(ordered, req({ name: 'GET /api/v1/currencies/:id', url: '/api/v1/currencies/{{currencyId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/currencies/:id',
  method: 'PUT',
  url: '/api/v1/currencies/{{currencyId}}',
  body: { currencyName: 'PM Cur {{runId}}', currencyCode: 'P{{runId}}', currencySymbol: '₹', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/currencies/search',
  method: 'POST',
  url: '/api/v1/currencies/search',
  body: SEARCH,
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/v1/departments',
  method: 'POST',
  url: '/api/v1/departments',
  body: { departmentName: 'PM Dept {{runId}}', departmentCode: 'D{{runId}}', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'GET /api/v1/departments (capture id)',
  url: '/api/v1/departments',
  test: saveByField('departmentId', 'departmentCode', 'D'),
}));
add(ordered, req({ name: 'GET /api/v1/departments/:id', url: '/api/v1/departments/{{departmentId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/departments/:id',
  method: 'PUT',
  url: '/api/v1/departments/{{departmentId}}',
  body: { departmentName: 'PM Dept {{runId}} upd', departmentCode: 'D{{runId}}', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/departments/search',
  method: 'POST',
  url: '/api/v1/departments/search',
  body: SEARCH,
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/v1/roles',
  method: 'POST',
  url: '/api/v1/roles',
  body: { roleName: 'PM Role {{runId}}', isActive: true },
  test: saveData('roleId'),
}));
add(ordered, req({ name: 'GET /api/v1/roles', url: '/api/v1/roles', test: ok }));
add(ordered, req({ name: 'GET /api/v1/roles/admin-created', url: '/api/v1/roles/admin-created', test: ok }));
add(ordered, req({ name: 'GET /api/v1/roles/employee-created', url: '/api/v1/roles/employee-created', test: ok }));
add(ordered, req({ name: 'GET /api/v1/roles/:roleId', url: '/api/v1/roles/{{roleId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/roles/:roleId',
  method: 'PUT',
  url: '/api/v1/roles/{{roleId}}',
  body: { roleName: 'PM Role {{runId}} upd', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/roles/search',
  method: 'POST',
  url: '/api/v1/roles/search',
  body: SEARCH,
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/employee-roles',
  method: 'POST',
  url: '/api/v1/employee-roles',
  body: { roleId: '{{roleId}}', roles: [], preview: true },
  test: ok,
}));
add(ordered, req({ name: 'GET /api/v1/employee-roles/:roleId', url: '/api/v1/employee-roles/{{roleId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/employee-roles/:roleId',
  method: 'PUT',
  url: '/api/v1/employee-roles/{{roleId}}',
  body: { roleId: '{{roleId}}', roles: [], preview: true },
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/v1/countries',
  method: 'POST',
  url: '/api/v1/countries',
  description: 'Create does not return the new id. The next GET captures it by name.',
  body: { countryName: 'PM Country {{runId}}', countryCode: 'C{{runId}}', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'GET /api/v1/countries (capture id)',
  url: '/api/v1/countries',
  test: saveByField('countryId', 'countryName', 'PM Country '),
}));
add(ordered, req({ name: 'GET /api/v1/countries/:countryId', url: '/api/v1/countries/{{countryId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/countries/:countryId',
  method: 'PUT',
  url: '/api/v1/countries/{{countryId}}',
  body: { countryName: 'PM Country {{runId}}', countryCode: 'C{{runId}}', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/countries/search',
  method: 'POST',
  url: '/api/v1/countries/search',
  body: SEARCH,
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/v1/states',
  method: 'POST',
  url: '/api/v1/states',
  body: { stateName: 'PM State {{runId}}', stateCode: 'S{{runId}}', countryId: '{{countryId}}', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'GET /api/v1/states (capture id)',
  url: '/api/v1/states',
  test: saveByField('stateId', 'stateName', 'PM State '),
}));
add(ordered, req({ name: 'GET /api/v1/states/:stateId', url: '/api/v1/states/{{stateId}}', test: ok }));
add(ordered, req({ name: 'GET /api/v1/countries/:countryId/states', url: '/api/v1/countries/{{countryId}}/states', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/states/:stateId',
  method: 'PUT',
  url: '/api/v1/states/{{stateId}}',
  body: { stateName: 'PM State {{runId}}', stateCode: 'S{{runId}}', countryId: '{{countryId}}', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/states/search',
  method: 'POST',
  url: '/api/v1/states/search',
  body: SEARCH,
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/v1/cities',
  method: 'POST',
  url: '/api/v1/cities',
  body: {
    cityName: 'PM City {{runId}}',
    cityCode: 'Y{{runId}}',
    stateId: '{{stateId}}',
    countryId: '{{countryId}}',
    isActive: true,
  },
  test: ok,
}));
add(ordered, req({
  name: 'GET /api/v1/cities (capture id)',
  url: '/api/v1/cities',
  test: saveByField('cityId', 'cityName', 'PM City '),
}));
add(ordered, req({ name: 'GET /api/v1/cities/:cityId', url: '/api/v1/cities/{{cityId}}', test: ok }));
add(ordered, req({ name: 'GET /api/v1/states/:stateId/cities', url: '/api/v1/states/{{stateId}}/cities', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/cities/:cityId',
  method: 'PUT',
  url: '/api/v1/cities/{{cityId}}',
  body: {
    cityName: 'PM City {{runId}}',
    cityCode: 'Y{{runId}}',
    stateId: '{{stateId}}',
    countryId: '{{countryId}}',
    isActive: true,
  },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/cities/search',
  method: 'POST',
  url: '/api/v1/cities/search',
  body: SEARCH,
  test: ok,
}));
add(ordered, req({ name: 'GET /api/v1/locations', url: '/api/v1/locations', test: ok }));

add(ordered, req({
  name: 'POST /api/v1/menu-groups',
  method: 'POST',
  url: '/api/v1/menu-groups',
  body: { menuGroupName: 'PM Group {{runId}}', sequence: 900, isActive: true, isLink: false },
  test: saveData('menuGroupId'),
}));
add(ordered, req({ name: 'GET /api/v1/menu-groups', url: '/api/v1/menu-groups', test: ok }));
add(ordered, req({ name: 'GET /api/v1/menu-groups/:id', url: '/api/v1/menu-groups/{{menuGroupId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/menu-groups/:id',
  method: 'PUT',
  url: '/api/v1/menu-groups/{{menuGroupId}}',
  body: { menuGroupName: 'PM Group {{runId}}', sequence: 901, isActive: true, isLink: false },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/menu-groups/search',
  method: 'POST',
  url: '/api/v1/menu-groups/search',
  body: SEARCH,
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/menus',
  method: 'POST',
  url: '/api/v1/menus',
  body: {
    menuName: 'PM Menu {{runId}}',
    menuGroup: '{{menuGroupId}}',
    menuUrl: '/pm-{{runId}}',
    sequence: 1,
    isActive: true,
    isParent: true,
  },
  test: saveData('menuId'),
}));
add(ordered, req({ name: 'GET /api/v1/menus/by-groups', url: '/api/v1/menus/by-groups', test: ok }));
add(ordered, req({ name: 'GET /api/v1/menus/test', url: '/api/v1/menus/test', test: ok }));
add(ordered, req({ name: 'GET /api/v1/menus', url: '/api/v1/menus', test: ok }));
add(ordered, req({ name: 'GET /api/v1/menus/:id', url: '/api/v1/menus/{{menuId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/menus/:id',
  method: 'PUT',
  url: '/api/v1/menus/{{menuId}}',
  body: {
    menuName: 'PM Menu {{runId}} upd',
    menuGroup: '{{menuGroupId}}',
    menuUrl: '/pm-{{runId}}',
    sequence: 2,
    isActive: true,
    isParent: true,
  },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/menus/search',
  method: 'POST',
  url: '/api/v1/menus/search',
  body: SEARCH,
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/v1/blog-categories',
  method: 'POST',
  url: '/api/v1/blog-categories',
  body: { categoryName: 'PM BlogCat {{runId}}', description: 'postman', sequence: 1, isActive: true },
  test: saveData('blogCategoryId'),
}));
add(ordered, req({ name: 'GET /api/v1/blog-categories-list', url: '/api/v1/blog-categories-list', test: ok }));
add(ordered, req({ name: 'GET /api/v1/blog-categories/:id', url: '/api/v1/blog-categories/{{blogCategoryId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/blog-categories/:id',
  method: 'PUT',
  url: '/api/v1/blog-categories/{{blogCategoryId}}',
  body: { categoryName: 'PM BlogCat {{runId}}', description: 'updated', sequence: 2, isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/blog-categories-by-params',
  method: 'POST',
  url: '/api/v1/blog-categories-by-params',
  body: SEARCH,
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/blog-tags',
  method: 'POST',
  url: '/api/v1/blog-tags',
  body: { tagName: 'PM Tag {{runId}}', isActive: true },
  test: saveData('blogTagId'),
}));
add(ordered, req({ name: 'GET /api/v1/blog-tags-list', url: '/api/v1/blog-tags-list', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/blog-tags/:id',
  method: 'PUT',
  url: '/api/v1/blog-tags/{{blogTagId}}',
  body: { tagName: 'PM Tag {{runId}}', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/blog-tags-by-params',
  method: 'POST',
  url: '/api/v1/blog-tags-by-params',
  body: SEARCH,
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/blogs',
  method: 'POST',
  url: '/api/v1/blogs',
  description: 'Multipart without a file. Multer ignores JSON.',
  form: [
    { key: 'title', value: 'PM Blog {{runId}}', type: 'text' },
    { key: 'excerpt', value: 'Postman run', type: 'text' },
    { key: 'content', value: 'Body for {{runId}}', type: 'text' },
    { key: 'category', value: '{{blogCategoryId}}', type: 'text' },
    { key: 'tags', value: '{{blogTagId}}', type: 'text' },
    { key: 'author', value: 'Postman', type: 'text' },
    { key: 'status', value: 'draft', type: 'text' },
    { key: 'isActive', value: 'true', type: 'text' },
  ],
  test: saveData('blogId'),
}));
add(ordered, req({ name: 'GET /api/v1/blogs/:id', url: '/api/v1/blogs/{{blogId}}', test: ok }));
add(ordered, req({ name: 'GET /api/v1/blogs-stats', url: '/api/v1/blogs-stats', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/blogs/:id',
  method: 'PUT',
  url: '/api/v1/blogs/{{blogId}}',
  form: [
    { key: 'title', value: 'PM Blog {{runId}} upd', type: 'text' },
    { key: 'excerpt', value: 'Updated', type: 'text' },
    { key: 'content', value: 'Updated body', type: 'text' },
    { key: 'category', value: '{{blogCategoryId}}', type: 'text' },
    { key: 'status', value: 'draft', type: 'text' },
    { key: 'isActive', value: 'true', type: 'text' },
  ],
  test: ok,
}));
add(ordered, req({
  name: 'PATCH /api/v1/blogs/:id/status',
  method: 'PATCH',
  url: '/api/v1/blogs/{{blogId}}/status',
  body: { field: 'status', value: 'published' },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/blogs-by-params',
  method: 'POST',
  url: '/api/v1/blogs-by-params',
  body: SEARCH,
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/v1/faq-categories',
  method: 'POST',
  url: '/api/v1/faq-categories',
  body: { categoryName: 'PM FaqCat {{runId}}', description: 'postman', sequence: 1, isActive: true },
  test: saveData('faqCategoryId'),
}));
add(ordered, req({ name: 'GET /api/v1/faq-categories-list', url: '/api/v1/faq-categories-list', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/faq-categories/:id',
  method: 'PUT',
  url: '/api/v1/faq-categories/{{faqCategoryId}}',
  body: { categoryName: 'PM FaqCat {{runId}}', description: 'updated', sequence: 2, isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/faq-categories-by-params',
  method: 'POST',
  url: '/api/v1/faq-categories-by-params',
  body: SEARCH,
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/faqs',
  method: 'POST',
  url: '/api/v1/faqs',
  body: {
    category: '{{faqCategoryId}}',
    question: 'PM question {{runId}}',
    answer: 'PM answer',
    sequence: 1,
    isActive: true,
  },
  test: saveData('faqId'),
}));
add(ordered, req({
  name: 'PUT /api/v1/faqs/:id',
  method: 'PUT',
  url: '/api/v1/faqs/{{faqId}}',
  body: {
    category: '{{faqCategoryId}}',
    question: 'PM question {{runId}} upd',
    answer: 'Updated',
    sequence: 2,
    isActive: true,
  },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/faqs-by-params',
  method: 'POST',
  url: '/api/v1/faqs-by-params',
  body: SEARCH,
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/v1/guides',
  method: 'POST',
  url: '/api/v1/guides',
  form: [
    { key: 'title', value: 'PM Guide {{runId}}', type: 'text' },
    { key: 'type', value: 'text', type: 'text' },
    { key: 'description', value: 'Postman guide', type: 'text' },
    { key: 'sequence', value: '1', type: 'text' },
    { key: 'isActive', value: 'true', type: 'text' },
  ],
  test: saveData('guideId'),
}));
add(ordered, req({
  name: 'PUT /api/v1/guides/:id',
  method: 'PUT',
  url: '/api/v1/guides/{{guideId}}',
  form: [
    { key: 'title', value: 'PM Guide {{runId}} upd', type: 'text' },
    { key: 'type', value: 'text', type: 'text' },
    { key: 'description', value: 'Updated', type: 'text' },
    { key: 'sequence', value: '2', type: 'text' },
    { key: 'isActive', value: 'true', type: 'text' },
  ],
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/guides/list',
  method: 'POST',
  url: '/api/v1/guides/list',
  body: SEARCH,
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/v1/email-for',
  method: 'POST',
  url: '/api/v1/email-for',
  body: { emailFor: 'PM For {{runId}}', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'GET /api/v1/email-for (capture id)',
  url: '/api/v1/email-for',
  test: saveByField('emailForId', 'emailFor', 'PM For '),
}));
add(ordered, req({ name: 'GET /api/v1/email-for/:id', url: '/api/v1/email-for/{{emailForId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/email-for/:id',
  method: 'PUT',
  url: '/api/v1/email-for/{{emailForId}}',
  body: { emailFor: 'PM For {{runId}}', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/email-for/search',
  method: 'POST',
  url: '/api/v1/email-for/search',
  body: SEARCH,
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/email-to',
  method: 'POST',
  url: '/api/v1/email-to',
  body: { name: 'PM To {{runId}}', email: 'pm-to-{{runId}}@example.com', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'GET /api/v1/email-to (capture id)',
  url: '/api/v1/email-to',
  test: tests(`
const wanted = 'pm-to-' + pm.collectionVariables.get('runId') + '@example.com';
const rows = Array.isArray(body.data) ? body.data : [];
const row = rows.find(function (r) { return r && String(r.email || '') === wanted; });
pm.test('found emailToId', function () { pm.expect(row).to.be.an('object'); });
if (row && (row._id || row.id)) pm.collectionVariables.set('emailToId', String(row._id || row.id));
`),
}));
add(ordered, req({ name: 'GET /api/v1/email-to/:id', url: '/api/v1/email-to/{{emailToId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/email-to/:id',
  method: 'PUT',
  url: '/api/v1/email-to/{{emailToId}}',
  body: { name: 'PM To {{runId}}', email: 'pm-to-{{runId}}@example.com', isActive: true },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/email-to/search',
  method: 'POST',
  url: '/api/v1/email-to/search',
  body: SEARCH,
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/email-setups',
  method: 'POST',
  url: '/api/v1/email-setups',
  body: {
    email: 'pm-setup-{{runId}}@example.com',
    appPassword: 'postman-not-a-real-secret',
    SSL: true,
    port: 587,
    host: 'smtp.example.com',
    isActive: true,
  },
  test: ok,
}));
add(ordered, req({
  name: 'GET /api/v1/email-setups (capture id)',
  url: '/api/v1/email-setups',
  test: tests(`
const wanted = 'pm-setup-' + pm.collectionVariables.get('runId') + '@example.com';
const rows = Array.isArray(body.data) ? body.data : [];
const row = rows.find(function (r) { return r && String(r.email || '') === wanted; });
pm.test('found emailSetupId', function () { pm.expect(row).to.be.an('object'); });
if (row && (row._id || row.id)) pm.collectionVariables.set('emailSetupId', String(row._id || row.id));
`),
}));
add(ordered, req({ name: 'GET /api/v1/email-setups/:id', url: '/api/v1/email-setups/{{emailSetupId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/email-setups/:id',
  method: 'PUT',
  url: '/api/v1/email-setups/{{emailSetupId}}',
  body: {
    email: 'pm-setup-{{runId}}@example.com',
    appPassword: 'postman-not-a-real-secret',
    SSL: true,
    port: 587,
    host: 'smtp.example.com',
    isActive: true,
  },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/email-setups/search',
  method: 'POST',
  url: '/api/v1/email-setups/search',
  body: SEARCH,
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/email-templates',
  method: 'POST',
  url: '/api/v1/email-templates',
  body: {
    templateName: 'PM Tpl {{runId}}',
    emailFrom: '{{emailSetupId}}',
    emailFor: '{{emailForId}}',
    mailerName: 'Postman',
    emailSubject: 'Hello {{runId}}',
    emailSignature: 'PM',
    isActive: true,
    isAdmin: false,
    emailTo: '{{emailToId}}',
  },
  test: ok,
}));
add(ordered, req({
  name: 'GET /api/v1/email-templates (capture id)',
  url: '/api/v1/email-templates',
  test: saveByField('emailTemplateId', 'templateName', 'PM Tpl '),
}));
add(ordered, req({ name: 'GET /api/v1/email-templates/:id', url: '/api/v1/email-templates/{{emailTemplateId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/email-templates/:id',
  method: 'PUT',
  url: '/api/v1/email-templates/{{emailTemplateId}}',
  body: {
    templateName: 'PM Tpl {{runId}} upd',
    emailFrom: '{{emailSetupId}}',
    emailFor: '{{emailForId}}',
    mailerName: 'Postman',
    emailSubject: 'Hello {{runId}}',
    emailSignature: 'PM',
    isActive: true,
    isAdmin: false,
    emailTo: '{{emailToId}}',
  },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/email-templates/search',
  method: 'POST',
  url: '/api/v1/email-templates/search',
  body: SEARCH,
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/v1/employees',
  method: 'POST',
  url: '/api/v1/employees',
  description: 'Create does not return the id. The list request captures it. Password is only for this disposable employee.',
  body: {
    employeeName: 'PM Employee {{runId}}',
    departmentId: '{{departmentId}}',
    roleId: '{{roleId}}',
    emailOffice: 'pm-emp-{{runId}}@example.com',
    mobileNumber: '{{phoneC}}',
    countryId: '{{countryId}}',
    stateId: '{{stateId}}',
    cityId: '{{cityId}}',
    address: 'Postman address',
    password: 'PostmanEmp1!',
    isActive: true,
  },
  test: ok,
}));
add(ordered, req({
  name: 'GET /api/v1/employees (capture id)',
  url: '/api/v1/employees',
  test: tests(`
const wanted = 'pm-emp-' + pm.collectionVariables.get('runId') + '@example.com';
const rows = Array.isArray(body.data) ? body.data : (body.data && Array.isArray(body.data.data) ? body.data.data : []);
const row = rows.find(function (r) { return r && String(r.emailOffice || r.email || '') === wanted; });
pm.test('found employeeId', function () { pm.expect(row).to.be.an('object'); });
if (row && (row._id || row.id)) pm.collectionVariables.set('employeeId', String(row._id || row.id));
`),
}));
add(ordered, req({ name: 'GET /api/v1/employees/:employeeId', url: '/api/v1/employees/{{employeeId}}', test: ok }));
add(ordered, req({
  name: 'PUT /api/v1/employees/:employeeId',
  method: 'PUT',
  url: '/api/v1/employees/{{employeeId}}',
  body: {
    employeeName: 'PM Employee {{runId}} upd',
    departmentId: '{{departmentId}}',
    roleId: '{{roleId}}',
    emailOffice: 'pm-emp-{{runId}}@example.com',
    mobileNumber: '{{phoneC}}',
    countryId: '{{countryId}}',
    stateId: '{{stateId}}',
    cityId: '{{cityId}}',
    address: 'Updated',
    isActive: true,
  },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/employees/search',
  method: 'POST',
  url: '/api/v1/employees/search',
  body: SEARCH,
  test: ok,
}));
add(ordered, req({
  name: 'GET /api/v1/employees/department/:departmentId',
  url: '/api/v1/employees/department/{{departmentId}}',
  description: 'Known risk: GET /employees/:employeeId is registered first, so this path can be captured as an employee id.',
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/employees/:employeeId/reset-password',
  method: 'POST',
  url: '/api/v1/employees/{{employeeId}}/reset-password',
  body: { password: 'PostmanEmp2!' },
  test: ok,
}));

const hours = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({ dow, open: '06:00', close: '22:00' }));

add(ordered, req({
  name: 'GET /api/admin/settings (save footer)',
  url: '/api/admin/settings',
  test: tests(`
if (body.data) pm.collectionVariables.set('savedFooter', body.data.receiptFooter || '');
`),
}));
add(ordered, req({
  name: 'PATCH /api/admin/settings',
  method: 'PATCH',
  url: '/api/admin/settings',
  description: 'Changes only receiptFooter. A later request restores the saved value.',
  body: { receiptFooter: 'PM {{runId}}' },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/locations',
  method: 'POST',
  url: '/api/admin/locations',
  body: {
    name: 'PM Location {{runId}}',
    code: 'L{{runId}}',
    address: 'Test lane',
    timezone: 'Asia/Kolkata',
    phone: '{{phoneD}}',
    openingHours: hours,
  },
  test: saveData('locationId'),
}));
add(ordered, req({ name: 'GET /api/admin/locations', url: '/api/admin/locations', test: ok }));
add(ordered, req({
  name: 'PATCH /api/admin/locations/:id',
  method: 'PATCH',
  url: '/api/admin/locations/{{locationId}}',
  body: { name: 'PM Location {{runId}} upd' },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/taxes',
  method: 'POST',
  url: '/api/admin/taxes',
  body: {
    name: 'PM GST {{runId}}',
    ratePct: 18,
    components: [{ name: 'CGST', ratePct: 9 }, { name: 'SGST', ratePct: 9 }],
    active: true,
  },
  test: saveData('taxId'),
}));
add(ordered, req({ name: 'GET /api/admin/taxes', url: '/api/admin/taxes', test: ok }));
add(ordered, req({
  name: 'PATCH /api/admin/taxes/:id',
  method: 'PATCH',
  url: '/api/admin/taxes/{{taxId}}',
  body: { name: 'PM GST {{runId}} upd' },
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/admin/sports',
  method: 'POST',
  url: '/api/admin/sports',
  body: { key: 'pm-{{runId}}', name: 'PM Sport {{runId}}', sessionMinutes: 60, slotStepMinutes: 60, active: true },
  test: saveData('sportId'),
}));
add(ordered, req({ name: 'GET /api/admin/sports', url: '/api/admin/sports', test: ok }));
add(ordered, req({
  name: 'PATCH /api/admin/sports/:id',
  method: 'PATCH',
  url: '/api/admin/sports/{{sportId}}',
  body: { name: 'PM Sport {{runId}} upd' },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/courts',
  method: 'POST',
  url: '/api/admin/courts',
  body: {
    sportId: '{{sportId}}',
    locationId: '{{locationId}}',
    name: 'PM Court {{runId}}',
    code: 'C{{runId}}',
    indoor: true,
    status: 'active',
    operatingHours: hours,
    pricing: {
      walkInPaise: { peak: 80000, offPeak: 50000 },
      memberBasePaise: { peak: 60000, offPeak: 40000 },
    },
    taxId: '{{taxId}}',
    capacity: 4,
  },
  test: saveData('courtId'),
}));
add(ordered, req({ name: 'GET /api/admin/courts', url: '/api/admin/courts', test: ok }));
add(ordered, req({ name: 'GET /api/admin/courts/:id', url: '/api/admin/courts/{{courtId}}', test: ok }));
add(ordered, req({
  name: 'PATCH /api/admin/courts/:id',
  method: 'PATCH',
  url: '/api/admin/courts/{{courtId}}',
  body: { name: 'PM Court {{runId}} upd' },
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/admin/customers (invoice)',
  method: 'POST',
  url: '/api/admin/customers',
  body: {
    type: 'person',
    name: 'PM Customer {{runId}}',
    email: 'pm-cust-{{runId}}@example.com',
    phone: '{{phoneA}}',
  },
  test: saveData('customerId'),
}));
add(ordered, req({
  name: 'POST /api/admin/customers (archive later)',
  method: 'POST',
  url: '/api/admin/customers',
  body: {
    type: 'person',
    name: 'PM Customer spare {{runId}}',
    email: 'pm-cust2-{{runId}}@example.com',
    phone: '{{phoneB}}',
  },
  test: saveData('customerSpareId'),
}));
add(ordered, req({ name: 'GET /api/admin/customers', url: '/api/admin/customers', test: ok }));
add(ordered, req({ name: 'GET /api/admin/customers/:id', url: '/api/admin/customers/{{customerId}}', test: ok }));
add(ordered, req({
  name: 'PATCH /api/admin/customers/:id',
  method: 'PATCH',
  url: '/api/admin/customers/{{customerId}}',
  body: { notes: 'updated {{runId}}' },
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/admin/members (membership)',
  method: 'POST',
  url: '/api/admin/members',
  body: {
    firstName: 'PM',
    lastName: 'Member {{runId}}',
    dob: '2000-01-15',
    gender: 'other',
    phone: '{{phoneE}}',
    email: 'pm-member-{{runId}}@example.com',
    source: 'front_desk',
  },
  test: saveData('memberId'),
}));
add(ordered, req({
  name: 'POST /api/admin/members (archive later)',
  method: 'POST',
  url: '/api/admin/members',
  body: {
    firstName: 'PM',
    lastName: 'Spare {{runId}}',
    dob: '2001-02-02',
    phone: '{{phoneF}}',
    email: 'pm-member2-{{runId}}@example.com',
    source: 'front_desk',
  },
  test: saveData('memberSpareId'),
}));
add(ordered, req({ name: 'GET /api/admin/members', url: '/api/admin/members', test: ok }));
add(ordered, req({
  name: 'GET /api/admin/members/search',
  url: '/api/admin/members/search?q={{phoneE}}',
  test: ok,
}));
add(ordered, req({ name: 'GET /api/admin/members/:id', url: '/api/admin/members/{{memberId}}', test: ok }));
add(ordered, req({ name: 'GET /api/admin/members/:id/timeline', url: '/api/admin/members/{{memberId}}/timeline', test: ok }));
add(ordered, req({
  name: 'GET /api/admin/members/:id/qr',
  url: '/api/admin/members/{{memberId}}/qr',
  test: tests(`
if (body.data && body.data.token) pm.collectionVariables.set('qrToken', body.data.token);
pm.test('qr token', function () { pm.expect(pm.collectionVariables.get('qrToken')).to.be.a('string').and.not.empty; });
`),
}));
add(ordered, req({ name: 'GET /api/admin/members/by-qr/:token', url: '/api/admin/members/by-qr/{{qrToken}}', test: ok }));
add(ordered, req({
  name: 'PATCH /api/admin/members/:id',
  method: 'PATCH',
  url: '/api/admin/members/{{memberId}}',
  body: { lastName: 'Member {{runId}} upd' },
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/admin/membership-plans (base)',
  method: 'POST',
  url: '/api/admin/membership-plans',
  body: {
    key: 'pm-base-{{runId}}',
    name: 'PM Base {{runId}}',
    durations: [{ months: 1, pricePaise: 50000 }],
    active: true,
    taxId: '{{taxId}}',
  },
  test: saveData('planId'),
}));
add(ordered, req({
  name: 'POST /api/admin/membership-plans (upgrade)',
  method: 'POST',
  url: '/api/admin/membership-plans',
  body: {
    key: 'pm-up-{{runId}}',
    name: 'PM Up {{runId}}',
    durations: [{ months: 1, pricePaise: 80000 }],
    active: true,
  },
  test: saveData('planUpgradeId'),
}));
add(ordered, req({
  name: 'POST /api/admin/membership-plans (archive later)',
  method: 'POST',
  url: '/api/admin/membership-plans',
  body: {
    key: 'pm-old-{{runId}}',
    name: 'PM Old {{runId}}',
    durations: [{ months: 1, pricePaise: 10000 }],
    active: true,
  },
  test: saveData('planSpareId'),
}));
add(ordered, req({ name: 'GET /api/admin/membership-plans', url: '/api/admin/membership-plans', test: ok }));
add(ordered, req({ name: 'GET /api/admin/membership-plans/:id', url: '/api/admin/membership-plans/{{planId}}', test: ok }));
add(ordered, req({
  name: 'PATCH /api/admin/membership-plans/:id',
  method: 'PATCH',
  url: '/api/admin/membership-plans/{{planId}}',
  body: { description: 'updated {{runId}}' },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/memberships',
  method: 'POST',
  url: '/api/admin/memberships',
  body: { memberId: '{{memberId}}', planId: '{{planId}}', months: 1, paymentMethod: 'cash' },
  test: saveExpr('membershipId', 'body.data && body.data.membership && (body.data.membership._id || body.data.membership.id)'),
}));
add(ordered, req({ name: 'GET /api/admin/memberships', url: '/api/admin/memberships', test: ok }));
add(ordered, req({
  name: 'POST /api/admin/memberships/:id/renew',
  method: 'POST',
  url: '/api/admin/memberships/{{membershipId}}/renew',
  body: { months: 1 },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/memberships/:id/upgrade',
  method: 'POST',
  url: '/api/admin/memberships/{{membershipId}}/upgrade',
  body: { planId: '{{planUpgradeId}}' },
  test: ok,
}));

add(ordered, req({
  name: 'GET /api/admin/availability',
  url: '/api/admin/availability?localDate={{day2}}&sportId={{sportId}}',
  test: ok,
}));
add(ordered, req({
  name: 'GET /api/admin/bookings/calendar',
  url: '/api/admin/bookings/calendar?date={{day2}}&sportId={{sportId}}',
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/bookings A',
  method: 'POST',
  url: '/api/admin/bookings',
  headers: [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Idempotency-Key', value: 'pm-a-{{runId}}' },
  ],
  body: {
    courtId: '{{courtId}}',
    startUtc: '{{slotA}}',
    type: 'admin',
    memberId: '{{memberId}}',
    channel: 'admin',
    payment: { mode: 'cash' },
    notes: 'slot A {{runId}}',
  },
  test: saveData('bookingA'),
}));
add(ordered, req({
  name: 'POST /api/admin/bookings B',
  method: 'POST',
  url: '/api/admin/bookings',
  headers: [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Idempotency-Key', value: 'pm-b-{{runId}}' },
  ],
  body: {
    courtId: '{{courtId}}',
    startUtc: '{{slotB}}',
    type: 'walk_in',
    channel: 'front_desk',
    customer: { name: 'Walk in {{runId}}', phone: '{{phoneD}}' },
    payment: { mode: 'cash' },
  },
  test: saveData('bookingB'),
}));
add(ordered, req({
  name: 'POST /api/admin/bookings C',
  method: 'POST',
  url: '/api/admin/bookings',
  headers: [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Idempotency-Key', value: 'pm-c-{{runId}}' },
  ],
  body: {
    courtId: '{{courtId}}',
    startUtc: '{{slotC}}',
    type: 'admin',
    channel: 'admin',
    payment: { mode: 'cash' },
  },
  test: saveData('bookingC'),
}));
add(ordered, req({
  name: 'POST /api/admin/bookings D',
  method: 'POST',
  url: '/api/admin/bookings',
  headers: [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Idempotency-Key', value: 'pm-d-{{runId}}' },
  ],
  body: {
    courtId: '{{courtId}}',
    startUtc: '{{slotD}}',
    type: 'admin',
    channel: 'admin',
    payment: { mode: 'desk' },
  },
  test: saveData('bookingD'),
}));
add(ordered, req({
  name: 'POST /api/admin/bookings E',
  method: 'POST',
  url: '/api/admin/bookings',
  headers: [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Idempotency-Key', value: 'pm-e-{{runId}}' },
  ],
  body: {
    courtId: '{{courtId}}',
    startUtc: '{{slotE}}',
    type: 'admin',
    channel: 'admin',
    payment: { mode: 'cash' },
  },
  test: saveData('bookingE'),
}));
add(ordered, req({ name: 'GET /api/admin/bookings', url: '/api/admin/bookings', test: ok }));
add(ordered, req({ name: 'GET /api/admin/bookings/:id', url: '/api/admin/bookings/{{bookingA}}', test: ok }));
add(ordered, req({
  name: 'POST /api/admin/bookings/:id/reschedule',
  method: 'POST',
  url: '/api/admin/bookings/{{bookingA}}/reschedule',
  body: { startUtc: '{{slotMove}}', courtId: '{{courtId}}' },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/bookings/:id/confirm-payment',
  method: 'POST',
  url: '/api/admin/bookings/{{bookingD}}/confirm-payment',
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/bookings/:id/check-in',
  method: 'POST',
  url: '/api/admin/bookings/{{bookingC}}/check-in',
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/bookings/:id/no-show',
  method: 'POST',
  url: '/api/admin/bookings/{{bookingE}}/no-show',
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/bookings/:id/cancel',
  method: 'POST',
  url: '/api/admin/bookings/{{bookingB}}/cancel',
  body: { reason: 'postman {{runId}}', refundMethod: 'none' },
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/admin/court-blocks',
  method: 'POST',
  url: '/api/admin/court-blocks',
  description: 'Day+4 window. No booking uses that window.',
  body: {
    courtId: '{{courtId}}',
    start: '{{slotBlockStart}}',
    end: '{{slotBlockEnd}}',
    reason: 'maintenance',
    note: 'pm {{runId}}',
  },
  test: saveData('courtBlockId'),
}));
add(ordered, req({ name: 'GET /api/admin/court-blocks', url: '/api/admin/court-blocks', test: ok }));

add(ordered, req({
  name: 'POST /api/admin/social-sessions',
  method: 'POST',
  url: '/api/admin/social-sessions',
  body: {
    courtIds: ['{{courtId}}'],
    sportId: '{{sportId}}',
    start: '{{slotSocialStart}}',
    end: '{{slotSocialEnd}}',
    title: 'PM Social {{runId}}',
    capacity: 8,
    pricePerPlayer: { memberPaise: 20000, guestPaise: 30000 },
  },
  test: saveData('socialId'),
}));
add(ordered, req({ name: 'GET /api/admin/social-sessions', url: '/api/admin/social-sessions', test: ok }));
add(ordered, req({ name: 'GET /api/admin/social-sessions/:id', url: '/api/admin/social-sessions/{{socialId}}', test: ok }));
add(ordered, req({
  name: 'POST /api/admin/social-sessions/:id/join',
  method: 'POST',
  url: '/api/admin/social-sessions/{{socialId}}/join',
  body: { memberId: '{{memberId}}', paymentStatus: 'pay_at_desk' },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/social-sessions/:id/cancel',
  method: 'POST',
  url: '/api/admin/social-sessions/{{socialId}}/cancel',
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/admin/invoices (draft then post)',
  method: 'POST',
  url: '/api/admin/invoices',
  body: {
    customerId: '{{customerId}}',
    kind: 'customer_invoice',
    sourceType: 'manual',
    post: false,
    notes: 'pm {{runId}}',
    lines: [{ description: 'Court hire', revenueStream: 'court', qty: 1, unitPricePaise: 10000, taxId: '{{taxId}}' }],
  },
  test: tests(`
const inv = body.data || {};
const id = inv._id || inv.id;
if (id) pm.collectionVariables.set('invoiceId', String(id));
const due = inv.totals && (inv.totals.duePaise || inv.totals.totalPaise);
if (due != null) pm.collectionVariables.set('invoiceDue', String(due));
pm.test('invoiceId captured', function () {
  pm.expect(pm.collectionVariables.get('invoiceId')).to.be.a('string').and.not.empty;
});
`),
}));
add(ordered, req({ name: 'GET /api/admin/invoices', url: '/api/admin/invoices', test: ok }));
add(ordered, req({ name: 'GET /api/admin/invoices/:id', url: '/api/admin/invoices/{{invoiceId}}', test: ok }));
add(ordered, req({
  name: 'GET /api/admin/invoices/:id/pdf',
  url: '/api/admin/invoices/{{invoiceId}}/pdf',
  test: `pm.test('pdf or json error', function () { pm.expect(pm.response.code).to.be.oneOf([200, 201]); });`,
}));
add(ordered, req({
  name: 'POST /api/admin/invoices/:id/post',
  method: 'POST',
  url: '/api/admin/invoices/{{invoiceId}}/post',
  test: tests(`
const inv = body.data || {};
const due = inv.totals && (inv.totals.duePaise || inv.totals.totalPaise);
if (due != null) pm.collectionVariables.set('invoiceDue', String(due));
`),
}));
add(ordered, req({
  name: 'POST /api/admin/invoices/:id/record-payment',
  method: 'POST',
  url: '/api/admin/invoices/{{invoiceId}}/record-payment',
  body: '{\n  "amountPaise": {{invoiceDue}},\n  "method": "cash",\n  "provider": "manual",\n  "capture": true\n}',
  test: saveExpr('paymentId', 'body.data && body.data.payment && (body.data.payment._id || body.data.payment.id)'),
}));
add(ordered, req({ name: 'GET /api/admin/payments', url: '/api/admin/payments', test: ok }));
add(ordered, req({ name: 'GET /api/admin/payments/settings', url: '/api/admin/payments/settings', test: ok }));
add(ordered, req({
  name: 'POST /api/admin/invoices (credit note source)',
  method: 'POST',
  url: '/api/admin/invoices',
  body: {
    customerId: '{{customerId}}',
    sourceType: 'manual',
    post: true,
    notes: 'credit {{runId}}',
    lines: [{ description: 'Shop item', revenueStream: 'shop', qty: 1, unitPricePaise: 5000, taxId: '{{taxId}}' }],
  },
  test: saveData('invoiceCreditId'),
}));
add(ordered, req({
  name: 'POST /api/admin/invoices/:id/credit-note',
  method: 'POST',
  url: '/api/admin/invoices/{{invoiceCreditId}}/credit-note',
  body: { reason: 'postman {{runId}}' },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/payments/:id/refund',
  method: 'POST',
  url: '/api/admin/payments/{{paymentId}}/refund',
  body: { amountPaise: 1000, reason: 'partial {{runId}}' },
  test: ok,
}));

add(ordered, req({ name: 'GET /api/public/club', url: '/api/public/club', test: ok }));
add(ordered, req({ name: 'GET /api/public/sports', url: '/api/public/sports', test: ok }));
add(ordered, req({ name: 'GET /api/public/membership-plans', url: '/api/public/membership-plans', test: ok }));
add(ordered, req({ name: 'GET /api/public/blogs?limit=5', url: '/api/public/blogs?limit=5', test: ok }));
add(ordered, req({
  name: 'GET /api/public/availability',
  url: '/api/public/availability?localDate={{day2}}&sportId={{sportId}}&days=1',
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/public/enquiries',
  method: 'POST',
  url: '/api/public/enquiries',
  body: {
    name: 'PM Enquiry {{runId}}',
    phone: '{{phoneG}}',
    email: 'pm-enq-{{runId}}@example.com',
    message: 'Hello',
    interest: ['badminton'],
    website: '',
  },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/public/trials',
  method: 'POST',
  url: '/api/public/trials',
  body: {
    name: 'PM Trial {{runId}}',
    phone: '{{phoneH}}',
    email: 'pm-trial-{{runId}}@example.com',
    sportId: '{{sportId}}',
    localDate: '{{day3}}',
    website: '',
  },
  test: ok,
}));
add(ordered, req({ name: 'GET /api/admin/dashboard', url: '/api/admin/dashboard', test: ok }));

add(ordered, req({
  name: 'POST /api/admin/mcp-keys',
  method: 'POST',
  url: '/api/admin/mcp-keys',
  body: { name: 'PM Key {{runId}}', scopes: ['mcp.read', 'mcp.write'], expiresInDays: 1 },
  test: tests(`
if (body.data && body.data.apiKey) pm.collectionVariables.set('mcpApiKey', body.data.apiKey);
if (body.data && body.data.id) pm.collectionVariables.set('mcpKeyId', String(body.data.id));
pm.test('mcp key captured', function () {
  pm.expect(pm.collectionVariables.get('mcpApiKey')).to.be.a('string').and.not.empty;
});
`),
}));
add(ordered, req({ name: 'GET /api/admin/mcp-keys', url: '/api/admin/mcp-keys', test: ok }));

const mcpHeaders = [{ key: 'Authorization', value: 'Bearer {{mcpApiKey}}' }];
function mcpGet(name, url) {
  add(ordered, req({ name, url, headers: mcpHeaders, test: ok }));
}
mcpGet('GET /api/mcp/health', '/api/mcp/health');
mcpGet('GET /api/mcp/club-summary', '/api/mcp/club-summary?period=today');
mcpGet('GET /api/mcp/revenue', '/api/mcp/revenue?period=today&groupBy=day');
mcpGet('GET /api/mcp/booking-summary', '/api/mcp/booking-summary?period=today');
mcpGet('GET /api/mcp/court-availability', '/api/mcp/court-availability?date={{day2}}&sportId={{sportId}}');
mcpGet('GET /api/mcp/members/search', '/api/mcp/members/search?query={{phoneE}}');
mcpGet('GET /api/mcp/members/one', '/api/mcp/members/one?memberId={{memberId}}');
mcpGet('GET /api/mcp/memberships/expiring', '/api/mcp/memberships/expiring?withinDays=30');
mcpGet('GET /api/mcp/finance/snapshot', '/api/mcp/finance/snapshot');

add(ordered, req({
  name: 'POST /api/mcp/actions/prepare-create-booking',
  method: 'POST',
  url: '/api/mcp/actions/prepare-create-booking',
  headers: [{ key: 'Content-Type', value: 'application/json' }, ...mcpHeaders],
  body: {
    courtId: '{{courtId}}',
    startUtc: '{{slotMcp}}',
    type: 'admin',
    customerName: 'MCP {{runId}}',
    customerPhone: '{{phoneD}}',
    paymentMode: 'cash',
  },
  test: tests(`
if (body.data && body.data.confirmationId) pm.collectionVariables.set('mcpCreateConfirmId', body.data.confirmationId);
pm.test('confirmation id', function () { pm.expect(pm.collectionVariables.get('mcpCreateConfirmId')).to.be.a('string').and.not.empty; });
`),
}));
add(ordered, req({
  name: 'POST /api/mcp/actions/cancel (discard create)',
  method: 'POST',
  url: '/api/mcp/actions/cancel',
  headers: [{ key: 'Content-Type', value: 'application/json' }, ...mcpHeaders],
  description: 'Discards the prepared booking so day+6 stays free.',
  body: { confirmationId: '{{mcpCreateConfirmId}}' },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/mcp/actions/prepare-cancel-booking',
  method: 'POST',
  url: '/api/mcp/actions/prepare-cancel-booking',
  headers: [{ key: 'Content-Type', value: 'application/json' }, ...mcpHeaders],
  description: 'Uses booking F, created below, so it does not touch A-E.',
  body: { bookingId: '{{bookingF}}', reason: 'mcp {{runId}}' },
  test: tests(`
if (body.data && body.data.confirmationId) pm.collectionVariables.set('mcpCancelConfirmId', body.data.confirmationId);
`),
}));

add(ordered, req({
  name: 'POST /api/admin/bookings F (mcp cancel target)',
  method: 'POST',
  url: '/api/admin/bookings',
  headers: [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Idempotency-Key', value: 'pm-f-{{runId}}' },
  ],
  body: {
    courtId: '{{courtId}}',
    startUtc: '{{slotF}}',
    type: 'admin',
    channel: 'admin',
    payment: { mode: 'cash' },
  },
  test: saveData('bookingF'),
}));

// prepare-cancel currently sits BEFORE booking F is created. I need to fix order.
// I'll move prepare-cancel to after booking F by not adding it above... I already added it.
// Fix: remove that item and re-add after F. Easier to splice in the generator after the fact.
// I'll do it below after building... actually the add already happened. I'll reorder at the end
// by finding names. Let me fix the source instead - I'll delete the premature add by
// restructuring. Since this comment is in the file that already pushed, I will splice now.

const premature = ordered.findIndex((i) => i.name.startsWith('POST /api/mcp/actions/prepare-cancel'));
const bookingF = ordered.findIndex((i) => i.name.startsWith('POST /api/admin/bookings F'));
if (premature !== -1 && bookingF !== -1 && premature < bookingF) {
  const [moved] = ordered.splice(premature, 1);
  const fIndex = ordered.findIndex((i) => i.name.startsWith('POST /api/admin/bookings F'));
  ordered.splice(fIndex + 1, 0, moved);
}

add(ordered, req({
  name: 'POST /api/mcp/actions/confirm (cancel booking F)',
  method: 'POST',
  url: '/api/mcp/actions/confirm',
  headers: [{ key: 'Content-Type', value: 'application/json' }, ...mcpHeaders],
  body: { confirmationId: '{{mcpCancelConfirmId}}', reason: 'confirmed by postman' },
  test: ok,
}));

add(ordered, req({
  name: 'POST /api/admin/membership-plans/:id/archive (spare plan)',
  method: 'POST',
  url: '/api/admin/membership-plans/{{planSpareId}}/archive',
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/memberships/:id/cancel',
  method: 'POST',
  url: '/api/admin/memberships/{{membershipId}}/cancel',
  body: { reason: 'postman end {{runId}}', refund: false },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/members/:id/archive (spare)',
  method: 'POST',
  url: '/api/admin/members/{{memberSpareId}}/archive',
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/customers/:id/archive (spare)',
  method: 'POST',
  url: '/api/admin/customers/{{customerSpareId}}/archive',
  test: ok,
}));
add(ordered, req({
  name: 'DELETE /api/admin/court-blocks/:id',
  method: 'DELETE',
  url: '/api/admin/court-blocks/{{courtBlockId}}',
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/admin/mcp-keys/:id/revoke',
  method: 'POST',
  url: '/api/admin/mcp-keys/{{mcpKeyId}}/revoke',
  test: ok,
}));

add(ordered, req({
  name: 'DELETE /api/v1/email-templates/:id',
  method: 'DELETE',
  url: '/api/v1/email-templates/{{emailTemplateId}}',
  test: ok,
}));
add(ordered, req({
  name: 'DELETE /api/v1/email-to/:id',
  method: 'DELETE',
  url: '/api/v1/email-to/{{emailToId}}',
  test: ok,
}));
add(ordered, req({
  name: 'DELETE /api/v1/email-for/:id',
  method: 'DELETE',
  url: '/api/v1/email-for/{{emailForId}}',
  test: ok,
}));
add(ordered, req({
  name: 'DELETE /api/v1/email-setups/:id',
  method: 'DELETE',
  url: '/api/v1/email-setups/{{emailSetupId}}',
  test: ok,
}));
add(ordered, req({ name: 'DELETE /api/v1/faqs/:id', method: 'DELETE', url: '/api/v1/faqs/{{faqId}}', test: ok }));
add(ordered, req({
  name: 'DELETE /api/v1/faq-categories/:id',
  method: 'DELETE',
  url: '/api/v1/faq-categories/{{faqCategoryId}}',
  test: ok,
}));
add(ordered, req({ name: 'DELETE /api/v1/blogs/:id', method: 'DELETE', url: '/api/v1/blogs/{{blogId}}', test: ok }));
add(ordered, req({ name: 'DELETE /api/v1/blog-tags/:id', method: 'DELETE', url: '/api/v1/blog-tags/{{blogTagId}}', test: ok }));
add(ordered, req({
  name: 'DELETE /api/v1/blog-categories/:id',
  method: 'DELETE',
  url: '/api/v1/blog-categories/{{blogCategoryId}}',
  test: ok,
}));
add(ordered, req({ name: 'DELETE /api/v1/guides/:id', method: 'DELETE', url: '/api/v1/guides/{{guideId}}', test: ok }));
add(ordered, req({ name: 'DELETE /api/v1/menus/:id', method: 'DELETE', url: '/api/v1/menus/{{menuId}}', test: ok }));
add(ordered, req({
  name: 'DELETE /api/v1/menu-groups/:id',
  method: 'DELETE',
  url: '/api/v1/menu-groups/{{menuGroupId}}',
  test: ok,
}));
add(ordered, req({
  name: 'DELETE /api/v1/employees/:employeeId',
  method: 'DELETE',
  url: '/api/v1/employees/{{employeeId}}',
  test: ok,
}));
add(ordered, req({ name: 'DELETE /api/v1/roles/:roleId', method: 'DELETE', url: '/api/v1/roles/{{roleId}}', test: ok }));
add(ordered, req({
  name: 'DELETE /api/v1/departments/:id',
  method: 'DELETE',
  url: '/api/v1/departments/{{departmentId}}',
  test: ok,
}));
add(ordered, req({ name: 'DELETE /api/v1/cities/:cityId', method: 'DELETE', url: '/api/v1/cities/{{cityId}}', test: ok }));
add(ordered, req({ name: 'DELETE /api/v1/states/:stateId', method: 'DELETE', url: '/api/v1/states/{{stateId}}', test: ok }));
add(ordered, req({
  name: 'DELETE /api/v1/countries/:countryId',
  method: 'DELETE',
  url: '/api/v1/countries/{{countryId}}',
  test: ok,
}));
add(ordered, req({ name: 'DELETE /api/v1/currencies/:id', method: 'DELETE', url: '/api/v1/currencies/{{currencyId}}', test: ok }));

add(ordered, req({
  name: 'PATCH /api/admin/settings (restore footer)',
  method: 'PATCH',
  url: '/api/admin/settings',
  body: { receiptFooter: '{{savedFooter}}' },
  test: ok,
}));
add(ordered, req({
  name: 'POST /api/v1/auth/logout',
  method: 'POST',
  url: '/api/v1/auth/logout',
  description: 'Last step. Logging out earlier drops the session cookie for every later request.',
  test: ok,
}));

function manualReq(opts) {
  add(manual, req({ ...opts, manual: true, test: opts.test || ok }));
}

manualReq({
  name: 'POST /api/v1/auth/employee/login',
  method: 'POST',
  url: '/api/v1/auth/employee/login',
  description: 'Replaces the admin session cookie. Do not run inside the ordered folder.',
  body: {
    email: 'pm-emp-{{runId}}@example.com',
    password: 'PostmanEmp2!',
    locationConsent: true,
    ipConsent: true,
  },
});
manualReq({
  name: 'GET /api/v1/auth/login-status/:userId',
  url: '/api/v1/auth/login-status/{{adminUserId}}',
});
manualReq({
  name: 'POST /api/v1/admin/auth/login-attempts',
  method: 'POST',
  url: '/api/v1/admin/auth/login-attempts',
  body: SEARCH,
});
manualReq({
  name: 'POST /api/v1/admin/auth/reset-attempts',
  method: 'POST',
  url: '/api/v1/admin/auth/reset-attempts',
  body: { userId: '{{adminUserId}}' },
});
manualReq({
  name: 'POST /api/v1/admin/auth/unlock',
  method: 'POST',
  url: '/api/v1/admin/auth/unlock',
  body: { userId: '{{employeeId}}' },
});
manualReq({
  name: 'POST /api/v1/admin/auth/block',
  method: 'POST',
  url: '/api/v1/admin/auth/block',
  description: 'Blocks a user. Pair with unblock. Not safe in the main run.',
  body: { userId: '{{employeeId}}' },
});
manualReq({
  name: 'POST /api/v1/admin/auth/unblock',
  method: 'POST',
  url: '/api/v1/admin/auth/unblock',
  body: { userId: '{{employeeId}}' },
});
manualReq({
  name: 'POST /api/v1/otp/send',
  method: 'POST',
  url: '/api/v1/otp/send',
  description: 'Sends a real email. Verify needs the code from that email.',
  body: { email: '{{adminEmail}}' },
});
manualReq({
  name: 'POST /api/v1/otp/verify',
  method: 'POST',
  url: '/api/v1/otp/verify',
  body: { email: '{{adminEmail}}', otp: '{{otp}}' },
});
manualReq({
  name: 'POST /api/v1/otp/reset-password',
  method: 'POST',
  url: '/api/v1/otp/reset-password',
  description: 'Changes the account password. Do not point this at the admin you use for the run.',
  body: { email: '{{adminEmail}}', otp: '{{otp}}', newPassword: '{{newPassword}}' },
});
manualReq({
  name: 'POST /api/v1/companies',
  method: 'POST',
  url: '/api/v1/companies',
  description: 'Super-admin multipart create. Left manual so the runner does not onboard a second company.',
  form: [
    { key: 'companyName', value: 'PM Co {{runId}}', type: 'text' },
    { key: 'email', value: 'pm-co-{{runId}}@example.com', type: 'text' },
    { key: 'password', value: 'PostmanCo1!', type: 'text' },
    { key: 'mobileNumber', value: '{{phoneD}}', type: 'text' },
    { key: 'gstNumber', value: '24PM{{runId}}', type: 'text' },
    { key: 'countryId', value: '{{countryId}}', type: 'text' },
    { key: 'stateId', value: '{{stateId}}', type: 'text' },
    { key: 'cityId', value: '{{cityId}}', type: 'text' },
    { key: 'address', value: 'Postman', type: 'text' },
    { key: 'pincode', value: '390001', type: 'text' },
    { key: 'website', value: 'https://example.com', type: 'text' },
    { key: 'isActive', value: 'true', type: 'text' },
  ],
});
manualReq({
  name: 'GET /api/v1/companies/:id',
  url: '/api/v1/companies/{{companyId}}',
});
manualReq({
  name: 'PUT /api/v1/companies/:id',
  method: 'PUT',
  url: '/api/v1/companies/{{companyId}}',
  form: [{ key: 'companyName', value: 'PM Co {{runId}} upd', type: 'text' }],
});
manualReq({
  name: 'DELETE /api/v1/companies/:id',
  method: 'DELETE',
  url: '/api/v1/companies/{{companyId}}',
  description: 'Only the company created in this manual step. Never the live super admin.',
});
manualReq({
  name: 'POST /api/v1/email-templates/upload-signature',
  method: 'POST',
  url: '/api/v1/email-templates/upload-signature',
  description: 'Attach a jpeg/png as signatureImage in Postman before sending.',
  form: [{ key: 'signatureImage', type: 'file', src: '' }],
});
manualReq({
  name: 'POST /api/admin/memberships/reminders',
  method: 'POST',
  url: '/api/admin/memberships/reminders',
  description: 'Emails every membership that is due a reminder, not only the Postman member.',
});
manualReq({
  name: 'POST /api/admin/memberships/expire-due',
  method: 'POST',
  url: '/api/admin/memberships/expire-due',
  description: 'Expires every due membership in the database.',
});
manualReq({
  name: 'POST /api/webhooks/razorpay',
  method: 'POST',
  url: '/api/webhooks/razorpay',
  description: 'Needs a valid x-razorpay-signature. A plain JSON body is expected to fail.',
  headers: [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'x-razorpay-signature', value: '{{razorpaySignature}}' },
  ],
  body: { event: 'payment.captured', payload: {} },
});
manualReq({
  name: 'POST /api/payments/mock/:intentId/succeed',
  method: 'POST',
  url: '/api/payments/mock/{{intentId}}/succeed',
  description: 'Only when PAYMENTS_PROVIDER=mock and you have an intent id.',
});
manualReq({
  name: 'POST /api/payments/mock/:intentId/fail',
  method: 'POST',
  url: '/api/payments/mock/{{intentId}}/fail',
  description: 'Use a different intent than succeed. One intent cannot both succeed and fail.',
});

const collection = {
  info: {
    name: 'Aarambh API — ordered run',
    description: [
      'Run the folder "01 Ordered run" with the Collection Runner.',
      'One login, one unique runId, parents before children, deletes only of records this run created.',
      'Folder "02 Manual" is skipped unless collection variable includeManual is true.',
      'Auth is the sessionId cookie, not a bearer token. Keep Postman cookie saving on.',
      'Set adminEmail and adminPassword in the environment before running.',
    ].join('\n'),
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:7002' },
    { key: 'adminEmail', value: '' },
    { key: 'adminPassword', value: '' },
    { key: 'includeManual', value: 'false' },
    { key: 'runId', value: '' },
    { key: 'otp', value: '' },
    { key: 'newPassword', value: '' },
    { key: 'intentId', value: '' },
    { key: 'companyId', value: '' },
    { key: 'razorpaySignature', value: '' },
  ],
  event: [
    {
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: lines(boot) },
    },
  ],
  item: [
    {
      name: '01 Ordered run',
      description: 'Run this folder top to bottom. Do not reorder requests.',
      item: ordered,
    },
    {
      name: '02 Manual — skipped unless includeManual=true',
      description: 'Side effects on live data, real email, password reset, webhooks, and a second login.',
      item: manual,
    },
  ],
};

const outDir = __dirname;
const outFile = path.join(outDir, 'Aarambh-API.postman_collection.json');
fs.writeFileSync(outFile, JSON.stringify(collection, null, 2));

const env = {
  name: 'Aarambh Local',
  values: [
    { key: 'baseUrl', value: 'http://localhost:7002', enabled: true },
    { key: 'adminEmail', value: '', enabled: true },
    { key: 'adminPassword', value: '', enabled: true },
    { key: 'includeManual', value: 'false', enabled: true },
  ],
  _postman_variable_scope: 'environment',
};
fs.writeFileSync(path.join(outDir, 'Aarambh-Local.postman_environment.json'), JSON.stringify(env, null, 2));

function count(items) {
  return items.reduce((n, item) => n + (item.item ? count(item.item) : 1), 0);
}
console.log('ordered', ordered.length, 'manual', manual.length, 'total', count(collection.item));
console.log(outFile);

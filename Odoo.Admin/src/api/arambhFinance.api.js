/**
 * Arambh Phase 4 — settings, customers, invoices, payments (session cookie auth).
 */
import api from "./index";

const ADMIN = "/api/admin";

export const getSettings = (params) => api.get(`${ADMIN}/settings`, { params });
export const patchSettings = (body) => api.patch(`${ADMIN}/settings`, body);

export const listLocations = (params) => api.get(`${ADMIN}/locations`, { params });
export const createLocation = (body) => api.post(`${ADMIN}/locations`, body);
export const updateLocation = (id, body) => api.patch(`${ADMIN}/locations/${id}`, body);

export const listTaxes = (params) => api.get(`${ADMIN}/taxes`, { params });
export const createTax = (body) => api.post(`${ADMIN}/taxes`, body);
export const updateTax = (id, body) => api.patch(`${ADMIN}/taxes/${id}`, body);

export const listCustomers = (params) => api.get(`${ADMIN}/customers`, { params });
export const getCustomer = (id) => api.get(`${ADMIN}/customers/${id}`);
export const createCustomer = (body) => api.post(`${ADMIN}/customers`, body);
export const updateCustomer = (id, body) => api.patch(`${ADMIN}/customers/${id}`, body);

export const listInvoices = (params) => api.get(`${ADMIN}/invoices`, { params });
export const getInvoice = (id) => api.get(`${ADMIN}/invoices/${id}`);
export const createInvoice = (body) => api.post(`${ADMIN}/invoices`, body);
export const creditNoteInvoice = (id, body) =>
  api.post(`${ADMIN}/invoices/${id}/credit-note`, body || {});
export const recordPayment = (id, body) =>
  api.post(`${ADMIN}/invoices/${id}/record-payment`, body);
export const downloadInvoicePdf = (id) =>
  api.get(`${ADMIN}/invoices/${id}/pdf`, { responseType: "blob" });

export const listPayments = (params) => api.get(`${ADMIN}/payments`, { params });
export const getPaymentSettings = () => api.get(`${ADMIN}/payments/settings`);
export const mockPaymentSucceed = (intentId) =>
  api.post(`/api/payments/mock/${intentId}/succeed`);

export default {
  getSettings,
  patchSettings,
  listLocations,
  listTaxes,
  listCustomers,
  listInvoices,
  getInvoice,
  recordPayment,
};

/**
 * Arambh Phase 5 — members, plans, memberships (session cookie auth).
 */
import api from "./index";

const ADMIN = "/api/admin";

export const listMembers = (params) => api.get(`${ADMIN}/members`, { params });
export const searchMembers = (params) => api.get(`${ADMIN}/members/search`, { params });
export const getMember = (id) => api.get(`${ADMIN}/members/${id}`);
export const getMemberTimeline = (id, params) =>
  api.get(`${ADMIN}/members/${id}/timeline`, { params });
export const registerMember = (body) => api.post(`${ADMIN}/members`, body);
export const updateMember = (id, body) => api.patch(`${ADMIN}/members/${id}`, body);
export const archiveMember = (id) => api.post(`${ADMIN}/members/${id}/archive`);
export const getMemberQr = (id) => api.get(`${ADMIN}/members/${id}/qr`);

export const listPlans = (params) => api.get(`${ADMIN}/membership-plans`, { params });
export const getPlan = (id) => api.get(`${ADMIN}/membership-plans/${id}`);
export const createPlan = (body) => api.post(`${ADMIN}/membership-plans`, body);
export const updatePlan = (id, body) => api.patch(`${ADMIN}/membership-plans/${id}`, body);
export const archivePlan = (id) => api.post(`${ADMIN}/membership-plans/${id}/archive`);

export const listMemberships = (params) => api.get(`${ADMIN}/memberships`, { params });
export const purchaseMembership = (body) => api.post(`${ADMIN}/memberships`, body);
export const renewMembership = (id, body) => api.post(`${ADMIN}/memberships/${id}/renew`, body || {});
export const cancelMembership = (id, body) =>
  api.post(`${ADMIN}/memberships/${id}/cancel`, body || {});

export default {
  listMembers,
  getMember,
  listPlans,
  listMemberships,
  purchaseMembership,
};

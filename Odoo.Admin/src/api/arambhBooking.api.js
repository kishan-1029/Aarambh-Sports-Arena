/**
 * Arambh Phase 6 — courts, bookings, blocks, social (session cookie auth).
 */
import api from "./index";

const ADMIN = "/api/admin";

export const listSports = (params) => api.get(`${ADMIN}/sports`, { params });
export const createSport = (body) => api.post(`${ADMIN}/sports`, body);
export const updateSport = (id, body) => api.patch(`${ADMIN}/sports/${id}`, body);

export const listCourts = (params) => api.get(`${ADMIN}/courts`, { params });
export const getCourt = (id) => api.get(`${ADMIN}/courts/${id}`);
export const createCourt = (body) => api.post(`${ADMIN}/courts`, body);
export const updateCourt = (id, body) => api.patch(`${ADMIN}/courts/${id}`, body);

export const listCourtBlocks = (params) => api.get(`${ADMIN}/court-blocks`, { params });
export const createCourtBlock = (body) => api.post(`${ADMIN}/court-blocks`, body);
export const deleteCourtBlock = (id) => api.delete(`${ADMIN}/court-blocks/${id}`);

export const getAvailability = (params) => api.get(`${ADMIN}/availability`, { params });
export const getBookingCalendar = (params) =>
  api.get(`${ADMIN}/bookings/calendar`, { params });
export const listBookings = (params) => api.get(`${ADMIN}/bookings`, { params });
export const getBooking = (id) => api.get(`${ADMIN}/bookings/${id}`);
export const createBooking = (body, headers = {}) =>
  api.post(`${ADMIN}/bookings`, body, { headers });
export const cancelBooking = (id, body) => api.post(`${ADMIN}/bookings/${id}/cancel`, body || {});
export const rescheduleBooking = (id, body) =>
  api.post(`${ADMIN}/bookings/${id}/reschedule`, body);
export const checkInBooking = (id) => api.post(`${ADMIN}/bookings/${id}/check-in`);

export const listSocialSessions = (params) => api.get(`${ADMIN}/social-sessions`, { params });
export const getSocialSession = (id) => api.get(`${ADMIN}/social-sessions/${id}`);
export const createSocialSession = (body) => api.post(`${ADMIN}/social-sessions`, body);
export const joinSocialSession = (id, body) =>
  api.post(`${ADMIN}/social-sessions/${id}/join`, body || {});
export const cancelSocialSession = (id) => api.post(`${ADMIN}/social-sessions/${id}/cancel`);

export default {
  listCourts,
  listBookings,
  getBookingCalendar,
  createBooking,
};

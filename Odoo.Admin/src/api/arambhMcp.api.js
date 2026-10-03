import api from "./index";

const ADMIN = "/api/admin";

export const listMcpKeys = () => api.get(`${ADMIN}/mcp-keys`);
export const createMcpKey = (body) => api.post(`${ADMIN}/mcp-keys`, body);
export const revokeMcpKey = (id) => api.post(`${ADMIN}/mcp-keys/${id}/revoke`);

export default { listMcpKeys, createMcpKey, revokeMcpKey };

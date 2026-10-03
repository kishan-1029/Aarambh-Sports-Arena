import api from "./index";

export const getDashboard = (params) =>
  api.get("/api/admin/dashboard", { params });

export default { getDashboard };

/**
 * Arambh Pro Shop — catalogue, inventory and online orders (session cookie auth).
 */
import api from "./index";

const ADMIN = "/api/admin";

export const getEcommerceDashboard = () => api.get(`${ADMIN}/ecommerce/dashboard`);

export const listCategories = (params) => api.get(`${ADMIN}/product-categories`, { params });
export const createCategory = (body) => api.post(`${ADMIN}/product-categories`, body);
export const updateCategory = (id, body) => api.patch(`${ADMIN}/product-categories/${id}`, body);
export const deleteCategory = (id) => api.delete(`${ADMIN}/product-categories/${id}`);

export const listProducts = (params) => api.get(`${ADMIN}/products`, { params });
export const getProduct = (id) => api.get(`${ADMIN}/products/${id}`);
export const createProduct = (body) => api.post(`${ADMIN}/products`, body);
export const updateProduct = (id, body) => api.patch(`${ADMIN}/products/${id}`, body);
export const archiveProduct = (id, archived) =>
  api.post(`${ADMIN}/products/${id}/archive`, { archived });

export const uploadProductImage = (file) => {
  const form = new FormData();
  form.append("image", file);
  return api.post(`${ADMIN}/products/upload-image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const listInventory = (params) => api.get(`${ADMIN}/inventory`, { params });
export const listLowStock = () => api.get(`${ADMIN}/inventory/low-stock`);
export const listMovements = (params) => api.get(`${ADMIN}/inventory/movements`, { params });
export const stockIn = (body) => api.post(`${ADMIN}/inventory/stock-in`, body);
export const adjustStock = (body) => api.post(`${ADMIN}/inventory/adjust`, body);

export const listShopOrders = (params) => api.get(`${ADMIN}/shop-orders`, { params });
export const getShopOrder = (id) => api.get(`${ADMIN}/shop-orders/${id}`);
export const updateOrderStatus = (id, body) => api.patch(`${ADMIN}/shop-orders/${id}/status`, body);
export const updateOrderPayment = (id, body) =>
  api.patch(`${ADMIN}/shop-orders/${id}/payment`, body);
export const cancelShopOrder = (id, body) => api.post(`${ADMIN}/shop-orders/${id}/cancel`, body || {});
export const setOrderNote = (id, note) => api.patch(`${ADMIN}/shop-orders/${id}/note`, { note });

export default {
  getEcommerceDashboard,
  listCategories,
  listProducts,
  listInventory,
  listShopOrders,
};

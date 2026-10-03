/**
 * Centralized Axios instance with interceptors
 * All API calls should use this instance
 */
import axios from "axios";
import config from "../config";

// Create axios instance with base configuration
const api = axios.create({
    baseURL: config.api.API_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor - adds auth token to all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handles common error responses
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle 401 Unauthorized - redirect to login
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("_id");
            localStorage.removeItem("role");
            window.location.href = "/";
        }

        // Handle 403 Forbidden
        if (error.response?.status === 403) {
            console.error("Access denied");
        }

        // Handle 500 Server Error
        if (error.response?.status >= 500) {
            console.error("Server error:", error.response?.data?.message);
        }

        return Promise.reject(error);
    }
);

/**
 * Sets the default authorization header
 * @param {string} token - JWT token
 */
export const setAuthorization = (token) => {
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
};

/**
 * Gets the logged in user from session storage
 * @returns {Object|null} - User object or null
 */
export const getLoggedinUser = () => {
    const user = sessionStorage.getItem("authUser");
    if (!user) {
        return null;
    }
    return JSON.parse(user);
};

/**
 * Gets the logged in user from local storage
 * @returns {Object|null} - User object or null
 */
export const getLoggedInUser = () => {
    const user = localStorage.getItem("user");
    if (user) return JSON.parse(user);
    return null;
};

/**
 * Checks if user is authenticated
 * @returns {boolean}
 */
export const isUserAuthenticated = () => {
    return getLoggedInUser() !== null;
};

export default api;

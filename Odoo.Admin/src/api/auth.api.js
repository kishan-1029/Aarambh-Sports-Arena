/**
 * Auth API Service
 * Handles all authentication-related API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Company login
 * @param {Object} credentials - { email, password, locationConsent, ipConsent, clientIP, clientLatitude, clientLongitude }
 * @param {Object} customHeaders - Custom headers with client location info
 * @returns {Promise}
 */
export const loginCompany = async (credentials, customHeaders = {}) => {
    return api.post(ENDPOINTS.AUTH.COMPANY_LOGIN, credentials, {
        headers: {
            ...customHeaders,
        },
        validateStatus: function (status) {
            // Accept all 2xx, 4xx for proper handling of login attempts
            return (status >= 200 && status < 300) || (status >= 400 && status < 500);
        },
    });
};

/**
 * Employee login
 * @param {Object} credentials - { email, password }
 * @returns {Promise}
 */
export const loginEmployee = async (credentials) => {
    return api.post(ENDPOINTS.AUTH.EMPLOYEE_LOGIN, credentials);
};

/**
 * Get current logged-in user
 * @returns {Promise}
 */
export const getCurrentUser = async () => {
    return api.get(ENDPOINTS.AUTH.ME);
};

/**
 * Send OTP for password reset
 * @param {Object} data - { email }
 * @returns {Promise}
 */
export const sendOtp = async (data) => {
    return api.post(ENDPOINTS.AUTH.OTP_SEND, data, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

/**
 * Verify OTP
 * @param {Object} data - { email, otp }
 * @returns {Promise}
 */
export const verifyOtp = async (data) => {
    return api.post(ENDPOINTS.AUTH.OTP_VERIFY, data, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

/**
 * Reset password with OTP
 * @param {Object} data - { email, otp, newPassword }
 * @returns {Promise}
 */
export const resetPassword = async (data) => {
    return api.post(ENDPOINTS.AUTH.PASSWORD_RESET, data, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

/**
 * Logout - clears local storage
 */
export const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("_id");
    localStorage.removeItem("role");
    window.location.href = "/";
};

export default {
    loginCompany,
    loginEmployee,
    getCurrentUser,
    sendOtp,
    verifyOtp,
    resetPassword,
    logout,
};

/**
 * Get login attempt status by email
 * @param {Object} data - { email }
 * @returns {Promise}
 */
export const getLoginStatusByEmail = async (email) => {
    return api.post(ENDPOINTS.AUTH.LOGIN_STATUS_BY_EMAIL, { email }, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

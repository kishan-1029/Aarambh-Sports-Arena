/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { getCurrentUserDetails } from "../api/companies.api";
import { verifySession } from "../api/auth.api";


const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [adminData, setAdminData] = useState(null);
    const [loading, setLoading] = useState(true); // Start with loading true for session verification
    const [role, setRole] = useState(localStorage.getItem("role") || null);
    const [isSessionVerified, setIsSessionVerified] = useState(false);
    // Arambh string permissions (booking.create, …) — parallel to MenuContext CRUD
    const [stringPermissions, setStringPermissions] = useState([]);
    const [arambhRoleKey, setArambhRoleKey] = useState(null);

    const navigate = useNavigate();

    // Fetch admin/user data using the session (no ID needed)
    const getAdmin = useCallback(() => {

        setLoading(true);
        getCurrentUserDetails()
            .then((res) => {

                setAdminData(res.data.data);

            })
            .catch((error) => {
                console.log("error", error);
                const status = error.response?.status;
                // Never treat rate-limit / network blips as logout
                if (status === 429 || !error.response) return;
                // Only hard-logout on clear unauthenticated session
                if (status === 401) {
                    localStorage.removeItem("role");
                    setAdminData(null);
                    setRole(null);
                    navigate("/");
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, [navigate]);

    // Verify session on page load/refresh
    const verifyUserSession = useCallback(async () => {
        try {
            const res = await verifySession();

            if (res.data.isOk) {
                // Session is valid, update role from server
                const rawRole = typeof res.data.data.role === "string" ? res.data.data.role.toUpperCase().trim() : "";
                const sanitizedRole = (rawRole === "ADMIN" || rawRole === "EMPLOYEE") ? rawRole : "";
                setRole(sanitizedRole);
                localStorage.setItem("role", sanitizedRole);
                const perms = Array.isArray(res.data.data.permissions)
                    ? res.data.data.permissions
                    : [];
                setStringPermissions(perms);
                setArambhRoleKey(res.data.data.arambhRoleKey || null);
                setIsSessionVerified(true);
                // Fetch full user data
                getAdmin();
            }
        } catch (error) {
            console.log("Session verification failed:", error);
            const status = error.response?.status;
            // Rate limit / transient network: keep local role, do not bounce to login
            if (status === 429 || !error.response) {
                setIsSessionVerified(true);
                setLoading(false);
                if (localStorage.getItem("role")) {
                    getAdmin();
                }
                return;
            }
            // Session is invalid, clear localStorage and redirect
            localStorage.removeItem("role");
            setAdminData(null);
            setRole(null);
            setStringPermissions([]);
            setArambhRoleKey(null);
            setIsSessionVerified(true);
            setLoading(false);
            navigate("/");
        }
    }, [navigate, getAdmin]);

    // Verify session on mount
    useEffect(() => {
        verifyUserSession();
    }, [verifyUserSession]);

    const contextValue = useMemo(() => ({
        adminData,
        setAdminData,
        getAdmin,
        role,
        setRole,
        loading,
        setLoading,
        isSessionVerified,
        stringPermissions,
        setStringPermissions,
        arambhRoleKey,
        setArambhRoleKey,
    }), [adminData, getAdmin, role, loading, isSessionVerified, stringPermissions, arambhRoleKey]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export { AuthContext, AuthProvider };


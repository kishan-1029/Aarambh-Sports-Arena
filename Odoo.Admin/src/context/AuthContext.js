import { createContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCompanyById } from "../api/companies.api";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [adminData, setAdminData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState(localStorage.getItem("role") || null);

    const navigate = useNavigate();

    const getAdmin = useCallback(() => {
        const _id = localStorage.getItem("_id");
        const token = localStorage.getItem("token");
        
        // Don't fetch if no ID or no token (user is logged out)
        if (!_id || !token || _id === "null" || _id === "undefined") {
            setLoading(false);
            setAdminData(null);
            return;
        }
        
        setLoading(true);
        getCompanyById(_id)
            .then((res) => {
                console.log("Admin data fetched successfully", res.data.data);
                setAdminData(res.data.data);
                setRole(res.data.role);
                localStorage.setItem("role", res.data.role);
            })
            .catch((error) => {
                console.log("error", error);
                // Only navigate to login if we get an auth error
                if (error.response?.status === 401 || error.response?.status === 403) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("_id");
                    localStorage.removeItem("role");
                    setAdminData(null);
                    navigate("/");
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, [navigate]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            getAdmin();
        }
    }, [getAdmin]);

    return (
        <AuthContext.Provider value={{ adminData, setAdminData, getAdmin, role, loading, setLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthContext, AuthProvider };

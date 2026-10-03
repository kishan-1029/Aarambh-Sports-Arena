import React, { useState, useContext } from "react";
import {
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
} from "reactstrap";


import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { logout } from "../../api/auth.api";
import config from "../../config";

const profilePhotoSrc = (adminData) => {
    const photo = adminData?.profilePhoto || adminData?.avatar || adminData?.photo || "";
    if (!photo) return "";
    return photo.startsWith("http")
        ? photo
        : `${config.api.API_URL}/${String(photo).replace(/^\/+/, "")}`;
};

const ProfileDropdown = () => {
    const navigate = useNavigate();
    const { adminData, setAdminData, role } = useContext(AuthContext);

    const photoSrc = profilePhotoSrc(adminData);
    const personName = adminData?.employeeName?.trim() || "";
    const initials = personName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");

    const handleLogout = async () => {
        setAdminData(null);
        await logout(); // This will call the server and clear localStorage
        // Note: logout() already redirects to "/", so no need to navigate here
    };

    //Dropdown Toggle
    const [isProfileDropdown, setIsProfileDropdown] = useState(false);
    const toggleProfileDropdown = () => {
        setIsProfileDropdown(!isProfileDropdown);
    };
    return (
        <Dropdown
            isOpen={isProfileDropdown}
            toggle={toggleProfileDropdown}
            className="ms-sm-3 header-item topbar-user"
        
        >
            <DropdownToggle tag="button" type="button" className="btn">
                <span className="d-flex align-items-center">
                    {photoSrc ? (
                        <img
                            className="rounded-circle header-profile-user"
                            src={photoSrc}
                            alt="Profile"
                            style={{ objectFit: "cover" }}
                        />
                    ) : (
                        <span
                            className="rounded-circle header-profile-user d-inline-flex align-items-center justify-content-center"
                            aria-hidden="true"
                            style={{
                                background: "#224c99",
                                color: "#ffffff",
                                fontSize: initials ? 12 : 16,
                                fontWeight: 600,
                                lineHeight: 1,
                            }}
                        >
                            {initials || <i className="ri-user-3-line" />}
                        </span>
                    )}
                    <span className="text-start ms-xl-2">
                        <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text">
                            
                            
                            {role}
                        </span>
                        {/* <span className="d-none d-xl-block ms-1 fs-12 text-muted user-name-sub-text">Founder</span> */}
                    </span>
                </span>
            </DropdownToggle>
            <DropdownMenu className="dropdown-menu-end">
                <h6 className="dropdown-header">
                    Welcome {adminData?.companyName || adminData?.employeeName}!
                </h6>
                <DropdownItem
                    onClick={() => navigate(role === "ADMIN" ? "/company-details" : "/profile")}
                >
                    <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>
                    <span className="align-middle">Profile</span>
                </DropdownItem>

                <DropdownItem onClick={handleLogout}>
                    <i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i>{" "}
                    <span className="align-middle" data-key="t-logout">
                        Logout
                    </span>
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
};

export default ProfileDropdown;

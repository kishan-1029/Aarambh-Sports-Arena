import React, { useEffect, useState, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import withRouter from "../../Components/Common/withRouter";
import { MenuContext } from "../../context/MenuContext";
import { AuthContext } from "../../context/AuthContext";
import {
    buildArambhNavGroups,
    buildLegacyNavGroups,
    iconForMenuUrl,
    mergeAdminNavGroups,
} from "../../config/arambhNav";
import { usePermission } from "../../hooks/usePermission";

const VerticalLayout = (props) => {
    const { menuData, loading, isAdmin, updateCurrentPagePermissions } =
        useContext(MenuContext);
    const { adminData, role } = useContext(AuthContext);
    const { can } = usePermission();
    const [expandedItems, setExpandedItems] = useState({});
    const unrestricted = isAdmin || role === "ADMIN";

    const path = props.router.location.pathname;

    const pathActive = (url) => {
        if (!url || url === "#") return false;
        const current = String(path || "").split("?")[0].replace(/\/+$/, "") || "/";
        const target = String(url).split("?")[0].replace(/\/+$/, "") || "/";
        return current === target;
    };

    const treeHasActive = (nodes) =>
        (nodes || []).some(
            (node) =>
                pathActive(node?.url) ||
                treeHasActive(node?.children) ||
                treeHasActive(node?.menus)
        );

    const arambhGroups = useMemo(() => {
        if (!unrestricted) return [];
        return buildArambhNavGroups()
            .map((group) => ({
                ...group,
                menus: (group.menus || []).filter((m) => !m.perm || can(m.perm)),
            }))
            .filter((g) =>
                g.isLink ? !g.perm || can(g.perm) : g.menus && g.menus.length > 0,
            );
    }, [can, unrestricted]);

    const legacyGroups = useMemo(() => {
        if (!unrestricted) return [];
        return buildLegacyNavGroups();
    }, [unrestricted]);

    const normPath = (url) =>
        String(url || "").split("?")[0].replace(/\/+$/, "") || "/";

    // Find parent menu/group IDs for a given URL path
    const findParentIds = (menuItems, targetPath, parentIds = []) => {
        const target = normPath(targetPath);
        for (const item of menuItems) {
            if (item.url && normPath(item.url) === target) {
                return parentIds;
            }
            if (item.children && item.children.length > 0) {
                const found = findParentIds(item.children, targetPath, [...parentIds, item.id]);
                if (found) return found;
            }
            if (item.menus && item.menus.length > 0) {
                const found = findParentIds(item.menus, targetPath, [...parentIds, item.groupId]);
                if (found) return found;
            }
        }
        return null;
    };

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        document.body.classList.remove("vertical-sidebar-enable");

        const trees = [
            ...(Array.isArray(menuData) ? menuData : []),
            ...legacyGroups,
            ...arambhGroups,
        ];
        const parentIds = findParentIds(trees, path) || [];
        setExpandedItems(Object.fromEntries(parentIds.map((id) => [id, true])));
    }, [path, props.layoutType, menuData, arambhGroups, legacyGroups]);

    // Toggle expanded state for any menu item (accordion behavior - only one open at a time per level)
    // siblingIds contains the IDs of all sibling items at the same level
    const toggleItem = (itemId, siblingIds = []) => {
        setExpandedItems((prev) => {
            const isCurrentlyOpen = prev[itemId];

            if (isCurrentlyOpen) {
                // If we're closing, just toggle this item
                return {
                    ...prev,
                    [itemId]: false,
                };
            } else {
                const newState = { ...prev };
                // Close all sibling items
                siblingIds.forEach((id) => {
                    if (id !== itemId) {
                        newState[id] = false;
                    }
                });
                // Open the clicked item
                newState[itemId] = true;
                return newState;
            }
        });
    };

    // Handle menu item click to update current page permissions
    const handleMenuItemClick = (menuId) => {
        if (menuId) {
            updateCurrentPagePermissions(menuId);
        }
    };

    // Recursive function to render menu items at any nesting level
    // siblingIds contains IDs of all sibling items at this level for accordion behavior
    const renderMenuItem = (item, siblingIds = []) => {
        // Handle edge cases
        if (!item?.name) {
            return null;
        }

        // Exclude the obsolete Add Admin menu item from rendering in the sidebar
        if (item.name === "Add Admin" || item.url === "/employee/add-admin") {
            return null;
        }

        const iconClass = item.icon || iconForMenuUrl(item.url);

        // If this item has children, render a collapsible menu
        if (item.isParent && item.children?.length > 0) {
            // Get sibling IDs for children (for nested accordion behavior)
            const childSiblingIds = item.children
                .filter(
                    (child) =>
                        child.isParent &&
                        child.children?.length > 0
                )
                .map((child) => child.id);

            const childActive = treeHasActive(item.children);
            const open = Boolean(expandedItems[item.id]) || childActive;
            return (
                <li className="nav-item" key={item.id}>
                    <Link
                        className="nav-link menu-link"
                        to="#"
                        data-bs-toggle="collapse"
                        onClick={() => toggleItem(item.id, siblingIds)}
                        style={{ justifyContent: " !important" }}
                        aria-expanded={open ? "true" : "false"}
                    >
                        {iconClass ? <i className={iconClass}></i> : null}
                        <span data-key="t-apps">{item.name}</span>
                    </Link>
                    <div
                        className={`menu-dropdown ${open ? "menu-dropdown-open" : ""}`}
                        data-group-name={item.name}
                    >
                        <ul className="nav nav-sm flex-column">
                            {item.children.map((child) =>
                                renderMenuItem(child, childSiblingIds)
                            )}
                        </ul>
                    </div>
                </li>
            );
        }
        // Otherwise, render a regular link
        else {
            const active = pathActive(item.url);
            return (
                <li className="nav-item" key={item.id}>
                    <Link
                        className={`nav-link${active ? " active" : ""}`}
                        to={item.url}
                        aria-current={active ? "page" : undefined}
                        onClick={() => handleMenuItemClick(item.id)}
                    >
                        {iconClass ? <i className={iconClass}></i> : null}
                        <span data-key="t-apps">{item.name}</span>
                        {item.badge ? (
                            <span className="badge bg-warning-subtle text-warning ms-auto" style={{ fontSize: "0.65rem" }}>
                                {item.badge}
                            </span>
                        ) : null}
                    </Link>
                </li>
            );
        }
    };

    // Function to render a direct link menu group
    const renderDirectLinkMenuGroup = (group) => {
        // Validate the group object has the necessary properties
        if (!group?.groupName || !group?.url) {
            return null;
        }

        const active = pathActive(group.url);
        return (
            <li className="nav-item" key={group.groupId}>
                <Link
                    className={`nav-link menu-link${active ? " active" : ""}`}
                    to={group.url}
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                        setExpandedItems({});
                        handleMenuItemClick(group.groupId);
                    }}
                >
                    {group.icon ? <i className={group.icon}></i> : null}
                    <span data-key="t-apps">{group.groupName}</span>
                </Link>
            </li>
        );
    };

    // Function to render a menu group with its menu items
    // siblingGroupIds contains IDs of all sibling groups for accordion behavior
    const renderMenuGroup = (group, siblingGroupIds = []) => {
        // Check if this is a direct link menu group
        if (group.isLink) {
            return renderDirectLinkMenuGroup(group);
        }

        // Validate the group object has the necessary properties
        if (!group?.groupName || !group?.menus) {
            return null;
        }

        // Get sibling IDs for menu items within this group (for nested accordion behavior)
        const menuSiblingIds = group.menus
            .filter(
                (menu) =>
                    menu.isParent && menu.children?.length > 0
            )
            .map((menu) => menu.id);

        const childActive = treeHasActive(group.menus);
        const open = Boolean(expandedItems[group.groupId]) || childActive;
        return (
            <li className="nav-item" key={group.groupId}>
                <Link
                    className="nav-link menu-link"
                    to="#"
                    data-bs-toggle="collapse"
                    onClick={() => toggleItem(group.groupId, siblingGroupIds)}
                    aria-expanded={open ? "true" : "false"}
                >
                    {group.icon ? <i className={group.icon}></i> : null}
                    <span data-key="t-apps">{group.groupName}</span>
                </Link>

                <div
                    className={`menu-dropdown ${open ? "menu-dropdown-open" : ""}`}
                    data-group-name={group.groupName}
                >
                    <ul className="nav nav-sm flex-column">
                        {group?.menus?.map((menu) =>
                            renderMenuItem(menu, menuSiblingIds)
                        )}
                    </ul>
                </div>
            </li>
        );
    };

    const renderMenuContent = () => {
        if (loading) {
            return (
                <li className="nav-item">
                    <span className="nav-link">Loading menus...</span>
                </li>
            );
        }

        // Helper to clone and insert Add Admin option dynamically if Super Admin
        const getFilteredMenuData = () => {
            const source = Array.isArray(menuData) ? menuData : [];
            let clonedData = JSON.parse(JSON.stringify(source));
            if (adminData?.isSuperAdmin === true) {
                clonedData.forEach(group => {
                    if (group.menus) {
                        group.menus.forEach(menu => {
                            if (menu.name === "Employee Management") {
                                if (!menu.children) menu.children = [];
                                if (!menu.children.some(child => child.id === "add-admin-menu-id")) {
                                    menu.children.push({
                                        id: "add-admin-menu-id",
                                        name: "Add Admin",
                                        url: "/employee/add-admin",
                                        isParent: false
                                    });
                                }
                            }
                            if (menu.children) {
                                menu.children.forEach(subMenu => {
                                    if (subMenu.name === "Employee Management") {
                                        if (!subMenu.children) subMenu.children = [];
                                        if (!subMenu.children.some(child => child.id === "add-admin-menu-id")) {
                                            subMenu.children.push({
                                                id: "add-admin-menu-id",
                                                name: "Add Admin",
                                                url: "/employee/add-admin",
                                                isParent: false
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }
            return clonedData;
        };

        const processedMenuData = getFilteredMenuData();

        // Employees see only the menus and menu groups checked on Employee Roles.
        // Admins keep the full shell (legacy + Arambh + any extra API groups).
        const mergedMenuData = unrestricted
            ? mergeAdminNavGroups(processedMenuData, arambhGroups, legacyGroups)
            : processedMenuData;

        if (mergedMenuData.length === 0) {
            return (
                <li className="nav-item">
                    <span className="nav-link">
                        No menu items available.
                    </span>
                </li>
            );
        }

        // Get all sibling group IDs for top-level accordion behavior
        const siblingGroupIds = mergedMenuData
            .filter(
                (g) =>
                    !g.isLink &&
                    g.menus &&
                    g.menus.length > 0
            )
            .map((g) => g.groupId);

        return (
            <React.Fragment>
                {mergedMenuData.map((group) =>
                    renderMenuGroup(group, siblingGroupIds)
                )}
            </React.Fragment>
        );
    };

    return (
        <div className="mb-5">
            {/* menu Items */}
            <li className="menu-title">
                <span
                    data-key="t-menu"
                    style={{ fontSize: "14px", padding: "0px" }}
                >
                    Menu
                </span>
            </li>

            {renderMenuContent()}
        </div>
    );
};

VerticalLayout.propTypes = {
    router: PropTypes.shape({
        location: PropTypes.object.isRequired,
    }).isRequired,
    layoutType: PropTypes.string,
};

export default withRouter(VerticalLayout);

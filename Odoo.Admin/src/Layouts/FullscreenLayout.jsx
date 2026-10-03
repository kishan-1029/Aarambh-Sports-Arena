import React from "react";
import { Link, Outlet } from "react-router-dom";

/**
 * Full-screen shell for POS / KDS / Front Desk — no sidebar.
 */
const FullscreenLayout = () => (
  <div className="arambh-fullscreen">
    <div className="arambh-fullscreen-bar">
      <div>
        <span className="arambh-brand-text">Arambh Sports Arena</span>
        <span className="text-muted small ms-2">POS</span>
      </div>
      <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
        Exit to dashboard
      </Link>
    </div>
    <Outlet />
  </div>
);

export default FullscreenLayout;

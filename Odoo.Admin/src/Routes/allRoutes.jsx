import { Navigate } from "react-router-dom";
import Login from "../pages/Authentication/Login";
import UserProfile from "../pages/Authentication/user-profile";
import CompanyDetails from "../pages/Setup/CompanyDetails";
import Department from "../pages/Setup/Department";
import Employee from "../pages/Setup/Employee";
import Country from "../pages/Master/Country";
import State from "../pages/Master/State";
import City from "../pages/Master/City";
import EmailSetup from "../pages/CMS/EmailSetup";
import EmailFor from "../pages/CMS/EmailFor";
import EmailTo from "../pages/CMS/EmailTo";
import EmailTemplate from "../pages/CMS/EmailTemplate";
import Dashboard from "../pages/Dashboard/Dashboard";
import MenuGroup from "../pages/Master/MenuGroup";
import MenuMaster from "../pages/Master/MenuMaster";
import EmployeeRoles from "../pages/Setup/EmployeeRoles";
import RoleMaster from "../pages/Master/RoleMaster";
import CurrencyMaster from "../pages/Master/CurrencyMaster";
import LoginAttemptLogs from "../pages/Master/LoginAttemptLogs";
import BlogCategory from "../pages/CMS/BlogCategory";
import BlogTag from "../pages/CMS/BlogTag";
import BlogMaster from "../pages/CMS/BlogMaster";
import FaqCategory from "../pages/Setup/FaqCategory";
import Faq from "../pages/Setup/Faq";
import GuidesGallery from "../pages/HelpGuides/GuidesGallery";
import ManageGuides from "../pages/HelpGuides/ManageGuides";
import ComingSoon from "../pages/Arambh/ComingSoon";
import StaffDirectory from "../pages/Arambh/StaffDirectory";
import SettingsClub from "../pages/Arambh/SettingsClub";
import Taxes from "../pages/Arambh/Taxes";
import Customers from "../pages/Arambh/Customers";
import Invoices from "../pages/Arambh/Invoices";
import InvoiceDetail from "../pages/Arambh/InvoiceDetail";
import PaymentsSettings from "../pages/Arambh/PaymentsSettings";
import PosPlaceholder from "../pages/Arambh/PosPlaceholder";
import Members from "../pages/Arambh/Members";
import MemberDetail from "../pages/Arambh/MemberDetail";
import MembershipPlans from "../pages/Arambh/MembershipPlans";
import Memberships from "../pages/Arambh/Memberships";
import Courts from "../pages/Arambh/Courts";
import Bookings from "../pages/Arambh/Bookings";
import FrontDesk from "../pages/Arambh/FrontDesk";


const authProtectedRoutes = [
    { path: "/profile", component: <UserProfile /> },
    { path: "/company-details", component: <CompanyDetails /> },
    { path: "/department", component: <Department /> },
    { path: "/employee", component: <Employee /> },
    { path: "/employee-roles", component: <EmployeeRoles /> },
    { path: "/country", component: <Country /> },
    { path: "/state", component: <State /> },
    { path: "/city", component: <City /> },
    { path: "/email-setup", component: <EmailSetup /> },
    { path: "/email-for", component: <EmailFor /> },
    { path: "/email-to", component: <EmailTo /> },
    { path: "/email-template", component: <EmailTemplate /> },
    { path: "/blog-category", component: <BlogCategory /> },
    { path: "/blog-tag", component: <BlogTag /> },
    { path: "/blog-master", component: <BlogMaster /> },
    { path: "/faq-category", component: <FaqCategory /> },
    { path: "/faq", component: <Faq /> },
    { path: "/guides-gallery", component: <GuidesGallery /> },
    { path: "/manage-guides", component: <ManageGuides /> },
    { path: "/dashboard", component: <Dashboard /> },
    { path: "/menu-group", component: <MenuGroup /> },
    { path: "/menu-master", component: <MenuMaster /> },
    { path: "/role-master", component: <RoleMaster /> },
    { path: "/currency-master", component: <CurrencyMaster /> },
    { path: "/login-attempt-logs", component: <LoginAttemptLogs /> },

    // Arambh module placeholders + sample list (Phase 3)
    { path: "/front-desk", component: <FrontDesk /> },
    { path: "/courts", component: <Courts /> },
    { path: "/courts/bookings", component: <Bookings /> },
    { path: "/members", component: <Members /> },
    { path: "/members/:id", component: <MemberDetail /> },
    { path: "/membership-plans", component: <MembershipPlans /> },
    { path: "/memberships", component: <Memberships /> },
    { path: "/kds", component: <ComingSoon /> },
    { path: "/shop/inventory", component: <ComingSoon /> },
    { path: "/crm/pipeline", component: <ComingSoon /> },
    { path: "/customers", component: <Customers /> },
    { path: "/finance/invoices", component: <Invoices /> },
    { path: "/finance/invoices/:id", component: <InvoiceDetail /> },
    { path: "/settings/payments", component: <PaymentsSettings /> },
    { path: "/settings/club", component: <SettingsClub /> },
    { path: "/settings/taxes", component: <Taxes /> },
    { path: "/staff", component: <ComingSoon /> },
    { path: "/staff/directory", component: <StaffDirectory /> },
    { path: "/reports", component: <ComingSoon /> },
    { path: "/settings", component: <ComingSoon /> },

    {
        path: "/",
        exact: true,
        component: <Navigate to="/dashboard" />,
    },
    { path: "*", component: <Navigate to="/dashboard" /> },
];

/** Fullscreen routes (no sidebar) — POS stub */
const fullscreenRoutes = [
    { path: "/pos", component: <PosPlaceholder /> },
];

const publicRoutes = [
    { path: "/", component: <Login /> },
    // { path: "*", component: <Navigate to="/" /> },
];

export { authProtectedRoutes, publicRoutes, fullscreenRoutes };

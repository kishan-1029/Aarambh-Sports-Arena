import React, { useContext } from "react";
import { Container, Row, Col, Card, CardBody } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import KpiTile from "../../Components/Common/KpiTile";
import Money from "../../Components/Common/Money";
import { AuthContext } from "../../context/AuthContext";

const Dashboard = () => {
    const navigate = useNavigate();
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const { adminData } = useContext(AuthContext);

    const getGreeting = () => {
        if (currentHour < 12) {
            return "Good Morning";
        } else if (currentHour < 17) {
            return "Good Afternoon";
        } else {
            return "Good Evening";
        }
    };

    document.title = `Dashboard | Arambh Sports Arena`;

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Dashboard" pageTitle="Arambh Sports Arena" />

                <Row className="mb-3">
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm" style={{ borderRadius: "var(--arambh-radius)" }}>
                            <CardBody className="py-4">
                                <h4 className="mb-1">
                                    {getGreeting()}
                                    {adminData?.employeeName ? `, ${adminData.employeeName}` : ""}
                                </h4>
                                <p className="text-muted mb-0">
                                    Welcome to{" "}
                                    <span className="arambh-brand-text">Arambh Sports Arena</span>
                                    {adminData?.companyName ? ` · ${adminData.companyName}` : ""}.
                                    Use <kbd className="small">Ctrl</kbd>+<kbd className="small">K</kbd> to jump to any module.
                                </p>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                <Row className="g-3 mb-4">
                    <Col md={4}>
                        <KpiTile
                            title="Sample revenue (paise demo)"
                            value={<Money paise={12345600} />}
                            delta="Placeholder until finance reports"
                            icon="ri-money-rupee-circle-line"
                        />
                    </Col>
                    <Col md={4}>
                        <KpiTile
                            title="Staff directory"
                            value="Live"
                            delta="Sample list → employees API"
                            icon="ri-team-line"
                            onClick={() => navigate("/staff/directory")}
                        />
                    </Col>
                    <Col md={4}>
                        <KpiTile
                            title="Modules"
                            value="Coming soon"
                            delta="Bookings, POS, CRM…"
                            icon="ri-apps-2-line"
                        />
                    </Col>
                </Row>

                <Row>
                    <Col md={6}>
                        <Card className="border-0 shadow-sm" style={{ borderRadius: "var(--arambh-radius)" }}>
                            <CardBody>
                                <h5 className="mb-3">Quick links</h5>
                                <ul className="list-unstyled mb-0">
                                    <li className="mb-2">
                                        <Link to="/staff/directory">Staff directory (sample DataTable)</Link>
                                    </li>
                                    <li className="mb-2">
                                        <Link to="/front-desk">Front Desk</Link>
                                        <span className="badge bg-warning-subtle text-warning ms-2">Soon</span>
                                    </li>
                                    <li className="mb-2">
                                        <Link to="/pos">POS (fullscreen)</Link>
                                        <span className="badge bg-warning-subtle text-warning ms-2">Soon</span>
                                    </li>
                                    <li>
                                        <Link to="/role-master">Role Master</Link>
                                    </li>
                                </ul>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Dashboard;

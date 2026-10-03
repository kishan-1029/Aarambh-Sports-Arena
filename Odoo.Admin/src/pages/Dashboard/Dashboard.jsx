import React, { useContext, useEffect, useState } from "react";
import { Container, Row, Col, Card, CardBody, Badge } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import KpiTile from "../../Components/Common/KpiTile";
import Money from "../../Components/Common/Money";
import Skeleton from "../../Components/Common/Skeleton";
import PieChart from "../../Components/Common/PieChart";
import { AuthContext } from "../../context/AuthContext";
import { getDashboard } from "../../api/arambhDashboard.api";

function formatPaiseShort(paise) {
  const rupees = Math.round((Number(paise) || 0) / 100);
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;
  return `₹${rupees}`;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { adminData } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  document.title = "Dashboard | Arambh Sports Arena";

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getDashboard()
      .then((res) => {
        if (!alive) return;
        setData(res?.data?.data || null);
        setError("");
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load dashboard");
        setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const kpis = data?.kpis || {};
  const charts = data?.charts || {};
  const lists = data?.lists || {};
  const trend = charts.bookingsTrend || [];
  const revenueTrend = charts.revenueTrend || [];
  const maxTrend = Math.max(1, ...trend.map((t) => t.bookings || 0));
  const maxRevenue = Math.max(1, ...revenueTrend.map((t) => t.revenuePaise || 0));
  const bySport = charts.bookingsBySport || [];
  const byStatus = charts.bookingsByStatus || [];

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Dashboard" pageTitle="Arambh Sports Arena" />

        <Row className="mb-3">
          <Col lg={12}>
            <Card
              className="border-0 shadow-sm"
              style={{
                borderRadius: "var(--arambh-radius)",
                background: "linear-gradient(135deg,#3eb474,#0c3d28)",
                color: "#fff",
              }}
            >
              <CardBody className="py-3 py-md-4">
                <h4 className="mb-1 text-white">
                  {greeting}
                  {adminData?.employeeName ? `, ${adminData.employeeName}` : ""}
                </h4>
                <p className="mb-0" style={{ opacity: 0.9 }}>
                  Live club pulse for <strong>Arambh Sports Arena</strong>
                  {data?.period?.today ? ` · ${data.period.today}` : ""}.
                  {" "}Tap any KPI to open the related screen.
                </p>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {loading && (
          <Row className="g-3 mb-3">
            {[1, 2, 3, 4].map((i) => (
              <Col md={6} xl={3} key={i}>
                <Card className="border-0 shadow-sm" style={{ borderRadius: "var(--arambh-radius)" }}>
                  <CardBody>
                    <Skeleton rows={3} height={16} />
                  </CardBody>
                </Card>
              </Col>
            ))}
            <Col lg={12}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: "var(--arambh-radius)" }}>
                <CardBody>
                  <Skeleton rows={6} height={18} />
                </CardBody>
              </Card>
            </Col>
          </Row>
        )}

        {error && !loading && (
          <div className="alert alert-warning">
            {error}. Showing empty KPIs — check API on port 7003 and re-login.
          </div>
        )}

        {!loading && (
          <>
            <Row className="g-3 mb-3">
              <Col md={6} xl={3}>
                <KpiTile
                  title="Daily revenue"
                  value={<Money paise={kpis.revenueTodayPaise || 0} />}
                  delta={`Collected today ${formatPaiseShort(kpis.collectionsTodayPaise || 0)}`}
                  deltaTone="up"
                  icon="ri-calendar-todo-line"
                  onClick={() => navigate("/finance/invoices")}
                />
              </Col>
              <Col md={6} xl={3}>
                <KpiTile
                  title="Month revenue"
                  value={<Money paise={kpis.revenueMonthPaise || 0} />}
                  delta="Posted invoices MTD"
                  icon="ri-money-rupee-circle-line"
                  onClick={() => navigate("/finance/invoices")}
                />
              </Col>
              <Col md={6} xl={3}>
                <KpiTile
                  title="Collections"
                  value={<Money paise={kpis.collectionsMonthPaise || 0} />}
                  delta="Captured payments MTD"
                  icon="ri-bank-card-line"
                  onClick={() => navigate("/settings/payments")}
                />
              </Col>
              <Col md={6} xl={3}>
                <KpiTile
                  title="Bookings today"
                  value={String(kpis.bookingsToday ?? 0)}
                  delta={`${kpis.bookingsWeek ?? 0} this week · ~${kpis.occupancyHintPct ?? 0}% util.`}
                  icon="ri-calendar-check-line"
                  onClick={() => navigate("/courts/bookings")}
                />
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col md={6} xl={3}>
                <KpiTile
                  title="Active members"
                  value={String(kpis.membersActive ?? 0)}
                  delta={`${kpis.membersTotal ?? 0} total · ${kpis.membershipsExpiringSoon ?? 0} expiring ≤7d`}
                  icon="ri-group-line"
                  onClick={() => navigate("/members")}
                />
              </Col>
              <Col md={6} xl={3}>
                <KpiTile
                  title="Active memberships"
                  value={String(kpis.membershipsActive ?? 0)}
                  delta="Gold / Silver / Junior"
                  icon="ri-vip-crown-line"
                  onClick={() => navigate("/memberships")}
                />
              </Col>
              <Col md={6} xl={3}>
                <KpiTile
                  title="Courts online"
                  value={String(kpis.courtsActive ?? 0)}
                  delta="Ready for front desk"
                  icon="ri-layout-grid-line"
                  onClick={() => navigate("/courts")}
                />
              </Col>
              <Col md={6} xl={3}>
                <KpiTile
                  title="Customers"
                  value={String(kpis.customersTotal ?? 0)}
                  delta="Billing parties"
                  icon="ri-contacts-book-line"
                  onClick={() => navigate("/customers")}
                />
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col md={6} xl={3}>
                <KpiTile
                  title="Open leads"
                  value={String(kpis.leadsOpen ?? 0)}
                  delta="Website / trial / walk-in"
                  icon="ri-customer-service-2-line"
                  onClick={() => navigate("/crm/pipeline")}
                />
              </Col>
              <Col md={6} xl={3}>
                <KpiTile
                  title="Front desk"
                  value="Open"
                  delta="Check-in · quick book"
                  icon="ri-flashlight-line"
                  onClick={() => navigate("/front-desk")}
                />
              </Col>
              <Col md={6} xl={3}>
                <KpiTile
                  title="Membership plans"
                  value="Plans"
                  delta="Gold · Silver · Junior"
                  icon="ri-price-tag-3-line"
                  onClick={() => navigate("/membership-plans")}
                />
              </Col>
              <Col md={6} xl={3}>
                <KpiTile
                  title="Club settings"
                  value="Setup"
                  delta="Locations · hours · taxes"
                  icon="ri-settings-3-line"
                  onClick={() => navigate("/settings/club")}
                />
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col lg={7}>
                <Card
                  className="border-0 shadow-sm h-100"
                  style={{ borderRadius: "var(--arambh-radius)", cursor: "pointer" }}
                  onClick={() => navigate("/finance/invoices")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate("/finance/invoices");
                    }
                  }}
                >
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Daily revenue · last 7 days</h5>
                      <span className="small" style={{ color: "var(--arambh-brand)" }}>
                        Invoices <i className="ri-arrow-right-s-line" />
                      </span>
                    </div>
                    {revenueTrend.length === 0 ? (
                      <p className="text-muted mb-0">No revenue trend data yet.</p>
                    ) : (
                      <div className="d-flex align-items-end gap-2" style={{ height: 200 }}>
                        {revenueTrend.map((t) => (
                          <div
                            key={t.date}
                            className="flex-fill text-center h-100 d-flex flex-column justify-content-end"
                          >
                            <div className="small text-muted mb-1">{formatPaiseShort(t.revenuePaise)}</div>
                            <div
                              style={{
                                height: `${Math.max(8, ((t.revenuePaise || 0) / maxRevenue) * 150)}px`,
                                background: "linear-gradient(180deg,#5fd196,#0f7a4a)",
                                borderRadius: "8px 8px 4px 4px",
                              }}
                            />
                            <div className="small mt-1 fw-semibold">{t.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>
              <Col lg={5}>
                <Card
                  className="border-0 shadow-sm h-100"
                  style={{ borderRadius: "var(--arambh-radius)", cursor: "pointer" }}
                  onClick={() => navigate("/courts/bookings")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate("/courts/bookings");
                    }
                  }}
                >
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Bookings · last 7 days</h5>
                      <span className="small" style={{ color: "var(--arambh-brand)" }}>
                        Bookings <i className="ri-arrow-right-s-line" />
                      </span>
                    </div>
                    {trend.length === 0 ? (
                      <p className="text-muted mb-0">No booking trend data yet.</p>
                    ) : (
                      <div className="d-flex align-items-end gap-2" style={{ height: 200 }}>
                        {trend.map((t) => (
                          <div
                            key={t.date}
                            className="flex-fill text-center h-100 d-flex flex-column justify-content-end"
                          >
                            <div className="small text-muted mb-1">{t.bookings}</div>
                            <div
                              style={{
                                height: `${Math.max(8, ((t.bookings || 0) / maxTrend) * 150)}px`,
                                background: "linear-gradient(180deg,#3eb474,#0f7a4a)",
                                borderRadius: "8px 8px 4px 4px",
                              }}
                            />
                            <div className="small mt-1 fw-semibold">{t.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col lg={6}>
                <Card
                  className="border-0 shadow-sm h-100"
                  style={{ borderRadius: "var(--arambh-radius)", cursor: "pointer" }}
                  onClick={() => navigate("/courts/bookings")}
                  role="button"
                  tabIndex={0}
                >
                  <CardBody>
                    <h5 className="mb-3">Bookings by sport (30d)</h5>
                    <PieChart
                      items={bySport.map((s) => ({ label: s.sport, value: s.count }))}
                      emptyLabel="No sport split yet."
                    />
                  </CardBody>
                </Card>
              </Col>
              <Col lg={6}>
                <Card
                  className="border-0 shadow-sm h-100"
                  style={{ borderRadius: "var(--arambh-radius)", cursor: "pointer" }}
                  onClick={() => navigate("/courts/bookings")}
                  role="button"
                  tabIndex={0}
                >
                  <CardBody>
                    <h5 className="mb-3">Bookings by status (14d)</h5>
                    <PieChart
                      items={byStatus.map((s) => ({ label: s.status, value: s.count }))}
                      emptyLabel="No status split yet."
                    />
                  </CardBody>
                </Card>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col lg={6}>
                <Card className="border-0 shadow-sm h-100" style={{ borderRadius: "var(--arambh-radius)" }}>
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Upcoming bookings</h5>
                      <Link to="/courts/bookings">View all</Link>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Date</th>
                            <th>Court</th>
                            <th>Member</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(lists.upcomingBookings || []).length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-muted">
                                No upcoming bookings
                              </td>
                            </tr>
                          )}
                          {(lists.upcomingBookings || []).map((b) => (
                            <tr key={b.id}>
                              <td className="fw-medium">{b.bookingNo}</td>
                              <td>{b.localDate}</td>
                              <td>{b.court}</td>
                              <td>{b.member}</td>
                              <td>
                                <Badge color="success" pill>
                                  {b.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              </Col>
              <Col lg={6}>
                <Card className="border-0 shadow-sm h-100" style={{ borderRadius: "var(--arambh-radius)" }}>
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Memberships expiring ≤ 7 days</h5>
                      <Link to="/memberships">Memberships</Link>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Plan</th>
                            <th>Ends</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(lists.expiringMemberships || []).length === 0 && (
                            <tr>
                              <td colSpan={3} className="text-muted">
                                None expiring this week
                              </td>
                            </tr>
                          )}
                          {(lists.expiringMemberships || []).map((m) => (
                            <tr key={m.id}>
                              <td>
                                {m.member ? (
                                  <Link to={`/members/${m.member.id}`}>{m.member.name}</Link>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td>
                                <Badge color="warning" pill>
                                  {(m.planKey || "").toUpperCase()}
                                </Badge>
                              </td>
                              <td className="text-danger fw-semibold">{m.endLocalDate || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Container>
    </div>
  );
};

export default Dashboard;

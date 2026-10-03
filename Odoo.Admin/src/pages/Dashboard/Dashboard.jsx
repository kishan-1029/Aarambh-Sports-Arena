import React, { useContext, useEffect, useState } from "react";
import { Container, Row, Col, Card, CardBody, Badge, Spinner, Progress } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import KpiTile from "../../Components/Common/KpiTile";
import Money from "../../Components/Common/Money";
import { AuthContext } from "../../context/AuthContext";
import { getDashboard } from "../../api/arambhDashboard.api";

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
  const maxTrend = Math.max(1, ...trend.map((t) => t.bookings || 0));
  const bySport = charts.bookingsBySport || [];
  const sportTotal = Math.max(1, bySport.reduce((s, x) => s + (x.count || 0), 0));

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
                </p>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {loading && (
          <div className="text-center py-5">
            <Spinner color="success" />
            <div className="text-muted mt-2">Loading club KPIs…</div>
          </div>
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
                  title="Active members"
                  value={String(kpis.membersActive ?? 0)}
                  delta={`${kpis.membersTotal ?? 0} total · ${kpis.membershipsExpiringSoon ?? 0} expiring ≤7d`}
                  icon="ri-group-line"
                  onClick={() => navigate("/members")}
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
              <Col md={6} xl={3}>
                <KpiTile
                  title="Open leads"
                  value={String(kpis.leadsOpen ?? 0)}
                  delta="Website / trial / walk-in"
                  icon="ri-customer-service-2-line"
                />
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col lg={7}>
                <Card className="border-0 shadow-sm h-100" style={{ borderRadius: "var(--arambh-radius)" }}>
                  <CardBody>
                    <h5 className="mb-3">Bookings · last 7 days</h5>
                    {trend.length === 0 ? (
                      <p className="text-muted mb-0">No booking trend data yet.</p>
                    ) : (
                      <div className="d-flex align-items-end gap-2" style={{ height: 200 }}>
                        {trend.map((t) => (
                          <div key={t.date} className="flex-fill text-center h-100 d-flex flex-column justify-content-end">
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
              <Col lg={5}>
                <Card className="border-0 shadow-sm h-100" style={{ borderRadius: "var(--arambh-radius)" }}>
                  <CardBody>
                    <h5 className="mb-3">Bookings by sport (30d)</h5>
                    {bySport.length === 0 ? (
                      <p className="text-muted mb-0">No sport split yet.</p>
                    ) : (
                      bySport.map((s) => (
                        <div key={s.sport} className="mb-3">
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="fw-semibold">{s.sport}</span>
                            <span>{s.count}</span>
                          </div>
                          <Progress
                            value={Math.round(((s.count || 0) / sportTotal) * 100)}
                            color="success"
                            style={{ height: 8 }}
                          />
                        </div>
                      ))
                    )}
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

            <Row>
              <Col>
                <Card className="border-0 shadow-sm" style={{ borderRadius: "var(--arambh-radius)" }}>
                  <CardBody className="d-flex flex-wrap gap-2">
                    <Link className="btn btn-success btn-sm" to="/front-desk">
                      Front Desk
                    </Link>
                    <Link className="btn btn-outline-success btn-sm" to="/members">
                      Members
                    </Link>
                    <Link className="btn btn-outline-success btn-sm" to="/courts/bookings">
                      Bookings
                    </Link>
                    <Link className="btn btn-outline-success btn-sm" to="/finance/invoices">
                      Invoices
                    </Link>
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

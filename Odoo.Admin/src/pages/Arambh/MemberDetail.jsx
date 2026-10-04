import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Nav,
  NavItem,
  NavLink,
  Row,
  TabContent,
  TabPane,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import StatusChip from "../../Components/Common/StatusChip";
import Money from "../../Components/Common/Money";
import { Can } from "../../Components/Common/Can";
import { getMember, getMemberTimeline } from "../../api/arambhMembership.api";
import { apiErrorMessage } from "../../utils/apiErrorMessage";

const PLAN_COLOUR = {
  gold: "warning",
  silver: "secondary",
  junior: "success",
};

const MemberDetail = () => {
  const { id } = useParams();
  document.title = "Member 360 | Arambh Sports Arena";
  const [profile, setProfile] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("1");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, t] = await Promise.all([
        getMember(id),
        getMemberTimeline(id, { limit: 20 }),
      ]);
      setProfile(p?.data?.data || null);
      setTimeline(Array.isArray(t?.data?.data) ? t.data.data : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load member"),
        requestId: err?.response?.data?.requestId,
      });
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const member = profile?.member;
  const membership = profile?.membership;
  const ents = profile?.entitlements;

  return (
    <Can
      anyOf={["member.view"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState icon="ri-lock-line" title="No access" />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Member 360" pageTitle="Members" />
          {error && (
            <ErrorState message={error.message} requestId={error.requestId} onRetry={load} />
          )}
          {loading ? (
            <Skeleton rows={6} />
          ) : !member ? (
            <EmptyState title="Member not found" />
          ) : (
            <>
              <Card className="mb-3">
                <CardBody>
                  <Row className="align-items-center">
                    <Col md={8}>
                      <h4 className="mb-1">
                        {member.firstName} {member.lastName || ""}{" "}
                        <Badge color="primary" className="ms-1">
                          {member.memberCode}
                        </Badge>
                      </h4>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <Badge color="warning">{(member.tierKey || "none").toUpperCase()}</Badge>
                        <StatusChip status={member.status} />
                        <span className="text-muted small">{member.phone}</span>
                        <span className="text-muted small">{member.email}</span>
                      </div>
                      {member.membershipEndDate && (
                        <p className="mb-0 mt-2 small text-muted">
                          Expires {String(member.membershipEndDate).slice(0, 10)}
                        </p>
                      )}
                    </Col>
                    <Col md={4} className="text-md-end">
                      <Link to="/members" className="btn btn-soft-secondary btn-sm">
                        Back to list
                      </Link>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              <Nav tabs className="nav-tabs-custom mb-3">
                {[
                  ["1", "Overview"],
                  ["2", "Membership"],
                  ["3", "Timeline"],
                ].map(([k, label]) => (
                  <NavItem key={k}>
                    <NavLink
                      className={tab === k ? "active" : ""}
                      onClick={() => setTab(k)}
                      style={{ cursor: "pointer" }}
                    >
                      {label}
                    </NavLink>
                  </NavItem>
                ))}
              </Nav>

              <TabContent activeTab={tab}>
                <TabPane tabId="1">
                  <Row>
                    <Col md={6}>
                      <Card>
                        <CardHeader>
                          <h5 className="mb-0">Entitlements</h5>
                        </CardHeader>
                        <CardBody>
                          {ents ? (
                            <ul className="mb-0 list-unstyled">
                              <li>
                                Court: {ents.court?.access || "—"} ·{" "}
                                {ents.court?.pricing?.mode === "free"
                                  ? "free"
                                  : ents.court?.pricing?.mode === "discount_pct"
                                    ? `${ents.court.pricing.value}% off`
                                    : "walk-in"}
                              </li>
                              <li>Shop {ents.shopDiscountPct || 0}%</li>
                              <li>Bar {ents.barDiscountPct || 0}%</li>
                              <li>
                                Max bookings/day{" "}
                                {ents.court?.maxBookingsPerDay ?? "—"}
                              </li>
                              {(ents.perks || []).length > 0 && (
                                <li className="mt-2 text-muted small">
                                  Perks: {(ents.perks || []).join(", ")}
                                </li>
                              )}
                            </ul>
                          ) : (
                            <p className="text-muted mb-0">Non-member defaults</p>
                          )}
                        </CardBody>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card>
                        <CardHeader>
                          <h5 className="mb-0">Wallet & counts</h5>
                        </CardHeader>
                        <CardBody>
                          <p className="mb-1">
                            Wallet: <Money paise={profile?.counts?.walletBalancePaise || 0} />
                          </p>
                          <p className="mb-1 text-muted small">
                            Bookings this month: {profile?.counts?.bookingsThisMonth ?? 0}
                          </p>
                          <p className="mb-0 text-muted small">
                            Open tab: <Money paise={profile?.counts?.openTabPaise || 0} />
                          </p>
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>
                <TabPane tabId="2">
                  <Card>
                    <CardBody>
                      {membership ? (
                        <>
                          <p className="mb-1">
                            <Badge color={PLAN_COLOUR[membership.planKey] || "light"} pill>
                              {(membership.planKey || "—").toUpperCase()}
                            </Badge>{" "}
                            <span className="text-muted small">v{membership.planVersion}</span>{" "}
                            <StatusChip status={membership.status} />
                          </p>
                          <p className="mb-1 small">
                            {membership.startLocalDate} → {membership.endLocalDate}
                          </p>
                          <p className="mb-0">
                            Price: <Money paise={membership.pricePaise} />
                          </p>
                        </>
                      ) : (
                        <EmptyState
                          title="No current membership"
                          description="Purchase a plan from Memberships."
                        />
                      )}
                    </CardBody>
                  </Card>
                </TabPane>
                <TabPane tabId="3">
                  <Card>
                    <CardBody>
                      {timeline.length === 0 ? (
                        <EmptyState title="No activity yet" />
                      ) : (
                        <ul className="list-group list-group-flush">
                          {timeline.map((ev) => (
                            <li key={ev._id} className="list-group-item px-0">
                              <div className="fw-medium">{ev.title}</div>
                              <div className="small text-muted">
                                {ev.type} · {ev.at ? String(ev.at).slice(0, 19) : ""}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardBody>
                  </Card>
                </TabPane>
              </TabContent>
            </>
          )}
        </Container>
      </div>
    </Can>
  );
};

export default MemberDetail;

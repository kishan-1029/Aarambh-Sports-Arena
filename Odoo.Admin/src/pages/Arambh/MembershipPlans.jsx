import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Row,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import Money from "../../Components/Common/Money";
import { Can } from "../../Components/Common/Can";
import { listPlans } from "../../api/arambhMembership.api";

const MembershipPlans = () => {
  document.title = "Membership Plans | Arambh Sports Arena";
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPlans({ pageSize: 50, active: "true" });
      setPlans(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load plans",
        requestId: err?.response?.data?.requestId,
      });
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Can
      anyOf={["membership_plan.view", "membership.view", "member.view"]}
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
          <BreadCrumb title="Membership Plans" pageTitle="Arambh" />
          {error && (
            <ErrorState message={error.message} requestId={error.requestId} onRetry={load} />
          )}
          {loading ? (
            <Skeleton rows={4} />
          ) : plans.length === 0 && !error ? (
            <EmptyState
              title="No plans"
              description="Seed demo data to create Gold, Silver and Junior."
            />
          ) : (
            <Row>
              {plans.map((p) => (
                <Col md={4} key={p._id} className="mb-3">
                  <Card className="h-100">
                    <CardHeader
                      className="d-flex justify-content-between align-items-center"
                      style={{ borderTop: `4px solid ${p.colour || "#0d6efd"}` }}
                    >
                      <h5 className="mb-0">{p.name}</h5>
                      <Badge color="light" className="text-dark">
                        v{p.version}
                      </Badge>
                    </CardHeader>
                    <CardBody>
                      <p className="text-muted small">{p.description || "—"}</p>
                      <p className="mb-1 small">
                        Court: {p.entitlements?.court?.access || "—"} ·{" "}
                        {p.entitlements?.court?.pricing?.mode === "free"
                          ? "free"
                          : `${p.entitlements?.court?.pricing?.value ?? 0}% off`}
                      </p>
                      <p className="mb-1 small">
                        Shop {p.entitlements?.shopDiscountPct || 0}% · Bar{" "}
                        {p.entitlements?.barDiscountPct || 0}%
                      </p>
                      <p className="mb-2 small text-muted">
                        Age:{" "}
                        {p.eligibility?.minAge != null ? `≥${p.eligibility.minAge}` : "any"}
                        {p.eligibility?.maxAge != null
                          ? ` · ≤${p.eligibility.maxAge}`
                          : ""}
                      </p>
                      <ul className="list-unstyled mb-0 small">
                        {(p.durations || []).map((d) => (
                          <li key={d.months}>
                            {d.months} mo — <Money paise={d.pricePaise} />
                          </li>
                        ))}
                      </ul>
                    </CardBody>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </div>
    </Can>
  );
};

export default MembershipPlans;

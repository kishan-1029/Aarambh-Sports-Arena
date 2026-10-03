import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Input,
  Row,
} from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import StatusChip from "../../Components/Common/StatusChip";
import { Can } from "../../Components/Common/Can";
import { listMembers } from "../../api/arambhMembership.api";

const TIER_COLOUR = {
  gold: "warning",
  silver: "secondary",
  junior: "success",
  none: "light",
};

function daysUntil(date) {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

const Members = () => {
  document.title = "Members | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [tier, setTier] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMembers({
        pageSize: 100,
        q: query || undefined,
        status: status || undefined,
        tier: tier || undefined,
      });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load members",
        requestId: err?.response?.data?.requestId,
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query, status, tier]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      name: "Name",
      cell: (r) => (
        <Link to={`/members/${r._id}`} className="fw-medium">
          {r.firstName} {r.lastName || ""}
        </Link>
      ),
      sortable: true,
      minWidth: "160px",
    },
    { name: "Code", selector: (r) => r.memberCode, width: "120px" },
    {
      name: "Tier",
      cell: (r) => (
        <Badge color={TIER_COLOUR[r.tierKey] || "light"} pill>
          {(r.tierKey || "none").toUpperCase()}
        </Badge>
      ),
      width: "100px",
    },
    {
      name: "Status",
      cell: (r) => <StatusChip status={r.status} />,
      width: "120px",
    },
    { name: "Phone", selector: (r) => r.phone || "—", width: "130px" },
    {
      name: "Expires",
      cell: (r) => {
        const d = daysUntil(r.membershipEndDate);
        if (d == null) return "—";
        const label = r.membershipEndDate
          ? String(r.membershipEndDate).slice(0, 10)
          : "—";
        if (d < 7 && d >= 0) {
          return <span className="text-danger fw-semibold">{label}</span>;
        }
        return label;
      },
      width: "120px",
    },
  ];

  return (
    <Can
      anyOf={["member.view"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need member.view permission."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Members" pageTitle="Arambh" />
          <Row>
            <Col>
              <Card>
                <CardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <h5 className="mb-0">Members</h5>
                  <div className="d-flex flex-wrap gap-2">
                    <Input
                      type="select"
                      style={{ maxWidth: 140 }}
                      value={tier}
                      onChange={(e) => setTier(e.target.value)}
                    >
                      <option value="">All tiers</option>
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                      <option value="junior">Junior</option>
                      <option value="none">None</option>
                    </Input>
                    <Input
                      type="select"
                      style={{ maxWidth: 140 }}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">All status</option>
                      <option value="active">Active</option>
                      <option value="prospect">Prospect</option>
                      <option value="expired">Expired</option>
                      <option value="suspended">Suspended</option>
                    </Input>
                    <Input
                      style={{ maxWidth: 220 }}
                      placeholder="Search…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardBody>
                  {error && (
                    <ErrorState
                      message={error.message}
                      requestId={error.requestId}
                      onRetry={load}
                    />
                  )}
                  {loading ? (
                    <Skeleton rows={5} />
                  ) : rows.length === 0 && !error ? (
                    <EmptyState
                      icon="ri-group-line"
                      title="No members yet — register the first one"
                      description="Run seed:demo or register via the API / front desk."
                    />
                  ) : (
                    <DataTable
                      columns={columns}
                      data={rows}
                      pagination
                      highlightOnHover
                      responsive
                    />
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </Can>
  );
};

export default Members;

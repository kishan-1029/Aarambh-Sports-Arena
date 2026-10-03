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
import Money from "../../Components/Common/Money";
import { Can } from "../../Components/Common/Can";
import { listMemberships } from "../../api/arambhMembership.api";

const PLAN_COLOUR = {
  gold: "warning",
  silver: "secondary",
  junior: "success",
};

const Memberships = () => {
  document.title = "Memberships | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMemberships({
        pageSize: 100,
        status: status || undefined,
      });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load memberships",
        requestId: err?.response?.data?.requestId,
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      name: "Member",
      cell: (r) => {
        const m = r.memberId;
        if (!m || typeof m === "string") return "—";
        return (
          <Link to={`/members/${m._id}`}>
            {m.firstName} {m.lastName || ""} ({m.memberCode})
          </Link>
        );
      },
      minWidth: "180px",
    },
    {
      name: "Plan",
      cell: (r) => (
        <Badge color={PLAN_COLOUR[r.planKey] || "light"} pill>
          {(r.planKey || "—").toUpperCase()}
        </Badge>
      ),
      width: "110px",
    },
    {
      name: "Status",
      cell: (r) => <StatusChip status={r.status} />,
      width: "130px",
    },
    {
      name: "Period",
      cell: (r) => `${r.startLocalDate || "—"} → ${r.endLocalDate || "—"}`,
      minWidth: "180px",
    },
    {
      name: "Price",
      cell: (r) => <Money paise={r.pricePaise} />,
      width: "120px",
    },
  ];

  return (
    <Can
      anyOf={["membership.view", "member.view"]}
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
          <BreadCrumb title="Memberships" pageTitle="Arambh" />
          <Row>
            <Col>
              <Card>
                <CardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <h5 className="mb-0">Memberships</h5>
                  <Input
                    type="select"
                    style={{ maxWidth: 180 }}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="expiring">Expiring (7d)</option>
                    <option value="expired">Expired</option>
                    <option value="pending_payment">Pending payment</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="cancelled">Cancelled</option>
                  </Input>
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
                    <EmptyState title="No memberships" description="Purchase a plan for a member." />
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

export default Memberships;

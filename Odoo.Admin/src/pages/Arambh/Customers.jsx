import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { listCustomers } from "../../api/arambhFinance.api";

const columns = [
  { name: "Name", selector: (r) => r.name, sortable: true, minWidth: "160px" },
  { name: "Type", selector: (r) => r.type || "person", width: "100px" },
  { name: "Email", selector: (r) => r.email || "—", minWidth: "180px" },
  { name: "Phone", selector: (r) => r.phone || "—", width: "130px" },
  {
    name: "Tags",
    cell: (r) =>
      (r.tags || []).length ? (
        <span className="small">{(r.tags || []).join(", ")}</span>
      ) : (
        "—"
      ),
  },
  {
    name: "Kind",
    cell: (r) => (
      <StatusChip
        status={r.type === "company" ? "info" : "active"}
        label={r.type === "company" ? "Company" : "Person"}
      />
    ),
    width: "110px",
  },
];

const Customers = () => {
  document.title = "Customers | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCustomers({ pageSize: 100, q: query || undefined });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load customers",
        requestId: err?.response?.data?.requestId,
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <Can
      anyOf={["customer.view", "member.view", "invoice.view"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need customer or invoice view permission."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Customers" pageTitle="Arambh" />
          <Row>
            <Col>
              <Card>
                <CardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <h5 className="mb-0">Customers</h5>
                  <Input
                    style={{ maxWidth: 260 }}
                    placeholder="Search name, email, phone…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
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
                  ) : filtered.length === 0 && !error ? (
                    <EmptyState
                      icon="ri-user-line"
                      title="No customers"
                      description="Seed demo data or create a customer from the API."
                    />
                  ) : (
                    <DataTable
                      columns={columns}
                      data={filtered}
                      pagination
                      highlightOnHover
                      dense
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

export default Customers;

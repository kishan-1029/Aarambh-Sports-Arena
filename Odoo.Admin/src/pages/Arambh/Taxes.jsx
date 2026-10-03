import React, { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row } from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import StatusChip from "../../Components/Common/StatusChip";
import { Can } from "../../Components/Common/Can";
import { listTaxes } from "../../api/arambhFinance.api";

const columns = [
  { name: "Name", selector: (r) => r.name, sortable: true },
  { name: "Rate %", selector: (r) => r.ratePct, sortable: true, width: "100px" },
  {
    name: "Components",
    selector: (r) =>
      (r.components || []).map((c) => `${c.name} ${c.ratePct}%`).join(" + ") || "—",
    minWidth: "180px",
  },
  {
    name: "Applies to",
    selector: (r) => (r.appliesTo || []).join(", "),
    minWidth: "160px",
  },
  {
    name: "Status",
    cell: (r) => (
      <StatusChip
        status={r.active === false ? "inactive" : "active"}
        label={r.active === false ? "Inactive" : "Active"}
      />
    ),
    width: "110px",
  },
];

const Taxes = () => {
  document.title = "Taxes | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTaxes({ pageSize: 100 });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load taxes",
        requestId: err?.response?.data?.requestId,
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Can
      perm="settings.manage"
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need `settings.manage` to view taxes."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Taxes" pageTitle="Settings" />
          <Row>
            <Col>
              <Card>
                <CardHeader>
                  <h5 className="mb-0">GST rates</h5>
                  <p className="text-muted mb-0 small">
                    Seed placeholders — confirm with accountant before go-live.
                  </p>
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
                    <Skeleton rows={4} />
                  ) : rows.length === 0 && !error ? (
                    <EmptyState
                      icon="ri-percent-line"
                      title="No taxes"
                      description="Run seed:demo to load GST 18% and GST 5%."
                    />
                  ) : (
                    <DataTable
                      columns={columns}
                      data={rows}
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

export default Taxes;

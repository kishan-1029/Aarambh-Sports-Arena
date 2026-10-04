import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import Money from "../../Components/Common/Money";
import { Can } from "../../Components/Common/Can";
import { listInvoices } from "../../api/arambhFinance.api";
import { apiErrorMessage } from "../../utils/apiErrorMessage";

const statusTone = (s) => {
  if (s === "paid") return "paid";
  if (s === "partially_paid") return "pending";
  if (s === "void") return "void";
  if (s === "posted") return "info";
  if (s === "draft") return "draft";
  return "neutral";
};

const columns = [
  {
    name: "Number",
    cell: (r) => (
      <Link to={`/finance/invoices/${r._id}`} className="fw-medium">
        {r.number}
      </Link>
    ),
    sortable: true,
    minWidth: "150px",
  },
  {
    name: "Customer",
    selector: (r) => r.customerId?.name || "—",
    minWidth: "140px",
  },
  {
    name: "Kind",
    selector: (r) => r.kind,
    width: "140px",
  },
  {
    name: "Date",
    selector: (r) => r.localDate || "—",
    width: "110px",
  },
  {
    name: "Total",
    cell: (r) => <Money paise={r.totals?.totalPaise} />,
    width: "120px",
  },
  {
    name: "Due",
    cell: (r) => <Money paise={r.totals?.duePaise} />,
    width: "120px",
  },
  {
    name: "Status",
    cell: (r) => (
      <StatusChip status={statusTone(r.status)} label={r.status || "—"} />
    ),
    width: "130px",
  },
];

const Invoices = () => {
  document.title = "Invoices | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listInvoices({
        pageSize: 50,
        status: status || undefined,
      });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load invoices"),
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

  return (
    <Can
      perm="invoice.view"
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need permission `invoice.view`."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Invoices" pageTitle="Finance" />
          <Row>
            <Col>
              <Card>
                <CardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <h5 className="mb-0">Invoices</h5>
                  <Input
                    type="select"
                    style={{ maxWidth: 200 }}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    <option value="posted">posted</option>
                    <option value="partially_paid">partially_paid</option>
                    <option value="paid">paid</option>
                    <option value="draft">draft</option>
                    <option value="void">void</option>
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
                    <EmptyState
                      icon="ri-file-list-3-line"
                      title="No invoices"
                      description="Run seed:demo for a sample posted invoice, or create one via API."
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

export default Invoices;

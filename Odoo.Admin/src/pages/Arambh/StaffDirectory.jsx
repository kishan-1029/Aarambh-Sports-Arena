import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import { AuthContext } from "../../context/AuthContext";
import { Can } from "../../Components/Common/Can";
import { getAllEmployees } from "../../api/employees.api";

const columns = [
  {
    name: "Name",
    selector: (row) =>
      [row.firstName, row.lastName].filter(Boolean).join(" ") ||
      row.employeeName ||
      row.name ||
      "—",
    sortable: true,
    minWidth: "160px",
  },
  {
    name: "Email",
    selector: (row) => row.email || "—",
    sortable: true,
    minWidth: "180px",
  },
  {
    name: "Phone",
    selector: (row) => row.mobileNumber || row.phone || "—",
    minWidth: "120px",
  },
  {
    name: "Status",
    cell: (row) => (
      <StatusChip
        status={row.isActive === false ? "inactive" : "active"}
        label={row.isActive === false ? "Inactive" : "Active"}
      />
    ),
    minWidth: "110px",
  },
];

/**
 * Sample end-to-end list: existing employees API + DataTable + loading/empty/error.
 */
const StaffDirectory = () => {
  const { adminData } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  document.title = `Staff directory | Arambh Sports Arena`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllEmployees();
      const data = res?.data?.data ?? res?.data ?? [];
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load employees",
        requestId: err?.response?.data?.requestId || err?.response?.headers?.["x-request-id"],
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = [r.firstName, r.lastName, r.employeeName, r.name, r.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return name.includes(q);
    });
  }, [rows, query]);

  return (
    <Can
      perm="employee.view"
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need permission `employee.view` to view the staff directory."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Staff directory" pageTitle="Arambh" />
          <Row>
            <Col lg={12}>
              <Card className="border-0 shadow-sm" style={{ borderRadius: "var(--arambh-radius)" }}>
                <CardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">Employees</h5>
                    <small className="text-muted">
                      Sample list for {adminData?.companyName || "Arambh Sports Arena"}
                    </small>
                  </div>
                  <Input
                    type="search"
                    placeholder="Search name or email…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ maxWidth: 280 }}
                  />
                </CardHeader>
                <CardBody>
                  {loading ? (
                    <Skeleton rows={6} height={18} />
                  ) : error ? (
                    <ErrorState
                      message={error.message}
                      requestId={error.requestId}
                      onRetry={load}
                    />
                  ) : filtered.length === 0 ? (
                    <EmptyState
                      title="No employees found"
                      description={
                        query
                          ? "Try a different search."
                          : "Add employees from Setup → Employee, then refresh."
                      }
                      actionLabel="Retry"
                      onAction={load}
                    />
                  ) : (
                    <DataTable
                      columns={columns}
                      data={filtered}
                      pagination
                      paginationPerPage={25}
                      paginationRowsPerPageOptions={[10, 25, 50, 100]}
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

export default StaffDirectory;

import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Form,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
} from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import StatusChip from "../../Components/Common/StatusChip";
import GridActionButton from "../../Components/Common/GridActionButton";
import { Can } from "../../Components/Common/Can";
import {
  archiveMember,
  listMembers,
  registerMember,
} from "../../api/arambhMembership.api";
import { apiErrorMessage } from "../../utils/apiErrorMessage";

const TIER_COLOUR = {
  gold: "warning",
  silver: "secondary",
  junior: "success",
  none: "light",
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  dob: "1995-01-15",
  gender: "",
  source: "front_desk",
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
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMembers({
        pageSize: 200,
        q: query || undefined,
        status: status || undefined,
        tier: tier || undefined,
      });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load members"),
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

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await registerMember({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        dob: form.dob,
        gender: form.gender || undefined,
        source: form.source || "front_desk",
      });
      setModal(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not register member"));
    } finally {
      setSaving(false);
    }
  };

  const onArchive = async (row) => {
    const label = `${row.firstName || ""} ${row.lastName || ""}`.trim() || row.memberCode;
    if (!window.confirm(`Archive member ${label}? They will be suspended and hidden from active lists.`)) {
      return;
    }
    setBusyId(row._id);
    try {
      await archiveMember(row._id);
      await load();
    } catch (err) {
      window.alert(apiErrorMessage(err, "Archive failed"));
    } finally {
      setBusyId(null);
    }
  };

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
        <Badge
          color={TIER_COLOUR[r.tierKey] || "light"}
          className={!r.tierKey || r.tierKey === "none" ? "tier-none" : undefined}
          pill
        >
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
    {
      name: "Actions",
      cell: (r) => (
        <div className="grid-actions">
          <GridActionButton label="Open" to={`/members/${r._id}`} />
          <Can anyOf={["member.edit"]}>
            <GridActionButton
              label="Archive"
              disabled={busyId === r._id || r.status === "suspended"}
              onClick={() => onArchive(r)}
            />
          </Can>
        </div>
      ),
      ignoreRowClick: true,
      width: "96px",
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
                <CardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center page-toolbar">
                  <h5 className="mb-0">Members ({rows.length})</h5>
                  <div className="d-flex flex-wrap gap-2 align-items-center page-toolbar">
                    <Input
                      type="select"
                      className="toolbar-field"
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
                      className="toolbar-field"
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
                      className="toolbar-field"
                      placeholder="Search…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <Can anyOf={["member.create"]}>
                      <Button color="success" size="sm" className="text-nowrap" onClick={() => setModal(true)}>
                        <i className="ri-user-add-line me-1" />
                        Add member
                      </Button>
                    </Can>
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
                      title="No members yet"
                      description="Click Add member to register the first player."
                      actionLabel="Add member"
                      onAction={() => setModal(true)}
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

      <Modal isOpen={modal} toggle={() => setModal(false)} centered>
        <Form onSubmit={onCreate}>
          <ModalHeader toggle={() => setModal(false)}>Register member</ModalHeader>
          <ModalBody>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label>First name *</Label>
                  <Input name="firstName" required value={form.firstName} onChange={onFormChange} />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Last name</Label>
                  <Input name="lastName" value={form.lastName} onChange={onFormChange} />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Phone</Label>
                  <Input name="phone" value={form.phone} onChange={onFormChange} />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Email</Label>
                  <Input type="email" name="email" value={form.email} onChange={onFormChange} />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Date of birth *</Label>
                  <Input type="date" name="dob" required value={form.dob} onChange={onFormChange} />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Gender</Label>
                  <Input type="select" name="gender" value={form.gender} onChange={onFormChange}>
                    <option value="">—</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </Input>
                </FormGroup>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button type="button" color="light" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button type="submit" color="success" disabled={saving}>
              {saving ? "Saving…" : "Create member"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Can>
  );
};

export default Members;

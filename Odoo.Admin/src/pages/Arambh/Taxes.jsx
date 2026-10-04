import React, { useCallback, useEffect, useState } from "react";
import {
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
import { createTax, listTaxes, updateTax } from "../../api/arambhFinance.api";

const APPLIES = ["court", "membership", "shop", "bar"];

const EMPTY_FORM = {
  name: "",
  ratePct: "",
  appliesTo: [...APPLIES],
  active: true,
  components: [
    { name: "CGST", ratePct: "" },
    { name: "SGST", ratePct: "" },
  ],
};

function taxToForm(tax) {
  const components = (tax.components || []).map((c) => ({
    name: c.name || "",
    ratePct: c.ratePct != null ? String(c.ratePct) : "",
  }));
  return {
    name: tax.name || "",
    ratePct: tax.ratePct != null ? String(tax.ratePct) : "",
    appliesTo: tax.appliesTo?.length ? [...tax.appliesTo] : [...APPLIES],
    active: tax.active !== false,
    components: components.length ? components : [{ name: "", ratePct: "" }],
  };
}

const Taxes = () => {
  document.title = "Taxes | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [editTax, setEditTax] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

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

  const openCreate = () => {
    setEditTax(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModal(true);
  };

  const openEdit = (tax) => {
    setEditTax(tax);
    setForm(taxToForm(tax));
    setFormError("");
    setModal(true);
  };

  const toggleApplies = (key) => {
    setForm((f) => {
      const has = f.appliesTo.includes(key);
      return {
        ...f,
        appliesTo: has ? f.appliesTo.filter((k) => k !== key) : [...f.appliesTo, key],
      };
    });
  };

  const setComponent = (index, field, value) => {
    setForm((f) => {
      const components = f.components.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      );
      return { ...f, components };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const components = form.components
        .filter((c) => c.name.trim() && String(c.ratePct).trim() !== "")
        .map((c) => ({
          name: c.name.trim(),
          ratePct: Number(c.ratePct),
        }))
        .filter((c) => Number.isFinite(c.ratePct));
      const body = {
        name: form.name.trim(),
        ratePct: Number(form.ratePct),
        appliesTo: form.appliesTo,
        active: form.active,
        components,
      };
      if (!body.name || !Number.isFinite(body.ratePct)) {
        setFormError("Name and rate are required.");
        return;
      }
      if (editTax) {
        await updateTax(editTax._id, body);
      } else {
        await createTax(body);
      }
      setModal(false);
      await load();
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || "Could not save tax");
    } finally {
      setSaving(false);
    }
  };

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
    {
      name: "",
      width: "90px",
      cell: (r) => (
        <div className="grid-actions">
          <GridActionButton label="Edit" onClick={() => openEdit(r)} />
        </div>
      ),
    },
  ];

  return (
    <Can
      perm="settings.manage"
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need settings.manage to view taxes."
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
                <CardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2 page-toolbar">
                  <div>
                    <h5 className="mb-0">GST rates</h5>
                    <p className="text-muted mb-0 small">
                      Rates apply to courts and membership plans that select them.
                    </p>
                  </div>
                  <Button color="success" size="sm" onClick={openCreate}>
                    Add tax
                  </Button>
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
                      description="Add a GST rate, then assign it on a court or membership plan."
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

      <Modal isOpen={modal} toggle={() => setModal(false)} centered>
        <Form onSubmit={onSubmit}>
          <ModalHeader toggle={() => setModal(false)}>
            {editTax ? "Edit tax" : "Add tax"}
          </ModalHeader>
          <ModalBody>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}
            <FormGroup>
              <Label>Name *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="GST 18%"
              />
            </FormGroup>
            <FormGroup>
              <Label>Rate % *</Label>
              <Input
                type="number"
                required
                min={0}
                max={100}
                step="0.01"
                value={form.ratePct}
                onChange={(e) => setForm((f) => ({ ...f, ratePct: e.target.value }))}
              />
            </FormGroup>
            <FormGroup>
              <Label>Applies to</Label>
              <div className="d-flex flex-wrap gap-3">
                {APPLIES.map((key) => (
                  <Label check key={key} className="mb-0">
                    <Input
                      type="checkbox"
                      className="me-1"
                      checked={form.appliesTo.includes(key)}
                      onChange={() => toggleApplies(key)}
                    />
                    {key}
                  </Label>
                ))}
              </div>
            </FormGroup>
            <FormGroup check className="mb-3">
              <Input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              <Label check>Active</Label>
            </FormGroup>
            <p className="text-muted small mb-2">Components (optional, e.g. CGST + SGST)</p>
            {form.components.map((c, i) => (
              <Row key={`component-${i}`} className="g-2 mb-2">
                <Col>
                  <Input
                    placeholder="CGST"
                    value={c.name}
                    onChange={(e) => setComponent(i, "name", e.target.value)}
                  />
                </Col>
                <Col xs={4}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    placeholder="%"
                    value={c.ratePct}
                    onChange={(e) => setComponent(i, "ratePct", e.target.value)}
                  />
                </Col>
              </Row>
            ))}
            <Button
              type="button"
              color="light"
              size="sm"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  components: [...f.components, { name: "", ratePct: "" }],
                }))
              }
            >
              Add component
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button color="light" type="button" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button color="success" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Can>
  );
};

export default Taxes;

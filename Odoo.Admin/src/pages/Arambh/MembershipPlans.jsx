import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import Money from "../../Components/Common/Money";
import { Can } from "../../Components/Common/Can";
import {
  listPlans,
  listMemberships,
  createPlan,
  updatePlan,
  archivePlan,
} from "../../api/arambhMembership.api";
import { listTaxes } from "../../api/arambhFinance.api";
import { apiErrorMessage } from "../../utils/apiErrorMessage";

const PLAN_COLOUR = {
  gold: "warning",
  silver: "secondary",
  junior: "success",
};

const PLAN_HEX = {
  gold: "#d4a017",
  silver: "#8a8a8a",
  junior: "#2e7d32",
};

function planAccent(plan) {
  if (plan.colour && plan.colour.toLowerCase() !== "#0d6efd") return plan.colour;
  return PLAN_HEX[plan.key] || plan.colour || "#0d6efd";
}

const EMPTY_FORM = {
  key: "",
  name: "",
  description: "",
  colour: "#3eb474",
  active: true,
  months1: "1",
  price1: "",
  months2: "",
  price2: "",
  shopDiscountPct: "0",
  barDiscountPct: "0",
  benefits: "",
  taxId: "",
};

function linesToPerks(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function perksToLines(perks) {
  return (perks || []).join("\n");
}

function defaultCourtEntitlements(existing) {
  return (
    existing?.court || {
      access: "all",
      pricing: { mode: "discount_pct", value: 0 },
      maxBookingsPerDay: 2,
      advanceBookingDays: 14,
      sportKeys: [],
    }
  );
}

function buildEntitlements(form, existing) {
  return {
    court: defaultCourtEntitlements(existing?.entitlements),
    shopDiscountPct: Number(form.shopDiscountPct) || 0,
    barDiscountPct: Number(form.barDiscountPct) || 0,
    guestPasses: existing?.entitlements?.guestPasses ?? 0,
    perks: linesToPerks(form.benefits),
  };
}

function buildDurations(form) {
  const durations = [
    {
      months: Number(form.months1) || 1,
      pricePaise: Math.round(Number(form.price1) * 100) || 0,
    },
  ];
  if (form.months2 && form.price2 !== "") {
    durations.push({
      months: Number(form.months2),
      pricePaise: Math.round(Number(form.price2) * 100) || 0,
    });
  }
  return durations;
}

function planToForm(p) {
  const d0 = (p.durations || [])[0] || {};
  const d1 = (p.durations || [])[1] || {};
  return {
    key: p.key || "",
    name: p.name || "",
    description: p.description || "",
    colour: p.colour || "#0d6efd",
    active: p.active !== false,
    months1: String(d0.months ?? 1),
    price1: d0.pricePaise != null ? String(d0.pricePaise / 100) : "",
    months2: d1.months != null ? String(d1.months) : "",
    price2: d1.pricePaise != null ? String(d1.pricePaise / 100) : "",
    taxId: p.taxId ? String(p.taxId._id || p.taxId) : "",
    shopDiscountPct: String(p.entitlements?.shopDiscountPct ?? 0),
    barDiscountPct: String(p.entitlements?.barDiscountPct ?? 0),
    benefits: perksToLines(p.entitlements?.perks),
  };
}

function matchesSearch(p, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [p.name, p.key, p.description]
    .filter(Boolean)
    .some((s) => String(s).toLowerCase().includes(needle));
}

const MembershipPlans = () => {
  document.title = "Membership Plans | Arambh Sports Arena";
  const [plans, setPlans] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCount, setDeleteCount] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, taxRes] = await Promise.all([
        listPlans({
          pageSize: 100,
          q: query.trim() || undefined,
        }),
        listTaxes({ pageSize: 100, active: "true" }).catch(() => ({ data: { data: [] } })),
      ]);
      setPlans(Array.isArray(res?.data?.data) ? res.data.data : []);
      setTaxes(Array.isArray(taxRes?.data?.data) ? taxRes.data.data : []);
    } catch (err) {
      setError({
        message:
          apiErrorMessage(err, "Failed to load plans"),
        requestId: err?.response?.data?.requestId,
      });
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const visiblePlans = useMemo(
    () => plans.filter((p) => matchesSearch(p, query.trim())),
    [plans, query],
  );

  const openCreate = () => {
    setEditPlan(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModal(true);
  };

  const openEdit = (p) => {
    setEditPlan(p);
    setForm(planToForm(p));
    setFormError("");
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditPlan(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const onFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const entitlements = buildEntitlements(form, editPlan);
      const durations = buildDurations(form);

      if (editPlan) {
        await updatePlan(editPlan._id, {
          name: form.name.trim(),
          description: form.description.trim(),
          colour: form.colour.trim() || "#0d6efd",
          active: form.active,
          durations,
          entitlements,
          taxId: form.taxId || null,
        });
      } else {
        await createPlan({
          key: form.key.trim().toLowerCase(),
          name: form.name.trim(),
          description: form.description.trim(),
          colour: form.colour.trim() || "#0d6efd",
          active: form.active,
          durations,
          entitlements,
          taxId: form.taxId || null,
        });
      }
      closeModal();
      await load();
    } catch (err) {
      setFormError(
        apiErrorMessage(err, "Could not save plan"),
      );
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (p) => {
    setBusyId(p._id);
    try {
      await updatePlan(p._id, { active: !p.active });
      await load();
    } catch (err) {
      window.alert(
        apiErrorMessage(err, "Toggle failed"),
      );
    } finally {
      setBusyId(null);
    }
  };

  const openDelete = async (p) => {
    setDeleteTarget(p);
    setDeleteCount(null);
    try {
      const res = await listMemberships({
        planKey: p.key,
        status: "current",
        pageSize: 1,
      });
      const total = res?.data?.meta?.total;
      setDeleteCount(Number.isFinite(total) ? total : null);
    } catch {
      setDeleteCount(null);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await archivePlan(deleteTarget._id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      window.alert(
        apiErrorMessage(err, "Could not delete plan"),
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Can
      anyOf={["membership_plan.view", "membership.view", "member.view"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need membership_plan.view permission."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <style>
          {`
            .plan-summary {
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
            }
            .plan-summary p,
            .plan-summary ul {
              margin: 0;
            }
            .plan-summary-desc {
              color: var(--vz-secondary-color, #878a99);
              font-size: 0.8125rem;
              line-height: 1.45;
            }
            .plan-summary-facts,
            .plan-summary-list {
              display: flex;
              flex-direction: column;
              gap: 0.25rem;
              font-size: 0.8125rem;
              line-height: 1.45;
            }
            .plan-summary-list {
              margin: 0;
              padding-left: 1.1rem;
            }
            .plan-summary-list li {
              margin: 0;
            }
            .plan-summary-list-plain {
              list-style: none;
              padding-left: 0;
            }
            .plan-summary-actions {
              margin-top: auto;
              padding-top: 0.75rem;
            }
            .plan-summary-actions .plan-delete {
              margin-left: auto;
            }
          `}
        </style>
        <Container fluid>
          <BreadCrumb title="Membership Plans" pageTitle="Arambh" />
          <Row className="mb-3">
            <Col className="d-flex flex-wrap gap-2 justify-content-end page-toolbar">
              <Input
                style={{ maxWidth: 260 }}
                placeholder="Search name, key, description…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Can anyOf={["membership_plan.edit"]}>
                <Button color="success" size="sm" onClick={openCreate}>
                  <i className="ri-add-line me-1" />
                  Add plan
                </Button>
              </Can>
            </Col>
          </Row>

          {error && (
            <ErrorState
              message={error.message}
              requestId={error.requestId}
              onRetry={load}
            />
          )}

          {loading ? (
            <Skeleton rows={4} />
          ) : visiblePlans.length === 0 && !error ? (
            <EmptyState
              icon="ri-vip-crown-line"
              title="No plans"
              description="Create a membership plan to get started."
              actionLabel="Add plan"
              onAction={openCreate}
            />
          ) : (
            <Row>
              {visiblePlans.map((p) => (
                <Col md={4} key={p._id} className="mb-3">
                  <Card className="h-100">
                    <CardHeader
                      className="d-flex justify-content-between align-items-start gap-2"
                      style={{ borderTop: `4px solid ${planAccent(p)}` }}
                    >
                      <div>
                        <h5 className="mb-1">{p.name}</h5>
                        <Badge color={PLAN_COLOUR[p.key] || "primary"} pill>
                          {(p.key || "plan").toUpperCase()}
                        </Badge>
                      </div>
                      <div className="d-flex flex-column align-items-end gap-1">
                        <Badge color={p.active ? "success" : "secondary"} pill>
                          {p.active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge color="light" className="text-dark">
                          v{p.version}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardBody className="d-flex flex-column">
                      <div className="plan-summary">
                        <p className="plan-summary-desc">
                          {p.description || "—"}
                        </p>
                        <div className="plan-summary-facts">
                          <ul className="plan-summary-list plan-summary-list-plain">
                            {(p.durations || []).map((d) => (
                              <li key={`${p._id}-${d.months}`}>
                                {d.months} mo — <Money paise={d.pricePaise} />
                              </li>
                            ))}
                          </ul>
                        </div>
                        {(p.entitlements?.perks || []).length > 0 && (
                          <ul className="plan-summary-list">
                            {p.entitlements.perks.map((perk) => (
                              <li key={`${p._id}-${perk}`}>{perk}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="d-flex flex-wrap gap-2 align-items-center plan-summary-actions">
                        <Can anyOf={["membership_plan.edit"]}>
                          <Button
                            size="sm"
                            color="soft-primary"
                            onClick={() => openEdit(p)}
                          >
                            Edit
                          </Button>
                          <div className="form-check form-switch mb-0">
                            <Input
                              type="checkbox"
                              role="switch"
                              className="form-check-input"
                              id={`active-${p._id}`}
                              checked={p.active !== false}
                              disabled={busyId === p._id}
                              onChange={() => onToggleActive(p)}
                            />
                            <Label
                              check
                              for={`active-${p._id}`}
                              className="form-check-label small"
                            >
                              {busyId === p._id ? "…" : p.active ? "On" : "Off"}
                            </Label>
                          </div>
                          <Button
                            size="sm"
                            color="soft-danger"
                            className="plan-delete"
                            disabled={busyId === p._id || deleting}
                            onClick={() => openDelete(p)}
                          >
                            <i className="ri-delete-bin-line me-1" />
                            Delete
                          </Button>
                        </Can>
                      </div>
                    </CardBody>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </div>

      <Modal
        isOpen={Boolean(deleteTarget)}
        toggle={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        centered
      >
        <ModalHeader
          toggle={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        >
          Delete plan
        </ModalHeader>
        <ModalBody>
          <p className="mb-2">
            Delete <strong>{deleteTarget?.name}</strong>?
          </p>
          <p className="text-muted mb-0">
            {deleteCount > 0
              ? `${deleteCount} member${deleteCount === 1 ? "" : "s"} currently on this plan will have that membership cancelled. They lose the plan benefits, the same as cancelling the membership. The plan also leaves this list and the website.`
              : deleteCount === 0
                ? "No members are on this plan. It will leave this list and the website."
                : "Members currently on this plan will have that membership cancelled, the same as cancelling the membership. The plan also leaves this list and the website."}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            color="light"
            disabled={deleting}
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button color="danger" disabled={deleting} onClick={onConfirmDelete}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={modal} toggle={closeModal} centered size="lg">
        <Form onSubmit={onSubmit}>
          <ModalHeader toggle={closeModal}>
            {editPlan ? "Edit plan" : "Add plan"}
          </ModalHeader>
          <ModalBody>
            {formError && (
              <div className="alert alert-danger py-2">{formError}</div>
            )}
            <Row>
              {!editPlan && (
                <Col md={6}>
                  <FormGroup>
                    <Label>Key *</Label>
                    <Input
                      name="key"
                      required
                      placeholder="gold"
                      value={form.key}
                      onChange={onFormChange}
                    />
                  </FormGroup>
                </Col>
              )}
              <Col md={editPlan ? 12 : 6}>
                <FormGroup>
                  <Label>Name *</Label>
                  <Input
                    name="name"
                    required
                    value={form.name}
                    onChange={onFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={12}>
                <FormGroup>
                  <Label>Description</Label>
                  <Input
                    type="textarea"
                    name="description"
                    rows={2}
                    value={form.description}
                    onChange={onFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label>Colour</Label>
                  <Input
                    type="color"
                    name="colour"
                    value={form.colour}
                    onChange={onFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup check className="mt-4">
                  <Input
                    type="checkbox"
                    name="active"
                    id="plan-active"
                    checked={form.active}
                    onChange={onFormChange}
                  />
                  <Label check for="plan-active">
                    Active
                  </Label>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Tax</Label>
                  <Input
                    type="select"
                    name="taxId"
                    value={form.taxId}
                    onChange={onFormChange}
                  >
                    <option value="">No tax</option>
                    {taxes.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.ratePct}%)
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
              <Col md={12}>
                <hr className="my-2" />
                <p className="text-muted small mb-2">Durations & pricing</p>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Label>Months 1 *</Label>
                  <Input
                    type="number"
                    name="months1"
                    min={1}
                    required
                    value={form.months1}
                    onChange={onFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Label>Price 1 (₹) *</Label>
                  <Input
                    type="number"
                    name="price1"
                    min={0}
                    step="0.01"
                    required
                    value={form.price1}
                    onChange={onFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Label>Months 2</Label>
                  <Input
                    type="number"
                    name="months2"
                    min={1}
                    value={form.months2}
                    onChange={onFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <Label>Price 2 (₹)</Label>
                  <Input
                    type="number"
                    name="price2"
                    min={0}
                    step="0.01"
                    value={form.price2}
                    onChange={onFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Shop discount %</Label>
                  <Input
                    type="number"
                    name="shopDiscountPct"
                    min={0}
                    max={100}
                    value={form.shopDiscountPct}
                    onChange={onFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Bar discount %</Label>
                  <Input
                    type="number"
                    name="barDiscountPct"
                    min={0}
                    max={100}
                    value={form.barDiscountPct}
                    onChange={onFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={12}>
                <FormGroup className="mb-0">
                  <Label>Benefits</Label>
                  <Input
                    type="textarea"
                    name="benefits"
                    rows={5}
                    value={form.benefits}
                    onChange={onFormChange}
                    placeholder={"Up to 2 bookings / day\n10% shop discount"}
                  />
                  <p className="text-muted small mb-0 mt-1">
                    One point per line. These are the lines on the membership cards.
                    Shop and bar percentages above still set the till discount.
                  </p>
                </FormGroup>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button type="button" color="light" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" color="success" disabled={saving}>
              {saving ? "Saving…" : editPlan ? "Save changes" : "Create plan"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Can>
  );
};

export default MembershipPlans;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
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
  Table,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import Money from "../../Components/Common/Money";
import GridActionButton from "../../Components/Common/GridActionButton";
import { Can } from "../../Components/Common/Can";
import {
  listCourts,
  listSports,
  listCourtBlocks,
  listSocialSessions,
  createCourt,
  updateCourt,
  createSport,
  updateSport,
} from "../../api/arambhBooking.api";
import { listTaxes } from "../../api/arambhFinance.api";

const EMPTY_COURT_FORM = {
  sportId: "",
  name: "",
  code: "",
  walkInPeak: "",
  walkInOffPeak: "",
  taxId: "",
  status: "active",
};

const EMPTY_SPORT_FORM = {
  key: "",
  name: "",
  sessionMinutes: "60",
  slotStepMinutes: "30",
};

function toPaise(rupees) {
  return Math.round(Number(rupees) * 100) || 0;
}

function courtStatusColor(status) {
  if (status === "active") return "success";
  if (status === "maintenance") return "warning";
  return "secondary";
}

const Courts = () => {
  document.title = "Courts | Arambh Sports Arena";
  const [tab, setTab] = useState("courts");
  const [sports, setSports] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [courts, setCourts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [social, setSocial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [statusFilter, setStatusFilter] = useState("");
  const [courtModal, setCourtModal] = useState(false);
  const [sportModal, setSportModal] = useState(false);
  const [courtForm, setCourtForm] = useState(EMPTY_COURT_FORM);
  const [sportForm, setSportForm] = useState(EMPTY_SPORT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const courtParams = {
        pageSize: 100,
        q: debouncedQuery.trim() || undefined,
        status: statusFilter || undefined,
      };
      const [s, c, b, soc, taxRes] = await Promise.all([
        listSports({ pageSize: 50 }),
        listCourts(courtParams),
        listCourtBlocks({ pageSize: 50 }),
        listSocialSessions({ pageSize: 50 }),
        listTaxes({ pageSize: 100, active: "true" }).catch(() => ({ data: { data: [] } })),
      ]);
      setSports(Array.isArray(s?.data?.data) ? s.data.data : []);
      setTaxes(Array.isArray(taxRes?.data?.data) ? taxRes.data.data : []);
      setCourts(Array.isArray(c?.data?.data) ? c.data.data : []);
      setBlocks(Array.isArray(b?.data?.data) ? b.data.data : []);
      setSocial(Array.isArray(soc?.data?.data) ? soc.data.data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load",
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleCourts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courts.filter((c) => {
      if (!q) return true;
      return [c.name, c.code]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });
  }, [courts, query]);

  const onCourtFormChange = (e) => {
    const { name, value } = e.target;
    setCourtForm((f) => ({ ...f, [name]: value }));
  };

  const onSportFormChange = (e) => {
    const { name, value } = e.target;
    setSportForm((f) => ({ ...f, [name]: value }));
  };

  const openCourtModal = () => {
    setCourtForm({
      ...EMPTY_COURT_FORM,
      sportId: sports[0]?._id || "",
    });
    setFormError("");
    setCourtModal(true);
  };

  const openSportModal = () => {
    setSportForm(EMPTY_SPORT_FORM);
    setFormError("");
    setSportModal(true);
  };

  const onCreateCourt = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const walkInPaise = {
        peak: toPaise(courtForm.walkInPeak),
        offPeak: toPaise(courtForm.walkInOffPeak),
      };
      await createCourt({
        sportId: courtForm.sportId,
        name: courtForm.name.trim(),
        code: courtForm.code.trim(),
        status: courtForm.status,
        taxId: courtForm.taxId || null,
        pricing: {
          walkInPaise,
          memberBasePaise: { ...walkInPaise },
        },
      });
      setCourtModal(false);
      await load();
    } catch (err) {
      setFormError(
        err?.response?.data?.message || err?.message || "Could not create court",
      );
    } finally {
      setSaving(false);
    }
  };

  const onCreateSport = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await createSport({
        key: sportForm.key.trim().toLowerCase(),
        name: sportForm.name.trim(),
        sessionMinutes: Number(sportForm.sessionMinutes) || 60,
        slotStepMinutes: Number(sportForm.slotStepMinutes) || 30,
        active: true,
      });
      setSportModal(false);
      await load();
    } catch (err) {
      setFormError(
        err?.response?.data?.message || err?.message || "Could not create sport",
      );
    } finally {
      setSaving(false);
    }
  };

  const onToggleCourtStatus = async (c) => {
    if (c.status === "archived") return;
    const next = c.status === "active" ? "maintenance" : "active";
    setBusyId(c._id);
    try {
      await updateCourt(c._id, { status: next });
      await load();
    } catch (err) {
      window.alert(
        err?.response?.data?.message || err?.message || "Status update failed",
      );
    } finally {
      setBusyId(null);
    }
  };

  const onToggleSportActive = async (s) => {
    setBusyId(s._id);
    try {
      await updateSport(s._id, { active: !s.active });
      await load();
    } catch (err) {
      window.alert(
        err?.response?.data?.message || err?.message || "Toggle failed",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Can
      anyOf={["court.view"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need court.view permission."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Courts & sports" pageTitle="Front Desk" />
          <Row>
            <Col>
              <Card>
                <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2 page-toolbar">
                  <h5 className="mb-0">Facilities</h5>
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    {[
                      ["courts", "Courts"],
                      ["sports", "Sports"],
                      ["blocks", "Blocks"],
                      ["social", "Social play"],
                    ].map(([id, label]) => (
                      <Button
                        key={id}
                        size="sm"
                        className="text-nowrap"
                        color={tab === id ? "success" : "light"}
                        onClick={() => setTab(id)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardBody>
                  {loading && <Skeleton rows={6} />}
                  {!loading && error && (
                    <ErrorState
                      message={error.message}
                      requestId={error.requestId}
                      onRetry={load}
                    />
                  )}

                  {!loading && !error && tab === "courts" && (
                    <>
                      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end mb-3 page-toolbar">
                        <Input
                          className="toolbar-field"
                          placeholder="Search courts…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        <Input
                          type="select"
                          className="toolbar-field"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="">All status</option>
                          <option value="active">Active</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="archived">Archived</option>
                        </Input>
                        <Can anyOf={["court.manage"]}>
                          <Button
                            color="success"
                            size="sm"
                            className="text-nowrap"
                            onClick={openCourtModal}
                          >
                            <i className="ri-add-line me-1" />
                            Add court
                          </Button>
                        </Can>
                      </div>
                      {!visibleCourts.length ? (
                        <EmptyState
                          title="No courts"
                          description="Add a court or run seed:demo to load demo courts."
                          actionLabel="Add court"
                          onAction={openCourtModal}
                        />
                      ) : (
                        <Table responsive hover className="align-middle mb-0">
                          <thead>
                            <tr>
                              <th>Code</th>
                              <th>Name</th>
                              <th>Sport</th>
                              <th>Status</th>
                              <th>Walk-in peak</th>
                              <th>Walk-in off-peak</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleCourts.map((c) => (
                              <tr key={c._id}>
                                <td>{c.code}</td>
                                <td>{c.name}</td>
                                <td>{c.sportId?.name || c.sportId?.key || "—"}</td>
                                <td>
                                  <Badge color={courtStatusColor(c.status)}>
                                    {c.status}
                                  </Badge>
                                </td>
                                <td>
                                  <Money paise={c.pricing?.walkInPaise?.peak ?? 0} />
                                </td>
                                <td>
                                  <Money paise={c.pricing?.walkInPaise?.offPeak ?? 0} />
                                </td>
                                <td>
                                  <Can anyOf={["court.manage"]}>
                                    {c.status !== "archived" && (
                                      <GridActionButton
                                        label={c.status === "active" ? "Maintenance" : "Activate"}
                                        disabled={busyId === c._id}
                                        onClick={() => onToggleCourtStatus(c)}
                                      />
                                    )}
                                  </Can>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </>
                  )}

                  {!loading && !error && tab === "sports" && (
                    <>
                      <div className="d-flex justify-content-end mb-3">
                        <Can anyOf={["court.manage"]}>
                          <Button
                            color="success"
                            size="sm"
                            className="text-nowrap"
                            onClick={openSportModal}
                          >
                            <i className="ri-add-line me-1" />
                            Add sport
                          </Button>
                        </Can>
                      </div>
                      {!sports.length ? (
                        <EmptyState title="No sports" description="Add a sport to get started." />
                      ) : (
                        <Table responsive hover className="align-middle mb-0">
                          <thead>
                            <tr>
                              <th>Key</th>
                              <th>Name</th>
                              <th>Session</th>
                              <th>Step</th>
                              <th>Active</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sports.map((s) => (
                              <tr key={s._id}>
                                <td>{s.key}</td>
                                <td>{s.name}</td>
                                <td>{s.sessionMinutes} min</td>
                                <td>{s.slotStepMinutes} min</td>
                                <td>
                                  <Badge color={s.active ? "success" : "secondary"}>
                                    {s.active ? "Yes" : "No"}
                                  </Badge>
                                </td>
                                <td>
                                  <Can anyOf={["court.manage"]}>
                                    <div className="form-check form-switch mb-0">
                                      <Input
                                        type="checkbox"
                                        role="switch"
                                        className="form-check-input"
                                        id={`sport-active-${s._id}`}
                                        checked={s.active !== false}
                                        disabled={busyId === s._id}
                                        onChange={() => onToggleSportActive(s)}
                                      />
                                      <Label
                                        check
                                        for={`sport-active-${s._id}`}
                                        className="form-check-label small"
                                      >
                                        {busyId === s._id ? "…" : s.active ? "On" : "Off"}
                                      </Label>
                                    </div>
                                  </Can>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </>
                  )}

                  {!loading && !error && tab === "blocks" && (
                    <>
                      {!blocks.length ? (
                        <EmptyState
                          title="No court blocks"
                          description="Create blocks via API or front desk (Phase 7)."
                        />
                      ) : (
                        <Table responsive hover className="align-middle mb-0">
                          <thead>
                            <tr>
                              <th>Court</th>
                              <th>Reason</th>
                              <th>Start</th>
                              <th>End</th>
                            </tr>
                          </thead>
                          <tbody>
                            {blocks.map((b) => (
                              <tr key={b._id}>
                                <td>{b.courtId?.name || b.courtId}</td>
                                <td>{b.reason}</td>
                                <td>{new Date(b.start).toLocaleString()}</td>
                                <td>{new Date(b.end).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </>
                  )}

                  {!loading && !error && tab === "social" && (
                    <>
                      {!social.length ? (
                        <EmptyState
                          title="No social sessions"
                          description="Create a Friday social session via API."
                        />
                      ) : (
                        <Table responsive hover className="align-middle mb-0">
                          <thead>
                            <tr>
                              <th>Title</th>
                              <th>Start</th>
                              <th>Capacity</th>
                              <th>Joined</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {social.map((s) => (
                              <tr key={s._id}>
                                <td>{s.title}</td>
                                <td>{new Date(s.start).toLocaleString()}</td>
                                <td>{s.capacity}</td>
                                <td>{s.joinedCount}</td>
                                <td>
                                  <Badge color={s.status === "full" ? "warning" : "success"}>
                                    {s.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <Modal isOpen={courtModal} toggle={() => setCourtModal(false)} centered>
        <Form onSubmit={onCreateCourt}>
          <ModalHeader toggle={() => setCourtModal(false)}>Add court</ModalHeader>
          <ModalBody>
            {formError && (
              <div className="alert alert-danger py-2">{formError}</div>
            )}
            <Row>
              <Col md={12}>
                <FormGroup>
                  <Label>Sport *</Label>
                  <Input
                    type="select"
                    name="sportId"
                    required
                    value={courtForm.sportId}
                    onChange={onCourtFormChange}
                  >
                    <option value="">Select sport</option>
                    {sports.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.key})
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Name *</Label>
                  <Input
                    name="name"
                    required
                    value={courtForm.name}
                    onChange={onCourtFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Code *</Label>
                  <Input
                    name="code"
                    required
                    value={courtForm.code}
                    onChange={onCourtFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Walk-in peak (₹) *</Label>
                  <Input
                    type="number"
                    name="walkInPeak"
                    min={0}
                    step="0.01"
                    required
                    value={courtForm.walkInPeak}
                    onChange={onCourtFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Walk-in off-peak (₹) *</Label>
                  <Input
                    type="number"
                    name="walkInOffPeak"
                    min={0}
                    step="0.01"
                    required
                    value={courtForm.walkInOffPeak}
                    onChange={onCourtFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Tax</Label>
                  <Input
                    type="select"
                    name="taxId"
                    value={courtForm.taxId}
                    onChange={onCourtFormChange}
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
              <Col md={6}>
                <FormGroup>
                  <Label>Status</Label>
                  <Input
                    type="select"
                    name="status"
                    value={courtForm.status}
                    onChange={onCourtFormChange}
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="archived">Archived</option>
                  </Input>
                </FormGroup>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button type="button" color="light" onClick={() => setCourtModal(false)}>
              Cancel
            </Button>
            <Button type="submit" color="success" disabled={saving}>
              {saving ? "Saving…" : "Create court"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={sportModal} toggle={() => setSportModal(false)} centered>
        <Form onSubmit={onCreateSport}>
          <ModalHeader toggle={() => setSportModal(false)}>Add sport</ModalHeader>
          <ModalBody>
            {formError && (
              <div className="alert alert-danger py-2">{formError}</div>
            )}
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label>Key *</Label>
                  <Input
                    name="key"
                    required
                    placeholder="badminton"
                    value={sportForm.key}
                    onChange={onSportFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Name *</Label>
                  <Input
                    name="name"
                    required
                    value={sportForm.name}
                    onChange={onSportFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Session minutes</Label>
                  <Input
                    type="number"
                    name="sessionMinutes"
                    min={1}
                    value={sportForm.sessionMinutes}
                    onChange={onSportFormChange}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Slot step minutes</Label>
                  <Input
                    type="number"
                    name="slotStepMinutes"
                    min={1}
                    value={sportForm.slotStepMinutes}
                    onChange={onSportFormChange}
                  />
                </FormGroup>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button type="button" color="light" onClick={() => setSportModal(false)}>
              Cancel
            </Button>
            <Button type="submit" color="success" disabled={saving}>
              {saving ? "Saving…" : "Create sport"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Can>
  );
};

export default Courts;

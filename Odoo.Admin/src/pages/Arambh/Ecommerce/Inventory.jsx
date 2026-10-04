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
  Table,
} from "reactstrap";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import EmptyState from "../../../Components/Common/EmptyState";
import ErrorState from "../../../Components/Common/ErrorState";
import Skeleton from "../../../Components/Common/Skeleton";
import StatusChip from "../../../Components/Common/StatusChip";
import { Can } from "../../../Components/Common/Can";
import {
  adjustStock,
  listCategories,
  listInventory,
  listMovements,
  stockIn,
} from "../../../api/arambhEcommerce.api";
import {
  ADJUST_REASONS,
  MOVEMENT_TYPE_LABEL,
  STOCK_STATUS_LABEL,
  STOCK_STATUS_TONE,
} from "./shopLabels";
import { apiErrorMessage } from "../../../utils/apiErrorMessage";

const Inventory = () => {
  document.title = "Inventory | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockStatus, setStockStatus] = useState("");

  const [modal, setModal] = useState(null); // { mode: 'in' | 'adjust', row }
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState(ADJUST_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [historyRow, setHistoryRow] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listInventory({
        q: query || undefined,
        categoryId: categoryId || undefined,
        stockStatus: stockStatus || undefined,
      });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load inventory"),
        requestId: err?.response?.data?.requestId,
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query, categoryId, stockStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listCategories({ pageSize: 100 })
      .then((res) => setCategories(Array.isArray(res?.data?.data) ? res.data.data : []))
      .catch(() => setCategories([]));
  }, []);

  const openStockIn = (row) => {
    setModal({ mode: "in", row });
    setQuantity("1");
    setReason("New shipment");
    setCustomReason("");
    setFormError("");
  };

  const openAdjust = (row) => {
    setModal({ mode: "adjust", row });
    setQuantity(String(row.stockQuantity));
    setReason(ADJUST_REASONS[2]);
    setCustomReason("");
    setFormError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const row = modal.row;
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!finalReason) {
      setFormError("Please give a reason for this change");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const body = {
        productId: row.productId,
        variantId: row.variantId || undefined,
        reason: finalReason,
      };
      if (modal.mode === "in") {
        await stockIn({ ...body, quantity: Number(quantity) });
      } else {
        await adjustStock({ ...body, newQuantity: Number(quantity) });
      }
      setModal(null);
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not update the stock"));
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (row) => {
    setHistoryRow(row);
    setHistoryLoading(true);
    setHistory([]);
    try {
      const res = await listMovements({
        productId: row.productId,
        variantId: row.variantId || undefined,
        pageSize: 50,
      });
      setHistory(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <Can
      anyOf={["inventory.view", "product.view"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need inventory.view permission."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Inventory" pageTitle="E-commerce" />
          <Row>
            <Col>
              <Card>
                <CardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">Stock on hand ({rows.length})</h5>
                    <span className="text-muted small">
                      One shelf — the website and the counter draw from these numbers.
                    </span>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <Input
                      type="select"
                      style={{ maxWidth: 170 }}
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </Input>
                    <Input
                      type="select"
                      style={{ maxWidth: 160 }}
                      value={stockStatus}
                      onChange={(e) => setStockStatus(e.target.value)}
                    >
                      <option value="">All stock levels</option>
                      <option value="in_stock">In stock</option>
                      <option value="low_stock">Low stock</option>
                      <option value="out_of_stock">Out of stock</option>
                    </Input>
                    <Input
                      style={{ maxWidth: 220 }}
                      placeholder="Search product or SKU…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardBody>
                  {error && (
                    <ErrorState message={error.message} requestId={error.requestId} onRetry={load} />
                  )}
                  {loading ? (
                    <Skeleton rows={6} />
                  ) : rows.length === 0 && !error ? (
                    <EmptyState
                      icon="ri-archive-line"
                      title="Nothing to show"
                      description="Add products to the Pro Shop and their stock will appear here."
                    />
                  ) : (
                    <div className="table-responsive">
                      <Table className="align-middle table-nowrap mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Product</th>
                            <th>Variant</th>
                            <th>SKU</th>
                            <th className="text-center">Current stock</th>
                            <th className="text-center">Threshold</th>
                            <th>Status</th>
                            <th>Last updated</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={`${row.productId}-${row.variantId || "base"}`}>
                              <td className="fw-medium">{row.productName}</td>
                              <td>{row.variantName || <span className="text-muted">—</span>}</td>
                              <td>
                                <code>{row.sku}</code>
                              </td>
                              <td className="text-center fw-semibold">{row.stockQuantity}</td>
                              <td className="text-center text-muted">{row.lowStockThreshold}</td>
                              <td>
                                <StatusChip
                                  tone={STOCK_STATUS_TONE[row.stockStatus]}
                                  label={STOCK_STATUS_LABEL[row.stockStatus]}
                                />
                              </td>
                              <td className="text-muted small">
                                {row.updatedAt
                                  ? new Date(row.updatedAt).toLocaleDateString("en-IN")
                                  : "—"}
                              </td>
                              <td className="text-end">
                                <div className="d-flex gap-1 justify-content-end">
                                  <Can anyOf={["inventory.create"]}>
                                    <Button
                                      size="sm"
                                      color="soft-success"
                                      onClick={() => openStockIn(row)}
                                    >
                                      Stock in
                                    </Button>
                                    <Button
                                      size="sm"
                                      color="soft-warning"
                                      onClick={() => openAdjust(row)}
                                    >
                                      Adjust
                                    </Button>
                                  </Can>
                                  <Button
                                    size="sm"
                                    color="soft-primary"
                                    onClick={() => openHistory(row)}
                                  >
                                    History
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <Modal isOpen={Boolean(modal)} toggle={() => setModal(null)} centered>
        <Form onSubmit={onSubmit}>
          <ModalHeader toggle={() => setModal(null)}>
            {modal?.mode === "in" ? "Stock in" : "Stock adjustment"}
          </ModalHeader>
          <ModalBody>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}
            {modal && (
              <>
                <p className="mb-3">
                  <strong>{modal.row.productName}</strong>
                  {modal.row.variantName ? ` · ${modal.row.variantName}` : ""}
                  <br />
                  <span className="text-muted small">
                    Current stock: {modal.row.stockQuantity}
                  </span>
                </p>
                <FormGroup>
                  <Label>
                    {modal.mode === "in" ? "Quantity received" : "New counted quantity"}
                  </Label>
                  <Input
                    type="number"
                    min={modal.mode === "in" ? 1 : 0}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Reason *</Label>
                  <Input
                    type="select"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    {ADJUST_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
                {reason === "Other" && (
                  <FormGroup>
                    <Label>Describe the reason *</Label>
                    <Input
                      required
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                    />
                  </FormGroup>
                )}
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" color="light" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button type="submit" color="success" disabled={saving}>
              {saving ? "Saving…" : "Apply"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={Boolean(historyRow)} toggle={() => setHistoryRow(null)} centered size="lg">
        <ModalHeader toggle={() => setHistoryRow(null)}>
          Stock movements · {historyRow?.productName}
          {historyRow?.variantName ? ` · ${historyRow.variantName}` : ""}
        </ModalHeader>
        <ModalBody>
          {historyLoading ? (
            <Skeleton rows={5} />
          ) : history.length === 0 ? (
            <EmptyState
              icon="ri-history-line"
              title="No movements yet"
              description="Stock changes will be listed here with their reason."
            />
          ) : (
            <div className="table-responsive">
              <Table className="align-middle table-nowrap mb-0" size="sm">
                <thead className="table-light">
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th className="text-center">Change</th>
                    <th className="text-center">Before → After</th>
                    <th>Reference</th>
                    <th>Reason</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((m) => (
                    <tr key={m._id}>
                      <td className="text-muted small">
                        {new Date(m.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td>{MOVEMENT_TYPE_LABEL[m.type] || m.type}</td>
                      <td
                        className={`text-center fw-semibold ${m.quantity < 0 ? "text-danger" : "text-success"}`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="text-center">
                        {m.quantityBefore} → {m.quantityAfter}
                      </td>
                      <td>{m.referenceLabel || "—"}</td>
                      <td>{m.reason || "—"}</td>
                      <td className="text-muted small">{m.createdByName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setHistoryRow(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </Can>
  );
};

export default Inventory;

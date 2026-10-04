import React, { useCallback, useEffect, useState } from "react";
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
  Spinner,
  Table,
} from "reactstrap";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import { Can } from "../../Components/Common/Can";
import api from "../../api";

function mediaUrl(path) {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const base = (api.defaults.baseURL || "").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatPaise(paise) {
  if (paise == null || Number.isNaN(Number(paise))) return "—";
  return `₹${(Number(paise) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

const emptyForm = {
  id: "",
  name: "",
  sku: "",
  categoryId: "",
  priceRupees: "",
  imageUrl: "",
  description: "",
  station: "counter",
  isActive: true,
};

const PosItems = () => {
  document.title = "Menu items | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get("/api/admin/pos/products"),
        api.get("/api/admin/pos/categories"),
      ]);
      setRows(Array.isArray(prodRes?.data?.data) ? prodRes.data.data : []);
      setCategories(Array.isArray(catRes?.data?.data) ? catRes.data.data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load items",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({
      ...emptyForm,
      categoryId: categories[0]?._id || "",
      station: categories[0]?.station || "counter",
    });
    setOpen(true);
  };

  const openEdit = (r) => {
    setForm({
      id: r._id,
      name: r.name || "",
      sku: r.sku || "",
      categoryId: r.categoryId?._id || r.categoryId || "",
      priceRupees: String((Number(r.pricePaise) || 0) / 100),
      imageUrl: r.imageUrl || "",
      description: r.description || "",
      station: r.station || "counter",
      isActive: r.isActive !== false,
    });
    setOpen(true);
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.post("/api/admin/pos/products/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res?.data?.data?.imageUrl || "";
      if (!url) throw new Error("No image URL returned");
      setForm((f) => ({ ...f, imageUrl: url }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const rupees = Number(form.priceRupees);
    if (!form.name.trim() || !form.categoryId || Number.isNaN(rupees) || rupees < 0) {
      toast.error("Name, category and price are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/admin/pos/products", {
        ...(form.id ? { id: form.id } : {}),
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        categoryId: form.categoryId,
        pricePaise: Math.round(rupees * 100),
        imageUrl: form.imageUrl || "",
        description: form.description || "",
        station: form.station || "counter",
        isActive: form.isActive,
      });
      toast.success(form.id ? "Item updated" : "Item created");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Can perm="product.edit">
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Menu Items" pageTitle="POS" />
          <Row>
            <Col>
              <Card>
                <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <h5 className="mb-0">Menu items</h5>
                    <div className="text-muted small">
                      Master catalog with images — assign to cafés under Café menus
                    </div>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button tag={Link} to="/pos/cafes" color="light" size="sm">
                      Cafés
                    </Button>
                    <Button tag={Link} to="/pos/menu" color="light" size="sm">
                      Café menus
                    </Button>
                    <Button color="success" size="sm" onClick={openCreate}>
                      + Add item
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {loading ? (
                    <Skeleton rows={6} />
                  ) : error ? (
                    <ErrorState message={error.message} onRetry={load} />
                  ) : !rows.length ? (
                    <EmptyState
                      title="No menu items"
                      description="Add drinks and snacks, then put them on each café menu."
                      actionLabel="Add item"
                      onAction={openCreate}
                    />
                  ) : (
                    <div className="table-responsive">
                      <Table className="align-middle table-nowrap mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: 64 }}>Image</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Station</th>
                            <th>Status</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r._id}>
                              <td>
                                {r.imageUrl ? (
                                  <img
                                    src={mediaUrl(r.imageUrl)}
                                    alt=""
                                    width={48}
                                    height={48}
                                    style={{
                                      objectFit: "cover",
                                      borderRadius: 8,
                                      background: "#eef5f0",
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="d-flex align-items-center justify-content-center text-muted"
                                    style={{
                                      width: 48,
                                      height: 48,
                                      borderRadius: 8,
                                      background: "#eef5f0",
                                      fontSize: 18,
                                    }}
                                  >
                                    <i className="ri-cup-line" />
                                  </div>
                                )}
                              </td>
                              <td>
                                <div className="fw-semibold">{r.name}</div>
                                <div className="small text-muted">{r.sku}</div>
                              </td>
                              <td>{r.categoryId?.name || "—"}</td>
                              <td>{formatPaise(r.pricePaise)}</td>
                              <td>
                                <Badge color="light" className="text-dark">
                                  {r.station}
                                </Badge>
                              </td>
                              <td>
                                {r.isActive !== false ? (
                                  <Badge color="success">Active</Badge>
                                ) : (
                                  <Badge color="secondary">Off</Badge>
                                )}
                              </td>
                              <td className="text-end">
                                <Button color="light" size="sm" onClick={() => openEdit(r)}>
                                  Edit
                                </Button>
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

        <Modal isOpen={open} toggle={() => setOpen(false)} centered size="lg">
          <Form onSubmit={save}>
            <ModalHeader toggle={() => setOpen(false)}>
              {form.id ? "Edit item" : "New menu item"}
            </ModalHeader>
            <ModalBody>
              <Row>
                <Col md={8}>
                  <FormGroup>
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </FormGroup>
                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label>Category</Label>
                        <Input
                          type="select"
                          value={form.categoryId}
                          onChange={(e) => {
                            const cat = categories.find((c) => c._id === e.target.value);
                            setForm((f) => ({
                              ...f,
                              categoryId: e.target.value,
                              station: cat?.station || f.station,
                            }));
                          }}
                          required
                        >
                          <option value="">Select…</option>
                          {categories.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label>Price (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.priceRupees}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, priceRupees: e.target.value }))
                          }
                          required
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label>SKU (optional)</Label>
                        <Input
                          value={form.sku}
                          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                        />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label>Station</Label>
                        <Input
                          type="select"
                          value={form.station}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, station: e.target.value }))
                          }
                        >
                          <option value="counter">Counter</option>
                          <option value="bar">Bar</option>
                          <option value="kitchen">Kitchen</option>
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>
                  <FormGroup>
                    <Label>Description</Label>
                    <Input
                      type="textarea"
                      rows={2}
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                  </FormGroup>
                  <FormGroup check className="mb-0">
                    <Input
                      type="checkbox"
                      id="itemActive"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isActive: e.target.checked }))
                      }
                    />
                    <Label check htmlFor="itemActive">
                      Active
                    </Label>
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <Label>Item image</Label>
                  <div
                    className="border rounded d-flex align-items-center justify-content-center mb-2 overflow-hidden"
                    style={{ height: 160, background: "#f3f6f4" }}
                  >
                    {form.imageUrl ? (
                      <img
                        src={mediaUrl(form.imageUrl)}
                        alt=""
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span className="text-muted small">No image</span>
                    )}
                  </div>
                  <Input type="file" accept="image/*" onChange={onUpload} disabled={uploading} />
                  {uploading ? (
                    <div className="small text-muted mt-1">
                      <Spinner size="sm" /> Uploading…
                    </div>
                  ) : null}
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter>
              <Button type="button" color="light" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" color="success" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </div>
    </Can>
  );
};

export default PosItems;

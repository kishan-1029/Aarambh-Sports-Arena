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
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../../../api/arambhEcommerce.api";
import { apiErrorMessage } from "../../../utils/apiErrorMessage";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  icon: "ri-shopping-bag-3-line",
  sortOrder: "0",
  active: true,
};

const Categories = () => {
  document.title = "Shop categories | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCategories({ pageSize: 100 });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load categories"),
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
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      slug: row.slug || "",
      description: row.description || "",
      icon: row.icon || "",
      sortOrder: String(row.sortOrder ?? 0),
      active: row.active !== false,
    });
    setFormError("");
    setModal(true);
  };

  const onFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      active: form.active,
    };
    if (form.slug.trim()) body.slug = form.slug.trim();

    try {
      if (editing) await updateCategory(editing._id, body);
      else await createCategory(body);
      setModal(false);
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not save the category"));
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (row) => {
    setBusyId(row._id);
    try {
      await updateCategory(row._id, { active: row.active === false });
      await load();
    } catch (err) {
      window.alert(apiErrorMessage(err, "Could not update the category"));
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (row) => {
    if (!window.confirm(`Delete the ${row.name} category? This cannot be undone.`)) return;
    setBusyId(row._id);
    try {
      await deleteCategory(row._id);
      await load();
    } catch (err) {
      window.alert(apiErrorMessage(err, "Could not delete the category"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Can
      anyOf={["product.view", "product.edit"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need product.view permission."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Categories" pageTitle="E-commerce" />
          <Row>
            <Col>
              <Card>
                <CardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <h5 className="mb-0">Shop categories ({rows.length})</h5>
                  <Can anyOf={["product.edit"]}>
                    <Button color="success" onClick={openCreate}>
                      <i className="ri-add-line me-1" />
                      Add category
                    </Button>
                  </Can>
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
                      icon="ri-price-tag-3-line"
                      title="No categories yet"
                      description="Create Rackets, Balls, Shoes, Accessories and Apparel to get started."
                      actionLabel="Add category"
                      onAction={openCreate}
                    />
                  ) : (
                    <div className="table-responsive">
                      <Table className="align-middle table-nowrap mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: 60 }}>Order</th>
                            <th>Category</th>
                            <th>Slug</th>
                            <th className="text-center">Products</th>
                            <th>Status</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row._id}>
                              <td className="text-muted">{row.sortOrder}</td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  {row.icon ? <i className={`${row.icon} fs-5 text-muted`} /> : null}
                                  <div>
                                    <div className="fw-medium">{row.name}</div>
                                    {row.description ? (
                                      <div
                                        className="text-muted small text-truncate"
                                        style={{ maxWidth: 360 }}
                                      >
                                        {row.description}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <code>{row.slug}</code>
                              </td>
                              <td className="text-center">{row.productCount}</td>
                              <td>
                                <StatusChip
                                  tone={row.active === false ? "danger" : "success"}
                                  label={row.active === false ? "Inactive" : "Active"}
                                />
                              </td>
                              <td className="text-end">
                                <Can anyOf={["product.edit"]}>
                                  <div className="d-flex gap-1 justify-content-end">
                                    <Button size="sm" color="soft-primary" onClick={() => openEdit(row)}>
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      color="soft-secondary"
                                      disabled={busyId === row._id}
                                      onClick={() => onToggleActive(row)}
                                    >
                                      {row.active === false ? "Activate" : "Deactivate"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      color="soft-danger"
                                      disabled={busyId === row._id || row.productCount > 0}
                                      title={
                                        row.productCount > 0
                                          ? "Move or remove the products first"
                                          : "Delete category"
                                      }
                                      onClick={() => onDelete(row)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </Can>
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

      <Modal isOpen={modal} toggle={() => setModal(false)} centered>
        <Form onSubmit={onSubmit}>
          <ModalHeader toggle={() => setModal(false)}>
            {editing ? `Edit ${editing.name}` : "Add category"}
          </ModalHeader>
          <ModalBody>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}
            <FormGroup>
              <Label>Name *</Label>
              <Input name="name" required value={form.name} onChange={onFormChange} />
            </FormGroup>
            <FormGroup>
              <Label>Slug</Label>
              <Input
                name="slug"
                value={form.slug}
                onChange={onFormChange}
                placeholder="Left blank, we generate one from the name"
              />
            </FormGroup>
            <FormGroup>
              <Label>Description</Label>
              <Input
                type="textarea"
                rows={2}
                name="description"
                value={form.description}
                onChange={onFormChange}
              />
            </FormGroup>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label>Icon class</Label>
                  <Input name="icon" value={form.icon} onChange={onFormChange} />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    name="sortOrder"
                    value={form.sortOrder}
                    onChange={onFormChange}
                  />
                </FormGroup>
              </Col>
            </Row>
            <FormGroup check>
              <Input
                type="checkbox"
                id="cat-active"
                name="active"
                checked={form.active}
                onChange={onFormChange}
              />
              <Label check for="cat-active">
                Active
              </Label>
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button type="button" color="light" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button type="submit" color="success" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create category"}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </Can>
  );
};

export default Categories;

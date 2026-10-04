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
  Table,
} from "reactstrap";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { apiErrorMessage } from "../../utils/apiErrorMessage";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import { Can } from "../../Components/Common/Can";
import api from "../../api";

const emptyForm = {
  id: "",
  name: "",
  code: "",
  description: "",
  contactNumber: "",
  isAcceptingOrders: true,
  isActive: true,
  sequence: 0,
};

const PosCafes = () => {
  document.title = "Café setup | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/admin/pos/cafes");
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load cafés"),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (r) => {
    setForm({
      id: r._id,
      name: r.name || "",
      code: r.code || "",
      description: r.description || "",
      contactNumber: r.contactNumber || "",
      isAcceptingOrders: r.isAcceptingOrders !== false,
      isActive: r.isActive !== false,
      sequence: r.sequence ?? 0,
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/admin/pos/cafes", {
        ...(form.id ? { id: form.id } : {}),
        name: form.name,
        code: form.code,
        description: form.description,
        contactNumber: form.contactNumber,
        isAcceptingOrders: form.isAcceptingOrders,
        isActive: form.isActive,
        sequence: Number(form.sequence) || 0,
      });
      toast.success(form.id ? "Café updated" : "Café created");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Can perm="product.edit">
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Café Master" pageTitle="POS" />
          <Row>
            <Col>
              <Card>
                <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <h5 className="mb-0">Cafés & bars</h5>
                    <small className="text-muted">
                      Multiple outlets — each has its own menu under Café menus
                    </small>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button tag={Link} to="/pos/items" color="light" size="sm">
                      Menu items
                    </Button>
                    <Button tag={Link} to="/pos/menu" color="light" size="sm">
                      Café menus
                    </Button>
                    <Button color="success" size="sm" onClick={openCreate}>
                      + Add café
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {loading ? (
                    <Skeleton rows={5} />
                  ) : error ? (
                    <ErrorState message={error.message} onRetry={load} />
                  ) : !rows.length ? (
                    <EmptyState
                      title="No cafés yet"
                      description="Add Main Café / Poolside Bar, then assign menus."
                    />
                  ) : (
                    <Table responsive hover className="align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Code</th>
                          <th>Orders</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r._id}>
                            <td>
                              <div className="fw-semibold">{r.name}</div>
                              <small className="text-muted">{r.description}</small>
                            </td>
                            <td>
                              <code>{r.code}</code>
                            </td>
                            <td>
                              <Badge color={r.isAcceptingOrders ? "success" : "warning"}>
                                {r.isAcceptingOrders ? "Accepting" : "Paused"}
                              </Badge>
                            </td>
                            <td>
                              <Badge color={r.isActive ? "success" : "secondary"}>
                                {r.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="text-end">
                              <Button
                                color="primary"
                                size="sm"
                                outline
                                className="me-1"
                                onClick={() => openEdit(r)}
                              >
                                Edit
                              </Button>
                              <Button
                                tag={Link}
                                to={`/pos/menu?cafe=${r._id}`}
                                color="success"
                                size="sm"
                                outline
                              >
                                Menu
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>

        <Modal isOpen={open} toggle={() => setOpen(false)} centered>
          <Form onSubmit={save}>
            <ModalHeader toggle={() => setOpen(false)}>
              {form.id ? "Edit café" : "Add café"}
            </ModalHeader>
            <ModalBody>
              <FormGroup>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                  }
                  required
                  disabled={Boolean(form.id)}
                />
              </FormGroup>
              <FormGroup>
                <Label>Description</Label>
                <Input
                  type="textarea"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </FormGroup>
              <FormGroup>
                <Label>Contact</Label>
                <Input
                  value={form.contactNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactNumber: e.target.value }))
                  }
                />
              </FormGroup>
              <FormGroup check className="mb-2">
                <Input
                  type="checkbox"
                  checked={form.isAcceptingOrders}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isAcceptingOrders: e.target.checked }))
                  }
                />
                <Label check>Accepting orders</Label>
              </FormGroup>
              <FormGroup check>
                <Input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                <Label check>Active</Label>
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <Button color="light" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button color="success" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </div>
    </Can>
  );
};

export default PosCafes;

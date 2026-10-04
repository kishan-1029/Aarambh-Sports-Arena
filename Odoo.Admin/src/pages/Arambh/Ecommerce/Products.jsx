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
  Input,
  Row,
  Table,
} from "reactstrap";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import EmptyState from "../../../Components/Common/EmptyState";
import ErrorState from "../../../Components/Common/ErrorState";
import Money from "../../../Components/Common/Money";
import Skeleton from "../../../Components/Common/Skeleton";
import StatusChip from "../../../Components/Common/StatusChip";
import { Can } from "../../../Components/Common/Can";
import config from "../../../config";
import {
  archiveProduct,
  listCategories,
  listProducts,
  updateProduct,
} from "../../../api/arambhEcommerce.api";
import { STOCK_STATUS_LABEL, STOCK_STATUS_TONE } from "./shopLabels";
import { apiErrorMessage } from "../../../utils/apiErrorMessage";

function imageSrc(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = config.api.API_URL || "";
  return `${base}/${String(url).replace(/^\/+/, "")}`;
}

const Products = () => {
  document.title = "Shop products | Arambh Sports Arena";
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [active, setActive] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProducts({
        pageSize: 100,
        q: query || undefined,
        categoryId: categoryId || undefined,
        active: active || undefined,
        stockStatus: stockStatus || undefined,
      });
      setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load products"),
        requestId: err?.response?.data?.requestId,
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query, categoryId, active, stockStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listCategories({ pageSize: 100 })
      .then((res) => setCategories(Array.isArray(res?.data?.data) ? res.data.data : []))
      .catch(() => setCategories([]));
  }, []);

  const onToggleActive = async (row) => {
    setBusyId(row._id);
    try {
      await updateProduct(row._id, { active: row.active === false });
      await load();
    } catch (err) {
      window.alert(apiErrorMessage(err, "Could not update the product"));
    } finally {
      setBusyId(null);
    }
  };

  const onArchive = async (row) => {
    if (
      !window.confirm(
        `Archive ${row.name}? It disappears from the shop but past orders keep their history.`,
      )
    ) {
      return;
    }
    setBusyId(row._id);
    try {
      await archiveProduct(row._id, true);
      await load();
    } catch (err) {
      window.alert(apiErrorMessage(err, "Could not archive the product"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Can
      anyOf={["product.view", "inventory.view"]}
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
          <BreadCrumb title="Products" pageTitle="E-commerce" />
          <Row>
            <Col>
              <Card>
                <CardHeader className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                  <h5 className="mb-0">Products ({rows.length})</h5>
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
                      style={{ maxWidth: 150 }}
                      value={stockStatus}
                      onChange={(e) => setStockStatus(e.target.value)}
                    >
                      <option value="">All stock</option>
                      <option value="in_stock">In stock</option>
                      <option value="low_stock">Low stock</option>
                      <option value="out_of_stock">Out of stock</option>
                    </Input>
                    <Input
                      type="select"
                      style={{ maxWidth: 130 }}
                      value={active}
                      onChange={(e) => setActive(e.target.value)}
                    >
                      <option value="">All status</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </Input>
                    <Input
                      style={{ maxWidth: 220 }}
                      placeholder="Search name, SKU, brand…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <Can anyOf={["product.edit"]}>
                      <Button color="success" tag={Link} to="/ecommerce/products/new">
                        <i className="ri-add-line me-1" />
                        Add product
                      </Button>
                    </Can>
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
                      icon="ri-shopping-bag-3-line"
                      title="No products match"
                      description="Adjust the filters, or add the first product to the Pro Shop."
                    />
                  ) : (
                    <div className="table-responsive">
                      <Table className="align-middle table-nowrap mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: 56 }}>Image</th>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th className="text-end">Price</th>
                            <th className="text-center">Stock</th>
                            <th>Status</th>
                            <th className="text-center">Featured</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row._id}>
                              <td>
                                {row.primaryImage ? (
                                  <img
                                    src={imageSrc(row.primaryImage)}
                                    alt={row.name}
                                    width={40}
                                    height={40}
                                    className="rounded"
                                    style={{ objectFit: "cover" }}
                                  />
                                ) : (
                                  <div
                                    className="rounded bg-light d-flex align-items-center justify-content-center text-muted"
                                    style={{ width: 40, height: 40 }}
                                  >
                                    <i className="ri-image-line" />
                                  </div>
                                )}
                              </td>
                              <td>
                                <Link to={`/ecommerce/products/${row._id}`} className="fw-medium">
                                  {row.name}
                                </Link>
                                <div className="text-muted small">
                                  {row.brand || "—"}
                                  {row.hasVariants
                                    ? ` · ${row.variants?.length || 0} variants`
                                    : ""}
                                </div>
                              </td>
                              <td>
                                <code>{row.sku}</code>
                              </td>
                              <td>{row.categoryId?.name || "—"}</td>
                              <td className="text-end">
                                <Money paise={row.sellingPricePaise} />
                                {row.mrpPaise > row.sellingPricePaise ? (
                                  <div className="text-muted small text-decoration-line-through">
                                    <Money paise={row.mrpPaise} />
                                  </div>
                                ) : null}
                              </td>
                              <td className="text-center">
                                <div className="fw-semibold">{row.stockOnHand}</div>
                                <StatusChip
                                  tone={STOCK_STATUS_TONE[row.stockStatus]}
                                  label={STOCK_STATUS_LABEL[row.stockStatus]}
                                />
                              </td>
                              <td>
                                <StatusChip
                                  tone={row.active === false ? "danger" : "success"}
                                  label={row.active === false ? "Inactive" : "Active"}
                                />
                              </td>
                              <td className="text-center">
                                {row.featured ? (
                                  <Badge color="warning" pill>
                                    Featured
                                  </Badge>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                              <td className="text-end">
                                <div className="d-flex gap-1 justify-content-end">
                                  <Button
                                    size="sm"
                                    color="soft-primary"
                                    tag={Link}
                                    to={`/ecommerce/products/${row._id}`}
                                  >
                                    Edit
                                  </Button>
                                  <Can anyOf={["product.edit"]}>
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
                                      disabled={busyId === row._id}
                                      onClick={() => onArchive(row)}
                                    >
                                      Archive
                                    </Button>
                                  </Can>
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
    </Can>
  );
};

export default Products;

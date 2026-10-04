import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  Row,
  Table,
} from "reactstrap";
import BreadCrumb from "../../../Components/Common/BreadCrumb";
import EmptyState from "../../../Components/Common/EmptyState";
import ErrorState from "../../../Components/Common/ErrorState";
import Skeleton from "../../../Components/Common/Skeleton";
import { Can } from "../../../Components/Common/Can";
import config from "../../../config";
import {
  createProduct,
  getProduct,
  listCategories,
  updateProduct,
  uploadProductImage,
} from "../../../api/arambhEcommerce.api";
import { paiseToRupees, rupeesToPaise } from "./shopLabels";
import { apiErrorMessage } from "../../../utils/apiErrorMessage";

function imageSrc(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = config.api.API_URL || "";
  return `${base}/${String(url).replace(/^\/+/, "")}`;
}

const EMPTY_FORM = {
  name: "",
  sku: "",
  slug: "",
  categoryId: "",
  brand: "",
  shortDescription: "",
  description: "",
  mrp: "",
  sellingPrice: "",
  costPrice: "",
  taxRatePct: "0",
  trackInventory: true,
  stockQuantity: "0",
  lowStockThreshold: "5",
  hasVariants: false,
  memberDiscountEligible: true,
  pickup: true,
  delivery: true,
  active: true,
  featured: false,
};

const EMPTY_VARIANT = {
  sku: "",
  size: "",
  colour: "",
  additionalPrice: "0",
  stockQuantity: "0",
  active: true,
};

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  document.title = `${isNew ? "New product" : "Edit product"} | Arambh Sports Arena`;

  const [form, setForm] = useState(EMPTY_FORM);
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState("");
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getProduct(id);
      const p = res?.data?.data;
      if (!p) throw new Error("Product not found");
      setForm({
        name: p.name || "",
        sku: p.sku || "",
        slug: p.slug || "",
        categoryId: String(p.categoryId?._id || p.categoryId || ""),
        brand: p.brand || "",
        shortDescription: p.shortDescription || "",
        description: p.description || "",
        mrp: paiseToRupees(p.mrpPaise),
        sellingPrice: paiseToRupees(p.sellingPricePaise),
        costPrice: paiseToRupees(p.costPricePaise),
        taxRatePct: String(p.taxRatePct ?? 0),
        trackInventory: p.trackInventory !== false,
        stockQuantity: String(p.stockQuantity ?? 0),
        lowStockThreshold: String(p.lowStockThreshold ?? 5),
        hasVariants: Boolean(p.hasVariants),
        memberDiscountEligible: p.memberDiscountEligible !== false,
        pickup: p.fulfillment?.pickup !== false,
        delivery: p.fulfillment?.delivery !== false,
        active: p.active !== false,
        featured: Boolean(p.featured),
      });
      setVariants(
        (p.variants || []).map((v) => ({
          _id: v._id,
          sku: v.sku || "",
          size: v.size || "",
          colour: v.colour || "",
          additionalPrice: paiseToRupees(v.additionalPricePaise || 0),
          stockQuantity: String(v.stockQuantity ?? 0),
          active: v.active !== false,
        })),
      );
      setImages(
        (p.images || []).map((i) => ({
          _id: i._id,
          url: i.url,
          altText: i.altText || "",
          isPrimary: Boolean(i.isPrimary),
        })),
      );
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load the product"),
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listCategories({ pageSize: 100, active: "true" })
      .then((res) => setCategories(Array.isArray(res?.data?.data) ? res.data.data : []))
      .catch(() => setCategories([]));
  }, []);

  const onFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onVariantChange = (index, field, value) => {
    setVariants((rows) =>
      rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  };

  const addVariant = () => setVariants((rows) => [...rows, { ...EMPTY_VARIANT }]);
  const removeVariant = (index) => setVariants((rows) => rows.filter((_, i) => i !== index));

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError("");
    try {
      const res = await uploadProductImage(file);
      const url = res?.data?.data?.url;
      if (url) {
        setImages((rows) => [
          ...rows,
          { url, altText: form.name, isPrimary: rows.length === 0 },
        ]);
      }
    } catch (err) {
      setFormError(apiErrorMessage(err, "Image upload failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setPrimaryImage = (index) =>
    setImages((rows) => rows.map((r, i) => ({ ...r, isPrimary: i === index })));

  const removeImage = (index) =>
    setImages((rows) => {
      const next = rows.filter((_, i) => i !== index);
      if (next.length && !next.some((r) => r.isPrimary)) next[0].isPrimary = true;
      return next;
    });

  const moveImage = (index, direction) =>
    setImages((rows) => {
      const target = index + direction;
      if (target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const variantStockTotal = useMemo(
    () => variants.reduce((n, v) => n + (Number(v.stockQuantity) || 0), 0),
    [variants],
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const sellingPricePaise = rupeesToPaise(form.sellingPrice);
    const mrpPaise = form.mrp === "" ? 0 : rupeesToPaise(form.mrp);

    if (sellingPricePaise < 0) return setFormError("Selling price cannot be negative");
    if (mrpPaise > 0 && mrpPaise < sellingPricePaise) {
      return setFormError("MRP cannot be lower than the selling price");
    }
    if (!form.categoryId) return setFormError("Choose a category");
    if (form.hasVariants && variants.length === 0) {
      return setFormError("Add at least one variant, or turn variants off");
    }

    const body = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      brand: form.brand.trim(),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      sellingPricePaise,
      mrpPaise,
      costPricePaise: form.costPrice === "" ? 0 : rupeesToPaise(form.costPrice),
      taxRatePct: Number(form.taxRatePct) || 0,
      trackInventory: form.trackInventory,
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
      memberDiscountEligible: form.memberDiscountEligible,
      fulfillment: { pickup: form.pickup, delivery: form.delivery },
      active: form.active,
      featured: form.featured,
      images: images.map((img, index) => ({
        ...(img._id ? { _id: img._id } : {}),
        url: img.url,
        altText: img.altText || form.name,
        sortOrder: index,
        isPrimary: Boolean(img.isPrimary),
      })),
    };

    if (form.slug.trim()) body.slug = form.slug.trim();
    if (isNew) body.sku = form.sku.trim().toUpperCase();
    else if (form.sku.trim()) body.sku = form.sku.trim().toUpperCase();

    if (form.hasVariants) {
      body.hasVariants = true;
      body.variants = variants.map((v) => ({
        ...(v._id ? { _id: v._id } : {}),
        sku: v.sku.trim().toUpperCase() || undefined,
        size: v.size.trim(),
        colour: v.colour.trim(),
        additionalPricePaise: v.additionalPrice === "" ? 0 : rupeesToPaise(v.additionalPrice),
        stockQuantity: Number(v.stockQuantity) || 0,
        active: v.active,
      }));
    } else {
      body.hasVariants = false;
      body.variants = [];
      if (isNew) body.stockQuantity = Number(form.stockQuantity) || 0;
    }

    setSaving(true);
    try {
      if (isNew) {
        const res = await createProduct(body);
        const newId = res?.data?.data?._id;
        navigate(newId ? `/ecommerce/products/${newId}` : "/ecommerce/products");
      } else {
        await updateProduct(id, body);
        await load();
      }
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not save the product"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Product" pageTitle="E-commerce" />
          <Card>
            <CardBody>
              <Skeleton rows={8} />
            </CardBody>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <Can
      anyOf={["product.edit"]}
      fallback={
        <div className="page-content">
          <Container fluid>
            <EmptyState
              icon="ri-lock-line"
              title="No access"
              description="You need product.edit permission."
            />
          </Container>
        </div>
      }
    >
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title={isNew ? "New product" : form.name} pageTitle="E-commerce" />

          {error && <ErrorState message={error.message} requestId={error.requestId} onRetry={load} />}

          <Form onSubmit={onSubmit}>
            {formError && <div className="alert alert-danger">{formError}</div>}

            <Row>
              <Col xl={8}>
                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Basic information</h5>
                  </CardHeader>
                  <CardBody>
                    <Row>
                      <Col md={8}>
                        <FormGroup>
                          <Label>Product name *</Label>
                          <Input name="name" required value={form.name} onChange={onFormChange} />
                        </FormGroup>
                      </Col>
                      <Col md={4}>
                        <FormGroup>
                          <Label>SKU *</Label>
                          <Input
                            name="sku"
                            required={isNew}
                            value={form.sku}
                            onChange={onFormChange}
                            placeholder="ASA-RKT-001"
                          />
                        </FormGroup>
                      </Col>
                      <Col md={6}>
                        <FormGroup>
                          <Label>Category *</Label>
                          <Input
                            type="select"
                            name="categoryId"
                            required
                            value={form.categoryId}
                            onChange={onFormChange}
                          >
                            <option value="">Choose a category…</option>
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
                          <Label>Brand</Label>
                          <Input name="brand" value={form.brand} onChange={onFormChange} />
                        </FormGroup>
                      </Col>
                      <Col md={12}>
                        <FormGroup>
                          <Label>Short description</Label>
                          <Input
                            name="shortDescription"
                            maxLength={300}
                            value={form.shortDescription}
                            onChange={onFormChange}
                            placeholder="One line shown on the product card"
                          />
                        </FormGroup>
                      </Col>
                      <Col md={12}>
                        <FormGroup>
                          <Label>Description</Label>
                          <Input
                            type="textarea"
                            rows={5}
                            name="description"
                            value={form.description}
                            onChange={onFormChange}
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Pricing</h5>
                  </CardHeader>
                  <CardBody>
                    <Row>
                      <Col md={3}>
                        <FormGroup>
                          <Label>MRP (₹)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            name="mrp"
                            value={form.mrp}
                            onChange={onFormChange}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={3}>
                        <FormGroup>
                          <Label>Selling price (₹) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            name="sellingPrice"
                            required
                            value={form.sellingPrice}
                            onChange={onFormChange}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={3}>
                        <FormGroup>
                          <Label>Cost price (₹)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            name="costPrice"
                            value={form.costPrice}
                            onChange={onFormChange}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={3}>
                        <FormGroup>
                          <Label>Tax rate (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            name="taxRatePct"
                            value={form.taxRatePct}
                            onChange={onFormChange}
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <FormGroup check className="mt-1">
                      <Input
                        type="checkbox"
                        id="member-eligible"
                        name="memberDiscountEligible"
                        checked={form.memberDiscountEligible}
                        onChange={onFormChange}
                      />
                      <Label check for="member-eligible">
                        Apply the membership shop discount to this product
                      </Label>
                    </FormGroup>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Product options</h5>
                    <FormGroup switch className="mb-0">
                      <Input
                        type="switch"
                        id="has-variants"
                        name="hasVariants"
                        checked={form.hasVariants}
                        onChange={onFormChange}
                      />
                      <Label check for="has-variants">
                        This product has sizes or colours
                      </Label>
                    </FormGroup>
                  </CardHeader>
                  <CardBody>
                    {!form.hasVariants ? (
                      <p className="text-muted mb-0">
                        No variants. Stock is tracked against the product itself.
                      </p>
                    ) : (
                      <>
                        <div className="table-responsive">
                          <Table className="align-middle mb-2" size="sm">
                            <thead className="table-light">
                              <tr>
                                <th>SKU</th>
                                <th>Size</th>
                                <th>Colour</th>
                                <th>Extra price (₹)</th>
                                <th>Stock</th>
                                <th className="text-center">Active</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {variants.map((v, index) => (
                                <tr key={v._id || `new-${index}`}>
                                  <td>
                                    <Input
                                      bsSize="sm"
                                      value={v.sku}
                                      placeholder="auto"
                                      onChange={(e) => onVariantChange(index, "sku", e.target.value)}
                                    />
                                  </td>
                                  <td>
                                    <Input
                                      bsSize="sm"
                                      value={v.size}
                                      placeholder="UK 9 / L"
                                      onChange={(e) => onVariantChange(index, "size", e.target.value)}
                                    />
                                  </td>
                                  <td>
                                    <Input
                                      bsSize="sm"
                                      value={v.colour}
                                      placeholder="Black"
                                      onChange={(e) =>
                                        onVariantChange(index, "colour", e.target.value)
                                      }
                                    />
                                  </td>
                                  <td>
                                    <Input
                                      bsSize="sm"
                                      type="number"
                                      step="0.01"
                                      value={v.additionalPrice}
                                      onChange={(e) =>
                                        onVariantChange(index, "additionalPrice", e.target.value)
                                      }
                                    />
                                  </td>
                                  <td>
                                    <Input
                                      bsSize="sm"
                                      type="number"
                                      min={0}
                                      disabled={Boolean(v._id)}
                                      title={
                                        v._id
                                          ? "Change existing stock from the Inventory page so it keeps a reason"
                                          : "Opening stock"
                                      }
                                      value={v.stockQuantity}
                                      onChange={(e) =>
                                        onVariantChange(index, "stockQuantity", e.target.value)
                                      }
                                    />
                                  </td>
                                  <td className="text-center">
                                    <Input
                                      type="checkbox"
                                      checked={v.active}
                                      onChange={(e) =>
                                        onVariantChange(index, "active", e.target.checked)
                                      }
                                    />
                                  </td>
                                  <td className="text-end">
                                    <Button
                                      size="sm"
                                      color="soft-danger"
                                      type="button"
                                      onClick={() => removeVariant(index)}
                                    >
                                      <i className="ri-delete-bin-line" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <Button size="sm" color="light" type="button" onClick={addVariant}>
                            <i className="ri-add-line me-1" />
                            Add variant
                          </Button>
                          <span className="text-muted small">
                            Total stock across variants: <strong>{variantStockTotal}</strong>
                          </span>
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Media</h5>
                    <div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="d-none"
                        onChange={onUpload}
                      />
                      <Button
                        size="sm"
                        color="light"
                        type="button"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                      >
                        {uploading ? "Uploading…" : "Upload image"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {images.length === 0 ? (
                      <p className="text-muted mb-0">
                        No images yet. The shop falls back to a lettered placeholder.
                      </p>
                    ) : (
                      <Row className="g-3">
                        {images.map((img, index) => (
                          <Col key={img.url} xs={6} md={3}>
                            <div
                              className="border rounded p-2 h-100"
                              style={{
                                borderColor: img.isPrimary ? "var(--vz-success)" : undefined,
                              }}
                            >
                              <img
                                src={imageSrc(img.url)}
                                alt={img.altText}
                                className="w-100 rounded mb-2"
                                style={{ height: 110, objectFit: "cover" }}
                              />
                              <div className="d-flex flex-wrap gap-1">
                                <Button
                                  size="sm"
                                  type="button"
                                  color={img.isPrimary ? "success" : "light"}
                                  onClick={() => setPrimaryImage(index)}
                                >
                                  {img.isPrimary ? "Primary" : "Make primary"}
                                </Button>
                                <Button
                                  size="sm"
                                  type="button"
                                  color="light"
                                  disabled={index === 0}
                                  onClick={() => moveImage(index, -1)}
                                >
                                  <i className="ri-arrow-left-line" />
                                </Button>
                                <Button
                                  size="sm"
                                  type="button"
                                  color="light"
                                  disabled={index === images.length - 1}
                                  onClick={() => moveImage(index, 1)}
                                >
                                  <i className="ri-arrow-right-line" />
                                </Button>
                                <Button
                                  size="sm"
                                  type="button"
                                  color="soft-danger"
                                  onClick={() => removeImage(index)}
                                >
                                  <i className="ri-delete-bin-line" />
                                </Button>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </CardBody>
                </Card>
              </Col>

              <Col xl={4}>
                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Inventory</h5>
                  </CardHeader>
                  <CardBody>
                    <FormGroup switch className="mb-3">
                      <Input
                        type="switch"
                        id="track-inventory"
                        name="trackInventory"
                        checked={form.trackInventory}
                        onChange={onFormChange}
                      />
                      <Label check for="track-inventory">
                        Track inventory
                      </Label>
                    </FormGroup>
                    {isNew && !form.hasVariants && (
                      <FormGroup>
                        <Label>Opening stock</Label>
                        <Input
                          type="number"
                          min={0}
                          name="stockQuantity"
                          value={form.stockQuantity}
                          onChange={onFormChange}
                        />
                      </FormGroup>
                    )}
                    {!isNew && (
                      <p className="text-muted small">
                        Stock moves on the{" "}
                        <Link to="/ecommerce/inventory">Inventory</Link> page so every change keeps
                        a reason and a ledger entry.
                      </p>
                    )}
                    <FormGroup>
                      <Label>Low stock threshold</Label>
                      <Input
                        type="number"
                        min={0}
                        name="lowStockThreshold"
                        value={form.lowStockThreshold}
                        onChange={onFormChange}
                      />
                    </FormGroup>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Fulfilment</h5>
                  </CardHeader>
                  <CardBody>
                    <FormGroup check className="mb-2">
                      <Input
                        type="checkbox"
                        id="ff-pickup"
                        name="pickup"
                        checked={form.pickup}
                        onChange={onFormChange}
                      />
                      <Label check for="ff-pickup">
                        Available for club pickup
                      </Label>
                    </FormGroup>
                    <FormGroup check>
                      <Input
                        type="checkbox"
                        id="ff-delivery"
                        name="delivery"
                        checked={form.delivery}
                        onChange={onFormChange}
                      />
                      <Label check for="ff-delivery">
                        Available for delivery
                      </Label>
                    </FormGroup>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h5 className="mb-0">Visibility</h5>
                  </CardHeader>
                  <CardBody>
                    <FormGroup switch className="mb-2">
                      <Input
                        type="switch"
                        id="vis-active"
                        name="active"
                        checked={form.active}
                        onChange={onFormChange}
                      />
                      <Label check for="vis-active">
                        Active in the shop
                      </Label>
                    </FormGroup>
                    <FormGroup switch>
                      <Input
                        type="switch"
                        id="vis-featured"
                        name="featured"
                        checked={form.featured}
                        onChange={onFormChange}
                      />
                      <Label check for="vis-featured">
                        Featured
                      </Label>
                    </FormGroup>
                  </CardBody>
                </Card>

                <div className="d-flex gap-2 mb-4">
                  <Button type="submit" color="success" disabled={saving}>
                    {saving ? "Saving…" : isNew ? "Create product" : "Save changes"}
                  </Button>
                  <Button type="button" color="light" tag={Link} to="/ecommerce/products">
                    Cancel
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </Container>
      </div>
    </Can>
  );
};

export default ProductForm;

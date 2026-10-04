import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  FormGroup,
  Input,
  Label,
  Row,
  Table,
} from "reactstrap";
import { toast } from "react-toastify";
import { apiErrorMessage } from "../../utils/apiErrorMessage";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import { Can } from "../../Components/Common/Can";
import api from "../../api";

function formatPaise(paise) {
  if (paise == null || Number.isNaN(Number(paise))) return "—";
  return `₹${(Number(paise) / 100).toLocaleString("en-IN")}`;
}

const PosMenu = () => {
  document.title = "Café menus | Arambh Sports Arena";
  const [searchParams, setSearchParams] = useSearchParams();
  const [cafes, setCafes] = useState([]);
  const [cafeId, setCafeId] = useState(searchParams.get("cafe") || "");
  const [items, setItems] = useState([]);
  const [cafe, setCafe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const loadCafes = useCallback(async () => {
    const res = await api.get("/api/admin/pos/cafes");
    const list = Array.isArray(res?.data?.data) ? res.data.data : [];
    setCafes(list);
    if (!cafeId && list.length) {
      setCafeId(list[0]._id);
      setSearchParams({ cafe: list[0]._id });
    }
  }, [cafeId, setSearchParams]);

  const loadMenu = useCallback(async () => {
    if (!cafeId) {
      setItems([]);
      setCafe(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/admin/pos/cafes/${cafeId}/menu`, {
        params: { admin: 1 },
      });
      const data = res?.data?.data || {};
      setCafe(data.cafe || null);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError({
        message: apiErrorMessage(err, "Failed to load menu"),
      });
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    loadCafes().catch((err) =>
      setError({ message: apiErrorMessage(err, "Failed to load cafés") }),
    );
  }, [loadCafes]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const onCafeChange = (id) => {
    setCafeId(id);
    setSearchParams(id ? { cafe: id } : {});
  };

  const patchItem = async (productId, patch) => {
    const key = `${productId}:${Object.keys(patch).join(",")}`;
    setBusyKey(key);
    try {
      await api.put(`/api/admin/pos/cafes/${cafeId}/menu/${productId}`, patch);
      setItems((prev) =>
        prev.map((it) => {
          if (it.productId !== productId) return it;
          const next = { ...it, ...patch };
          if (patch.customPricePaise !== undefined) {
            next.pricePaise =
              patch.customPricePaise != null
                ? patch.customPricePaise
                : it.basePricePaise;
          }
          return next;
        }),
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, "Update failed"));
      await loadMenu();
    } finally {
      setBusyKey("");
    }
  };

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.categoryName || "").toLowerCase().includes(q),
    );
  }, [items, filter]);

  const onMenuCount = items.filter((i) => i.onMenu).length;

  return (
    <Can perm="product.edit">
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Café Menus" pageTitle="POS" />
          <Row className="mb-3 g-2 align-items-end">
            <Col md={4}>
              <FormGroup className="mb-0">
                <Label>Café</Label>
                <Input
                  type="select"
                  value={cafeId}
                  onChange={(e) => onCafeChange(e.target.value)}
                >
                  {!cafes.length ? <option value="">No cafés</option> : null}
                  {cafes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup className="mb-0">
                <Label>Search</Label>
                <Input
                  placeholder="Item or category…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </FormGroup>
            </Col>
            <Col md={4} className="d-flex gap-2 justify-content-md-end">
              <Button tag={Link} to="/pos/cafes" color="light" size="sm">
                Cafés
              </Button>
              <Button tag={Link} to="/pos/items" color="light" size="sm">
                Menu items
              </Button>
              <Button tag={Link} to="/pos" color="success" size="sm">
                Open POS
              </Button>
            </Col>
          </Row>

          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">{cafe?.name || "Select a café"}</h5>
                <small className="text-muted">
                  Toggle which master items appear on this café&apos;s POS · {onMenuCount} on
                  menu
                </small>
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <Skeleton rows={8} />
              ) : error ? (
                <ErrorState message={error.message} onRetry={loadMenu} />
              ) : !cafeId ? (
                <EmptyState
                  title="Create a café first"
                  description="Setup → Cafés"
                />
              ) : !visible.length ? (
                <EmptyState title="No products" description="Seed the catalog or clear search." />
              ) : (
                <Table responsive hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>On menu</th>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Base</th>
                      <th>Café price (₹)</th>
                      <th>Sold out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((it) => {
                      const rupeeVal =
                        it.customPricePaise != null
                          ? String(it.customPricePaise / 100)
                          : "";
                      return (
                        <tr
                          key={it.productId}
                          className={it.onMenu ? "" : "table-secondary"}
                        >
                          <td>
                            <Input
                              type="checkbox"
                              checked={it.onMenu}
                              disabled={Boolean(busyKey)}
                              onChange={(e) =>
                                patchItem(it.productId, { onMenu: e.target.checked })
                              }
                            />
                          </td>
                          <td className="fw-semibold">{it.name}</td>
                          <td>{it.categoryName}</td>
                          <td>{formatPaise(it.basePricePaise)}</td>
                          <td style={{ maxWidth: 110 }}>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              placeholder="Base"
                              disabled={!it.onMenu || Boolean(busyKey)}
                              value={rupeeVal}
                              onChange={(e) => {
                                const v = e.target.value;
                                setItems((prev) =>
                                  prev.map((row) =>
                                    row.productId === it.productId
                                      ? {
                                          ...row,
                                          _priceDraft: v,
                                          customPricePaise:
                                            v === ""
                                              ? null
                                              : Math.round(Number(v) * 100),
                                        }
                                      : row,
                                  ),
                                );
                              }}
                              onBlur={(e) => {
                                const v = e.target.value;
                                const paise =
                                  v === "" || Number.isNaN(Number(v))
                                    ? null
                                    : Math.round(Number(v) * 100);
                                patchItem(it.productId, { customPricePaise: paise });
                              }}
                            />
                          </td>
                          <td>
                            <Input
                              type="checkbox"
                              checked={it.isSoldOut}
                              disabled={!it.onMenu || Boolean(busyKey)}
                              onChange={(e) =>
                                patchItem(it.productId, { isSoldOut: e.target.checked })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Container>
      </div>
    </Can>
  );
};

export default PosMenu;

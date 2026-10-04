import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Col, Input, Row, Spinner } from "reactstrap";
import { toast } from "react-toastify";
import { Can } from "../../Components/Common/Can";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import api from "../../api";

const STORAGE_CAFE = "arambh_pos_cafe_id";

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

function newClientOrderId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const ORDER_TYPES = [
  { id: "counter", label: "Counter" },
  { id: "dine-in", label: "Dine-in" },
  { id: "takeaway", label: "Takeaway" },
];

const PosTerminal = () => {
  document.title = "POS | Arambh Sports Arena";
  const [cafes, setCafes] = useState([]);
  const [cafeId, setCafeId] = useState(() => localStorage.getItem(STORAGE_CAFE) || "");
  const [cafe, setCafe] = useState(null);
  const [catalog, setCatalog] = useState({ categories: [], products: [] });
  const [activeCat, setActiveCat] = useState("all");
  const [cart, setCart] = useState([]);
  const [loadingCafes, setLoadingCafes] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [clientOrderId, setClientOrderId] = useState(newClientOrderId);
  const [lastPaid, setLastPaid] = useState(null);
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState("counter");
  const [guestLabel, setGuestLabel] = useState("");
  const [note, setNote] = useState("");
  const [todayOrders, setTodayOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);

  const loadCafes = useCallback(async () => {
    setLoadingCafes(true);
    setError(null);
    try {
      const res = await api.get("/api/admin/pos/cafes", { params: { activeOnly: 1 } });
      const list = (Array.isArray(res?.data?.data) ? res.data.data : []).filter(
        (c) => c.isAcceptingOrders !== false,
      );
      setCafes(list);
      if (cafeId && !list.some((c) => c._id === cafeId)) {
        setCafeId("");
        localStorage.removeItem(STORAGE_CAFE);
      }
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load cafés",
      });
    } finally {
      setLoadingCafes(false);
    }
  }, [cafeId]);

  const loadToday = useCallback(async (id) => {
    if (!id) {
      setTodayOrders([]);
      return;
    }
    try {
      const res = await api.get("/api/admin/pos/orders/today", { params: { cafeId: id } });
      setTodayOrders(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch {
      /* non-blocking */
    }
  }, []);

  const loadMenu = useCallback(async () => {
    if (!cafeId) {
      setCatalog({ categories: [], products: [] });
      setCafe(null);
      return;
    }
    setLoadingMenu(true);
    setError(null);
    try {
      const res = await api.get(`/api/admin/pos/cafes/${cafeId}/menu`);
      const data = res?.data?.data || {};
      setCafe(data.cafe || null);
      setCatalog({
        categories: Array.isArray(data.categories) ? data.categories : [],
        products: Array.isArray(data.products) ? data.products : [],
      });
      setActiveCat("all");
      setCart([]);
      setClientOrderId(newClientOrderId());
      setNote("");
      setGuestLabel("");
      await loadToday(cafeId);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load menu",
      });
    } finally {
      setLoadingMenu(false);
    }
  }, [cafeId, loadToday]);

  useEffect(() => {
    loadCafes();
  }, [loadCafes]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const selectCafe = (id) => {
    setCafeId(id);
    localStorage.setItem(STORAGE_CAFE, id);
  };

  const products = useMemo(() => {
    let list = catalog.products;
    if (activeCat !== "all") {
      list = list.filter((p) => String(p.categoryId) === String(activeCat));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [catalog.products, activeCat, search]);

  const totalPaise = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPaise * line.qty, 0),
    [cart],
  );

  const itemCount = useMemo(() => cart.reduce((n, l) => n + l.qty, 0), [cart]);

  const todayTotalPaise = useMemo(
    () => todayOrders.reduce((s, o) => s + (Number(o.totalPaise) || 0), 0),
    [todayOrders],
  );

  const addProduct = (p) => {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.productId === String(p._id));
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: Math.min(99, next[i].qty + 1) };
        return next;
      }
      return [
        ...prev,
        {
          productId: String(p._id),
          name: p.name,
          unitPaise: p.pricePaise,
          imageUrl: p.imageUrl || "",
          qty: 1,
        },
      ];
    });
  };

  const changeQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, qty: Math.min(99, Math.max(0, l.qty + delta)) }
            : l,
        )
        .filter((l) => l.qty > 0),
    );
  };

  const clearTicket = () => {
    setCart([]);
    setNote("");
    setGuestLabel("");
    setClientOrderId(newClientOrderId());
  };

  const pay = async (method) => {
    if (!cart.length || !cafeId) return;
    setPaying(true);
    try {
      const res = await api.post("/api/admin/pos/orders/pay", {
        cafeId,
        clientOrderId,
        paymentMethod: method,
        orderType,
        note: note.trim() || undefined,
        guestLabel: guestLabel.trim() || undefined,
        lines: cart.map((l) => ({ productId: l.productId, qty: l.qty })),
      });
      const order = res?.data?.data;
      setLastPaid(order);
      clearTicket();
      toast.success(`${order?.number || "Paid"} · ${formatPaise(order?.totalPaise)}`);
      await loadToday(cafeId);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  if (!cafeId) {
    return (
      <Can perm="pos.create">
        <div
          className="d-flex flex-column align-items-center justify-content-center px-3"
          style={{
            minHeight: "100vh",
            background: "linear-gradient(160deg,#0c3d28 0%,#1a5c3a 45%,#0f2419 100%)",
            color: "#e8f5ee",
          }}
        >
          <div className="text-center mb-4">
            <div className="display-6 fw-bold">Arambh POS</div>
            <p className="opacity-75 mb-0">Select a café or bar counter</p>
          </div>
          {loadingCafes ? (
            <Spinner color="light" />
          ) : error ? (
            <ErrorState message={error.message} onRetry={loadCafes} />
          ) : !cafes.length ? (
            <EmptyState
              title="No active cafés"
              description="Setup → Cafés — create a café and put items on its menu"
            />
          ) : (
            <div
              className="d-flex flex-wrap justify-content-center gap-3"
              style={{ maxWidth: 720 }}
            >
              {cafes.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  className="btn btn-light text-start shadow-sm"
                  style={{
                    width: 220,
                    minHeight: 110,
                    borderRadius: 12,
                    border: "none",
                  }}
                  onClick={() => selectCafe(c._id)}
                >
                  <div className="fw-bold text-success">{c.name}</div>
                  <div className="small text-muted">{c.code}</div>
                  <div className="small mt-1">{c.description || "Tap to open"}</div>
                </button>
              ))}
            </div>
          )}
          <Button tag={Link} to="/dashboard" color="link" className="text-white mt-4">
            ← Back to admin
          </Button>
        </div>
      </Can>
    );
  }

  return (
    <Can perm="pos.create">
      <div
        className="d-flex flex-column"
        style={{ minHeight: "100vh", background: "#0f2419", color: "#e8f5ee" }}
      >
        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom border-success border-opacity-25 flex-wrap gap-2">
          <div>
            <strong>{cafe?.name || "POS"}</strong>
            <Badge color="success" className="ms-2">
              {cafe?.code}
            </Badge>
            <span className="small opacity-75 ms-2">
              Today {todayOrders.length} · {formatPaise(todayTotalPaise)}
            </span>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Button
              color="light"
              size="sm"
              outline
              onClick={() => setShowOrders((v) => !v)}
            >
              {showOrders ? "Hide orders" : "Today’s orders"}
            </Button>
            <Button
              color="light"
              size="sm"
              outline
              onClick={() => {
                setCafeId("");
                localStorage.removeItem(STORAGE_CAFE);
              }}
            >
              Switch café
            </Button>
            <Button tag={Link} to="/pos/items" color="light" size="sm" outline>
              Items
            </Button>
            <Button tag={Link} to="/dashboard" color="light" size="sm" outline>
              Exit
            </Button>
          </div>
        </div>

        {showOrders ? (
          <div
            className="px-3 py-2 border-bottom border-success border-opacity-25"
            style={{ background: "#132a1f", maxHeight: 200, overflowY: "auto" }}
          >
            {!todayOrders.length ? (
              <div className="small opacity-50">No paid orders today at this café</div>
            ) : (
              <div className="d-flex flex-column gap-1">
                {todayOrders.map((o) => (
                  <div
                    key={o._id}
                    className="d-flex justify-content-between small flex-wrap gap-1"
                  >
                    <span>
                      <Badge color="success" className="me-1">
                        {o.number}
                      </Badge>
                      {o.orderType || "counter"}
                      {o.guestLabel ? ` · ${o.guestLabel}` : ""}
                      {" · "}
                      {o.paymentMethod}
                      {o.note ? ` · ${o.note}` : ""}
                    </span>
                    <strong>{formatPaise(o.totalPaise)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {loadingMenu ? (
          <div className="m-auto py-5">
            <Spinner color="light" />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error.message} onRetry={loadMenu} />
          </div>
        ) : !catalog.products.length ? (
          <div className="p-4">
            <EmptyState
              title="No items on this café menu"
              description="Setup → Café menus — turn On menu for products."
            />
          </div>
        ) : (
          <Row className="g-0 flex-grow-1">
            <Col
              xs={12}
              md={2}
              className="p-2 border-end border-success border-opacity-25"
              style={{ background: "#132a1f", minHeight: 320 }}
            >
              <div className="small text-uppercase opacity-50 px-2 mb-2">Categories</div>
              <button
                type="button"
                className={`btn w-100 text-start mb-1 ${
                  activeCat === "all" ? "btn-success" : "btn-outline-light"
                }`}
                onClick={() => setActiveCat("all")}
              >
                All
              </button>
              {catalog.categories.map((c) => (
                <button
                  key={c._id || c.name}
                  type="button"
                  className={`btn w-100 text-start mb-1 ${
                    activeCat === String(c._id) ? "btn-success" : "btn-outline-light"
                  }`}
                  onClick={() => setActiveCat(String(c._id))}
                >
                  {c.name}
                </button>
              ))}
            </Col>
            <Col xs={12} md={6} lg={7} className="p-3">
              <Input
                className="mb-3"
                placeholder="Search items…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: "#1a3326", border: "1px solid #2d5a40", color: "#fff" }}
              />
              <div className="d-flex flex-wrap gap-2">
                {products.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    className="btn text-start p-0 overflow-hidden"
                    style={{
                      width: 148,
                      borderRadius: 10,
                      background: "#1a3326",
                      border: "1px solid #2d5a40",
                      color: "#e8f5ee",
                    }}
                    onClick={() => addProduct(p)}
                  >
                    <div
                      style={{
                        height: 88,
                        background: "#0f2419",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {p.imageUrl ? (
                        <img
                          src={mediaUrl(p.imageUrl)}
                          alt=""
                          style={{ width: "100%", height: 88, objectFit: "cover" }}
                        />
                      ) : (
                        <i className="ri-cup-line opacity-50" style={{ fontSize: 28 }} />
                      )}
                    </div>
                    <div className="p-2">
                      <div className="fw-semibold small text-truncate">{p.name}</div>
                      <div className="text-success fw-bold">{formatPaise(p.pricePaise)}</div>
                      {p.isCustomPrice ? (
                        <div className="small opacity-50">café price</div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </Col>
            <Col
              xs={12}
              md={4}
              lg={3}
              className="p-3 border-start border-success border-opacity-25 d-flex flex-column"
              style={{ background: "#132a1f" }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="text-uppercase opacity-75 mb-0">Ticket</h6>
                {cart.length ? (
                  <Button color="link" size="sm" className="text-white-50 p-0" onClick={clearTicket}>
                    Clear
                  </Button>
                ) : null}
              </div>

              <div className="btn-group w-100 mb-2">
                {ORDER_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`btn btn-sm ${
                      orderType === t.id ? "btn-success" : "btn-outline-light"
                    }`}
                    onClick={() => setOrderType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <Input
                className="mb-2"
                placeholder="Guest / table (optional)"
                value={guestLabel}
                onChange={(e) => setGuestLabel(e.target.value)}
                style={{ background: "#1a3326", border: "1px solid #2d5a40", color: "#fff" }}
              />
              <Input
                type="textarea"
                rows={2}
                className="mb-2"
                placeholder="Order note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ background: "#1a3326", border: "1px solid #2d5a40", color: "#fff" }}
              />

              {!cart.length ? (
                <p className="opacity-50 small flex-grow-1">Tap items to add</p>
              ) : (
                <ul className="list-unstyled mb-3 flex-grow-1" style={{ overflowY: "auto" }}>
                  {cart.map((l) => (
                    <li
                      key={l.productId}
                      className="d-flex justify-content-between align-items-center mb-2 gap-2"
                    >
                      <div className="d-flex align-items-center gap-2 min-w-0">
                        {l.imageUrl ? (
                          <img
                            src={mediaUrl(l.imageUrl)}
                            alt=""
                            width={36}
                            height={36}
                            style={{ objectFit: "cover", borderRadius: 6 }}
                          />
                        ) : null}
                        <div className="min-w-0">
                          <div className="small fw-semibold text-truncate">{l.name}</div>
                          <div className="small opacity-75">
                            {formatPaise(l.unitPaise)} × {l.qty}
                          </div>
                        </div>
                      </div>
                      <div className="btn-group btn-group-sm flex-shrink-0">
                        <Button color="secondary" onClick={() => changeQty(l.productId, -1)}>
                          −
                        </Button>
                        <Button color="secondary" onClick={() => changeQty(l.productId, 1)}>
                          +
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="d-flex justify-content-between small opacity-75 mb-1">
                <span>{itemCount} items</span>
                <span>{orderType}</span>
              </div>
              <div className="d-flex justify-content-between fs-5 mb-3">
                <span>Total</span>
                <strong>{formatPaise(totalPaise)}</strong>
              </div>
              <div className="d-grid gap-2">
                <Button
                  color="success"
                  size="lg"
                  disabled={!cart.length || paying}
                  onClick={() => pay("cash")}
                >
                  {paying ? "Paying…" : "Pay cash"}
                </Button>
                <Button
                  color="light"
                  outline
                  disabled={!cart.length || paying}
                  onClick={() => pay("upi")}
                >
                  Pay UPI
                </Button>
                <Button
                  color="light"
                  outline
                  disabled={!cart.length || paying}
                  onClick={() => pay("card")}
                >
                  Pay card
                </Button>
              </div>
              {lastPaid ? (
                <div className="mt-3 small opacity-75">
                  Last: <Badge color="success">{lastPaid.number}</Badge>{" "}
                  {formatPaise(lastPaid.totalPaise)}
                  {lastPaid.guestLabel ? ` · ${lastPaid.guestLabel}` : ""}
                </div>
              ) : null}
            </Col>
          </Row>
        )}
      </div>
    </Can>
  );
};

export default PosTerminal;

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import BreadCrumb from "../../Components/Common/BreadCrumb";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import StatusChip from "../../Components/Common/StatusChip";
import Money from "../../Components/Common/Money";
import {
  cancelBooking,
  checkInBooking,
  getBookingCalendar,
  listBookings,
  listCourts,
} from "../../api/arambhBooking.api";

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  // Approximate IST offset for picker default (+5:30)
  const ist = new Date(d.getTime() + (5.5 * 60 - d.getTimezoneOffset()) * 60000);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

const TYPE_COLOUR = {
  member: "primary",
  walk_in: "secondary",
  trial: "info",
  admin: "dark",
  coaching: "warning",
};

const Bookings = () => {
  document.title = "Bookings | Arambh Sports Arena";
  const [date, setDate] = useState(todayLocal());
  const [view, setView] = useState("calendar");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [calendar, setCalendar] = useState(null);
  const [rows, setRows] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === "calendar") {
        const [cal, c] = await Promise.all([
          getBookingCalendar({ date }),
          listCourts({ pageSize: 50, status: "active" }),
        ]);
        setCalendar(cal?.data?.data || null);
        setCourts(Array.isArray(c?.data?.data) ? c.data.data : []);
      } else {
        const res = await listBookings({
          localDate: date,
          pageSize: 100,
          sort: "start",
          q: q.trim() || undefined,
          status: status || undefined,
        });
        setRows(Array.isArray(res?.data?.data) ? res.data.data : []);
      }
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load bookings",
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setLoading(false);
    }
  }, [date, view, q, status]);

  const runAction = async (id, action) => {
    setBusyId(id);
    try {
      if (action === "checkin") await checkInBooking(id);
      if (action === "cancel") await cancelBooking(id, { reason: "Cancelled from bookings list" });
      await load();
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Action failed",
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const hours = useMemo(() => {
    const out = [];
    for (let h = 6; h <= 22; h += 1) {
      out.push(`${String(h).padStart(2, "0")}:00`);
      if (h < 22) out.push(`${String(h).padStart(2, "0")}:30`);
    }
    return out;
  }, []);

  const bookingsByCourt = useMemo(() => {
    const map = {};
    for (const b of calendar?.bookings || []) {
      const id = String(b.courtId?._id || b.courtId);
      if (!map[id]) map[id] = [];
      map[id].push(b);
    }
    return map;
  }, [calendar]);

  const courtCols = calendar?.courts?.length ? calendar.courts : courts;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Bookings" pageTitle="Front Desk" />
        <Row className="mb-3 g-2 align-items-end">
          <Col md={2}>
            <label className="form-label">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Col>
          <Col md={3}>
            <label className="form-label">Search</label>
            <Input
              placeholder="Booking no"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setView("list");
              }}
            />
          </Col>
          <Col md={2}>
            <label className="form-label">Status</label>
            <Input
              type="select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setView("list");
              }}
            >
              <option value="">All</option>
              <option value="held">held</option>
              <option value="confirmed">confirmed</option>
              <option value="checked_in">checked_in</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
              <option value="no_show">no_show</option>
            </Input>
          </Col>
          <Col md={3}>
            <Button
              color={view === "calendar" ? "success" : "light"}
              className="me-2"
              onClick={() => setView("calendar")}
            >
              Calendar
            </Button>
            <Button
              color={view === "list" ? "success" : "light"}
              onClick={() => setView("list")}
            >
              List
            </Button>
          </Col>
          <Col md={2} className="text-end">
            <Button color="soft-secondary" onClick={load}>
              Refresh
            </Button>
          </Col>
        </Row>

        <Card>
          <CardHeader>
            <h5 className="mb-0">
              {view === "calendar" ? "Court calendar" : "Bookings list"} · {date}
            </h5>
          </CardHeader>
          <CardBody>
            {loading && <Skeleton rows={8} />}
            {!loading && error && <ErrorState {...error} onRetry={load} />}
            {!loading && !error && view === "list" && (
              <>
                {!rows.length ? (
                  <EmptyState title="No bookings" description="Nothing on this date yet." />
                ) : (
                  <Table responsive hover className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Court</th>
                        <th>Start</th>
                        <th>Member / guest</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Price</th>
                        <th style={{ width: 160 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r._id}>
                          <td>{r.bookingNo}</td>
                          <td>{r.courtId?.name || "—"}</td>
                          <td>{new Date(r.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                          <td>
                            {r.bookedByMemberId
                              ? `${r.bookedByMemberId.firstName} ${r.bookedByMemberId.lastName || ""}`
                              : r.customer?.name || "—"}
                          </td>
                          <td>
                            <Badge color={TYPE_COLOUR[r.type] || "light"}>{r.type}</Badge>
                          </td>
                          <td>
                            <StatusChip status={r.status} />
                          </td>
                          <td>
                            <Money paise={r.price?.totalPaise ?? 0} />
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                            {["held", "confirmed"].includes(r.status) && (
                              <Button
                                size="sm"
                                color="success"
                                className="me-1"
                                disabled={busyId === r._id}
                                onClick={() => runAction(r._id, "checkin")}
                              >
                                Check-in
                              </Button>
                            )}
                            {!["cancelled", "completed"].includes(r.status) && (
                              <Button
                                size="sm"
                                color="danger"
                                outline
                                disabled={busyId === r._id}
                                onClick={() => runAction(r._id, "cancel")}
                              >
                                Cancel
                              </Button>
                            )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </>
            )}
            {!loading && !error && view === "calendar" && (
              <>
                {!courtCols.length ? (
                  <EmptyState title="No courts" description="Seed sports/courts first." />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(${courtCols.length}, minmax(140px, 1fr))`,
                        gap: 2,
                        minWidth: 80 + courtCols.length * 140,
                      }}
                    >
                      <div className="fw-semibold p-2 bg-light">Time</div>
                      {courtCols.map((c) => (
                        <div key={c._id} className="fw-semibold p-2 bg-light text-center">
                          {c.name || c.code}
                        </div>
                      ))}
                      {hours.map((hhmm) => (
                        <React.Fragment key={hhmm}>
                          <div className="p-1 small text-muted border-top">{hhmm}</div>
                          {courtCols.map((c) => {
                            const list = bookingsByCourt[String(c._id)] || [];
                            const hit = list.find((b) => {
                              const t = new Date(b.start);
                              const pad = (n) => String(n).padStart(2, "0");
                              // Show card on start row only (session spans visually via label)
                              const local = t.toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                                timeZone: "Asia/Kolkata",
                              });
                              return local === hhmm;
                            });
                            return (
                              <div
                                key={`${c._id}-${hhmm}`}
                                className="border-top p-1"
                                style={{ minHeight: 28, background: hit ? "rgba(62,180,116,0.16)" : undefined }}
                              >
                                {hit && (
                                  <div className="small">
                                    <Badge
                                      color={hit.status === "held" ? "warning" : TYPE_COLOUR[hit.type] || "primary"}
                                      className="me-1"
                                    >
                                      {hit.status === "held" ? "HOLD" : hit.type}
                                    </Badge>
                                    {hit.bookedByMemberId?.firstName || hit.customer?.name || hit.bookingNo}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};

export default Bookings;

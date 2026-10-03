import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Col,
  Form,
  FormGroup,
  Input,
  Label,
  Offcanvas,
  OffcanvasBody,
  OffcanvasHeader,
  Row,
  Spinner,
} from "reactstrap";
import EmptyState from "../../Components/Common/EmptyState";
import ErrorState from "../../Components/Common/ErrorState";
import Skeleton from "../../Components/Common/Skeleton";
import Money from "../../Components/Common/Money";
import StatusChip from "../../Components/Common/StatusChip";
import { Can } from "../../Components/Common/Can";
import { searchMembers } from "../../api/arambhMembership.api";
import {
  checkInBooking,
  createBooking,
  getBookingCalendar,
  listBookings,
  listCourts,
} from "../../api/arambhBooking.api";

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ist = new Date(d.getTime() + (5.5 * 60 - d.getTimezoneOffset()) * 60000);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

function nowLabel() {
  return new Date().toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/** IST wall-clock → UTC ISO for booking create */
function istSlotToUtcIso(localDate, hhmm) {
  const [y, m, d] = String(localDate || "").split("-").map(Number);
  const [hh, mm] = String(hhmm || "").split(":").map(Number);
  if (![y, m, d, hh, mm].every((n) => Number.isFinite(n))) return null;
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - 5.5 * 60 * 60 * 1000;
  const iso = new Date(utcMs).toISOString();
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function slotLabel(start) {
  const t = new Date(start);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

/** Map every confirm-booking failure onto a message the form can show. */
export function confirmBookingError(err) {
  if (!err?.response) {
    if (err?.code === "ECONNABORTED") {
      return "The server took too long to confirm this booking. Refresh the board before trying the same slot again.";
    }
    return "Cannot reach the server, so this booking was not confirmed. Check that the API is running and try again.";
  }

  const status = err.response.status;
  if (status === 401) {
    return "Your session expired. Sign in again, then confirm the booking.";
  }

  const data = err.response.data || {};
  const details = data?.error?.details;
  const issues = Array.isArray(details) ? details : null;
  let msg = data.message || "Booking failed";
  if (issues?.length) {
    const text = issues.map((i) => i.message).filter(Boolean).join(". ");
    if (text) msg = text;
  }

  const alts =
    (details && !Array.isArray(details) && details.alternatives) ||
    data?.data?.alternatives ||
    data?.alternatives ||
    [];
  if (Array.isArray(alts) && alts.length) {
    const labels = alts.slice(0, 3).map((a) => {
      const time = a.start ? slotLabel(a.start) : "";
      if (a.courtName && time) return `${a.courtName} ${time}`;
      if (time) return a.sameCourt === false ? time : `same court ${time}`;
      return a.courtName || "another slot";
    });
    msg += `. Try: ${labels.join(", ")}`;
  }
  return msg;
}

const TIER_COLOUR = {
  gold: "warning",
  silver: "secondary",
  junior: "success",
  none: "light",
};

const FrontDesk = () => {
  document.title = "Front Desk | Arambh Sports Arena";
  const searchRef = useRef(null);
  const abortRef = useRef(null);

  const [date, setDate] = useState(todayLocal());
  const [clock, setClock] = useState(nowLabel());
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const [member, setMember] = useState(null);

  const [calendar, setCalendar] = useState(null);
  const [courts, setCourts] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [drawer, setDrawer] = useState(false);
  const [slot, setSlot] = useState(null); // { court, hhmm }
  const [walkName, setWalkName] = useState("");
  const [walkPhone, setWalkPhone] = useState("");
  const [payMode, setPayMode] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cal, c, bookings] = await Promise.all([
        getBookingCalendar({ date }),
        listCourts({ pageSize: 50, status: "active" }),
        listBookings({ localDate: date, pageSize: 50, sort: "start" }),
      ]);
      setCalendar(cal?.data?.data || null);
      setCourts(Array.isArray(c?.data?.data) ? c.data.data : []);
      setTodayBookings(Array.isArray(bookings?.data?.data) ? bookings.data.data : []);
    } catch (err) {
      setError({
        message: err?.response?.data?.message || err?.message || "Failed to load court board",
        requestId: err?.response?.data?.requestId,
      });
    } finally {
      setLoading(false);
    }
  }, [date]);

  const onCheckIn = useCallback(
    async (bookingId) => {
      if (!bookingId) return;
      setBusyId(bookingId);
      try {
        await checkInBooking(bookingId);
        setToast("Checked in");
        await loadBoard();
      } catch (err) {
        setToast(err?.response?.data?.message || err?.message || "Check-in failed");
      } finally {
        setBusyId(null);
      }
    },
    [loadBoard],
  );

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    const t = setInterval(() => setClock(nowLabel()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Debounced member search
  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return undefined;
    }
    const handle = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSearching(true);
      try {
        const res = await searchMembers({ q: query.trim() });
        if (!ctrl.signal.aborted) {
          const list = Array.isArray(res?.data?.data) ? res.data.data : [];
          setHits(list);
          if (list.length === 1) setMember(list[0]);
        }
      } catch {
        if (!ctrl.signal.aborted) setHits([]);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  const hours = useMemo(() => {
    const out = [];
    const now = new Date();
    const istH = Number(
      now.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }),
    );
    const fromH = Math.max(6, istH);
    const toH = Math.min(23, fromH + 4);
    for (let h = fromH; h < toH; h += 1) {
      out.push(`${String(h).padStart(2, "0")}:00`);
      out.push(`${String(h).padStart(2, "0")}:30`);
    }
    return out;
  }, [clock]); // refresh window when clock ticks

  const courtCols = calendar?.courts?.length ? calendar.courts : courts;

  const bookingsByCourt = useMemo(() => {
    const map = {};
    for (const b of calendar?.bookings || []) {
      const id = String(b.courtId?._id || b.courtId);
      if (!map[id]) map[id] = [];
      map[id].push(b);
    }
    return map;
  }, [calendar]);

  const nextUp = useMemo(() => {
    const now = Date.now();
    return [...todayBookings]
      .filter((b) => new Date(b.start).getTime() >= now - 15 * 60_000)
      .filter((b) => !["cancelled", "no_show", "completed"].includes(b.status))
      .slice(0, 8);
  }, [todayBookings]);

  function cellBooking(courtId, hhmm) {
    const list = bookingsByCourt[String(courtId)] || [];
    return list.find((b) => {
      const local = new Date(b.start).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      });
      return local === hhmm;
    });
  }

  function openQuickBook(court, hhmm) {
    setSlot(court && hhmm ? { court, hhmm } : { court: courtCols[0] || null, hhmm: hours[0] || "18:00" });
    setWalkName("");
    setWalkPhone("");
    setPayMode("cash");
    setFormError(null);
    setDrawer(true);
  }

  // Hotkeys: / focus search, F2 walk-in, Esc close
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setDrawer(false);
        setFormError(null);
      }
      if (e.key === "F2") {
        e.preventDefault();
        openQuickBook(null, null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- board-driven defaults
  }, [courtCols, hours]);

  async function submitBooking(e) {
    e?.preventDefault?.();
    if (!slot?.court) {
      setFormError("Pick a court and time on the board.");
      return;
    }
    const isMember = Boolean(member);
    if (!isMember && (!walkName.trim() || !walkPhone.trim())) {
      setFormError("Walk-in needs name and phone.");
      return;
    }
    const startUtc = istSlotToUtcIso(date, slot.hhmm);
    if (!startUtc) {
      setFormError("Pick a valid date and start time.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const body = {
        courtId: String(slot.court._id),
        startUtc,
        type: isMember ? "member" : "walk_in",
        channel: "front_desk",
        paymentMode: payMode,
        isDemo: true,
      };
      if (isMember) {
        body.memberId = String(member._id);
        body.bookedByMemberId = String(member._id);
      } else {
        body.customer = { name: walkName.trim(), phone: walkPhone.trim() };
      }
      body.idempotencyKey = `fd-${slot.court._id}-${date}-${slot.hhmm}-${walkPhone.trim() || member?._id || "guest"}`;
      const res = await createBooking(body);
      const booking = res?.data?.data;
      setToast(
        booking
          ? `Booked ${booking.bookingNo || ""} · ${slot.court.name || slot.court.code} @ ${slot.hhmm}`
          : "Booking created",
      );
      setDrawer(false);
      await loadBoard();
    } catch (err) {
      setFormError(confirmBookingError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const expired =
    member?.status === "expired" ||
    (member?.membershipEndDate && new Date(member.membershipEndDate).getTime() < Date.now());

  return (
    <Can
      anyOf={["booking.view", "booking.create"]}
      fallback={
        <div className="page-content">
          <EmptyState title="No access" description="Need booking.view to use Front Desk." />
        </div>
      }
    >
      <div className="page-content">
        <div
          className="bg-white border rounded shadow-sm p-3 mb-3 mx-2"
          style={{ position: "sticky", top: 78, zIndex: 20 }}
        >
          <div className="d-flex flex-wrap align-items-end gap-3">
          <div className="flex-grow-1 position-relative" style={{ maxWidth: 520, minWidth: 240 }}>
            <label className="form-label mb-1 text-dark" htmlFor="front-desk-search">
              Search member
            </label>
            <div className="position-relative">
            <Input
              id="front-desk-search"
              innerRef={searchRef}
              placeholder="Name, phone, or member code"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              className="bg-white text-dark"
              style={{ background: "#fff", color: "#212529", border: "1px solid #ced4da" }}
            />
            {searching && (
              <Spinner size="sm" className="position-absolute end-0 top-50 translate-middle-y me-2" />
            )}
            </div>
            {query.trim().length >= 2 && !searching && hits.length === 0 && (
              <div
                className="border bg-white shadow-sm position-absolute w-100 mt-1 px-3 py-2 small text-muted"
                style={{ zIndex: 40 }}
              >
                No members match that search.
              </div>
            )}
            {hits.length > 0 && query.trim().length >= 2 && (
              <div
                className="border bg-white shadow-sm position-absolute w-100 mt-1"
                style={{ zIndex: 40, maxHeight: 240, overflowY: "auto" }}
              >
                {hits.map((m) => (
                  <button
                    key={m._id}
                    type="button"
                    className="dropdown-item text-start py-2 px-3 border-0 bg-transparent w-100"
                    onClick={() => {
                      setMember(m);
                      setQuery(`${m.firstName} ${m.lastName || ""}`.trim());
                      setHits([]);
                    }}
                  >
                    <span className="fw-medium">
                      {m.firstName} {m.lastName || ""}
                    </span>
                    <span className="text-muted small ms-2">{m.memberCode}</span>
                    <Badge color={TIER_COLOUR[m.tierKey] || "light"} className={`ms-2${!m.tierKey || m.tierKey === "none" ? " tier-none" : ""}`} pill>
                      {(m.tierKey || "none").toUpperCase()}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ maxWidth: 160 }}
            bsSize="sm"
          />
          <div className="text-muted small ms-auto">{clock}</div>
          <Button color="success" size="sm" outline onClick={loadBoard}>
            Refresh
          </Button>
          </div>
        </div>

        {toast && (
          <div className="alert alert-success py-2 mx-2" role="status">
            {toast}
            <button type="button" className="btn-close float-end" onClick={() => setToast(null)} />
          </div>
        )}

        <Row className="g-3 px-2">
          <Col lg={8}>
            <div className="border rounded p-2 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Court board · {date}</h5>
                <span className="text-muted small">now → +4h · click free cell to book</span>
              </div>
              {loading && <Skeleton rows={8} height={18} />}
              {!loading && error && <ErrorState {...error} onRetry={loadBoard} />}
              {!loading && !error && !courtCols.length && (
                <EmptyState title="No courts" description="Run seed:demo for sports & courts." />
              )}
              {!loading && !error && courtCols.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `64px repeat(${courtCols.length}, minmax(110px, 1fr))`,
                      gap: 2,
                      minWidth: 64 + courtCols.length * 110,
                    }}
                  >
                    <div className="fw-semibold p-1 bg-light small">Time</div>
                    {courtCols.map((c) => (
                      <div key={c._id} className="fw-semibold p-1 bg-light text-center small">
                        {c.code || c.name}
                      </div>
                    ))}
                    {hours.map((hhmm) => (
                      <React.Fragment key={hhmm}>
                        <div className="p-1 small text-muted border-top">{hhmm}</div>
                        {courtCols.map((c) => {
                          const hit = cellBooking(c._id, hhmm);
                          const free = !hit;
                          return (
                            <button
                              key={`${c._id}-${hhmm}`}
                              type="button"
                              disabled={!free}
                              onClick={() => free && openQuickBook(c, hhmm)}
                              className="border-top p-1 text-start"
                              style={{
                                minHeight: 32,
                                background: hit
                                  ? "rgba(13,110,253,0.14)"
                                  : "rgba(25,135,84,0.06)",
                                cursor: free ? "pointer" : "default",
                                border: "none",
                              }}
                            >
                              {hit ? (
                                <span className="small">
                                  <Badge
                                    color={hit.status === "held" ? "warning" : "primary"}
                                    className="me-1"
                                  >
                                    {hit.status === "held" ? "HOLD" : hit.type}
                                  </Badge>
                                  {hit.bookedByMemberId?.firstName ||
                                    hit.customer?.name ||
                                    hit.bookingNo}
                                </span>
                              ) : (
                                <span className="small text-success">free</span>
                              )}
                            </button>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Col>

          <Col lg={4}>
            <div className="border rounded p-3 bg-white h-100">
              {!member ? (
                <>
                  <h6 className="text-muted">Next up</h6>
                  {!nextUp.length ? (
                    <p className="small text-muted mb-0">No arrivals in the next window.</p>
                  ) : (
                    <ul className="list-unstyled mb-0">
                      {nextUp.map((b) => (
                        <li key={b._id} className="mb-2 small border-bottom pb-2">
                          <div className="fw-medium">
                            {new Date(b.start).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Asia/Kolkata",
                            })}{" "}
                            · {b.courtId?.name || b.courtId?.code || "Court"}
                          </div>
                          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            <span>
                              {b.bookedByMemberId
                                ? `${b.bookedByMemberId.firstName} ${b.bookedByMemberId.lastName || ""}`
                                : b.customer?.name || "Guest"}{" "}
                              <StatusChip status={b.status} />
                            </span>
                            {["held", "confirmed"].includes(b.status) && (
                              <Button
                                size="sm"
                                color="success"
                                disabled={busyId === b._id}
                                onClick={() => onCheckIn(b._id)}
                              >
                                Check-in
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h5 className="mb-1">
                        {member.firstName} {member.lastName || ""}
                      </h5>
                      <div className="small text-muted">{member.memberCode}</div>
                    </div>
                    <Button color="link" size="sm" onClick={() => setMember(null)}>
                      Clear
                    </Button>
                  </div>
                  <div className="my-2">
                    <Badge color={TIER_COLOUR[member.tierKey] || "light"} className={!member.tierKey || member.tierKey === "none" ? "tier-none" : undefined} pill>
                      {(member.tierKey || "none").toUpperCase()}
                    </Badge>
                    {expired && (
                      <Badge color="danger" className="ms-1" pill>
                        EXPIRED
                      </Badge>
                    )}
                    {member.membershipEndDate && (
                      <span className={`small ms-2 ${expired ? "text-danger" : ""}`}>
                        ends {String(member.membershipEndDate).slice(0, 10)}
                      </span>
                    )}
                  </div>
                  {expired && (
                    <p className="small text-danger">
                      Membership expired — booking uses walk-in price.
                    </p>
                  )}
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <Button color="primary" size="sm" onClick={() => openQuickBook(null, null)}>
                      Book
                    </Button>
                    <Button color="light" size="sm" disabled title="Phase 9">
                      Sell
                    </Button>
                    <Button color="light" size="sm" disabled title="Phase 9">
                      Bar tab
                    </Button>
                    <Button color="light" size="sm" disabled title="Phase 5 renew">
                      Renew
                    </Button>
                  </div>
                  <h6 className="mt-4 text-muted">Today&apos;s bookings</h6>
                  <ul className="list-unstyled small mb-0">
                    {todayBookings
                      .filter(
                        (b) =>
                          String(b.bookedByMemberId?._id || b.bookedByMemberId) ===
                          String(member._id),
                      )
                      .map((b) => (
                        <li key={b._id} className="mb-2 d-flex align-items-center justify-content-between gap-2">
                          <span>
                            {new Date(b.start).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Asia/Kolkata",
                            })}{" "}
                            · {b.courtId?.name || "—"} · <StatusChip status={b.status} />
                          </span>
                          {["held", "confirmed"].includes(b.status) && (
                            <Button
                              size="sm"
                              color="success"
                              disabled={busyId === b._id}
                              onClick={() => onCheckIn(b._id)}
                            >
                              Check-in
                            </Button>
                          )}
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </div>
          </Col>
        </Row>

        <div className="d-flex flex-wrap gap-2 mt-3 px-2 pb-3">
          <Button color="primary" outline size="sm" onClick={() => openQuickBook(null, null)}>
            F2 Walk-in booking
          </Button>
          <Button color="light" size="sm" disabled title="Phase 5 register drawer">
            F3 New member
          </Button>
          <Button color="light" size="sm" disabled title="Phase 9">
            F4 Counter sale
          </Button>
          <Button color="light" size="sm" disabled title="Phase 11">
            F6 Enquiry
          </Button>
          <span className="text-muted small align-self-center ms-2">
            Hotkeys: <kbd>/</kbd> search · <kbd>F2</kbd> walk-in · <kbd>Esc</kbd> close
          </span>
        </div>

        <Offcanvas isOpen={drawer} toggle={() => setDrawer(false)} direction="end">
          <OffcanvasHeader toggle={() => setDrawer(false)}>
            Quick book
            {slot?.court && (
              <span className="d-block small text-muted fw-normal">
                {slot.court.name || slot.court.code} · {slot.hhmm} · {date}
              </span>
            )}
          </OffcanvasHeader>
          <OffcanvasBody>
            <Form onSubmit={submitBooking}>
              {member ? (
                <p className="mb-3">
                  Member:{" "}
                  <strong>
                    {member.firstName} {member.lastName || ""}
                  </strong>{" "}
                  <Badge color={TIER_COLOUR[member.tierKey] || "light"} className={!member.tierKey || member.tierKey === "none" ? "tier-none" : undefined}>
                    {(member.tierKey || "").toUpperCase()}
                  </Badge>
                </p>
              ) : (
                <>
                  <FormGroup>
                    <Label>Walk-in name</Label>
                    <Input
                      value={walkName}
                      onChange={(e) => setWalkName(e.target.value)}
                      required={!member}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Phone</Label>
                    <Input
                      value={walkPhone}
                      onChange={(e) => setWalkPhone(e.target.value)}
                      required={!member}
                    />
                  </FormGroup>
                </>
              )}
              <FormGroup>
                <Label>Court</Label>
                <Input
                  type="select"
                  value={slot?.court?._id || ""}
                  onChange={(e) => {
                    const c = courtCols.find((x) => String(x._id) === e.target.value);
                    setSlot((s) => ({ ...s, court: c || s?.court }));
                  }}
                >
                  {courtCols.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name || c.code}
                    </option>
                  ))}
                </Input>
              </FormGroup>
              <FormGroup>
                <Label>Start (IST)</Label>
                <Input
                  type="time"
                  step={1800}
                  value={slot?.hhmm || "18:00"}
                  onChange={(e) => setSlot((s) => ({ ...s, hhmm: e.target.value }))}
                />
              </FormGroup>
              <FormGroup>
                <Label>Payment</Label>
                <Input type="select" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="desk">Pay at desk later</option>
                </Input>
              </FormGroup>
              {formError && <div className="alert alert-danger py-2 small">{formError}</div>}
              <Button color="primary" type="submit" disabled={submitting} block>
                {submitting ? <Spinner size="sm" /> : "Confirm booking"}
              </Button>
              {slot?.court?.pricing?.walkInPaise && !member && (
                <p className="small text-muted mt-2 mb-0">
                  Walk-in from{" "}
                  <Money paise={slot.court.pricing.walkInPaise.offPeak || 0} /> (off-peak) /{" "}
                  <Money paise={slot.court.pricing.walkInPaise.peak || 0} /> (peak)
                </p>
              )}
            </Form>
          </OffcanvasBody>
        </Offcanvas>
      </div>
    </Can>
  );
};

export default FrontDesk;

# 13 · Staff, Shifts, Leave, Payroll

Problem statement: *"A front desk handles… staff schedules."* · *"Staff work in shifts."* · *"…employees to pay, leave to approve."*

Scope is deliberately lean (Odoo Employees + Planning + Time Off + a simple payroll), because the PS asks for schedules, shifts, leave approval and paying employees — not a full HRMS.

## 1. Employees
Profile: code, name, contact, department (front desk, bar, kitchen, shop, coaching, maintenance, management, finance), job title, join date, salary (monthly/hourly), leave balances, linked user account (for login/PIN), status. Bank details: store only IFSC + last 4 digits in the DB; full numbers stay with the bank/payroll provider.

## 2. Shifts (scheduling)
- Weekly roster grid: rows = employees (grouped by department), columns = days; drag to create shift blocks; copy last week; publish.
- Overlap validation per employee; warning if department coverage below `settings.minStaff[department]` for opening hours [RE].
- Shift templates: "Bar evening 16:00–23:00".
- Staff see their own shifts (admin "My schedule" page; mobile staff app is out of scope).
- Approved leave greys out the employee on those days and blocks scheduling.

## 3. Attendance
Clock in/out from the POS/front-desk login (`source: pos_login`) or manual entry by manager. Daily attendance list vs scheduled shifts: late, missed, overtime minutes.

## 4. Leave
- Request: type, dates (half-day [RE]), reason → `pending` → manager/HR notified.
- Approve/reject with note → balance deducted on approval; employee notified; audited.
- Calendar view of who's off.

## 5. Payroll (simple, honest)
- Monthly run: for each active employee → base (monthly) or hours × rate (hourly from attendance), + overtime, + allowances, − deductions, − unpaid leave days.
- Draft → review/edit lines → **approve** (`payroll.approve`, finance) → creates payable lines → **mark paid** (bank transfer/cash) → `payments (direction: out)`; expense category `salaries`.
- Payslip PDF per employee.
- Statutory deductions (PF/ESI/TDS/professional tax) are **out of scope**: shown as manual deduction lines with a note "verify with your accountant / payroll provider". [RE] Integrate a payroll provider later.

## 6. API
Employees CRUD; `GET/POST/PATCH/DELETE /api/admin/shifts` (+ `/publish`, `/copy-week`); `POST /api/admin/attendance/clock-in|clock-out`; `GET /api/admin/attendance`; leave: `POST /api/leave` (own), `GET /api/admin/leave`, `POST /api/admin/leave/:id/{approve,reject}`; payroll: `POST /api/admin/payroll-runs`, `PATCH .../:id/lines/:employeeId`, `POST .../:id/{approve,pay}`, `GET .../:id/payslips/:employeeId.pdf`.

## 7. Tests
Overlapping shift rejected; leave approval deducts balance once; payroll totals equal sum of lines; approving payroll requires permission.

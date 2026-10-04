# 0008 · Pro Shop deducts stock at order creation (not reserve/fulfil)

- **Status:** accepted
- **Date:** 2026-10-04

## Context
`docs/10-Shop-Inventory-Orders.md` sketches a reserve → fulfil inventory model: an
order first holds stock, then a second step converts the hold into a sale. That
model earns its keep when picking and dispatch are separate operations run by a
warehouse team over hours or days.

Arambh's Pro Shop is a counter in a sports club. The realistic paths are "collect
at the front desk" and "we drop it to your address in Vadodara". There is no
picking team, no warehouse, and no staff step between the customer paying and the
item leaving the shelf. A reservation layer would add a second stock-like number
that staff must reconcile, which is exactly the "two shelves" problem the same
document forbids.

## Decision
- A confirmed checkout writes the order and immediately posts a `sale` movement
  through `InventoryService.move()`, inside the same `withTransaction()`.
- Cancelling an order posts a `cancellation` movement that credits the stock back.
- The order document carries `stockDeducted` / `stockRestored` booleans, and the
  cancel path flips `stockRestored` with a guarded `findOneAndUpdate`, so stock can
  never be credited twice even under concurrent cancel requests.
- There is still exactly one stock number per product or variant, and every change
  still goes through `InventoryService.move()` and leaves an `InventoryMovement` row.

Related smaller deviations from the same document, recorded here rather than in
separate ADRs:

- **Variants and images are embedded subdocuments** on the product, not separate
  collections. This is what makes an oversell-proof decrement a single atomic
  `findOneAndUpdate` with `$elemMatch` + `arrayFilters` inside the order
  transaction.
- **Purchase orders and supplier records are out of scope for this phase.**
  Restocking happens through the Inventory screen's "Stock in" action, which is a
  `stock_in` movement with a reason.
- **Order and payment statuses are lowercase snake_case** (`ready_for_pickup`,
  `partially_refunded`) to match the rest of the codebase. They map one-to-one onto
  the names used in the specification.

## Consequences
- Stock drops the moment a customer orders, so the shop floor sees true
  availability without a staff action. An abandoned-but-created order holds stock
  until somebody cancels it; the order list makes pending orders easy to spot.
- There is no intermediate "reserved" quantity to report on. If the club later
  grows a dispatch team, a reservation layer can be added on top without changing
  the movement ledger, because every change already flows through one service.

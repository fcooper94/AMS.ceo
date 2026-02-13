# Finances Page Redesign - Real Data

## Context
The finances page (`/finances`) currently shows hardcoded placeholder data. Flight revenue IS being credited to airline balance via `processFlightRevenue()`, and route-level totals (revenue, costs, flights, passengers, load factor) are accumulated - but none of this flows to the finances page. The user wants the page wired up with real data and a better layout.

## Files to Modify

| File | Changes |
|------|---------|
| `src/routes/finances.js` | Rewrite API to aggregate real data from routes, staff, fleet, contractors |
| `public/finances.html` | Redesign layout: summary cards, P&L overview, route table, cost breakdown |
| `public/js/finances.js` | Rewrite rendering for new API shape and UI sections |

## 1. Backend API Rewrite (`src/routes/finances.js`)

Replace placeholder data with real aggregated financials. New response shape:

```js
{
  summary: {
    totalRevenue,          // Sum route.totalRevenue
    totalOperatingCosts,   // Sum route.totalCosts
    totalStaffCosts,       // Monthly from computeStaffRoster()
    totalFleetCosts,       // Sum active lease payments
    totalContractorCosts,  // From membership contractor selections
    netProfit,             // revenue - all costs
    profitMargin,          // %
    balance,               // membership.balance
    totalFlights,          // Sum across routes
    totalPassengers,       // Sum across routes
    averageLoadFactor      // Weighted avg
  },
  costBreakdown: {
    fuelCosts, crewCosts, maintenanceCosts, airportFees,  // Estimated from route distances + known formulas
    staffCosts, fleetCosts, contractorCosts
  },
  routes: [{ routeNumber, departure, arrival, totalRevenue, totalCosts, profit, profitMargin, totalFlights, totalPassengers, averageLoadFactor, revenuePerFlight }],
  staffDetails: { totalEmployees, totalMonthlyCost, departments: [{label, monthlyCost}] },
  fleetDetails: { totalAircraft, leasedAircraft, totalMonthlyLeases },
  contractorDetails: { cleaning, ground, engineering, totalMonthlyCost },
  weeks: [{ revenues: {total}, expenses: {total}, netProfit }]  // Backward compat for dashboard.js
}
```

### Data Sources
- **Routes:** `Route.findAll({ where: { worldMembershipId } })` with airport includes
- **Staff:** replicate logic from `src/routes/staff.js` using `computeStaffRoster()` from `src/data/staffConfig.js`
- **Fleet:** `UserAircraft.findAll()` summing `leaseMonthlyPayment` for leased aircraft
- **Contractors:** `getContractor()` from `src/data/contractorConfig.js` + era scaling
- **Cost estimation:** use known formulas from `processFlightRevenue`:
  - Fuel: `distance * 2 * 3.5 * fuelMultiplier`
  - Crew: `distance * 2 * 0.8`
  - Maintenance: `distance * 2 * 0.5`
  - Airport fees: `1500 + paxCapacity * 3`

### Staff Cost Computation
Replicate from `src/routes/staff.js` (lines 29-106):
1. Get fleet count (non-sold aircraft)
2. Get current game time from worldTimeService
3. Get routes with assigned aircraft for crew calculations
4. Call `computeStaffRoster()` with params
5. Apply era multiplier via `eraEconomicService.getEraMultiplier(gameYear)`
6. Sum department costs for `totalMonthlyCost`

### Contractor Cost Computation
```js
const eraMultiplier = eraEconomicService.getEraMultiplier(gameYear);
const cleaningContractor = getContractor('cleaning', membership.cleaningContractor || 'standard');
const monthlyCost = Math.round((cleaningContractor?.monthlyCost2024 || 0) * eraMultiplier);
// Repeat for ground + engineering
```

### Dashboard Backward Compatibility
`public/js/dashboard.js` reads `data.weeks[0].netProfit` and `data.weeks[0].revenues.total`. Include a `weeks` array:
```js
weeks: [{
  weekNumber: 0,
  revenues: { total: totalRevenue },
  expenses: { total: -totalAllCosts },
  netProfit: totalRevenue - totalAllCosts
}]
```

## 2. HTML Redesign (`public/finances.html`)

Replace the single 4-week P&L table with a multi-section financial dashboard.

### Layout Structure

```
[Summary Cards Row 1: Revenue | Costs | Net Profit | Margin]
[Summary Cards Row 2: Balance | Flights | Passengers | Load Factor]

[P&L Overview Panel]
  OPERATING REVENUE
    Route Revenue              $X,XXX,XXX
    Total Operating Revenue    $X,XXX,XXX
  OPERATING COSTS
    Fuel                       -$X,XXX,XXX (estimated)
    Crew                       -$XXX,XXX (estimated)
    Maintenance                -$XXX,XXX (estimated)
    Airport Fees               -$XXX,XXX (estimated)
    Total Operating Costs      -$X,XXX,XXX
  MONTHLY OVERHEADS
    Staff Payroll              -$XX,XXX /mo
    Fleet Leases               -$XX,XXX /mo
    Contractors                -$XX,XXX /mo
    Total Monthly Overhead     -$XX,XXX /mo
  NET POSITION
    Operating Profit           $X,XXX,XXX

[Route Performance Table]
  Route | Flights | Revenue | Costs | Profit | Margin% | LF% | Rev/Flight
  Sorted by profit descending
  Green for profitable, red for loss-making

[Monthly Overheads Panel]
  Staff breakdown by department
  Fleet: leased vs owned aircraft
  Contractors: tier + monthly cost
```

### CSS Classes (existing, reuse)
- `dashboard-stats-row` + `dashboard-stat-card` for summary cards
- `ops-panel` + `panel-header` + `panel-body` for panels
- `stat-label` + `stat-value` for card content
- Monospace `'Courier New'` for financial values

## 3. Frontend JS Rewrite (`public/js/finances.js`)

### Function Structure
```
loadFinancialData()
  -> fetch /api/finances
  -> renderSummaryCards(data.summary)
  -> renderProfitLoss(data)
  -> renderRouteTable(data.routes)
  -> renderOverheads(data)
```

### Key Features
- `formatCurrency(amount)` - full format with $ and commas
- `formatCurrencyShort(amount)` - `$1.2M` for summary cards
- Color coding: `var(--success-color)` for positive, `#ef4444` for negative
- Empty state: "No routes yet - create routes to start earning revenue"
- Route table sorted by profit descending
- P&L table uses section headers (uppercase, accent color) and data rows

## 4. Potential Challenges

1. **Staff cost duplication:** The staff route has ~80 lines of setup. Consider extracting into a shared service (`src/services/staffCostService.js`) if it becomes unwieldy.
2. **Cost breakdown is estimated:** `processFlightRevenue` only stores `totalCosts` per route, not per-category. Label as "Estimated" in UI.
3. **All-time data only:** No weekly ledger exists. Label values as "ALL-TIME" not weekly.
4. **Empty state:** Handle airlines with zero routes gracefully.

## 5. Verification
1. Start server, navigate to `/finances`
2. Summary cards show real accumulated revenue/costs from routes
3. P&L overview breaks down operating income vs overhead costs
4. Route table shows per-route performance with profit/loss
5. Monthly overheads show staff, leases, contractor costs
6. Dashboard financial widget still works (backward compat with `weeks` array)
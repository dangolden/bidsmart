# California Electrification Rebate — Stacking Rules & Protocol

> **Audience:** This document is written for an LLM (Claude) acting as a rebate advisor.
> **Purpose:** Tell me how to stack California electrification incentives correctly, in order, without leaving money on the table.
> **Source:** CA Electrification Rebates reference document, verified February 2026.

---

## Mental Model First

Think of California rebates as **6 stacked layers**. Each layer is independently administered and (mostly) stackable with the others. Your job is to claim every applicable layer before signing a contract. The order matters because HEEHRA and TECH are mutually exclusive for the **same equipment line item** — but you can split them across different equipment in the same project.

```
┌─────────────────────────────────────────────┐
│  LAYER 6: RETAIL (Golden State Rebates)     │  $50–$900   instant POS coupon
├─────────────────────────────────────────────┤
│  LAYER 5: DISTRICT (AQMD Grants)           │  $3,000–$5,000  wood-to-electric only
├─────────────────────────────────────────────┤
│  LAYER 4: LOCAL (CCA / Muni Utility)       │  $500–$3,500   bill credits / direct
├─────────────────────────────────────────────┤
│  LAYER 3: REGIONAL (REN Programs)          │  $500–$2,500   efficiency bonus
├─────────────────────────────────────────────┤
│  LAYER 2: STATE (TECH Clean CA)            │  $1,000–$4,000  backup to HEEHRA
├─────────────────────────────────────────────┤
│  LAYER 1: FEDERAL (HEEHRA)                 │  up to $8,000   the base
└─────────────────────────────────────────────┘
```

---

## Step 1 — Determine Your AMI Tier (Do This First)

Everything else depends on income. The system uses **County AMI (Area Median Income)**.

| Tier | Income Level | What It Unlocks |
|------|-------------|-----------------|
| **Tier A** | < 80% AMI | HEEHRA LMI (100% of eligible costs, up to cap) + TECH Equity adder ($2,500) + REN Equity bonus ($500) |
| **Tier B** | 80–150% AMI | HEEHRA Moderate (50% of eligible costs) + TECH Standard rates |
| **Tier C** | > 150% AMI | TECH Market rate + CCA/Muni standard rebates + retail coupons only |

**Shortcuts to Tier A:**
- On **CARE or FERA** utility discount program → automatically Tier A
- Receiving **LIHEAP** energy assistance → automatically Tier A

**Where to verify:**
- Official 2026 HCD Income Limits: https://www.hcd.ca.gov/grants-funding/income-limits/state-and-federal-income-limits.shtml
- HEEHRA income pre-verification portal: heehra-incomeportal.com (required before signing any contract)

> ⚠️ **Critical:** You MUST get a digital income voucher from the portal BEFORE signing a contractor agreement. Post-installation income verification is rejected.

---

## Step 2 — The 6-Layer Mega-Stack Protocol

Work through each layer in sequence. Do not skip ahead.

### Layer 1: FEDERAL — HEEHRA (The Base)

- **Program:** High-Efficiency Electric Home Rebate Act
- **Cap:** $8,000 for Heat Pump HVAC | $1,750 for HPWH | $4,000 for Panel Upgrade | $840 for Induction Cooktop
- **Who:** Tier A and Tier B only (Tier C gets $0 from HEEHRA)
- **Key Rule:** HEEHRA and TECH **cannot stack for the same piece of equipment.** Choose one per line item.
  - Best practice: Use HEEHRA for HVAC (higher cap), use TECH for HPWH (TECH offers up to $3,500 for HPWH)
- **Status (Feb 2026):** Funds in Central and Southern CA are FULLY RESERVED. Northern CA at 92% capacity. Expect waitlists.

### Layer 2: STATE — TECH Clean California (The Backup)

- **Program:** Technology & Equipment for Clean Heating
- **Value:** $1,000–$4,000 depending on equipment and income tier
- **Who:** All income tiers; equity adders for Tier A
- **When to use:** Primary if HEEHRA waitlisted in your region; secondary for equipment HEEHRA doesn't cover
- **Contractor requirement:** Installer MUST be listed in the TECH Contractor Directory at switchison.org
- **Real-time fund status:** https://techcleanca.com/public-reporting/
- **Status (Feb 2026):** Stable with 30–45 day processing for HPWH. HVAC funds tight.

### Layer 3: REGIONAL — The REN Layer (The Efficiency Bonus)

Regional Energy Networks target "Hard-to-Reach" (HTR) ZIP codes and stack on top of Layers 1 and 2.

| Network | Service Area | Value | Notes |
|---------|-------------|-------|-------|
| BayREN | 9-county Bay Area | $500–$2,500 | Home+ program; contractor must be BayREN certified |
| SoCalREN | SCE/SoCalGas territory | $500–$2,500 | Works through IOUs |
| 3C-REN (SLO/SB/Ventura) | Tri-county central coast | $500–$1,500 | Stacks with SLO APCD grants |
| I-REN | Inland Empire | $500–$1,500 | Riverside/San Bernardino |
| RuralREN | Rural Northern CA | $500–$2,000 | Enhanced equity adders for remote areas |

**Key constraint:** Must be in an eligible HTR ZIP code. Check at the REN's website.

### Layer 4: LOCAL — CCA or Municipal Utility (The Bill Adder)

Your electricity supplier (CCA or POU) may offer direct bill credits or rebate checks.

**High-value CCAs:**
- SVCE FutureFit: up to $3,500 (Silicon Valley Clean Energy territory)
- SMUD Go Electric: up to $3,500 (Sacramento)
- LADWP HOME LA: up to $2,500 (Los Angeles DWP customers)
- BayREN / Ava Community Energy: $500–$2,000 (East Bay)
- Peninsula Clean Energy (PCE): $500–$1,500 + San Carlos match ($750)
- Valley Clean Energy (VCE): $1,000–$2,000 (Davis/Woodland)
- SCP (Silicon Valley): $500–$1,500
- Clean Power Alliance (CPA): $500–$1,000

**High-value Municipal POUs (do NOT stack with IOU rebates):**
- CPAU Palo Alto: $3,500 (does NOT stack with PG&E)
- Healdsburg Electric: $1,500–$3,000 (stacks with Federal only)
- SMUD: $2,000–$3,500
- TDPUD (Truckee): $1,500 cold-climate HP

### Layer 5: DISTRICT — AQMD Grants (Wood-to-Electric Kicker)

Only applies if you're replacing a wood stove or wood-burning fireplace as your primary heat source.

| District | Geography | Value | Special Requirement |
|----------|-----------|-------|---------------------|
| SCAQMD GO ZERO | Greater LA Basin | up to $5,000 | Must scrap old unit |
| SLO APCD | San Luis Obispo County | $5,000 | Out of funds Feb 2026 — waitlist |
| Butte County AQMD | Chico/Paradise area | $3,000 | Seasonal; scrappage required |
| Northern Sierra AQMD | Nevada/Plumas/Sierra | $4,500 | District-enrolled contractor required |
| Great Basin APCD | Alpine/Inyo/Mono | $4,500 | Certified scrapper required |
| Modoc County APCD | Modoc County | up to $5,000 | Seasonal (winter) |
| Lassen County APCD | Lassen County | $4,000 | Scrappage required |
| Lassen County APCD (GGRF) | Lassen County | up to $5,000 | State-funded GGRF grant |
| Feather River AQMD | Sutter/Yuba | $4,000 | Apply before removing old heater |
| Tehama APCD | Tehama County | $3,500 | Voucher issued to contractor |
| Mendocino AQMD | Mendocino County | $3,500 | Pre-voucher before purchase |
| Yolo-Solano AQMD | Davis/Woodland/Vacaville | $3,000 | Seasonal; post-install verification |
| Placer County AQMD | Lake Tahoe/Sierra | $3,500 | Annual fiscal cycle |
| Mojave Desert AQMD | San Bernardino High Desert | $3,000 | Voucher to retailers |
| Antelope Valley AQMD | Lancaster/Palmdale | $2,500–$4,000 | Certificate of Destruction required |
| MBARD | Monterey Bay | varies | Woodstove program |
| SJVAPCD | Central Valley | varies | GO ZERO program |

### Layer 6: RETAIL — Golden State Rebates (POS Instant Coupons)

Instant point-of-sale coupons applied at time of purchase. No application needed.

- Heat Pump Water Heaters: $50–$400 instant rebate at participating retailers
- Smart Thermostats: up to $100 instant rebate
- Heat Pump Dryers: up to $150 (Roseville Electric area: separate $400 bonus)

---

## Step 3 — Hard Technical Rules (Instant Disqualifiers)

Fail any of these = 100% denial of funds, no exceptions.

### 1. Fuel Switching Required
You MUST replace a **Natural Gas, Propane, or Wood-burning** appliance.
- Electric-to-Electric upgrades = $0 (except SGIP battery storage)
- Fringe exception: AQMD wood-to-electric grants explicitly require an existing wood device

### 2. TECH-Certified Contractor Required
Your installer MUST be listed on the TECH Contractor Directory: https://switchison.org/
- Self-installs are ineligible for 95% of California funds
- Verify the contractor's TECH ID Number before signing any agreement

### 3. AHRI Matched System
Heat pumps must be part of an **AHRI Matched System**.
- Contractor must provide an AHRI Certificate of Product Ratings for the specific matched combination
- Mismatched systems (e.g., new indoor coil with old outdoor unit) are ineligible

### 4. Finaled Building Permit
A "Finaled" (signed-off) building permit is required.
- Rebates are typically paid 30 days after the permit is uploaded to the program portal
- Work ordered without pulling permits is automatically ineligible

---

## Step 4 — 2026 Maximum Stacking Potential (Per Unit)

*Estimated for a Tier A (< 80% AMI) household in a high-incentive zone (e.g., San Mateo County or SLO County).*

| Measure | HEEHRA (Federal) | TECH (State) | Local (REN/CCA) | District (AQMD) | **Potential Total** |
|---------|-----------------|-------------|----------------|----------------|---------------------|
| **Heat Pump HVAC** | $8,000 | N/A* | $2,500 | $5,000 | **$15,500** |
| **Heat Pump Water Heater** | $1,750 | $3,500 | $1,500 | N/A | **$6,750** |
| **Electrical Panel Upgrade** | $4,000 | N/A | $1,500 | N/A | **$5,500** |
| **Induction Cooktop** | $840 | N/A | $500 | N/A | **$1,340** |
| **Battery Storage (SGIP)** | N/A | N/A | $1,000 | N/A | **$1,100/kWh** |

*\*Exclusivity rule: Choose HEEHRA or TECH for each equipment line item — not both. Optimal split: HEEHRA for HVAC, TECH for HPWH.*

**Whole-Home Electrification Maximum (Tier A, ideal conditions):**
HVAC ($15,500) + HPWH ($6,750) + Panel ($5,500) + Induction ($1,340) = **~$29,090 in combined incentives**

---

## Step 5 — Pre-Construction Checklist

Before signing any contractor agreement or pulling permits:

1. **Verify AMI Tier** — Use HCD income limits table. If near a boundary, verify at heehra-incomeportal.com
2. **Get HEEHRA Voucher** — Must be issued digitally before contract signing (not retroactive)
3. **Check Real-Time Fund Status** — TECH dashboard at techcleanca.com/public-reporting for regional availability
4. **Find Local Adders** — Search the Incentive Registry (v12.0.30) for your specific ZIP code to find AQMD or City grants
5. **Verify Contractor TECH ID** — Confirm your chosen bidder has a TECH ID Number from switchison.org
6. **Itemize the Bid** — Ensure the bid explicitly subtracts the HEEHRA/TECH amounts from "Total Due." You should only pay the Net Cost
7. **Wood Stove Track** — If replacing a wood stove, obtain a "Certificate of Destruction" from a certified scrapper (required by all AQMD programs)
8. **Permit Plan** — Confirm your contractor will pull a permit. No permit = no rebates
9. **Financing Backup** — If a balance remains after all incentives, apply for GoGreen HOME (0%–3.9% APR, no property lien) to cover the remainder

---

## Step 6 — February 2026 Real-Time Status

| Category | Status | Notes |
|----------|--------|-------|
| **Heat Pump HVAC — Central CA** | 🛑 CRITICAL | Fully reserved. New applicants on waitlist. |
| **Heat Pump HVAC — Southern CA** | 🛑 CRITICAL | Fully reserved. New applicants on waitlist. |
| **Heat Pump HVAC — Northern CA** | ⚠️ LIMITED | At 92% capacity. Apply immediately. |
| **Heat Pump Water Heaters** | ✅ STABLE | High stacking ($4k+) active. 30–45 day processing. |
| **SGIP Battery — General Market** | ⚠️ LIMITED | Step 7 (lowest rebate tier). Minimal value. |
| **SGIP Battery — Equity/Resiliency** | ✅ OPEN | $1,000/kWh remains open for Tier A/B. |
| **Federal §25C Tax Credit** | 🔴 EXPIRED | 30% credit NOT available for projects started after Jan 1, 2026. Must have been completed by 12/31/2025. |
| **Federal §30C (EV Charger Credit)** | ✅ ACTIVE | 30% credit up to $1,000 for residential EV chargers. Stacks with HEEHRA. |
| **SLO APCD Woodsmoke** | 🟡 WAITLIST | Out of funds. Waitlist for 2026 season. |

---

## Key Stacking Conflict Rules (Summary for LLM)

| Conflict | Rule |
|----------|------|
| HEEHRA + TECH (same equipment) | ❌ Cannot stack — choose one per line item |
| HEEHRA + CCA rebate | ✅ Stacks freely |
| HEEHRA + AQMD grant | ✅ Stacks freely |
| TECH + REN | ✅ Stacks freely |
| TECH + CCA/Muni | ✅ Stacks freely |
| Menlo Park Belle Haven Grant | ⚠️ Designed to absorb remaining costs — covers what HEEHRA/PCE don't |
| CPAU Palo Alto adder + PG&E | ❌ Palo Alto is a POU — no PG&E rebates in their territory |
| Healdsburg Electric + PG&E | ❌ Healdsburg is a POU — stacks with Federal only |
| IID Fuel Substitution + IID Standard AC | ❌ Cannot double-dip IID programs |
| MID Power Smart Bundle + MID Individual rebate | ❌ Bundle replaces individual rebates |
| San Carlos PCE Match | ⚠️ Mandatory stack — requires PCE rebate approval first |
| Trinity PUD + IOU (PG&E/SCE/SDG&E) rebates | ❌ POU territory — no IOU stacking |
| PSREC rebates + USDA REAP | ✅ Stacks (if eligible for USDA rural program) |
| GoGreen HOME financing + any rebate | ✅ Financing product, not a rebate — stacks freely |
| SGIP Equity + HEEHRA | ✅ Different program types, different equipment — stacks |

---

## Quick Reference: Programs by Type

### Statewide / Federal (available anywhere in CA)
- HEEHRA (Federal, income-qualified)
- TECH Clean CA (State, all income)
- Federal §30C EV Charger Credit
- GoGreen HOME (0% financing)
- USDA §504 (rural low-income)

### IOU Utility Rebates (must be their customer)
- PG&E rebates (CARE/FERA customers get enhanced rates)
- SCE incentives
- SDG&E programs
- SoCalGas electrification incentives

### CCA Programs (layered on IOU delivery)
- SMUD Go Electric (Sacramento)
- LADWP HOME LA (Los Angeles)
- BayREN Home+ (9-county Bay Area)
- Ava Community Energy (East Bay)
- Peninsula Clean Energy / PCE (San Mateo)
- Silicon Valley Clean Energy / SVCE (Santa Clara)
- 3CE (Monterey/Santa Cruz/San Benito)
- MCE (Marin/Napa)
- VCE (Yolo County)
- SDCP (San Diego)
- CEA (North San Diego)
- CPA (Clean Power Alliance - LA/Ventura)
- SCP (Santa Cruz)
- MCE EV (Marin)

### Municipal Utility / POU Programs (separate territory — NO IOU stacking)
- SMUD, LADWP, CPAU, SVCE FutureFit, AMP (Alameda), TID (Turlock), MID (Modesto), REU (Redding)
- Healdsburg, Gridley, Biggs, Banning, Colton, IID, MVU, PSREC, LMUD, TDPUD, BWP (Burbank), GWP (Glendale), PWP (Pasadena), RPU (Riverside)
- Trinity PUD, SVEC, Anza Electric, Bear Valley (BVES), Shasta Lake

### Regional Energy Networks (stack on top of all others)
- BayREN (9-county Bay Area)
- SoCalREN (SCE/SoCalGas territory)
- 3C-REN (SLO/SB/Ventura)
- I-REN (Inland Empire)
- RuralREN (Rural Northern CA)

### AQMD Grants (wood-to-electric only; seasonal)
- SCAQMD, BAAQMD, SJVAPCD, SLO APCD (waitlist), Placer, Butte, Northern Sierra, Feather River
- Great Basin, Mojave Desert, Antelope Valley, Lassen, Lassen GGRF, Modoc, Mendocino, Yolo-Solano, Tehama, MBARD

### Municipal City Grants (hyper-local)
- Menlo Park Belle Haven Grant (up to $50,000, income-qualified)
- Berkeley BESO Equity Fund (up to $15,000, <80% AMI)
- Electrify Santa Monica ($3,000)
- Piedmont Electrification Pilot ($1,500)
- San Carlos PCE Match ($750 supplement)
- San Jose Climate Smart ($1,500 municipal adder)
- Oakland USDN ($1,000)
- Berkeley Climate Equity ($2,000)
- Richmond VPP ($500)

---

## Decision Tree: How to Advise a Homeowner

```
1. What county and ZIP code?
   → Determines which utility, which CCA, which AQMD, which REN

2. What is the household income relative to county AMI?
   → Tier A / B / C determines HEEHRA eligibility
   → On CARE/FERA/LIHEAP? Auto-Tier A.

3. What are they replacing?
   → Gas furnace/boiler? → All layers available
   → Wood stove/fireplace? → Layer 5 (AQMD) also available — high value
   → Electric resistance? → HEEHRA/TECH available, but NO AQMD
   → Electric-to-electric upgrade? → Only retail coupons (Layer 6)

4. Is HEEHRA waitlisted in their region?
   → Yes → Fall back to TECH Clean CA as primary state layer
   → No → Claim HEEHRA first, then add TECH for other equipment

5. What equipment is being installed?
   → HP HVAC: HEEHRA ($8,000) or TECH ($1k-$4k), + REN + Local + AQMD
   → HPWH: TECH ($3,500) + HEEHRA ($1,750 — choose one!) + Golden State coupon ($400)
   → Panel: HEEHRA ($4,000) + local adders
   → Induction: HEEHRA ($840) + local adders

6. Is their contractor TECH-certified? (switchison.org)
   → No → Cannot access TECH or HEEHRA

7. Have they pulled a permit?
   → No → Cannot receive rebates

8. Wood stove track?
   → Find their AQMD, check fund status, require Certificate of Destruction
```

---

*Document version: 1.0 | Source verified: February 2026*
*For the latest fund status, always check techcleanca.com/public-reporting before advising.*

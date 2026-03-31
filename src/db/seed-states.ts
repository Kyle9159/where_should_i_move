/**
 * Seeds the states table with cost-of-living index and tax burden data.
 * Source: Tax Foundation 2023 (tax burden), MIT Living Wage / C2ER ACCRA (cost index)
 *
 * Run: npx tsx src/db/seed-states.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Database from "better-sqlite3";
const db = new Database(process.env.DATABASE_URL?.replace("file:", "") ?? "./nexthome.db");

// cost_index: US average = 100 (higher = more expensive)
// tax_burden: total state+local tax as % of income (lower = resident-friendly)
// no_income_tax: true if state has no personal income tax
const STATE_DATA: Record<string, { costIndex: number; taxBurden: number; noIncomeTax: boolean }> = {
  AK: { costIndex: 130, taxBurden: 5.4,  noIncomeTax: true  },
  AL: { costIndex: 91,  taxBurden: 9.8,  noIncomeTax: false },
  AR: { costIndex: 92,  taxBurden: 10.2, noIncomeTax: false },
  AZ: { costIndex: 104, taxBurden: 9.5,  noIncomeTax: false },
  CA: { costIndex: 138, taxBurden: 13.5, noIncomeTax: false },
  CO: { costIndex: 109, taxBurden: 9.7,  noIncomeTax: false },
  CT: { costIndex: 128, taxBurden: 15.4, noIncomeTax: false },
  DC: { costIndex: 158, taxBurden: 14.0, noIncomeTax: false },
  DE: { costIndex: 105, taxBurden: 11.4, noIncomeTax: false },
  FL: { costIndex: 103, taxBurden: 8.0,  noIncomeTax: true  },
  GA: { costIndex: 100, taxBurden: 9.9,  noIncomeTax: false },
  HI: { costIndex: 193, taxBurden: 14.1, noIncomeTax: false },
  IA: { costIndex: 95,  taxBurden: 11.2, noIncomeTax: false },
  ID: { costIndex: 111, taxBurden: 10.1, noIncomeTax: false },
  IL: { costIndex: 107, taxBurden: 13.0, noIncomeTax: false },
  IN: { costIndex: 97,  taxBurden: 10.0, noIncomeTax: false },
  KS: { costIndex: 93,  taxBurden: 10.9, noIncomeTax: false },
  KY: { costIndex: 93,  taxBurden: 10.8, noIncomeTax: false },
  LA: { costIndex: 96,  taxBurden: 10.1, noIncomeTax: false },
  MA: { costIndex: 132, taxBurden: 12.2, noIncomeTax: false },
  MD: { costIndex: 118, taxBurden: 11.9, noIncomeTax: false },
  ME: { costIndex: 112, taxBurden: 12.4, noIncomeTax: false },
  MI: { costIndex: 101, taxBurden: 11.2, noIncomeTax: false },
  MN: { costIndex: 107, taxBurden: 12.1, noIncomeTax: false },
  MO: { costIndex: 97,  taxBurden: 10.5, noIncomeTax: false },
  MS: { costIndex: 89,  taxBurden: 10.2, noIncomeTax: false },
  MT: { costIndex: 111, taxBurden: 9.7,  noIncomeTax: false },
  NC: { costIndex: 100, taxBurden: 10.5, noIncomeTax: false },
  ND: { costIndex: 100, taxBurden: 8.8,  noIncomeTax: false },
  NE: { costIndex: 97,  taxBurden: 11.4, noIncomeTax: false },
  NH: { costIndex: 120, taxBurden: 9.6,  noIncomeTax: true  },
  NJ: { costIndex: 125, taxBurden: 13.2, noIncomeTax: false },
  NM: { costIndex: 101, taxBurden: 10.5, noIncomeTax: false },
  NV: { costIndex: 107, taxBurden: 8.1,  noIncomeTax: true  },
  NY: { costIndex: 139, taxBurden: 15.9, noIncomeTax: false },
  OH: { costIndex: 99,  taxBurden: 10.5, noIncomeTax: false },
  OK: { costIndex: 93,  taxBurden: 9.5,  noIncomeTax: false },
  OR: { costIndex: 118, taxBurden: 11.5, noIncomeTax: false },
  PA: { costIndex: 104, taxBurden: 11.1, noIncomeTax: false },
  RI: { costIndex: 118, taxBurden: 12.6, noIncomeTax: false },
  SC: { costIndex: 98,  taxBurden: 10.2, noIncomeTax: false },
  SD: { costIndex: 99,  taxBurden: 7.8,  noIncomeTax: true  },
  TN: { costIndex: 95,  taxBurden: 7.7,  noIncomeTax: true  },
  TX: { costIndex: 100, taxBurden: 8.6,  noIncomeTax: true  },
  UT: { costIndex: 106, taxBurden: 10.0, noIncomeTax: false },
  VA: { costIndex: 105, taxBurden: 10.8, noIncomeTax: false },
  VT: { costIndex: 122, taxBurden: 13.6, noIncomeTax: false },
  WA: { costIndex: 118, taxBurden: 8.9,  noIncomeTax: true  },
  WI: { costIndex: 104, taxBurden: 12.0, noIncomeTax: false },
  WV: { costIndex: 97,  taxBurden: 10.9, noIncomeTax: false },
  WY: { costIndex: 101, taxBurden: 7.1,  noIncomeTax: true  },
};

let updated = 0;
const stmt = db.prepare(`
  UPDATE states
  SET cost_index = ?, tax_burden = ?, no_income_tax = ?
  WHERE id = ?
`);

for (const [stateId, data] of Object.entries(STATE_DATA)) {
  const result = stmt.run(data.costIndex, data.taxBurden, data.noIncomeTax ? 1 : 0, stateId);
  if (result.changes > 0) updated++;
}

console.log(`✅ Updated ${updated} states with cost/tax data`);
db.close();

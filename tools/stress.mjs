// Role-based stress test of the OuterEdit console. Personas: employee (Mei),
// super admin (Ryan), finance (Daniel), people manager (Priya), leadership
// (Sofia), lead (Wei Ming), freelancer (Aiko). Asserts function, permission
// masking, report accuracy against the finance engine's published figures.

import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173';
const results = [];
const consoleErrors = [];

function check(persona, name, ok, detail = '') {
  results.push({ persona, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${persona}] ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
const page = await browser.newPage();
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(`console: ${m.text().slice(0, 200)}`);
});

async function switchTo(userId) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.selectOption('#role-switcher', userId);
  await page.waitForTimeout(400);
}

async function navTexts() {
  return page.locator('aside nav a').allTextContents();
}

async function bodyText() {
  return page.locator('body').innerText();
}

// ---------------------------------------------------------------- Mei (employee)
await switchTo('usr-mei');
{
  const nav = (await navTexts()).join('|');
  check('Mei', 'no Company/Reports/Admin/Verse in nav',
    !/Cockpit|Overheads|Audit log|OE Verse|Report library|Financial periods/.test(nav), nav);
  check('Mei', 'personal + projects nav present', /Today/.test(nav) && /My projects|Portfolio/.test(nav));

  await page.goto(`${BASE}/company`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const t = await bodyText();
  check('Mei', 'direct /company URL is calmly denied', /isn't part of your access/.test(t));

  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
  const todayText = await bodyText();
  check('Mei', 'Today loads with completion ring', /mapped|Annual leave|unmapped/i.test(todayText));

  // Navigate back a day (2026-06-29 is also leave; 2026-06-26 workday) and add an entry.
  await page.click('button[aria-label="Previous day"]');
  await page.click('button[aria-label="Previous day"]');
  await page.click('button[aria-label="Previous day"]');
  await page.click('button[aria-label="Previous day"]');
  await page.waitForTimeout(500);
  const before = await bodyText();
  const kinds = page.locator('form select').first();
  await kinds.selectOption('company');
  await page.waitForTimeout(150);
  const activitySelect = page.locator('form select').nth(1);
  const options = await activitySelect.locator('option').allTextContents();
  check('Mei', 'company activities offered in picker', options.includes('Internal meeting'), options.join(','));
  await activitySelect.selectOption({ label: 'Internal meeting' });
  await page.click('form button[type="submit"]');
  await page.waitForTimeout(600);
  const after = await bodyText();
  check('Mei', 'adding an entry lands on the day', after.includes('Internal meeting'));

  // Stepper +15 on the new entry.
  const plus = page.locator('button[aria-label="Extend Internal meeting by 15 minutes"]').first();
  if (await plus.count()) {
    await plus.click();
    await page.waitForTimeout(500);
    check('Mei', 'stepper extends entry by 15m', (await bodyText()).match(/1h 15m/) !== null);
  } else {
    check('Mei', 'stepper extends entry by 15m', false, 'stepper not found');
  }

  await page.goto(`${BASE}/week`, { waitUntil: 'networkidle' });
  check('Mei', 'Week renders 7 day cards', (await page.locator('main .grid > div').count()) >= 7);

  await page.goto(`${BASE}/insights`, { waitUntil: 'networkidle' });
  check('Mei', 'Insights renders owner-only reflections', /only ever visible to you|Nobody else sees/i.test(await bodyText()));

  await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' });
  const port = await bodyText();
  check('Mei', 'portfolio hides money from team member',
    !/\$38,000|\$180,000|\$420,000/.test(port), 'no raw fees visible');

  await page.goto(`${BASE}/projects/prj-c`, { waitUntil: 'networkidle' });
  const prj = await bodyText();
  check('Mei', 'project page: no Financials tab for team member', !/Financials/.test(prj));
  check('Mei', 'project page: health cards render', /Hours consumed/.test(prj));
}

// ---------------------------------------------------------------- Ryan (super admin)
await switchTo('usr-ryan');
{
  const nav = (await navTexts()).join('|');
  check('Ryan', 'full nav: cockpit, reports, admin, audit',
    /Cockpit/.test(nav) && /Report library/.test(nav) && /Audit log/.test(nav) && /OE Verse/.test(nav));

  await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' });
  const port = await bodyText();
  check('Ryan', 'portfolio shows real money', /\$38,000/.test(port) && /\$420,000/.test(port));
  check('Ryan', 'Northwind shows the loss', /-\$6,200/.test(port.replace(/−/g, '-')));
  check('Ryan', 'loss-making chip present', /Loss-making/.test(port));
  check('Ryan', 'Kite running hot', /Running hot/.test(port));

  await page.goto(`${BASE}/projects/prj-e`, { waitUntil: 'networkidle' });
  await page.click('text=Financials');
  await page.waitForTimeout(400);
  const fin = await bodyText();
  check('Ryan', 'E: internal cost 136,200 on screen', /\$136,200/.test(fin));
  check('Ryan', 'E: gross profit −6,200 on screen', /\$6,200/.test(fin));
  check('Ryan', 'E: margin −2.5%', /-2\.5%|−2\.5%/.test(fin.replace(/−/g, '-')));
  check('Ryan', 'E: legacy lens 52.0% beside true margin', /52\.0%/.test(fin));
  check('Ryan', 'E: the disguise warning renders', /reason the console exists/.test(fin));

  await page.goto(`${BASE}/company`, { waitUntil: 'networkidle' });
  const cockpit = await bodyText();
  check('Ryan', 'cockpit renders account lines', /Non-project payroll/.test(cockpit) && /Operating profit/.test(cockpit));
  check('Ryan', 'tie-out badge green', /green/.test(cockpit));

  await page.goto(`${BASE}/admin/periods`, { waitUntil: 'networkidle' });
  const periods = await bodyText();
  check('Ryan', 'periods list with lock states', /soft closed/.test(periods) && /locked/.test(periods) && /open/.test(periods));
  // Lock June (open, tie-out green).
  const lockButtons = page.locator('button:has-text("Lock")');
  const lockCount = await lockButtons.count();
  if (lockCount > 0) {
    await lockButtons.last().click();
    await page.waitForTimeout(300);
    const confirmVisible = /Locking snapshots every entry's cost/.test(await bodyText());
    check('Ryan', 'locking asks for confirmation first', confirmVisible);
    await page.getByRole('button', { name: /^Lock \w+ \d{4}$/ }).click();
    await page.waitForTimeout(600);
    check('Ryan', 'locking an open green month succeeds', /Reopen/.test(await bodyText()));
  } else {
    check('Ryan', 'locking asks for confirmation first', false, 'no lock button');
    check('Ryan', 'locking an open green month succeeds', false, 'no lock button');
  }
  // Reopen with mandatory reason.
  await page.locator('button:has-text("Reopen")').first().click();
  await page.waitForTimeout(200);
  const reopenConfirm = page.locator('button:has-text("Reopen with reason")');
  check('Ryan', 'reopen requires a reason (disabled empty)', await reopenConfirm.isDisabled());
  await page.fill('input[placeholder="Why this period needs to reopen"]', 'Stress test correction');
  await reopenConfirm.click();
  await page.waitForTimeout(500);

  await page.click('aside nav a:has-text("Audit log")');
  await page.waitForTimeout(1400);
  const auditText = await bodyText();
  check('Ryan', 'audit shows reopen with reason', /reopen/.test(auditText) && /Stress test correction/.test(auditText));
  check('Ryan', 'audit shows salary-change history', /EmploymentAgreement/.test(auditText));

  // Variation flow on Kite (he leads it).
  await page.goto(`${BASE}/projects/prj-f`, { waitUntil: 'networkidle' });
  await page.click('button:has-text("Log a variation")');
  await page.waitForTimeout(300);
  await page.fill('input[placeholder*="revision round"]', 'Additional wayfinding family for the north gate');
  await page.fill('input[placeholder="4500"]', '8000');
  await page.click('button:has-text("Submit for approval")');
  await page.waitForTimeout(600);
  const vars = await bodyText();
  check('Ryan', 'variation submitted appears', /north gate/.test(vars));
  const approveBtn = page.locator('button:has-text("Approve")').first();
  if (await approveBtn.count()) {
    await approveBtn.click();
    await page.waitForTimeout(600);
    check('Ryan', 'variation approved as leadership', /Approved/.test(await bodyText()));
  } else {
    check('Ryan', 'variation approved as leadership', false, 'no approve button');
  }

  // Plan & Quote ladder + discount breach confirmation.
  await page.goto(`${BASE}/plan-quote`, { waitUntil: 'networkidle' });
  const pq = await bodyText();
  check('Ryan', 'Plan & Quote lists Harbourline draft', /Harbourline/.test(pq));
  const link = page.locator('a:has-text("Continue estimating"), a:has-text("Open")').first();
  await link.click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("5 · Price")');
  await page.waitForTimeout(400);
  const price = await bodyText();
  check('Ryan', 'ladder shows three floors', /Negotiation floor/.test(price) && /Minimum safe price/.test(price) && /Recommended price/.test(price));
  const discount = page.locator('input[aria-label="Discount percent"]');
  await discount.fill('0.55');
  await page.waitForTimeout(400);
  const breached = await bodyText();
  check('Ryan', 'deep discount triggers hard confirmation', /below the minimum safe price/.test(breached));
}

// ---------------------------------------------------------------- Daniel (finance)
await switchTo('usr-daniel');
{
  await page.goto(`${BASE}/people/per-mei`, { waitUntil: 'networkidle' });
  const profile = await bodyText();
  check('Daniel', 'finance sees Employment and Cost rates tabs', /Employment/.test(profile) && /Cost rates/.test(profile));
  await page.click('button:has-text("Cost rates")');
  await page.waitForTimeout(300);
  const rates = await bodyText();
  check('Daniel', 'Mei rate history shows raise (50.00 → 55.00)', /50\.00/.test(rates) && /55\.00/.test(rates));

  await page.goto(`${BASE}/company/overheads`, { waitUntil: 'networkidle' });
  await page.fill('input[placeholder*="guard"]', 'Design team salaries');
  await page.click('button:has-text("Add to register")');
  await page.waitForTimeout(300);
  check('Daniel', 'payroll guard rejects salary line', /never live in the overhead register/.test(await bodyText()));

  await page.goto(`${BASE}/verse`, { waitUntil: 'networkidle' });
  const verse = await bodyText();
  check('Daniel', 'finance sees OE Verse rates', /\$65,000|\$4,000/.test(verse));
}

// ---------------------------------------------------------------- Priya (people manager)
await switchTo('usr-priya');
{
  const nav = (await navTexts()).join('|');
  check('Priya', 'no company finance in nav', !/Cockpit|Overheads/.test(nav));
  check('Priya', 'no OE Verse for people manager', !/OE Verse/.test(nav));
  await page.goto(`${BASE}/people`, { waitUntil: 'networkidle' });
  check('Priya', 'directory loads', /Mei Chen/.test(await bodyText()));
  await page.goto(`${BASE}/people/per-mei`, { waitUntil: 'networkidle' });
  const profile = await bodyText();
  check('Priya', 'no remuneration tabs for manager', !/Employment\b/.test(profile.replace(/Employment status/g, '')) && !/Cost rates/.test(profile));
}

// ---------------------------------------------------------------- Sofia (leadership)
await switchTo('usr-sofia');
{
  const nav = (await navTexts()).join('|');
  check('Sofia', 'leadership sees cockpit + reports', /Cockpit/.test(nav) && /Report library/.test(nav));
  check('Sofia', 'leadership has no admin periods/audit', !/Audit log/.test(nav));
  await page.goto(`${BASE}/people/per-mei`, { waitUntil: 'networkidle' });
  const profile = await bodyText();
  check('Sofia', 'leadership does not see salary tabs by default', !/Cost rates/.test(profile));
  await page.goto(`${BASE}/company`, { waitUntil: 'networkidle' });
  check('Sofia', 'cockpit renders for leadership', /Operating profit/.test(await bodyText()));
}

// ---------------------------------------------------------------- Wei Ming (lead of one)
await switchTo('usr-weiming');
{
  await page.goto(`${BASE}/projects/prj-g`, { waitUntil: 'networkidle' });
  const own = await bodyText();
  check('WeiMing', 'lead sees own project health + variation button', /Log a variation/.test(own));
  await page.goto(`${BASE}/projects/prj-c`, { waitUntil: 'networkidle' });
  const other = await bodyText();
  check('WeiMing', 'no Financials tab on a project he does not lead', !/Financials/.test(other));
}

// ---------------------------------------------------------------- Aiko (freelancer)
await switchTo('usr-aiko');
{
  const nav = (await navTexts()).join('|');
  check('Aiko', 'external contributor sees only My work', /Assignments/.test(nav) && !/Today|Portfolio|Directory|Cockpit/.test(nav));
  await page.goto(`${BASE}/verse-portal`, { waitUntil: 'networkidle' });
  const portal = await bodyText();
  check('Aiko', 'portal shows own engagement and fee', /Lumen Festival/.test(portal));
  await page.goto(`${BASE}/people`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  check('Aiko', 'internal directory denied for external', /isn't part of your access|for OE Verse collaborators/.test(await bodyText()));
  await page.goto(`${BASE}/company`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  check('Aiko', 'company denied for external', /isn't part of your access/.test(await bodyText()));
}

// ---------------------------------------------------------------- summary
const failures = results.filter((r) => !r.ok);
console.log(`\n===== ${results.length} checks, ${failures.length} failures =====`);
for (const f of failures) console.log(`FAIL [${f.persona}] ${f.name} ${f.detail}`);
const uniqueErrors = [...new Set(consoleErrors)].filter((e) => !/favicon|Download the React DevTools/.test(e));
console.log(`\nConsole/page errors: ${uniqueErrors.length}`);
for (const e of uniqueErrors.slice(0, 12)) console.log(`  ${e}`);

await browser.close();
process.exit(failures.length > 0 || uniqueErrors.length > 0 ? 1 : 0);

// Issue #1 驗收測試（問題一＋問題二）。執行：node tests/run_tests.js
// 不需要瀏覽器：content.js 以 vm 沙箱＋假 DOM/chrome.storage 驅動，ScanPlan 直接 require。
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const ScanPlan = require(path.join(ROOT, "scan-plan.js"));
const MASTER_LIST = new Function(read("master-list.js") + "; return MASTER_LIST;")();

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS  " + name); }
  else { fail++; console.log("FAIL  " + name + (detail ? "  → " + detail : "")); }
}

// ---- 假環境：chrome.storage.local（同步 callback）＋可組裝的假 DOM ----
function makeStorage(initial) {
  const data = Object.assign({}, initial);
  return {
    data,
    chrome: {
      storage: {
        local: {
          get(keys, cb) { const out = {}; keys.forEach((k) => { out[k] = data[k]; }); cb(out); },
          set(obj, cb) { Object.assign(data, obj); if (cb) cb(); },
        },
      },
    },
  };
}

function fakeCard(id, completed, name) {
  return {
    getAttribute(n) {
      if (n === "path") return "/course_templates/" + id;
      if (n === "name") return name || ("課程" + id);
      return null;
    },
    hasAttribute(n) { return n === "completed" ? !!completed : false; },
  };
}

// 跑一次 content.js 的掃描（load 即 scan 一次；setInterval 停用）
function runContentScan(storage, page) {
  const sandbox = {
    chrome: storage.chrome,
    location: page.location,
    document: {
      querySelectorAll(sel) {
        if (sel === 'ql-activity-card[type="course"]') return page.cards || [];
        if (sel.startsWith("ql-dialog")) return page.dialogs || [];
        if (sel === "ql-activity-card") return page.cards || [];
        return [];
      },
      querySelector() { return null; },
      body: { innerText: page.bodyText || "" },
    },
    setInterval() {},
    console,
  };
  vm.runInNewContext(read("master-list.js") + "\n" + read("content.js"), sandbox);
}

const SKILLS_LOC = { pathname: "/paths/2480", hostname: "www.skills.google", href: "https://www.skills.google/paths/2480" };
const SHOP_LOC = { pathname: "/legacy/lms/index.php", hostname: "skillshop.docebosaas.com", href: "https://skillshop.docebosaas.com/..." };
const CODE = "gmp-ma-mastery-lp01-zh-TW"; // 母清單第一門 Skillshop 認證

// ================= 問題一 =================

// 1. 完成 → 未完成：可回退（skills.google 卡片）
{
  const s = makeStorage({ scanId: "A" });
  runContentScan(s, { location: SKILLS_LOC, cards: [fakeCard("1268", true)] });
  check("1a 前置：round A 掃到完成", s.data.progress["1268"].completed === true);
  s.data.scanId = "B";
  runContentScan(s, { location: SKILLS_LOC, cards: [fakeCard("1268", false)] });
  check("1b 完成→未完成可回退", s.data.progress["1268"].completed === false,
    JSON.stringify(s.data.progress["1268"]));
}

// 2. 未完成 → 完成：可更新
{
  const s = makeStorage({ scanId: "A" });
  runContentScan(s, { location: SKILLS_LOC, cards: [fakeCard("153", false)] });
  s.data.scanId = "B";
  runContentScan(s, { location: SKILLS_LOC, cards: [fakeCard("153", true)] });
  check("2 未完成→完成可更新", s.data.progress["153"].completed === true);
}

// 3. Skillshop：本輪未掃到 → popup 判定不沿用上一輪（過期認證情境）
{
  const s = makeStorage({ scanId: "A" });
  runContentScan(s, { location: SHOP_LOC, bodyText: "..." + CODE + "..." });
  check("3a 前置：round A 認證在列", s.data.progress[CODE].completed === true);
  s.data.scanId = "B";
  runContentScan(s, { location: SHOP_LOC, bodyText: "頁面已無該認證代碼" }); // collect 空 → 不寫入
  const course = MASTER_LIST.programs[1].courses[0];
  const stateB = ScanPlan.courseState(course, s.data.progress, "B");
  const stateA = ScanPlan.courseState(course, s.data.progress, "A");
  check("3b 本輪未掃到：不沿用上一輪（B 輪回到待確認）", stateB === "shop", "got " + stateB);
  check("3c 舊輪自身仍判完成（資料未清空）", stateA === "ok" && s.data.progress[CODE].completed === true);
}

// 4. 同一輪多個分頁命中同一項目：結果互補、不互相覆蓋
{
  const s = makeStorage({ scanId: "B" });
  runContentScan(s, { location: SKILLS_LOC, cards: [fakeCard("946", false)] }); // 路徑頁說未完成
  runContentScan(s, { location: SKILLS_LOC, cards: [fakeCard("946", true)] });  // 另一分頁說完成
  check("4a 同輪互補（false 後 true）→ 完成", s.data.progress["946"].completed === true);
  const s2 = makeStorage({ scanId: "B" });
  runContentScan(s2, { location: SKILLS_LOC, cards: [fakeCard("946", true)] });
  runContentScan(s2, { location: SKILLS_LOC, cards: [fakeCard("946", false)] });
  check("4b 同輪互補（true 後 false）→ 仍完成", s2.data.progress["946"].completed === true);
}

// 5. 新項目：正常建立
{
  const s = makeStorage({ scanId: "B" });
  runContentScan(s, { location: SKILLS_LOC, cards: [fakeCard("552", true, "Vertex AI Studio 簡介")] });
  const p = s.data.progress["552"];
  check("5 新項目建立（含名稱與輪代號）", !!p && p.completed === true && p.scanId === "B" && p.name === "Vertex AI Studio 簡介");
}

// 6. 掃描中斷／空頁面：既有資料不遺失
{
  const s = makeStorage({ scanId: "B", progress: { "1268": { completed: true, name: "x", url: "u", scanId: "A" } } });
  runContentScan(s, { location: SKILLS_LOC, cards: [] });
  check("6 空掃描不動既有資料", s.data.progress["1268"].completed === true && s.data.progress["1268"].scanId === "A");
}

// 7. skills.google 舊輪紀錄 → popup 顯示「未抓到」，不顯示完成
{
  const progress = { "1268": { completed: true, name: "x", url: "u", scanId: "A" } };
  const course = MASTER_LIST.programs[0].courses[0]; // 1268
  check("7 舊輪完成紀錄在新輪顯示未抓到", ScanPlan.courseState(course, progress, "B") === "unseen");
}

// ================= 問題二 =================

// 8. 全部項目均由第一階段確認 → 第二階段 0 頁（總共只開 2 頁）
{
  const progress = {};
  MASTER_LIST.programs.forEach((p) => p.courses.forEach((c) => {
    const k = ScanPlan.keyOf(c);
    if (k) progress[k] = { completed: true, scanId: "B", name: "", url: "" };
  }));
  const pages = ScanPlan.missingPages(MASTER_LIST, progress, "B");
  check("8 全確認 → 第二階段 0 頁", pages.length === 0, JSON.stringify(pages));
}

// 9. 部分未確認 → 第二階段頁面數＝缺項所屬頁面數，不多開
{
  const progress = {};
  MASTER_LIST.programs.forEach((p) => p.courses.forEach((c) => {
    const k = ScanPlan.keyOf(c);
    if (k) progress[k] = { completed: true, scanId: "B", name: "", url: "" };
  }));
  delete progress["153"];  // 獨立課 /course_templates/153
  delete progress["946"];  // 路徑課 /paths/9/...
  delete progress["271"];  // 同路徑 /paths/9/... → 不應多開一頁
  const pages = ScanPlan.missingPages(MASTER_LIST, progress, "B").sort();
  const expect = [
    MASTER_LIST.skillsBase + "/course_templates/153?locale=zh_TW",
    MASTER_LIST.skillsBase + "/paths/9?locale=zh_TW",
  ].sort();
  check("9 缺項頁面精準（同路徑合併、不多開）", JSON.stringify(pages) === JSON.stringify(expect), JSON.stringify(pages));
}

// 10. 缺項涵蓋率：全部未確認時，兩階段合計＝現行全量掃描的 skills 頁面集合
{
  const pages = new Set(ScanPlan.missingPages(MASTER_LIST, {}, "B"));
  const full = new Set(ScanPlan.buildScanUrls(MASTER_LIST));
  const same = pages.size === full.size && [...full].every((u) => pages.has(u));
  check("10 兩階段涵蓋＝全量掃描涵蓋", same, "stage2=" + pages.size + " full=" + full.size);
}

// 11. 第一階段失敗可退回全量掃描：備援按鈕與流程存在
{
  const html = read("popup.html");
  const js = read("popup.js");
  check("11 備援全量掃描存在", html.includes('id="scanFull"') && js.includes("runFullScan") && js.includes("startRound"));
}

console.log("\n結果：" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);

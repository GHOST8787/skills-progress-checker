// Skills 進度檢查 — 掃描計畫與狀態判定（純邏輯，無 DOM / chrome 相依，供 popup.js 與測試共用）
// Issue #1 問題一／問題二的核心：單輪掃描（scanId）為權威狀態、兩階段掃描只開缺項頁面。
(function (root) {
  "use strict";

  // 兩筆 scanId 是否同一輪（舊資料沒有 scanId 欄位，與「從未掃描」的 null 視為同輪）
  function sameRound(recordScanId, latestScanId) {
    return (recordScanId || null) === (latestScanId || null);
  }

  function isShop(c) { return c.platform === "skillshop"; }

  function idOf(u) {
    const m = (u || "").match(/course_templates\/(\d+)/);
    return m ? m[1] : null;
  }

  // 在 progress 裡的鍵：skills.google 用數字 id，Skillshop 用認證 code（與 content.js 寫入一致）
  function keyOf(c) {
    if (isShop(c)) return c.code || null;
    return idOf(c.u);
  }

  function isDetectable(c) {
    if (isShop(c)) return !!c.code;
    return !!idOf(c.u);
  }

  // 一門課的狀態：ok / todo / unseen / shop。
  // 只承認「最新一輪」的紀錄：舊輪的完成不沿用（問題一驗收：本輪未掃到視為未完成）。
  function courseState(course, progress, latestScanId) {
    const key = keyOf(course);
    if (!key) return "shop"; // 無法偵測（例如沒有 code 的 skillshop），比照手動
    const p = progress[key];
    const current = !!p && sameRound(p.scanId, latestScanId);
    if (isShop(course)) {
      // Credential Wallet 只列已取得；非本輪的紀錄不算數，維持「待確認」樣式
      return current && p.completed ? "ok" : "shop";
    }
    if (!p) return "unseen";
    if (!current) return "unseen"; // 舊輪資料：不沿用，標回「未抓到」
    return p.completed ? "ok" : "todo";
  }

  // 一門非 Skillshop 課所屬的掃描頁：路徑課 → 路徑頁；獨立課 → 課程頁
  function pageOf(c) {
    const pm = (c.u || "").match(/^(\/paths\/\d+)\//);
    if (pm) return pm[1];
    const im = (c.u || "").match(/^\/course_templates\/\d+/);
    return im ? im[0] : null;
  }

  // 全量掃描頁面清單（手動備援用；與改版前行為一致）
  function buildScanUrls(list) {
    const paths = new Set();
    const standalone = new Set();
    list.programs.forEach((p) =>
      p.courses.forEach((c) => {
        if (isShop(c)) return;
        const page = pageOf(c);
        if (!page) return;
        if (page.startsWith("/paths/")) paths.add(page);
        else standalone.add(page);
      })
    );
    const urls = [];
    paths.forEach((p) => urls.push(list.skillsBase + p + "?locale=zh_TW"));
    standalone.forEach((s) => urls.push(list.skillsBase + s + "?locale=zh_TW"));
    return urls;
  }

  // 第二階段要開的頁面：本輪（latestScanId）還沒確認完成的 skills.google 課所屬頁面。
  // Skillshop 課不列入：其所屬頁（認證頁）第一階段已開過，缺項代表未取得或未登入，
  // 重開同一頁不會有新資訊，未登入情境由「全量掃描」備援處理。
  function missingPages(list, progress, latestScanId) {
    const pages = new Set();
    list.programs.forEach((p) =>
      p.courses.forEach((c) => {
        if (isShop(c) || !isDetectable(c)) return;
        if (courseState(c, progress, latestScanId) === "ok") return;
        const page = pageOf(c);
        if (page) pages.add(page);
      })
    );
    return [...pages].map((p) => list.skillsBase + p + "?locale=zh_TW");
  }

  const ScanPlan = { sameRound, isShop, idOf, keyOf, isDetectable, courseState, pageOf, buildScanUrls, missingPages };

  if (typeof module !== "undefined" && module.exports) module.exports = ScanPlan;
  else root.ScanPlan = ScanPlan;
})(typeof self !== "undefined" ? self : this);

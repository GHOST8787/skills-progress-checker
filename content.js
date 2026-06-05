// Skills 進度檢查 — content script（累積式偵測，靜默版）
// 在 skills.google 任何頁面掃描 ql-activity-card，抓「課程層級」的完成狀態，
// 用 course_templates/{id} 當鍵，累積存進 chrome.storage.local.progress。
// 不在頁面顯示任何東西；純讀取、不點擊、不送出。
// 依 COWORK 的 DOM 契約：核心資料都在 light-DOM 屬性，免穿 shadow root。

(() => {
  "use strict";

  const TEMPLATE_RE = /course_templates\/(\d+)/;

  function extractId(s) {
    const m = (s || "").match(TEMPLATE_RE);
    return m ? m[1] : null;
  }

  // 掃描目前頁面，收集 {id: {completed, name, url}}
  function collect() {
    const updates = {};

    // 1) 路徑頁 / 列表頁：課程層級卡片（type=course）
    document.querySelectorAll('ql-activity-card[type="course"]').forEach((card) => {
      const path = card.getAttribute("path") || "";
      const id = extractId(path);
      if (!id) return;
      updates[id] = {
        completed: card.hasAttribute("completed"),
        name: card.getAttribute("name") || "",
        url: path,
      };
    });

    // 2) 課程內頁：判斷「這門課自己」是否完成（.course-completed 為完成標記）
    const selfId = extractId(location.pathname);
    if (selfId) {
      const isCourseInner =
        !!document.querySelector(".course-completed") ||
        document.querySelectorAll("ql-activity-card").length > 0;
      if (isCourseInner) {
        const done = !!document.querySelector(".course-completed");
        const h1 = document.querySelector("h1");
        const prev = updates[selfId] || {};
        updates[selfId] = {
          completed: done || prev.completed === true,
          name: prev.name || (h1 ? h1.textContent.trim() : ""),
          url: location.pathname,
        };
      }
    }

    return updates;
  }

  // 把這次收集到的併入 storage（completed 採 sticky-true，不讓 true 被後續覆蓋掉）
  function save(updates) {
    const ids = Object.keys(updates);
    if (!ids.length) return;
    if (typeof chrome === "undefined" || !chrome.storage) return;

    chrome.storage.local.get(["progress"], (data) => {
      const progress = data.progress || {};
      let changed = false;
      ids.forEach((id) => {
        const u = updates[id];
        const prev = progress[id] || {};
        const completed = !!(u.completed || prev.completed);
        const name = u.name || prev.name || "";
        const url = u.url || prev.url || "";
        // 只有內容有變才寫，減少不必要的寫入
        if (prev.completed !== completed || prev.name !== name || prev.url !== url) {
          progress[id] = { completed, name, url, ts: Date.now() };
          changed = true;
        }
      });
      if (changed) chrome.storage.local.set({ progress });
    });
  }

  function scan() {
    save(collect());
  }

  // SPA 卡片是非同步載入，而且頁面常駐動畫會讓 MutationObserver+debounce 被餓死永不觸發，
  // 所以改用固定間隔輪詢：每 2 秒掃一次（save 內有 changed 判斷，沒變不寫入，成本極低）。
  scan();
  setInterval(scan, 2000);
})();

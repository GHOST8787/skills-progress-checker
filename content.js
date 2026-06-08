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

  // 從母清單取出所有 Skillshop 認證的代碼（master-list.js 由 manifest 先載入，提供全域 MASTER_LIST）
  function skillshopCerts() {
    if (typeof MASTER_LIST === "undefined") return [];
    const out = [];
    MASTER_LIST.programs.forEach((p) =>
      p.courses.forEach((c) => {
        if (c.platform === "skillshop" && c.code) out.push({ code: c.code, name: c.title });
      })
    );
    return out;
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

    // 2) 公開 profile 頁（/public_profiles/...）：每個完成的徽章對應一個
    //    <ql-dialog id="public-profile-award-modal-N">，彈窗內 <ql-button href="/course_templates/{id}">。
    //    出現在公開頁 = 已完成，直接收集這些 course id 標 completed。
    if (location.pathname.includes("/public_profiles/")) {
      document
        .querySelectorAll('ql-dialog[id^="public-profile-award-modal"]')
        .forEach((dlg) => {
          const link = dlg.querySelector('[href*="course_templates/"]');
          if (!link) return;
          const id = extractId(link.getAttribute("href"));
          if (!id) return;
          updates[id] = {
            completed: true,
            name: dlg.getAttribute("headline") || (updates[id] && updates[id].name) || "",
            url: link.getAttribute("href"),
          };
        });
    }

    // 2b) Skillshop 認證頁（docebosaas Credential Wallet）：此頁只列出「已取得」的認證，
    //     故頁面文字若含某認證的 code，即代表該認證已取得。用 code 比對不依賴特定 class，
    //     Docebo 改版面也不會壞。
    if (location.hostname === "skillshop.docebosaas.com") {
      const text = document.body ? document.body.innerText : "";
      if (text) {
        skillshopCerts().forEach(({ code, name }) => {
          if (text.includes(code)) {
            updates[code] = { completed: true, name, url: location.href };
          }
        });
      }
    }

    // 3) 課程內頁：判斷「這門課自己」是否完成（.course-completed 為完成標記）
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

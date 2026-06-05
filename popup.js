// Skills 進度檢查 — popup（分學程進度清單）
// 用母清單(MASTER_LIST) ∩ chrome.storage.local.progress 算出每個學程的完成度。
// 狀態三態：完成(progress 有且 completed) / 未完成(progress 有但未完成) / 未抓到(progress 沒這門)。
// Skillshop 課與總整課程不算進自動分母，單獨標「需手動確認」。

(() => {
  "use strict";

  // 本機預覽用的假進度（裝進 Chrome 後走真實 chrome.storage）
  const DEMO_PROGRESS = {
    "1268": { completed: true, name: "生成式 AI：不只是聊天機器人", url: "/course_templates/1268" },
    "1265": { completed: true, name: "生成式 AI：瞭解基礎概念", url: "/course_templates/1265" },
    "1261": { completed: true, name: "生成式 AI：掌握幕後技術與環境", url: "/course_templates/1261" },
    "1266": { completed: false, name: "生成式 AI 應用程式", url: "/course_templates/1266" },
    "153": { completed: true, name: "Cloud 運算基礎知識", url: "/course_templates/153" },
    "946": { completed: false, name: "Innovating with Google Cloud AI", url: "/paths/9/course_templates/946" },
  };

  const $ = (id) => document.getElementById(id);

  let currentProgress = {}; // 記住最後一次的進度，切換「隱藏已完成」時免重抓
  function isHideDone() { const e = $("hideDone"); return !!(e && e.checked); }

  function idOf(u) {
    const m = (u || "").match(/course_templates\/(\d+)/);
    return m ? m[1] : null;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );
  }

  // 把母清單的 u 補成完整網址（skillshop 已是完整 http，skills.google 補 base）
  function fullUrl(u) {
    if (/^https?:/i.test(u)) return u;
    return MASTER_LIST.skillsBase + u + (u.includes("?") ? "" : "?locale=zh_TW");
  }

  function loadProgress(cb) {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["progress"], (data) => cb(data.progress || {}));
    } else {
      cb(DEMO_PROGRESS);
    }
  }

  // 一門課的狀態：ok / todo / unseen / shop
  function courseState(course, progress) {
    if (course.platform === "skillshop") return "shop";
    const id = idOf(course.u);
    if (!id) return "shop"; // 沒有可偵測 id，比照手動
    const p = progress[id];
    if (!p) return "unseen";
    return p.completed ? "ok" : "todo";
  }

  const STATE_ICON = {
    ok: '<span class="st st-ok">✓</span>',
    todo: '<span class="st st-todo">✗</span>',
    unseen: '<span class="st st-unseen">—</span>',
    shop: '<span class="st st-unseen">○</span>',
  };

  function render(progress) {
    currentProgress = progress;
    const hideDone = isHideDone();
    let totalShop = 0;
    const seenIds = new Set(), doneIds = new Set();

    const sections = MASTER_LIST.programs.map((prog) => {
      const detect = prog.courses.filter((c) => c.platform !== "skillshop" && idOf(c.u));
      const shop = prog.courses.filter((c) => c.platform === "skillshop" || !idOf(c.u));

      let done = 0;
      const rows = prog.courses
        .map((c) => {
          const state = courseState(c, progress);
          if (state === "ok") done++;
          if (hideDone && state === "ok") return ""; // 隱藏已完成（計數已先算入，不影響 X/總數）
          const tag =
            state === "shop" ? '<span class="c-tag tag-shop">Skillshop</span>'
            : state === "unseen" ? '<span class="c-tag tag-unseen">未抓到</span>'
            : "";
          const url = fullUrl(c.u);
          const link =
            '<a class="course" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
            STATE_ICON[state] +
            '<span class="c-name">' + escapeHtml(c.title) + "</span>" +
            tag +
            "</a>";
          // 已完成不給勾；其餘（未完成 / 未抓到 / Skillshop）可勾選批次開啟
          const pick =
            state === "ok"
              ? '<span class="c-pick-spacer"></span>'
              : '<input type="checkbox" class="c-pick" data-url="' + escapeHtml(url) + '" />';
          return '<div class="course-row">' + pick + link + "</div>";
        })
        .join("");

      // 累計（去重，跨學程同一門課只算一次）
      detect.forEach((c) => { const id = idOf(c.u); seenIds.add(id); if (progress[id] && progress[id].completed) doneIds.add(id); });
      totalShop += shop.length;

      const allDone = detect.length > 0 && done >= detect.length;
      const note =
        '<div class="prog-note">可自動偵測 ' + detect.length + " 門"
        + (shop.length ? "，另有 " + shop.length + " 門需手動確認" : "")
        + (prog.note ? "<br>" + escapeHtml(prog.note) : "") + "</div>";

      return (
        '<div class="prog">' +
        '<div class="prog-head">' +
        '<span class="caret">▶</span>' +
        '<span class="prog-name">' + escapeHtml(prog.name) + "</span>" +
        '<span class="prog-count' + (allDone ? " all-done" : "") + '">' + done + " / " + detect.length + "</span>" +
        "</div>" +
        '<div class="prog-body">' + rows + note + "</div>" +
        "</div>"
      );
    });

    const uniqueDetectTotal = (() => {
      const s = new Set();
      MASTER_LIST.programs.forEach((p) => p.courses.forEach((c) => { const id = idOf(c.u); if (c.platform !== "skillshop" && id) s.add(id); }));
      return s.size;
    })();

    $("summary").innerHTML =
      "母清單可偵測 <b>" + uniqueDetectTotal + "</b> 門　・　已完成 <b>" + doneIds.size +
      "</b>　・　Skillshop 待手動 <b>" + totalShop + "</b>";

    $("list").innerHTML = sections.join("");

    // 展開 / 收合
    [...document.querySelectorAll(".prog-head")].forEach((head) => {
      head.addEventListener("click", () => head.parentElement.classList.toggle("open"));
    });
    // 預設展開第一個學程
    const first = document.querySelector(".prog");
    if (first) first.classList.add("open");

    // 重畫後核取方塊全為未勾，更新「開啟選取」計數與全選狀態
    updatePickCount();
  }

  // ---- 未完成課程：勾選批次開啟 ----
  function pickBoxes() { return [...document.querySelectorAll(".c-pick")]; }

  function updatePickCount() {
    const boxes = pickBoxes();
    const checked = boxes.filter((b) => b.checked);
    const btn = $("openPicked");
    const all = $("pickAll");
    if (btn) {
      btn.textContent = "開啟選取 (" + checked.length + ")";
      btn.disabled = checked.length === 0;
    }
    if (all) all.checked = boxes.length > 0 && checked.length === boxes.length;
  }

  function openSelected() {
    const urls = pickBoxes().filter((b) => b.checked).map((b) => b.getAttribute("data-url"));
    if (!urls.length) return;
    if (typeof chrome === "undefined" || !chrome.tabs) {
      setStatus("（預覽模式無法開分頁，請在 Chrome 擴充內使用）");
      return;
    }
    // 在背景分頁逐一開啟，不搶走目前焦點
    urls.forEach((u) => chrome.tabs.create({ url: u, active: false }));
    // 開完即清空勾選，避免重複開啟同幾門
    pickBoxes().forEach((b) => { b.checked = false; });
    updatePickCount();
    setStatus("已在背景開啟 " + urls.length + " 門課程分頁");
  }

  // ---- 一鍵掃描全部 ----
  function setStatus(msg) { const e = $("scanStatus"); if (e) e.textContent = msg; }

  // 從母清單推出「要開哪些頁面才能掃到所有可偵測課程」：
  // 路徑前綴的課 → 開該路徑頁（一頁含整批）；獨立課（無路徑）→ 開該課程頁。
  function buildScanUrls() {
    const paths = new Set();
    const standalone = new Set();
    MASTER_LIST.programs.forEach((p) =>
      p.courses.forEach((c) => {
        if (c.platform === "skillshop") return;
        const pm = c.u.match(/^(\/paths\/\d+)\//);
        if (pm) paths.add(pm[1]);
        else {
          const im = c.u.match(/^\/course_templates\/\d+/);
          if (im) standalone.add(im[0]);
        }
      })
    );
    const urls = [];
    paths.forEach((p) => urls.push(MASTER_LIST.skillsBase + p + "?locale=zh_TW"));
    standalone.forEach((s) => urls.push(MASTER_LIST.skillsBase + s + "?locale=zh_TW"));
    return urls;
  }

  function scanAll() {
    const btn = $("scanAll");
    if (typeof chrome === "undefined" || !chrome.tabs) {
      setStatus("（預覽模式無法開分頁，請在 Chrome 擴充內使用）");
      return;
    }
    const urls = buildScanUrls();
    const WAIT = 14; // 秒：給分頁載入 + content script 掃描的時間
    btn.disabled = true;

    const ids = [];
    urls.forEach((u) =>
      chrome.tabs.create({ url: u, active: false }, (tab) => { if (tab) ids.push(tab.id); })
    );

    let remain = WAIT;
    setStatus("正在掃描中，請靜待 " + remain + " 秒…（背景開了 " + urls.length + " 頁）");
    const cd = setInterval(() => {
      remain -= 1;
      if (remain > 0) setStatus("正在掃描中，請靜待 " + remain + " 秒…");
    }, 1000);

    setTimeout(() => {
      clearInterval(cd);
      if (chrome.tabs && ids.length) chrome.tabs.remove(ids, () => {});
      loadProgress((progress) => {
        render(progress);
        setStatus("掃描完成，已更新總表");
        btn.disabled = false;
      });
    }, WAIT * 1000);
  }

  // ---- 掃公開頁（貼公開 profile / Skillshop 網址交叉驗證）----
  function setPubStatus(msg) { const e = $("pubStatus"); if (e) e.textContent = msg; }

  function savePublicUrls() {
    const v = {
      skills: ($("skillsUrl").value || "").trim(),
      shop: ($("shopUrl").value || "").trim(),
    };
    if (typeof chrome !== "undefined" && chrome.storage) chrome.storage.local.set({ publicUrls: v });
    setPubStatus("已儲存網址");
  }

  function scanPublic() {
    const btn = $("scanPub");
    if (typeof chrome === "undefined" || !chrome.tabs) {
      setPubStatus("（預覽模式無法開分頁，請在 Chrome 擴充內使用）");
      return;
    }
    const urls = [];
    const sUrl = ($("skillsUrl").value || "").trim();
    const shUrl = ($("shopUrl").value || "").trim();
    if (/^https?:\/\//i.test(sUrl)) urls.push(sUrl);
    if (/^https?:\/\//i.test(shUrl)) urls.push(shUrl);
    if (!urls.length) { setPubStatus("請先填入至少一個公開頁網址"); return; }

    // 掃描前先記住網址，省得每次重打
    savePublicUrls();

    const WAIT = 10; // 公開頁是伺服器端渲染、載入快，10 秒足夠
    btn.disabled = true;
    const ids = [];
    urls.forEach((u) => chrome.tabs.create({ url: u, active: false }, (tab) => { if (tab) ids.push(tab.id); }));

    let remain = WAIT;
    setPubStatus("正在掃描中，請靜待 " + remain + " 秒…");
    const cd = setInterval(() => {
      remain -= 1;
      if (remain > 0) setPubStatus("正在掃描中，請靜待 " + remain + " 秒…");
    }, 1000);

    setTimeout(() => {
      clearInterval(cd);
      if (chrome.tabs && ids.length) chrome.tabs.remove(ids, () => {}); // 背景分頁掃完自動關閉
      loadProgress((progress) => {
        render(progress);
        setPubStatus("掃描完成，已更新總表");
        btn.disabled = false;
      });
    }, WAIT * 1000);
  }

  const savePubBtn = $("savePub");
  if (savePubBtn) savePubBtn.addEventListener("click", savePublicUrls);
  const scanPubBtn = $("scanPub");
  if (scanPubBtn) scanPubBtn.addEventListener("click", scanPublic);

  // 批次開啟綁定：list 內 checkbox 用事件委派（render 重畫不掉 listener）
  const listEl = $("list");
  if (listEl) listEl.addEventListener("change", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("c-pick")) updatePickCount();
  });
  const pickAllBox = $("pickAll");
  if (pickAllBox) pickAllBox.addEventListener("change", () => {
    pickBoxes().forEach((b) => { b.checked = pickAllBox.checked; });
    updatePickCount();
  });
  const openBtn = $("openPicked");
  if (openBtn) openBtn.addEventListener("click", openSelected);

  const scanBtn = $("scanAll");
  if (scanBtn) scanBtn.addEventListener("click", scanAll);

  // 「隱藏已完成」核取方塊：切換即重畫，並記住勾選狀態
  const hideBox = $("hideDone");
  if (hideBox) {
    hideBox.addEventListener("change", () => {
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.set({ hideDone: hideBox.checked });
      }
      render(currentProgress);
    });
  }

  // 先還原勾選偏好，再載入進度渲染
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.get(["hideDone", "publicUrls"], (d) => {
      if (hideBox) hideBox.checked = !!d.hideDone;
      const pu = d.publicUrls || {};
      if ($("skillsUrl") && pu.skills) $("skillsUrl").value = pu.skills;
      if ($("shopUrl") && pu.shop) $("shopUrl").value = pu.shop;
      loadProgress(render);
    });
  } else {
    loadProgress(render);
  }
})();

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

  // Skillshop 認證頁（Credential Wallet）：「我的活動 > 認證」分頁，登入態下對所有帳號是同一網址
  const SKILLSHOP_CERT_URL = "https://skillshop.docebosaas.com/legacy/lms/index.php?r=myActivities/index&tab=certification";

  const $ = (id) => document.getElementById(id);

  let currentProgress = {}; // 記住最後一次的進度，切換「隱藏已完成」時免重抓
  let latestScanId = null;  // 最新一輪掃描代號；只承認這一輪的紀錄（issue #1 問題一）
  function isHideDone() { const e = $("hideDone"); return !!(e && e.checked); }

  function idOf(u) { return ScanPlan.idOf(u); }

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
      chrome.storage.local.get(["progress", "scanId"], (data) => {
        latestScanId = data.scanId || null;
        cb(data.progress || {});
      });
    } else {
      cb(DEMO_PROGRESS);
    }
  }

  function isShop(c) { return ScanPlan.isShop(c); }
  function isDetectable(c) { return ScanPlan.isDetectable(c); }
  function keyOf(c) { return ScanPlan.keyOf(c); }

  // 一門課的狀態：ok / todo / unseen / shop（只承認最新一輪的紀錄，舊輪不沿用）
  function courseState(course, progress) {
    return ScanPlan.courseState(course, progress, latestScanId);
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
      const detect = prog.courses.filter(isDetectable);
      const shop = prog.courses.filter((c) => !isDetectable(c));

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

      // 累計（去重，跨學程同一門課只算一次；只算最新一輪確認的完成）
      detect.forEach((c) => { const k = keyOf(c); if (!k) return; seenIds.add(k); if (courseState(c, progress) === "ok") doneIds.add(k); });
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
      MASTER_LIST.programs.forEach((p) => p.courses.forEach((c) => { if (isDetectable(c)) { const k = keyOf(c); if (k) s.add(k); } }));
      return s.size;
    })();

    $("summary").innerHTML =
      "母清單可偵測 <b>" + uniqueDetectTotal + "</b> 門　・　已完成 <b>" + doneIds.size + "</b>"
      + (totalShop ? "　・　待手動 <b>" + totalShop + "</b>" : "");

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

  // ---- 一鍵掃描（公開 profile + 各學程頁 + Skillshop 認證頁）----
  function setStatus(msg) { const e = $("scanStatus"); if (e) e.textContent = msg; }

  const WAIT = 16; // 秒：配合 Skillshop legacy LMS iframe 載入較慢

  // 產生本輪掃描代號並寫入 storage（content.js 寫入、popup 判定都認這一輪）
  function startRound(cb) {
    const scanId = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    chrome.storage.local.set({ scanId }, () => {
      latestScanId = scanId;
      cb(scanId);
    });
  }

  // 背景開一批分頁 → 等 WAIT 秒 → 關閉 → 回報進度
  function openBatch(urls, label, done) {
    const ids = [];
    urls.forEach((u) =>
      chrome.tabs.create({ url: u, active: false }, (tab) => { if (tab) ids.push(tab.id); })
    );
    let remain = WAIT;
    setStatus(label + "，請靜待 " + remain + " 秒…（背景開了 " + urls.length + " 頁）");
    const cd = setInterval(() => {
      remain -= 1;
      if (remain > 0) setStatus(label + "，請靜待 " + remain + " 秒…");
    }, 1000);
    setTimeout(() => {
      clearInterval(cd);
      if (chrome.tabs && ids.length) chrome.tabs.remove(ids, () => {});
      loadProgress(done);
    }, WAIT * 1000);
  }

  // 掃描前共同檢查：兩個網址都有填、且已按儲存；通過才執行 run(skillsUrl, shopUrl, btn)
  function guardScan(btnId, run) {
    const btn = $(btnId);
    if (typeof chrome === "undefined" || !chrome.tabs) {
      setStatus("（預覽模式無法開分頁，請在 Chrome 擴充內使用）");
      return;
    }
    const sBox = ($("skillsUrl").value || "").trim();
    const shBox = ($("shopUrl").value || "").trim();
    if (!sBox || !shBox) {
      setStatus("請先填入兩個網址（Google Skills 公開 profile 與 Skillshop 認證頁）");
      return;
    }
    chrome.storage.local.get(["publicUrls"], (d) => {
      const saved = d.publicUrls || {};
      if (saved.skills !== sBox || saved.shop !== shBox) {
        setStatus("網址有更動，請先按「儲存網址」再掃描");
        return;
      }
      run(sBox, shBox, btn);
    });
  }

  // 一鍵掃描（issue #1 問題二：兩階段）：
  // 第一階段只開「公開 profile + Skillshop 認證頁」2 頁；
  // 還有未確認的課才進第二階段，只開缺項所屬的路徑頁／課程頁。
  function runTwoStageScan(skillsUrl, shopUrl, btn) {
    btn.disabled = true;
    startRound(() => {
      const stage1 = new Set();
      if (/^https?:\/\//i.test(skillsUrl)) stage1.add(skillsUrl);
      if (/^https?:\/\//i.test(shopUrl)) stage1.add(shopUrl);
      openBatch([...stage1], "第一階段（公開 profile＋認證頁）", (progress) => {
        const stage2 = ScanPlan.missingPages(MASTER_LIST, progress, latestScanId);
        if (!stage2.length) {
          render(progress);
          setStatus("掃描完成（第一階段即全數確認，共開 " + stage1.size + " 頁）");
          btn.disabled = false;
          return;
        }
        openBatch(stage2, "第二階段（補掃 " + stage2.length + " 個缺項頁面）", (p2) => {
          render(p2);
          setStatus("掃描完成，已更新總表（共開 " + (stage1.size + stage2.length) + " 頁）");
          btn.disabled = false;
        });
      });
    });
  }

  // 全量掃描（手動備援）：一次開「公開 profile + 各學程頁 + Skillshop 認證頁」。
  // 第一階段異常（未登入、頁面壞掉、結果明顯不對）時用這顆重掃。
  function runFullScan(skillsUrl, shopUrl, btn) {
    btn.disabled = true;
    startRound(() => {
      const set = new Set();
      if (/^https?:\/\//i.test(skillsUrl)) set.add(skillsUrl);
      if (/^https?:\/\//i.test(shopUrl)) set.add(shopUrl);
      ScanPlan.buildScanUrls(MASTER_LIST).forEach((u) => set.add(u));
      const hasShop = MASTER_LIST.programs.some((p) => p.courses.some((c) => c.platform === "skillshop" && c.code));
      if (hasShop) set.add(SKILLSHOP_CERT_URL);
      openBatch([...set], "全量掃描", (progress) => {
        render(progress);
        setStatus("全量掃描完成，已更新總表");
        btn.disabled = false;
      });
    });
  }

  function scanAll() { guardScan("scanAll", runTwoStageScan); }
  function scanFull() { guardScan("scanFull", runFullScan); }

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

  const savePubBtn = $("savePub");
  if (savePubBtn) savePubBtn.addEventListener("click", savePublicUrls);

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
  const scanFullBtn = $("scanFull");
  if (scanFullBtn) scanFullBtn.addEventListener("click", scanFull);

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
      // Skillshop 認證頁網址固定，沒存過就預設帶入
      if ($("shopUrl")) $("shopUrl").value = pu.shop || SKILLSHOP_CERT_URL;
      loadProgress(render);
    });
  } else {
    loadProgress(render);
  }
})();

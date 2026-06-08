# Skills 學程進度檢查（Chrome 擴充功能）

在 [Google Skills](https://www.skills.google) 課程／路徑頁**靜默偵測**課程完成狀態，對照「Google 數位人才探索計畫」的母清單，於工具列彈窗顯示三個學程的完成進度。純讀取頁面，不點擊、不送出任何資料。

## 功能

- **分學程進度清單**：AI 職場通識 / 數位行銷 / Google Cloud，每門課標 ✓ 已完成、✗ 未完成、— 未抓到、○ Skillshop（待掃描）。
- **一鍵掃描**：先確認「Google Skills 公開 profile」與「Skillshop 認證頁」兩個網址都已填寫並儲存，按下後在背景一次開啟「公開 profile + 各學程頁 + Skillshop 認證頁」掃描，掃完關閉並更新總表。
- **兩邊互相補強**：skills.google 的課同時用「公開 profile」與「各學程頁」偵測，任一邊確認完成即標 ✓，降低單一頁面沒載好造成的漏抓。
- **隱藏已完成**：核取方塊勾選後只顯示還沒做的課（計數不受影響，狀態會記住）。
- **Skillshop 認證偵測**：數位行銷前 5 門為 Skillshop 認證，登入 Skillshop 後由「一鍵掃描」掃 Skillshop 認證頁（Credential Wallet），以認證代碼比對標記完成。
- **手動確認項目**：僅總整課程（走官方 LINE）無法自動偵測，單獨標記。

## 安裝（開發版）

1. `chrome://extensions` → 開啟右上「開發人員模式」
2. 點「載入未封裝項目」→ 選本資料夾
3. 登入 skills.google 與 Skillshop，點工具列圖示 → 填入兩個網址並「儲存網址」→「一鍵掃描」

## 運作方式

- 內容腳本在 skills.google 頁面讀取 `ql-activity-card` 的 `completed` 屬性，以 `course_templates/{id}` 配對母清單。
- Skillshop 認證頁（`skillshop.docebosaas.com`）的認證表格在同網域 iframe 內，內容腳本以 `all_frames` 進到 iframe，比對頁面文字是否含母清單的認證代碼（`code`）。
- 完成狀態累積存於 `chrome.storage.local`（鍵為 `course_templates` 數字 id 或 Skillshop 認證代碼）。
- 母清單見 `master-list.js`（2026-06-05 收集，三學程）。

## 檔案

| 檔案 | 用途 |
|---|---|
| `manifest.json` | 擴充設定（MV3） |
| `content.js` | 頁面偵測（靜默記錄） |
| `popup.html` / `popup.js` | 工具列彈窗總表 |
| `master-list.js` | 計畫課程母清單 |
| `design-demos.html` | 設計方向草稿（非運作所需） |

## 待辦

- [ ] **上架 Chrome Web Store**：打包 zip（排除 `store-assets/`、`design-demos.html`、`README.md`）。圖示已備妥（`icons/icon{16,48,128}.png`，manifest 已設 `icons` 與 `action.default_icon`）。

## 限制

- Skillshop 認證偵測需登入 Skillshop；認證頁只列出「目前有效」的認證（過期且未勾選顯示的不會被偵測）。
- 總整課程走官方 LINE，不在任何平台，無法自動偵測，需手動確認。
- 最外框圓角依賴新版 Chrome（約 114 以上）。

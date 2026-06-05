# Skills 學程進度檢查（Chrome 擴充功能）

在 [Google Skills](https://www.skills.google) 課程／路徑頁**靜默偵測**課程完成狀態，對照「Google 數位人才探索計畫」的母清單，於工具列彈窗顯示三個學程的完成進度。純讀取頁面，不點擊、不送出任何資料。

## 功能

- **分學程進度清單**：AI 職場通識 / 數位行銷 / Google Cloud，每門課標 ✓ 已完成、✗ 未完成、— 未抓到。
- **一鍵掃描全部**：自動在背景開啟所有相關路徑頁與獨立課頁，掃描後關閉並更新總表。
- **隱藏已完成**：核取方塊勾選後只顯示還沒做的課（計數不受影響，狀態會記住）。
- **手動確認項目**：數位行銷前 5 門 Skillshop 認證、總整課程（走官方 LINE）無法自動偵測，單獨標記。

## 安裝（開發版）

1. `chrome://extensions` → 開啟右上「開發人員模式」
2. 點「載入未封裝項目」→ 選本資料夾
3. 登入 skills.google，點工具列圖示 →「一鍵掃描全部」

## 運作方式

- 內容腳本在 skills.google 頁面讀取 `ql-activity-card` 的 `completed` 屬性，以 `course_templates/{id}` 配對母清單。
- 完成狀態累積存於 `chrome.storage.local`。
- 母清單見 `master-list.js`（2026-06-05 收集，59 門、三學程）。

## 檔案

| 檔案 | 用途 |
|---|---|
| `manifest.json` | 擴充設定（MV3） |
| `content.js` | 頁面偵測（靜默記錄） |
| `popup.html` / `popup.js` | 工具列彈窗總表 |
| `master-list.js` | 計畫課程母清單 |
| `design-demos.html` | 設計方向草稿（非運作所需） |

## 待辦

- [ ] **圖示／Logo**：尚未加入。上架 Chrome Web Store 前需補 16 / 48 / 128 px 圖示，並在 `manifest.json` 加入 `icons` 與 `action.default_icon` 欄位。

## 限制

- Skillshop 認證與總整課程不在 skills.google，無法自動偵測，需手動確認。
- 最外框圓角依賴新版 Chrome（約 114 以上）。

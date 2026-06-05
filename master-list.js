// 母清單 — 計畫要求完成的課程（COWORK 於 2026-06-05 從 growonairtw + skills.google 收集）
// 配對規則：只比對 course_templates/{id} 的數字 id，忽略 /paths/{X}/ 前綴。
// platform: "skillshop" 的課在 skills.google 偵測不到，總表單獨列「需手動確認」。
const MASTER_LIST = {
  skillsBase: "https://www.skills.google",
  // 總整課程（capstone）走官方 LINE，不在任何平台偵測得到，僅提醒用
  capstoneNote: "另需完成總整課程（走官方 LINE，無法自動偵測）",
  programs: [
    {
      key: "ai-for-generalists",
      name: "AI 職場通識學程",
      courses: [
        { title: "生成式 AI：不只是聊天機器人", u: "/course_templates/1268" },
        { title: "生成式 AI：瞭解基礎概念", u: "/course_templates/1265" },
        { title: "生成式 AI：掌握幕後技術與環境", u: "/course_templates/1261" },
        { title: "生成式 AI 應用程式：徹底改變工作方式", u: "/course_templates/1266" },
        { title: "生成式 AI 代理：實現組織轉型", u: "/course_templates/1267" },
        { title: "Presentation Scripts with Gemini", u: "/paths/2480/course_templates/1433" },
        { title: "Supercharge Research with Gemini", u: "/paths/2480/course_templates/1498" },
        { title: "Streamline Event Planning with AI", u: "/paths/2480/course_templates/1490" },
        { title: "Content Generation with Gemini Made Easy", u: "/paths/2480/course_templates/1369" },
        { title: "Poke Holes in Your Strategy", u: "/paths/2480/course_templates/1363" },
        { title: "Exec Summaries with Gemini Gems", u: "/paths/2480/course_templates/1355" },
        { title: "Get Your Competitor's Playbook in Minutes", u: "/paths/2480/course_templates/1494" },
        { title: "Your Personal Feedback Agent", u: "/paths/2480/course_templates/1449" },
        { title: "Guided Learning with Gemini", u: "/paths/2480/course_templates/1481" },
        { title: "Intro to NotebookLM", u: "/paths/2480/course_templates/1418" },
        { title: "Project Notebooks", u: "/paths/2480/course_templates/1417" },
        { title: "NotebookLM Reports", u: "/paths/2480/course_templates/1466" },
        { title: "Customer Insights with NotebookLM", u: "/paths/2480/course_templates/1356" },
        { title: "NotebookLM for Competitive Edge", u: "/paths/2480/course_templates/1352" },
        { title: "NotebookLM for Market Research", u: "/paths/2480/course_templates/1422" },
        { title: "Research Hacks with NotebookLM", u: "/paths/2480/course_templates/1483" },
        { title: "Find the Story in Your Data", u: "/paths/2480/course_templates/1469" },
        { title: "NotebookLM Video Overviews", u: "/paths/2480/course_templates/1420" },
        { title: "Discover Sources in NotebookLM", u: "/paths/2480/course_templates/1424" },
        { title: "NotebookLM Mind Maps", u: "/paths/2480/course_templates/1415" },
        { title: "Gemini for Google Workspace 簡介", u: "/paths/249/course_templates/888" },
        { title: "Gemini in Gmail", u: "/paths/249/course_templates/896" },
        { title: "Gemini in Google Docs", u: "/paths/249/course_templates/914" },
        { title: "Gemini in Google Slides", u: "/paths/249/course_templates/931" },
        { title: "Gemini in Google Sheets", u: "/paths/249/course_templates/905" },
        { title: "Gemini in Google Meet", u: "/paths/249/course_templates/943" },
        { title: "Gemini in Google Drive", u: "/paths/249/course_templates/1135" },
        { title: "運用 Google Vids 製作精彩影片", u: "/paths/249/course_templates/1179" }
      ]
    },
    {
      key: "digital-marketing",
      name: "數位行銷學程",
      note: "前 5 門為 Skillshop 認證，不在 skills.google，需手動確認。",
      courses: [
        { title: "Google Analytics (分析) 認證", platform: "skillshop", u: "https://skillshop.docebosaas.com/learn/courses/9183" },
        { title: "AI 技術輔助高效廣告認證", platform: "skillshop", u: "https://skillshop.docebosaas.com/learn/courses/10953" },
        { title: "運用需求開發 創造需求並促成轉換", platform: "skillshop", u: "https://skillshop.docebosaas.com/learn/course/18132" },
        { title: "從業人員適用的 AI 技術輔助搜尋廣告基礎課程", platform: "skillshop", u: "https://skillshop.docebosaas.com/learn/courses/12565" },
        { title: "策略專家適用的 AI 技術輔助搜尋廣告基礎課程", platform: "skillshop", u: "https://skillshop.docebosaas.com/learn/courses/9003" },
        { title: "生成式 AI：瞭解基礎概念", u: "/course_templates/1265" },
        { title: "Gemini Gems – Your Ultimate Marketing Sidekick", u: "/paths/2480/course_templates/1349" },
        { title: "Content Generation with Gemini Made Easy", u: "/paths/2480/course_templates/1369" },
        { title: "Find the Story in Your Data", u: "/paths/2480/course_templates/1469" },
        { title: "Supercharge Research with Gemini", u: "/paths/2480/course_templates/1498" },
        { title: "Become an AI Art Director for Your World", u: "/paths/2480/course_templates/1474" },
        { title: "Streamline Event Planning with AI", u: "/paths/2480/course_templates/1490" },
        { title: "Customer Insights with NotebookLM", u: "/paths/2480/course_templates/1356" },
        { title: "NotebookLM for Market Research", u: "/paths/2480/course_templates/1422" },
        { title: "NotebookLM for Competitive Edge", u: "/paths/2480/course_templates/1352" }
      ]
    },
    {
      key: "google-cloud",
      name: "Google Cloud 學程",
      courses: [
        { title: "Cloud 運算基礎知識", u: "/course_templates/153" },
        { title: "Google Cloud 基礎架構", u: "/course_templates/154" },
        { title: "Google Cloud 的網路與安全性", u: "/course_templates/155" },
        { title: "Digital Transformation with Google Cloud", u: "/paths/9/course_templates/266" },
        { title: "Exploring Data Transformation with Google Cloud", u: "/paths/9/course_templates/267" },
        { title: "Innovating with Google Cloud Artificial Intelligence", u: "/paths/9/course_templates/946" },
        { title: "Scaling with Google Cloud Operations", u: "/paths/9/course_templates/271" },
        { title: "生成式 AI：瞭解基礎概念", u: "/course_templates/1265" },
        { title: "Vertex AI Studio 簡介", u: "/course_templates/552" },
        { title: "在 Agent Platform 設計提示", u: "/paths/118/course_templates/976" },
        { title: "負責任的 AI 技術：透過 Google Cloud 採用 AI 開發原則", u: "/paths/118/course_templates/388" }
      ]
    }
  ]
};

// filepath: backend/server.js
const express = require("express");
const cors = require("cors");
const { XMLParser } = require("fast-xml-parser");
const getRawBody = require("raw-body");

const app = express();

// 啟用 CORS
app.use(cors());

// 自定義中介軟體來處理大請求
app.use(async (req, res, next) => {
    try {
        req.body = await getRawBody(req, {
            length: req.headers["content-length"],
            limit: "10mb", // 設置請求體大小限制
            encoding: true,
        });
        next();
    } catch (err) {
        res.status(413).send("Payload Too Large");
    }
});

// API 路由
app.post("/post_xml_data", (req, res) => {
    const data = req.body; // 假設 data 是 XML 字串
    console.log("收到 XML 資料：", data);

    try {
        // 將 XML 轉換為 JavaScript 物件
        const parser = new XMLParser();
        const result = parser.parse(data);

        // 假設 pt:Actions 是資料的主要部分
        const actions = result["pt:NOAH_Patients_Export"]["pt:Actions"]["pt:Action"];

        // 按日期從近到遠排序
        const sortedActions = actions.sort((a, b) => {
            const dateA = new Date(a["pt:ActionDate"]);
            const dateB = new Date(b["pt:ActionDate"]);
            return dateB - dateA; // 日期近的排在前面
        });

        console.log("排序後的資料：", sortedActions);

        res.json({ message: "XML 已成功解析", sortedActions });
    } catch (error) {
        console.error("解析 XML 時發生錯誤：", error);
        res.status(500).json({ message: "解析 XML 失敗" });
    }
});

// 啟動伺服器
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`伺服器啟動於 http://localhost:${PORT}`);
});
// filepath: backend/server.js
const express = require("express");
const cors = require("cors");
const { XMLParser } = require("fast-xml-parser");
const getRawBody = require("raw-body");

const app = express();

// 啟用 CORS
app.use(cors({
    origin: ["https://your-frontend.vercel.app"], // 換成你的前端網址
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }));
  
  app.options('*', cors()); // 處理 preflight 請求

// 使用 express.json 中介軟體來解析 JSON 請求
app.use(express.json({ limit: '10mb' }));

// 自定義中介軟體來處理大請求 (用於非 JSON 請求)
app.use(async (req, res, next) => {
    if (req.headers["content-type"] !== "application/json") {
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
    } else {
        next();
    }
});

// API 路由
app.post("/post_xml_data", (req, res) => {
    // 检查Content-Type并顯示診斷資訊
    const contentType = (req.headers["content-type"] || '').toLowerCase().trim();
    console.log(`收到請求 Content-Type: '${contentType}'`);  // 診斷日誌
    
    // 允許包含charset等參數的XML Content-Type
    if (!contentType.startsWith('application/xml') && 
        !contentType.startsWith('text/xml')) {
        return res.status(400).json({ 
            message: `Invalid Content-Type: ${contentType}`,
            expected: ["application/xml", "text/xml"]
        });
    }

    // 直接获取XML原始数据
    const xmlData = req.body;
    console.log("收到 XML 資料:", xmlData.substring(0, 100) + "..."); // 只打印前100字
    
    // XML解析配置
    const parser = new XMLParser({
        ignoreAttributes: false,
        parseTagValue: false,
        allowBooleanAttributes: true
    });

    try {
        // 使用配置好的parser解析XML
        const result = parser.parse(xmlData);
        
        console.log("XML 解析成功 - 完整結構:", JSON.stringify(result, null, 2));

        // 安全獲取病患資料
        const patientData = result?.["pt:NOAH_Patients_Export"]?.["pt:Patient"];
        if (!patientData) {
            throw new Error("XML 結構不符合預期格式");
        }
        
        console.log("Patient data:", patientData);
        
        // 如果存在 Actions，則進行排序
        if (patientData["pt:Actions"]?.["pt:Action"]) {
            const actions = patientData["pt:Actions"]["pt:Action"];
            // 確保 actions 是陣列
            const actionsArray = Array.isArray(actions) ? actions : [actions];
            
            // 按日期從近到遠排序
            const sortedActions = actionsArray.sort((a, b) => {
                const dateA = new Date(a["pt:ActionDate"]);
                const dateB = new Date(b["pt:ActionDate"]);
                return dateB - dateA; // 日期近的排在前面
            });
            
            // 更新排序後的 actions
            patientData["pt:Actions"]["pt:Action"] = sortedActions;
        }

        res.json({ 
            message: "XML 已成功解析", 
            parsedData: result 
        });
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

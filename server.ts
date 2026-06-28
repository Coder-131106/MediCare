import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.post("/api/ocr-prescription", async (req, res) => {
  try {
    let { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "No image received" });

    const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const apiKey = process.env.GEMINI_API_KEY;

    // FIX: Using gemini-3.5-flash which showed up in your success list
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [
          { text: "Analyze this prescription. Extract medications into JSON: {\"medicines\": [{\"name\": \"Name\", \"dosage\": \"Dose\", \"time\": \"HH:mm\"}]}" },
          { inline_data: { mime_type: mimeType || "image/jpeg", data: cleanBase64 } }
        ]
      }],
      generationConfig: { response_mime_type: "application/json" }
    };

    console.log("AI: Processing with gemini-3.5-flash...");
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result: any = await response.json();

    if (!response.ok) {
      console.error("Google API Error:", JSON.stringify(result, null, 2));
      throw new Error(result.error?.message || "Google API Error");
    }

    const textResponse = result.candidates[0].content.parts[0].text;
    res.json(JSON.parse(textResponse));
    console.log("✅ Scan Successful with 3.5 Flash!");

  } catch (error: any) {
    console.error("SCANNER ERROR:", error.message);
    res.status(500).json({ error: "Scan failed", details: error.message });
  }
});

async function setupVite() {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
  app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server ready at http://localhost:${PORT}`));
}

setupVite();
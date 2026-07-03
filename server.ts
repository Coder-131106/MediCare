import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cors from "cors";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// --- GMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "madhumitha131106@gmail.com", 
    pass: "fgdp eaag cvme uucw",    
  },
});

let otpDatabase: { [key: string]: string } = {};

// 1. ROUTE: SEND OTP
app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  otpDatabase[email.toLowerCase()] = otp;
  try {
    await transporter.sendMail({
      from: '"MediCare Portal" <madhumitha131106@gmail.com>',
      to: email,
      subject: "Your MediCare Verification Code",
      html: `<div style="font-family:sans-serif; padding:20px; border:2px solid #4f46e5; border-radius:15px; max-width:400px;">
          <h2 style="color:#4f46e5; text-align:center;">Verification</h2>
          <h1 style="text-align:center; background:#f3f4f6; padding:15px; letter-spacing:10px; color:#111827; border-radius:8px;">${otp}</h1>
        </div>`,
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Failed to send email" }); }
});

// 2. ROUTE: VERIFY OTP
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (otpDatabase[email.toLowerCase()] === otp) {
    delete otpDatabase[email.toLowerCase()];
    res.json({ success: true });
  } else { res.status(400).json({ error: "Invalid OTP" }); }
});

// 3. FIXED: OCR PRESCRIPTION ROUTE
app.post("/api/ocr-prescription", async (req, res) => {
  try {
    let { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "No image received" });

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

    const payload = {
      contents: [{
        parts: [
          { text: "Analyze this prescription. Extract medications into JSON: {\"medicines\": [{\"name\": \"Name\", \"dosage\": \"Dose\", \"time\": \"\"}]}" },
          { inline_data: { mime_type: mimeType || "image/jpeg", data: cleanBase64 } }
        ]
      }],
      generationConfig: { response_mime_type: "application/json" }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result: any = await response.json();

    // --- SAFETY CHECK START ---
    if (!result.candidates || result.candidates.length === 0) {
      console.error("❌ Gemini AI Error:", JSON.stringify(result, null, 2));
      
      // Check if it was blocked by safety filters
      if (result.promptFeedback?.blockReason) {
        return res.status(422).json({ error: "Scan blocked by AI safety filters. Try a clearer photo." });
      }
      
      return res.status(500).json({ error: "AI failed to generate a result. Please try again." });
    }
    // --- SAFETY CHECK END ---

    const textResponse = result.candidates[0].content.parts[0].text;
    console.log("✅ Scan Successful!");
    res.json(JSON.parse(textResponse));

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
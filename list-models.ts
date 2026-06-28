import dotenv from "dotenv";

dotenv.config();

async function checkGoogleDirectly() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ ERROR: No API Key found in .env file!");
    return;
  }

  // We are checking both v1 and v1beta to find where your key lives
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
  ];

  console.log("Connecting directly to Google Cloud...");

  for (const url of endpoints) {
    try {
      console.log(`\nTesting: ${url.split('?')[0]}...`);
      const response = await fetch(url);
      const data: any = await response.json();

      if (!response.ok) {
        console.error(`❌ Failed: ${data.error?.message || "Unknown error"}`);
        continue;
      }

      console.log("✅ SUCCESS! Found available models:");
      data.models.forEach((m: any) => {
        // We only care about models that can "Generate Content"
        if (m.supportedGenerationMethods.includes("generateContent")) {
          console.log(`- ${m.name.replace('models/', '')}`);
        }
      });
      return; // Stop once we find a working endpoint

    } catch (error: any) {
      console.error("❌ Connection error:", error.message);
    }
  }
  
  console.log("\n--- FINAL VERDICT ---");
  console.log("If both failed with 403/404, your API key is definitely the issue.");
  console.log("Please ensure 'Generative Language API' is ENABLED in your Google Cloud Console.");
}

checkGoogleDirectly();
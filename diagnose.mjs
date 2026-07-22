import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page = await browser.newPage();

// Intercept ALL requests to track video-drops calls
page.on("request", (req) => {
  const url = req.url();
  if (url.includes("video-drops") || url.includes("admin/refresh")) {
    console.log(`\n>>> REQUEST ${req.method()} ${url}`);
    console.log(`    headers:`, JSON.stringify(req.headers(), null, 2));
  }
});

page.on("response", async (res) => {
  const url = res.url();
  if (url.includes("video-drops") || url.includes("admin/refresh")) {
    console.log(`\n<<< RESPONSE ${res.status()} ${url}`);
    try {
      const body = await res.text();
      console.log(`    body: ${body}`);
    } catch {
      console.log(`    body: (could not read)`);
    }
  }
});

page.on("console", (msg) => {
  if (msg.text().includes("Error") || msg.text().includes("error") || msg.text().includes("Unauthorized")) {
    console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
  }
});

console.log("=== 1. Navigate to admin ===");
await page.goto("http://localhost:4321/admin/#/login", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

console.log("\n=== 2. Login ===");
await page.fill('input[type="email"], input[name="email"]', "admin@gmail.com");
await page.fill('input[type="password"], input[name="password"]', "123");
await page.click('button[type="submit"], button:has-text("Ingresar")');
await page.waitForTimeout(2000);

console.log("\n=== 3. Navigate to VideoDrops ===");
await page.goto("http://localhost:4321/admin/#/videodrops", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

console.log("\n=== 4. Try to create a video drop ===");
try {
  await page.locator('button:has-text("NUEVO VIDEO")').click();
  await page.waitForTimeout(1000);

  // Fill title
  const titleInput = page.locator('input[placeholder*="Air Jordan"]');
  await titleInput.fill("Test from Playwright");
  await page.waitForTimeout(500);

  // Click GUARDAR VIDEO
  const saveBtn = page.locator('button:has-text("GUARDAR VIDEO")');
  await saveBtn.click();
  await page.waitForTimeout(3000);
} catch (e) {
  console.log(`Error during form interaction: ${e.message}`);
}

await page.waitForTimeout(2000);
console.log("\n=== 5. Done ===");
await browser.close();

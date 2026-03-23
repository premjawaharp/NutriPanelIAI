/**
 * Starts an ngrok tunnel using the official @ngrok/ngrok SDK.
 *
 * 1. Get token: https://dashboard.ngrok.com/get-started/your-authtoken
 * 2. Add to .env: NGROK_AUTHTOKEN=your_token_here
 * 3. Run `npm run tunnel` (default port 3001 — match `npm run dev`)
 */
import "dotenv/config";
import ngrok from "@ngrok/ngrok";

const port = Number(process.env.NGROK_PORT ?? process.env.PORT ?? 3001);
const authtoken = process.env.NGROK_AUTHTOKEN;

if (!authtoken) {
  console.error(`
Missing NGROK_AUTHTOKEN in .env

1. Sign up / log in: https://dashboard.ngrok.com
2. Copy your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
3. Add to nutripanel/.env:

   NGROK_AUTHTOKEN=your_token_here

4. Run: npm run tunnel
`);
  process.exit(1);
}

try {
  const listener = await ngrok.forward({
    addr: port,
    authtoken,
  });
  const url = listener.url();

  console.log("\n✅ ngrok tunnel ready");
  console.log("   Public URL:", url);
  console.log(`   → http://localhost:${port}`);
  console.log(
    "\n   Clerk webhook example:",
    url.replace(/\/$/, "") + "/api/webhooks/clerk"
  );
  console.log("\n   Press Ctrl+C to stop.\n");

  process.on("SIGINT", async () => {
    await listener.close();
    process.exit(0);
  });

  setInterval(() => {}, 60_000);
} catch (err) {
  console.error("\nngrok failed:", err.message ?? err);
  process.exit(1);
}

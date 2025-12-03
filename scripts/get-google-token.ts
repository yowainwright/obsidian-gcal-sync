import * as readline from "readline";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const REDIRECT_PORT = 42813;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
};

const openBrowser = (url: string): void => {
  const start =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";

  Bun.spawn([start, url]);
};

const box = (lines: string[], padding = 1): string => {
  const maxLen = Math.max(...lines.map((l) => l.length));
  const width = maxLen + padding * 2;
  const pad = " ".repeat(padding);
  const top = "╭" + "─".repeat(width) + "╮";
  const bottom = "╰" + "─".repeat(width) + "╯";
  const middle = lines
    .map((l) => `│${pad}${l.padEnd(maxLen)}${pad}│`)
    .join("\n");
  return `${top}\n${middle}\n${bottom}`;
};

const generateAuthUrl = (clientId: string): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

const exchangeCodeForTokens = async (
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<{ refresh_token?: string }> => {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || "Failed to exchange code");
  }

  return data;
};

const waitForAuthCode = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const server = Bun.serve({
      port: REDIRECT_PORT,
      fetch(req) {
        const url = new URL(req.url);

        if (url.pathname !== "/callback") {
          return new Response("Not found", { status: 404 });
        }

        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        setTimeout(() => server.stop(), 100);

        if (error) {
          reject(new Error(error));
          return new Response("Authorization failed. You can close this tab.");
        }

        if (!code) {
          reject(new Error("No authorization code received"));
          return new Response("No code received. You can close this tab.");
        }

        resolve(code);
        return new Response("Done! You can close this tab.");
      },
    });
  });
};

const main = async (): Promise<void> => {
  console.log("");
  console.log(box(["Google Calendar Authorization"], 2));
  console.log("");

  console.log("Step 1: Create Google Cloud credentials");
  console.log("");
  console.log("  ┌─ Instructions ─────────────────────────────────────────┐");
  console.log("  │                                                        │");
  console.log("  │  1. Click '+ CREATE CREDENTIALS' → 'OAuth client ID'   │");
  console.log("  │                                                        │");
  console.log("  │  2. If prompted to configure consent screen:           │");
  console.log("  │     • Choose 'External' user type                      │");
  console.log("  │     • Enter app name (e.g., 'Obsidian Calendar')       │");
  console.log("  │     • Add your email as a test user                    │");
  console.log("  │                                                        │");
  console.log("  │  3. For Application type, select 'Desktop app'         │");
  console.log("  │                                                        │");
  console.log("  │  4. Copy the Client ID and Client Secret               │");
  console.log("  │                                                        │");
  console.log("  └────────────────────────────────────────────────────────┘");
  console.log("");

  await prompt("  Press Enter to open Google Cloud Console...");
  openBrowser("https://console.cloud.google.com/apis/credentials");

  console.log("");
  const clientId = await prompt("  Enter your Client ID: ");
  const clientSecret = await prompt("  Enter your Client Secret: ");

  if (!clientId || !clientSecret) {
    console.log("");
    console.log("  ✗ Client ID and Client Secret are required.");
    console.log("");
    rl.close();
    process.exit(1);
  }

  console.log("");
  console.log("Step 2: Authorize with Google");
  console.log("");
  console.log("  Opening browser for sign-in...");
  console.log("  Waiting for authorization...");

  const authUrl = generateAuthUrl(clientId);
  openBrowser(authUrl);

  try {
    const code = await waitForAuthCode();
    const tokens = await exchangeCodeForTokens(code, clientId, clientSecret);

    if (!tokens.refresh_token) {
      console.log("");
      console.log("  ✗ No refresh token received. Please try again.");
      console.log("");
      rl.close();
      process.exit(1);
    }

    console.log("");
    console.log("  ✓ Authorization successful!");
    console.log("");
    console.log(
      "┌─ Your Credentials ─────────────────────────────────────────┐",
    );
    console.log(
      "│                                                            │",
    );
    console.log(`│  Client ID:     ${clientId.substring(0, 40).padEnd(40)}  │`);
    console.log(
      `│  Client Secret: ${clientSecret.substring(0, 40).padEnd(40)}  │`,
    );
    console.log(
      `│  Refresh Token: ${tokens.refresh_token.substring(0, 40).padEnd(40)}  │`,
    );
    console.log(
      "│                                                            │",
    );
    console.log(
      "└────────────────────────────────────────────────────────────┘",
    );
    console.log("");
    console.log("  Full refresh token (copy this):");
    console.log("");
    console.log(`  ${tokens.refresh_token}`);
    console.log("");
    console.log(
      box(["Paste these into Obsidian Settings → Google Calendar Sync"], 2),
    );
    console.log("");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.log("");
    console.log(`  ✗ Authorization failed: ${message}`);
    console.log("");
    rl.close();
    process.exit(1);
  }

  rl.close();
};

main();

import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { constants } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const npxCommand = isWindows ? "npx.cmd" : "npx";
const requestedPreviewPort = Number(process.env.PERF_AUDIT_PORT ?? 4173);
const requestedChromePort = Number(process.env.PERF_AUDIT_CHROME_PORT ?? 9223);
let previewPort = requestedPreviewPort;
let chromePort = requestedChromePort;
let auditUrl = process.env.PERF_AUDIT_URL ?? `http://127.0.0.1:${previewPort}`;
const reportPath = path.resolve(webRoot, "lighthouse-report.html");

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter(Boolean);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const canListen = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });

const getAvailablePort = async (startPort) => {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await canListen(port)) return port;
  }

  throw new Error(`No available local port found from ${startPort} to ${startPort + 19}.`);
};

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: webRoot,
      stdio: "inherit",
      shell: isWindows,
      windowsHide: true,
      ...options
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });

const waitForUrl = async (url, label, timeoutMs = 45_000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Keep polling until the service is ready or the timeout expires.
    }

    await delay(500);
  }

  throw new Error(`${label} did not become ready at ${url}`);
};

const findChrome = async () => {
  for (const candidate of chromeCandidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next known browser path.
    }
  }

  throw new Error("Chrome or Edge was not found. Set CHROME_PATH to the browser executable and rerun npm run perf:audit.");
};

const stopProcess = (child) => {
  if (!child || child.killed || child.exitCode !== null) return;
  try {
    child.kill();
  } catch {
    // Ignore cleanup failures.
  }
};

let preview;
let chrome;
let chromeProfile;

try {
  if (!process.env.PERF_AUDIT_URL) {
    previewPort = await getAvailablePort(requestedPreviewPort);
    auditUrl = `http://127.0.0.1:${previewPort}`;
  }
  chromePort = await getAvailablePort(requestedChromePort);

  await run(npmCommand, ["run", "build"]);

  preview = spawn(npxCommand, ["vite", "preview", "--host", "127.0.0.1", "--port", String(previewPort), "--strictPort"], {
    cwd: webRoot,
    stdio: "inherit",
    shell: isWindows,
    windowsHide: true
  });
  await waitForUrl(auditUrl, "Vite preview");

  const chromePath = await findChrome();
  chromeProfile = await mkdtemp(path.join(tmpdir(), "harmonics-lighthouse-"));
  await mkdir(path.dirname(reportPath), { recursive: true });

  chrome = spawn(
    chromePath,
    [
      "--headless=new",
      `--remote-debugging-port=${chromePort}`,
      `--user-data-dir=${chromeProfile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank"
    ],
    {
      stdio: "ignore",
      shell: false,
      windowsHide: true
    }
  );

  await waitForUrl(`http://127.0.0.1:${chromePort}/json/version`, "Chrome remote debugging");

  await run(npxCommand, [
    "lighthouse",
    auditUrl,
    "--preset=desktop",
    `--port=${chromePort}`,
    "--output=html",
    `--output-path=${reportPath}`
  ]);

  console.log(`Lighthouse report written to ${reportPath}`);
} finally {
  stopProcess(chrome);
  stopProcess(preview);
  if (chromeProfile) {
    await delay(750);
    await rm(chromeProfile, { recursive: true, force: true }).catch(() => undefined);
  }
}

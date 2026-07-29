import { env } from "./config/env.js";
import { app } from "./app.js";
import { startNotificationScheduler } from "./scheduler/index.js";

// Bind 0.0.0.0, not the default loopback: container platforms route external
// traffic to the container's own address, so a loopback-only listener answers
// nothing and the proxy returns 502.
app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`API listening on port ${env.PORT}`);
  // Started here rather than in app.ts so importing the Express app (e.g. from a
  // serverless handler) never spins up a timer.
  startNotificationScheduler();
});

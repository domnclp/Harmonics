import { env } from "./config/env.js";
import { app } from "./app.js";
import { startNotificationScheduler } from "./scheduler/index.js";

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
  // Started here rather than in app.ts so importing the Express app (e.g. from a
  // serverless handler) never spins up a timer.
  startNotificationScheduler();
});

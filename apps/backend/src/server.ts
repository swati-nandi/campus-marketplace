import { env } from "./config/env";
import { pool } from "./db/pool";
import { createApp } from "./app";

const server = createApp().listen(env.port, () => {
  console.log(`VIT Exchange API listening on http://localhost:${env.port}`);
});

function shutdown() {
  server.close(() => pool.end().then(() => process.exit(0)));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
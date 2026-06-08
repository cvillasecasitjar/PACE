import { createApp } from "./app";
import { env } from "./config/env";
import { startSyncWorker } from "./services/sync";

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`🟢 Pace backend listening on http://localhost:${env.port}`);
  // eslint-disable-next-line no-console
  console.log(`   Bank provider: ${env.bankProvider}`);
  startSyncWorker();
});

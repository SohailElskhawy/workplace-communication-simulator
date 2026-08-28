import { createApp } from "./app.js";
import { apiEnv } from "./config/env.js";

const app = createApp();

app.listen(apiEnv.PORT, () => {
  console.log(`API listening on port ${apiEnv.PORT}`);
});

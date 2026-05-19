import { runAgent } from "./agents/orchestrator.js";

const entry = await runAgent();
console.log(JSON.stringify(entry, null, 2));

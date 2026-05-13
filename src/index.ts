import { runAgent } from "./agent.js";

const entry = await runAgent();
console.log(JSON.stringify(entry, null, 2));

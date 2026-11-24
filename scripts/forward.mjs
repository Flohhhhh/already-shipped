import { spawnSync } from "node:child_process";

const [command, ...rest] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node scripts/forward.mjs <command> [args]");
  process.exit(1);
}

const hasTarget = rest.some((arg) => !arg.startsWith("-"));
const args = hasTarget ? rest : [...rest, "."];
const result = spawnSync(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PATH: `node_modules/.bin:${process.env.PATH ?? ""}`,
  },
});

process.exit(result.status ?? 1);

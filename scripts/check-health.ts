/** Prints the local /api/health report. Requires `pnpm dev` in another terminal. */
const baseUrl = process.env.HEALTH_URL ?? "http://localhost:3000";

async function main() {
  const response = await fetch(`${baseUrl}/api/health`);
  const report = await response.json();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = response.ok ? 0 : 1;
}

main().catch((error) => {
  console.error(`Could not reach ${baseUrl}/api/health — is \`pnpm dev\` running?`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

export {};

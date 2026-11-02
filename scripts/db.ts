/**
 * Local PostgreSQL lifecycle helper — no Windows service, no admin rights.
 *
 *   pnpm db:setup    initialise the cluster, install pgvector, create the DB
 *   pnpm db:start
 *   pnpm db:stop
 *   pnpm db:status
 *
 * Binaries live outside the repo (PG_HOME); data lives outside the repo too
 * (PG_DATA), so `git status` stays clean and uninstalling is just deleting two
 * folders.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";

const PG_HOME = process.env.PG_HOME ?? "C:/Users/hp/pgsql";
const PG_DATA = process.env.PG_DATA ?? "C:/Users/hp/pgdata-burmese-advisor";
const PG_PORT = process.env.PG_PORT ?? "5432";
const PGVECTOR_DIR = process.env.PGVECTOR_DIR ?? "C:/Users/hp/pgvector-0.8.6-pg17";
const DB_NAME = process.env.PG_DATABASE ?? "burmese_advisor";
const DB_USER = "postgres";

const bin = path.join(PG_HOME, "bin");

function tool(name: string): string {
  return path.join(bin, `${name}.exe`);
}

function run(command: string, args: string[], allowFailure = false): void {
  console.log(`\n> ${path.basename(command)} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${path.basename(command)} exited with code ${result.status}`);
  }
}

function walk(root: string, predicate: (file: string) => boolean): string[] {
  if (!existsSync(root)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = path.join(root, entry);
    if (statSync(full).isDirectory()) {
      found.push(...walk(full, predicate));
    } else if (predicate(full)) {
      found.push(full);
    }
  }
  return found;
}

function installPgvector(): void {
  const dll = path.join(PG_HOME, "lib", "vector.dll");
  if (existsSync(dll)) {
    console.log("pgvector already installed");
    return;
  }

  const libs = walk(PGVECTOR_DIR, (file) => file.endsWith("vector.dll"));
  const controls = walk(PGVECTOR_DIR, (file) => file.endsWith(".control"));
  const sqls = walk(PGVECTOR_DIR, (file) => file.endsWith(".sql"));

  if (libs.length === 0 || controls.length === 0) {
    throw new Error(
      `pgvector files not found under ${PGVECTOR_DIR}. Set PGVECTOR_DIR to the extracted vector.v0.8.6-pg17.zip.`,
    );
  }

  mkdirSync(path.join(PG_HOME, "lib"), { recursive: true });
  mkdirSync(path.join(PG_HOME, "share", "extension"), { recursive: true });

  copyFileSync(libs[0], dll);
  for (const control of controls) {
    copyFileSync(control, path.join(PG_HOME, "share", "extension", path.basename(control)));
  }
  for (const sql of sqls) {
    copyFileSync(sql, path.join(PG_HOME, "share", "extension", path.basename(sql)));
  }
  console.log(`pgvector installed into ${PG_HOME}`);
}

function isInitialised(): boolean {
  return existsSync(path.join(PG_DATA, "PG_VERSION"));
}

function initCluster(): void {
  if (isInitialised()) {
    console.log("cluster already initialised");
    return;
  }
  mkdirSync(PG_DATA, { recursive: true });
  run(tool("initdb"), [
    "-D",
    PG_DATA,
    "-U",
    DB_USER,
    "--auth=trust",
    "--encoding=UTF8",
    "--locale=C",
  ]);
}

function isRunning(): boolean {
  const result = spawnSync(tool("pg_ctl"), ["status", "-D", PG_DATA], {
    stdio: "ignore",
  });
  return result.status === 0;
}

function start(): void {
  if (isRunning()) {
    console.log("server already running");
    return;
  }
  const logFile = path.join(PG_DATA, "server.log");
  // pg_ctl daemonises the postmaster on Windows. stdio is ignored so the
  // long-lived server does not keep the caller's pipes open.
  const result = spawnSync(
    tool("pg_ctl"),
    ["start", "-D", PG_DATA, "-l", logFile, "-o", `-p ${PG_PORT}`],
    { stdio: "ignore" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`pg_ctl start failed (code ${result.status}). See ${logFile}`);
  }
  console.log(`PostgreSQL started on port ${PG_PORT} (log: ${logFile})`);
}

function stop(): void {
  run(tool("pg_ctl"), ["stop", "-D", PG_DATA, "-m", "fast"], true);
}

function psql(database: string, sql: string, allowFailure = false): void {
  run(
    tool("psql"),
    ["-h", "127.0.0.1", "-p", PG_PORT, "-U", DB_USER, "-d", database, "-v", "ON_ERROR_STOP=1", "-c", sql],
    allowFailure,
  );
}

function createDatabase(): void {
  run(
    tool("createdb"),
    ["-h", "127.0.0.1", "-p", PG_PORT, "-U", DB_USER, DB_NAME],
    true,
  );
  psql(DB_NAME, "CREATE EXTENSION IF NOT EXISTS vector;");
  psql(DB_NAME, "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';");
}

function main(): void {
  const command = process.argv[2] ?? "status";

  if (!existsSync(tool("pg_ctl"))) {
    throw new Error(
      `PostgreSQL binaries not found at ${bin}. Extract the EDB binaries zip so that ${PG_HOME}\\bin\\pg_ctl.exe exists.`,
    );
  }

  switch (command) {
    case "setup":
      installPgvector();
      initCluster();
      start();
      createDatabase();
      console.log(`\nReady: postgresql://${DB_USER}@127.0.0.1:${PG_PORT}/${DB_NAME}`);
      return;
    case "start":
      start();
      return;
    case "stop":
      stop();
      return;
    case "status":
      run(tool("pg_ctl"), ["status", "-D", PG_DATA], true);
      return;
    default:
      console.error(`Unknown command: ${command}. Use setup | start | stop | status.`);
      process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

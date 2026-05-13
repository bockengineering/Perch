import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const command = process.argv[2] ?? "start";
const port = process.env.DEMO_POSTGRES_PORT ?? "54329";
const user = "perch_demo";
const database = "perch_demo";
const rootDir = process.env.PERCH_DEMO_PG_ROOT ?? join(homedir(), ".perch-demo");
const dataDir = process.env.PERCH_DEMO_PGDATA ?? join(rootDir, "postgres-data");
const logDir = join(rootDir, "logs");
const logFile = join(logDir, "postgres.log");
const binCache = new Map<string, string>();

function candidateBinDirs() {
  return [
    process.env.POSTGRES_BIN,
    join(homedir(), "Applications/Postgres.app/Contents/Versions/latest/bin"),
    "/Applications/Postgres.app/Contents/Versions/latest/bin",
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
  ].filter(Boolean) as string[];
}

function findBin(name: string) {
  const cached = binCache.get(name);
  if (cached) {
    return cached;
  }

  for (const dir of candidateBinDirs()) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) {
      binCache.set(name, candidate);
      return candidate;
    }
  }

  const resolved = spawnSync("sh", ["-lc", `command -v ${name}`], {
    encoding: "utf8",
  });
  if (resolved.status === 0) {
    const found = resolved.stdout.trim();
    if (found) {
      binCache.set(name, found);
      return found;
    }
  }

  throw new Error(
    `Could not find ${name}. Install Docker and use npm run demo:setup, or install Postgres.app / PostgreSQL CLI tools.`,
  );
}

function run(name: string, args: string[], options: { allowFailure?: boolean } = {}) {
  const result = spawnSync(findBin(name), args, {
    stdio: "inherit",
    env: process.env,
  });

  if (!options.allowFailure && result.status !== 0) {
    throw new Error(`${name} ${args.join(" ")} failed`);
  }

  return result.status ?? 1;
}

function capture(name: string, args: string[]) {
  return spawnSync(findBin(name), args, {
    encoding: "utf8",
    env: process.env,
  });
}

function serverReady() {
  return capture("pg_isready", ["-h", "127.0.0.1", "-p", port, "-U", user]).status === 0;
}

function ensureDatabase() {
  const check = capture("psql", [
    "-h",
    "127.0.0.1",
    "-p",
    port,
    "-U",
    user,
    "-d",
    "postgres",
    "-tAc",
    `select 1 from pg_database where datname = '${database}'`,
  ]);

  if (check.status === 0 && check.stdout.trim() === "1") {
    return;
  }

  run("createdb", ["-h", "127.0.0.1", "-p", port, "-U", user, database]);
}

function start() {
  mkdirSync(logDir, { recursive: true });

  if (!existsSync(join(dataDir, "PG_VERSION"))) {
    mkdirSync(dataDir, { recursive: true });
    run("initdb", ["-D", dataDir, "-U", user, "--auth=trust"]);
  }

  if (!serverReady()) {
    run("pg_ctl", ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -k /tmp`, "start"]);
  }

  ensureDatabase();
  console.log(`Demo Postgres is ready at postgresql://${user}:${user}@localhost:${port}/${database}`);
}

function stop() {
  if (!existsSync(join(dataDir, "PG_VERSION"))) {
    console.log("No local demo Postgres data directory exists.");
    return;
  }

  run("pg_ctl", ["-D", dataDir, "stop", "-m", "fast"], { allowFailure: true });
}

function status() {
  if (serverReady()) {
    console.log(`Demo Postgres is accepting connections on localhost:${port}`);
    return;
  }

  console.log(`Demo Postgres is not accepting connections on localhost:${port}`);
  process.exitCode = 1;
}

try {
  if (command === "start") {
    start();
  } else if (command === "stop") {
    stop();
  } else if (command === "status") {
    status();
  } else {
    throw new Error(`Unknown command "${command}". Use start, stop, or status.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

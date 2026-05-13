import net from "node:net";

const host = "127.0.0.1";
const port = 54329;
const maxAttempts = 30;

function canConnect() {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(1000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (await canConnect()) {
      console.log("Demo Postgres is accepting connections");
      return;
    }

    console.log(`Waiting for demo Postgres (${attempt}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Demo Postgres did not become ready on localhost:54329");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

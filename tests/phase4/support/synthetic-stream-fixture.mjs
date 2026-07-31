import http from "node:http";

export const SYNTHETIC_STREAM_PATH = "/_phase4-synthetic-stream";
export const SYNTHETIC_STREAM_FRAGMENT = "phase4 synthetic fragment";

/**
 * Test-only listener. It is never imported by application source and has no
 * forwarding, DNS, proxy, or external-network capability.
 */
export async function startSyntheticStreamFixture() {
  let closed = false;
  let requests = 0;
  const server = http.createServer((request, response) => {
    requests += 1;
    if (request.method !== "GET" || request.url !== SYNTHETIC_STREAM_PATH) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end('{"error":"synthetic fixture only"}');
      return;
    }
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      connection: "close",
    });
    response.end(`${SYNTHETIC_STREAM_FRAGMENT}\n`);
  });
  server.on("clientError", (_error, socket) => socket.destroy());

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string" || address.address !== "127.0.0.1" || address.port < 1) {
    await new Promise((resolve) => server.close(resolve));
    throw new Error("Synthetic fixture did not bind exact 127.0.0.1 on an OS-selected port.");
  }

  return Object.freeze({
    bind: "127.0.0.1",
    port: address.port,
    url: `http://127.0.0.1:${address.port}${SYNTHETIC_STREAM_PATH}`,
    get requests() {
      return requests;
    },
    get closed() {
      return closed;
    },
    async close() {
      if (closed) return;
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      if (server.listening) {
        throw new Error("Synthetic fixture remained listening after close.");
      }
      closed = true;
    },
  });
}

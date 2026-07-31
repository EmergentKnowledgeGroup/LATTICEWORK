import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const supportRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(supportRoot, "..", "..", "..");
const runtimeTmpRoot = path.join(repositoryRoot, "runtime", "tmp");

export const PHASE4_FIXTURE_ID = "phase4-fragmented-stream-v1";
export const PHASE4_STREAM_PATH = "/v1/chat/completions";
export const PHASE4_SYNTHETIC_MODEL = "latticework-synthetic-local";
export const PHASE4_SYNTHETIC_PROMPT = "P4_SYNTHETIC_PROMPT_DO_NOT_EXPORT";

function isStrictDescendant(candidate, root) {
  const relative = path.relative(root, candidate);
  return (
    relative.length > 0 &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}

function assertRunRoot(runRoot) {
  if (typeof runRoot !== "string" || runRoot.length === 0) {
    throw new Error("A run-owned staging root is required.");
  }
  const resolved = path.resolve(runRoot);
  if (!isStrictDescendant(resolved, runtimeTmpRoot)) {
    throw new Error("Loopback fixture staging must stay under repository runtime/tmp.");
  }
  let current = runtimeTmpRoot;
  const relative = path.relative(runtimeTmpRoot, resolved);
  for (const segment of relative.split(path.sep)) {
    if (!fs.existsSync(current)) break;
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Loopback fixture staging traverses a reparse point: ${current}`);
    }
    current = path.join(current, segment);
  }
  if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
    throw new Error(`Loopback fixture staging traverses a reparse point: ${current}`);
  }
  return resolved;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function waitFor(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs);
      timer.unref?.();
    }),
  ]);
}

function readBody(request, maxBytes = 32 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        request.destroy();
        reject(new Error("request body exceeds synthetic fixture limit"));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function validateSyntheticBody(raw) {
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return { valid: false, reason: "invalid-json" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, reason: "body-not-object" };
  }
  const keys = Object.keys(body).sort();
  const expectedKeys = ["max_tokens", "messages", "model", "stream"];
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    return { valid: false, reason: "body-keys" };
  }
  if (
    body.model !== PHASE4_SYNTHETIC_MODEL ||
    body.stream !== true ||
    !Number.isInteger(body.max_tokens) ||
    body.max_tokens < 1 ||
    body.max_tokens > 2048 ||
    !Array.isArray(body.messages) ||
    body.messages.length < 1 ||
    body.messages.length > 8
  ) {
    return { valid: false, reason: "body-shape" };
  }
  const roles = [];
  let hasSyntheticPrompt = false;
  for (const message of body.messages) {
    if (
      !message ||
      typeof message !== "object" ||
      Array.isArray(message) ||
      Object.keys(message).sort().join(",") !== "content,role" ||
      !["system", "user", "assistant"].includes(message.role) ||
      typeof message.content !== "string" ||
      message.content.length > 4096
    ) {
      return { valid: false, reason: "message-shape" };
    }
    roles.push(message.role);
    if (message.role === "user" && message.content === PHASE4_SYNTHETIC_PROMPT) {
      hasSyntheticPrompt = true;
    }
  }
  if (!hasSyntheticPrompt) return { valid: false, reason: "synthetic-prompt" };
  return {
    valid: true,
    shape: { keys, message_count: body.messages.length, roles, stream: true },
  };
}

function writeJson(response, status, value, origin) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": origin,
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

function sseDelta(content) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

/**
 * A test-only, no-egress fixture for the five Phase 4 fragmented-stream
 * retests. It deliberately exposes no generic request forwarding surface.
 */
export async function startPhase4LoopbackStreamFixture({
  runRoot,
  allowedOrigin,
  fixtureId = PHASE4_FIXTURE_ID,
} = {}) {
  const ownedRunRoot = assertRunRoot(runRoot);
  if (typeof allowedOrigin !== "string" || !/^http:\/\/127\.0\.0\.1:\d+$/u.test(allowedOrigin)) {
    throw new Error("Loopback fixture allowed origin must be exact 127.0.0.1 HTTP origin.");
  }
  if (fixtureId !== PHASE4_FIXTURE_ID) {
    throw new Error("Loopback fixture ID is locked.");
  }

  const startedAt = process.hrtime.bigint();
  let sequence = 0;
  let activeSession = null;
  let stopped = false;
  const rejected = [];
  const lifecycle = [];
  const event = (name, details = {}) => {
    lifecycle.push({
      sequence: ++sequence,
      event: name,
      monotonic_ms: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
      ...details,
    });
  };

  const server = http.createServer(async (request, response) => {
    const reject = (status, reason) => {
      rejected.push({
        sequence: ++sequence,
        reason,
        monotonic_ms: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
      });
      writeJson(response, status, { error: "phase4 synthetic fixture rejected request" }, allowedOrigin);
    };
    if (stopped) return reject(503, "stopped");
    if (request.method !== "POST") return reject(405, "method");
    if (request.url !== PHASE4_STREAM_PATH) return reject(404, "path");
    if (request.headers.origin !== allowedOrigin) return reject(403, "origin");
    if (request.headers["x-latticework-phase4-fixture-id"] !== fixtureId) {
      return reject(403, "fixture-id");
    }
    let validation;
    try {
      validation = validateSyntheticBody(await readBody(request));
    } catch {
      return reject(413, "body-limit");
    }
    if (!validation.valid) return reject(422, validation.reason);
    if (!activeSession || activeSession.request) return reject(409, "unarmed-or-duplicate-session");

    const session = activeSession;
    session.request = request;
    session.response = response;
    session.request_shape = validation.shape;
    event("request-accepted", { session_id: session.id, request_shape: validation.shape });
    response.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-store",
      connection: "keep-alive",
      "access-control-allow-origin": allowedOrigin,
    });
    response.on("close", () => {
      if (session.closed) return;
      session.closed = true;
      session.closed_before_first_delta = session.fragment_count === 0;
      session.closed_before_terminal = !session.terminal_emitted;
      session.closed_at_ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      event("connection-closed", {
        session_id: session.id,
        before_first_delta: session.closed_before_first_delta,
        before_terminal: session.closed_before_terminal,
      });
      session.closeSignal.resolve();
    });
    session.requestSignal.resolve();
  });
  server.on("clientError", (_error, socket) => socket.destroy());

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string" || address.address !== "127.0.0.1" || !Number.isInteger(address.port) || address.port < 1) {
    await new Promise((resolve) => server.close(resolve));
    throw new Error("Loopback fixture failed exact 127.0.0.1 OS-selected bind.");
  }
  event("listener-started", { bind: address.address, port: address.port, run_root: ownedRunRoot });
  fs.mkdirSync(ownedRunRoot, { recursive: true });

  function requireSession(session) {
    if (stopped || activeSession !== session) throw new Error("Fixture session is not active.");
    if (!session.request || !session.response) throw new Error("Fixture has not received its armed request.");
  }

  function sessionReceipt(session) {
    return {
      schema: "latticework.phase4-loopback-stream-receipt.v1",
      fixture_id: fixtureId,
      bind: "127.0.0.1",
      port: address.port,
      run_owned: true,
      synthetic_only: true,
      external_egress: false,
      session_id: session.id,
      request_received: Boolean(session.request),
      request_shape: session.request_shape ?? null,
      fragment_count: session.fragment_count,
      terminal_emitted: session.terminal_emitted,
      closed: session.closed,
      closed_before_first_delta: session.closed_before_first_delta,
      closed_before_terminal: session.closed_before_terminal,
      events: lifecycle.filter((item) => item.session_id === session.id),
    };
  }

  const fixture = {
    endpoint: `http://127.0.0.1:${address.port}${PHASE4_STREAM_PATH}`,
    bind: "127.0.0.1",
    port: address.port,
    fixtureId,
    arm(sessionId) {
      if (stopped || activeSession) throw new Error("Loopback fixture permits one active session at a time.");
      if (!/^[A-Za-z0-9-]{1,80}$/u.test(sessionId ?? "")) throw new Error("Fixture session ID is invalid.");
      const session = {
        id: sessionId,
        request: null,
        response: null,
        request_shape: null,
        fragment_count: 0,
        terminal_emitted: false,
        closed: false,
        closed_before_first_delta: null,
        closed_before_terminal: null,
        requestSignal: deferred(),
        closeSignal: deferred(),
      };
      activeSession = session;
      event("session-armed", { session_id: session.id });
      return {
        waitForRequest: (timeoutMs = 5_000) => waitFor(session.requestSignal.promise, timeoutMs, "fixture request"),
        waitForClose: (timeoutMs = 5_000) => waitFor(session.closeSignal.promise, timeoutMs, "fixture connection close"),
        emitDelta(content) {
          requireSession(session);
          if (session.closed || session.terminal_emitted) throw new Error("Cannot emit after fixture close or terminal.");
          if (!/^P4 synthetic (?:first|second|success)$/u.test(content)) {
            throw new Error("Fixture fragment is not an approved synthetic value.");
          }
          session.response.write(sseDelta(content));
          session.fragment_count += 1;
          event("fragment-emitted", { session_id: session.id, fragment_index: session.fragment_count });
        },
        finish() {
          requireSession(session);
          if (session.closed || session.terminal_emitted) throw new Error("Cannot terminal a closed or terminal fixture session.");
          session.response.end("data: [DONE]\n\n");
          session.terminal_emitted = true;
          event("terminal-emitted", { session_id: session.id });
        },
        receipt: () => sessionReceipt(session),
        release() {
          if (!session.closed) {
            throw new Error("Cannot release a fixture session before its connection closes.");
          }
          if (activeSession !== session) {
            throw new Error("Fixture session is not active.");
          }
          activeSession = null;
          event("session-released", { session_id: session.id });
        },
      };
    },
    receipt() {
      return {
        schema: "latticework.phase4-loopback-stream-listener.v1",
        fixture_id: fixtureId,
        bind: "127.0.0.1",
        port: address.port,
        run_root: ownedRunRoot,
        run_owned: true,
        fixture_only: true,
        synthetic_only: true,
        external_egress: false,
        stopped,
        rejected: [...rejected],
        events: [...lifecycle],
      };
    },
    async stop() {
      if (stopped) return this.receipt();
      stopped = true;
      if (activeSession?.response && !activeSession.closed) activeSession.response.destroy();
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      await new Promise((resolve, reject) => {
        const proof = http.createServer();
        proof.once("error", reject);
        proof.listen({ host: "127.0.0.1", port: address.port }, () => {
          proof.close((error) => (error ? reject(error) : resolve()));
        });
      });
      event("listener-stopped", { bind: "127.0.0.1", port: address.port, port_rebind_proven: true });
      const receipt = this.receipt();
      fs.writeFileSync(
        path.join(ownedRunRoot, "loopback-teardown.json"),
        `${JSON.stringify(receipt, null, 2)}\n`,
        "utf8",
      );
      return receipt;
    },
  };
  fs.writeFileSync(
    path.join(ownedRunRoot, "loopback-startup.json"),
    `${JSON.stringify(fixture.receipt(), null, 2)}\n`,
    "utf8",
  );
  return fixture;
}

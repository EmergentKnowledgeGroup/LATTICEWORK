import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const supportRoot = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(supportRoot, "..", "fixtures");

function readFixture(name) {
  return JSON.parse(
    fs.readFileSync(path.join(fixtureRoot, name), "utf8"),
  );
}

export const persistenceContract = readFixture(
  "persistence-contract.json",
);
export const syntheticProvider = readFixture(
  "synthetic-provider-contract.json",
);

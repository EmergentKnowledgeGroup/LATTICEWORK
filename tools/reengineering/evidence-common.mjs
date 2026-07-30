import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

export function isStrictDescendant(targetPath, parentPath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(targetPath));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function findReparsePoint(targetPath, rootPath) {
  let current = path.resolve(rootPath);
  const target = path.resolve(targetPath);
  const relative = path.relative(current, target);
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) return current;
    } catch (error) {
      if (error?.code === "ENOENT") return current;
      throw error;
    }
  }
  return null;
}

export function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

export function writeJson(filePath, value) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function isTextBuffer(buffer) {
  return !buffer.includes(0);
}

export function countLines(buffer) {
  if (buffer.length === 0) return 0;
  let lines = 0;
  for (const byte of buffer) {
    if (byte === 10) lines += 1;
  }
  if (buffer.at(-1) !== 10) lines += 1;
  return lines;
}

export function parseNamedArgs(argv) {
  const options = {};
  const commandSeparator = argv.indexOf("--");
  const optionArgs = commandSeparator === -1 ? argv : argv.slice(0, commandSeparator);
  const command = commandSeparator === -1 ? [] : argv.slice(commandSeparator + 1);

  for (let index = 0; index < optionArgs.length; index += 1) {
    const token = optionArgs[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const name = token.slice(2);
    const value = optionArgs[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}`);
    }
    options[name] = value;
    index += 1;
  }

  return { options, command };
}

export function buildFileReceipt(filePath, baseDirectory) {
  const stats = fs.statSync(filePath);
  return {
    path: path.relative(baseDirectory, filePath).replaceAll("\\", "/"),
    bytes: stats.size,
    sha256: sha256File(filePath),
  };
}

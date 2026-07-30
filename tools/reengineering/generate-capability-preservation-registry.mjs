#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeJson } from "./evidence-common.mjs";

function slug(value) {
  return String(value)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function addRows(rows, category, values, sourceFor, detailsFor = () => null) {
  values.forEach((value, index) => {
    const name = typeof value === "string"
      ? value
      : value.mode ?? value.boundary ?? value.surface ?? `item-${index + 1}`;
    rows.push({
      id: `PRES-${category.toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
      category,
      name,
      slug: slug(name),
      baseline_evidence_label: "OBSERVED",
      runtime_reachability: "UNKNOWN",
      compatibility_level: "C0",
      preservation: "REQUIRED_UNTIL_DISPOSITIONED",
      owner_approval_required_for_retirement: true,
      source: sourceFor(value),
      details: detailsFor(value),
    });
  });
}

export function generateCapabilityRegistry(boundaryMap) {
  const surfaces = boundaryMap.application_surfaces;
  const rows = [];

  addRows(rows, "launch", boundaryMap.launch_modes, (item) => item.evidence, (item) => item);
  addRows(rows, "panel", surfaces.in_app_tab_panels, (item) => `docs/app.html#tab-${item}`);
  addRows(rows, "docs-route", surfaces.static_html_routes, (item) => `docs/${item}.html`);
  addRows(rows, "root-route", surfaces.root_html_routes, (item) => `${item}.html`);
  addRows(rows, "module", surfaces.module_files, (item) => `docs/modules/${item}.js`);
  addRows(rows, "action-family", surfaces.major_user_actions, () => "docs/app.html and feature modules");
  addRows(
    rows,
    "global",
    boundaryMap.runtime_composition.major_globals,
    () => "reengineering/evidence/phase-0/LW-M0-INV-001/window-symbol-assignments.csv",
  );
  addRows(
    rows,
    "network",
    boundaryMap.provider_and_network_boundaries,
    (item) => item.endpoints ?? item.endpoint ?? item.technology ?? "behavior-boundary-map.json",
    (item) => item,
  );
  addRows(
    rows,
    "security",
    boundaryMap.security_privacy_sensitive_surfaces,
    () => "reengineering/evidence/phase-0/LW-M0-BEH-001/behavior-boundary-map.json",
    (item) => item,
  );

  const categoryCounts = {};
  for (const row of rows) {
    categoryCounts[row.category] = (categoryCounts[row.category] ?? 0) + 1;
  }

  return {
    schema: "latticework.capability-preservation-registry.v1",
    baseline_sha: boundaryMap.baseline.sha,
    source_work_id: boundaryMap.work_id,
    evidence_scope:
      "Static/source-observed inventory. Runtime reachability remains UNKNOWN until a browser or platform receipt updates a row.",
    counts: {
      total: rows.length,
      by_category: categoryCounts,
    },
    rows,
  };
}

function isMain() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  try {
    const input = process.argv[2];
    const output = process.argv[3];
    if (!input || !output) {
      throw new Error(
        "Usage: generate-capability-preservation-registry.mjs INPUT_JSON OUTPUT_JSON",
      );
    }
    const boundaryMap = JSON.parse(fs.readFileSync(path.resolve(input), "utf8"));
    writeJson(path.resolve(output), generateCapabilityRegistry(boundaryMap));
    process.stdout.write(`${path.resolve(output)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}

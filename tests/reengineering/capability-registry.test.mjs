import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { generateCapabilityRegistry } from "../../tools/reengineering/generate-capability-preservation-registry.mjs";

const boundaryMap = JSON.parse(
  fs.readFileSync(
    "reengineering/evidence/phase-0/LW-M0-BEH-001/behavior-boundary-map.json",
    "utf8",
  ),
);

test("preservation registry accounts for every bounded source inventory row", () => {
  const registry = generateCapabilityRegistry(boundaryMap);
  const expected =
    boundaryMap.launch_modes.length
    + boundaryMap.application_surfaces.in_app_tab_panels.length
    + boundaryMap.application_surfaces.static_html_routes.length
    + boundaryMap.application_surfaces.root_html_routes.length
    + boundaryMap.application_surfaces.module_files.length
    + boundaryMap.application_surfaces.major_user_actions.length
    + boundaryMap.runtime_composition.major_globals.length
    + boundaryMap.provider_and_network_boundaries.length
    + boundaryMap.security_privacy_sensitive_surfaces.length;

  assert.equal(registry.counts.total, expected);
  assert.equal(new Set(registry.rows.map((row) => row.id)).size, expected);
  assert.equal(registry.counts.by_category.panel, 54);
  assert.equal(registry.counts.by_category["docs-route"], 82);
  assert.equal(registry.counts.by_category.module, 76);
  assert.ok(
    registry.rows.every(
      (row) =>
        row.preservation === "REQUIRED_UNTIL_DISPOSITIONED"
        && row.runtime_reachability === "UNKNOWN",
    ),
  );
});

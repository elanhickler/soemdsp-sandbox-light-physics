const state = {
  response: null,
};

const requiredFlags = [
  ["callerOwnsProcessingOrder", true],
  ["callerOwnsDspObjects", true],
  ["circuitOwnsDspObjects", false],
  ["dspObjectsKnowCircuit", false],
  ["serializesPatch", false],
  ["ownsAudioEngine", false],
  ["ownsScheduler", false],
];

const expectedContract = "soemdsp-demo-local-sandbox-handoff";
const expectedContractVersion = 1;
const expectedInspectionMode = "mouse-and-ears";

function artifactUrl(path) {
  return `/artifact?path=${encodeURIComponent(path)}`;
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function setStatus(id, value, ok) {
  const element = document.getElementById(id);
  element.textContent = value;
  element.className = ok ? "" : "warn";
}

function boolText(value) {
  return value ? "true" : "false";
}

function statusText(ok) {
  return ok ? "OK" : "Check";
}

function renderKeyValue(container, rows) {
  container.replaceChildren();
  for (const [key, value, expected] of rows) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = key;
    dd.textContent = value;
    if (expected !== undefined && value !== boolText(expected)) {
      dd.className = "warn";
    }
    container.append(dt, dd);
  }
}

function hasArtifactKind(links, kind) {
  return links.some((link) => link.kind === kind && Boolean(link.path));
}

function validateConsumerChecklist(manifest) {
  const handoff = manifest.sandboxHandoff || {};
  const links = manifest.artifactLinks || [];
  const phases = manifest.phases || [];
  const checks = [
    ["allOk", manifest.allOk === true],
    ["contract", handoff.contract === expectedContract],
    ["contractVersion", handoff.contractVersion === expectedContractVersion],
    ["inspectionMode", handoff.inspectionMode === expectedInspectionMode],
    ["entryPoint", Boolean(handoff.entryPoint)],
    ["primaryAudioArtifact", Boolean(handoff.primaryAudioArtifact)],
    ...requiredFlags.map(([key, expected]) => [
      key,
      handoff[key] === expected,
    ]),
    ["entry-point link", hasArtifactKind(links, "entry-point")],
    ["audio link", hasArtifactKind(links, "audio")],
    ["phase report", phases.length > 0],
  ];

  return {
    accepted: checks.every(([, ok]) => ok),
    checks,
  };
}

function renderChecklist(result) {
  const list = document.getElementById("checklist");
  list.replaceChildren();
  for (const [label, ok] of result.checks) {
    const item = document.createElement("div");
    item.className = ok ? "check-row" : "check-row warn-row";

    const marker = document.createElement("strong");
    marker.textContent = ok ? "OK" : "Check";

    const text = document.createElement("span");
    text.textContent = label;

    item.append(marker, text);
    list.append(item);
  }
}

function renderArtifacts(links) {
  const list = document.getElementById("artifactList");
  list.replaceChildren();
  for (const link of links) {
    const anchor = document.createElement("a");
    anchor.className = "artifact-row";
    anchor.href = artifactUrl(link.path);
    anchor.target = "_blank";
    anchor.rel = "noreferrer";

    const label = document.createElement("span");
    label.textContent = link.label;

    const kind = document.createElement("strong");
    kind.textContent = link.kind;

    const path = document.createElement("code");
    path.textContent = link.path;

    anchor.append(label, kind, path);
    list.append(anchor);
  }
}

function renderPhases(phases) {
  const list = document.getElementById("phaseList");
  list.replaceChildren();
  for (const phase of phases) {
    const item = document.createElement("div");
    item.className = "phase";

    const name = document.createElement("h3");
    name.textContent = phase.name;

    const body = document.createElement("dl");
    body.className = "kv compact";
    renderKeyValue(body, [
      ["preflight", boolText(phase.preflightOk), true],
      ["apply", boolText(phase.applyOk), true],
      ["process", boolText(phase.processOk), true],
      ["bindings", String(phase.bindingsChecked)],
      ["parameters", String(phase.parametersApplied)],
      ["samples", String(phase.samplesProcessed)],
    ]);

    item.append(name, body);
    list.append(item);
  }
}

function render(response) {
  state.response = response;
  const manifest = response.manifest;
  const handoff = manifest.sandboxHandoff;
  const checklist = validateConsumerChecklist(manifest);

  setStatus("manifestStatus", statusText(manifest.allOk), manifest.allOk);
  setStatus(
    "contractStatus",
    `${handoff.contract} v${handoff.contractVersion}`,
    handoff.contract === expectedContract &&
      handoff.contractVersion === expectedContractVersion,
  );
  setStatus(
    "inspectionMode",
    handoff.inspectionMode,
    handoff.inspectionMode === expectedInspectionMode,
  );
  setText("frameCount", String(manifest.wav.frames));
  setStatus(
    "checklistStatus",
    checklist.accepted ? "Accepted" : "Check",
    checklist.accepted,
  );
  setText("audioTitle", handoff.primaryAudioArtifact);
  setText("manifestPath", response.manifestPath);
  setText("artifactRoot", response.artifactRoot);

  const audio = document.getElementById("audioPlayer");
  audio.src = artifactUrl(handoff.primaryAudioArtifact);

  renderKeyValue(
    document.getElementById("boundaryFlags"),
    requiredFlags.map(([key, expected]) => [
      key,
      boolText(handoff[key]),
      expected,
    ]),
  );
  renderPhases(manifest.phases || []);
  renderChecklist(checklist);
  renderArtifacts(manifest.artifactLinks || []);
}

function renderError(message) {
  setStatus("manifestStatus", "Check", false);
  setStatus("contractStatus", message, false);
  setStatus("inspectionMode", "Unavailable", false);
  setText("frameCount", "0");
  setStatus("checklistStatus", "Check", false);
}

async function loadManifest() {
  try {
    const response = await fetch("/api/manifest", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      renderError(payload.error || "Manifest failed");
      return;
    }
    render(payload);
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
  }
}

document
  .getElementById("refreshButton")
  .addEventListener("click", loadManifest);

loadManifest();

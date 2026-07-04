// Module Diagnostics: a purely informational failure-reporting popup,
// modeled on node-graph-ear-protection.js's fault-latch shape but for a
// different job. Ear Protection mutes audio and stops playback because a
// signal is dangerously loud; this reports when a module quietly fails to
// do its job at all (native WASM didn't load, a native call threw, or a
// wired/reachable node is stuck outputting nothing/NaN) -- it never mutes
// or stops anything, it just tells the user, in detail, what broke and why,
// instead of leaving them with silence and no explanation (see the
// keplerBouwkamp "no audio" report this was built to prevent recurring).

const nodeGraphModuleDiagnosticsSilenceWindowSeconds = 3;

function nodeGraphModuleDiagnosticsState() {
  if (!nodeGraphMvp.moduleDiagnostics) {
    nodeGraphMvp.moduleDiagnostics = {
      faults: [],
      serial: 0,
      silenceTracking: new Map(),
    };
  }
  return nodeGraphMvp.moduleDiagnostics;
}

function nodeGraphModuleDiagnosticsIsTripped() {
  return nodeGraphModuleDiagnosticsState().faults.length > 0;
}

function nodeGraphModuleFaultKey(details = {}) {
  return `${details.kind || "fault"}:${details.moduleName || details.nodeId || details.moduleType || "unknown"}`;
}

function nodeGraphModuleDiagnosticsFaultDetail(details = {}) {
  const label = details.label || nodeGraphNodeLabels?.[details.moduleType] || details.moduleType || details.moduleName || "A module";
  if (details.kind === "native-load") {
    return `${label} failed to load its native engine (${details.status || "unknown status"})${details.message ? `: ${details.message}` : ""}. It may be running a slower fallback, or not running at all.`;
  }
  if (details.kind === "native-exception") {
    return `${label} threw an error while running (${details.message || "no message"}). It has fallen back to its JS implementation, or stopped producing output.`;
  }
  if (details.kind === "silent-node") {
    return `${label} is wired to Output but has produced no valid signal for ${nodeGraphModuleDiagnosticsSilenceWindowSeconds}+ seconds (reason: ${details.reason || "bad values"}). Check its parameters -- if this persists, it may be a genuine bug.`;
  }
  return `${label} reported an unspecified issue.`;
}

function nodeGraphRecordModuleFault(details = {}) {
  const key = nodeGraphModuleFaultKey(details);
  const state = nodeGraphModuleDiagnosticsState();
  const existing = state.faults.find((fault) => fault.key === key);
  const detail = nodeGraphModuleDiagnosticsFaultDetail(details);
  if (existing) {
    existing.detail = detail;
    existing.count = (existing.count || 1) + 1;
    existing.lastSeen = Date.now();
  } else {
    state.serial += 1;
    state.faults.push({
      count: 1,
      detail,
      firstSeen: Date.now(),
      key,
      kind: details.kind || "fault",
      lastSeen: Date.now(),
      serial: state.serial,
    });
  }
  nodeGraphApplyModuleDiagnosticsFaultUi();
  return true;
}

function nodeGraphClearModuleFault(key) {
  const state = nodeGraphModuleDiagnosticsState();
  const index = state.faults.findIndex((fault) => fault.key === key);
  if (index === -1) {
    return false;
  }
  state.faults.splice(index, 1);
  nodeGraphApplyModuleDiagnosticsFaultUi();
  return true;
}

function closeNodeGraphModuleDiagnosticsFaultUi() {
  const fault = document.getElementById("nodeModuleDiagnosticsFault");
  if (fault) {
    fault.hidden = true;
  }
  document.body?.classList.remove("node-module-diagnostics-tripped");
}

function nodeGraphResetModuleDiagnosticsFault() {
  const state = nodeGraphModuleDiagnosticsState();
  state.faults = [];
  closeNodeGraphModuleDiagnosticsFaultUi();
}

function bindNodeGraphModuleDiagnosticsFaultUi() {
  document
    .getElementById("nodeModuleDiagnosticsFaultClose")
    ?.addEventListener("click", nodeGraphResetModuleDiagnosticsFault);
  if (document.documentElement.dataset.nodeModuleDiagnosticsFaultDelegatedClose === "true") {
    return;
  }
  document.documentElement.dataset.nodeModuleDiagnosticsFaultDelegatedClose = "true";
  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("#nodeModuleDiagnosticsFaultClose")) {
      nodeGraphResetModuleDiagnosticsFault();
    }
  });
}

function nodeGraphApplyModuleDiagnosticsFaultUi() {
  const state = nodeGraphModuleDiagnosticsState();
  const fault = document.getElementById("nodeModuleDiagnosticsFault");
  const list = document.getElementById("nodeModuleDiagnosticsFaultList");
  if (!fault || !list) {
    return;
  }
  if (state.faults.length === 0) {
    closeNodeGraphModuleDiagnosticsFaultUi();
    return;
  }
  const kicker = document.getElementById("nodeModuleDiagnosticsFaultKicker");
  const title = document.getElementById("nodeModuleDiagnosticsFaultTitle");
  const explain = document.getElementById("nodeModuleDiagnosticsFaultExplain");
  if (kicker) kicker.textContent = "Module Diagnostics";
  if (title) title.textContent = "A module isn't working correctly";
  if (explain) {
    explain.textContent = "This is informational only -- audio keeps playing. It flags native modules that "
      + "failed to load, threw an error while running, or a wired node stuck producing no signal, so a "
      + "silent failure doesn't look like nothing is wrong.";
  }
  list.innerHTML = "";
  for (const item of state.faults) {
    const entry = document.createElement("li");
    entry.className = "node-module-diagnostics-fault-entry";
    entry.textContent = item.count > 1 ? `${item.detail} (x${item.count})` : item.detail;
    list.append(entry);
  }
  document.body?.classList.add("node-module-diagnostics-tripped");
  fault.hidden = false;
}

// Native WASM load failure or in-flight exception, reported via the
// worklet's existing "nativeModuleStatus" postMessage (status !== "ready").
function nodeGraphRecordNativeModuleFault(message = {}) {
  const status = String(message.status || "");
  const kind = status === "disabled" ? "native-exception" : "native-load";
  nodeGraphRecordModuleFault({
    kind,
    message: message.message || "",
    moduleName: message.name || "",
    moduleType: message.targetType || "",
    status,
  });
}

// Sustained silence/NaN detection for a reachable, non-bypassed node, fed
// by the worklet's "meter" message (badNumberCount/lastBadValueNodeId).
// Fires once per continuous bad streak, then suppresses until the node
// reports a good value again.
function nodeGraphTrackNodeSilenceWindow(nodeId, isBad, reason = "") {
  if (!nodeId) {
    return;
  }
  let reachableNodes;
  let bypassedNodes;
  try {
    const plan = compileNodeGraphExecutionPlan(nodeGraphMvp.patch);
    reachableNodes = new Set(plan.reachableNodes || []);
    bypassedNodes = new Set(plan.bypassedNodes || []);
  } catch (_error) {
    return;
  }
  if (!reachableNodes.has(nodeId) || bypassedNodes.has(nodeId)) {
    nodeGraphModuleDiagnosticsState().silenceTracking.delete(nodeId);
    nodeGraphClearModuleFault(`silent-node:${nodeId}`);
    return;
  }

  const tracking = nodeGraphModuleDiagnosticsState().silenceTracking;
  const now = Date.now();
  if (!isBad) {
    tracking.delete(nodeId);
    nodeGraphClearModuleFault(`silent-node:${nodeId}`);
    return;
  }

  const entry = tracking.get(nodeId) || { firedFault: false, since: now };
  if (!tracking.has(nodeId)) {
    tracking.set(nodeId, entry);
  }
  const elapsedSeconds = (now - entry.since) / 1000;
  if (!entry.firedFault && elapsedSeconds >= nodeGraphModuleDiagnosticsSilenceWindowSeconds) {
    entry.firedFault = true;
    const node = (nodeGraphMvp.patch?.nodes || []).find((candidate) => candidate.id === nodeId);
    nodeGraphRecordModuleFault({
      kind: "silent-node",
      moduleType: node?.type || "",
      nodeId,
      reason,
    });
  }
}

// The worklet's "meter" message only names a single most-recent bad nodeId
// per tick, not a full per-node good/bad status. When a tick reports zero
// bad values at all, that means every previously-tracked node has recovered
// (the worklet's own badNumberCount resets to 0 each report window), so
// clear everything being tracked.
function nodeGraphClearAllTrackedModuleSilence() {
  const tracking = nodeGraphModuleDiagnosticsState().silenceTracking;
  for (const nodeId of [...tracking.keys()]) {
    tracking.delete(nodeId);
    nodeGraphClearModuleFault(`silent-node:${nodeId}`);
  }
}

// -----------------------------------------------------------------------
// "Check All Modules" -- an on-demand self-test, triggered only by a
// button in Settings (never automatically). It tests every native module
// in native-modules-catalog.json directly, independent of the live audio
// worklet or the current patch, so it works whether or not live audio is
// running and can't be confused by whatever happens to be wired up.
//
// One depth on this branch: every native module gets a load check
// (fetch its .wasm, attempt WebAssembly.instantiate). A deeper
// create->sample->x/y->destroy signal-sanity check is available for
// modules whose raw export convention and default parameters are known
// precisely, but that per-module manifest is deliberately not part of
// this branch (kept in the separate product repo it belongs to).
const nodeGraphDeepSelfTestManifest = Object.freeze([]);

const nodeGraphModuleSelfTestSampleCount = 2000;
const nodeGraphModuleSelfTestSampleRate = 44100;

async function nodeGraphRunDeepModuleSelfTest(entry, manifestEntry) {
  try {
    const response = await fetch(entry.wasmUrl, { cache: "no-store" });
    if (!response.ok) {
      return { ok: false, reason: `wasm fetch failed (HTTP ${response.status})` };
    }
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const exportsObj = instance.exports;
    const prefix = manifestEntry.exportPrefix;
    const create = exportsObj[`${prefix}_create`];
    const destroy = exportsObj[`${prefix}_destroy`];
    const sample = exportsObj[`${prefix}_sample`];
    const getX = exportsObj[`${prefix}_x`];
    const getY = exportsObj[`${prefix}_y`];
    if (!create || !destroy || !sample || !getX || !getY) {
      return { ok: false, reason: `missing expected exports (${prefix}_create/_destroy/_sample/_x/_y)` };
    }
    const handle = create();
    if (!handle) {
      return { ok: false, reason: "create() returned no handle (pool exhausted?)" };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let badCount = 0;
    for (let i = 0; i < nodeGraphModuleSelfTestSampleCount; i++) {
      sample(handle, ...manifestEntry.args, nodeGraphModuleSelfTestSampleRate);
      const x = getX(handle);
      const y = getY(handle);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        badCount += 1;
        continue;
      }
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    destroy(handle);
    if (badCount > 0) {
      return { ok: false, reason: `produced NaN/Inf on ${badCount}/${nodeGraphModuleSelfTestSampleCount} samples` };
    }
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    if (rangeX < 1e-9 && rangeY < 1e-9) {
      return { ok: false, reason: `output never changed across ${nodeGraphModuleSelfTestSampleCount} samples (frozen at X=${minX}, Y=${minY})` };
    }
    return {
      ok: true,
      reason: `finite, varying output over ${nodeGraphModuleSelfTestSampleCount} samples (ΔX=${rangeX.toFixed(4)}, ΔY=${rangeY.toFixed(4)})`,
    };
  } catch (error) {
    return { ok: false, reason: String(error?.message || error || "unknown error") };
  }
}

async function nodeGraphRunGenericModuleLoadCheck(entry) {
  try {
    const response = await fetch(entry.wasmUrl, { cache: "no-store" });
    if (!response.ok) {
      return { ok: false, reason: `wasm fetch failed (HTTP ${response.status})` };
    }
    const bytes = await response.arrayBuffer();
    await WebAssembly.instantiate(bytes, {});
    return { ok: true, reason: "wasm fetched and instantiated successfully" };
  } catch (error) {
    return { ok: false, reason: String(error?.message || error || "unknown error") };
  }
}

function nodeGraphShowModuleSelfTestReport(report) {
  const fault = document.getElementById("nodeModuleDiagnosticsFault");
  const list = document.getElementById("nodeModuleDiagnosticsFaultList");
  const kicker = document.getElementById("nodeModuleDiagnosticsFaultKicker");
  const title = document.getElementById("nodeModuleDiagnosticsFaultTitle");
  const explain = document.getElementById("nodeModuleDiagnosticsFaultExplain");
  if (!fault || !list) {
    return;
  }
  if (kicker) kicker.textContent = "Module Self-Test";
  list.innerHTML = "";
  if (report.running) {
    if (title) title.textContent = "Checking all modules...";
    if (explain) explain.textContent = "Fetching and testing every native module. This takes a few seconds.";
  } else {
    const okCount = report.results.filter((item) => item.ok).length;
    if (title) title.textContent = `${okCount}/${report.results.length} modules OK`;
    if (explain) {
      explain.textContent = "\"load + signal check\" ran the module for 2000 samples and confirmed varying, "
        + "finite output. \"load check only\" confirmed its WASM loads, but didn't run it (this module's call "
        + "convention isn't part of this self-test's known list).";
    }
    for (const item of report.results) {
      const entry = document.createElement("li");
      entry.className = `node-module-diagnostics-fault-entry${item.ok ? " node-module-diagnostics-fault-entry-ok" : ""}`;
      entry.textContent = `${item.ok ? "OK" : "FAIL"} — ${item.label} (${item.depth}): ${item.reason}`;
      list.append(entry);
    }
  }
  document.body?.classList.add("node-module-diagnostics-tripped");
  fault.hidden = false;
}

let nodeGraphModuleSelfTestRunning = false;

async function runNodeGraphModuleSelfTest() {
  if (nodeGraphModuleSelfTestRunning) {
    return;
  }
  nodeGraphModuleSelfTestRunning = true;
  const button = document.getElementById("nodeCheckAllModulesButton");
  if (button) {
    button.disabled = true;
  }
  try {
    nodeGraphShowModuleSelfTestReport({ running: true, results: [] });
    const deepManifestByTargetType = new Map(
      nodeGraphDeepSelfTestManifest.map((entry) => [entry.targetType, entry]),
    );
    let catalog;
    try {
      catalog = await fetchNodeGraphLiveNativeModuleCatalog();
    } catch (_error) {
      catalog = { modules: [] };
    }
    const modules = Array.isArray(catalog?.modules) ? catalog.modules : [];
    const results = [];
    for (const entry of modules) {
      const manifestEntry = deepManifestByTargetType.get(entry.targetType);
      const result = manifestEntry
        ? await nodeGraphRunDeepModuleSelfTest(entry, manifestEntry)
        : await nodeGraphRunGenericModuleLoadCheck(entry);
      results.push({
        depth: manifestEntry ? "load + signal check" : "load check only",
        label: entry.label || entry.targetType || entry.name || "unknown module",
        ok: result.ok,
        reason: result.reason,
      });
    }
    nodeGraphShowModuleSelfTestReport({ running: false, results });
  } finally {
    nodeGraphModuleSelfTestRunning = false;
    if (button) {
      button.disabled = false;
    }
  }
}

function createNodeGraphPort(node, type, port, io) {
  const button = document.createElement("button");
  button.className = `node-port ${io}`;
  button.type = "button";
  button.dataset.node = node;
  button.dataset.port = port;
  button.dataset.io = io;
  button.dataset.alias = nodeGraphLabel(node, port);
  const portLabel = nodeGraphPatchNodePortDisplayLabel(node, type, port, io);
  const label = `${nodeGraphNodeLabels[type]} ${io} port ${portLabel}`;
  button.setAttribute("aria-label", label);
  return button;
}

function nodeGraphPortDisplayLabel(type, port, io) {
  const labels = io === "output"
    ? nodeGraphModuleDefinitions[type]?.outputLabels
    : nodeGraphModuleDefinitions[type]?.inputLabels;
  return labels?.[port] || port;
}

function nodeGraphPatchNodePortDisplayLabel(node, type, port, io) {
  const patchNode = typeof node === "string" ? nodeGraphPatchNode(node) : node;
  const alias = normalizeNodeGraphPatchMetadataAlias(patchNode?.portMeta?.[io]?.[port]?.alias);
  return alias || nodeGraphPortDisplayLabel(type, port, io);
}

function createNodeGraphIoColumn(node, type, ports, io) {
  if (!ports?.length) {
    return null;
  }

  const column = document.createElement("div");
  column.className = `node-io-column ${io}`;
  for (const port of ports) {
    const row = document.createElement("div");
    row.className = `node-io-row ${io}`;
    row.dataset.node = node;
    row.dataset.port = port;
    row.dataset.io = io;
    row.dataset.alias = nodeGraphLabel(node, port);
    const portLabel = nodeGraphPatchNodePortDisplayLabel(node, type, port, io);
    row.setAttribute(
      "aria-label",
      `${nodeGraphNodeLabels[type]} ${io} port ${portLabel} interaction area`,
    );
    const label = document.createElement("span");
    label.className = "node-io-label";
    label.dataset.portLabel = port;
    label.textContent = portLabel;
    if (io === "input") {
      row.append(createNodeGraphPort(node, type, port, io), label);
    } else {
      row.append(label, createNodeGraphPort(node, type, port, io));
    }
    column.append(row);
  }
  return column;
}

function createNodeParameterModulationPort(node, type, parameter) {
  const button = document.createElement("button");
  button.className = "node-param-port modulation-input";
  button.type = "button";
  button.dataset.node = node;
  button.dataset.param = parameter.key;
  button.dataset.port = parameter.key;
  button.dataset.io = "modulation";
  button.dataset.alias = `${nodeGraphNodeDisplayName(node)}.${parameter.key} mod`;
  const label = `${nodeGraphNodeLabels[type]} ${parameter.label} modulation input`;
  button.setAttribute("aria-label", label);
  return button;
}

function createNodeParameterOutputPort(node, type, parameter) {
  const button = document.createElement("button");
  button.className = "node-param-port parameter-output node-port output";
  button.type = "button";
  button.dataset.node = node;
  button.dataset.param = parameter.key;
  button.dataset.port = parameter.key;
  button.dataset.io = "output";
  button.dataset.alias = `${nodeGraphNodeDisplayName(node)}.${parameter.key} slider`;
  const label = `${nodeGraphNodeLabels[type]} ${parameter.label} slider output`;
  button.setAttribute("aria-label", label);
  return button;
}

function syncNodeGraphModulePortLabels(element, patchNode) {
  if (!element || !patchNode) {
    return;
  }
  for (const row of element.querySelectorAll(".node-io-row")) {
    const io = row.dataset.io;
    const port = row.dataset.port;
    if (io !== "input" && io !== "output") {
      continue;
    }
    const portLabel = nodeGraphPatchNodePortDisplayLabel(patchNode, patchNode.type, port, io);
    const label = row.querySelector(".node-io-label");
    if (label) {
      label.textContent = portLabel;
    }
    row.setAttribute(
      "aria-label",
      `${nodeGraphNodeLabels[patchNode.type]} ${io} port ${portLabel} interaction area`,
    );
    const button = row.querySelector(".node-port");
    if (button) {
      button.setAttribute("aria-label", `${nodeGraphNodeLabels[patchNode.type]} ${io} port ${portLabel}`);
    }
  }
}

function createNodeGraphInputPort(node, type, graphInput) {
  const button = document.createElement("button");
  button.className = "node-param-port graph-input";
  button.type = "button";
  button.dataset.node = node;
  button.dataset.graphInput = graphInput;
  button.dataset.port = graphInput;
  button.dataset.io = "graph";
  button.dataset.alias = `${nodeGraphNodeDisplayName(node)}.${graphInput}`;
  button.setAttribute("aria-label", `${nodeGraphNodeLabels[type]} ${graphInput} graph input`);
  return button;
}

function createNodeGraphInputSection(node, type) {
  const graphInputs = nodeGraphModuleGraphInputs(type);
  if (!graphInputs.length) {
    return null;
  }
  const section = document.createElement("div");
  section.className = "dsp-node-graph-input-section";
  for (const graphInput of graphInputs) {
    const row = document.createElement("div");
    row.className = "node-graph-input-row";
    row.dataset.node = node;
    row.dataset.graphInput = graphInput;
    row.dataset.port = graphInput;
    row.dataset.io = "graph";
    row.dataset.alias = `${nodeGraphNodeDisplayName(node)}.${graphInput}`;
    row.setAttribute("aria-label", `${nodeGraphNodeLabels[type]} ${graphInput} graph input interaction area`);
    const label = document.createElement("span");
    label.className = "node-graph-input-label";
    label.textContent = graphInput;
    row.append(createNodeGraphInputPort(node, type, graphInput), label);
    section.append(row);
  }
  return section;
}

function createNodeGraphModuleScopeSection(node, type) {
  const section = document.createElement("div");
  section.className = "node-module-scope-window";
  section.dataset.node = node;
  section.dataset.nodeType = type;
  section.dataset.tooltipKey = "module.scopeWindow";
  section.setAttribute("aria-label", `${nodeGraphNodeDisplayName(node)} scope`);
  if (typeof nodeGraphApplyTooltip === "function") {
    nodeGraphApplyTooltip(section, "module.scopeWindow");
  }

  const surface = document.createElement("div");
  surface.className = "node-module-scope-window-surface";
  section.append(surface);

  const analyzer = document.createElement("div");
  analyzer.className = "node-module-scope-analyzer";
  analyzer.hidden = true;
  section.append(analyzer);
  return section;
}

function createNodeGraphLedFace(node, type) {
  const face = document.createElement("div");
  face.className = "node-led-face";
  face.dataset.node = node;
  face.dataset.nodeType = type;
  face.setAttribute("aria-label", `${nodeGraphNodeDisplayName(node)} LED`);
  face.append(createNodeGraphPort(node, type, "In", "input"));
  return face;
}

function createNodeGraphSliderWidgetBody(node, type) {
  const definition = nodeGraphModuleDefinitions[type];
  const body = document.createElement("div");
  body.className = "node-slider-widget-body";
  const parameter = definition?.parameters?.[0];
  if (parameter) {
    const row = createNodeGraphParameter(node, type, parameter);
    row.classList.add("node-slider-widget-row");
    body.append(row);
  }
  return body;
}

function createNodeGraphPatchCommandBody(node) {
  const body = document.createElement("div");
  body.className = "node-patch-command-body";
  body.dataset.node = node;
  const patchNode = nodeGraphPatchNodeById(node);
  const previous = patchNode?.type === "previousPatch";
  const label = document.createElement("strong");
  label.textContent = previous ? "PREVIOUS PATCH" : "NEXT PATCH";
  const status = document.createElement("span");
  status.textContent = "trigger input";
  body.append(label, status);
  return body;
}

function nodeGraphKnobWidgetValueAngle(value, parameter) {
  const min = Number(parameter?.min);
  const max = Number(parameter?.max);
  const range = max - min;
  const normalized = Number.isFinite(range) && range > 0
    ? clampNodeSliderValue((Number(value) - min) / range, 0, 1)
    : 0;
  return -132 + normalized * 264;
}

function applyNodeGraphInputUnboundedValue(input, value) {
  const number = Number(value);
  const min = Number(input?.min);
  const max = Number(input?.max);
  const unboundedMin = input?.dataset?.unboundedMin === "true";
  const unboundedMax = input?.dataset?.unboundedMax === "true";
  if (
    Number.isFinite(number) &&
    ((unboundedMin && Number.isFinite(min) && number < min) ||
      (unboundedMax && Number.isFinite(max) && number > max))
  ) {
    input.dataset.unboundedValue = String(number);
  } else if (input) {
    delete input.dataset.unboundedValue;
  }
}

function createNodeGraphKnobWidgetBody(node, type) {
  const definition = nodeGraphModuleDefinitions[type];
  const parameter = definition?.parameters?.[0];
  const patchNode = nodeGraphPatchNode(node);
  const value = patchNode?.params?.[parameter?.key] ?? parameter?.defaultValue ?? "0";
  const body = document.createElement("div");
  body.className = "node-knob-widget-body";
  body.dataset.node = node;

  const control = document.createElement("button");
  control.className = "node-knob-widget-control";
  control.type = "button";
  control.dataset.knobWidgetControl = "true";
  control.dataset.param = parameter?.key || "value";
  control.setAttribute("role", "slider");
  control.setAttribute("aria-label", `${nodeGraphNodeLabels[type]} ${parameter?.label || "Value"}`);
  control.setAttribute("aria-valuemin", parameter?.min ?? "0");
  control.setAttribute("aria-valuemax", parameter?.max ?? "1");
  control.setAttribute("aria-valuenow", String(value));
  control.style.setProperty("--knob-widget-angle", `${nodeGraphKnobWidgetValueAngle(value, parameter)}deg`);

  const knobSlot = document.createElement("span");
  knobSlot.className = "node-knob-widget-slot";
  const face = document.createElement("span");
  face.className = "node-knob-widget-face";
  const readout = document.createElement("span");
  readout.className = "node-knob-widget-value";
  readout.dataset.knobWidgetValue = "true";
  readout.textContent = formatNodeSliderNumber(value);
  knobSlot.append(face);
  control.append(knobSlot);

  const input = document.createElement("input");
  input.className = "node-knob-widget-input";
  input.type = "range";
  input.dataset.param = parameter?.key || "value";
  input.dataset.step = parameter?.step ?? "any";
  input.dataset.mid = parameter?.mid ?? "0";
  input.dataset.default = parameter?.defaultValue ?? "0";
  input.dataset.kind = parameter?.kind ?? "";
  input.dataset.unit = parameter?.unit ?? "";
  input.dataset.linearSmoothing = parameter?.linearSmoothing === false ? "false" : "true";
  input.dataset.nonlinearSlider = parameter?.nonlinearSlider ? "true" : "false";
  input.dataset.unboundedMax = parameter?.unboundedMax ? "true" : "false";
  input.dataset.unboundedMin = parameter?.unboundedMin ? "true" : "false";
  input.min = parameter?.min ?? "0";
  input.max = parameter?.max ?? "1";
  input.step = parameter?.step === "any" ? "any" : (parameter?.step ?? "0.01");
  input.value = String(value);
  applyNodeGraphInputUnboundedValue(input, value);

  const outputKey = parameter?.key || "value";
  const output = createNodeGraphPort(node, type, outputKey, "output");
  output.classList.add("node-knob-widget-output");
  output.dataset.param = outputKey;
  output.dataset.alias = `${nodeGraphNodeDisplayName(node)} knob value`;

  body.append(control, readout, input, output);
  return body;
}

function createNodeGraphModuleShopBody(node) {
  const body = document.createElement("div");
  body.className = "node-module-shop-body";
  const title = document.createElement("div");
  title.className = "node-module-shop-title";
  title.textContent = "Module Browser";
  const button = document.createElement("button");
  button.className = "node-module-shop-open-button";
  button.type = "button";
  button.dataset.node = node;
  button.setAttribute("aria-label", "Open module browser");
  button.textContent = "Open Module Browser";
  body.append(title, button);
  return body;
}

function createNodeGraphModuleHomeBody(node) {
  const body = document.createElement("div");
  body.className = "node-module-home-body";
  const title = document.createElement("div");
  title.className = "node-module-home-title";
  title.textContent = "Offline Modules: Hidden";
  const button = document.createElement("button");
  button.className = "node-module-home-open-button";
  button.type = "button";
  button.dataset.node = node;
  button.setAttribute("aria-label", "Open user module collection");
  button.textContent = "Open Home";
  body.append(title, button);
  return body;
}

function createNodeGraphSpeakerProtectionBody(node) {
  const body = document.createElement("div");
  body.className = "node-speaker-protection-body";
  body.dataset.node = node;

  const status = document.createElement("strong");
  status.dataset.speakerProtectionStatus = "true";

  const limit = document.createElement("span");
  limit.textContent = "limit 1.0";

  const peak = document.createElement("span");
  peak.dataset.speakerProtectionPeak = "true";

  body.append(status, limit, peak);
  renderNodeGraphSpeakerProtectionBody(body);
  return body;
}

function renderNodeGraphSpeakerProtectionBody(body) {
  const status = body?.querySelector?.("[data-speaker-protection-status]");
  const peak = body?.querySelector?.("[data-speaker-protection-peak]");
  const tripped = typeof nodeGraphEarProtectionIsTripped === "function" && nodeGraphEarProtectionIsTripped();
  body?.classList.toggle("tripped", tripped);
  if (status) {
    status.textContent = tripped ? "TRIPPED" : "ARMED";
  }
  if (peak) {
    const details = globalThis.nodeGraphEarProtectionDetails || {};
    const value = Number(details.protectionPeak);
    peak.textContent = Number.isFinite(value) && value > 0
      ? `peak ${value.toFixed(3)}`
      : "peak --";
  }
}

function refreshNodeGraphSpeakerProtectionBodies() {
  document.querySelectorAll(".node-speaker-protection-body").forEach((body) => {
    renderNodeGraphSpeakerProtectionBody(body);
  });
}

let nodeGraphFormulaVisualFrame = null;
const nodeGraphFormulaVisualExpressionCache = new Map();

function nodeGraphFormulaVisualParam(nodeId, key, fallback = 0) {
  const liveValue = Number(nodeGraphMvp.visualControls?.formulaVisual?.[nodeId]?.[key]);
  if (Number.isFinite(liveValue)) {
    return liveValue;
  }
  if (typeof nodeGraphReadNodeNumber === "function") {
    const value = Number(nodeGraphReadNodeNumber(nodeId, key));
    return Number.isFinite(value) ? value : fallback;
  }
  const element = document.querySelector?.(`.dsp-node[data-node="${CSS.escape(nodeId)}"] input[data-param="${CSS.escape(key)}"]`);
  const value = Number(element?.dataset?.unboundedValue ?? element?.value);
  return Number.isFinite(value) ? value : fallback;
}

function nodeGraphFormulaVisualResizeCanvas(canvas, options = {}) {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = Math.max(1, Math.min(2, Number(options.pixelRatio) || window.devicePixelRatio || 1));
  const cssWidth = Math.max(1, Number(options.width) || rect.width || canvas.width || 1);
  const cssHeight = Math.max(1, Number(options.height) || rect.height || canvas.height || 1);
  const width = Math.max(1, Math.round(cssWidth * pixelRatio));
  const height = Math.max(1, Math.round(cssHeight * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { height, pixelRatio, width };
}

function nodeGraphFormulaVisualExpression(source = "", property = "x", fallback = "") {
  const text = String(source || "");
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:formula\\.)?${property}\\s*=\\s*([^;\\n]+)\\s*;?`, "i"));
  return String(match?.[1] || fallback || "0").trim().slice(0, 2000) || "0";
}

function compileNodeGraphFormulaVisualExpression(expression, fallbackExpression) {
  const source = String(expression || fallbackExpression || "0").trim() || "0";
  const cacheKey = source;
  if (nodeGraphFormulaVisualExpressionCache.has(cacheKey)) {
    return nodeGraphFormulaVisualExpressionCache.get(cacheKey);
  }
  let compiled = null;
  try {
    compiled = new Function(
      "v",
      [
        "\"use strict\";",
        "const {abs, atan2, cos, max, min, PI, pow, sin, sqrt, tan} = Math;",
        "const {a, b, mix, p, petals, phase, progress, t, lissX, lissY, roseX, roseY, spiroX, spiroY} = v;",
        `const value = (${source});`,
        "return Number.isFinite(Number(value)) ? Number(value) : 0;",
      ].join("\n"),
    );
  } catch {
    compiled = () => 0;
  }
  nodeGraphFormulaVisualExpressionCache.set(cacheKey, compiled);
  if (nodeGraphFormulaVisualExpressionCache.size > 64) {
    nodeGraphFormulaVisualExpressionCache.delete(nodeGraphFormulaVisualExpressionCache.keys().next().value);
  }
  return compiled;
}

function nodeGraphFormulaVisualScriptForNode(nodeId) {
  return normalizeNodeGraphFormulaVisualScript(nodeGraphPatchNode(nodeId)?.formulaVisual);
}

function drawNodeGraphFormulaVisualCanvas(canvas, timeMs = performance.now(), options = {}) {
  const nodeId = canvas?.dataset?.node;
  if (!canvas || !nodeId) {
    return false;
  }
  const context = canvas.getContext("2d");
  if (!context) {
    return false;
  }
  const { height, pixelRatio, width } = nodeGraphFormulaVisualResizeCanvas(canvas, options);
  const minSide = Math.max(1, Math.min(width, height));
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const param = (key, fallback) => nodeGraphFormulaVisualParam(nodeId, key, fallback);
  const a = Math.max(1, Math.round(param("formulaA", 3)));
  const b = Math.max(1, Math.round(param("formulaB", 2)));
  const petals = Math.max(1, param("formulaPetals", 5));
  const roseMix = Math.max(0, Math.min(1, param("formulaMix", 0.38)));
  const scale = Math.max(0.02, param("formulaScale", 0.82));
  const rotation = param("formulaRotate", 0.12) * Math.PI * 2;
  const morph = Math.max(0, param("formulaMorph", 0.25));
  const hue = ((param("formulaHue", 0.64) % 1) + 1) % 1;
  const glow = Math.max(0, Math.min(1, param("formulaGlow", 0.85)));
  const dots = Math.max(0, Math.min(1, param("formulaDots", 0.55)));
  const phase = timeMs * 0.00028 * morph;
  const radius = minSide * 0.42 * scale;
  const pointCount = Math.max(240, Math.min(2600, Math.round(minSide * 2.5)));
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const colorA = `hsl(${Math.round(hue * 360)} 94% 66%)`;
  const colorB = `hsl(${Math.round((hue * 360 + 76) % 360)} 92% 60%)`;
  const script = nodeGraphFormulaVisualScriptForNode(nodeId);
  const xExpression = nodeGraphFormulaVisualExpression(script.source, "x", "lissX * (1 - mix) + roseX * mix");
  const yExpression = nodeGraphFormulaVisualExpression(script.source, "y", "lissY * (1 - mix) + roseY * mix");
  const xFormula = compileNodeGraphFormulaVisualExpression(xExpression, "lissX * (1 - mix) + roseX * mix");
  const yFormula = compileNodeGraphFormulaVisualExpression(yExpression, "lissY * (1 - mix) + roseY * mix");

  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(0, 0, 0, 0.92)";
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.lineJoin = "round";

  const points = [];
  for (let i = 0; i <= pointCount; i += 1) {
    const progress = i / pointCount;
    const t = progress * Math.PI * 2;
    const lissX = Math.sin(a * t + phase);
    const lissY = Math.sin(b * t + phase * 1.31 + Math.PI * 0.5);
    const rose = Math.cos(petals * t + phase * 0.7);
    const roseX = rose * Math.cos(t);
    const roseY = rose * Math.sin(t);
    const spiroRadius = 0.72 + 0.28 * Math.cos(petals * t + phase);
    const spiroX = spiroRadius * Math.cos(a * t + phase * 0.35) + 0.22 * Math.cos((a + b) * t - phase);
    const spiroY = spiroRadius * Math.sin(b * t - phase * 0.45) - 0.22 * Math.sin((a + petals) * t + phase);
    const formulaValues = {
      a,
      b,
      lissX,
      lissY,
      mix: roseMix,
      p: progress,
      petals,
      phase,
      progress,
      roseX,
      roseY,
      spiroX,
      spiroY,
      t,
    };
    const rawX = Math.max(-3, Math.min(3, xFormula(formulaValues)));
    const rawY = Math.max(-3, Math.min(3, yFormula(formulaValues)));
    const x = centerX + (rawX * cosR - rawY * sinR) * radius;
    const y = centerY + (rawX * sinR + rawY * cosR) * radius;
    points.push([x, y, progress]);
  }

  for (let pass = 0; pass < 2; pass += 1) {
    context.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.strokeStyle = pass === 0 ? colorB : colorA;
    context.globalAlpha = pass === 0 ? 0.11 + glow * 0.22 : 0.58 + glow * 0.28;
    context.lineWidth = (pass === 0 ? 7.5 : 1.25) * pixelRatio * (0.6 + glow);
    context.shadowBlur = pass === 0 ? 15 * pixelRatio * glow : 4 * pixelRatio * glow;
    context.shadowColor = pass === 0 ? colorB : colorA;
    context.stroke();
  }

  if (dots > 0.01) {
    const stride = Math.max(1, Math.round(9 - dots * 7));
    context.shadowBlur = 8 * pixelRatio * glow;
    context.shadowColor = colorA;
    for (let i = 0; i < points.length; i += stride) {
      const [x, y, progress] = points[i];
      context.beginPath();
      context.fillStyle = `hsl(${Math.round((hue * 360 + progress * 96) % 360)} 96% 68%)`;
      context.globalAlpha = 0.18 + dots * 0.56;
      context.arc(x, y, (0.75 + dots * 1.8) * pixelRatio, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
  context.shadowBlur = 0;
  return true;
}

function drawNodeGraphFormulaVisuals(timeMs = performance.now()) {
  let needsAnimation = false;
  for (const canvas of document.querySelectorAll(".node-formula-visual-canvas")) {
    needsAnimation = drawNodeGraphFormulaVisualCanvas(canvas, timeMs) || needsAnimation;
  }
  return needsAnimation;
}

function scheduleNodeGraphFormulaVisualDraw() {
  if (nodeGraphFormulaVisualFrame !== null) {
    return;
  }
  nodeGraphFormulaVisualFrame = window.requestAnimationFrame((timeMs) => {
    nodeGraphFormulaVisualFrame = null;
    if (drawNodeGraphFormulaVisuals(timeMs)) {
      scheduleNodeGraphFormulaVisualDraw();
    }
  });
}

function createNodeGraphFormulaVisualBody(node) {
  const script = nodeGraphFormulaVisualScriptForNode(node);
  const body = document.createElement("div");
  body.className = "node-formula-visual-body";
  body.dataset.node = node;

  const canvas = document.createElement("canvas");
  canvas.className = "node-formula-visual-canvas";
  canvas.dataset.node = node;
  canvas.width = 320;
  canvas.height = 320;
  canvas.setAttribute("aria-label", `${nodeGraphNodeDisplayName(node)} formula visual`);
  const controls = document.createElement("div");
  controls.className = "node-formula-visual-controls";

  const preset = document.createElement("select");
  preset.className = "node-formula-visual-preset";
  preset.dataset.formulaVisualPreset = "true";
  preset.setAttribute("aria-label", "Formula preset");
  for (const [key, source] of Object.entries(nodeGraphFormulaVisualPresetSources)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    option.selected = script.preset === key && script.source === source;
    preset.append(option);
  }
  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "custom";
  customOption.selected = script.preset === "custom" || !Object.values(nodeGraphFormulaVisualPresetSources).includes(script.source);
  preset.append(customOption);

  const editor = document.createElement("textarea");
  editor.className = "node-formula-visual-source";
  editor.dataset.formulaVisualSource = "true";
  editor.spellcheck = false;
  editor.value = script.source;
  editor.setAttribute("aria-label", "Formula visual script");

  const apply = document.createElement("button");
  apply.type = "button";
  apply.dataset.formulaVisualApply = "true";
  apply.textContent = "Apply";

  controls.append(preset, editor, apply);
  body.append(canvas, controls);
  scheduleNodeGraphFormulaVisualDraw();
  return body;
}

function createNodeGraphScreenSpaceShaderBody(node) {
  const patchNode = nodeGraphPatchNode(node);
  const script = normalizeNodeGraphScreenSpaceShader(patchNode?.screenSpaceShader);
  const body = document.createElement("div");
  body.className = "node-screen-space-shader-body";
  body.dataset.node = node;

  const editor = document.createElement("textarea");
  editor.className = "node-screen-space-shader-source";
  editor.dataset.screenSpaceShaderSource = "true";
  editor.spellcheck = false;
  editor.value = script.source;
  editor.setAttribute("aria-label", "Screen space shader script");

  const footer = document.createElement("div");
  footer.className = "node-screen-space-shader-footer";
  const status = document.createElement("span");
  status.dataset.screenSpaceShaderStatus = "true";
  status.textContent = `${script.inputs.length} inputs / ${script.visualInputs.length} controls`;
  const apply = document.createElement("button");
  apply.type = "button";
  apply.dataset.screenSpaceShaderApply = "true";
  apply.textContent = "Apply";
  footer.append(status, apply);
  body.append(editor, footer);
  return body;
}

function refreshNodeGraphScreenSpaceShaderBodyStatus(body) {
  const source = body?.querySelector?.("[data-screen-space-shader-source]")?.value || "";
  const status = body?.querySelector?.("[data-screen-space-shader-status]");
  if (!status) {
    return;
  }
  const script = normalizeNodeGraphScreenSpaceShader({ source });
  status.textContent = `${script.inputs.length} inputs / ${script.visualInputs.length} controls`;
}

function createNodeGraphMacroControlsBody(node) {
  const section = document.createElement("section");
  section.className = "node-macro-controls-panel node-macro-controls-module";
  section.dataset.node = node;
  section.setAttribute("aria-label", "Macro controls");
  const heading = document.createElement("div");
  heading.className = "node-macro-controls-heading";
  const title = document.createElement("div");
  const kicker = document.createElement("span");
  kicker.textContent = "Performance Surface";
  const strong = document.createElement("strong");
  strong.textContent = "Macro Controls";
  title.append(kicker, strong);
  const status = document.createElement("span");
  status.className = "pill";
  status.dataset.macroControlsStatus = "true";
  status.textContent = "10 macros ready";
  heading.append(title, status);
  const row = document.createElement("div");
  row.className = "node-macro-controls-row";
  row.setAttribute("aria-label", "Macro knob row");
  for (let index = 0; index < 10; index += 1) {
    const knob = document.createElement("button");
    knob.className = "node-macro-knob";
    knob.type = "button";
    knob.dataset.macroIndex = String(index);
    knob.setAttribute("aria-label", `Macro ${index + 1}`);
    knob.setAttribute("aria-valuemin", "0");
    knob.setAttribute("aria-valuemax", "1");
    knob.setAttribute("aria-valuenow", "0");
    knob.setAttribute("role", "slider");
    const label = document.createElement("span");
    label.textContent = `M${index + 1}`;
    const indicator = document.createElement("i");
    const value = document.createElement("strong");
    value.dataset.macroValue = String(index);
    value.textContent = "0.00";
    knob.append(label, indicator, value);
    row.append(knob);
  }
  section.append(heading, row);
  return section;
}

function createNodeGraphPitchModWheelBody(node) {
  const section = document.createElement("section");
  section.className = "node-performance-wheels-panel node-performance-wheels-module";
  section.dataset.node = node;
  section.setAttribute("aria-label", "Pitch and modulation wheels");
  const heading = document.createElement("div");
  heading.className = "node-performance-wheels-heading";
  const kicker = document.createElement("span");
  kicker.textContent = "Performance";
  const strong = document.createElement("strong");
  strong.textContent = "Pitch / Mod Wheels";
  heading.append(kicker, strong);
  const bank = document.createElement("div");
  bank.className = "node-midi-keyboard-wheel-bank";
  const specs = [
    { className: "pitch", key: "pitchWheel", label: "Pitch", max: "1", min: "-1" },
    { className: "mod", key: "modWheel", label: "Mod", max: "1", min: "0" },
  ];
  for (const spec of specs) {
    const wheel = document.createElement("div");
    wheel.className = `node-midi-keyboard-wheel ${spec.className}`;
    wheel.dataset.performanceWheel = spec.key;
    wheel.setAttribute("role", "slider");
    wheel.setAttribute("aria-label", `${spec.label} wheel`);
    wheel.setAttribute("aria-valuemin", spec.min);
    wheel.setAttribute("aria-valuemax", spec.max);
    wheel.setAttribute("aria-valuenow", "0");
    wheel.tabIndex = 0;
    const label = document.createElement("span");
    label.textContent = spec.label;
    const indicator = document.createElement("i");
    const value = document.createElement("strong");
    value.dataset.performanceWheelValue = spec.key;
    value.textContent = "0.000";
    wheel.append(label, indicator, value);
    bank.append(wheel);
  }
  section.append(heading, bank);
  return section;
}

function createNodeGraphKeyboardControllerBody(node) {
  const section = document.createElement("section");
  section.className = "node-midi-keyboard-panel node-midi-keyboard-module";
  section.dataset.node = node;
  section.setAttribute("aria-label", "Mouse playable MIDI keyboard");
  const heading = document.createElement("div");
  heading.className = "node-midi-keyboard-heading";
  const title = document.createElement("div");
  title.className = "node-midi-keyboard-title";
  const titleKicker = document.createElement("span");
  titleKicker.textContent = "Instrument";
  const titleStrong = document.createElement("strong");
  titleStrong.textContent = "MIDI Keyboard";
  title.append(titleKicker, titleStrong);
  const controls = document.createElement("div");
  controls.className = "node-midi-keyboard-midi-controls";
  const modeLabel = document.createElement("label");
  modeLabel.className = "node-midi-keyboard-mode-control";
  const modeText = document.createElement("span");
  modeText.textContent = "Mode";
  const modeSelect = document.createElement("select");
  modeSelect.dataset.midiKeyboardModeSelect = "true";
  modeSelect.setAttribute("aria-label", "Keyboard mode");
  for (const [value, label] of [["press", "Press"], ["hold", "Hold"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    modeSelect.append(option);
  }
  modeLabel.append(modeText, modeSelect);
  const octave = document.createElement("span");
  octave.className = "node-midi-keyboard-octave-control";
  octave.setAttribute("aria-label", "Keyboard octave transpose");
  const down = document.createElement("button");
  down.type = "button";
  down.dataset.midiKeyboardOctaveDown = "true";
  down.setAttribute("aria-label", "Transpose keyboard down one octave");
  down.textContent = "-";
  const octaveValue = document.createElement("strong");
  octaveValue.dataset.midiKeyboardOctaveValue = "true";
  octaveValue.textContent = "+0";
  const up = document.createElement("button");
  up.type = "button";
  up.dataset.midiKeyboardOctaveUp = "true";
  up.setAttribute("aria-label", "Transpose keyboard up one octave");
  up.textContent = "+";
  octave.append(down, octaveValue, up);
  const midiButton = document.createElement("button");
  midiButton.type = "button";
  midiButton.dataset.midiKeyboardMidiButton = "true";
  midiButton.textContent = "Enable MIDI";
  const midiSelect = document.createElement("select");
  midiSelect.dataset.midiKeyboardMidiInput = "true";
  midiSelect.setAttribute("aria-label", "MIDI keyboard input");
  midiSelect.disabled = true;
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "no midi input";
  midiSelect.append(emptyOption);
  controls.append(modeLabel, octave, midiButton, midiSelect);
  heading.append(title, controls);

  const performance = document.createElement("div");
  performance.className = "node-midi-keyboard-performance";
  const surface = document.createElement("div");
  surface.className = "node-midi-keyboard-surface";
  surface.setAttribute("aria-label", "Two octave keyboard preview");
  const whiteRow = document.createElement("div");
  whiteRow.className = "node-midi-keyboard-white-row";
  whiteRow.setAttribute("aria-hidden", "true");
  for (const [midi, label] of [[48, "C3"], [50, "D3"], [52, "E3"], [53, "F3"], [55, "G3"], [57, "A3"], [59, "B3"], [60, "C4"], [62, "D4"], [64, "E4"], [65, "F4"], [67, "G4"], [69, "A4"], [71, "B4"], [72, "C5"]]) {
    const key = document.createElement("span");
    key.dataset.midi = String(midi);
    key.textContent = label;
    whiteRow.append(key);
  }
  const blackRow = document.createElement("div");
  blackRow.className = "node-midi-keyboard-black-row";
  blackRow.setAttribute("aria-hidden", "true");
  for (const keySpec of [
    [49, "C#3", "4.6%"], [51, "D#3", "11.2%"], [54, "F#3", "24.6%"], [56, "G#3", "31.2%"], [58, "A#3", "37.9%"],
    [61, "C#4", "51.2%"], [63, "D#4", "57.9%"], [66, "F#4", "71.2%"], [68, "G#4", "77.9%"], [70, "A#4", "84.6%"],
  ]) {
    const key = document.createElement("span");
    key.dataset.midi = String(keySpec[0]);
    key.style.setProperty("--key-left", keySpec[2]);
    key.textContent = keySpec[1];
    blackRow.append(key);
  }
  surface.append(whiteRow, blackRow);
  performance.append(surface);

  const signalBar = document.createElement("div");
  signalBar.className = "node-midi-keyboard-signal-bar";
  signalBar.dataset.midiKeyboardSignalBar = "true";
  signalBar.setAttribute("aria-live", "polite");
  const signals = [
    ["gate", "gate", "0"],
    ["gatePulse", "1s gate", "0"],
    ["key", "key", "-"],
    ["quantized", "q", "-"],
    ["octave", "oct", "+0"],
    ["midi", "midi", "-"],
    ["double", "double", "-"],
    ["tenthVoltPerOctave", ".1v/oct", "-"],
    ["increment", "inc", "-"],
    ["frequency", "freq", "-"],
    ["pitch", "pitch", "-"],
    ["x", "x", "0.000"],
    ["y", "y", "0.000"],
  ];
  for (const [key, labelText, valueText] of signals) {
    const item = document.createElement("span");
    item.append(document.createTextNode(`${labelText} `));
    const value = document.createElement("strong");
    value.dataset.keyboardSignal = key;
    value.textContent = valueText;
    item.append(value);
    if (key === "key") {
      item.append(document.createTextNode(" / 24"));
    }
    signalBar.append(item);
  }
  section.append(heading, performance, signalBar);
  return section;
}

function createNodeGraphParameter(node, type, parameter) {
  const row = document.createElement("div");
  row.className = "node-parameter-row";
  row.dataset.param = parameter.key;
  const constraint = normalizeNodeGraphResourceConstraint(parameter.constraint);
  if (constraint) {
    row.dataset.nodeConstraint = constraint;
  }
  row.append(createNodeParameterModulationPort(node, type, parameter));

  const label = document.createElement("label");
  label.className = "node-parameter-control";
  label.dataset.paramLabel = parameter.label;
  label.dataset.defaultParamLabel = parameter.defaultLabel || parameter.label;
  label.setAttribute("aria-label", parameter.label);
  const input = document.createElement("input");
  const legacyIds = {
    "bias.offset": "nodeBiasAmount",
    "gain.amount": "nodeGainAmount",
    "noise.level": "nodeNoiseLevel",
    "osc.frequency": "nodeOscFrequency",
    "osc.level": "nodeOscLevel",
    "osc.phase": "nodeOscPhase",
    "osc.waveform": "nodeOscWaveform",
  };
  input.id = legacyIds[`${node}.${parameter.key}`] || `node-${node}-${parameter.key}`;
  input.dataset.param = parameter.key;
  input.type = "range";
  input.min = parameter.min;
  input.max = parameter.max;
  input.step = "any";
  input.value = parameter.defaultValue;
  const metadata = nodeGraphParameterDefinitionMetadata(parameter);
  input.dataset.step = parameter.step;
  input.dataset.mid = parameter.mid;
  input.dataset.default = parameter.defaultValue;
  input.dataset.kind = metadata?.kind || "decimal";
  input.dataset.maxDigits = String(
    normalizeNodeGraphMetadataMaxDigits(metadata?.maxDigits, metadata?.kind),
  );
  input.dataset.unit = parameter.unit ?? "";
  input.dataset.choices = formatNodeMetadataChoices(parameter.choices || []);
  input.dataset.displayChoices = parameter.displayChoices ? "true" : "false";
  input.dataset.divideChoicesVisibly = parameter.divideChoicesVisibly ? "true" : "false";
  input.dataset.linearSmoothing = parameter.linearSmoothing === false ? "false" : "true";
  input.dataset.nonlinearSlider = metadata?.nonlinearSlider ? "true" : "false";
  input.dataset.showSign = parameter.showSign ? "true" : "false";
  input.dataset.unboundedMax = metadata?.unboundedMax ? "true" : "false";
  input.dataset.unboundedMin = metadata?.unboundedMin ? "true" : "false";
  input.dataset.wraparound = parameter.wraparound ? "true" : "false";
  applyNodeGraphInputUnboundedValue(input, input.value);
  input.setAttribute("aria-label", `${nodeGraphNodeLabels[type]} ${parameter.label}`);
  label.append(input);
  row.append(label);
  row.append(createNodeParameterOutputPort(node, type, parameter));
  return row;
}

function normalizeNodeGraphResourceConstraint(value) {
  const constraint = String(value || "").trim().toLowerCase();
  return ["cpu", "ram", "gpu"].includes(constraint) ? constraint : "";
}

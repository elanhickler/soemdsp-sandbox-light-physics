function nodeGraphModuleBodyRowCount(type) {
  const definition = nodeGraphModuleDefinitions[type];
  return definition?.parameters?.length || 0;
}

function nodeGraphModuleVisibleBodyRowCount(type) {
  return nodeGraphModuleBodyRowCount(type);
}

const nodeGraphModuleWidthLimits = Object.freeze({
  maxGu: 18,
  minGu: 4,
});

const nodeGraphModuleHeightLimits = Object.freeze({
  maxGu: 24,
  minGu: 1,
});

const nodeGraphModuleHeightOffsetLimits = Object.freeze({
  maxGu: 24,
  minGu: -24,
});

function nodeGraphModuleWidthLimitsForType(type) {
  if (nodeGraphModuleDefinitions[type]?.layout === "led") {
    return { ...nodeGraphModuleWidthLimits, minGu: 1 };
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "knobWidget") {
    return { ...nodeGraphModuleWidthLimits, minGu: 1 };
  }
  return nodeGraphModuleWidthLimits;
}

function nodeGraphModuleHeightLimitsForType(type) {
  if (type === "audioPlayer") {
    return { ...nodeGraphModuleHeightLimits, maxGu: nodeGraphModuleHeightLimits.maxGu + 1 };
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "formulaVisual") {
    return { ...nodeGraphModuleHeightLimits, maxGu: 36 };
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "knobWidget") {
    return { ...nodeGraphModuleHeightLimits, minGu: 1 };
  }
  return nodeGraphModuleHeightLimits;
}

const nodeGraphTextBoxHeightLimits = Object.freeze({
  maxGu: 24,
  minGu: 1,
});

function nodeGraphPatchNodeLayout(node) {
  const patchNode = typeof node === "string" ? nodeGraphPatchNode(node) : node;
  const fallback = nodeGraphModuleDefinitions[patchNode?.type]?.layout;
  if (patchNode?.type === "canvas" && typeof normalizeNodeGraphCanvasScript === "function") {
    const layout = normalizeNodeGraphCanvasScript(patchNode.canvasScript).layout;
    return layout === "oscilloscope" ? "visualScope" : fallback;
  }
  return fallback;
}

function nodeGraphModuleTypeHasHideableOscilloscope(type) {
  const layout = nodeGraphModuleDefinitions[type]?.layout;
  return Boolean(nodeGraphModuleDefinitions[type]) && ![
    "canvas",
    "clapPlugin",
    "filterCurve",
    "formulaVisual",
    "graph",
    "image",
    "keyboardController",
    "knobWidget",
    "led",
    "macroControls",
    "moduleHome",
    "moduleShop",
    "pitchModWheel",
    "screenSpaceShader",
    "sliderWidget",
    "speakerProtection",
    "textBox",
    "visualScope",
  ].includes(layout);
}

function nodeGraphPatchNodeHasHideableOscilloscope(node) {
  const patchNode = typeof node === "string" ? nodeGraphPatchNode(node) : node;
  const layout = nodeGraphPatchNodeLayout(patchNode);
  if (layout && layout !== nodeGraphModuleDefinitions[patchNode?.type]?.layout) {
    return false;
  }
  return nodeGraphModuleTypeHasHideableOscilloscope(patchNode?.type);
}

function nodeGraphModuleScopeExtraHeightUnits(type, ui = {}) {
  const normalizedUi = normalizeNodeGraphPatchNodeUi(ui);
  if (
    !nodeGraphModuleTypeHasHideableOscilloscope(type) ||
    normalizedUi.oscilloscopeHidden ||
    nodeGraphMvp?.moduleOscilloscopesVisible === false
  ) {
    return 0;
  }
  return nodeGraphModuleLayout.moduleScopeHeightGu;
}

function nodeGraphPatchNodeCanvasScriptGridUnits(node) {
  const patchNode = typeof node === "string" ? nodeGraphPatchNode(node) : node;
  if (patchNode?.type !== "canvas" || typeof normalizeNodeGraphCanvasScript !== "function") {
    return null;
  }
  const script = normalizeNodeGraphCanvasScript(patchNode.canvasScript);
  return {
    heightGu: Number.isFinite(Number(script.gridHeightGu)) ? Number(script.gridHeightGu) : null,
    widthGu: Number.isFinite(Number(script.gridWidthGu)) ? Number(script.gridWidthGu) : null,
  };
}

function nodeGraphDefaultModuleGridWidthUnits(type) {
  if (nodeGraphModuleDefinitions[type]?.layout === "led") {
    return 1;
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "knobWidget") {
    return 4;
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "sliderWidget") {
    return 6;
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "visualScope") {
    return 7;
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "graph") {
    return 14;
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "filterCurve") {
    return 8;
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "formulaVisual") {
    return 8;
  }
  return 7;
}

function normalizeNodeGraphModuleWidthUnits(type, widthGu) {
  const fallback = nodeGraphDefaultModuleGridWidthUnits(type);
  const limits = nodeGraphModuleWidthLimitsForType(type);
  const value = Math.round(Number(widthGu));
  return Number.isFinite(value)
    ? Math.max(limits.minGu, Math.min(limits.maxGu, value))
    : fallback;
}

function nodeGraphModuleGridWidthUnits(type) {
  return nodeGraphDefaultModuleGridWidthUnits(type);
}

function nodeGraphPatchNodeGridWidthUnits(node) {
  const scriptGrid = nodeGraphPatchNodeCanvasScriptGridUnits(node);
  if (scriptGrid?.widthGu) {
    return normalizeNodeGraphModuleWidthUnits(node?.type, scriptGrid.widthGu);
  }
  return normalizeNodeGraphModuleWidthUnits(node?.type, node?.widthGu);
}

function normalizeNodeGraphModuleHeightUnits(type, heightGu, ui = {}) {
  const fallback = nodeGraphModuleGridHeightUnitsForUi(type, ui);
  const limits = nodeGraphModuleHeightLimitsForType(type);
  const value = Math.round(Number(heightGu));
  return Number.isFinite(value)
    ? Math.max(limits.minGu, Math.min(limits.maxGu, value))
    : fallback;
}

function normalizeNodeGraphModuleHeightOffsetUnits(offsetGu) {
  const value = Math.round(Number(offsetGu));
  return Number.isFinite(value)
    ? Math.max(
      nodeGraphModuleHeightOffsetLimits.minGu,
      Math.min(nodeGraphModuleHeightOffsetLimits.maxGu, value),
    )
    : 0;
}

function nodeGraphModuleHeightOffsetLabel(offsetGu) {
  const value = normalizeNodeGraphModuleHeightOffsetUnits(offsetGu);
  return value > 0 ? `+${value}` : String(value);
}

function normalizeNodeGraphTextBoxHeightUnits(heightGu) {
  return normalizeNodeGraphModuleHeightUnits("textBox", heightGu);
}

function nodeGraphModuleSliderBodyHeightGu(type) {
  const rows = nodeGraphModuleVisibleBodyRowCount(type);
  if (rows <= 0) {
    return 0;
  }
  return (
    rows * nodeGraphModuleLayout.sliderRowHeightGu +
    Math.max(0, rows - 1) * nodeGraphModuleLayout.bodyRowGapGu
  );
}

function nodeGraphModuleIoRowCount(type) {
  const definition = nodeGraphModuleDefinitions[type];
  return Math.max(
    definition?.inputs?.length || 0,
    definition?.outputs?.length || 0,
    1,
  );
}

function nodeGraphModuleIoSectionHeightGu(type) {
  const rows = nodeGraphModuleIoRowCount(type);
  const rowHeight = rows * nodeGraphModuleLayout.ioRowHeightGu;
  const gapHeight = Math.max(0, rows - 1) * nodeGraphModuleLayout.ioRowGapGu;
  return Math.max(
    nodeGraphModuleLayout.ioSectionMinHeightGu,
    rowHeight + gapHeight + nodeGraphModuleLayout.ioPaddingYGu,
  );
}

function nodeGraphModuleRequiredHeightUnits(type) {
  return nodeGraphModuleRequiredHeightUnitsForUi(type);
}

function nodeGraphModuleHeaderHeightUnits(ui = {}) {
  const normalizedUi = normalizeNodeGraphPatchNodeUi(ui);
  if (normalizedUi.buttonsHidden && normalizedUi.titleHidden) {
    return 0;
  }
  if (normalizedUi.buttonsHidden) {
    return nodeGraphModuleLayout.headerTitleRowHeightGu;
  }
  if (normalizedUi.titleHidden) {
    return nodeGraphModuleLayout.headerHeightGu - nodeGraphModuleLayout.headerTitleRowHeightGu;
  }
  return nodeGraphModuleLayout.headerHeightGu;
}

function nodeGraphModuleHeightWidgetUnits(type, ui = {}) {
  if (nodeGraphModuleDefinitions[type]?.layout === "led") {
    return [{ id: "face", heightGu: 1, visible: true }];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "knobWidget") {
    return [{ id: "face", heightGu: 4, visible: true }];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "textBox") {
    return [
      { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
      { id: "text", heightGu: nodeGraphModuleLayout.textBoxBodyMinGu, visible: true },
    ];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "image") {
    return [
      { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
      { id: "image", heightGu: nodeGraphModuleLayout.moduleScopeHeightGu, visible: true },
      { id: "io", heightGu: nodeGraphModuleIoSectionHeightGu(type), visible: true },
      { id: "fit", heightGu: nodeGraphModuleLayout.fitCushionGu, visible: true },
    ];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "canvas") {
    return [
      { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
      { id: "canvas", heightGu: nodeGraphModuleLayout.moduleScopeHeightGu * 1.5, visible: true },
      { id: "io", heightGu: nodeGraphModuleIoSectionHeightGu(type), visible: true },
      { id: "fit", heightGu: nodeGraphModuleLayout.fitCushionGu, visible: true },
      { id: "inset", heightGu: nodeGraphModuleLayout.moduleGridInsetGu * 2, visible: true },
    ];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "visualScope") {
    return [
      { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
      { id: "screen", heightGu: nodeGraphDefaultModuleGridWidthUnits(type), visible: true },
      { id: "io", heightGu: nodeGraphModuleIoSectionHeightGu(type), visible: true },
      { id: "fit", heightGu: nodeGraphModuleLayout.fitCushionGu, visible: true },
    ];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "graph") {
    return [
      { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
      { id: "graph", heightGu: nodeGraphModuleLayout.moduleScopeHeightGu * 4, visible: true },
      { id: "io", heightGu: nodeGraphModuleIoSectionHeightGu(type), visible: true },
      { id: "params", heightGu: nodeGraphModuleSliderBodyHeightGu(type), visible: true },
      { id: "fit", heightGu: nodeGraphModuleLayout.fitCushionGu, visible: true },
      { id: "inset", heightGu: nodeGraphModuleLayout.moduleGridInsetGu * 2, visible: true },
    ];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "sliderWidget") {
    return [
      { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
      { id: "slider", heightGu: nodeGraphModuleLayout.moduleScopeHeightGu, visible: true },
      { id: "io", heightGu: nodeGraphModuleIoSectionHeightGu(type), visible: true },
      { id: "fit", heightGu: nodeGraphModuleLayout.fitCushionGu, visible: true },
      { id: "inset", heightGu: nodeGraphModuleLayout.moduleGridInsetGu * 2, visible: true },
    ];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "keyboardController") {
    return [
      { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
      { id: "keyboard", heightGu: 12, visible: true },
      { id: "io", heightGu: nodeGraphModuleIoSectionHeightGu(type), visible: true },
    ];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "macroControls") {
    return [
      { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
      { id: "macros", heightGu: 5, visible: true },
      { id: "io", heightGu: nodeGraphModuleIoSectionHeightGu(type), visible: true },
    ];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "pitchModWheel") {
    return [
      { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
      { id: "wheels", heightGu: 5, visible: true },
      { id: "io", heightGu: nodeGraphModuleIoSectionHeightGu(type), visible: true },
    ];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "filterCurve") {
    return [
      { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
      { id: "curve", heightGu: nodeGraphModuleLayout.moduleScopeHeightGu * 1.5, visible: true },
      { id: "io", heightGu: nodeGraphModuleIoSectionHeightGu(type), visible: true },
      { id: "params", heightGu: nodeGraphModuleSliderBodyHeightGu(type), visible: true },
      { id: "fit", heightGu: nodeGraphModuleLayout.fitCushionGu, visible: true },
      { id: "inset", heightGu: nodeGraphModuleLayout.moduleGridInsetGu * 2, visible: true },
    ];
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "formulaVisual") {
    return [
      { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
      { id: "visual", heightGu: 8, visible: true },
      { id: "io", heightGu: nodeGraphModuleIoSectionHeightGu(type), visible: true },
      { id: "params", heightGu: nodeGraphModuleSliderBodyHeightGu(type), visible: true },
      { id: "fit", heightGu: nodeGraphModuleLayout.fitCushionGu, visible: true },
      { id: "inset", heightGu: nodeGraphModuleLayout.moduleGridInsetGu * 2, visible: true },
    ];
  }
  return [
    { id: "header", heightGu: nodeGraphModuleHeaderHeightUnits(ui), visible: true },
    { id: "scope", heightGu: nodeGraphModuleLayout.moduleScopeHeightGu, visible: nodeGraphModuleScopeExtraHeightUnits(type, ui) > 0 },
    { id: "io", heightGu: nodeGraphModuleIoSectionHeightGu(type), visible: true },
    { id: "params", heightGu: nodeGraphModuleSliderBodyHeightGu(type), visible: true },
    { id: "fit", heightGu: nodeGraphModuleLayout.fitCushionGu, visible: true },
    { id: "inset", heightGu: nodeGraphModuleLayout.moduleGridInsetGu * 2, visible: true },
  ];
}

function nodeGraphModuleRequiredHeightUnitsForUi(type, ui = {}) {
  return nodeGraphModuleHeightWidgetUnits(type, ui)
    .filter((widget) => widget.visible !== false)
    .reduce((total, widget) => total + Math.max(0, Number(widget.heightGu) || 0), 0);
}

function nodeGraphModuleGridHeightUnits(type) {
  return nodeGraphModuleGridHeightUnitsForUi(type);
}

function nodeGraphModuleGridHeightUnitsForUi(type, ui = {}) {
  if (nodeGraphModuleDefinitions[type]?.layout === "led") {
    return 1;
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "knobWidget") {
    return 4;
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "textBox") {
    return Math.ceil(nodeGraphModuleRequiredHeightUnitsForUi(type, ui));
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "image") {
    return Math.ceil(nodeGraphModuleRequiredHeightUnitsForUi(type, ui));
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "canvas") {
    return Math.ceil(nodeGraphModuleRequiredHeightUnitsForUi(type, ui));
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "visualScope") {
    return Math.ceil(nodeGraphModuleRequiredHeightUnitsForUi(type, ui));
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "graph") {
    return Math.ceil(nodeGraphModuleRequiredHeightUnitsForUi(type, ui));
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "sliderWidget") {
    return Math.ceil(nodeGraphModuleRequiredHeightUnitsForUi(type, ui));
  }
  if (nodeGraphModuleDefinitions[type]?.layout === "filterCurve") {
    return Math.ceil(nodeGraphModuleRequiredHeightUnitsForUi(type, ui));
  }
  const headerReduction = nodeGraphModuleLayout.headerHeightGu - nodeGraphModuleHeaderHeightUnits(ui);
  const roughGridUnits = 4 + nodeGraphModuleVisibleBodyRowCount(type) * 1.25 - headerReduction;
  const requiredGridUnits = nodeGraphModuleRequiredHeightUnitsForUi(type, ui);
  const defaultGridUnits = Math.ceil(Math.max(roughGridUnits, requiredGridUnits));
  return type === "audioPlayer"
    ? Math.min(nodeGraphModuleHeightLimitsForType(type).maxGu, defaultGridUnits + 4)
    : defaultGridUnits;
}

function nodeGraphPatchNodeHeightOffsetUnits(node) {
  const patchNode = typeof node === "string" ? nodeGraphPatchNode(node) : node;
  if (Object.hasOwn(patchNode || {}, "heightOffsetGu")) {
    return normalizeNodeGraphModuleHeightOffsetUnits(patchNode.heightOffsetGu);
  }
  return 0;
}

function nodeGraphPatchNodeGridHeightUnits(node) {
  const scriptGrid = nodeGraphPatchNodeCanvasScriptGridUnits(node);
  if (scriptGrid?.heightGu) {
    return normalizeNodeGraphModuleHeightUnits(node?.type, scriptGrid.heightGu);
  }
  const effectiveUi = normalizeNodeGraphPatchNodeUi({
    ...node?.ui,
    buttonsHidden: node?.ui?.buttonsHidden || nodeGraphMvp.moduleButtonsVisible === false,
  });
  const autoHeightGu = nodeGraphModuleGridHeightUnitsForUi(node?.type, effectiveUi);
  if (Object.hasOwn(node || {}, "heightOffsetGu")) {
    return normalizeNodeGraphModuleHeightUnits(
      node?.type,
      autoHeightGu + normalizeNodeGraphModuleHeightOffsetUnits(node.heightOffsetGu),
      effectiveUi,
    );
  }
  if (Object.hasOwn(node || {}, "heightGu")) {
    return normalizeNodeGraphModuleHeightUnits(node.type, node.heightGu, effectiveUi);
  }
  return normalizeNodeGraphModuleHeightUnits(node?.type, autoHeightGu, effectiveUi);
}

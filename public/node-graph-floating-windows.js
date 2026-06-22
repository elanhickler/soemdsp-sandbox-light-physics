function normalizeNodeGraphFloatingWindowSize(size = {}, defaults = {}) {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 720;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 760;
  const minWidth = Math.max(1, Number(defaults.minWidth) || 160);
  const configuredMaxWidth = Number(defaults.maxWidth);
  const maxWidth = Math.max(
    minWidth,
    Math.min(
      Number.isFinite(configuredMaxWidth) ? configuredMaxWidth : 720,
      viewportWidth - 28,
    ),
  );
  const minHeight = Math.max(1, Number(defaults.minHeight) || 120);
  const configuredMaxHeight = Number(defaults.maxHeight);
  const maxHeight = Math.max(
    minHeight,
    Math.min(
      Number.isFinite(configuredMaxHeight) ? configuredMaxHeight : 760,
      viewportHeight - 28,
    ),
  );
  const source = size && typeof size === "object" ? size : {};
  const width = Math.max(
    minWidth,
    Math.min(maxWidth, Number(source.width) || Number(defaults.width) || minWidth),
  );
  const height = Number.isFinite(Number(source.height))
    ? Math.max(minHeight, Math.min(maxHeight, Number(source.height)))
    : null;
  return {
    width: Math.round(width),
    ...(height ? { height: Math.round(height) } : {}),
  };
}

function applyNodeGraphFloatingWindowSizeVars(element, cssPrefix, defaults = {}, normalized = {}) {
  if (!element || !cssPrefix) {
    return;
  }
  const pairs = [
    ["min-width", defaults.minWidth],
    ["max-width", defaults.maxWidth],
    ["min-height", defaults.minHeight],
    ["max-height", defaults.maxHeight],
    ["width", normalized.width],
    ["height", normalized.height],
  ];
  for (const [name, value] of pairs) {
    const propertyName = `--${cssPrefix}-${name}`;
    if (Number.isFinite(Number(value))) {
      element.style.setProperty(propertyName, `${Math.round(Number(value))}px`);
    } else if (name === "height") {
      element.style.removeProperty(propertyName);
    }
  }
}

function beginNodeGraphFloatingWindowDrag(event, element, stateKey) {
  if (
    event.button > 0 ||
    !element ||
    element.hidden ||
    !stateKey ||
    (typeof nodeGraphDialogDragTargetIsInteractive === "function" &&
      nodeGraphDialogDragTargetIsInteractive(event))
  ) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  const styleLeft = Number.parseFloat(element.style.left);
  const styleTop = Number.parseFloat(element.style.top);
  const drag = {
    handle: event.currentTarget,
    pointerId: event.pointerId ?? null,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startLeft: Number.isFinite(styleLeft) ? styleLeft : rect.left,
    startTop: Number.isFinite(styleTop) ? styleTop : rect.top,
  };
  nodeGraphMvp[stateKey] = drag;
  event.currentTarget.classList.add("dragging");
  event.currentTarget.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
  return drag;
}

function dragNodeGraphFloatingWindow(event, stateKey, element, onMove = null) {
  const drag = nodeGraphMvp[stateKey];
  if (
    !drag ||
    !element ||
    (drag.pointerId !== null && event.pointerId !== undefined && drag.pointerId !== event.pointerId)
  ) {
    return false;
  }
  const next = nodeGraphFloatingWindowPosition(
    element,
    drag.startLeft + event.clientX - drag.startClientX,
    drag.startTop + event.clientY - drag.startClientY,
  );
  element.style.left = `${next.left}px`;
  element.style.top = `${next.top}px`;
  element.style.right = "auto";
  if (typeof onMove === "function") {
    onMove(next, element, drag);
  }
  event.preventDefault();
  return true;
}

function endNodeGraphFloatingWindowDrag(event, stateKey, onEnd = null) {
  const drag = nodeGraphMvp[stateKey];
  if (
    !drag ||
    (drag.pointerId !== null && event.pointerId !== undefined && drag.pointerId !== event.pointerId)
  ) {
    return false;
  }
  drag.handle?.classList.remove("dragging");
  if (event.pointerId !== undefined && drag.handle?.hasPointerCapture?.(event.pointerId)) {
    drag.handle.releasePointerCapture(event.pointerId);
  }
  nodeGraphMvp[stateKey] = null;
  if (typeof onEnd === "function") {
    onEnd();
  }
  return true;
}

function beginNodeGraphFloatingWindowResize(event, element, stateKey) {
  if (event.button > 0 || !element || element.hidden || !stateKey) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  const drag = {
    handle: event.currentTarget,
    pointerId: event.pointerId ?? null,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startWidth: rect.width,
    startHeight: rect.height,
  };
  nodeGraphMvp[stateKey] = drag;
  event.currentTarget.classList.add("dragging");
  event.currentTarget.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
  return drag;
}

function dragNodeGraphFloatingWindowResize(event, stateKey, applySize, axes = {}) {
  const drag = nodeGraphMvp[stateKey];
  if (
    !drag ||
    (drag.pointerId !== null && event.pointerId !== undefined && drag.pointerId !== event.pointerId) ||
    typeof applySize !== "function"
  ) {
    return false;
  }
  const nextSize = {};
  if (axes.width !== false) {
    nextSize.width = drag.startWidth + event.clientX - drag.startClientX;
  }
  if (axes.height !== false) {
    nextSize.height = drag.startHeight + event.clientY - drag.startClientY;
  }
  applySize(nextSize);
  event.preventDefault();
  return true;
}

function endNodeGraphFloatingWindowResize(event, stateKey, onEnd = null) {
  const drag = nodeGraphMvp[stateKey];
  if (
    !drag ||
    (drag.pointerId !== null && event.pointerId !== undefined && drag.pointerId !== event.pointerId)
  ) {
    return false;
  }
  drag.handle.classList.remove("dragging");
  if (event.pointerId !== undefined && drag.handle.hasPointerCapture?.(event.pointerId)) {
    drag.handle.releasePointerCapture(event.pointerId);
  }
  nodeGraphMvp[stateKey] = null;
  if (typeof onEnd === "function") {
    onEnd();
  }
  return true;
}

function nodeGraphFloatingWindowKeyboardTargets() {
  return [
    {
      draggingKey: "sceneContextDragging",
      elementId: "nodeSceneContextMenu",
      workspaceKey: "commandCenter",
      applySize: typeof applyNodeSceneContextWindowSize === "function" ? applyNodeSceneContextWindowSize : null,
      sizeAxes: { width: true, height: false },
    },
    {
      draggingKey: "moduleActionDragging",
      elementId: "nodeModuleActionsWindow",
      workspaceKey: "moduleActions",
      applySize: typeof applyNodeModuleActionsWindowSize === "function" ? applyNodeModuleActionsWindowSize : null,
      sizeAxes: { width: true, height: true },
    },
    {
      draggingKey: "moduleShopDragging",
      elementId: "nodeModuleShopView",
      workspaceKey: "moduleBrowser",
      applySize: typeof applyNodeGraphModuleShopWindowSize === "function" ? applyNodeGraphModuleShopWindowSize : null,
      sizeAxes: { width: true, height: true },
    },
    {
      draggingKey: "savedPatchesWindowDragging",
      elementId: "nodeSavedPatchesWindow",
      workspaceKey: "patchExplorer",
      applySize: typeof applyNodeGraphSavedPatchesWindowSize === "function" ? applyNodeGraphSavedPatchesWindowSize : null,
      sizeAxes: { width: true, height: true },
    },
    {
      draggingKey: "metadataDragging",
      elementId: "nodeParameterMetadataPopover",
      workspaceKey: "metaparameters",
      applySize: typeof applyNodeMetadataPopoverSize === "function" ? applyNodeMetadataPopoverSize : null,
      sizeAxes: { width: true, height: true },
    },
  ];
}

function nodeGraphActiveFloatingWindowKeyboardTarget() {
  for (const config of nodeGraphFloatingWindowKeyboardTargets()) {
    const drag = nodeGraphMvp[config.draggingKey];
    const element = document.getElementById(config.elementId);
    if (drag && element && !element.hidden) {
      return { ...config, drag, element };
    }
  }
  return null;
}

function nudgeNodeGraphFloatingWindowByKeyboard(target, dx, dy) {
  const rect = target.element.getBoundingClientRect();
  const next = nodeGraphFloatingWindowPosition(
    target.element,
    rect.left + dx,
    rect.top + dy,
  );
  target.element.style.left = `${next.left}px`;
  target.element.style.top = `${next.top}px`;
  target.element.style.right = "auto";
  if (Number.isFinite(Number(target.drag.startLeft))) {
    target.drag.startLeft = next.left;
    target.drag.startClientX = Number(target.drag.startClientX) + dx;
  }
  if (Number.isFinite(Number(target.drag.startTop))) {
    target.drag.startTop = next.top;
    target.drag.startClientY = Number(target.drag.startClientY) + dy;
  }
  if (typeof rememberNodeGraphWorkspaceWindowState === "function") {
    rememberNodeGraphWorkspaceWindowState(
      target.workspaceKey,
      target.element,
      { open: true, position: next },
      { persist: false },
    );
  }
  return true;
}

function resizeNodeGraphFloatingWindowByKeyboard(target, dw, dh) {
  if (typeof target.applySize !== "function") {
    return false;
  }
  const rect = target.element.getBoundingClientRect();
  const nextSize = {
    width: rect.width + (target.sizeAxes.width === false ? 0 : dw),
    height: rect.height + (target.sizeAxes.height === false ? 0 : dh),
  };
  if (target.sizeAxes.width === false) {
    delete nextSize.width;
  }
  if (target.sizeAxes.height === false) {
    delete nextSize.height;
  }
  if (!Object.keys(nextSize).length) {
    return false;
  }
  const normalized = target.applySize(nextSize);
  if (typeof rememberNodeGraphWorkspaceWindowState === "function") {
    rememberNodeGraphWorkspaceWindowState(
      target.workspaceKey,
      target.element,
      { open: true, size: normalized },
      { status: false },
    );
  }
  return true;
}

function handleNodeGraphFloatingWindowKeyboardNudge(event) {
  const arrows = {
    ArrowDown: { dx: 0, dy: 1, dw: 0, dh: 1 },
    ArrowLeft: { dx: -1, dy: 0, dw: -1, dh: 0 },
    ArrowRight: { dx: 1, dy: 0, dw: 1, dh: 0 },
    ArrowUp: { dx: 0, dy: -1, dw: 0, dh: -1 },
  };
  const arrow = arrows[event.key];
  if (!arrow || event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }
  const target = nodeGraphActiveFloatingWindowKeyboardTarget();
  if (!target) {
    return false;
  }
  const handled = event.shiftKey
    ? resizeNodeGraphFloatingWindowByKeyboard(target, arrow.dw, arrow.dh)
    : nudgeNodeGraphFloatingWindowByKeyboard(target, arrow.dx, arrow.dy);
  if (handled) {
    event.preventDefault();
    event.stopPropagation();
  }
  return handled;
}

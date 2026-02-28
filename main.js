var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => GraphSyncPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var GraphSyncPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.lastActiveFile = null;
  }
  onload() {
    return __async(this, null, function* () {
      console.log("loading Graph Sync plugin");
      this.registerEvent(
        this.app.workspace.on("file-open", (file) => {
          if (file) {
            this.lastActiveFile = file;
            this.syncGraphTo(file);
          }
        })
      );
      this.app.workspace.onLayoutReady(() => {
        this.patchGraphLeaves();
      });
      this.registerEvent(
        this.app.workspace.on("layout-change", () => {
          this.patchGraphLeaves();
        })
      );
    });
  }
  onunload() {
    console.log("unloading Graph Sync plugin");
  }
  patchGraphLeaves() {
    const graphLeaves = [
      ...this.app.workspace.getLeavesOfType("graph"),
      ...this.app.workspace.getLeavesOfType("localgraph")
    ];
    for (const leaf of graphLeaves) {
      const view = leaf.view;
      if (view && view.renderer && !view.renderer.__graphSyncPatched) {
        const renderer = view.renderer;
        const originalOnNodeClick = renderer.onNodeClick;
        renderer.onNodeClick = (e, id, type) => {
          const root = leaf.getRoot();
          const isSidebar = root === this.app.workspace.leftSplit || root === this.app.workspace.rightSplit;
          if (isSidebar && id) {
            const file = this.app.metadataCache.getFirstLinkpathDest(id, "");
            if (file && file instanceof import_obsidian.TFile) {
              let targetLeaf = this.app.workspace.getLeavesOfType("markdown").find((l) => l.getRoot() === this.app.workspace.rootSplit && !l.getViewState().pinned);
              if (!targetLeaf) {
                targetLeaf = this.app.workspace.getLeaf("tab");
              }
              targetLeaf.openFile(file, { active: true }).then(() => {
                this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
                this.syncGraphTo(file);
              });
              return;
            }
          }
          if (originalOnNodeClick) {
            return originalOnNodeClick.call(renderer, e, id, type);
          }
        };
        renderer.__graphSyncPatched = true;
      }
      if (view && view.containerEl && !view.__graphSyncButtonsAdded) {
        const btnContainer = view.containerEl.createDiv("graph-sync-controls-container");
        btnContainer.style.position = "absolute";
        btnContainer.style.bottom = "20px";
        btnContainer.style.right = "20px";
        btnContainer.style.zIndex = "100";
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "8px";
        const localGraphBtn = btnContainer.createEl("button", {
          cls: "clickable-icon",
          attr: { "aria-label": "Toggle Local Graph for Active File" }
        });
        localGraphBtn.style.backgroundColor = "var(--background-secondary)";
        localGraphBtn.style.border = "1px solid var(--background-modifier-border)";
        localGraphBtn.style.borderRadius = "var(--radius-s)";
        localGraphBtn.style.cursor = "pointer";
        localGraphBtn.style.padding = "4px";
        localGraphBtn.style.display = "flex";
        (0, import_obsidian.setIcon)(localGraphBtn, "git-merge");
        const stopEvent = (e) => e.stopPropagation();
        localGraphBtn.addEventListener("mousedown", stopEvent);
        localGraphBtn.addEventListener("mouseup", stopEvent);
        localGraphBtn.addEventListener("pointerdown", stopEvent);
        localGraphBtn.addEventListener("pointerup", stopEvent);
        localGraphBtn.addEventListener("click", (e) => __async(this, null, function* () {
          e.preventDefault();
          e.stopPropagation();
          const activeFile = this.app.workspace.getActiveFile() || this.lastActiveFile;
          if (!activeFile)
            return;
          const currentLeafType = leaf.view.getViewType();
          if (currentLeafType === "graph") {
            const rightLeaf = this.app.workspace.getRightLeaf(false);
            if (rightLeaf) {
              yield rightLeaf.setViewState({
                type: "localgraph",
                active: true,
                state: {
                  file: activeFile.path,
                  options: {
                    close: true
                  }
                }
              });
              this.app.workspace.revealLeaf(rightLeaf);
            }
          } else if (currentLeafType === "localgraph") {
            leaf.detach();
            setTimeout(() => this.syncGraphTo(activeFile), 150);
          }
        }));
        const centerBtn = btnContainer.createEl("button", {
          cls: "clickable-icon",
          attr: { "aria-label": "Center Active Document" }
        });
        centerBtn.style.backgroundColor = "var(--background-secondary)";
        centerBtn.style.border = "1px solid var(--background-modifier-border)";
        centerBtn.style.borderRadius = "var(--radius-s)";
        centerBtn.style.cursor = "pointer";
        centerBtn.style.padding = "4px";
        centerBtn.style.display = "flex";
        (0, import_obsidian.setIcon)(centerBtn, "crosshair");
        centerBtn.addEventListener("mousedown", stopEvent);
        centerBtn.addEventListener("mouseup", stopEvent);
        centerBtn.addEventListener("pointerdown", stopEvent);
        centerBtn.addEventListener("pointerup", stopEvent);
        centerBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const activeFile = this.app.workspace.getActiveFile() || this.lastActiveFile;
          if (activeFile) {
            this.syncGraphTo(activeFile);
          }
        });
        view.__graphSyncButtonsAdded = true;
      }
    }
  }
  syncGraphTo(file) {
    var _a;
    const graphLeaves = this.app.workspace.getLeavesOfType("graph");
    if (graphLeaves.length === 0)
      return;
    for (const leaf of graphLeaves) {
      const view = leaf.view;
      if (view && view.renderer) {
        const renderer = view.renderer;
        if (!renderer.nodes)
          continue;
        const node = renderer.nodes.find((n) => n.id === file.path);
        if (!node)
          continue;
        const win = ((_a = view.containerEl) == null ? void 0 : _a.win) || window;
        let zoomCenterX = renderer.zoomCenterX;
        let zoomCenterY = renderer.zoomCenterY;
        if (zoomCenterX === 0 && zoomCenterY === 0) {
          const s2 = win.devicePixelRatio || 1;
          zoomCenterX = renderer.width / 2 * s2;
          zoomCenterY = renderer.height / 2 * s2;
        }
        const scale = renderer.scale;
        const startPanX = renderer.panX;
        const startPanY = renderer.panY;
        const targetPanX = -(node.x * scale) + zoomCenterX;
        const targetPanY = -(node.y * scale) + zoomCenterY;
        if (view && view.containerEl) {
          const existingPulses = view.containerEl.querySelectorAll(".graph-sync-pulse");
          existingPulses.forEach((p) => p.remove());
        }
        const s = win.devicePixelRatio || 1;
        let pulseDiv = null;
        if (view && view.containerEl) {
          pulseDiv = view.containerEl.createDiv();
          pulseDiv.classList.add("graph-sync-pulse");
          pulseDiv.style.position = "absolute";
          pulseDiv.style.width = "24px";
          pulseDiv.style.height = "24px";
          pulseDiv.style.borderRadius = "50%";
          pulseDiv.style.backgroundColor = "transparent";
          pulseDiv.style.border = "2px solid var(--interactive-accent)";
          pulseDiv.style.pointerEvents = "none";
          pulseDiv.style.zIndex = "1000";
          pulseDiv.style.transform = "translate(-50%, -50%) scale(0.1)";
          pulseDiv.style.opacity = "0.8";
          pulseDiv.style.mixBlendMode = "screen";
        }
        const duration = 900;
        let startTimestamp = null;
        const originalRadius = node.radius || 5;
        const animate = (timestamp) => {
          if (!startTimestamp)
            startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          const currentPanX = startPanX + (targetPanX - startPanX) * ease;
          const currentPanY = startPanY + (targetPanY - startPanY) * ease;
          if (renderer.panvX !== void 0)
            renderer.panvX = 0;
          if (renderer.panvY !== void 0)
            renderer.panvY = 0;
          renderer.setPan(currentPanX, currentPanY);
          if (pulseDiv) {
            const nodeScreenX = (node.x * scale + currentPanX) / s;
            const nodeScreenY = (node.y * scale + currentPanY) / s;
            pulseDiv.style.left = `${nodeScreenX}px`;
            pulseDiv.style.top = `${nodeScreenY}px`;
            const pulseScale = 0.5 + Math.pow(progress, 0.4) * 2.5;
            const pulseOpacity = Math.max(0, 0.8 - Math.pow(progress, 1.2));
            pulseDiv.style.transform = `translate(-50%, -50%) scale(${pulseScale})`;
            pulseDiv.style.opacity = pulseOpacity.toString();
          }
          if (typeof renderer.changed === "function") {
            renderer.changed();
          }
          if (progress < 1) {
            win.requestAnimationFrame(animate);
          } else {
            node.radius = originalRadius;
            if (pulseDiv && pulseDiv.parentElement) {
              pulseDiv.remove();
            }
            if (typeof renderer.changed === "function") {
              renderer.changed();
            }
          }
        };
        win.requestAnimationFrame(animate);
      }
    }
  }
};

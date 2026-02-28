import { Plugin, TFile, WorkspaceLeaf, setIcon } from 'obsidian';

export default class GraphSyncPlugin extends Plugin {
    lastActiveFile: TFile | null = null;

    async onload() {
        console.log('loading Graph Sync plugin');

        this.registerEvent(
            this.app.workspace.on('file-open', (file) => {
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
            this.app.workspace.on('layout-change', () => {
                this.patchGraphLeaves();
            })
        );
    }

    onunload() {
        console.log('unloading Graph Sync plugin');
    }

    patchGraphLeaves() {
        const graphLeaves = [
            ...this.app.workspace.getLeavesOfType('graph'),
            ...this.app.workspace.getLeavesOfType('localgraph')
        ];
        for (const leaf of graphLeaves) {
            const view = leaf.view as any;
            if (view && view.renderer && !view.renderer.__graphSyncPatched) {
                const renderer = view.renderer;
                const originalOnNodeClick = renderer.onNodeClick;

                renderer.onNodeClick = (e: any, id: string, type: string) => {
                    const root = leaf.getRoot();
                    const isSidebar = root === this.app.workspace.leftSplit || root === this.app.workspace.rightSplit;

                    if (isSidebar && id) {
                        const file = this.app.metadataCache.getFirstLinkpathDest(id, '');
                        if (file && file instanceof TFile) {
                            // Find an unpinned leaf in the main root split
                            let targetLeaf = this.app.workspace.getLeavesOfType("markdown")
                                .find(l => l.getRoot() === this.app.workspace.rootSplit && !l.getViewState().pinned);

                            // If none exists, create a new tab in the root window
                            if (!targetLeaf) {
                                targetLeaf = this.app.workspace.getLeaf('tab');
                            }

                            targetLeaf.openFile(file, { active: true }).then(() => {
                                this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
                                this.syncGraphTo(file);
                            });
                            return; // prevent original click handler
                        }
                    }

                    if (originalOnNodeClick) {
                        return originalOnNodeClick.call(renderer, e, id, type);
                    }
                };

                renderer.__graphSyncPatched = true;
            }

            // Add User Controls (Bottom Right Container)
            if (view && view.containerEl && !view.__graphSyncButtonsAdded) {
                const btnContainer = view.containerEl.createDiv('graph-sync-controls-container');
                btnContainer.style.position = 'absolute';
                btnContainer.style.bottom = '20px';
                btnContainer.style.right = '20px';
                btnContainer.style.zIndex = '100';
                btnContainer.style.display = 'flex';
                btnContainer.style.gap = '8px';

                // 1. Local Graph Toggle Button
                const localGraphBtn = btnContainer.createEl('button', {
                    cls: 'clickable-icon',
                    attr: { 'aria-label': 'Toggle Local Graph for Active File' }
                });

                localGraphBtn.style.backgroundColor = 'var(--background-secondary)';
                localGraphBtn.style.border = '1px solid var(--background-modifier-border)';
                localGraphBtn.style.borderRadius = 'var(--radius-s)';
                localGraphBtn.style.cursor = 'pointer';
                localGraphBtn.style.padding = '4px';
                localGraphBtn.style.display = 'flex';

                setIcon(localGraphBtn, 'git-merge');

                const stopEvent = (e: Event) => e.stopPropagation();
                localGraphBtn.addEventListener('mousedown', stopEvent);
                localGraphBtn.addEventListener('mouseup', stopEvent);
                localGraphBtn.addEventListener('pointerdown', stopEvent);
                localGraphBtn.addEventListener('pointerup', stopEvent);
                localGraphBtn.addEventListener('click', async (e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Try to get active file, fallback to last known active file if focus was lost to the graph view
                    const activeFile = this.app.workspace.getActiveFile() || this.lastActiveFile;
                    if (!activeFile) return;

                    const currentLeafType = leaf.view.getViewType();

                    if (currentLeafType === 'graph') {
                        // Open local graph in the right sidebar
                        const rightLeaf = this.app.workspace.getRightLeaf(false);
                        if (rightLeaf) {
                            await rightLeaf.setViewState({
                                type: 'localgraph',
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
                    } else if (currentLeafType === 'localgraph') {
                        // Simply close the local graph tab, revealing the pristine global graph tab
                        leaf.detach();
                        setTimeout(() => this.syncGraphTo(activeFile), 150);
                    }
                });

                // 2. Center Active Document Button
                const centerBtn = btnContainer.createEl('button', {
                    cls: 'clickable-icon',
                    attr: { 'aria-label': 'Center Active Document' }
                });

                centerBtn.style.backgroundColor = 'var(--background-secondary)';
                centerBtn.style.border = '1px solid var(--background-modifier-border)';
                centerBtn.style.borderRadius = 'var(--radius-s)';
                centerBtn.style.cursor = 'pointer';
                centerBtn.style.padding = '4px';
                centerBtn.style.display = 'flex';

                setIcon(centerBtn, 'crosshair');

                centerBtn.addEventListener('mousedown', stopEvent);
                centerBtn.addEventListener('mouseup', stopEvent);
                centerBtn.addEventListener('pointerdown', stopEvent);
                centerBtn.addEventListener('pointerup', stopEvent);
                centerBtn.addEventListener('click', (e: MouseEvent) => {
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

    syncGraphTo(file: TFile) {
        const graphLeaves = this.app.workspace.getLeavesOfType('graph');
        if (graphLeaves.length === 0) return;

        for (const leaf of graphLeaves) {
            const view = leaf.view as any;
            if (view && view.renderer) {
                const renderer = view.renderer;
                if (!renderer.nodes) continue;

                const node = renderer.nodes.find((n: any) => n.id === file.path);
                if (!node) continue;

                // 지원하는 경우 멀티 윈도우 환경에 맞는 window 객체를 가져옵니다.
                const win = view.containerEl?.win || window;

                let zoomCenterX = renderer.zoomCenterX;
                let zoomCenterY = renderer.zoomCenterY;
                if (zoomCenterX === 0 && zoomCenterY === 0) {
                    const s = win.devicePixelRatio || 1;
                    zoomCenterX = (renderer.width / 2) * s;
                    zoomCenterY = (renderer.height / 2) * s;
                }

                const scale = renderer.scale;
                const startPanX = renderer.panX;
                const startPanY = renderer.panY;

                const targetPanX = - (node.x * scale) + zoomCenterX;
                const targetPanY = - (node.y * scale) + zoomCenterY;

                // Ensure previous pulse instances in this view are cleared to avoid overlap
                if (view && view.containerEl) {
                    const existingPulses = view.containerEl.querySelectorAll('.graph-sync-pulse');
                    existingPulses.forEach((p: Element) => p.remove());
                }

                // Create HTML Overlay visual feedback immediately
                const s = win.devicePixelRatio || 1;
                let pulseDiv: HTMLDivElement | null = null;

                if (view && view.containerEl) {
                    const el = view.containerEl.createDiv();
                    el.classList.add('graph-sync-pulse'); // Mark for cleanup
                    el.style.position = 'absolute';
                    el.style.width = '24px';
                    el.style.height = '24px';
                    el.style.borderRadius = '50%';
                    el.style.backgroundColor = 'transparent';
                    // Use a more subtle, thinner ring
                    el.style.border = '2px solid var(--interactive-accent)';
                    el.style.pointerEvents = 'none';
                    el.style.zIndex = '1000';
                    el.style.transform = 'translate(-50%, -50%) scale(0.1)';
                    el.style.opacity = '0.8';
                    el.style.mixBlendMode = 'screen'; // Subtler native look

                    pulseDiv = el;
                }

                // Animation configuration
                const duration = 900; // ms for a snappier, less lingering animation
                let startTimestamp: number | null = null;
                const originalRadius = node.radius || 5;

                const animate = (timestamp: number) => {
                    if (!startTimestamp) startTimestamp = timestamp;
                    const progress = Math.min((timestamp - startTimestamp) / duration, 1);

                    // Smooth ease-out cubic for panning
                    const ease = 1 - Math.pow(1 - progress, 3);

                    const currentPanX = startPanX + (targetPanX - startPanX) * ease;
                    const currentPanY = startPanY + (targetPanY - startPanY) * ease;

                    // Initialize velocity
                    if (renderer.panvX !== undefined) renderer.panvX = 0;
                    if (renderer.panvY !== undefined) renderer.panvY = 0;

                    renderer.setPan(currentPanX, currentPanY);

                    // Update Pulse UI element directly on every frame for perfect sync
                    if (pulseDiv) {
                        const nodeScreenX = (node.x * scale + currentPanX) / s;
                        const nodeScreenY = (node.y * scale + currentPanY) / s;

                        pulseDiv.style.left = `${nodeScreenX}px`;
                        pulseDiv.style.top = `${nodeScreenY}px`;

                        // Scale expands and opacity fades
                        // Keep it subtler, scale up to 3x instead of 5x.
                        const pulseScale = 0.5 + Math.pow(progress, 0.4) * 2.5;
                        const pulseOpacity = Math.max(0, 0.8 - Math.pow(progress, 1.2));

                        pulseDiv.style.transform = `translate(-50%, -50%) scale(${pulseScale})`;
                        pulseDiv.style.opacity = pulseOpacity.toString();
                    }

                    if (typeof renderer.changed === 'function') {
                        renderer.changed();
                    }

                    if (progress < 1) {
                        win.requestAnimationFrame(animate);
                    } else {
                        // Clean up
                        node.radius = originalRadius;
                        if (pulseDiv && pulseDiv.parentElement) {
                            pulseDiv.remove();
                        }
                        if (typeof renderer.changed === 'function') {
                            renderer.changed();
                        }
                    }
                };

                win.requestAnimationFrame(animate);
            }
        }
    }
}


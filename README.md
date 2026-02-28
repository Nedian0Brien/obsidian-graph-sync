# Obsidian Graph Sync

Graph Sync is a powerful Obsidian plugin that seamlessly bridges the gap between your active markdown documents and your graph view. Designed to help you maintain context and visually navigate your vault without losing your place.

## Features

- **Automatic Global Graph Synchronization**: Whenever you open a file, the global graph view automatically and smoothly pans to center the corresponding node.
- **Visual Pulse Highlight**: When a node is centered, it emits a subtle, smooth expanding ring (pulse) overlay. This high-visibility effect makes it impossible to lose track of your active note in a massive global graph.
- **Graph Controls UI**: Two new handy buttons are injected directly into the bottom-right corner of your Graph View:
    - **Toggle Local Graph (git-merge icon)**: Instantly opens the current document's Local Graph in the right sidebar. If it's already open, clicking again will close it. It suppresses the default Obsidian graph settings panel for a clean experience.
    - **Center Active Document (crosshair icon)**: Manually triggers the smooth pan and pulse animation to immediately find where you are in the graph.
- **Sidebar Graph Click Handling**: Clicking a node in a sidebar graph view (like the local graph) intelligently opens the document in the main content area (or a new tab) rather than overriding the sidebar itself.

## Installation

### Manual Installation

1. Download the latest release from the [Releases](https://github.com/Nedian0Brien/obsidian-graph-sync/releases) page.
2. Extract the folder into your vault's plugin folder: `<vault>/.obsidian/plugins/graph-sync/`.
3. The folder should contain `main.js`, `manifest.json`, and `styles.css` (if applicable).
4. Reload Obsidian.
5. Go to **Settings > Community Plugins**, disable Safe Mode, and enable **Graph Sync**.

## Usage

1. Open your Global Graph View.
2. Open any markdown note. Watch the graph gracefully pan and pulse on the specific node.
3. Look at the bottom right corner of the Graph View to utilize the Local Graph Toggle or the Center Active Document buttons.
4. Move around your vault and let the graph naturally follow your workflow!

## Development

To build the plugin from source:

1. Clone this repository.
2. Run `npm i` or `yarn` to install dependencies.
3. Run `npm run dev` to compile and watch for changes while developing.
4. Run `npm run build` to create a production bundle.

## License

MIT

# aidraw

A whiteboard for system design diagrams — like Excalidraw, but the shapes are AI and infrastructure
components: agents, tools, MCP servers, LLMs, vector DBs, inference servers, feature stores, load
balancers, queues, Kubernetes, CI/CD and more.

## Run it

```bash
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:5173). `npm run build` produces a static site in
`dist/` that you can host anywhere (Vercel, Netlify, GitHub Pages).

## Using it

- **Add components** — drag from the library on the left, or click one to drop it in the centre.
- **Connect** — hover a shape and drag from one of its dots to another shape.
- **Rename** — double-click any label, connector or frame title.
- **Style** — select something to change colour, line style (solid / dashed / flowing), route and arrowheads.
- **Draw and write** — pen tool (P) for freehand annotation, text tool (T) for labels.
- **Templates** — RAG pipeline, tool-using agent, LLM inference serving, ML training → serving.
- **Export** — PNG, SVG, or a `.aidraw.json` file you can reopen. The canvas also autosaves in the browser.
- **Presentation mode** — the eye button hides the interface for screen recording; Esc brings it back.

Shortcuts: V select · H pan (or hold Space) · P pen · T text · ⌘/Ctrl+Z undo · ⌘/Ctrl+Shift+Z redo ·
⌘/Ctrl+D duplicate · Delete removes the selection.

## Adding your own components

Everything in the library is one line in `src/library.ts`:

```ts
['vector-db', 'Vector DB', Radar],   // [unique id, label, lucide-react icon]
```

Add a row to a category (or add a new `cat(...)` block with its own colour) and it appears in the
palette. Templates live in `src/templates.ts` and reference components by those ids.

## Stack

Vite + React + TypeScript, [React Flow](https://reactflow.dev) for the canvas, lucide-react for icons.

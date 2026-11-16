import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background, BackgroundVariant, ConnectionMode, Controls, ReactFlow, ReactFlowProvider,
  SelectionMode, addEdge, getNodesBounds, useEdgesState, useNodesState, useReactFlow, useViewport,
  type Connection, type Edge, type Node,
} from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import {
  ChevronDown, Circle, Copy, Diamond, Download, Eraser, Eye, Frame, Square, StickyNote, FileJson, FolderOpen, Hand, ImageDown, LayoutTemplate, Moon,
  MousePointer2, PanelLeftClose, PanelLeftOpen, Pencil, PenLine, Redo2, Search, Sun, Trash2, Type,
  Undo2,
} from 'lucide-react';
import { LIBRARY, PROVIDERS, SWATCHES, makeNode, uid, type Provider } from './library';
import { EditorCtx, edgeTypes, nodeTypes, strokePath } from './nodes';
import { TEMPLATES, buildTemplate, styleEdge, type EdgeData } from './templates';

type ShapeTool = 'rect' | 'diamond' | 'ellipse' | 'note' | 'frame';
type Tool = 'select' | 'hand' | 'pen' | 'text' | 'eraser' | ShapeTool;
const SHAPE_TOOLS: Tool[] = ['rect', 'diamond', 'ellipse', 'note', 'frame'];

/** Toolbar order, with Excalidraw-style shortcuts: a number and a letter for each tool. */
const TOOLS: { id: Tool; label: string; icon: typeof Hand; num?: string; key: string }[] = [
  { id: 'hand', label: 'Hand (pan)', icon: Hand, key: 'h' },
  { id: 'select', label: 'Select', icon: MousePointer2, num: '1', key: 'v' },
  { id: 'rect', label: 'Rectangle', icon: Square, num: '2', key: 'r' },
  { id: 'diamond', label: 'Diamond', icon: Diamond, num: '3', key: 'd' },
  { id: 'ellipse', label: 'Ellipse', icon: Circle, num: '4', key: 'o' },
  { id: 'pen', label: 'Draw', icon: Pencil, num: '5', key: 'p' },
  { id: 'text', label: 'Text', icon: Type, num: '6', key: 't' },
  { id: 'note', label: 'Sticky note', icon: StickyNote, num: '7', key: 'n' },
  { id: 'frame', label: 'Group frame', icon: Frame, num: '8', key: 'f' },
  { id: 'eraser', label: 'Eraser', icon: Eraser, num: '0', key: 'e' },
];
type Snap = { nodes: Node[]; edges: Edge[] };
const STORAGE = 'aidraw:v1';

const clean = (s: Snap): Snap => ({
  nodes: s.nodes.map(({ selected, dragging, ...n }: any) => ({ ...n, data: { ...n.data, autoEdit: false } })),
  edges: s.edges.map(({ selected, ...e }: any) => ({ ...e, data: { ...e.data, editing: false } })),
});

function loadInitial(): Snap {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE) ?? 'null');
    if (s && Array.isArray(s.nodes) && Array.isArray(s.edges)) return s;
  } catch { /* ignore corrupt storage */ }
  return buildTemplate(TEMPLATES[0]);
}

function download(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

/** Freehand drawing surface, shown only while the pen tool is active. */
function PenLayer({ color, onDone }: { color: string; onDone: (n: Node) => void }) {
  const { screenToFlowPosition } = useReactFlow();
  const { zoom } = useViewport();
  const [pts, setPts] = useState<[number, number][]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const origin = () => ref.current!.getBoundingClientRect();

  return (
    <div
      ref={ref}
      className="pen-layer"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        setPts([[e.clientX, e.clientY]]);
      }}
      onPointerMove={(e) => drawing.current && setPts((p) => [...p, [e.clientX, e.clientY]])}
      onPointerUp={() => {
        drawing.current = false;
        if (!pts.length) return;
        const flow = pts.map(([x, y]) => screenToFlowPosition({ x, y }));
        const minX = Math.min(...flow.map((p) => p.x));
        const minY = Math.min(...flow.map((p) => p.y));
        const maxX = Math.max(...flow.map((p) => p.x));
        const maxY = Math.max(...flow.map((p) => p.y));
        onDone({
          id: uid('s'),
          type: 'stroke',
          position: { x: minX, y: minY },
          width: Math.max(4, maxX - minX),
          height: Math.max(4, maxY - minY),
          data: { points: flow.map((p) => [+(p.x - minX).toFixed(1), +(p.y - minY).toFixed(1)]), color, size: 3 },
        });
        setPts([]);
      }}
    >
      <svg>
        {pts.length > 0 && (
          <path
            d={strokePath(pts.map(([x, y]) => [x - origin().left, y - origin().top]))}
            stroke={color}
            strokeWidth={3 * zoom}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

/** Drag out a rectangle to place a shape, note or frame; a plain click drops it at its default size. */
function ShapeLayer({ kind, onDone }: { kind: ShapeTool; onDone: (n: Node) => void }) {
  const { screenToFlowPosition } = useReactFlow();
  const [box, setBox] = useState<null | { x0: number; y0: number; x1: number; y1: number }>(null);
  const ref = useRef<HTMLDivElement>(null);
  const r = ref.current?.getBoundingClientRect();

  return (
    <div
      ref={ref}
      className="pen-layer"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setBox({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY });
      }}
      onPointerMove={(e) => box && setBox({ ...box, x1: e.clientX, y1: e.clientY })}
      onPointerUp={() => {
        if (!box) return;
        const a = screenToFlowPosition({ x: Math.min(box.x0, box.x1), y: Math.min(box.y0, box.y1) });
        const b = screenToFlowPosition({ x: Math.max(box.x0, box.x1), y: Math.max(box.y0, box.y1) });
        const n = makeNode(kind, a);
        if (b.x - a.x > 16 && b.y - a.y > 16) {
          n.width = b.x - a.x;
          n.height = b.y - a.y;
        } else {
          n.position = { x: a.x - (n.width ?? 0) / 2, y: a.y - (n.height ?? 0) / 2 };
        }
        setBox(null);
        onDone(n);
      }}
    >
      {box && r && (
        <div
          className={`shape-preview ${kind}`}
          style={{ left: Math.min(box.x0, box.x1) - r.left, top: Math.min(box.y0, box.y1) - r.top, width: Math.abs(box.x1 - box.x0), height: Math.abs(box.y1 - box.y0) }}
        />
      )}
    </div>
  );
}

function Editor() {
  const initial = useMemo(loadInitial, []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const rf = useReactFlow();
  const wrap = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [tool, setTool] = useState<Tool>('select');
  const [dark, setDark] = useState(() => localStorage.getItem('aidraw:theme') === 'dark');
  const [sketch, setSketch] = useState(() => localStorage.getItem('aidraw:sketch') !== 'off');
  const [focus, setFocus] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [menu, setMenu] = useState<null | 'templates' | 'export'>(null);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [penColor, setPenColor] = useState('#dc2626');
  const [cloud, setCloud] = useState<Provider>(() => (localStorage.getItem('aidraw:cloud') as Provider) || 'aws');

  // ---- undo / redo -------------------------------------------------------
  const live = useRef<Snap>({ nodes, edges });
  live.current = { nodes, edges };
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const [, bump] = useState(0);

  const snapshot = useCallback(() => {
    past.current.push(JSON.parse(JSON.stringify(clean(live.current))));
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    bump((n) => n + 1);
  }, []);
  const travel = useCallback((from: Snap[], to: Snap[]) => {
    const s = from.pop();
    if (!s) return;
    to.push(JSON.parse(JSON.stringify(clean(live.current))));
    setNodes(s.nodes);
    setEdges(s.edges);
    bump((n) => n + 1);
  }, [setNodes, setEdges]);
  const undo = useCallback(() => travel(past.current, future.current), [travel]);
  const redo = useCallback(() => travel(future.current, past.current), [travel]);
  const ctx = useMemo(() => ({ snapshot }), [snapshot]);

  // ---- persistence -------------------------------------------------------
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(STORAGE, JSON.stringify(clean({ nodes, edges }))), 400);
    return () => clearTimeout(t);
  }, [nodes, edges]);
  useEffect(() => localStorage.setItem('aidraw:theme', dark ? 'dark' : 'light'), [dark]);
  useEffect(() => localStorage.setItem('aidraw:sketch', sketch ? 'on' : 'off'), [sketch]);
  useEffect(() => localStorage.setItem('aidraw:cloud', cloud), [cloud]);

  // ---- adding things -----------------------------------------------------
  const addNodes = useCallback((added: Node[], addedEdges: Edge[] = []) => {
    snapshot();
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), ...added.map((n) => ({ ...n, selected: true }))]);
    setEdges((es) => [...es.map((e) => ({ ...e, selected: false })), ...addedEdges]);
  }, [snapshot, setNodes, setEdges]);

  const addItem = useCallback((itemId: string, at?: { x: number; y: number }) => {
    const r = wrap.current!.getBoundingClientRect();
    const jitter = () => (Math.random() - 0.5) * 60;
    const p = rf.screenToFlowPosition(at ?? { x: r.left + r.width / 2 + jitter(), y: r.top + r.height / 2 + jitter() });
    const n = makeNode(itemId, p);
    n.position = { x: p.x - (n.width ?? 60) / 2, y: p.y - (n.height ?? 56) / 2 };
    addNodes([n]);
  }, [rf, addNodes]);

  const insertTemplate = useCallback((id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)!;
    const cur = rf.getNodes();
    const b = cur.length ? getNodesBounds(cur) : { x: 0, y: 0, width: 0, height: -160 };
    const built = buildTemplate(t, { x: b.x + 30, y: b.y + b.height + 160 });
    addNodes(built.nodes, built.edges);
    setMenu(null);
    setTimeout(() => rf.fitView({ nodes: built.nodes, padding: 0.2, duration: 400 }), 60);
  }, [rf, addNodes]);

  const onConnect = useCallback((c: Connection) => {
    if (c.source === c.target) return;
    snapshot();
    setEdges((es) => addEdge(styleEdge({ ...c, id: uid('e') } as Edge), es));
  }, [snapshot, setEdges]);

  // ---- selection actions -------------------------------------------------
  const selNodes = nodes.filter((n) => n.selected);
  const selEdges = edges.filter((e) => e.selected);

  const patchNodes = (data: Record<string, unknown>) => {
    snapshot();
    setNodes((ns) => ns.map((n) => (n.selected ? { ...n, data: { ...n.data, ...data } } : n)));
  };
  const patchEdges = (data: EdgeData) => {
    snapshot();
    setEdges((es) => es.map((e) => (e.selected ? styleEdge(e, data) : e)));
  };
  const removeSelected = () => rf.deleteElements({ nodes: selNodes, edges: selEdges });

  const duplicate = useCallback(() => {
    const picked = live.current.nodes.filter((n) => n.selected);
    if (!picked.length) return;
    const ids = new Map(picked.map((n) => [n.id, uid()]));
    const copies = clean({ nodes: picked, edges: [] }).nodes.map((n) => ({
      ...n, id: ids.get(n.id)!, position: { x: n.position.x + 32, y: n.position.y + 32 },
    }));
    const links = live.current.edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({ ...e, id: uid('e'), source: ids.get(e.source)!, target: ids.get(e.target)!, selected: false }));
    addNodes(copies, links);
  }, [addNodes]);

  // ---- import / export ---------------------------------------------------
  const exportImage = async (fmt: 'png' | 'svg') => {
    setMenu(null);
    const all = rf.getNodes();
    if (!all.length) return;
    setNodes((ns) => ns.map((n) => ({ ...n, selected: false })));
    setEdges((es) => es.map((e) => ({ ...e, selected: false })));
    await new Promise((r) => setTimeout(r, 80));
    const b = getNodesBounds(all);
    const pad = 60;
    const width = Math.ceil(b.width + pad * 2);
    const height = Math.ceil(b.height + pad * 2);
    const el = wrap.current!.querySelector('.react-flow__viewport') as HTMLElement;
    const url = await (fmt === 'png' ? toPng : toSvg)(el, {
      backgroundColor: dark ? '#111111' : '#f4f4f0',
      width,
      height,
      pixelRatio: 2,
      filter: (n) => !(n instanceof Element && (n.classList.contains('react-flow__handle') || n.classList.contains('react-flow__resize-control'))),
      style: { width: `${width}px`, height: `${height}px`, transform: `translate(${pad - b.x}px, ${pad - b.y}px) scale(1)` },
    });
    download(url, `aidraw.${fmt}`);
  };
  const exportJson = () => {
    setMenu(null);
    const blob = new Blob([JSON.stringify(clean({ nodes, edges }), null, 2)], { type: 'application/json' });
    download(URL.createObjectURL(blob), 'diagram.aidraw.json');
  };
  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const s = JSON.parse(await file.text());
      if (!Array.isArray(s.nodes) || !Array.isArray(s.edges)) throw new Error('not an aidraw file');
      snapshot();
      setNodes(s.nodes);
      setEdges(s.edges);
      setTimeout(() => rf.fitView({ padding: 0.2, duration: 300 }), 60);
    } catch {
      alert('That file is not a valid aidraw diagram.');
    }
  };
  const clearAll = () => {
    if (!nodes.length) return;
    snapshot();
    setNodes([]);
    setEdges([]);
    setMenu(null);
  };

  // ---- keyboard ----------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && k === 'y') { e.preventDefault(); redo(); }
      else if (mod && k === 'd') { e.preventDefault(); duplicate(); }
      else if (mod && k === 'a') { e.preventDefault(); setNodes((ns) => ns.map((n) => ({ ...n, selected: true }))); }
      else if (mod || e.altKey) return;
      else if (TOOLS.some((t) => t.key === k || t.num === k)) setTool(TOOLS.find((t) => t.key === k || t.num === k)!.id);
      else if (k === 'escape') { setTool('select'); setFocus(false); setMenu(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, duplicate, setNodes]);

  // ---- palette -----------------------------------------------------------
  const q = query.trim().toLowerCase();
  const library = LIBRARY.filter((c) => q || !c.provider || c.provider === cloud).map((c) => ({ ...c, items: c.items.filter((i) => !q || i.label.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)) }))
    .filter((c) => c.items.length);

  const textSelected = selNodes.some((n) => n.type === 'text');
  const single = selNodes.length === 1 && selNodes[0].type === 'component' ? selNodes[0] : null;
  const e0 = (selEdges[0]?.data ?? {}) as EdgeData;

  return (
    <EditorCtx.Provider value={ctx}>
      <div className={`app ${sketch ? 'sketch' : ''} ${focus ? 'focus' : ''} tool-${tool}`} data-theme={dark ? 'dark' : 'light'}>
        <div
          className="canvas"
          ref={wrap}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('application/aidraw');
            if (id) addItem(id, { x: e.clientX, y: e.clientY });
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStart={snapshot}
            onSelectionDragStart={snapshot}
            onBeforeDelete={async () => { snapshot(); return true; }}
            onNodeClick={(_, node) => tool === 'eraser' && rf.deleteElements({ nodes: [node] })}
            onEdgeClick={(_, edge) => tool === 'eraser' && rf.deleteElements({ edges: [edge] })}
            nodesDraggable={tool !== 'eraser'}
            onEdgeDoubleClick={(_, edge) => rf.updateEdgeData(edge.id, { editing: true })}
            onPaneClick={(e) => {
              setMenu(null);
              if (tool !== 'text') return;
              const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
              addNodes([makeNode('text', { x: p.x, y: p.y - 14 }, { label: '', autoEdit: true })]);
              setTool('select');
            }}
            connectionMode={ConnectionMode.Loose}
            connectionRadius={30}
            colorMode={dark ? 'dark' : 'light'}
            panOnDrag={tool === 'hand' ? true : [1, 2]}
            selectionOnDrag={tool === 'select'}
            selectionMode={SelectionMode.Partial}
            panOnScroll
            zoomOnDoubleClick={false}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
            minZoom={0.1}
            maxZoom={4}
            fitView
            fitViewOptions={{ padding: { top: '90px', right: '50px', bottom: '60px', left: '310px' }, maxZoom: 1 }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} />
            <Controls position="bottom-right" showInteractive={false} />
          </ReactFlow>
          {SHAPE_TOOLS.includes(tool) && <ShapeLayer kind={tool as ShapeTool} onDone={(n) => { addNodes([n]); setTool('select'); }} />}
          {tool === 'pen' && <PenLayer color={penColor} onDone={(n) => { snapshot(); setNodes((ns) => [...ns, n]); }} />}
          {!nodes.length && <div className="empty">Drag a component from the left, or start from a template.</div>}
        </div>

        {/* ---------- left: shape library ---------- */}
        {paletteOpen ? (
          <aside className="island palette ui">
            <header>
              <div className="brand"><PenLine size={18} /> aidraw</div>
              <button className="icon-btn" title="Hide library" onClick={() => setPaletteOpen(false)}><PanelLeftClose size={17} /></button>
            </header>
            <label className="search">
              <Search size={15} />
              <input placeholder="Search components…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="palette-scroll">
              {library.map((c) => {
                // Outside of search, the three providers share one "Cloud" section with tabs inside it.
                const isCloud = !q && !!c.provider;
                const key = isCloud ? 'cloud' : c.id;
                const open = q ? true : !collapsed[key];
                return (
                  <section key={key}>
                    <button className="cat" onClick={() => setCollapsed((s) => ({ ...s, [key]: !s[key] }))}>
                      <i style={{ background: c.color }} />
                      {isCloud ? 'Cloud' : c.label}
                      <span>{c.items.length}</span>
                      <ChevronDown size={14} className={open ? '' : 'closed'} />
                    </button>
                    {open && isCloud && (
                      <div className="seg cloud-tabs">
                        {PROVIDERS.map(([id, label]) => (
                          <button key={id} className={cloud === id ? 'active' : ''} onClick={() => setCloud(id)}>{label}</button>
                        ))}
                      </div>
                    )}
                    {open && (
                      <div className="items">
                        {c.items.map((it) => (
                          <button
                            key={it.id}
                            className="item"
                            draggable
                            title={`${it.label} — drag onto the canvas or click to add`}
                            style={{ '--c': c.color } as React.CSSProperties}
                            onDragStart={(e) => { e.dataTransfer.setData('application/aidraw', it.id); e.dataTransfer.effectAllowed = 'copy'; }}
                            onClick={() => addItem(it.id)}
                          >
                            <span className="item-icon"><it.icon size={16} /></span>
                            {it.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
              {!library.length && <p className="none">No components match “{query}”.</p>}
            </div>
          </aside>
        ) : (
          <button className="island icon-btn open-palette ui" title="Show library" onClick={() => setPaletteOpen(true)}><PanelLeftOpen size={18} /></button>
        )}

        {/* ---------- top centre: tools ---------- */}
        <div className="island toolbar ui">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`icon-btn tool ${tool === t.id ? 'active' : ''}`}
              title={`${t.label} — ${t.key.toUpperCase()}${t.num ? ` or ${t.num}` : ''}`}
              onClick={() => setTool(t.id)}
            >
              <t.icon size={18} />
              {t.num && <kbd>{t.num}</kbd>}
            </button>
          ))}
          {tool === 'pen' && (
            <>
              <span className="sep" />
              {['#dc2626', '#2563eb', '#059669', '#d97706', dark ? '#e7e9ee' : '#1f2430'].map((c) => (
                <button key={c} className={`swatch ${penColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setPenColor(c)} title="Pen colour" />
              ))}
            </>
          )}
          <span className="sep" />
          <button className="icon-btn" title="Undo (⌘/Ctrl+Z)" disabled={!past.current.length} onClick={undo}><Undo2 size={18} /></button>
          <button className="icon-btn" title="Redo (⌘/Ctrl+Shift+Z)" disabled={!future.current.length} onClick={redo}><Redo2 size={18} /></button>
        </div>

        {/* ---------- top right: file & view ---------- */}
        <div className="top-right ui">
          <div className="island row">
            <div className="menu-wrap">
              <button className="text-btn" onClick={() => setMenu(menu === 'templates' ? null : 'templates')}><LayoutTemplate size={16} /> Templates</button>
              {menu === 'templates' && (
                <div className="island menu">
                  {TEMPLATES.map((t) => (
                    <button key={t.id} onClick={() => insertTemplate(t.id)}>
                      <b>{t.name}</b>
                      <small>{t.desc}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="menu-wrap">
              <button className="text-btn primary" onClick={() => setMenu(menu === 'export' ? null : 'export')}><Download size={16} /> Export</button>
              {menu === 'export' && (
                <div className="island menu">
                  <button onClick={() => exportImage('png')}><b><ImageDown size={15} /> PNG image</b><small>High-resolution, for slides and docs</small></button>
                  <button onClick={() => exportImage('svg')}><b><ImageDown size={15} /> SVG image</b><small>Scalable vector</small></button>
                  <button onClick={exportJson}><b><FileJson size={15} /> Save as file</b><small>.aidraw.json you can reopen later</small></button>
                  <button onClick={() => { setMenu(null); fileInput.current?.click(); }}><b><FolderOpen size={15} /> Open file…</b><small>Replace the canvas with a saved diagram</small></button>
                  <button onClick={clearAll}><b><Trash2 size={15} /> Clear canvas</b><small>Undo brings it back</small></button>
                </div>
              )}
            </div>
          </div>
          <div className="island row">
            <button className={`icon-btn ${sketch ? 'active' : ''}`} title="Hand-drawn lettering" onClick={() => setSketch(!sketch)}><PenLine size={17} /></button>
            <button className="icon-btn" title="Light / dark" onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
            <button className="icon-btn" title="Presentation mode — hides the interface for recording (Esc to exit)" onClick={() => setFocus(true)}><Eye size={17} /></button>
          </div>
        </div>

        {/* ---------- right: properties of the selection ---------- */}
        {(selNodes.length > 0 || selEdges.length > 0) && (
          <aside className="island props ui">
            <h4>{selNodes.length ? `${selNodes.length} shape${selNodes.length > 1 ? 's' : ''}` : `${selEdges.length} connector${selEdges.length > 1 ? 's' : ''}`}</h4>
            <div className="field">
              <span>Colour</span>
              <div className="swatches">
                {SWATCHES.map((c) => (
                  <button key={c} className="swatch" style={{ background: c }} onClick={() => (selNodes.length ? patchNodes({ color: c }) : patchEdges({ color: c }))} />
                ))}
              </div>
            </div>
            {single && (
              <div className="field">
                <span>Detail line</span>
                <input
                  className="input"
                  placeholder="e.g. vLLM · 4×A100 · p95 300ms"
                  value={(single.data as any).sub ?? ''}
                  onFocus={snapshot}
                  onChange={(e) => rf.updateNodeData(single.id, { sub: e.target.value })}
                />
              </div>
            )}
            {textSelected && (
              <div className="field">
                <span>Text size</span>
                <div className="seg">
                  {[['S', 15], ['M', 20], ['L', 30], ['XL', 44]].map(([l, s]) => (
                    <button key={l} onClick={() => patchNodes({ size: s })}>{l}</button>
                  ))}
                </div>
              </div>
            )}
            {!selNodes.length && (
              <>
                <div className="field">
                  <span>Label</span>
                  <input
                    className="input"
                    placeholder="e.g. gRPC, top-k, async"
                    value={e0.label ?? ''}
                    onFocus={snapshot}
                    onChange={(e) => setEdges((es) => es.map((x) => (x.selected ? styleEdge(x, { label: e.target.value }) : x)))}
                  />
                </div>
                <div className="field">
                  <span>Line</span>
                  <div className="seg">
                    {(['solid', 'dashed', 'animated'] as const).map((v) => (
                      <button key={v} className={e0.line === v ? 'active' : ''} onClick={() => patchEdges({ line: v })}>{v === 'animated' ? 'flowing' : v}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span>Route</span>
                  <div className="seg">
                    {(['smooth', 'curved', 'straight'] as const).map((v) => (
                      <button key={v} className={e0.path === v ? 'active' : ''} onClick={() => patchEdges({ path: v })}>{v === 'smooth' ? 'elbow' : v}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span>Arrows</span>
                  <div className="seg">
                    {([['end', '→'], ['both', '↔'], ['none', '—']] as const).map(([v, l]) => (
                      <button key={v} className={e0.arrows === v ? 'active' : ''} onClick={() => patchEdges({ arrows: v })}>{l}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="actions">
              {selNodes.length > 0 && <button className="text-btn" onClick={duplicate}><Copy size={15} /> Duplicate</button>}
              <button className="text-btn danger" onClick={removeSelected}><Trash2 size={15} /> Delete</button>
            </div>
          </aside>
        )}

        <div className="hint ui">Double-click to rename · drag from a dot to connect · press 1–8 or a letter to switch tools · scroll to pan</div>
        {focus && <button className="island exit-focus" onClick={() => setFocus(false)}>Exit presentation · Esc</button>}
        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => { importJson(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </EditorCtx.Provider>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}

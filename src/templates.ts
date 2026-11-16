import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { makeNode, uid } from './library';

export const EDGE_COLOR = '#7b8494';

export type EdgeData = {
  label?: string;
  path?: 'smooth' | 'curved' | 'straight';
  line?: 'solid' | 'dashed' | 'animated';
  arrows?: 'end' | 'both' | 'none';
  color?: string;
  editing?: boolean;
};

/** Apply a data patch to an edge and keep its markers / animation in sync with that data. */
export function styleEdge(e: Edge, patch: EdgeData = {}): Edge {
  const data: EdgeData = { path: 'smooth', line: 'solid', arrows: 'end', label: '', ...(e.data as EdgeData), ...patch };
  const marker = { type: MarkerType.ArrowClosed, color: data.color ?? EDGE_COLOR, width: 18, height: 18 };
  return {
    ...e,
    type: 'flow',
    data,
    animated: data.line === 'animated',
    markerEnd: data.arrows === 'none' ? undefined : marker,
    markerStart: data.arrows === 'both' ? marker : undefined,
  };
}

type Side = 'top' | 'right' | 'bottom' | 'left';
type TNode = [key: string, item: string, col: number, row: number, label?: string, sub?: string];
type TEdge = [from: string, to: string, label?: string, opts?: EdgeData & { sh?: Side; th?: Side }];
type TFrame = [label: string, col: number, row: number, cols: number, rows: number];
export type Template = { id: string; name: string; desc: string; nodes: TNode[]; edges: TEdge[]; frames?: TFrame[] };

const COL = 300;
const ROW = 140;
const OPP: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

export function buildTemplate(t: Template, origin = { x: 0, y: 0 }): { nodes: Node[]; edges: Edge[] } {
  const byKey = new Map<string, Node>();
  const frames = (t.frames ?? []).map(([label, col, row, cols, rows]) => ({
    ...makeNode('frame', { x: origin.x + col * COL - 30, y: origin.y + row * ROW - 56 }, { label }),
    width: (cols - 1) * COL + 190 + 60,
    height: (rows - 1) * ROW + 64 + 92,
  }));
  const nodes = t.nodes.map(([key, item, col, row, label, sub]) => {
    const n = makeNode(item, { x: origin.x + col * COL, y: origin.y + row * ROW }, { ...(label ? { label } : {}), ...(sub ? { sub } : {}) });
    byKey.set(key, n);
    return n;
  });
  const edges = t.edges.map(([from, to, label, opts]) => {
    const a = byKey.get(from)!;
    const b = byKey.get(to)!;
    const { sh, th, ...data } = opts ?? {};
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const auto: Side = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'bottom' : 'top';
    const sourceHandle = sh ?? auto;
    return styleEdge(
      { id: uid('e'), source: a.id, target: b.id, sourceHandle, targetHandle: th ?? OPP[sh ? auto : sourceHandle] },
      { label: label ?? '', ...data },
    );
  });
  return { nodes: [...frames, ...nodes], edges };
}

export const TEMPLATES: Template[] = [
  {
    id: 'rag',
    name: 'RAG pipeline',
    desc: 'Offline ingestion + online retrieval and generation',
    frames: [['Ingestion (offline)', 0, 0, 4, 1], ['Query path (online)', 0, 2, 5, 2]],
    nodes: [
      ['docs', 'data-source', 0, 0, 'Documents'],
      ['chunk', 'chunker', 1, 0],
      ['embed', 'embedding', 2, 0],
      ['vdb', 'vector-db', 3, 0],
      ['user', 'user', 0, 2],
      ['api', 'api-gateway', 1, 2, 'RAG API'],
      ['ret', 'retriever', 2, 2],
      ['rerank', 'reranker', 3, 2],
      ['prompt', 'prompt', 4, 2, 'Prompt Builder'],
      ['llm', 'llm', 4, 3],
      ['guard', 'guardrails', 2, 3, 'Output Guardrails'],
    ],
    edges: [
      ['docs', 'chunk'], ['chunk', 'embed'], ['embed', 'vdb', 'upsert'],
      ['user', 'api', 'question'], ['api', 'ret'],
      ['ret', 'embed', 'embed query', { line: 'dashed' }],
      ['ret', 'vdb', 'top-k search', { arrows: 'both', sh: 'top', th: 'bottom' }],
      ['ret', 'rerank'], ['rerank', 'prompt', 'context'], ['prompt', 'llm'],
      ['llm', 'guard', 'tokens', { line: 'animated' }],
      ['guard', 'user', 'answer + citations', { line: 'animated', sh: 'left', th: 'bottom' }],
    ],
  },
  {
    id: 'agent',
    name: 'Tool-using agent',
    desc: 'ReAct-style loop with tools, memory and guardrails',
    frames: [['Tools', 4, 0, 1, 3]],
    nodes: [
      ['user', 'user', 0, 1],
      ['guard', 'guardrails', 1, 1, 'Input Guardrails'],
      ['agent', 'agent', 2, 1, 'Agent Loop', 'observe → think → act'],
      ['llm', 'llm', 2, 0],
      ['router', 'router', 3, 1, 'Tool Router'],
      ['t1', 'tool', 4, 0, 'Web Search'],
      ['t2', 'mcp', 4, 1],
      ['t3', 'code-exec', 4, 2],
      ['stm', 'memory-short', 1, 2],
      ['ltm', 'memory-long', 2, 2],
      ['hitl', 'hitl', 3, 2, 'Human Approval'],
    ],
    edges: [
      ['user', 'guard', 'task'], ['guard', 'agent'],
      ['agent', 'llm', 'reason / plan', { arrows: 'both' }],
      ['agent', 'router', 'tool call'],
      ['router', 't1'], ['router', 't2'], ['router', 't3'],
      ['agent', 'stm', 'scratchpad', { arrows: 'both', path: 'curved', sh: 'bottom', th: 'top' }],
      ['agent', 'ltm', 'recall / store', { arrows: 'both' }],
      ['router', 'hitl', 'risky action', { line: 'dashed' }],
    ],
  },
  {
    id: 'inference',
    name: 'LLM inference serving',
    desc: 'Gateway, batching, GPU replicas and autoscaling',
    frames: [['GPU pool', 4, 0, 2, 3]],
    nodes: [
      ['client', 'client-web', 0, 1, 'Client'],
      ['lb', 'lb', 1, 1],
      ['gw', 'model-gateway', 2, 1],
      ['rl', 'rate-limiter', 2, 0],
      ['sc', 'semantic-cache', 2, 2],
      ['batch', 'batcher', 3, 1, 'Queue + Batcher'],
      ['as', 'autoscaler', 3, 0],
      ['s1', 'inference-server', 4, 0, 'Inference Server', 'vLLM replica A'],
      ['s2', 'inference-server', 4, 2, 'Inference Server', 'vLLM replica B'],
      ['g1', 'gpu', 5, 0],
      ['g2', 'gpu', 5, 2],
      ['w', 'object-store', 4, 3, 'Model Weights'],
    ],
    edges: [
      ['client', 'lb'], ['lb', 'gw'],
      ['gw', 'rl', 'quota', { arrows: 'both' }],
      ['gw', 'sc', 'cache hit?', { arrows: 'both' }],
      ['gw', 'batch', 'prompts'],
      ['batch', 's1'], ['batch', 's2'],
      ['s1', 'g1'], ['s2', 'g2'],
      ['batch', 'as', 'queue depth', { line: 'dashed' }],
      ['as', 's1', 'scale', { line: 'dashed' }],
      ['w', 's2', 'load', { line: 'dashed' }],
    ],
  },
  {
    id: 'mlops',
    name: 'ML training → serving',
    desc: 'Feature store, training, registry, CI/CD and drift loop',
    nodes: [
      ['src', 'data-source', 0, 0],
      ['etl', 'etl', 1, 0],
      ['fs', 'feature-store', 2, 0],
      ['train', 'training', 3, 0],
      ['reg', 'registry', 4, 0],
      ['exp', 'experiments', 3, 1],
      ['git', 'git', 0, 2],
      ['ci', 'cicd', 1, 2],
      ['serve', 'online-serving', 4, 2],
      ['mon', 'monitoring-ml', 5, 2],
    ],
    edges: [
      ['src', 'etl'], ['etl', 'fs'], ['fs', 'train', 'features'], ['train', 'reg', 'model'],
      ['train', 'exp', 'metrics', { line: 'dashed' }],
      ['git', 'ci'], ['ci', 'serve', 'deploy'],
      ['reg', 'serve', 'promote'],
      ['serve', 'mon', 'predictions'],
      ['mon', 'train', 'retrain trigger', { line: 'animated', sh: 'top', th: 'top' }],
    ],
  },
];

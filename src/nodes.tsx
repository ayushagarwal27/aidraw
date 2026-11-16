import { createContext, useContext, useState } from 'react';
import {
  BaseEdge, EdgeLabelRenderer, Handle, NodeResizer, Position, getBezierPath, getSmoothStepPath,
  getStraightPath, useReactFlow, type EdgeProps, type NodeProps,
} from '@xyflow/react';
import { iconFor } from './library';
import { type EdgeData } from './templates';

/** Lets nodes record an undo step before they change themselves. */
export const EditorCtx = createContext<{ snapshot: () => void }>({ snapshot() {} });

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];
const Handles = () => (
  <>
    {SIDES.map((p) => (
      <Handle key={p} id={p} type="source" position={p} />
    ))}
  </>
);

function EditableLabel({ id, value, field = 'label', className = '', placeholder = '', startEditing = false }: {
  id: string; value: string; field?: string; className?: string; placeholder?: string; startEditing?: boolean;
}) {
  const [editing, setEditing] = useState(startEditing);
  const { updateNodeData } = useReactFlow();
  const { snapshot } = useContext(EditorCtx);

  if (editing) {
    return (
      <textarea
        className={`nodrag nopan nowheel label-edit ${className}`}
        autoFocus
        rows={Math.max(1, value.split('\n').length)}
        defaultValue={value}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => {
          if (e.target.value !== value) snapshot();
          updateNodeData(id, { [field]: e.target.value, autoEdit: false });
          setEditing(false);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') e.currentTarget.blur();
        }}
      />
    );
  }
  return (
    <div className={`label ${className}`} onDoubleClick={() => setEditing(true)}>
      {value || <span className="placeholder">{placeholder}</span>}
    </div>
  );
}

function Resizer({ selected, minWidth = 60, minHeight = 40 }: { selected?: boolean; minWidth?: number; minHeight?: number }) {
  const { snapshot } = useContext(EditorCtx);
  return <NodeResizer isVisible={!!selected} minWidth={minWidth} minHeight={minHeight} onResizeStart={snapshot} />;
}

const tint = (color: string) => ({ '--c': color }) as React.CSSProperties;

function ComponentNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const Icon = iconFor(d.icon);
  return (
    <div className="cnode" style={tint(d.color)}>
      <Resizer selected={selected} minWidth={130} minHeight={52} />
      <div className="cnode-icon"><Icon size={20} strokeWidth={2} /></div>
      <div className="cnode-text">
        <EditableLabel id={id} value={d.label} placeholder="Name" />
        {d.sub && <EditableLabel id={id} field="sub" value={d.sub} className="cnode-sub" />}
      </div>
      <Handles />
    </div>
  );
}

function ShapeNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  return (
    <div className={`shape shape-${d.shape}`} style={tint(d.color)}>
      <Resizer selected={selected} />
      {d.shape === 'diamond' && (
        <svg className="shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="50,1 99,50 50,99 1,50" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <EditableLabel id={id} value={d.label} placeholder="double-click" startEditing={d.autoEdit} />
      <Handles />
    </div>
  );
}

function TextNode({ id, data }: NodeProps) {
  const d = data as any;
  return (
    <div className="tnode" style={{ fontSize: d.size ?? 20, color: d.color }}>
      <EditableLabel id={id} value={d.label} placeholder="Text" startEditing={d.autoEdit} />
    </div>
  );
}

function NoteNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  return (
    <div className="note">
      <Resizer selected={selected} minWidth={100} minHeight={70} />
      <EditableLabel id={id} value={d.label} placeholder="Double-click to write a note" startEditing={d.autoEdit} />
      <Handles />
    </div>
  );
}

function FrameNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  return (
    <div className={`frame ${selected ? 'is-selected' : ''}`} style={tint(d.color)}>
      <Resizer selected={selected} minWidth={160} minHeight={100} />
      <EditableLabel id={id} value={d.label} className="frame-title" placeholder="Group" />
    </div>
  );
}

export function strokePath(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]} l0.01,0` : '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q${x},${y} ${(x + nx) / 2},${(y + ny) / 2}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d} L${lx},${ly}`;
}

function StrokeNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <svg className={`stroke ${selected ? 'is-selected' : ''}`} width="100%" height="100%">
      <path d={strokePath(d.points)} stroke={d.color} strokeWidth={d.size ?? 3} />
    </svg>
  );
}

export const nodeTypes = {
  component: ComponentNode,
  shape: ShapeNode,
  text: TextNode,
  note: NoteNode,
  frame: FrameNode,
  stroke: StrokeNode,
};

function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, markerStart, selected }: EdgeProps) {
  const d = (data ?? {}) as EdgeData;
  const { updateEdgeData } = useReactFlow();
  const { snapshot } = useContext(EditorCtx);
  const args = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
  const [path, lx, ly] =
    d.path === 'straight' ? getStraightPath(args) : d.path === 'curved' ? getBezierPath(args) : getSmoothStepPath({ ...args, borderRadius: 14 });
  const color = d.color ?? 'var(--edge)';

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={24}
        style={{ stroke: color, strokeWidth: selected ? 3.5 : 2.25, strokeDasharray: d.line === 'dashed' ? '7 6' : undefined }}
      />
      {(d.label || d.editing) && (
        <EdgeLabelRenderer>
          <div
            className={`edge-label nodrag nopan ${selected ? 'is-selected' : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, color: d.color }}
            onDoubleClick={() => updateEdgeData(id, { editing: true })}
          >
            {d.editing ? (
              <input
                autoFocus
                defaultValue={d.label}
                size={Math.max(6, (d.label ?? '').length + 1)}
                onFocus={(e) => e.target.select()}
                onBlur={(e) => {
                  if (e.target.value !== d.label) snapshot();
                  updateEdgeData(id, { label: e.target.value, editing: false });
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                }}
              />
            ) : (
              d.label
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { flow: FlowEdge };

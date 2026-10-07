"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, ArrowUpRight, Cable, Clock3, Cpu, FlaskConical, Link2, MoreHorizontal, Trash2 } from "lucide-react";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { PartThumb } from "@/components/library/PartThumb";
import { getPart } from "@/lib/parts";
import { analyze } from "@/lib/lab/circuit";
import { nodeLayout, pinY } from "@/lib/lab/layout";
import { getPinout, pinTone } from "@/lib/lab/pinout";
import { useLab } from "@/lib/lab/store";
import type { LabSession } from "@/lib/lab/types";
import type { RoboticsProject } from "@/lib/robotics-data";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = { power: "#ef4444", ground: "#64748b", digital: "#3b82f6", analog: "#10b981", pwm: "#f59e0b", bus: "#8b5cf6", muted: "#cbd5e1" };

export function labHref(id: string) {
  return `/laboratory/workspace?session=${encodeURIComponent(id)}`;
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
}

/** A small drawing of the canvas: parts as cards, wires coloured by what they carry. */
export function SessionPreview({ session, className }: { session: LabSession; className?: string }) {
  const { boxes, lines, view } = useMemo(() => {
    const boxes = session.nodes.map((n) => ({ n, ...nodeLayout(n.partId) }));
    if (!boxes.length) return { boxes, lines: [], view: "0 0 100 60" };
    const minX = Math.min(...boxes.map((b) => b.n.x)) - 40;
    const minY = Math.min(...boxes.map((b) => b.n.y)) - 40;
    const maxX = Math.max(...boxes.map((b) => b.n.x + b.w)) + 40;
    const maxY = Math.max(...boxes.map((b) => b.n.y + b.h)) + 40;
    const pinPos = (nodeId: string, pinId: string) => {
      const b = boxes.find((x) => x.n.id === nodeId);
      if (!b) return null;
      const li = b.left.findIndex((p) => p.id === pinId);
      const ri = b.right.findIndex((p) => p.id === pinId);
      if (li >= 0) return { x: b.n.x, y: b.n.y + pinY(li), side: -1 };
      if (ri >= 0) return { x: b.n.x + b.w, y: b.n.y + pinY(ri), side: 1 };
      return null;
    };
    const lines = session.wires.flatMap((w) => {
      const a = pinPos(w.from.node, w.from.pin);
      const b = pinPos(w.to.node, w.to.pin);
      if (!a || !b) return [];
      const fromNode = session.nodes.find((n) => n.id === w.from.node);
      const toNode = session.nodes.find((n) => n.id === w.to.node);
      const pa = fromNode ? getPinout(fromNode.partId).pins.find((p) => p.id === w.from.pin) : undefined;
      const pb = toNode ? getPinout(toNode.partId).pins.find((p) => p.id === w.to.pin) : undefined;
      const tones = [pa, pb].filter(Boolean).map((p) => pinTone(p!));
      const tone = tones.includes("power") ? "power" : tones.includes("ground") ? "ground" : (tones.find((t) => t !== "digital") ?? "digital");
      const k = Math.max(40, Math.abs(b.x - a.x) * 0.4);
      return [{ id: w.id, d: `M ${a.x} ${a.y} C ${a.x + a.side * k} ${a.y}, ${b.x + b.side * k} ${b.y}, ${b.x} ${b.y}`, color: TONE[tone] }];
    });
    return { boxes, lines, view: `${minX} ${minY} ${maxX - minX} ${maxY - minY}` };
  }, [session.nodes, session.wires]);

  return (
    <svg viewBox={view} preserveAspectRatio="xMidYMid meet" className={cn("bg-canvas", className)} aria-hidden>
      <defs>
        <pattern id={`dots-${session.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="var(--canvas-grid)" />
        </pattern>
      </defs>
      <rect x="-100000" y="-100000" width="200000" height="200000" fill={`url(#dots-${session.id})`} />
      {lines.map((l) => (
        <path key={l.id} d={l.d} fill="none" stroke={l.color} strokeWidth={6} strokeLinecap="round" />
      ))}
      {boxes.map(({ n, w, h }) => (
        <g key={n.id}>
          <rect x={n.x} y={n.y} width={w} height={h} rx={16} fill="var(--surface)" stroke="var(--border)" strokeWidth={4} />
          <rect x={n.x} y={n.y} width={w} height={46} rx={16} fill={getPinout(n.partId).controller ? "color-mix(in srgb, var(--primary) 14%, var(--surface))" : "var(--muted-bg)"} />
          <text x={n.x + 18} y={n.y + 31} fontSize={22} fontWeight={600} fill="var(--foreground)" fontFamily="var(--font-inter), sans-serif">
            {n.label.length > 16 ? `${n.label.slice(0, 15)}…` : n.label}
          </text>
          {getPart(n.partId) ? (
            <foreignObject x={n.x + w * 0.2} y={n.y + 62} width={w * 0.6} height={Math.max(40, h - 84)}>
              <PartThumb model={getPart(n.partId)!} className="h-full w-full !bg-transparent" />
            </foreignObject>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function LabSessionCard({ session, projects, showProject = true }: { session: LabSession; projects: RoboticsProject[]; showProject?: boolean }) {
  const analysis = useMemo(() => analyze(session.nodes, session.wires), [session.nodes, session.wires]);
  const errors = analysis.faults.filter((f) => f.severity === "error").length;
  const ready = Object.values(analysis.nodes).filter((r) => r.status === "ready").length;
  const project = projects.find((p) => p.id === session.projectId);
  const last = [...session.log].reverse().find((e) => e.kind !== "session" && e.kind !== "note") ?? session.log[session.log.length - 1];

  const menu: MenuEntry[] = [
    { id: "open", label: "Open in lab", icon: <FlaskConical />, onSelect: () => (window.location.href = labHref(session.id)) },
    {
      id: "link",
      label: "Link to project",
      icon: <Link2 />,
      items: [
        { id: "none", label: "No project", checked: !session.projectId, onSelect: () => useLab.getState().linkProject(session.id, null) },
        ...projects.map((p) => ({ id: p.id, label: p.name, checked: p.id === session.projectId, onSelect: () => useLab.getState().linkProject(session.id, p.id, p.name) })),
      ],
    },
    { type: "separator", id: "s" },
    {
      id: "delete",
      label: "Delete session",
      icon: <Trash2 />,
      danger: true,
      onSelect: () => {
        if (window.confirm(`Delete “${session.name}” and its activity log?`)) useLab.getState().deleteSession(session.id);
      },
    },
  ];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow-sm)] transition-colors hover:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]" data-testid="lab-session-card">
      <Link href={labHref(session.id)} className="block" aria-label={`Open ${session.name} in the Engineering Lab`}>
        <SessionPreview session={session} className="aspect-[16/7] w-full border-b border-border" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-semibold text-foreground">
              <Link href={labHref(session.id)} className="hover:text-primary">
                {session.name}
              </Link>
            </h4>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Cpu className="size-3" aria-hidden /> {session.nodes.length} part{session.nodes.length === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Cable className="size-3" aria-hidden /> {session.wires.length} wire{session.wires.length === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" aria-hidden /> {timeAgo(session.updatedAt)}
              </span>
            </p>
          </div>
          <Menu label={`${session.name} options`} items={menu} align="end" buttonClassName="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground">
            <MoreHorizontal className="size-4" />
          </Menu>
        </div>
        {last ? <p className="line-clamp-2 text-[13px] leading-5 text-foreground">{last.text}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {errors ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
              <AlertTriangle className="size-3" aria-hidden /> {errors} fault{errors === 1 ? "" : "s"}
            </span>
          ) : session.nodes.length ? (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">{ready} ready</span>
          ) : null}
          {showProject ? (
            project ? (
              <Link href={`/workspace/projects/${project.id}`} className="max-w-[12rem] truncate rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-primary hover:underline">
                {project.name}
              </Link>
            ) : (
              <span className="rounded-full bg-muted-bg px-2 py-0.5 text-[11px] text-muted">No project</span>
            )
          ) : null}
          <Link href={labHref(session.id)} className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline" data-testid="open-in-lab">
            Open in lab <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

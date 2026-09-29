"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getServerRoboticsDataSnapshot, readRoboticsData, subscribeToRoboticsData } from "@/lib/robotics-data";

export function RoboticsDashboard() {
  const data = useSyncExternalStore(
    subscribeToRoboticsData,
    readRoboticsData,
    getServerRoboticsDataSnapshot,
  );
  const projects = data?.projects ?? [];
  const experiments = data?.experiments ?? [];
  const recentProjects = [...projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 3);
  const recentExperiments = [...experiments].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 3);

  return (
    <section className="mb-10" aria-labelledby="robotics-overview-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="robotics-overview-heading" className="text-lg font-semibold">Robotics workspace</h3>
          <p className="mt-1 text-sm text-muted">Project and experiment records saved in this browser.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/workspace"><Button size="sm" variant="secondary">Projects</Button></Link>
          <Link href="/experiments"><Button size="sm">Record experiment</Button></Link>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 divide-x divide-border border-y border-border py-4">
        <div className="px-3 first:pl-0">
          <dt className="text-xs text-muted">Projects</dt>
          <dd className="mt-1 text-2xl font-semibold">{data ? projects.length : "—"}</dd>
        </div>
        <div className="px-3">
          <dt className="text-xs text-muted">Experiment records</dt>
          <dd className="mt-1 text-2xl font-semibold">{data ? experiments.length : "—"}</dd>
        </div>
        <div className="px-3">
          <dt className="text-xs text-muted">Projects with tests</dt>
          <dd className="mt-1 text-2xl font-semibold">
            {data ? new Set(experiments.map((experiment) => experiment.projectId).filter(Boolean)).size : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-8 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Recent projects</h4>
            <Link href="/workspace" className="text-xs text-primary hover:underline">All projects</Link>
          </div>
          {recentProjects.length ? (
            <div className="divide-y divide-border border-y border-border">
              {recentProjects.map((project) => (
                <Link key={project.id} href={`/workspace/projects/${project.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{project.name}</span><span className="text-xs text-muted">{project.category} · {project.hardware.length} hardware items</span></span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted" aria-hidden />
                </Link>
              ))}
            </div>
          ) : <p className="border-y border-border py-3 text-sm text-muted">No projects created yet.</p>}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Recent experiment records</h4>
            <Link href="/experiments" className="text-xs text-primary hover:underline">All records</Link>
          </div>
          {recentExperiments.length ? (
            <div className="divide-y divide-border border-y border-border">
              {recentExperiments.map((record) => {
                const project = projects.find((item) => item.id === record.projectId);
                return (
                  <Link key={record.id} href={`/experiments?record=${encodeURIComponent(record.id)}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{record.title}</span><span className="text-xs text-muted">{project?.name ?? "Unassigned"} · {new Date(record.updatedAt).toLocaleDateString()}</span></span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                );
              })}
            </div>
          ) : <p className="border-y border-border py-3 text-sm text-muted">No experiment records created yet.</p>}
        </div>
      </div>
    </section>
  );
}
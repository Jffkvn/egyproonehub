"use client";

import React, { useState } from 'react';
import { FileText, Plus, ClipboardList, CheckCircle2 } from 'lucide-react';

export default function DailyTracker() {
  const [dummyLogs] = useState([
    { id: '1', project: 'Kira Road Civil Works', logger: 'Sarah N.', notes: 'Completed subgrade compaction on section B. Awaiting concrete truck delivery tomorrow morning.', date: '2026-07-08' },
    { id: '2', project: 'Kira Road Civil Works', logger: 'Sarah N.', notes: 'Excavation completed for drain line foundations. 2 casual laborers absent.', date: '2026-07-07' },
    { id: '3', project: 'Entebbe Bypass Expansion', logger: 'James K.', notes: 'Paving team completed laying asphalt binder course on CH 12+400 to 12+800.', date: '2026-07-06' },
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy mb-1.5 flex items-center gap-2">
            <FileText className="text-primary w-5 h-5" />
            Daily Project Site Tracker
          </h2>
          <p className="text-sm text-text-muted">
            Log active machinery operations, document site construction milestones, report material shortages, and record staff attendance.
          </p>
        </div>
        <button className="px-4 py-2.5 bg-primary text-white text-xs font-semibold rounded-lg shadow hover:bg-primary/95 transition-all flex items-center gap-2">
          <Plus size={16} />
          Log Site Update
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-background/25 flex items-center justify-between">
            <h3 className="font-bold text-navy text-sm">Recent Activity Log</h3>
            <span className="text-xs text-text-muted">Filtered by assigned sites</span>
          </div>

          <div className="p-6 space-y-6">
            {dummyLogs.map((log) => (
              <div key={log.id} className="flex gap-4 items-start border-l-2 border-primary pl-4 relative">
                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-navy text-sm">{log.project}</span>
                    <span className="text-xs text-text-muted">• logged by {log.logger}</span>
                    <span className="text-xs font-mono bg-background px-2 py-0.5 border border-border rounded text-text-muted">{log.date}</span>
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed">{log.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 space-y-4 h-fit">
          <h3 className="text-sm font-bold text-navy flex items-center gap-2 pb-2.5 border-b border-border">
            <ClipboardList size={18} className="text-primary" /> Site Update Scaffolding
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Coordinators submit daily reports which roll up into executive summaries. Project managers must endorse these reports daily.
          </p>
          <div className="space-y-3.5 text-xs text-text-muted bg-background/50 border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary font-bold">
              <CheckCircle2 size={14} /> Site Logs Setup Complete
            </div>
            <div>
              <span className="font-bold text-navy block">Database Anchor:</span>
              <span>Audit table tracking enabled for updates.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

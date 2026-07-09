"use client";

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { AuditLog } from '@/types';
import { FileSpreadsheet, ShieldCheck, History, Calendar, Search } from 'lucide-react';

export default function ReportsAndAudits() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (!isSupabaseConfigured) return;
      setLoading(true);
      try {
        const { data, error: logError } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (logError) throw logError;
        setLogs(data as AuditLog[]);
      } catch (err: any) {
        console.error('Error fetching audit logs:', err);
        setError(err.message || 'Error loading audit logs');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-navy mb-1.5 flex items-center gap-2">
            <FileSpreadsheet className="text-primary w-5 h-5" />
            System Audits & Reports
          </h2>
          <p className="text-sm text-text-muted">
            Track append-only corporate operations, review permission updates, and audit resource allocations.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-success bg-success-tint border border-success/20 px-3.5 py-2 rounded-lg">
          <ShieldCheck size={16} /> Immutable Audit Logs Active
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-background/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-navy text-sm flex items-center gap-2">
            <History size={16} className="text-primary" /> Log Entry Trail ({logs.length})
          </h3>
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Search audit trail..."
              className="w-full pl-9 pr-3 py-1.5 border border-border rounded-lg text-xs placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary bg-background text-text transition-all"
            />
            <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-text-muted" />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-text-muted font-medium">Loading system ledger...</p>
          </div>
        ) : error ? (
          <div className="p-4 m-6 bg-danger-tint border border-danger/20 rounded-lg text-danger text-xs font-semibold">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-text-muted">
              <thead className="bg-background/40 font-semibold text-navy text-xs uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-3.5">Action Event</th>
                  <th className="px-6 py-3.5">Target Entity</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5 flex items-center gap-1"><Calendar size={12} /> Logged Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-xs text-text-muted italic">
                      No system log entries registered yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-background/25 transition-colors">
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-navy-tint text-navy border border-navy/20 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-navy capitalize">{log.entity_type}</div>
                        <div className="text-[10px] text-text-muted font-mono truncate max-w-[120px]">{log.entity_id || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-text text-xs leading-relaxed max-w-sm">
                        {log.description}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-text-muted shrink-0">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

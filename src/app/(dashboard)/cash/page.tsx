"use client";

import React, { useState } from 'react';
import { Coins, Plus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function ProjectCashControl() {
  const [dummyAdvances] = useState([
    { id: '1', requestNo: 'ADV-2026-004', project: 'Kira Road Civil Works', requestor: 'Sarah N. (Coordinator)', amount: 450000, status: 'approved', date: '2026-07-06' },
    { id: '2', requestNo: 'ADV-2026-005', project: 'Kira Road Civil Works', requestor: 'Sarah N. (Coordinator)', amount: 800000, status: 'pending', date: '2026-07-08' },
    { id: '3', requestNo: 'ADV-2026-006', project: 'Entebbe Bypass Expansion', requestor: 'James K. (PM)', amount: 1200000, status: 'pending', date: '2026-07-08' },
    { id: '4', requestNo: 'ADV-2026-003', project: 'Entebbe Bypass Expansion', requestor: 'James K. (PM)', amount: 600000, status: 'retired', date: '2026-07-01' },
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy mb-1.5 flex items-center gap-2">
            <Coins className="text-primary w-5 h-5" />
            Project Cash Control Ledger
          </h2>
          <p className="text-sm text-text-muted">
            Manage site cash floats, submit petty cash advances, approve disbursements, and monitor retirement audits.
          </p>
        </div>
        <button className="px-4 py-2.5 bg-primary text-white text-xs font-semibold rounded-lg shadow hover:bg-primary/95 transition-all flex items-center gap-2">
          <Plus size={16} />
          Request Advance
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-5 border border-border rounded-xl shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-primary-tint border border-primary/20 text-primary rounded-lg">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-text-muted block uppercase tracking-wider">Approved Float</span>
            <span className="text-xl font-extrabold text-navy">450,000 UGX</span>
          </div>
        </div>

        <div className="bg-surface p-5 border border-border rounded-xl shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-warning-tint border border-warning/20 text-warning rounded-lg">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-text-muted block uppercase tracking-wider">Pending Approval</span>
            <span className="text-xl font-extrabold text-navy">2,000,000 UGX</span>
          </div>
        </div>

        <div className="bg-surface p-5 border border-border rounded-xl shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-danger-tint border border-danger/20 text-danger rounded-lg">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-text-muted block uppercase tracking-wider">Unretired Balance</span>
            <span className="text-xl font-extrabold text-navy">600,000 UGX</span>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-background/25 flex justify-between items-center">
          <h3 className="font-bold text-navy text-sm">Site Cash Requests</h3>
          <span className="text-xs text-text-muted">Filtered by assigned projects</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-text-muted">
            <thead className="bg-background/40 font-semibold text-navy text-xs uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-3.5">Request No</th>
                <th className="px-6 py-3.5">Project / Site</th>
                <th className="px-6 py-3.5">Requested By</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dummyAdvances.map((adv) => (
                <tr key={adv.id} className="hover:bg-background/25 transition-colors">
                  <td className="px-6 py-4 font-bold text-navy">{adv.requestNo}</td>
                  <td className="px-6 py-4">{adv.project}</td>
                  <td className="px-6 py-4">{adv.requestor}</td>
                  <td className="px-6 py-4 font-mono font-semibold text-text">{adv.amount.toLocaleString()} UGX</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase
                        ${adv.status === 'approved' ? 'bg-success-tint text-success border-success/20' : ''}
                        ${adv.status === 'pending' ? 'bg-warning-tint text-warning border-warning/20' : ''}
                        ${adv.status === 'retired' ? 'bg-primary-tint text-primary border-primary/20' : ''}
                      `}
                    >
                      {adv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{adv.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

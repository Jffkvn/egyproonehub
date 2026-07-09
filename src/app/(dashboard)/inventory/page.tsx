"use client";

import React, { useState } from 'react';
import { Package, Scan, Printer, Plus, ShoppingBag } from 'lucide-react';

export default function InventoryCatalog() {
  const [dummyCatalog] = useState([
    { id: '1', name: 'DeWalt Hammer Drill DCD996', sku: 'EQ-DRL-001', category: 'Power Tools', qty: 4, unit: 'pcs' },
    { id: '2', name: 'Safety Harness Double Lanyard', sku: 'EQ-PPE-042', category: 'PPE / Safety', qty: 25, unit: 'pcs' },
    { id: '3', name: 'Portland Cement (50kg)', sku: 'CS-CEM-010', category: 'Consumables', qty: 150, unit: 'bags' },
    { id: '4', name: 'Steel Rebar 12mm x 12m', sku: 'CS-RBR-005', category: 'Steel & Metal', qty: 85, unit: 'pcs' },
    { id: '5', name: 'Honda 5.5HP Water Pump', sku: 'EQ-PMP-002', category: 'Generators & Pumps', qty: 2, unit: 'pcs' },
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-navy mb-1.5 flex items-center gap-2">
            <Package className="text-primary w-5 h-5" />
            Inventory & Equipment Catalog
          </h2>
          <p className="text-sm text-text-muted">
            Inspect active warehouse inventory stock balances, track machinery allocations, and review intake.
          </p>
        </div>

        {/* Disabled QR features with "Coming later" tag */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled
            className="px-4 py-2 border border-border bg-background text-text-muted text-xs font-semibold rounded-lg opacity-60 cursor-not-allowed flex items-center gap-2 relative group"
          >
            <Scan size={14} />
            Scan QR Code
            <span className="absolute -top-2 -right-2 bg-warning text-navy font-bold text-[8px] uppercase px-1.5 py-0.5 rounded-full ring-2 ring-surface scale-90">
              Later
            </span>
          </button>

          <button
            disabled
            className="px-4 py-2 border border-border bg-background text-text-muted text-xs font-semibold rounded-lg opacity-60 cursor-not-allowed flex items-center gap-2 relative group"
          >
            <Printer size={14} />
            Print Barcode Labels
            <span className="absolute -top-2 -right-2 bg-warning text-navy font-bold text-[8px] uppercase px-1.5 py-0.5 rounded-full ring-2 ring-surface scale-90">
              Later
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catalog Table */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-background/25 flex items-center justify-between">
            <h3 className="font-bold text-navy text-sm">Warehouse Stock Registry</h3>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-primary-tint text-primary rounded-full border border-primary/20">
              Active Catalogue
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-text-muted">
              <thead className="bg-background/40 font-semibold text-navy text-xs uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-3.5">Item Details</th>
                  <th className="px-6 py-3.5">SKU Code</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5 text-right">Available Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dummyCatalog.map((item) => (
                  <tr key={item.id} className="hover:bg-background/25 transition-colors">
                    <td className="px-6 py-4 font-bold text-navy">{item.name}</td>
                    <td className="px-6 py-4 font-mono text-xs">{item.sku}</td>
                    <td className="px-6 py-4">{item.category}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-text">
                      {item.qty} <span className="text-xs text-text-muted font-normal">{item.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel placeholder */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-navy flex items-center gap-2 pb-2.5 border-b border-border">
              <ShoppingBag size={18} className="text-primary" /> Goods Received Notes (GRN)
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Verify vendor invoice receipts, match PO thresholds, log items into central catalogs, and notify project coordinators of material delivery.
            </p>
            <button className="w-full py-2.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/95 transition-all shadow-xs flex items-center justify-center gap-2">
              <Plus size={14} /> New GRN Intake Log
            </button>
          </div>

          <div className="bg-surface border border-border rounded-xl shadow-2xs p-6 bg-navy-tint/5 border-navy/10">
            <h4 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">Notice: QR Workflows</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              In accordance with operational roll-out schedules, camera scanner modules, QR receipt printing, and local hardware connectivity are deferred until future development phases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

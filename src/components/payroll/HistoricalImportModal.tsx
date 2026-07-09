"use client";

import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { X, Upload, CheckCircle, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { writeAuditLog } from '@/lib/audit/logger';

interface HistoricalImportModalProps {
  onClose: () => void;
  onImported: () => void;
  currentUser: any;
}

const parseDate = (val: any) => {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
};

const normaliseName = (name: string) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[''`\-]/g, '')   // strip apostrophes & hyphens
    .replace(/\s+/g, ' ')      // collapse multiple spaces
    .trim()
    .split(' ')
    .sort()
    .join(' ');
};

const INVALID_EMP_NUMBERS = new Set([
  'permanent', 'consultant', 'intern', 'contract', 'contractor',
  'temporary', 'temp', 'full-time', 'full time', 'part-time', 'part time',
  'casual', 'volunteer', 'probation'
]);

const getEndOfMonth = (monthCode: string) => {
  if (!monthCode) return null;
  const [year, month] = monthCode.split('-');
  const d = new Date(parseInt(year), parseInt(month), 0);
  return d.toISOString().split('T')[0];
};

const isValidEmpNumber = (val: any) => {
  if (!val) return false;
  return !INVALID_EMP_NUMBERS.has(String(val).trim().toLowerCase());
};

export default function HistoricalImportModal({ onClose, onImported, currentUser }: HistoricalImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [statusText, setStatusText] = useState<string>('');

  const findColumn = (row: any, possibleNames: string[]) => {
    const keys = Object.keys(row);
    for (const p of possibleNames) {
      const pNorm = p.toLowerCase().replace(/\s+/g, ' ').trim();
      const match = keys.find(k => {
        const kNorm = k.toLowerCase().replace(/\s+/g, ' ').trim();
        return kNorm.includes(pNorm);
      });
      if (match) return row[match];
    }
    return undefined;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setStatusText('Reading workbook...');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) throw new Error("Could not read file data");
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Find sheets that look like Month Year, allowing prefixes like "Payroll " or "PAYE of "
        const monthRegex = /(?:Payroll\s+|PAYE\s+of\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;
        let validSheets = wb.SheetNames.filter(name => monthRegex.test(name));
        
        validSheets.sort((a, b) => {
          const ma = a.match(monthRegex);
          const mb = b.match(monthRegex);
          if (!ma || !mb) return 0;
          const aVal = parseInt(ma[2]) * 12 + ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(ma[1].toLowerCase());
          const bVal = parseInt(mb[2]) * 12 + ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(mb[1].toLowerCase());
          return aVal - bVal;
        });
        
        if (validSheets.length === 0) {
          setStatusText("No valid monthly sheets found (e.g. 'January 2026').");
          setPreviewData(null);
          return;
        }

        const allData: Record<string, any[]> = {};
        let totalRows = 0;
        validSheets.forEach(name => {
          const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { range: 1 }) as any[];
          if (data && data.length > 0) {
            allData[name] = data;
            totalRows += data.length;
          }
        });

        if (totalRows === 0) {
          setStatusText("Valid sheets found, but they are empty.");
          setPreviewData(null);
          return;
        }

        setPreviewData({ sheets: allData, totalRows });
        setStatusText(`Parsed successfully: ${validSheets.length} months found, total ${totalRows} payroll rows.`);
      } catch (err: any) {
        setStatusText("Error reading file: " + err.message);
      }
    };
    reader.readAsBinaryString(selected);
  };

  const processImport = async () => {
    if (!previewData || !currentUser || !isSupabaseConfigured) return;
    setLoading(true);
    setStatusText('Matching employees and executing migrations...');

    try {
      // 1. Fetch current database employees list
      const { data: existingEmployees, error: empErr } = await supabase
        .from('employees')
        .select('id, full_name, employee_number, email');
      if (empErr) throw empErr;

      const employeeMap: Record<string, string> = {};
      const employeeNormMap: Record<string, string> = {};
      const employeeEmailMap: Record<string, string> = {};
      (existingEmployees || []).forEach((e: any) => {
        if (e.full_name) {
          employeeMap[e.full_name.trim().toLowerCase()] = e.id;
          employeeNormMap[normaliseName(e.full_name)] = e.id;
        }
        if (e.email) employeeEmailMap[e.email.trim().toLowerCase()] = e.id;
      });

      const employeeLastMonthMap: Record<string, string> = {};
      const employeeExplicitEndDateMap: Record<string, string> = {};

      let newCount = 0;
      let totalImported = 0;

      // Process each sheet
      for (const [sheetName, rows] of Object.entries(previewData.sheets)) {
        const monthRegex = /(?:Payroll\s+|PAYE\s+of\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;
        const match = sheetName.match(monthRegex);
        if (!match) continue;
        
        const mName = match[1];
        const yyyy = match[2];
        const mIndex = ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(mName.toLowerCase()) + 1;
        const monthName = `${mName} ${yyyy}`;

        // 2. Select or create `payroll_periods` row
        const startDate = `${yyyy}-${String(mIndex).padStart(2, '0')}-01`;
        const endDate = new Date(Number(yyyy), mIndex, 0).toISOString().split('T')[0];

        // Try selecting
        let { data: periodData } = await supabase
          .from('payroll_periods')
          .select('id')
          .eq('year', Number(yyyy))
          .eq('month', mIndex)
          .maybeSingle();

        let periodId = periodData?.id;

        if (!periodId) {
          const { data: newPeriod, error: pInsError } = await supabase
            .from('payroll_periods')
            .insert([{
              name: monthName,
              year: Number(yyyy),
              month: mIndex,
              start_date: startDate,
              end_date: endDate,
              status: 'locked' // historical runs are locked
            }])
            .select('id')
            .single();
          if (pInsError) throw pInsError;
          periodId = newPeriod.id;

          await writeAuditLog(
            currentUser.id,
            'PAYROLL_PERIOD_CREATE',
            'payroll_periods',
            periodId,
            `Created historical period window: ${monthName}`,
            { name: monthName, year: Number(yyyy), month: mIndex }
          );
        }

        const itemsToInsert = [];

        for (const row of rows as any[]) {
          const firstName = findColumn(row, ['first name']);
          const lastName = findColumn(row, ['last name']);
          
          let rawName: any;
          if (firstName || lastName) {
            rawName = `${firstName || ''} ${lastName || ''}`.trim();
          } else {
            rawName = findColumn(row, ['full name', 'name', 'employee']);
          }
          if (!rawName) continue;

          const name = String(rawName).trim();
          if (name.toUpperCase().includes('TOTAL')) continue; // skip Excel total summation row

          const searchName = name.toLowerCase();
          const newEmail = findColumn(row, ['company email', 'email'])?.toString().trim().toLowerCase();
          
          let empId = newEmail ? employeeEmailMap[newEmail] : undefined;
          if (!empId) empId = employeeMap[searchName];
          if (!empId) empId = employeeNormMap[normaliseName(name)];
          
          // Fuzzy matches
          if (!empId) {
            const newParts = searchName.split(/\s+/);
            for (const existingEmp of (existingEmployees || [])) {
              const eName = (existingEmp.full_name || '').toLowerCase().trim();
              if (!eName) continue;
              const eParts = eName.split(/\s+/);
              if (eParts.length >= 2 && newParts.length >= 2) {
                if (eParts[0] === newParts[0] && eParts[eParts.length - 1] === newParts[newParts.length - 1]) {
                  empId = existingEmp.id;
                  break;
                }
              }
              if (eName.includes(searchName) || searchName.includes(eName)) {
                empId = existingEmp.id;
                break;
              }
            }
          }

          if (empId) {
            employeeMap[searchName] = empId;
            if (newEmail) employeeEmailMap[newEmail] = empId;
          }

          const rawBasic = findColumn(row, ['basic']);
          const basic = rawBasic !== undefined ? parseFloat(rawBasic) || 0 : 0;
          const rawGross = findColumn(row, ['gross salary']);
          const gross = rawGross !== undefined ? parseFloat(rawGross) || 0 : basic;
          const payeVal = parseFloat(findColumn(row, ['paye'])) || 0;
          const nssfEmpVal = parseFloat(findColumn(row, ['nssf (employee 5%)', 'nssf emp', 'nssf (5%)', 'nssf 5%'])) || 0;
          const whtVal = parseFloat(findColumn(row, ['withholding tax', 'wht'])) || 0;

          let empType = 'local';
          if (whtVal > 0) {
            empType = 'contractor';
          } else if (gross > 0 && payeVal === 0 && nssfEmpVal === 0) {
            empType = 'exempt';
          }

          // Create missing employees
          if (!empId) {
            const accNo = findColumn(row, ['account number', 'acc no']);
            const sortCode = findColumn(row, ['sort code']);
            const phone = findColumn(row, ['phone', 'mobile']);
            const tin = findColumn(row, ['tin']);
            const nssf = findColumn(row, ['nssf number', 'nssf no']);
            const dept = findColumn(row, ['team', 'department']);
            const position = findColumn(row, ['position', 'job title', 'role']);
            const rawEmpNo = findColumn(row, ['company id no', 'employee number', 'emp no', 'id no']);
            const empNo = isValidEmpNumber(rawEmpNo) ? rawEmpNo : null;
            const startDateRaw = findColumn(row, ['start date', 'joining date', 'hire date']);
            const startDate = parseDate(startDateRaw);

            const { data: newEmp, error: createErr } = await supabase
              .from('employees')
              .insert({
                full_name: name,
                status: 'inactive',
                employment_type: 'permanent',
                employee_type: empType,
                account_number: accNo ? String(accNo) : null,
                sort_code: sortCode ? String(sortCode) : null,
                mobile_money_number: phone ? String(phone) : null,
                tin_number: tin ? String(tin) : null,
                nssf_number: nssf ? String(nssf) : null,
                department: dept ? String(dept) : null,
                gross_salary: gross,
                email: newEmail || null,
                position: position ? String(position) : null,
                employee_number: empNo ? String(empNo) : null,
                start_date: startDate,
                bank_name: 'Equity Bank' // Default
              })
              .select('id')
              .single();
              
            if (createErr) throw createErr;
            empId = newEmp.id;
            employeeMap[name.toLowerCase()] = empId as string;
            newCount++;
          }

          const monthCode = `${yyyy}-${String(mIndex).padStart(2, '0')}`;
          if (empId) {
            employeeLastMonthMap[empId] = monthCode;
            const endDateRaw = findColumn(row, ['end date', 'exit date', 'termination date', 'date left']);
            if (endDateRaw) {
              const parsedExit = parseDate(endDateRaw);
              if (parsedExit) employeeExplicitEndDateMap[empId] = parsedExit;
            }
          }

          let paye = parseFloat(findColumn(row, ['paye'])) || 0;
          let nssf_emp = parseFloat(findColumn(row, ['nssf (employee 5%)', 'nssf emp', 'nssf (5%)', 'nssf 5%'])) || 0;
          let nssf_empr = parseFloat(findColumn(row, ['nssf (employer 10%)', 'nssf empr', 'nssf (10%)', 'nssf 10%'])) || 0;
          let net = parseFloat(findColumn(row, ['salary ugx', 'net', 'take home'])) || 0;
          
          let totalDeductionExcel = parseFloat(findColumn(row, ['total deduction'])) || 0;
          let otherDeductions = Math.max(0, totalDeductionExcel - paye - nssf_emp);

          itemsToInsert.push({
            period_id: periodId,
            employee_id: empId,
            gross_salary: gross,
            taxable_pay: gross - nssf_emp,
            paye_amount: paye,
            nssf_employee: nssf_emp,
            nssf_employer: nssf_empr,
            leave_deduction_amount: 0,
            other_deductions: otherDeductions,
            net_pay: net,
            currency: 'UGX',
            notes: 'Imported from historical Excel sheet'
          });
        }

        // Upsert runs
        if (itemsToInsert.length > 0) {
          for (const run of itemsToInsert) {
            const { error: runErr } = await supabase
              .from('payroll_runs')
              .upsert([run], { onConflict: 'period_id,employee_id' });
            if (runErr) throw runErr;
          }
          totalImported += itemsToInsert.length;
        }
      }

      // 5. Update active/inactive status and deactivation date based on latest month imported
      let latestDate = 0;
      let latestSheet = '';
      Object.keys(previewData.sheets).forEach(sheetName => {
        const monthRegex = /(?:Payroll\s+|PAYE\s+of\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;
        const match = sheetName.match(monthRegex);
        if (match) {
          const mIndex = ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(match[1].toLowerCase()) + 1;
          const dateVal = parseInt(match[2]) * 12 + mIndex;
          if (dateVal > latestDate) {
            latestDate = dateVal;
            latestSheet = sheetName;
          }
        }
      });

      if (latestSheet) {
        const activeEmpIds = new Set<string>();
        const latestRows = previewData.sheets[latestSheet];
        const updates = [];

        for (const row of (latestRows as any[])) {
          const firstName = findColumn(row, ['first name']);
          const lastName = findColumn(row, ['last name']);
          let rawName: any;
          if (firstName || lastName) {
            rawName = `${firstName || ''} ${lastName || ''}`.trim();
          } else {
            rawName = findColumn(row, ['full name', 'name', 'employee']);
          }
          if (!rawName) continue;
          const name = String(rawName).trim();
          if (name.toUpperCase().includes('TOTAL')) continue;
          
          const searchName = name.toLowerCase();
          const newEmail = findColumn(row, ['company email', 'email'])?.toString().trim().toLowerCase();
          
          let empId = newEmail ? employeeEmailMap[newEmail] : undefined;
          if (!empId) empId = employeeMap[searchName];
          if (!empId) empId = employeeNormMap[normaliseName(name)];
          
          if (empId) {
            const explicitExit = employeeExplicitEndDateMap[empId];
            if (!explicitExit) {
              activeEmpIds.add(empId);
            }

            const rawBasic = findColumn(row, ['basic']);
            const basic = rawBasic !== undefined ? parseFloat(rawBasic) || 0 : 0;
            const rawGross = findColumn(row, ['gross salary']);
            const gross = rawGross !== undefined ? parseFloat(rawGross) || 0 : basic;
            
            const dept = findColumn(row, ['team', 'department']);
            const email = findColumn(row, ['email']);
            const position = findColumn(row, ['position', 'job title', 'role']);
            const empNo = findColumn(row, ['company id no', 'employee number', 'emp no', 'id no']);
            const phone = findColumn(row, ['phone', 'mobile']);
            const startDateRaw = findColumn(row, ['start date', 'joining date', 'hire date']);
            const startDate = parseDate(startDateRaw);

            updates.push(
              supabase.from('employees').update({
                gross_salary: gross,
                ...(dept ? { department: String(dept) } : {}),
                ...(email ? { email: String(email) } : {}),
                ...(position ? { position: String(position) } : {}),
                ...(empNo && isValidEmpNumber(empNo) ? { employee_number: String(empNo) } : {}),
                ...(phone ? { mobile_money_number: String(phone) } : {}),
                ...(startDate ? { start_date: startDate } : {})
              }).eq('id', empId)
            );
          }
        }

        if (updates.length > 0) {
          await Promise.all(updates);
        }

        const activeIdsArr = Array.from(activeEmpIds);
        const allIds = Object.values(employeeMap);
        const inactiveIdsArr = allIds.filter(id => !activeEmpIds.has(id));

        if (activeIdsArr.length > 0) {
          await supabase.from('employees').update({ status: 'active', deactivation_date: null }).in('id', activeIdsArr);
        }
        if (inactiveIdsArr.length > 0) {
          const inactiveUpdates = inactiveIdsArr.map(id => {
            const explicitExit = employeeExplicitEndDateMap[id];
            const lastMonth = employeeLastMonthMap[id];
            const exitDate = explicitExit || (lastMonth ? getEndOfMonth(lastMonth) : null);
            return supabase.from('employees').update({ 
              status: 'inactive',
              ...(exitDate ? { deactivation_date: exitDate } : {})
            }).eq('id', id);
          });
          await Promise.all(inactiveUpdates);
        }
      }

      setStatusText(`Import successfully completed! Registered ${newCount} new employee profiles and populated ${totalImported} monthly payslip records.`);
      setTimeout(() => {
        onImported();
        onClose();
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setStatusText('Failed to process Excel import: ' + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden m-4 font-sans">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/25">
          <h3 className="font-bold text-navy text-sm flex items-center gap-2">
            <Upload size={17} className="text-primary" /> Import Historical Payroll Excel
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text hover:bg-background rounded-lg cursor-pointer"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-text-muted leading-relaxed">
            Upload your master payroll spreadsheet (such as <code className="font-mono bg-background px-1 py-0.5 rounded text-navy text-[10px]">Egpro Payroll (9).xlsx</code>).
            The importer will scan month sheets, auto-register missing employees, and bulk-load historical payslip logs into the database.
          </p>

          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              id="historical-excel-file"
              className="hidden"
              disabled={loading}
            />
            <label htmlFor="historical-excel-file" className="cursor-pointer space-y-2 block">
              <Upload className="mx-auto text-text-muted w-8 h-8" />
              <div className="text-xs font-bold text-navy">
                {file ? file.name : "Click to select Excel workbook"}
              </div>
              <div className="text-[10px] text-text-muted">
                Accepts sheet months matching "January 2026", "June 2025" etc.
              </div>
            </label>
          </div>

          {statusText && (
            <div className="bg-background/40 border border-border p-3.5 rounded-lg text-xs leading-relaxed flex gap-2">
              {loading ? (
                <Clock className="text-primary w-4.5 h-4.5 animate-spin shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="text-success w-4.5 h-4.5 shrink-0 mt-0.5" />
              )}
              <span className="text-text font-medium">{statusText}</span>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 bg-background/25 flex gap-3 text-xs">
          <button
            onClick={processImport}
            disabled={!previewData || loading}
            className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg shadow hover:bg-primary/95 transition-all text-center cursor-pointer disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm & Import Data"}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-border hover:bg-background text-text font-bold rounded-lg transition-all text-center cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

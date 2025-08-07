"use client";
import React, { useMemo, useState, useEffect } from "react";
import { ShieldAlert, Server, DollarSign, Download, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const TIERS = [
  { key: "archiveVault", name: "ArchiveVault", rtoHours: 14 * 24, rpoHours: 24, blurb: "Long‑term archival. Lowest cost, highest downtime risk." },
  { key: "rapidRestore", name: "RapidRestore", rtoHours: 72, rpoHours: 4, blurb: "Faster recovery with frequent restore points." },
] as const;

const SAFEGUARD = { enabledLabel: "SafeGuard on", disabledLabel: "SafeGuard off", rtoMultiplier: 0.4, rpoMultiplier: 0.2 };

const SCENARIOS = [
  { key: "ransomware", name: "Ransomware", detectionHours: 12, description: "Encryption event halts key systems. Assume containment time before restore can begin." },
  { key: "serverLoss", name: "Server loss", detectionHours: 1, description: "Hardware failure or cloud instance loss. Assume quick detection and failover planning." },
] as const;

function currency(n: number) { return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

export default function BdrRtoRpoSimulator() {
  const [scenario, setScenario] = useState<typeof SCENARIOS[number]["key"]>("ransomware");
  const [useSafeguard, setUseSafeguard] = useState(true);
  const [downtimeCostPerHour, setDowntimeCostPerHour] = useState<number | "">(5000);
  const [peopleAffected, setPeopleAffected] = useState<number | "">(25);
  const [hourlyRate, setHourlyRate] = useState<number | "">(60);
  const [reworkFactor, setReworkFactor] = useState<number | "">(0.5);

  useEffect(()=>{ try{ const raw = localStorage.getItem("bdr-sim"); if(raw){ const v=JSON.parse(raw); setScenario(v.scenario ?? "ransomware"); setUseSafeguard(v.useSafeguard ?? true); setDowntimeCostPerHour(v.downtimeCostPerHour ?? 5000); setPeopleAffected(v.peopleAffected ?? 25); setHourlyRate(v.hourlyRate ?? 60); setReworkFactor(v.reworkFactor ?? 0.5);} }catch{} },[]);
  useEffect(()=>{ try{ localStorage.setItem("bdr-sim", JSON.stringify({ scenario, useSafeguard, downtimeCostPerHour, peopleAffected, hourlyRate, reworkFactor })); }catch{} },[scenario,useSafeguard,downtimeCostPerHour,peopleAffected,hourlyRate,reworkFactor]);

  const selScenario = SCENARIOS.find(s=>s.key===scenario)!;

  const results = useMemo(()=>{
    const dtph = typeof downtimeCostPerHour === "number" ? downtimeCostPerHour : parseFloat(String(downtimeCostPerHour));
    const ppl = typeof peopleAffected === "number" ? peopleAffected : parseInt(String(peopleAffected || 0));
    const rate = typeof hourlyRate === "number" ? hourlyRate : parseFloat(String(hourlyRate || 0));
    const rwf = typeof reworkFactor === "number" ? reworkFactor : parseFloat(String(reworkFactor || 0));

    return TIERS.map(tier=>{
      const rto = (useSafeguard ? tier.rtoHours * SAFEGUARD.rtoMultiplier : tier.rtoHours) + selScenario.detectionHours;
      const rpo = useSafeguard ? tier.rpoHours * SAFEGUARD.rpoMultiplier : tier.rpoHours;
      const downtimeHours = rto;
      const downtimeCost = (dtph || 0) * downtimeHours;
      const reworkHours = (rpo || 0) * (ppl || 0) * (rwf || 0);
      const reworkCost = reworkHours * (rate || 0);
      const total = downtimeCost + reworkCost;
      return { key:tier.key, name:tier.name, rtoHours:rto, rpoHours:rpo, downtimeHours, downtimeCost, reworkHours, reworkCost, total };
    }).sort((a,b)=>a.total-b.total);
  },[downtimeCostPerHour,peopleAffected,hourlyRate,reworkFactor,selScenario,useSafeguard]);

  const chartData = useMemo(()=> results.map(r=>({ name:r.name, Downtime: Math.round(r.downtimeCost), "Rework (RPO)": Math.round(r.reworkCost), Total: Math.round(r.total) })), [results]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center gap-3"><Sparkles className="h-6 w-6"/><h1 className="text-2xl font-semibold">BDR RPO/RTO Simulator</h1></div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm md:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><ShieldAlert className="h-5 w-5"/> Scenario</div>
          <div className="grid gap-3 md:grid-cols-2">
            {SCENARIOS.map(s => (
              <label key={s.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${scenario===s.key?"border-black":"border-gray-200"}`}>
                <input type="radio" name="scenario" className="mt-1" checked={scenario===s.key} onChange={()=>setScenario(s.key)} />
                <div><div className="font-medium">{s.name}</div><div className="text-sm text-gray-500">{s.description}</div><div className="mt-1 text-xs text-gray-500">Avg. detection: {s.detectionHours}h</div></div>
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <input id="sg" type="checkbox" checked={useSafeguard} onChange={e=>setUseSafeguard(e.target.checked)} />
            <label htmlFor="sg" className="text-sm">{useSafeguard?SAFETY.enabledLabel if False else ''}</label>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><DollarSign className="h-5 w-5"/> Business inputs</div>
          <div className="space-y-3">
            <label className="block text-sm">Cost per hour of downtime (USD)
              <input type="number" className="mt-1 w-full rounded-lg border px-3 py-2" value={downtimeCostPerHour} onChange={e=>setDowntimeCostPerHour(e.target.value===""?"":parseFloat(e.target.value))} min={0} />
            </label>
            <label className="block text-sm">People affected
              <input type="number" className="mt-1 w-full rounded-lg border px-3 py-2" value={peopleAffected} onChange={e=>setPeopleAffected(e.target.value===""?"":parseInt(e.target.value))} min={0} />
            </label>
            <label className="block text-sm">Avg. fully loaded hourly rate (USD)
              <input type="number" className="mt-1 w-full rounded-lg border px-3 py-2" value={hourlyRate} onChange={e=>setHourlyRate(e.target.value===""?"":parseFloat(e.target.value))} min={0} />
            </label>
            <label className="block text-sm">Rework factor per RPO hour (0–1)
              <input type="number" step={0.1} min={0} max={1} className="mt-1 w-full rounded-lg border px-3 py-2" value={reworkFactor} onChange={e=>setReworkFactor(e.target.value===""?"":parseFloat(e.target.value))} />
              <span className="mt-1 block text-xs text-gray-500">Example: 0.5 → each RPO hour causes half an hour of rework for each affected person.</span>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><Server className="h-5 w-5"/> Results by recovery tier</div>
        <div className="grid gap-4 md:grid-cols-2">
          {results.map(r => (
            <div key={r.key} className="rounded-xl border p-4">
              <div className="mb-1 text-sm text-gray-500">{TIERS.find(t=>t.key===r.key)?.blurb}</div>
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{r.name}</div>
                <div className="text-sm text-gray-500">{useSafeguard?"SafeGuard on":"SafeGuard off"}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-100 p-3"><div className="text-xs text-gray-500">RTO (incl. detection)</div><div className="font-medium">{Math.round(r.rtoHours)} h</div></div>
                <div className="rounded-lg bg-gray-100 p-3"><div className="text-xs text-gray-500">RPO</div><div className="font-medium">{Math.round(r.rpoHours)} h</div></div>
                <div className="rounded-lg bg-gray-100 p-3"><div className="text-xs text-gray-500">Downtime cost</div><div className="font-medium">{currency(r.downtimeCost)}</div></div>
                <div className="rounded-lg bg-gray-100 p-3"><div className="text-xs text-gray-500">Rework cost (RPO)</div><div className="font-medium">{currency(r.reworkCost)}</div></div>
                <div className="col-span-2 rounded-lg border p-3"><div className="text-xs text-gray-500">TOTAL estimated impact</div><div className="text-xl font-semibold">{currency(r.total)}</div></div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v)=>"$"+Math.round(Number(v)/1000)+"k"} />
              <Tooltip formatter={(v:number)=>currency(v)} />
              <Legend />
              <Bar dataKey="Downtime" />
              <Bar dataKey="Rework (RPO)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-600">Tip: toggle SafeGuard to show how outcomes improve. Adjust inputs to match a prospect's environment.</div>
        <div className="flex gap-2">
          <button className="rounded-lg border px-4 py-2" onClick={()=>window.print()}>
            <span className="inline-flex items-center gap-2"><Download className="h-4 w-4"/> Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

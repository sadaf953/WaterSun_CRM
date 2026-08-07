// ─── DashboardView.jsx ────────────────────────────────────────────────────────
// Metrics overview: project counts, financial summary, stage pipeline bar chart.
// • "Total" = all non-deleted records
// • "Live"  = non-deleted AND stage !== 'Completed'
// • "Completed" = stage === 'Completed' (non-deleted)
// Numbers use Indian locale (₹1,00,000)
// ──────────────────────────────────────────────────────────────────────────────

import { FolderOpen, Activity, CheckCircle2 } from 'lucide-react';
import { PRIMARY_STAGES } from '../constants';
import { formatINR, formatINRCompact, toIndianCommas } from '../utils';

const fmtLakh = formatINRCompact;

const MetricBox = ({ label, value, sub, icon: Icon, color }) => {
    const colorMap = {
        amber:   'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        blue:    'bg-blue-50 text-blue-600',
    };
    return (
        <div className="bg-white p-6 rounded-[28px] border border-stone-100 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
                <Icon size={16} />
            </div>
            <p className="text-2xl font-bold text-stone-800 tracking-tight">{value}</p>
            {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">{label}</p>
        </div>
    );
};

export default function DashboardView({ customers = [], loading }) {
    if (loading) return (
        <div className="p-20 text-center text-stone-400 font-medium italic animate-pulse">
            Calculating solar metrics...
        </div>
    );

    // Exclude soft-deleted records from all metrics
    const active = customers.filter(c => !c.deleted_at);

    const totalProjects   = active.length;
    const completedCount  = active.filter(c => c.stage === 'COMPLETED').length;
    const liveProjects    = active.filter(c => c.stage !== 'COMPLETED').length;

    // Loan vs Cash
    const loanCount = active.filter(c => c.payment_type?.trim().toUpperCase() === 'LOAN').length;
    const cashCount = active.filter(c => c.payment_type?.trim().toUpperCase() === 'CASH').length;
    const totalCategorized = loanCount + cashCount;
    const loanPerc = totalCategorized > 0 ? (loanCount / totalCategorized) * 100 : 0;
    const cashPerc = totalCategorized > 0 ? (cashCount / totalCategorized) * 100 : 0;

    // Dealers ranking
    const dealerCounts = {};
    active.forEach(c => {
        const d = c.dealer?.trim() || 'No Dealer';
        dealerCounts[d] = (dealerCounts[d] || 0) + 1;
    });
    const sortedDealers = Object.entries(dealerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const topDealersLimit = 5;
    const topDealers = sortedDealers.slice(0, topDealersLimit);
    const othersCount = sortedDealers.slice(topDealersLimit).reduce((sum, item) => sum + item.count, 0);
    if (othersCount > 0) {
        topDealers.push({ name: 'Others', count: othersCount });
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Project counts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricBox label="Total Database" value={totalProjects}  icon={FolderOpen}   color="blue"    sub={`${active.length} active records`} />
                <MetricBox label="Live Projects"  value={liveProjects}   icon={Activity}     color="amber"   sub="Excluding Completed" />
                <MetricBox label="Completed"      value={completedCount} icon={CheckCircle2} color="emerald" sub="Fully commissioned" />
            </div>

            {/* Financial & Dealer Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Loan vs Cash distribution */}
                <div className="bg-white rounded-[32px] p-8 border border-stone-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-6">Financial Structure (Loan vs Cash)</h3>
                        <div className="flex justify-between items-baseline mb-4">
                            <span className="text-2xl font-bold text-stone-800 tracking-tight">
                                {loanCount} <span className="text-xs text-stone-400 font-normal">Loans</span>
                                <span className="text-stone-300 mx-2">/</span>
                                {cashCount} <span className="text-xs text-stone-400 font-normal">Cash</span>
                            </span>
                            <span className="text-[10px] font-bold text-stone-500 uppercase">
                                {totalCategorized} Classified
                            </span>
                        </div>
                        {/* Segmented Horizontal Bar */}
                        <div className="h-4 w-full bg-stone-100 rounded-full overflow-hidden flex mb-6">
                            {loanPerc > 0 && (
                                <div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: `${loanPerc}%` }} title={`Loan: ${loanPerc.toFixed(1)}%`} />
                            )}
                            {cashPerc > 0 && (
                                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${cashPerc}%` }} title={`Cash: ${cashPerc.toFixed(1)}%`} />
                            )}
                        </div>
                    </div>
                    {/* Legend & Details */}
                    <div className="grid grid-cols-2 gap-4 border-t border-stone-50 pt-4 mt-auto">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                            <div>
                                <p className="text-[9px] font-bold text-stone-400 uppercase leading-none">LOAN PROJECTS</p>
                                <p className="text-xs font-semibold text-stone-700 mt-1">{loanCount} ({loanPerc.toFixed(0)}%)</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                            <div>
                                <p className="text-[9px] font-bold text-stone-400 uppercase leading-none">CASH PROJECTS</p>
                                <p className="text-xs font-semibold text-stone-700 mt-1">{cashCount} ({cashPerc.toFixed(0)}%)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Dealers ranking list */}
                <div className="bg-white rounded-[32px] p-8 border border-stone-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Dealer Performance (Top Volume)</h3>
                        <span className="text-[9px] font-bold text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {sortedDealers.length} Active
                        </span>
                    </div>
                    <div className="space-y-4">
                        {topDealers.length > 0 ? (
                            topDealers.map((d, index) => {
                                const perc = totalProjects > 0 ? (d.count / totalProjects) * 100 : 0;
                                const isFirst = index === 0 && d.name !== 'Others' && d.name !== 'No Dealer';
                                return (
                                    <div key={d.name} className="flex flex-col">
                                        <div className="flex justify-between text-xs font-bold text-stone-600 mb-1 tracking-tight">
                                            <span className="flex items-center gap-1.5 truncate">
                                                {isFirst && <span className="text-amber-500">🏆</span>}
                                                <span className="truncate">{d.name}</span>
                                            </span>
                                            <span className="text-stone-400">{d.count} ({perc.toFixed(0)}%)</span>
                                        </div>
                                        <div className="h-1.5 bg-stone-50 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 rounded-full ${d.name === 'Others' ? 'bg-stone-300' : 'bg-amber-400'}`}
                                                style={{ width: `${perc}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-xs text-stone-400 italic">No dealer data available.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Stage pipeline bar chart */}
            <div className="bg-white rounded-[32px] p-8 border border-stone-100 shadow-sm">
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-8">Operational Density (Stage Breakdown)</h3>
                <div className="space-y-5">
                    {PRIMARY_STAGES.map(stage => {
                        const count = active.filter(c => c.stage === stage.id).length;
                        const perc  = totalProjects > 0 ? (count / totalProjects) * 100 : 0;
                        return (
                            <div key={stage.id} className="group">
                                <div className="flex justify-between text-[10px] font-bold text-stone-600 mb-1.5 uppercase tracking-tight">
                                    <span className="group-hover:text-amber-600 transition-colors">{stage.label}</span>
                                    <span className="text-stone-400">{count}</span>
                                </div>
                                <div className="h-1.5 bg-stone-50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 rounded-full ${stage.id === 'COMPLETED' ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                        style={{ width: `${perc}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

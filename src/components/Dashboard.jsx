// ─── Dashboard.jsx ────────────────────────────────────────────────────────────
// Main admin layout: sidebar + header + view router.
// Features:
//   • Trash sidebar item + soft-delete/recover/hard-delete
//   • Global search across ALL stages (name, phone, CRN) with results overlay
//   • Stage counts exclude deleted records
//   • Sales/Operations roles share the same shell, but see SalesView's card UI
//     for the "stages" view and lose Activity Log / User Management / Trash
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { logActivity, useMetadata, exportAllToCSV } from '../utils';
import { PRIMARY_STAGES } from '../constants';

import DashboardView from './DashboardView';
import FinancialView from './FinancialView';
import CustomerCard from './CustomerCard';
import CustomerDetailModal from './CustomerDetailModal';
import AddLeadModal from './AddLeadModal';
import ActivityLogView from './ActivityLogView';
import UserManagementView from './UserManagementView';
import TrashView from './TrashView';
import AgentForm from './agentform';

import {
    LayoutDashboard, IndianRupee, Activity, UserCog, Menu, X,
    Search, Plus, Download, LogOut, Sun, Trash2, Users,
} from 'lucide-react';

export default function Dashboard({ user, onLogout }) {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedStage, setSelectedStage] = useState('Leads');
    const [stageSearch, setStageSearch] = useState('');    // per-stage search
    const [pocFilterInput, setPocFilterInput] = useState('');  // typed poc name (not yet applied)
    const [pocFilter, setPocFilter] = useState('');    // applied poc filter
    const [showPocDrop, setShowPocDrop] = useState(false);
    const pocFilterRef = useRef(null);
    const [globalSearch, setGlobalSearch] = useState('');    // global search
    const [globalResults, setGlobalResults] = useState([]);
    const [showGlobalDrop, setShowGlobalDrop] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showAddLead, setShowAddLead] = useState(false);
    const globalSearchRef = useRef(null);
    const meta = useMetadata();

    // ── Data fetching ──────────────────────────────────────────────────────────
    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('admin').select('*').order('created_at', { ascending: false });
        if (!error) setCustomers(data || []);
        else console.error('Fetch error:', error);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('admin_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'admin' }, fetchData)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    // Close global search / poc dropdowns when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (globalSearchRef.current && !globalSearchRef.current.contains(e.target)) {
                setShowGlobalDrop(false);
            }
            if (pocFilterRef.current && !pocFilterRef.current.contains(e.target)) {
                setShowPocDrop(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Global search: across ALL non-deleted stages (respects poc filter) ─────
    useEffect(() => {
        const q = globalSearch.trim().toLowerCase();
        if (!q) { setGlobalResults([]); setShowGlobalDrop(false); return; }
        const activeNow = customers.filter(c => !c.deleted_at);
        const pocMatched = pocFilter
            ? activeNow.filter(c => c.poc?.toLowerCase() === pocFilter.toLowerCase())
            : activeNow;
        const authorized = user.userType === 'admin'
            ? pocMatched
            : pocMatched.filter(c => c.poc === user.name);
        const results = authorized.filter(c =>
            c.customer_name?.toLowerCase().includes(q) ||
            c.phone?.includes(globalSearch.trim()) ||
            c.crn?.toLowerCase().includes(q)
        ).slice(0, 8);
        setGlobalResults(results);
        setShowGlobalDrop(results.length > 0);
    }, [globalSearch, customers, pocFilter]);

    const handleGlobalSelect = (customer) => {
        // Navigate to the customer's stage so context is clear
        setCurrentView('stages');
        setSelectedStage(customer.stage || 'Leads');
        setStageSearch('');
        // Open the detail modal
        setSelectedCustomer(customer);
        setGlobalSearch('');
        setShowGlobalDrop(false);
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const handleUpdateCustomer = async (id, updates) => {
        const { error } = await supabase.from('admin').update(updates).eq('id', id);
        if (!error) {
            setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            if (selectedCustomer?.id === id) setSelectedCustomer(prev => ({ ...prev, ...updates }));
        }
    };

    // Soft-delete: sets deleted_at, never removes from DB
    const handleSoftDelete = async (id, deletedAt) => {
        const ts = deletedAt || new Date().toISOString();
        await supabase.from('admin').update({ deleted_at: ts }).eq('id', id);
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, deleted_at: ts } : c));
        setSelectedCustomer(null);
    };

    // Recover from trash
    const handleRecover = async (id) => {
        await supabase.from('admin').update({ deleted_at: null }).eq('id', id);
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, deleted_at: null } : c));
        logActivity(user.id, 'update', `Recovered customer from trash`, id);
    };

    // Hard-delete: permanent, admin only
    const handleHardDelete = async (id) => {
        const c = customers.find(x => x.id === id);
        await logActivity(user.id, 'delete', `Permanently deleted: ${c?.customer_name}`, id);
        await supabase.from('admin').delete().eq('id', id);
        setCustomers(prev => prev.filter(c => c.id !== id));
    };

    const handleMoveStage = async (id, newStage) => {
        const customer = customers.find(c => c.id === id);
        await handleUpdateCustomer(id, { stage: newStage });
        logActivity(user.id, 'stage_change',
            `${customer?.customer_name}: Moved to ${PRIMARY_STAGES.find(s => s.id === newStage)?.label || newStage}`
        );
    };

    const handleAddLead = async (data) => {
        const leadData = { ...data, application_done_by: user.name, created_at: new Date().toISOString() };
        const { error } = await supabase.from('admin').insert(leadData).select().single();
        if (!error) {
            logActivity(user.id, 'create', `Added new lead: ${data.customer_name}`, `Done by: ${user.name}`);
            setShowAddLead(false);
            fetchData();
        }
    };

    // ── Derived data (active = non-deleted only) ───────────────────────────────
    const active = customers.filter(c => !c.deleted_at);
    const trashed = customers.filter(c => !!c.deleted_at);
    // TEMP: poc-based filtering disabled per Hawk's request — every lead shows
    // up for every role right now. Revisit this once poc-matching is sorted.
    const isAuthorized = (c) => true;

    // Distinct POC names across all active leads, for the typeahead dropdown
    const uniquePocs = [...new Set(active.map(c => c.poc).filter(Boolean))].sort();
    const pocSuggestions = pocFilterInput.trim()
        ? uniquePocs.filter(p => p.toLowerCase().includes(pocFilterInput.trim().toLowerCase()))
        : uniquePocs;

    const matchesPocFilter = (c) => !pocFilter || c.poc?.toLowerCase() === pocFilter.toLowerCase();

    // Everything downstream — stage counts, the stages grid, dashboard stats,
    // financial tags — is built from this one poc-scoped list
    const pocScoped = active.filter(c => matchesPocFilter(c) && isAuthorized(c));

    const stageCounts = PRIMARY_STAGES.reduce((acc, s) => {
        acc[s.id] = pocScoped.filter(c => c.stage === s.id).length;
        return acc;
    }, {});
    const financialTagCount = pocScoped.filter(c => c.financial_tag).length;
    const trashCount = trashed.length;

    // Per-stage filtered cards — now respects the poc filter too
    const filtered = pocScoped.filter(c => {
        const q = stageSearch.toLowerCase();
        const matchesSearch = !stageSearch ||
            c.customer_name?.toLowerCase().includes(q) ||
            c.phone?.includes(stageSearch) ||
            c.crn?.toLowerCase().includes(q);
        return c.stage === selectedStage && matchesSearch;
    });

    // ── Nav button helper ─────────────────────────────────────────────────────
    const NavBtn = ({ view, stage, icon: Icon, label, count, redBadge }) => {
        const isActive = view === 'stages'
            ? (currentView === 'stages' && selectedStage === stage)
            : currentView === view;
        return (
            <button
                onClick={() => {
                    if (view === 'stages') { setCurrentView('stages'); setSelectedStage(stage); }
                    else setCurrentView(view);
                    setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold mb-0.5 transition-colors ${isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">{label}</span>
                {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-bold ${isActive ? 'bg-white/20 text-white' : redBadge ? 'bg-red-100 text-red-500' : 'bg-stone-100 text-stone-500'}`}>
                        {count}
                    </span>
                )}
            </button>
        );
    };

    // ── Role-based routing (agent only — sales/operations now share this shell) ─
    if (user.userType === 'agent') return <AgentForm user={user} onLogout={onLogout} />;

    const headerTitle =
        currentView === 'dashboard' ? 'Business Dashboard'
            : currentView === 'financial' ? 'Financial Tags'
                : currentView === 'activity' ? 'Activity Log'
                    : currentView === 'users' ? 'User Management'
                        : currentView === 'trash' ? 'Trash'
                            : PRIMARY_STAGES.find(s => s.id === selectedStage)?.label || selectedStage;

    return (
        <div className="min-h-screen bg-[#FCFBFA] flex">
            {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* ── Sidebar ── */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-100 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 border-b border-stone-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                            <Sun size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-stone-800">SolarFlow</h1>
                            <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Portal</p>
                        </div>
                    </div>
                    <button className="lg:hidden text-stone-400" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    <NavBtn view="dashboard" icon={LayoutDashboard} label="Dashboard" count={0} />

                    {/* Financial */}
                    <div className="mt-4 mb-1">
                        <div className="text-[9px] uppercase font-bold text-stone-300 px-3 pb-2 tracking-widest">Financial</div>
                        <button onClick={() => { setCurrentView('financial'); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold mb-0.5 transition-colors ${currentView === 'financial' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                            <IndianRupee className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 text-left">Financial Tags</span>
                            {financialTagCount > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-bold ${currentView === 'financial' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}>
                                    {financialTagCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Project Stages — identical for every role */}
                    <div className="text-[9px] uppercase font-bold text-stone-300 px-3 pt-4 pb-2 tracking-widest">Project Stages</div>
                    {PRIMARY_STAGES.map(s => (
                        <NavBtn key={s.id} view="stages" stage={s.id} icon={s.icon} label={s.label} count={stageCounts[s.id] || 0} />
                    ))}

                    {/* System — admin only */}
                    {user.userType === 'admin' && (
                        <>
                            <div className="text-[9px] uppercase font-bold text-stone-300 px-3 pt-5 pb-2 tracking-widest">System</div>
                            <NavBtn view="activity" icon={Activity} label="Activity Log" count={0} />
                            <NavBtn view="users" icon={UserCog} label="User Management" count={0} />
                            <NavBtn view="trash" icon={Trash2} label="Trash" count={trashCount} redBadge />
                        </>
                    )}
                </div>

                {/* User + Logout */}
                <div className="p-3 border-t border-stone-100">
                    <div className="flex items-center gap-3 px-3 py-2 mb-1">
                        <div className="w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'A'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-stone-700 truncate">{user.name}</p>
                            <p className="text-[9px] text-stone-400">{user.role}</p>
                        </div>
                    </div>
                    <button onClick={onLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors">
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white/90 backdrop-blur-md border-b border-stone-100 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-stone-500"><Menu className="w-6 h-6" /></button>
                        <h2 className="font-bold text-stone-800">{headerTitle}</h2>
                        {currentView === 'financial' && financialTagCount > 0 && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{financialTagCount} tagged</span>
                        )}
                        {pocFilter && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">POC: {pocFilter}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* ── Global search (always visible) ── */}
                        <div className="relative" ref={globalSearchRef}>
                            <Search className="absolute left-3 top-2.5 text-stone-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search all stages..."
                                value={globalSearch}
                                onChange={e => setGlobalSearch(e.target.value)}
                                onFocus={() => globalResults.length > 0 && setShowGlobalDrop(true)}
                                className="pl-9 pr-4 py-2 bg-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 w-40 lg:w-60"
                            />
                            {/* Results dropdown */}
                            {showGlobalDrop && (
                                <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-2xl shadow-xl border border-stone-100 py-1 z-50 overflow-hidden">
                                    {globalResults.map(c => (
                                        <button key={c.id} onClick={() => handleGlobalSelect(c)}
                                            className="w-full px-4 py-2.5 text-left hover:bg-amber-50 transition-colors group">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-stone-800 group-hover:text-amber-700">{c.customer_name}</p>
                                                <span className="text-[9px] bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded font-bold uppercase ml-2">{c.crn || '–'}</span>
                                            </div>
                                            <p className="text-[10px] text-stone-400 mt-0.5">
                                                {PRIMARY_STAGES.find(s => s.id === c.stage)?.label || c.stage} · {c.phone || 'No phone'}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Per-stage search (only in stages view) */}
                        {currentView === 'stages' && (
                            <div className="relative hidden lg:block">
                                <Search className="absolute left-3 top-2.5 text-stone-400 w-4 h-4" />
                                <input type="text" placeholder="Filter this stage..." value={stageSearch}
                                    onChange={e => setStageSearch(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 w-40" />
                            </div>
                        )}

                        {/* POC filter — applies everywhere: dashboard stats, financial, and every stage */}
                        <div className="relative hidden lg:flex items-center gap-1.5" ref={pocFilterRef}>
                            <input
                                type="text"
                                placeholder="POC name..."
                                value={pocFilterInput}
                                onChange={e => { setPocFilterInput(e.target.value); setShowPocDrop(true); }}
                                onFocus={() => setShowPocDrop(true)}
                                onKeyDown={e => e.key === 'Enter' && (setPocFilter(pocFilterInput.trim()), setShowPocDrop(false))}
                                className="px-3 py-2 bg-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 w-32"
                            />
                            <button
                                onClick={() => {
                                    setPocFilter(pocFilterInput.trim());
                                    setShowPocDrop(false);
                                }}
                                className="px-3 py-2 rounded-xl text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors">
                                Apply
                            </button>
                            {(pocFilter || pocFilterInput) && (
                                <button
                                    onClick={() => {
                                        setPocFilter('');
                                        setPocFilterInput('');
                                        setShowPocDrop(false);
                                    }}
                                    className="px-3 py-2 rounded-xl text-xs font-medium bg-stone-200 text-stone-700 hover:bg-stone-300 transition-colors">
                                    Clear
                                </button>
                            )}

                            {/* Typeahead suggestions */}
                            {showPocDrop && pocSuggestions.length > 0 && (
                                <div className="absolute top-full mt-1 left-0 w-32 bg-white rounded-xl shadow-xl border border-stone-100 py-1 z-50 overflow-hidden max-h-48 overflow-y-auto">
                                    {pocSuggestions.map(name => (
                                        <button
                                            key={name}
                                            onClick={() => { setPocFilterInput(name); setShowPocDrop(false); }}
                                            className="w-full px-3 py-1.5 text-left text-xs text-stone-700 hover:bg-amber-50 hover:text-amber-700 transition-colors truncate">
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {user.userType === 'admin' && (
                            <>
                                <button onClick={() => exportAllToCSV(active)}
                                    className="flex items-center gap-1.5 border border-stone-200 text-stone-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors">
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline text-xs">Export</span>
                                </button>
                                <button onClick={() => setShowAddLead(true)}
                                    className="flex items-center gap-1.5 bg-stone-900 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors">
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline text-xs">Add Lead</span>
                                </button>
                            </>
                        )}
                    </div>
                </header>

                {/* View router */}
                <div className="flex-1 p-4 lg:p-6">
                    {currentView === 'dashboard' && <DashboardView customers={pocScoped} loading={loading} />}
                    {currentView === 'financial' && <FinancialView customers={pocScoped} onSelectCustomer={setSelectedCustomer} />}
                    {currentView === 'activity' && user.userType === 'admin' && <ActivityLogView />}
                    {currentView === 'users' && user.userType === 'admin' && <UserManagementView currentUser={user} />}

                    {/* Trash view — admin only */}
                    {currentView === 'trash' && user.userType === 'admin' && (
                        <TrashView
                            trashedCustomers={trashed}
                            onRecover={handleRecover}
                            onHardDelete={handleHardDelete}
                            isAdmin={user.userType === 'admin'}
                        />
                    )}

                    {/* Stage grid — identical for every role */}
                    {currentView === 'stages' && (
                        loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="w-8 h-8 border-4 border-stone-900 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filtered.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filtered.map(c => (
                                    <CustomerCard key={c.id} customer={c} onSelect={setSelectedCustomer} onMoveStage={handleMoveStage} isAdmin={user.userType === 'admin'} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
                                <Users className="w-12 h-12 mb-3 text-stone-200" />
                                <p className="font-medium text-stone-500">{(stageSearch || pocFilter) ? 'No matching results in this stage' : 'No customers in this stage'}</p>
                                <p className="text-sm mt-1">{pocFilter ? `No leads with POC "${pocFilter}" here` : stageSearch ? 'Try the global search bar to find across all stages' : 'Move customers here or add a new lead'}</p>
                            </div>
                        )
                    )}
                </div>
            </main>

            {/* Modals */}
            {selectedCustomer && (
                <CustomerDetailModal
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                    onUpdate={handleUpdateCustomer}
                    onDelete={handleSoftDelete}
                    user={user}
                    meta={meta}
                />
            )}
            {showAddLead && <AddLeadModal onClose={() => setShowAddLead(false)} onSave={handleAddLead} meta={meta} />}
        </div>
    );
}
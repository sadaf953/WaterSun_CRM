// ─── Dashboard.jsx ────────────────────────────────────────────────────────────
// Main admin layout: sidebar + header + view router.
// Data fetching and CRUD handlers all live here; components are dumb receivers.
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { logActivity, useMetadata, exportAllToCSV } from '../utils';
import { PRIMARY_STAGES } from '../constants';

import DashboardView      from './DashboardView';
import FinancialView      from './FinancialView';
import CustomerCard       from './CustomerCard';
import CustomerDetailModal from './CustomerDetailModal';
import AddLeadModal       from './AddLeadModal';
import ActivityLogView    from './ActivityLogView';
import UserManagementView from './UserManagementView';
import AgentForm          from './agentform';
import SalesView          from './salesview';

import {
    LayoutDashboard, IndianRupee, Activity, UserCog, Menu, X,
    Search, Plus, Download, LogOut, Sun,
} from 'lucide-react';

export default function Dashboard({ user, onLogout }) {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedStage, setSelectedStage] = useState('Leads');
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showAddLead, setShowAddLead] = useState(false);
    const meta = useMetadata();

    // ── Data fetching ──────────────────────────────────────────────────────────
    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('admin').select('*').order('created_at', { ascending: false });
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

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const handleUpdateCustomer = async (id, updates) => {
        const { error } = await supabase.from('admin').update(updates).eq('id', id);
        if (!error) {
            setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            if (selectedCustomer?.id === id) setSelectedCustomer(prev => ({ ...prev, ...updates }));
        }
    };

    const handleDeleteCustomer = async (id) => {
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

    // ── Derived data ──────────────────────────────────────────────────────────
    const stageCounts = PRIMARY_STAGES.reduce((acc, s) => {
        acc[s.id] = customers.filter(c => c.stage === s.id).length;
        return acc;
    }, {});
    const financialTagCount = customers.filter(c => c.financial_tag).length;

    const filtered = customers.filter(c => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            c.customer_name?.toLowerCase().includes(searchLower) ||
            c.phone?.includes(searchQuery) ||
            c.crn?.toLowerCase().includes(searchLower);
        const matchesStage = c.stage === selectedStage;
        const isAuthorized = user.userType === 'admin' || c.poc === user.name;
        return matchesStage && matchesSearch && isAuthorized;
    });

    // ── Nav button helper ─────────────────────────────────────────────────────
    const NavBtn = ({ view, stage, icon: Icon, label, count, badgeDot }) => {
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
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>{count}</span>
                )}
                {badgeDot && count === 0 && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
            </button>
        );
    };

    // ── Role-based routing ────────────────────────────────────────────────────
    if (user.userType === 'agent') return <AgentForm user={user} onLogout={onLogout} />;
    if (user.userType === 'sales') return <SalesView customers={customers} loading={loading} user={user} onUpdate={handleMoveStage} />;

    const headerTitle =
        currentView === 'dashboard' ? 'Business Dashboard'
        : currentView === 'financial' ? 'Financial Tags'
        : currentView === 'activity' ? 'Activity Log'
        : currentView === 'users'    ? 'User Management'
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
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${currentView === 'financial' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}>{financialTagCount}</span>
                            )}
                        </button>
                    </div>

                    {/* Stages */}
                    <div className="text-[9px] uppercase font-bold text-stone-300 px-3 pt-4 pb-2 tracking-widest">Project Stages</div>
                    {PRIMARY_STAGES.map(s => (
                        <NavBtn key={s.id} view="stages" stage={s.id} icon={s.icon} label={s.label} count={stageCounts[s.id] || 0} />
                    ))}

                    {/* System */}
                    <div className="text-[9px] uppercase font-bold text-stone-300 px-3 pt-5 pb-2 tracking-widest">System</div>
                    <NavBtn view="activity" icon={Activity} label="Activity Log" count={0} />
                    {user.userType === 'admin' && (
                        <NavBtn view="users" icon={UserCog} label="User Management" count={0} />
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
                    </div>
                    <div className="flex items-center gap-2">
                        {currentView === 'stages' && (
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-stone-400 w-4 h-4" />
                                <input type="text" placeholder="Search name, phone, CRN..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 w-40 lg:w-56" />
                            </div>
                        )}
                        {user.userType === 'admin' && (
                            <>
                                <button onClick={() => exportAllToCSV(customers)}
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
                    {currentView === 'dashboard'  && <DashboardView customers={customers} loading={loading} />}
                    {currentView === 'financial'  && <FinancialView customers={customers} onSelectCustomer={setSelectedCustomer} />}
                    {currentView === 'activity'   && <ActivityLogView />}
                    {currentView === 'users' && user.userType === 'admin' && <UserManagementView currentUser={user} />}
                    {currentView === 'stages' && (
                        loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="w-8 h-8 border-4 border-stone-900 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filtered.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filtered.map(c => (
                                    <CustomerCard key={c.id} customer={c} onSelect={setSelectedCustomer} onMoveStage={handleMoveStage} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
                                <p className="font-medium text-stone-500">{searchQuery ? 'No matching results' : 'No customers in this stage'}</p>
                                <p className="text-sm mt-1">{searchQuery ? 'Try a different search' : 'Move customers here or add a new lead'}</p>
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
                    onDelete={handleDeleteCustomer}
                    user={user}
                    meta={meta}
                />
            )}
            {showAddLead && <AddLeadModal onClose={() => setShowAddLead(false)} onSave={handleAddLead} meta={meta} />}
        </div>
    );
}

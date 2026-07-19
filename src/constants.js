// ─── constants.js ─────────────────────────────────────────────────────────────
// CLIENT CONFIGURATION — edit this file when switching clients or customizing
// pipeline stages, financial tags, and colour mappings.
// ──────────────────────────────────────────────────────────────────────────────

import {
    Users, Clock, Package, Wrench, FileText, Send, Gauge,
    CheckCircle2, MapPin, Zap, ClipboardCheck, Banknote, CreditCard,
} from 'lucide-react';

// ─── Primary Pipeline Stages ─────────────────────────────────────────────────
// IMPORTANT: id must match the value stored in the DB exactly (Title Case here)
export const PRIMARY_STAGES = [
    { id: 'Leads',                  label: 'Leads',                      icon: Users },
    { id: 'Pending Loans',          label: 'Pending Loans/Advances',     icon: Clock },
    { id: 'Material Procurement',   label: 'Material Procurement',       icon: Package },
    { id: 'Pending Installation',   label: 'Pending Installation',       icon: Wrench },
    { id: 'Post Installation Docs', label: 'Post-Installation Docs',     icon: FileText },
    { id: 'Pending DISCOM',         label: 'DISCOM Submissions',         icon: Send },
    { id: 'Meter Installation',     label: 'Meter Installation',         icon: Gauge },
    { id: 'System Commissioning',   label: 'System Commissioning',       icon: Zap },
    { id: 'Meter Flag',             label: 'Meter Flag',                 icon: MapPin },
    { id: 'DISCOM Inspection',      label: 'DISCOM Inspection',          icon: ClipboardCheck },
    { id: 'Completed',              label: 'Completed',                  icon: CheckCircle2 },
];

// ─── Financial Tags ───────────────────────────────────────────────────────────
// These are applied as a single tag on a customer (not multi-select)
export const FINANCIAL_TAGS = [
    { id: 'Subsidy Redeems Pending',      label: 'Subsidy Redeems Pending',      icon: Banknote },
    { id: 'Subsidy Disbursement Pending', label: 'Subsidy Disbursement Pending', icon: Banknote },
    { id: '2nd Payment',                  label: '2nd Payment',                  icon: CreditCard },
    { id: '3rd Payment',                  label: '3rd Payment',                  icon: CreditCard },
    { id: 'Pending Cheque',               label: 'Pending Cheque',               icon: Clock },
    { id: 'Received Cheque',              label: 'Received Cheque',              icon: CheckCircle2 },
];

// ─── Stage Colour Themes ──────────────────────────────────────────────────────
// Tailwind classes: background + text + border
export const STAGE_THEMES = {
    'Leads':                  'bg-amber-50 text-amber-700 border-amber-200',
    'Pending Loans':          'bg-orange-50 text-orange-700 border-orange-200',
    'Pending Installation':   'bg-yellow-50 text-yellow-800 border-yellow-200',
    'Completed':              'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Subsidy Redeems Pending':      'bg-rose-50 text-rose-700 border-rose-200',
    '2nd Payment':            'bg-blue-50 text-blue-700 border-blue-200',
    '3rd Payment':            'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Subsidy Disbursement Pending': 'bg-lime-50 text-lime-700 border-lime-200',
    'Pending Cheque':         'bg-gray-50 text-gray-700 border-gray-200',
    'Received Cheque':        'bg-slate-50 text-slate-700 border-slate-200',
};

// ─── Financial Tag Colour Objects ─────────────────────────────────────────────
// Used to decorate tag pills (bg, text, border, dot)
export const FINANCIAL_TAG_COLORS = {
    'Subsidy Redeems Pending':      { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   dot: 'bg-rose-400' },
    'Subsidy Disbursement Pending': { bg: 'bg-lime-50',   text: 'text-lime-700',   border: 'border-lime-200',   dot: 'bg-lime-400' },
    '2nd Payment':                  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400' },
    '3rd Payment':                  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-400' },
    'Pending Cheque':               { bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-200',   dot: 'bg-gray-400' },
    'Received Cheque':              { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-400' },
};

// ─── User Access Levels ───────────────────────────────────────────────────────
export const USER_TYPE_OPTIONS = ['admin', 'sales', 'agent'];
export const ROLE_OPTIONS = ['Manager', 'Sales Executive', 'Field Agent', 'Operations', 'Finance'];

// ─── Supabase metadata categories ────────────────────────────────────────────
// Keys must match the 'category' values in the Supabase 'metadata' table
export const META_CATEGORIES = ['company_branch', 'poc', 'project_type', 'payment_type', 'vendor', 'meter_category', 'discom_division', 'bank_name'];

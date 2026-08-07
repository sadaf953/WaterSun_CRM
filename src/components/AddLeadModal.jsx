// src/components/AddLeadModal.jsx  —  Watersun Electrical Solutions Pvt Ltd
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '../supabase';
import { DEFAULT_LEAD_FORM, DEFAULT_PROJECT_CHECKLIST } from '../models';

// Metadata select component that supports adding a new option dynamically
function AddLeadMetaSelect({ label, field, value, onChange, category, options = [] }) {
    const [adding, setAdding] = useState(false);
    const [newVal, setNewVal] = useState('');
    const [localOptions, setLocalOptions] = useState(options);

    useEffect(() => {
        setLocalOptions(options);
    }, [options.length]);

    const handleAdd = async () => {
        const trimmed = newVal.trim();
        if (!trimmed) return;
        // Persist to Supabase metadata table
        await supabase.from('metadata').insert({ category, label: trimmed });
        setLocalOptions(prev => [...prev, trimmed]);
        onChange(field, trimmed);
        setNewVal('');
        setAdding(false);
    };

    if (adding) {
        return (
            <div className="space-y-1 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">{label} — New</label>
                <div className="flex gap-1.5">
                    <input autoFocus value={newVal} onChange={e => setNewVal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder={`New ${label}...`}
                        className="flex-1 bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-sm focus:border-amber-400 outline-none transition" />
                    <button type="button" onClick={handleAdd} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-xs font-bold transition">Add</button>
                    <button type="button" onClick={() => setAdding(false)} className="px-2 py-1.5 bg-stone-200 text-stone-600 rounded-lg text-xs hover:bg-stone-300 transition">✕</button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">{label}</label>
            <div className="flex gap-1.5">
                <select value={value || ''} onChange={e => onChange(field, e.target.value)}
                    className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none transition">
                    <option value="">Select {label}</option>
                    {localOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {category === 'module_brand' && (
                    <button type="button" onClick={() => setAdding(true)} title="Add new option"
                        className="px-3 py-2 bg-stone-100 hover:bg-amber-50 hover:text-amber-600 text-stone-400 rounded-xl text-xs transition border border-stone-200 flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default function AddLeadModal({ isOpen, onClose, onSave, meta = {} }) {
    const [formData, setFormData] = useState({ ...DEFAULT_LEAD_FORM });

    useEffect(() => {
        if (isOpen) setFormData({ ...DEFAULT_LEAD_FORM });
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!formData.customer_name?.trim()) return alert('Customer Name is required');
        if (!formData.phone_number?.toString().trim()) return alert('Customer Phone Number is required');
        if (!formData.dealer?.trim()) return alert('Dealer Name is required');
        if (!formData.system_capacity_kwp) return alert('System Capacity is required');

        onSave({
            ...formData,
            project_checklist: DEFAULT_PROJECT_CHECKLIST,
        });
        onClose();
    };

    // Explicit order list of fields to display
    const formFields = [
        { label: 'Customer Name', field: 'customer_name', type: 'text', required: true },
        { label: 'Customer Phone Number', field: 'phone_number', type: 'number', required: true },
        { label: 'Email Address', field: 'email_address', type: 'text', required: false },
        { label: 'Sub Dealer Name', field: 'sub_dealer', type: 'text', required: false },
        { label: 'Dealer Name', field: 'dealer', type: 'text', required: true },
        { label: 'Consumer No', field: 'consumer_no', type: 'text', required: false },
        { label: 'System Capacity (kWp)', field: 'system_capacity_kwp', type: 'number', required: true },
        { label: 'System Brand', field: 'module_brand', type: 'select', category: 'module_brand', required: false },
        { label: 'Village', field: 'villages', type: 'text', required: false },
        { label: 'Sub Division', field: 'sub_divisions', type: 'text', required: false },
        { label: 'File No', field: 'folder_no', type: 'text', required: false },
        { label: 'Payment Type', field: 'payment_type', type: 'select', category: 'payment_type', required: false },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4">
                <div className="flex items-center justify-between p-5 border-b border-stone-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                    <h2 className="text-base font-black text-stone-800">Add New Lead</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg transition cursor-pointer">
                        <X className="w-4 h-4 text-stone-400" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {formFields.map(({ label, field, type, required, category }) => {
                            if (type === 'select') {
                                return (
                                    <div key={field}>
                                        <AddLeadMetaSelect
                                            label={label}
                                            field={field}
                                            value={formData[field]}
                                            onChange={handleChange}
                                            category={category}
                                            options={meta[category] || []}
                                        />
                                    </div>
                                );
                            }

                            return (
                                <div key={field}>
                                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                                        {label} {required && <span className="text-red-500 font-bold">*</span>}
                                    </label>
                                    <input
                                        type={type}
                                        value={formData[field] ?? ''}
                                        onChange={e => handleChange(field, e.target.value)}
                                        className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-400 outline-none transition"
                                        placeholder={label}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex gap-2 p-5 border-t border-stone-100 sticky bottom-0 bg-white rounded-b-2xl">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 text-xs font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer">
                        Cancel
                    </button>
                    <button onClick={handleSave}
                        className="flex-1 py-2.5 text-xs font-black text-white bg-amber-500 hover:bg-amber-400 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Add Lead
                    </button>
                </div>
            </div>
        </div>
    );
}

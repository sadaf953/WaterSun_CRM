// ─── models.jsx ───────────────────────────────────────────────────────────────
// Data shapes, default values, and the normalizeChecklist helper.
// CLIENT CUSTOMISATION: edit DEFAULT_PROJECT_CHECKLIST to change the workflow.
// ──────────────────────────────────────────────────────────────────────────────

// ─── Project Management Checklist Template ────────────────────────────────────
export const DEFAULT_PROJECT_CHECKLIST = [
    // Pre-Installation
    { id: 'kyc_docs',       label: 'KYC Docs and Docs from PM Suryaghar Mufti Bijili Yojana portal and Digital approval from Janasamarth site', section: 'Pre-Installation',                checked: false },
    { id: 'docs_sent_bank', label: 'Docs sent to the bank',                                                                                      section: 'Pre-Installation',                checked: false },

    // Post Installation Documentation
    { id: 'serial_numbers',           label: 'Serial numbers received',                                           section: 'Post Installation Documentation', checked: false },
    { id: 'agreement_article7',       label: 'Agreement on Article-7 100rs stamp',                                section: 'Post Installation Documentation', checked: false },
    { id: 'signed_agreement',         label: 'Signed Agreement',                                                  section: 'Post Installation Documentation', checked: false },
    { id: 'self_declaration',         label: 'Self Declaration',                                                  section: 'Post Installation Documentation', checked: false },
    { id: 'work_completion_portal',   label: 'Work Completion from PM Surya Ghar portal',                         section: 'Post Installation Documentation', checked: false },
    { id: 'geo_tag_photos',           label: 'Geo-Tag Photos of the site',                                        section: 'Post Installation Documentation', checked: false },
    { id: 'dcr_certificate',          label: 'DCR Certificate',                                                   section: 'Post Installation Documentation', checked: false },
    { id: 'panel_inverter_warranty',  label: 'Panel and Inverter Warranty',                                       section: 'Post Installation Documentation', checked: false },
    { id: 'undertaking_declaration',  label: 'Undertaking/Self-Declaration',                                      section: 'Post Installation Documentation', checked: false },
    { id: 'work_completion_report',   label: 'Work Completion report',                                            section: 'Post Installation Documentation', checked: false },
    { id: 'net_metering_request',     label: 'Net-Metering service request from DISCOM website',                  section: 'Post Installation Documentation', checked: false },
    { id: 'discom_charges_slip',      label: 'Pay Estimated and Demand charges slip from DISCOM website',         section: 'Post Installation Documentation', checked: false },
    { id: 'application_form_annexure',label: 'Application Form [Annexure-1 / Net-Meter Application Form]',       section: 'Post Installation Documentation', checked: false },

    // Post Net-Meter Application
    { id: 'submit_docs_discom',    label: 'Submitting the documents at DISCOM',                section: 'Post Net-Meter Application', checked: false },
    { id: 'net_meter_installation',label: 'Net-Meter Installation',                             section: 'Post Net-Meter Application', checked: false },
    { id: 'discom_inspection_item',label: 'DISCOM Inspection & Project Commissioning',          section: 'Post Net-Meter Application', checked: false },
    { id: 'subsidy_redeem',        label: "Subsidy Redeem from the Customer's login",           section: 'Post Net-Meter Application', checked: false },
    { id: 'subsidy_disbursed',     label: 'Subsidy Disbursed',                                  section: 'Post Net-Meter Application', checked: false },
    { id: 'all_payments_cleared',  label: 'All payments cleared',                               section: 'Post Net-Meter Application', checked: false },
    { id: 'warranty_service_card', label: 'Warranty and service card',                          section: 'Post Net-Meter Application', checked: false },
];

// ─── normalizeChecklist ───────────────────────────────────────────────────────
// Merges the stored checklist (from DB) with the template.
// • If the DB has extra items not in the template, they are appended.
// • If template has new items not in DB, they appear with checked: false.
export function normalizeChecklist(rawChecklist) {
    let storedChecklist = [];
    if (Array.isArray(rawChecklist)) {
        storedChecklist = rawChecklist;
    } else if (typeof rawChecklist === 'string') {
        try {
            const parsed = JSON.parse(rawChecklist);
            if (Array.isArray(parsed)) storedChecklist = parsed;
        } catch (e) {
            storedChecklist = [];
        }
    }

    const storedById = Object.fromEntries(storedChecklist.map(item => [item.id, item]));
    const merged = DEFAULT_PROJECT_CHECKLIST.map(item => ({
        ...item,
        ...storedById[item.id],
        checked: storedById[item.id]?.checked || false,
        checkedAt: storedById[item.id]?.checkedAt || null,
        checkedBy: storedById[item.id]?.checkedBy || null,
    }));

    const extra = storedChecklist.filter(item => !DEFAULT_PROJECT_CHECKLIST.some(def => def.id === item.id));
    return [...merged, ...extra];
}

// ─── Default New Lead Shape ───────────────────────────────────────────────────
// Used in AddLeadModal to initialise the form.
export const DEFAULT_LEAD_FORM = {
    customer_name: '',
    phone: '',
    email: '',
    location: '',
    company_branch: '',
    capacity_kwp: '',
    project_type: 'On-Grid',
    poc: '',
    quoted_amount: '',
    stage: 'Leads',
};

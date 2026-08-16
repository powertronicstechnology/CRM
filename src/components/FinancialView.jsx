import { useState } from 'react';
import { Tag } from 'lucide-react';
import { FINANCIAL_TAGS, FINANCIAL_TAG_COLORS } from '../constants';
import { formatIndianCurrency } from '../utils';

const GENERAL_TAGS_LIST = [
    "Initial",
    "Installation",
    "Final payment"
];

const PM_SURYA_TAGS_LIST = [
    "Registration payment 20k",
    "Installation payment",
    "Quotation amount",
    "Final payment after meter installation"
];

export default function FinancialView({
    customers,
    onSelectCustomer,
    projectType = 'General'
}) {
    const [activeFilter, setActiveFilter] = useState(null);

    const isSuryaFilter = projectType.toLowerCase().includes('surya');

    const activeTagsList = isSuryaFilter
        ? PM_SURYA_TAGS_LIST
        : GENERAL_TAGS_LIST;

    const projectTags = FINANCIAL_TAGS.filter(tag =>
        activeTagsList.includes(tag.id)
    );

    /*
     * Get all tagged customers belonging to this project type.
     *
     * IMPORTANT:
     * This includes customers whose financial_tag is NOT
     * present in the predefined project tag list.
     * Those customers will appear under "Others".
     */
    const tagged = customers.filter(c => {
        if (!c.financial_tag) return false;
        if (c.deleted_at) return false;

        const cType = c.project_type || 'General';

        const isCustomerSurya =
            cType.toLowerCase().includes('surya');

        return isCustomerSurya === isSuryaFilter;
    });

    /*
     * Financial totals
     *
     * Discount has been removed completely.
     * Receivable = Quoted Amount - Total Received
     */
    const totals = tagged.reduce((acc, c) => {
        const quotedVal = Number(
            c.quoted_amount || c.total_cost || 0
        );

        const receivedVal = Number(c.total_received) || 0;

        acc.quoted += quotedVal;
        acc.received += receivedVal;

        acc.receivable += Math.max(
            0,
            quotedVal - receivedVal
        );

        return acc;
    }, {
        quoted: 0,
        received: 0,
        receivable: 0
    });

    /*
     * Group customers by the predefined financial tags.
     */
    const grouped = projectTags.reduce((acc, tag) => {
        const group = tagged.filter(
            c => c.financial_tag === tag.id
        );

        if (group.length > 0) {
            acc[tag.id] = group;
        }

        return acc;
    }, {});

    /*
     * Customers with a financial_tag that isn't in the
     * predefined list go under "Others".
     */
    const knownTagIds = projectTags.map(tag => tag.id);

    const others = tagged.filter(
        c => !knownTagIds.includes(c.financial_tag)
    );

    /*
     * Build the list of sections that should actually be displayed.
     */
    const visibleProjectTags = projectTags.filter(
        tag =>
            !activeFilter ||
            activeFilter === tag.id
    );

    const showOthers =
        others.length > 0 &&
        (!activeFilter || activeFilter === '__others');

    const hasVisibleGroups =
        visibleProjectTags.some(
            tag => grouped[tag.id]
        ) || showOthers;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* =====================================================
                MONEY SUMMARY
            ====================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                {/* Total Quoted */}
                <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                        Total Quoted
                    </p>

                    <p className="text-2xl font-bold text-stone-800">
                        {formatIndianCurrency(
                            totals.quoted,
                            true
                        )}
                    </p>
                </div>

                {/* Total Received */}
                <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                        Total Received
                    </p>

                    <p className="text-2xl font-bold text-emerald-600">
                        {formatIndianCurrency(
                            totals.received,
                            true
                        )}
                    </p>
                </div>

                {/* Total Receivable */}
                <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm border-b-4 border-b-orange-400">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                        Total Receivable
                    </p>

                    <p className="text-2xl font-bold text-orange-600">
                        {formatIndianCurrency(
                            totals.receivable,
                            true
                        )}
                    </p>
                </div>

            </div>


            {/* =====================================================
                TAG FILTER BUTTONS
            ====================================================== */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">

                {/* ALL TAGGED */}
                <button
                    onClick={() => setActiveFilter(null)}
                    className={`rounded-2xl p-4 border text-left transition-all ${activeFilter === null
                            ? 'bg-stone-900 border-stone-900 text-white shadow-lg'
                            : 'bg-white border-stone-100 text-stone-800 hover:border-stone-200'
                        }`}
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">
                        All Tagged
                    </p>

                    <p className="text-2xl font-bold">
                        {tagged.length}
                    </p>
                </button>


                {/* KNOWN TAGS */}
                {projectTags.map(tag => {
                    const groupCount =
                        (grouped[tag.id] || []).length;

                    const colors =
                        FINANCIAL_TAG_COLORS[tag.id] || {
                            bg: 'bg-stone-50',
                            text: 'text-stone-700',
                            border: 'border-stone-200',
                            dot: 'bg-stone-400'
                        };

                    const isSelected =
                        activeFilter === tag.id;

                    return (
                        <button
                            key={tag.id}
                            onClick={() =>
                                setActiveFilter(
                                    isSelected
                                        ? null
                                        : tag.id
                                )
                            }
                            className={`rounded-2xl p-3 border transition-all text-left ${isSelected
                                    ? 'ring-2 ring-stone-900 ring-offset-2'
                                    : ''
                                } ${colors.bg} ${colors.border}`}
                        >
                            <p
                                className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${colors.text}`}
                            >
                                {tag.label}
                            </p>

                            <p
                                className={`text-xl font-bold ${colors.text}`}
                            >
                                {groupCount}
                            </p>
                        </button>
                    );
                })}


                {/* OTHERS */}
                {others.length > 0 && (
                    <button
                        onClick={() =>
                            setActiveFilter(
                                activeFilter === '__others'
                                    ? null
                                    : '__others'
                            )
                        }
                        className={`rounded-2xl p-3 border transition-all text-left ${activeFilter === '__others'
                                ? 'ring-2 ring-stone-900 ring-offset-2'
                                : ''
                            } bg-stone-50 border-stone-200`}
                    >
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5 text-stone-700">
                            Others
                        </p>

                        <p className="text-xl font-bold text-stone-700">
                            {others.length}
                        </p>
                    </button>
                )}

            </div>


            {/* =====================================================
                EMPTY STATE
            ====================================================== */}
            {!hasVisibleGroups && (
                <div className="flex flex-col items-center justify-center py-12 text-stone-400 bg-white rounded-2xl border border-stone-100 shadow-sm">

                    <Tag className="w-8 h-8 mb-2 text-stone-300" />

                    <p className="text-sm font-medium text-stone-500">
                        No customers found with these tags
                    </p>

                </div>
            )}


            {/* =====================================================
                KNOWN TAG GROUPS
            ====================================================== */}
            {visibleProjectTags.map(tag => {

                const group = grouped[tag.id];

                if (!group) return null;

                const colors =
                    FINANCIAL_TAG_COLORS[tag.id] || {
                        bg: 'bg-stone-50',
                        text: 'text-stone-700',
                        border: 'border-stone-200',
                        dot: 'bg-stone-400'
                    };

                return (
                    <div
                        key={tag.id}
                        className="animate-in slide-in-from-bottom-2 duration-300"
                    >

                        {/* Group Header */}
                        <div className="flex items-center gap-2 mb-3">

                            <span
                                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`}
                            />

                            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-widest">
                                {tag.label}
                            </h3>

                            <span
                                className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
                            >
                                {group.length}
                            </span>

                        </div>


                        {/* Customer Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

                            {group.map(c => {

                                const quotedVal =
                                    Number(
                                        c.quoted_amount ||
                                        c.total_cost ||
                                        0
                                    );

                                const totalRec =
                                    Number(
                                        c.total_received
                                    ) || 0;

                                /*
                                 * No discount anymore.
                                 */
                                const recv = Math.max(
                                    0,
                                    quotedVal - totalRec
                                );

                                return (
                                    <button
                                        key={c.id}
                                        onClick={() =>
                                            onSelectCustomer(c)
                                        }
                                        className="w-full bg-white rounded-2xl border border-stone-100 p-4 text-left hover:border-amber-200 hover:shadow-sm transition-all group"
                                    >

                                        {/* Customer Info */}
                                        <div className="flex justify-between items-start mb-2">

                                            <div>

                                                <p className="font-bold text-stone-800 text-sm group-hover:text-amber-600 transition-colors">
                                                    {c.customer_name}
                                                </p>

                                                <p className="text-[10px] text-stone-400 font-medium mt-0.5">
                                                    {c.crn || 'No CRN'}
                                                    {' · '}
                                                    {c.area || 'No Area'}
                                                </p>

                                            </div>

                                        </div>


                                        {/* Financial Summary */}
                                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-50">

                                            {/* Quoted */}
                                            <div>
                                                <p className="text-[9px] text-stone-400 font-bold uppercase">
                                                    Quoted
                                                </p>

                                                <p className="text-xs font-bold text-stone-700">
                                                    {formatIndianCurrency(
                                                        quotedVal,
                                                        true
                                                    )}
                                                </p>
                                            </div>


                                            {/* Received */}
                                            <div>
                                                <p className="text-[9px] text-stone-400 font-bold uppercase">
                                                    Received
                                                </p>

                                                <p className="text-xs font-bold text-emerald-600">
                                                    {formatIndianCurrency(
                                                        totalRec,
                                                        true
                                                    )}
                                                </p>
                                            </div>


                                            {/* Pending */}
                                            <div>
                                                <p className="text-[9px] text-stone-400 font-bold uppercase">
                                                    Pending
                                                </p>

                                                <p
                                                    className={`text-xs font-bold ${recv > 0
                                                            ? 'text-orange-500'
                                                            : 'text-emerald-500'
                                                        }`}
                                                >
                                                    {formatIndianCurrency(
                                                        recv,
                                                        true
                                                    )}
                                                </p>
                                            </div>

                                        </div>

                                    </button>
                                );
                            })}

                        </div>
                    </div>
                );
            })}


            {/* =====================================================
                OTHERS GROUP
            ====================================================== */}
            {showOthers && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">

                    {/* Others Header */}
                    <div className="flex items-center gap-2 mb-3">

                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-stone-400" />

                        <h3 className="text-xs font-bold text-stone-700 uppercase tracking-widest">
                            Others
                        </h3>

                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold border bg-stone-50 text-stone-700 border-stone-200">
                            {others.length}
                        </span>

                    </div>


                    {/* Others Customer Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

                        {others.map(c => {

                            const quotedVal =
                                Number(
                                    c.quoted_amount ||
                                    c.total_cost ||
                                    0
                                );

                            const totalRec =
                                Number(
                                    c.total_received
                                ) || 0;

                            const recv = Math.max(
                                0,
                                quotedVal - totalRec
                            );

                            return (
                                <button
                                    key={c.id}
                                    onClick={() =>
                                        onSelectCustomer(c)
                                    }
                                    className="w-full bg-white rounded-2xl border border-stone-100 p-4 text-left hover:border-amber-200 hover:shadow-sm transition-all group"
                                >

                                    {/* Customer Info */}
                                    <div className="flex justify-between items-start mb-2">

                                        <div>

                                            <p className="font-bold text-stone-800 text-sm group-hover:text-amber-600 transition-colors">
                                                {c.customer_name}
                                            </p>

                                            <p className="text-[10px] text-stone-400 font-medium mt-0.5">
                                                {c.crn || 'No CRN'}
                                                {' · '}
                                                {c.area || 'No Area'}
                                            </p>

                                        </div>

                                    </div>


                                    {/* Financial Summary */}
                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-50">

                                        {/* Quoted */}
                                        <div>
                                            <p className="text-[9px] text-stone-400 font-bold uppercase">
                                                Quoted
                                            </p>

                                            <p className="text-xs font-bold text-stone-700">
                                                {formatIndianCurrency(
                                                    quotedVal,
                                                    true
                                                )}
                                            </p>
                                        </div>


                                        {/* Received */}
                                        <div>
                                            <p className="text-[9px] text-stone-400 font-bold uppercase">
                                                Received
                                            </p>

                                            <p className="text-xs font-bold text-emerald-600">
                                                {formatIndianCurrency(
                                                    totalRec,
                                                    true
                                                )}
                                            </p>
                                        </div>


                                        {/* Pending */}
                                        <div>
                                            <p className="text-[9px] text-stone-400 font-bold uppercase">
                                                Pending
                                            </p>

                                            <p
                                                className={`text-xs font-bold ${recv > 0
                                                        ? 'text-orange-500'
                                                        : 'text-emerald-500'
                                                    }`}
                                            >
                                                {formatIndianCurrency(
                                                    recv,
                                                    true
                                                )}
                                            </p>
                                        </div>

                                    </div>

                                </button>
                            );
                        })}

                    </div>
                </div>
            )}

        </div>
    );
}
import React, { useState, useMemo } from 'react';
import { Search, Plus, Copy, Check, Info } from 'lucide-react';
import { TEMPLATE_TOKENS, TOKEN_CATEGORIES } from '../../utils/templateTokens.js';

export default function TokenReferencePanel({
    onInsertToken,
    activeEditorName = 'HTML',
    className = ''
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [feedbackToken, setFeedbackToken] = useState(null);
    const [feedbackAction, setFeedbackAction] = useState(null); // 'inserted' | 'copied'

    const filteredTokens = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return TEMPLATE_TOKENS.filter((item) => {
            if (selectedCategory !== 'all' && item.category !== selectedCategory) {
                return false;
            }
            if (!query) return true;
            return (
                item.token.toLowerCase().includes(query) ||
                item.syntax.toLowerCase().includes(query) ||
                item.label.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                (item.example && item.example.toLowerCase().includes(query))
            );
        });
    }, [searchQuery, selectedCategory]);

    const handleAction = async (tokenObj, actionType) => {
        const syntax = tokenObj.syntax;

        if (actionType === 'insert') {
            let inserted = false;
            if (typeof onInsertToken === 'function') {
                inserted = onInsertToken(syntax);
            }
            if (!inserted && navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(syntax);
                    setFeedbackToken(tokenObj.token);
                    setFeedbackAction('copied');
                    setTimeout(() => setFeedbackToken(null), 1800);
                    return;
                } catch {
                    // Clipboard fallback failure ignored
                }
            }
            setFeedbackToken(tokenObj.token);
            setFeedbackAction('inserted');
            setTimeout(() => setFeedbackToken(null), 1800);
        } else {
            // Copy action
            if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(syntax);
                    setFeedbackToken(tokenObj.token);
                    setFeedbackAction('copied');
                    setTimeout(() => setFeedbackToken(null), 1800);
                } catch {
                    setFeedbackToken(tokenObj.token);
                    setFeedbackAction('error');
                    setTimeout(() => setFeedbackToken(null), 1800);
                }
            }
        }
    };

    return (
        <div className={`flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                            <Info size={14} />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900">Available Template Tokens</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                        Click pill to insert at cursor in {activeEditorName}
                    </span>
                </div>

                {/* Search Bar */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tokens (e.g. gst, totals, sender, table)..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                    {TOKEN_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-2.5 py-1 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-all ${
                                selectedCategory === cat.id
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-white hover:bg-slate-200/70 text-slate-600 border border-slate-200'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Token List */}
            <div className="overflow-y-auto max-h-[380px] p-3 space-y-2.5 bg-slate-50/30">
                {filteredTokens.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                        No tokens found matching "{searchQuery}".
                    </div>
                ) : (
                    filteredTokens.map((item) => {
                        const isFeedback = feedbackToken === item.token;

                        return (
                            <div
                                key={item.token}
                                className="group p-2.5 bg-white border border-slate-200/90 rounded-lg hover:border-purple-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <button
                                            type="button"
                                            onClick={() => handleAction(item, 'insert')}
                                            className="font-mono text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 hover:text-purple-800 border border-purple-200 rounded px-2 py-0.5 transition-colors cursor-pointer text-left truncate max-w-full"
                                            title="Click to insert at cursor position"
                                        >
                                            {item.isBlock ? '{{#items}}...{{/items}}' : item.syntax}
                                        </button>
                                        <span className="text-xs font-bold text-slate-800 truncate">
                                            {item.label}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 leading-tight truncate">
                                        {item.description}
                                    </p>
                                    {item.example && (
                                        <p className="text-[10px] text-slate-600 mt-0.5 font-mono truncate">
                                            Sample: {item.example}
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                                    {isFeedback ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md animate-in fade-in">
                                            <Check size={12} strokeWidth={3} />
                                            {feedbackAction === 'inserted' ? 'Inserted' : 'Copied'}
                                        </span>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleAction(item, 'insert')}
                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors cursor-pointer"
                                                title={`Insert token at current cursor position in ${activeEditorName}`}
                                            >
                                                <Plus size={12} />
                                                Insert
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAction(item, 'copy')}
                                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                                title="Copy token to clipboard"
                                                aria-label={`Copy ${item.syntax} to clipboard`}
                                            >
                                                <Copy size={13} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

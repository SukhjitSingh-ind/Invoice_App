import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    RotateCcw,
    Code2,
    Palette,
    Copy,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Eye,
    Sparkles,
    Check,
    Layers,
    FileText,
    ExternalLink
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.js';
import {
    getTemplateByIdAsync,
    saveTemplateAsync
} from '../services/templateService.js';
import {
    validateTemplateStudioPayload,
    detectTemplateTokens,
    previewTemplateWithCss,
    generateUniqueTemplateName,
    STARTER_HTML_TEMPLATE,
    STARTER_CSS_TEMPLATE
} from '../utils/templateValidator.js';
import CodeEditor from '../components/TemplateStudio/CodeEditor.jsx';
import TokenReferencePanel from '../components/TemplateStudio/TokenReferencePanel.jsx';
import { useToast } from '../components/Toast.jsx';
import { ROUTES, TOAST_TYPES } from '../constants/index.js';

export default function TemplateStudio() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { addToast } = useToast();

    const templateIdParam = searchParams.get('templateId');
    const actionParam = searchParams.get('action'); // 'edit' | 'duplicate' | null

    const liveTemplates = useLiveQuery(() => db.templates.toArray(), []);
    const existingTemplates = useMemo(() => liveTemplates || [], [liveTemplates]);

    // Active template state
    const [originalTemplate, setOriginalTemplate] = useState(null);
    const [templateName, setTemplateName] = useState('');
    const [htmlCode, setHtmlCode] = useState('');
    const [cssCode, setCssCode] = useState('');
    const [isBuiltInBaseline, setIsBuiltInBaseline] = useState(false);
    const [targetTemplateId, setTargetTemplateId] = useState(null); // null if creating or duplicating

    // UI state
    const [activeTab, setActiveTab] = useState('html'); // 'html' | 'css'
    const [mobileView, setMobileView] = useState('editor'); // 'editor' | 'tokens' | 'preview'
    const [showTokensDrawer, setShowTokensDrawer] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Validation & Error states
    const [validationErrors, setValidationErrors] = useState({});
    const [previewError, setPreviewError] = useState(null);
    const [isDebouncing, setIsDebouncing] = useState(false);

    // Debounced preview HTML
    const [debouncedPreviewHtml, setDebouncedPreviewHtml] = useState('');

    // Editor refs for cursor insertion
    const htmlEditorRef = useRef(null);
    const cssEditorRef = useRef(null);

    // Load initial template data
    useEffect(() => {
        let isMounted = true;
        async function loadTemplate() {
            setIsLoading(true);
            try {
                if (templateIdParam) {
                    const loaded = await getTemplateByIdAsync(templateIdParam, db);
                    if (!isMounted) return;

                    if (loaded) {
                        setOriginalTemplate(loaded);
                        const isBuiltIn = Boolean(loaded.isBuiltIn);
                        setIsBuiltInBaseline(isBuiltIn);

                        const isDuplicateAction = actionParam === 'duplicate' || isBuiltIn;

                        if (isDuplicateAction) {
                            // Automatically configure as a duplicate custom template
                            const copyName = generateUniqueTemplateName(loaded.name, existingTemplates);
                            setTemplateName(copyName);
                            setTargetTemplateId(null); // Creates a new custom template
                        } else {
                            // Direct editing of an existing custom template
                            setTemplateName(loaded.name);
                            setTargetTemplateId(loaded.id);
                        }

                        setHtmlCode(loaded.html || '');
                        setCssCode(loaded.css || '');
                    } else {
                        addToast(`Template "${templateIdParam}" not found. Starting with starter template.`, TOAST_TYPES.INFO);
                        setTemplateName(generateUniqueTemplateName('Custom Invoice', existingTemplates));
                        setHtmlCode(STARTER_HTML_TEMPLATE);
                        setCssCode(STARTER_CSS_TEMPLATE);
                        setTargetTemplateId(null);
                        setIsBuiltInBaseline(false);
                    }
                } else {
                    // Blank / Starter template mode
                    setTemplateName(generateUniqueTemplateName('Bespoke Layout', existingTemplates));
                    setHtmlCode(STARTER_HTML_TEMPLATE);
                    setCssCode(STARTER_CSS_TEMPLATE);
                    setTargetTemplateId(null);
                    setIsBuiltInBaseline(false);
                }
            } catch (err) {
                console.error('Failed to load template in studio:', err);
                addToast('Failed to load template data.', TOAST_TYPES.ERROR);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        loadTemplate();
        return () => { isMounted = false; };
    }, [templateIdParam, actionParam, addToast, existingTemplates]);

    // Live preview debounce (250ms)
    useEffect(() => {
        setIsDebouncing(true);
        const timer = setTimeout(() => {
            try {
                const rendered = previewTemplateWithCss(htmlCode, cssCode);
                setDebouncedPreviewHtml(rendered);
                setPreviewError(null);
            } catch (err) {
                console.error('Preview render failure:', err);
                setPreviewError(err.message || 'Error occurred while rendering template preview.');
            } finally {
                setIsDebouncing(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [htmlCode, cssCode]);

    // Token analysis
    const tokenAnalysis = useMemo(() => {
        return detectTemplateTokens(htmlCode);
    }, [htmlCode]);

    // Insert token into active editor at cursor position
    const handleInsertToken = useCallback((syntax) => {
        if (activeTab === 'css') {
            return cssEditorRef.current?.insertAtCursor(syntax) || false;
        }
        return htmlEditorRef.current?.insertAtCursor(syntax) || false;
    }, [activeTab]);

    // Revert changes
    const handleRevert = () => {
        if (window.confirm('Are you sure you want to revert all unsaved changes to this template?')) {
            if (originalTemplate) {
                setHtmlCode(originalTemplate.html || '');
                setCssCode(originalTemplate.css || '');
                if (targetTemplateId) {
                    setTemplateName(originalTemplate.name);
                }
            } else {
                setHtmlCode(STARTER_HTML_TEMPLATE);
                setCssCode(STARTER_CSS_TEMPLATE);
            }
            setValidationErrors({});
            addToast('Editor reset to original template.', TOAST_TYPES.INFO);
        }
    };

    // Save template
    const handleSave = async () => {
        const payloadCheck = validateTemplateStudioPayload({
            name: templateName,
            html: htmlCode,
            css: cssCode,
            existingTemplates,
            currentTemplateId: targetTemplateId
        });

        if (!payloadCheck.valid) {
            setValidationErrors(payloadCheck.errors);
            addToast('Please resolve validation errors before saving.', TOAST_TYPES.ERROR);
            return;
        }

        setValidationErrors({});
        setIsSaving(true);

        try {
            const templatePayload = {
                name: payloadCheck.trimmedName,
                html: htmlCode,
                css: cssCode || '',
                isBuiltIn: false, // User-saved templates are ALWAYS custom
                isDefault: false
            };

            if (targetTemplateId) {
                templatePayload.id = targetTemplateId;
            }

            const savedId = await saveTemplateAsync(templatePayload, db);
            setTargetTemplateId(savedId);
            setIsBuiltInBaseline(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);

            addToast(`Template "${payloadCheck.trimmedName}" saved successfully!`, TOAST_TYPES.SUCCESS);
        } catch (err) {
            console.error('Failed to save template:', err);
            addToast(`Save failed: ${err.message}`, TOAST_TYPES.ERROR);
        } finally {
            setIsSaving(false);
        }
    };

    // Duplicate as a separate copy
    const handleDuplicateCopy = async () => {
        try {
            setIsSaving(true);
            const copyName = generateUniqueTemplateName(templateName, existingTemplates);
            const templatePayload = {
                name: copyName,
                html: htmlCode,
                css: cssCode || '',
                isBuiltIn: false,
                isDefault: false
            };

            const savedId = await saveTemplateAsync(templatePayload, db);
            setTargetTemplateId(savedId);
            setTemplateName(copyName);
            setIsBuiltInBaseline(false);
            addToast(`Created duplicate template "${copyName}".`, TOAST_TYPES.SUCCESS);
        } catch (err) {
            console.error('Failed to duplicate copy:', err);
            addToast(`Duplication failed: ${err.message}`, TOAST_TYPES.ERROR);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading Template Studio...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden font-sans">
            {/* Top Studio Navigation Header */}
            <header className="h-14 px-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 z-20">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={() => navigate(ROUTES.SETTINGS)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Back to Settings"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Code2 size={18} />
                        </div>
                        <div className="min-w-0 flex items-center gap-2">
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => {
                                    setTemplateName(e.target.value);
                                    if (validationErrors.name) {
                                        setValidationErrors(prev => ({ ...prev, name: null }));
                                    }
                                }}
                                placeholder="Template Name..."
                                className="bg-slate-800/80 hover:bg-slate-800 text-white font-bold text-sm px-2.5 py-1 rounded-md border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 max-w-[220px] sm:max-w-[320px] truncate"
                            />

                            {/* Status badge */}
                            {isBuiltInBaseline && !targetTemplateId ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full shrink-0">
                                    Duplicating Built-in
                                </span>
                            ) : targetTemplateId ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full shrink-0">
                                    Custom Template
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full shrink-0">
                                    New Template
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Header Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Save Duplicate button if editing an existing template */}
                    {targetTemplateId && (
                        <button
                            type="button"
                            onClick={handleDuplicateCopy}
                            disabled={isSaving}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Save as a new separate copy"
                        >
                            <Copy size={13} />
                            Save as Copy
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleRevert}
                        disabled={isSaving}
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Reset template to original state"
                    >
                        <RotateCcw size={13} />
                        Reset
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate(ROUTES.SETTINGS)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : saveSuccess ? (
                            <Check size={14} strokeWidth={3} />
                        ) : (
                            <Save size={14} />
                        )}
                        <span>{saveSuccess ? 'Saved!' : targetTemplateId ? 'Save Changes' : 'Save Template'}</span>
                    </button>
                </div>
            </header>

            {/* Read-Only Built-In Protection Notice Banner */}
            {isBuiltInBaseline && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-600 shrink-0" />
                        <span>
                            <strong>Built-in Template Protection:</strong> Built-in templates remain permanently read-only baselines. Your customizations will be saved as an independent custom template.
                        </span>
                    </div>
                </div>
            )}

            {/* Mobile View Switcher (Visible on < lg) */}
            <div className="lg:hidden flex items-center justify-around bg-slate-800 text-slate-300 border-b border-slate-700 text-xs font-semibold shrink-0">
                <button
                    type="button"
                    onClick={() => setMobileView('editor')}
                    className={`flex-1 py-2 text-center cursor-pointer border-b-2 transition-colors ${
                        mobileView === 'editor' ? 'border-blue-500 text-white font-bold bg-slate-700/50' : 'border-transparent'
                    }`}
                >
                    Editor
                </button>
                <button
                    type="button"
                    onClick={() => setMobileView('tokens')}
                    className={`flex-1 py-2 text-center cursor-pointer border-b-2 transition-colors ${
                        mobileView === 'tokens' ? 'border-purple-500 text-white font-bold bg-slate-700/50' : 'border-transparent'
                    }`}
                >
                    Tokens
                </button>
                <button
                    type="button"
                    onClick={() => setMobileView('preview')}
                    className={`flex-1 py-2 text-center cursor-pointer border-b-2 transition-colors ${
                        mobileView === 'preview' ? 'border-emerald-500 text-white font-bold bg-slate-700/50' : 'border-transparent'
                    }`}
                >
                    Live Preview
                </button>
            </div>

            {/* Main Split-Screen Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* ==============================================================
                    LEFT PANEL: HTML / CSS Editor & Token Reference
                   ============================================================== */}
                <section
                    className={`w-full lg:w-1/2 flex flex-col bg-slate-900 border-r border-slate-800 overflow-hidden ${
                        mobileView !== 'editor' && mobileView !== 'tokens' ? 'hidden lg:flex' : 'flex'
                    }`}
                >
                    {/* Editor Toolbar & Sub-tabs */}
                    <div className="h-11 px-4 bg-slate-950 flex items-center justify-between border-b border-slate-800 shrink-0">
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('html')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                                    activeTab === 'html'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                <Code2 size={14} />
                                HTML Markup
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('css')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                                    activeTab === 'css'
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                <Palette size={14} />
                                Custom CSS
                            </button>
                        </div>

                        {/* Tokens Reference Toggle */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowTokensDrawer(prev => !prev)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                    showTokensDrawer
                                        ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                                }`}
                                title="Toggle template tokens reference panel"
                            >
                                <Layers size={13} />
                                <span>Tokens {tokenAnalysis.recognizedTokens.length > 0 && `(${tokenAnalysis.recognizedTokens.length})`}</span>
                            </button>
                        </div>
                    </div>

                    {/* Validation Errors Notice */}
                    {validationErrors.name && (
                        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-1.5 text-xs text-red-300 flex items-center gap-2 shrink-0">
                            <AlertCircle size={14} className="text-red-400 shrink-0" />
                            <span>{validationErrors.name}</span>
                        </div>
                    )}
                    {validationErrors.html && (
                        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-1.5 text-xs text-red-300 flex items-center gap-2 shrink-0">
                            <AlertCircle size={14} className="text-red-400 shrink-0" />
                            <span>{validationErrors.html}</span>
                        </div>
                    )}
                    {validationErrors.general && (
                        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-1.5 text-xs text-red-300 flex items-center gap-2 shrink-0">
                            <AlertCircle size={14} className="text-red-400 shrink-0" />
                            <span>{validationErrors.general}</span>
                        </div>
                    )}

                    {/* Tokens Reference Drawer or Modal if open on Desktop */}
                    {showTokensDrawer && (
                        <div className="p-3 border-b border-slate-800 bg-slate-950 shrink-0 animate-in slide-in-from-top-2 duration-150">
                            <TokenReferencePanel
                                onInsertToken={handleInsertToken}
                                activeEditorName={activeTab === 'html' ? 'HTML Editor' : 'CSS Editor'}
                            />
                        </div>
                    )}

                    {/* Mobile Tokens View */}
                    {mobileView === 'tokens' && (
                        <div className="p-4 overflow-y-auto flex-1 bg-slate-900">
                            <TokenReferencePanel
                                onInsertToken={handleInsertToken}
                                activeEditorName={activeTab === 'html' ? 'HTML Editor' : 'CSS Editor'}
                            />
                        </div>
                    )}

                    {/* Code Editor View */}
                    <div className={`flex-1 p-3 overflow-hidden ${mobileView === 'tokens' ? 'hidden lg:flex flex-col' : 'flex flex-col'}`}>
                        {activeTab === 'html' ? (
                            <CodeEditor
                                ref={htmlEditorRef}
                                value={htmlCode}
                                onChange={(val) => {
                                    setHtmlCode(val);
                                    if (validationErrors.html) {
                                        setValidationErrors(prev => ({ ...prev, html: null }));
                                    }
                                }}
                                language="html"
                                placeholder="<!-- Enter complete HTML invoice template markup here... -->"
                                ariaLabel="HTML Template Code Editor"
                                className="h-full"
                            />
                        ) : (
                            <CodeEditor
                                ref={cssEditorRef}
                                value={cssCode}
                                onChange={(val) => {
                                    setCssCode(val);
                                    if (validationErrors.css) {
                                        setValidationErrors(prev => ({ ...prev, css: null }));
                                    }
                                }}
                                language="css"
                                placeholder="/* Enter custom invoice CSS styling here... */"
                                ariaLabel="CSS Template Code Editor"
                                className="h-full"
                            />
                        )}
                    </div>

                    {/* Status & Token Warning Footer */}
                    <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 truncate">
                            {tokenAnalysis.hasRecognizedTokens ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold truncate">
                                    <Check size={12} strokeWidth={3} />
                                    {tokenAnalysis.recognizedTokens.length} recognized tokens active
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-amber-400 font-semibold truncate" title={tokenAnalysis.warning}>
                                    <AlertTriangle size={12} />
                                    No dynamic tokens detected (static invoice)
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-slate-500 font-mono">
                            <span>Total size: {((htmlCode.length + cssCode.length) / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                </section>

                {/* ==============================================================
                    RIGHT PANEL: Interactive Real-Time Preview
                   ============================================================== */}
                <section
                    className={`w-full lg:w-1/2 flex flex-col bg-slate-100 overflow-hidden ${
                        mobileView !== 'preview' ? 'hidden lg:flex' : 'flex'
                    }`}
                >
                    {/* Preview Top Header Bar */}
                    <div className="h-11 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
                        <div className="flex items-center gap-2">
                            <Eye size={15} className="text-slate-500" />
                            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Live Interactive Preview
                            </h2>
                        </div>

                        {/* Real-time Debounce / Status Indicator */}
                        <div className="flex items-center gap-3 text-xs">
                            {isDebouncing ? (
                                <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium animate-pulse">
                                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                                    Updating preview...
                                </span>
                            ) : previewError ? (
                                <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                                    <AlertCircle size={13} />
                                    Render Error
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Live synced
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Preview Error Banner if template rendering fails */}
                    {previewError && (
                        <div className="bg-red-50 border-b border-red-200 p-3 text-xs text-red-800 flex items-start gap-2 shrink-0 animate-in fade-in">
                            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-bold">Template Syntax / Rendering Issue</p>
                                <p className="text-red-700 mt-0.5">{previewError}</p>
                            </div>
                        </div>
                    )}

                    {/* Sandboxed Iframe Preview Window */}
                    <div className="flex-1 p-4 lg:p-6 overflow-y-auto flex items-start justify-center bg-slate-200/60">
                        <div className="w-full max-w-[850px] min-h-[600px] bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden">
                            <iframe
                                title="Invoice Template Live Preview"
                                sandbox=""
                                srcDoc={debouncedPreviewHtml}
                                className="w-full min-h-[750px] border-0"
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

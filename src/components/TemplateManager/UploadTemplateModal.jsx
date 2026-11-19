import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    X,
    Upload,
    FileCode,
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Eye,
    Save,
    RotateCcw,
    FileText,
    Sparkles,
    Check
} from 'lucide-react';
import {
    validateTemplateFile,
    readTemplateFileAsync,
    validateTemplateHtml,
    detectTemplateTokens,
    validateTemplateName,
    previewUploadedTemplate
} from '../../utils/templateValidator.js';
import { saveTemplateAsync } from '../../services/templateService.js';
import { db } from '../../db/db.js';
import { useToast } from '../Toast';
import { TOAST_TYPES } from '../../constants/index.js';

/**
 * Derives a human-friendly template name from a file name.
 * e.g., "my_corporate_invoice.html" -> "My Corporate Invoice"
 */
function formatDefaultName(fileName) {
    if (!fileName) return '';
    const base = fileName.replace(/\.[^/.]+$/, '');
    return base
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
}

export default function UploadTemplateModal({ isOpen, onClose, onSuccess, existingTemplates = [] }) {
    const { addToast } = useToast();
    const fileInputRef = useRef(null);
    const activeReadIdRef = useRef(0);
    const abortControllerRef = useRef(null);
    const modalRef = useRef(null);
    const previousActiveElementRef = useRef(null);

    const [file, setFile] = useState(null);
    const [rawHtml, setRawHtml] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [nameError, setNameError] = useState(null);
    const [fileError, setFileError] = useState(null);
    const [isReading, setIsReading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            activeReadIdRef.current++;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            setFile(null);
            setRawHtml('');
            setTemplateName('');
            setNameError(null);
            setFileError(null);
            setIsReading(false);
            setIsSaving(false);
            setActiveTab('details');
        }
    }, [isOpen]);

    useEffect(() => {
        const activeId = activeReadIdRef;
        const controller = abortControllerRef;
        return () => {
            activeId.current++;
            if (controller.current) {
                controller.current.abort();
                controller.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        previousActiveElementRef.current = document.activeElement;

        const timer = setTimeout(() => {
            if (modalRef.current) {
                const focusable = modalRef.current.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length > 0) {
                    focusable[0].focus();
                }
            }
        }, 50);

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            if (e.key === 'Tab' && modalRef.current) {
                const focusable = Array.from(modalRef.current.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                ));
                if (focusable.length === 0) {
                    e.preventDefault();
                    return;
                }
                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown);
            if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
                previousActiveElementRef.current.focus();
            }
        };
    }, [isOpen, onClose]);

    const tokenAnalysis = useMemo(() => {
        if (!rawHtml) return null;
        return detectTemplateTokens(rawHtml);
    }, [rawHtml]);

    const previewHtml = useMemo(() => {
        if (!rawHtml) return '';
        try {
            return previewUploadedTemplate(rawHtml);
        } catch (err) {
            console.error('Error generating template preview:', err);
            return '<div style="padding: 20px; color: red;">Failed to generate template preview.</div>';
        }
    }, [rawHtml]);

    const handleFileProcess = async (selectedFile) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const readId = ++activeReadIdRef.current;
        setFileError(null);
        setNameError(null);

        const check = validateTemplateFile(selectedFile);
        if (!check.valid) {
            setFileError(check.error);
            setFile(null);
            setRawHtml('');
            return;
        }

        setFile(selectedFile);
        setIsReading(true);

        try {
            const content = await readTemplateFileAsync(selectedFile, { signal: controller.signal });
            if (activeReadIdRef.current !== readId || controller.signal.aborted) {
                return;
            }

            const htmlCheck = validateTemplateHtml(content);
            if (!htmlCheck.valid) {
                setFileError(htmlCheck.error);
                setRawHtml('');
                return;
            }

            setRawHtml(content);

            if (!templateName.trim()) {
                const defaultName = formatDefaultName(selectedFile.name);
                setTemplateName(defaultName);
                const nameCheck = validateTemplateName(defaultName, existingTemplates);
                if (!nameCheck.valid) {
                    setNameError(nameCheck.error);
                }
            }
        } catch (err) {
            if (activeReadIdRef.current === readId && !controller.signal.aborted) {
                if (err.name !== 'AbortError' && err.message !== 'File reading was aborted.') {
                    setFileError(err.message || 'An error occurred while reading the file. Please try again.');
                }
                setRawHtml('');
            }
        } finally {
            if (activeReadIdRef.current === readId) {
                setIsReading(false);
            }
        }
    };

    const handleFileInputChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileProcess(files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileProcess(files[0]);
        }
    };

    const handleNameChange = (e) => {
        const val = e.target.value;
        setTemplateName(val);
        const check = validateTemplateName(val, existingTemplates);
        setNameError(check.valid ? null : check.error);
    };

    const handleReset = () => {
        activeReadIdRef.current++;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsReading(false);
        setFile(null);
        setRawHtml('');
        setTemplateName('');
        setNameError(null);
        setFileError(null);
        setActiveTab('details');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!rawHtml) {
            setFileError('Please upload a valid HTML template file before saving.');
            return;
        }

        const nameCheck = validateTemplateName(templateName, existingTemplates);
        if (!nameCheck.valid) {
            setNameError(nameCheck.error);
            return;
        }

        try {
            setIsSaving(true);
            const templatePayload = {
                name: nameCheck.trimmedName,
                html: rawHtml,
                css: '',
                isBuiltIn: false,
                isDefault: false
            };

            const savedId = await saveTemplateAsync(templatePayload, db);
            addToast(`Custom template "${nameCheck.trimmedName}" saved successfully!`, TOAST_TYPES.SUCCESS);

            if (typeof onSuccess === 'function') {
                onSuccess(savedId, templatePayload);
            }
            onClose();
        } catch (err) {
            console.error('Failed to save custom template:', err);
            addToast(`Failed to save template: ${err.message}`, TOAST_TYPES.ERROR);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
                ref={modalRef}
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
                aria-labelledby="upload-template-modal-title"
            >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                            <Upload size={20} />
                        </div>
                        <div>
                            <h2 id="upload-template-modal-title" className="text-xl font-bold text-slate-900">Upload Your Own Template</h2>
                            <p className="text-xs text-slate-500">
                                Upload a local .html or .htm file with supported invoice tokens to create a custom layout.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Subheader Navigation: Details vs Live Preview */}
                {rawHtml && (
                    <div className="flex border-b border-slate-200 bg-white px-6" role="tablist" aria-label="Template upload options">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'details'}
                            aria-controls="template-details-panel"
                            onClick={() => setActiveTab('details')}
                            className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                                activeTab === 'details'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <FileCode size={16} />
                            Template Details & Tokens
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'preview'}
                            aria-controls="template-preview-panel"
                            onClick={() => setActiveTab('preview')}
                            className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                                activeTab === 'preview'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Eye size={16} />
                            Live Preview
                            <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-semibold">
                                Sample Data
                            </span>
                        </button>
                    </div>
                )}

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Error Banner */}
                    {fileError && (
                        <div className="mb-5 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
                            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                            <div className="flex-1 text-sm text-red-800">
                                <p className="font-semibold">Validation Error</p>
                                <p className="text-xs mt-0.5">{fileError}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'details' ? (
                        <div className="space-y-6">
                            {/* File Upload Drop Zone */}
                            {!rawHtml ? (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                                        isDragging
                                            ? 'border-blue-600 bg-blue-50/50 scale-[1.01]'
                                            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".html,.htm"
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                    />
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <FileCode size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                                        {isReading ? 'Reading template file...' : 'Choose an HTML file or drag & drop'}
                                    </h3>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                                        Upload a local <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">.html</code> or{' '}
                                        <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">.htm</code> template file. Supported invoice tokens will be detected automatically.
                                    </p>
                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors">
                                        <Upload size={14} />
                                        Browse Computer
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* Uploaded File Summary Card */}
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                <FileCode size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900 truncate">
                                                    {file?.name || 'Uploaded Template'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {file?.size ? `${Math.round(file.size / 1024)} KB` : 'HTML file'} • Ready for preview and save
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <RotateCcw size={13} />
                                            Change File
                                        </button>
                                    </div>

                                    {/* Template Name Input */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">
                                            Template Display Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={templateName}
                                            onChange={handleNameChange}
                                            placeholder="e.g. Modern Minimalist Charcoal"
                                            className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm focus:outline-none transition-colors ${
                                                nameError
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                                    : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                            }`}
                                        />
                                        {nameError && (
                                            <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                                                <AlertCircle size={13} />
                                                {nameError}
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1">
                                            This name will appear in your template catalog and invoice selection menus.
                                        </p>
                                    </div>

                                    {/* Token Analysis & Diagnostics */}
                                    {tokenAnalysis && (
                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                    <Sparkles size={16} className="text-blue-600" />
                                                    Invoice Token Detection
                                                </h4>
                                                <span className="text-xs font-semibold text-slate-500">
                                                    {tokenAnalysis.recognizedTokens.length} recognized {tokenAnalysis.recognizedTokens.length === 1 ? 'token' : 'tokens'}
                                                </span>
                                            </div>

                                            {/* Warning if no recognized tokens found */}
                                            {tokenAnalysis.warning ? (
                                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-start gap-3">
                                                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                                                    <div className="text-xs text-amber-900">
                                                        <p className="font-bold">No Recognized Dynamic Tokens Detected</p>
                                                        <p className="mt-0.5 leading-relaxed">
                                                            {tokenAnalysis.warning} You may still save and use this template if you intend to use static content.
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                                    <span>
                                                        Found <strong>{tokenAnalysis.recognizedTokens.length}</strong> supported invoice tokens. Tokens will be rendered dynamically with invoice data.
                                                    </span>
                                                </div>
                                            )}

                                            {/* Detected Token Badges */}
                                            {tokenAnalysis.recognizedTokens.length > 0 && (
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-32 overflow-y-auto">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {tokenAnalysis.recognizedTokens.map((t) => (
                                                            <span
                                                                key={t}
                                                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-blue-100 text-blue-800 border border-blue-200"
                                                            >
                                                                {`{{${t}}}`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Live Preview Tab */
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                    <Eye size={14} className="text-blue-600" />
                                    Sandboxed Template Preview (Rendered with sample invoice data)
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    HTML & CSS Sanitized • Scripts Disabled
                                </span>
                            </div>

                            {/* Sandboxed iframe for safe isolated preview without CSS bleeding */}
                            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-white h-[460px]">
                                <iframe
                                    title="Invoice Template Preview"
                                    sandbox=""
                                    srcDoc={previewHtml}
                                    className="w-full h-full border-0"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center gap-3">
                        {rawHtml && activeTab === 'details' && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('preview')}
                                className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <Eye size={16} />
                                Preview Result
                            </button>
                        )}

                        <button
                            type="button"
                            disabled={!rawHtml || !templateName.trim() || Boolean(nameError) || isSaving}
                            onClick={handleSave}
                            className={`px-6 py-2 text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${
                                !rawHtml || !templateName.trim() || Boolean(nameError) || isSaving
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg cursor-pointer transform hover:scale-[1.01]'
                            }`}
                        >
                            <Save size={16} />
                            {isSaving ? 'Saving Template...' : 'Save Custom Template'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useMemo, useEffect, useRef } from 'react';
import { X, Eye } from 'lucide-react';
import { previewUploadedTemplate } from '../../utils/templateValidator.js';

export default function TemplatePreviewModal({ isOpen, onClose, template }) {
    const modalRef = useRef(null);
    const previousActiveElementRef = useRef(null);

    const previewHtml = useMemo(() => {
        if (!template || !template.html) return '';
        try {
            return previewUploadedTemplate(template.html);
        } catch (err) {
            console.error('Error previewing template:', err);
            return '<div style="padding: 20px; color: red;">Failed to generate preview.</div>';
        }
    }, [template]);

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

    if (!isOpen || !template) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
                ref={modalRef}
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
                aria-labelledby="template-preview-title"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                            <Eye size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 id="template-preview-title" className="text-lg font-bold text-slate-900">{template.name}</h2>
                                {template.isBuiltIn ? (
                                    <span className="px-2 py-0.5 text-[10px] bg-slate-200 text-slate-700 font-bold rounded-full">
                                        Built-in
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 text-[10px] bg-purple-100 text-purple-700 font-bold rounded-full">
                                        Custom
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500">Live preview rendered with sample invoice data</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        aria-label="Close preview"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body with sandboxed iframe */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50">
                    <div className="border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-white h-[580px]">
                        <iframe
                            title={`Preview of ${template.name}`}
                            sandbox=""
                            srcDoc={previewHtml}
                            className="w-full h-full border-0"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shadow-sm"
                    >
                        Close Preview
                    </button>
                </div>
            </div>
        </div>
    );
}

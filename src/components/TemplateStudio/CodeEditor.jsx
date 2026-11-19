import React, { useRef, useImperativeHandle, forwardRef, useState, useCallback, useMemo } from 'react';

/**
 * Escapes raw HTML strings for safe rendering in code backdrop.
 */
function escapeForPre(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Lightweight syntax highlighter for HTML template markup.
 * Highlights template tokens {{...}}, HTML tags, attributes, strings, and comments.
 */
function highlightHtml(code) {
    if (!code) return '';

    // Tokenize comments, tokens, tags, strings
    const tokenRegex = /(\{\{[#/]?[a-zA-Z0-9_.]+\}\})|(<!--[\s\S]*?-->)|(<[^>]+>)/g;

    let lastIndex = 0;
    let result = '';
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
        // Text before match
        if (match.index > lastIndex) {
            result += escapeForPre(code.slice(lastIndex, match.index));
        }

        const [, tplToken, comment, tag] = match;

        if (tplToken) {
            // Template token pill
            result += `<span class="text-purple-600 dark:text-purple-400 font-bold bg-purple-100/60 dark:bg-purple-950/60 rounded px-1">${escapeForPre(tplToken)}</span>`;
        } else if (comment) {
            // HTML Comment
            result += `<span class="text-slate-400 dark:text-slate-500 italic">${escapeForPre(comment)}</span>`;
        } else if (tag) {
            // Highlight tag name, attributes, and inner tokens
            const highlightedTag = tag.replace(
                /(<\/?)([a-zA-Z0-9_-]+)|([a-zA-Z0-9_-]+)(?==)|(".*?"|'.*?')|(\{\{[#/]?[a-zA-Z0-9_.]+\}\})/g,
                (m, open, tagName, attrName, strVal, innerToken) => {
                    if (open && tagName) {
                        return `${escapeForPre(open)}<span class="text-blue-600 dark:text-blue-400 font-semibold">${escapeForPre(tagName)}</span>`;
                    }
                    if (attrName) {
                        return `<span class="text-amber-600 dark:text-amber-400">${escapeForPre(attrName)}</span>`;
                    }
                    if (strVal) {
                        return `<span class="text-emerald-600 dark:text-emerald-400">${escapeForPre(strVal)}</span>`;
                    }
                    if (innerToken) {
                        return `<span class="text-purple-600 dark:text-purple-400 font-bold bg-purple-100/60 dark:bg-purple-950/60 rounded px-0.5">${escapeForPre(innerToken)}</span>`;
                    }
                    return escapeForPre(m);
                }
            );
            result += `<span class="text-slate-700 dark:text-slate-300">${highlightedTag}</span>`;
        }

        lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < code.length) {
        result += escapeForPre(code.slice(lastIndex));
    }

    return result;
}

/**
 * Lightweight syntax highlighter for CSS stylesheets.
 * Highlights selectors, properties, values, template tokens, and comments.
 */
function highlightCss(code) {
    if (!code) return '';

    const tokenRegex = /(\/\*[\s\S]*?\*\/)|(\{\{[#/]?[a-zA-Z0-9_.]+\}\})|([^{};]+)(?=\{)|([a-zA-Z0-9_-]+)(?=:)|(:[^;{}]+;?)/g;

    let lastIndex = 0;
    let result = '';
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
        if (match.index > lastIndex) {
            result += escapeForPre(code.slice(lastIndex, match.index));
        }

        const [full, comment, tplToken, selector, property, valueBlock] = match;

        if (comment) {
            result += `<span class="text-slate-400 dark:text-slate-500 italic">${escapeForPre(comment)}</span>`;
        } else if (tplToken) {
            result += `<span class="text-purple-600 dark:text-purple-400 font-bold bg-purple-100/60 dark:bg-purple-950/60 rounded px-1">${escapeForPre(tplToken)}</span>`;
        } else if (selector) {
            result += `<span class="text-indigo-600 dark:text-indigo-400 font-semibold">${escapeForPre(selector)}</span>`;
        } else if (property) {
            result += `<span class="text-sky-600 dark:text-sky-400">${escapeForPre(property)}</span>`;
        } else if (valueBlock) {
            const highlightedVal = valueBlock.replace(
                /(\{\{[#/]?[a-zA-Z0-9_.]+\}\})/g,
                m => `<span class="text-purple-600 dark:text-purple-400 font-bold bg-purple-100/60 rounded px-0.5">${escapeForPre(m)}</span>`
            );
            result += `<span class="text-emerald-700 dark:text-emerald-400">${highlightedVal}</span>`;
        } else {
            result += escapeForPre(full);
        }

        lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < code.length) {
        result += escapeForPre(code.slice(lastIndex));
    }

    return result;
}

const CodeEditor = forwardRef(function CodeEditor(
    {
        value = '',
        onChange,
        language = 'html',
        placeholder = '',
        readOnly = false,
        className = '',
        minHeight = '360px',
        ariaLabel = 'Template Code Editor'
    },
    ref
) {
    const textareaRef = useRef(null);
    const preRef = useRef(null);
    const lineNumbersRef = useRef(null);
    const [wrapLines, setWrapLines] = useState(false);

    const lineCount = useMemo(() => {
        return Math.max(1, (value || '').split('\n').length);
    }, [value]);

    const syncScroll = useCallback(() => {
        if (!textareaRef.current) return;
        const top = textareaRef.current.scrollTop;
        const left = textareaRef.current.scrollLeft;

        if (preRef.current) {
            preRef.current.scrollTop = top;
            preRef.current.scrollLeft = left;
        }
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = top;
        }
    }, []);

    // Expose imperative API for cursor token insertion
    useImperativeHandle(ref, () => ({
        insertAtCursor: (textToInsert) => {
            const textarea = textareaRef.current;
            if (!textarea) return false;

            const start = textarea.selectionStart ?? value.length;
            const end = textarea.selectionEnd ?? value.length;

            const before = value.substring(0, start);
            const after = value.substring(end);
            const newValue = `${before}${textToInsert}${after}`;

            if (typeof onChange === 'function') {
                onChange(newValue);
            }

            // Restore and update cursor position right after inserted text
            setTimeout(() => {
                textarea.focus();
                const newPos = start + textToInsert.length;
                textarea.setSelectionRange(newPos, newPos);
            }, 0);

            return true;
        },
        focus: () => {
            textareaRef.current?.focus();
        },
        getTextarea: () => textareaRef.current
    }), [value, onChange]);

    const handleKeyDown = (e) => {
        if (readOnly) return;
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Support Tab key for 2-space indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            if (e.shiftKey) {
                // Outdent current line
                const lines = value.split('\n');
                let curPos = 0;
                let lineIdx = 0;
                for (let i = 0; i < lines.length; i++) {
                    const nextPos = curPos + lines[i].length + 1;
                    if (start >= curPos && start <= nextPos) {
                        lineIdx = i;
                        break;
                    }
                    curPos = nextPos;
                }
                if (lines[lineIdx].startsWith('  ')) {
                    lines[lineIdx] = lines[lineIdx].substring(2);
                    const newVal = lines.join('\n');
                    onChange?.(newVal);
                    setTimeout(() => {
                        textarea.setSelectionRange(Math.max(0, start - 2), Math.max(0, end - 2));
                    }, 0);
                }
            } else {
                // Insert 2 spaces
                const newVal = value.substring(0, start) + '  ' + value.substring(end);
                onChange?.(newVal);
                setTimeout(() => {
                    textarea.setSelectionRange(start + 2, start + 2);
                }, 0);
            }
            return;
        }

        // Support Enter key auto-indentation
        if (e.key === 'Enter') {
            const start = textarea.selectionStart;
            const currentLine = value.substring(0, start).split('\n').pop() || '';
            const match = currentLine.match(/^(\s+)/);
            if (match) {
                e.preventDefault();
                const indent = match[1];
                const newVal = value.substring(0, start) + '\n' + indent + value.substring(start);
                onChange?.(newVal);
                setTimeout(() => {
                    textarea.setSelectionRange(start + 1 + indent.length, start + 1 + indent.length);
                }, 0);
            }
        }
    };

    const highlightedMarkup = language === 'css'
        ? highlightCss(value)
        : highlightHtml(value);

    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
        <div className={`flex flex-col border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-900 text-slate-100 shadow-sm ${className}`}>
            {/* Editor Sub-Header Toolbar */}
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/90 border-b border-slate-700/80 text-xs text-slate-400 select-none">
                <div className="flex items-center gap-2">
                    <span className="font-mono uppercase font-bold text-[11px] px-2 py-0.5 rounded bg-slate-700/80 text-slate-200">
                        {language.toUpperCase()}
                    </span>
                    <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
                    <span>•</span>
                    <span>{(value || '').length} chars</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setWrapLines(prev => !prev)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                            wrapLines ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'hover:bg-slate-700 text-slate-400'
                        }`}
                        title="Toggle soft line wrapping"
                    >
                        {wrapLines ? 'Wrap: On' : 'Wrap: Off'}
                    </button>
                </div>
            </div>

            {/* Split gutter + code container */}
            <div className="relative flex flex-1 overflow-hidden" style={{ minHeight }}>
                {/* Line Numbers Gutter */}
                <div
                    ref={lineNumbersRef}
                    aria-hidden="true"
                    className="w-12 shrink-0 bg-slate-950/70 select-none border-r border-slate-800 text-right pr-2.5 pt-3 font-mono text-[13px] leading-[20px] text-slate-500 overflow-hidden"
                >
                    {lineNumbers.map(n => (
                        <div key={n}>{n}</div>
                    ))}
                </div>

                {/* Overlaid pre (syntax highlighting) + textarea (editable text) */}
                <div className="relative flex-1 overflow-hidden">
                    {/* Syntax Highlighting Pre Layer */}
                    <pre
                        ref={preRef}
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: (highlightedMarkup || ' ') + '\n' }}
                        className={`absolute inset-0 m-0 p-3 font-mono text-[13px] leading-[20px] pointer-events-none select-none z-0 overflow-hidden bg-slate-900 ${
                            wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'
                        }`}
                        style={{ tabSize: 2 }}
                    />

                    {/* Transparent Interactive Textarea Layer */}
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange?.(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onScroll={syncScroll}
                        readOnly={readOnly}
                        spellCheck="false"
                        autoCapitalize="none"
                        autoComplete="off"
                        autoCorrect="off"
                        placeholder={placeholder}
                        aria-label={ariaLabel}
                        className={`relative z-10 w-full h-full m-0 p-3 font-mono text-[13px] leading-[20px] bg-transparent text-transparent caret-blue-400 focus:outline-none resize-none selection:bg-blue-500/30 ${
                            wrapLines ? 'whitespace-pre-wrap break-all overflow-y-auto' : 'whitespace-pre overflow-auto'
                        }`}
                        style={{ tabSize: 2 }}
                    />
                </div>
            </div>
        </div>
    );
});

export default CodeEditor;

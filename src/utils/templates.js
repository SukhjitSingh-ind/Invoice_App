export const TEMPLATES = [
    {
        id: 'default',
        name: 'Professional Clean',
        description: 'A clean, modern professional invoice with serif fonts.',
        color: 'blue',
        previewColor: 'bg-blue-600',
        layout: 'classic',
        paperClass: 'bg-white'
    },
    {
        id: 'minimal',
        name: 'Minimalist Mono',
        description: 'Simple and stark, using monospaced fonts for a technical look.',
        color: 'slate',
        previewColor: 'bg-slate-800',
        layout: 'classic',
        paperClass: 'bg-white'
    },
    {
        id: 'creative',
        name: 'Creative Bold',
        description: 'Bold colors and rounded shapes for creative agencies.',
        color: 'purple',
        previewColor: 'bg-purple-600',
        layout: 'classic',
        paperClass: 'bg-white'
    },
    {
        id: 'corporate',
        name: 'Corporate Green',
        description: 'Traditional layout with trustworthy green accents.',
        color: 'emerald',
        previewColor: 'bg-emerald-700',
        layout: 'classic',
        paperClass: 'bg-white'
    },
    {
        id: 'modern_indigo',
        name: 'Modern Indigo',
        description: 'Full-width header with a sleek indigo theme.',
        color: 'indigo',
        previewColor: 'bg-indigo-600',
        layout: 'modern',
        paperClass: 'bg-white'
    },
    {
        id: 'retro_warm',
        name: 'Retro Warm',
        description: 'Old-school aesthetic with a warm paper background.',
        color: 'orange',
        previewColor: 'bg-orange-200',
        layout: 'classic',
        paperClass: 'bg-orange-50'
    },
    {
        id: 'dark_mode',
        name: 'Dark Future',
        description: 'High contrast dark mode invoice for digital brands.',
        color: 'slate',
        previewColor: 'bg-slate-900',
        layout: 'classic',
        paperClass: 'bg-slate-900 text-white border-slate-700'
    },
    {
        id: 'luxury_gold',
        name: 'Luxury Gold (Cursive)',
        description: 'Elegant cursive font on dark grey with gold accents.',
        color: 'gold',
        previewColor: 'bg-neutral-900',
        layout: 'modern',
        paperClass: 'bg-neutral-900 text-amber-400 border-neutral-700 custom-font-cursive'
    }
];

export const getTemplateById = (id) => TEMPLATES.find(t => t.id === id) || TEMPLATES[0];

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ShieldCheck, Zap, BarChart3, Users, FileText, CheckCircle2, Package, Palette, HelpCircle } from 'lucide-react';
import logoImg from '../assets/Logo_2_RB_HD.png';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">

            {/* Navbar */}
            <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Invoice<span className="text-blue-600">Manager</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-400/20 rounded-full blur-3xl -z-10 opacity-50"></div>

                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6 animate-fade-in-up">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        v2.0 Now Available
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-8 leading-tight">
                        Invoicing made <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Simple & Powerful.</span>
                    </h1>
                    <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Create professional GST invoices, track payments, and manage clients with our blazing fast invoice generator. Designed for modern businesses.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/create')}
                            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 hover:-translate-y-1"
                        >
                            Create New Invoice <ChevronRight size={20} />
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg flex items-center gap-2 hover:bg-slate-50 transition-all hover:border-slate-300"
                        >
                            View Dashboard
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-black text-slate-900 mb-4">Everything you need</h2>
                        <p className="text-slate-500 max-w-xl mx-auto">Manage your business finances with a suite of powerful tools designed to save you time and boost productivity.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 - GST */}
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors group">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ShieldCheck size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">GST Compliant</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Automatically calculate CGST, SGST & IGST. Generate valid tax invoices instantly with proper HSN/SAC codes.
                            </p>
                        </div>

                        {/* Feature 2 - Item Manager */}
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-200 transition-colors group">
                            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Package size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Item Library</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Create a library of products and services. Add them to invoices with one click. Manage prices centrally.
                            </p>
                        </div>

                        {/* Feature 3 - Analytics */}
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors group">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BarChart3 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Reports</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Visualize revenue with pie charts. Export detailed sales and client reports to Excel with one click.
                            </p>
                        </div>

                        {/* Feature 4 - Customization */}
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition-colors group">
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Palette size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Visual Brand</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Customize invoice colors, fonts, and upload background images. Make your invoices match your brand identity.
                            </p>
                        </div>

                        {/* Feature 5 - Client Manager */}
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-pink-200 transition-colors group">
                            <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Client Management</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Save client details for faster billing. Track purchase history and total spending per client.
                            </p>
                        </div>

                        {/* Feature 6 - Help Center */}
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors group">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <HelpCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Help Center</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Comprehensive guides, FAQs, and tips to help you master the application. Get support when you need it.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Preview Section */}
            <section className="py-20 px-6 bg-slate-900 text-white overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 border border-blue-800 text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
                            <Zap size={14} className="fill-current" />
                            Fast & Efficient
                        </div>
                        <h2 className="text-4xl font-black mb-6">Generated in seconds,<br />delivered instantly.</h2>
                        <ul className="space-y-4 mb-8">
                            {[
                                'One-click PDF generation',
                                'Customizable templates & themes',
                                'Professional layout & branding',
                                'Mobile-friendly preview'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-300">
                                    <CheckCircle2 size={20} className="text-blue-500" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => navigate('/create')}
                            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition-colors"
                        >
                            Try it now
                        </button>
                    </div>
                    <div className="flex-1 relative">
                        {/* Abstract UI Mockup */}
                        <div className="relative z-10 bg-white rounded-xl p-2 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                            <div className="bg-slate-50 rounded-lg p-6 border border-slate-100 min-h-[300px]">
                                <div className="flex justify-between items-center mb-8 border-b pb-4">
                                    <div className="w-32 h-4 bg-slate-200 rounded"></div>
                                    <div className="w-16 h-8 bg-blue-100 rounded"></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-full h-12 bg-white border border-slate-200 rounded flex items-center px-4 justify-between">
                                        <div className="w-24 h-3 bg-slate-200 rounded"></div>
                                        <div className="w-12 h-3 bg-slate-200 rounded"></div>
                                    </div>
                                    <div className="w-full h-12 bg-white border border-slate-200 rounded flex items-center px-4 justify-between">
                                        <div className="w-32 h-3 bg-slate-200 rounded"></div>
                                        <div className="w-12 h-3 bg-slate-200 rounded"></div>
                                    </div>
                                    <div className="w-full h-12 bg-white border border-slate-200 rounded flex items-center px-4 justify-between">
                                        <div className="w-20 h-3 bg-slate-200 rounded"></div>
                                        <div className="w-12 h-3 bg-slate-200 rounded"></div>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <div className="w-40 h-10 bg-slate-800 rounded"></div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-10 -right-10 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl -z-0"></div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg p-1">
                            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-slate-900">InvoiceManager</span>
                    </div>
                    <p className="text-slate-500 text-sm">© 2025 GK Auto Works. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

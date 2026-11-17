import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, FilePlus, FileCode2, Receipt, Settings, Users, Package, BarChart3, HelpCircle, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import logoImg from '../assets/Logo_1_RB_HD.png';
import { ROUTES } from '../constants/index.js';


export default function Sidebar({ isOpen, toggleSidebar }) {
    const navItems = [
        { path: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
        { path: ROUTES.INVOICES, label: 'Invoices', icon: Receipt },
        { path: ROUTES.CLIENTS, label: 'Clients', icon: Users },
        { path: ROUTES.ITEMS, label: 'Items', icon: Package },
        { path: ROUTES.REPORTS, label: 'Reports', icon: BarChart3 },
        { path: ROUTES.CREATE_INVOICE, label: 'Create Invoice', icon: FilePlus },
        { path: ROUTES.CREATE_INVOICE_JSON, label: 'Create from JSON', icon: FileCode2 },
        { path: ROUTES.YOUR_DETAILS, label: 'Your Details', icon: Building2 },
        { path: ROUTES.HELP, label: 'Help', icon: HelpCircle },
        { path: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
    ];

    return (
        <div className={`${isOpen ? 'w-64' : 'w-20'} bg-slate-900 min-h-screen text-white flex flex-col fixed left-0 top-0 bottom-0 z-50 transition-all duration-300`}>

            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-9 bg-blue-600 rounded-full p-1 shadow-lg text-white hover:bg-blue-700 transition-colors z-[60]"
            >
                {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            <div className={`p-6 ${!isOpen && 'flex justify-center px-2'}`}>
                <Link to={ROUTES.HOME} className={`flex items-center gap-3 hover:opacity-80 transition-opacity ${!isOpen && 'justify-center'}`}>
                    <div className="w-12 h-12 rounded-lg overflow-hidden p-1 flex-shrink-0">
                        <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className={`${!isOpen && 'hidden'} transition-opacity duration-200 overflow-hidden`}>
                        <h1 className="font-bold text-lg leading-tight whitespace-nowrap">Invoice<br /><span className="text-blue-400">Manager</span></h1>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 py-6 px-3">
                <ul className="space-y-2">
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    } ${!isOpen ? 'justify-center px-2' : ''}`
                                }
                                title={!isOpen ? item.label : ''}
                            >
                                <item.icon size={20} className="flex-shrink-0" />
                                <span className={`${!isOpen && 'hidden'} transition-opacity duration-200 whitespace-nowrap`}>
                                    {item.label}
                                </span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}

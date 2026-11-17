import React, { useState, useEffect } from 'react';
import { initializeDatabaseAndMigrate } from '../services/migrationService.js';
import { loadInvoicesFromDb } from '../services/invoiceService.js';
import { loadClientsFromDb } from '../services/clientService.js';
import { loadItemsFromDb } from '../services/itemService.js';
import { loadSettingsFromDb } from '../services/settingsService.js';

export default function AppBootstrap({ children }) {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function init() {
            try {
                // 1. Run one-time Dexie migration & schema verification
                await initializeDatabaseAndMigrate();

                // 2. Hydrate in-memory caches from Dexie
                await Promise.all([
                    loadInvoicesFromDb(),
                    loadClientsFromDb(),
                    loadItemsFromDb(),
                    loadSettingsFromDb()
                ]);

                if (isMounted) {
                    setIsReady(true);
                }
            } catch (err) {
                console.error('Database bootstrap error:', err);
                if (isMounted) {
                    setError('Failed to initialize local database. Your data is safe.');
                }
            }
        }

        init();
        return () => {
            isMounted = false;
        };
    }, []);

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-red-50 p-6 text-center">
                <div className="max-w-md rounded-xl bg-white p-8 shadow-xl border border-red-200">
                    <h2 className="text-xl font-bold text-red-700 mb-2">Storage Initialization Error</h2>
                    <p className="text-sm text-slate-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!isReady) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-600">Initializing invoice database...</p>
                </div>
            </div>
        );
    }

    return children;
}

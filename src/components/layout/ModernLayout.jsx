import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function ModernLayout({ children }) {
    return (
        <div className="min-h-screen bg-transparent">
            <Sidebar />
            <Header />

            {/* Main Content Area */}
            <main className="pt-28 pl-28 xl:pl-72 pr-4 pb-4 min-h-screen transition-all duration-300">
                <div className="animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}

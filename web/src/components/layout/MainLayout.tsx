import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-white font-sans">
            <Sidebar />
            <Header />
            <main className="ml-64 pt-16 min-h-screen p-6">
                <Outlet />
            </main>
        </div>
    );
};

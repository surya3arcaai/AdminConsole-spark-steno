"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Users, FileText, Settings, Database, Server } from "lucide-react";

export default function Sidebar() {
    const pathname = usePathname();

    const getNavClass = (path) => {
        return `nav-item ${pathname === path ? 'active' : ''}`;
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo fade-in">
                <Database size={28} color="#66fcf1" />
                <h2>Arca Spark</h2>
            </div>

            <nav className="slide-up" style={{ animationDelay: '0.1s' }}>
                <Link href="/" className={getNavClass('/')}>
                    <Activity size={20} />
                    <span>Dashboard</span>
                </Link>
                <Link href="/users" className={getNavClass('/users')}>
                    <Users size={20} />
                    <span>User Onboarding</span>
                </Link>
                <Link href="/templates" className={getNavClass('/templates')}>
                    <FileText size={20} />
                    <span>Templates</span>
                </Link>
                <Link href="/rbac" className={getNavClass('/rbac')}>
                    <Server size={20} />
                    <span>RBAC & Access</span>
                </Link>
                <Link href="/logs" className={getNavClass('/logs')}>
                    <Settings size={20} />
                    <span>System Logs</span>
                </Link>
            </nav>
        </aside>
    );
}

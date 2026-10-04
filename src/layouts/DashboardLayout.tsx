import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function DashboardLayout() {
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto w-full relative bg-radar-grid">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}


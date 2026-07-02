import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from './lib/supabase';
// Read the global auth state instead of issuing redundant requests to the server
import { useAuth } from './context/AuthContext';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { username, role } = useAuth(); // Sealed role read from app_metadata, never user_metadata

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const displayUsername = username ?? 'User';
    const displayRole = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)} on duty` : 'Staff';

    // Initials derived from the "D-Name" / "P-Name" username convention, purely for the avatar
    const avatarInitials = username
        ? `${username.charAt(0)}${username.split('-')[1]?.charAt(0) ?? ''}`.toUpperCase()
        : 'U';

    const handleSignOut = async () => {
        // Destroy the JWT token on the server and clear local storage
        await supabase.auth.signOut();
        // ProtectedRoute will detect the dropped session, but we force navigation for UX
        navigate('/login');
    };

    return (
        <div className="relative flex h-screen w-screen bg-pharmacy-cream overflow-hidden font-sans">

            {/* Horizontally collapsible navigation sidebar */}
            <aside
                className={`bg-pharmacy-green text-pharmacy-cream flex flex-col justify-between shrink-0 z-20 shadow-xl overflow-hidden transition-all duration-300 ${
                    isSidebarOpen ? 'w-64' : 'w-0'
                }`}
            >
                <div className="w-64 h-full flex flex-col justify-between">
                    <div>
                        <div className="p-6">
                            <div className="bg-pharmacy-cream rounded-xl p-3 shadow-md">
                                <img src="/logo-wordmark.png" alt="William's Pharmacy" className="w-full h-auto" />
                            </div>
                        </div>

                        <nav className="flex flex-col gap-1 px-4 mt-2">
                            <Link
                                to="/"
                                className={`px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                                    location.pathname === '/' ? 'bg-pharmacy-green-light text-white shadow-inner' : 'text-pharmacy-cream/70 hover:bg-pharmacy-green-light/60 hover:text-white'
                                }`}
                            >
                                Calendar
                            </Link>

                            {/* Link to the staff management module */}
                            <Link
                                to="/staff"
                                className={`px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                                    location.pathname === '/staff' ? 'bg-pharmacy-green-light text-white shadow-inner' : 'text-pharmacy-cream/70 hover:bg-pharmacy-green-light/60 hover:text-white'
                                }`}
                            >
                                Staff Management
                            </Link>
                        </nav>
                    </div>

                    <div className="p-4 border-t border-pharmacy-green-light">
                        <div className="flex items-center gap-3 px-2 py-2">
                            <div className="w-9 h-9 rounded-full bg-pharmacy-gold flex items-center justify-center shrink-0 text-xs font-bold text-pharmacy-green">
                                {avatarInitials}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-white truncate">{displayUsername}</span>
                                <span className="text-xs text-pharmacy-cream/60 truncate">{displayRole}</span>
                            </div>
                            <button
                                onClick={handleSignOut}
                                aria-label="Sign Out"
                                title="Sign Out"
                                className="ml-auto shrink-0 p-2 rounded-full text-pharmacy-cream/70 hover:bg-pharmacy-green-light hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Semicircular toggle button attached to the panel edge to collapse/expand */}
            <button
                onClick={() => setIsSidebarOpen(prev => !prev)}
                aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                className={`absolute top-1/2 -translate-y-1/2 z-30 h-9 w-4 rounded-r-full bg-pharmacy-green border border-l-0 border-pharmacy-green-light flex items-center justify-center text-pharmacy-cream/70 shadow-lg hover:bg-pharmacy-green-light hover:text-white transition-all duration-300 ${
                    isSidebarOpen ? 'left-64' : 'left-0'
                }`}
            >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d={isSidebarOpen ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
                    ></path>
                </svg>
            </button>

            {/* Dynamic container injected by React Router (Outlet) */}
            <main className="flex-1 overflow-y-auto relative custom-scrollbar">
                <Outlet />
            </main>
        </div>
    );
}

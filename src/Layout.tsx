import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useEffect, useState } from 'react';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [username, setUsername] = useState('User');
    const [role, setRole] = useState('STAFF');

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.username) {
                const uName = user.user_metadata.username;
                setUsername(uName);
                // Determina el rol visual basado en el prefijo estricto de seguridad
                setRole(uName.startsWith('D-') ? 'DOCTOR' : 'PHARMACIST');
            }
        };
        fetchUser();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="flex h-screen w-screen bg-gray-50 overflow-hidden font-sans">
            
            {/* Barra lateral de navegación estática */}
            <aside className="w-64 bg-[#1e293b] text-white flex flex-col justify-between shrink-0 z-20 shadow-xl">
                <div>
                    <div className="p-6">
                        <h2 className="text-xl font-bold tracking-wide">William's Pharmacy</h2>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"></path>
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-slate-400">{role}</span>
                                <span className="text-sm font-medium">{username}</span>
                            </div>
                        </div>
                    </div>

                    <nav className="flex flex-col gap-1 px-4 mt-2">
                        <Link
                            to="/"
                            className={`px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                                location.pathname === '/' ? 'bg-slate-700 text-white shadow-inner' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            Calendar
                        </Link>
                        
                        {/* Nuevo botón de enlace al módulo de gestión del jueves */}
                        <Link
                            to="/staff"
                            className={`px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                                location.pathname === '/staff' ? 'bg-slate-700 text-white shadow-inner' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            Staff Management
                        </Link>
                    </nav>
                </div>

                <div className="p-4">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border border-slate-700"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Contenedor dinámico inyectado por React Router (Outlet) */}
            <main className="flex-1 overflow-hidden relative">
                <Outlet />
            </main>
        </div>
    );
}
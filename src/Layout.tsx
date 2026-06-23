import { useNavigate, Outlet } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useEffect, useState } from 'react';

export default function Layout() {
    const navigate = useNavigate();
    const [username, setUsername] = useState<string>('');
    const [prefix, ...nameParts] = username.split('-');
    const displayName = nameParts.join('-').trim() || username;
    const roleLabel = prefix === 'P' ? 'Pharmacist' : prefix === 'D' ? 'Doctor' : 'Staff';

    useEffect(() => {
        // Extract user metadata to display the username (D-Doctor or P-Pharmacist)
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.user_metadata && user.user_metadata.username) {
                setUsername(user.user_metadata.username);
            }
        };
        
        fetchUser();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Navigation Sidebar */}
            <aside className="sticky top-0 flex h-screen w-64 flex-col bg-slate-800 text-white">
                <div className="p-6">
                    <h2 className="text-xl font-bold">William's Pharmacy</h2>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-slate-200">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                            >
                                <path d="M20 21a8 8 0 0 0-16 0" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </span>
                        <div className="leading-tight">
                            <p className="text-xs uppercase tracking-wide text-slate-400">{username ? roleLabel : 'Loading...'}</p>
                            <p className="text-sm text-slate-200">{username ? displayName : 'Loading...'}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex flex-1 flex-col overflow-y-auto p-4">
                    <div className="space-y-2">
                        <button className="w-full rounded-md bg-slate-700 px-4 py-2 text-left font-medium">
                            Calendar
                        </button>
                        {/* Future menu options will be added here */}
                    </div>

                    <div className="mt-auto pt-6">
                        <div className="rounded-2xl border border-slate-600 bg-slate-700/50 p-1.5 shadow-inner">
                            <button
                                onClick={handleSignOut}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-white transition hover:bg-slate-600/50"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-5 w-5 shrink-0"
                                    aria-hidden="true"
                                >
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </nav>
            </aside>

            {/* Dynamic container for main screens */}
            <main className="flex-1 p-8">
                <Outlet />
            </main>
        </div>
    );
}
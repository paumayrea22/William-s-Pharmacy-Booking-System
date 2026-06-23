import { useNavigate, Outlet } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useEffect, useState } from 'react';

export default function Layout() {
    const navigate = useNavigate();
    const [username, setUsername] = useState<string>('');

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
            <aside className="flex w-64 flex-col bg-slate-800 text-white">
                <div className="p-6">
                    <h2 className="text-xl font-bold">William's Pharmacy</h2>
                    <p className="mt-2 text-sm text-slate-400">User: {username || 'Loading...'}</p>
                </div>
                
                <nav className="flex-1 space-y-2 p-4">
                    <button className="w-full rounded-md bg-slate-700 px-4 py-2 text-left font-medium">
                        Calendar
                    </button>
                    {/* Future menu options will be added here */}
                </nav>
                
                <div className="border-t border-slate-700 p-4">
                    <button
                        onClick={handleSignOut}
                        className="w-full rounded-md bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Dynamic container for main screens */}
            <main className="flex-1 p-8">
                <Outlet />
            </main>
        </div>
    );
}
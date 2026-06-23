import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Define that this component will receive child components
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    // Null initial state to distinguish between "loading" and "unauthenticated"
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        // Validate the current token with the database
        const verifySession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsAuthenticated(session !== null);
        };

        verifySession();

        // Real-time event subscription for session changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(session !== null);
        });

        // Mandatory memory cleanup when the component unmounts
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Neutral loading screen while Supabase responds
    if (isAuthenticated === null) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-xl font-semibold text-gray-600">Verifying credentials...</div>
            </div>
        );
    }

    // Interception and blocking: redirect to login if no active session
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If everything is correct, render the child component
    return <>{children}</>;
}
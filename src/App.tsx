import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import ProtectedRoute from './ProtectedRoute';
import Layout from './Layout';
import Calendar from './Calendar';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                
                {/* Routes injected inside the Layout and protected by the Guardian */}
                <Route element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route path="/calendar" element={<Calendar />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
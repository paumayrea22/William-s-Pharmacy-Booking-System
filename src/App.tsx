import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Calendar from './Calendar';
import StaffManagement from './StaffManagement';
import StressTest from './StressTest';
import Login from './Login';
import ProtectedRoute from './ProtectedRoute';

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="/" element={<Calendar />} />
                    <Route path="/staff" element={<StaffManagement />} />
                    <Route path="/stress-test" element={<StressTest />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}
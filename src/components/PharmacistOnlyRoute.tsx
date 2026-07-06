import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Blocks the doctor role from pharmacist-only routes (e.g. Staff Management), regardless
// of whether the sidebar link is visible; doctors hitting the URL directly get redirected home.
export const PharmacistOnlyRoute = () => {
  const { role } = useAuth();

  if (role === 'doctor') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

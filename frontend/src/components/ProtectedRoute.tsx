import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../store/auth-store';
import type { Role } from '../types';

const ProtectedRoute = ({
  children,
  roles
}: {
  children: React.ReactNode;
  roles?: Role[];
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="centered-page">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

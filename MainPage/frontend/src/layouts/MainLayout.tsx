import { Button, Layout, Menu, Typography } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth-store';

const { Header, Content } = Layout;

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { key: '/student', label: <Link to="/student">Дашборд</Link> },
    { key: '/history', label: <Link to="/history">История</Link> },
    { key: '/activities', label: <Link to="/activities">AI-активности</Link> },
    { key: '/rooms', label: <Link to="/rooms">Кабинеты</Link> }
  ];

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Typography.Title level={4} className="brand-title">AI Tutor</Typography.Title>
        <Menu className="header-menu" mode="horizontal" selectedKeys={[location.pathname]} items={items} />
        <div className="header-actions">
          <Typography.Text>{user?.email}</Typography.Text>
          <Button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Выйти
          </Button>
        </div>
      </Header>
      <Content className="app-content">{children}</Content>
    </Layout>
  );
};

export default MainLayout;

import { Alert, Button, Card, Form, Input, Select, Tabs, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth-store';

const LoginPage = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={2}>AI-агент тестирования</Typography.Title>
        <Typography.Paragraph type="secondary">
          Регистрация, генерация тестов, разбор ошибок и AI-активности для студентов.
        </Typography.Paragraph>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        <Tabs
          defaultActiveKey="login"
          items={[
            {
              key: 'login',
              label: 'Вход',
              children: (
                <Form
                  layout="vertical"
                  onFinish={async (values) => {
                    try {
                      setLoading(true);
                      setError(null);
                      await login(values.email, values.password);
                      navigate('/');
                    } catch {
                      setError('Неверный логин или пароль.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Пароль" name="password" rules={[{ required: true }]}>
                    <Input.Password />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block>
                    Войти
                  </Button>
                </Form>
              )
            },
            {
              key: 'register',
              label: 'Регистрация',
              children: (
                <Form
                  layout="vertical"
                  initialValues={{ locale: 'ru' }}
                  onFinish={async (values) => {
                    try {
                      setLoading(true);
                      setError(null);
                      await register({
                        email: values.email,
                        password: values.password,
                        fullName: values.fullName,
                        locale: values.locale
                      });
                      navigate('/student');
                    } catch {
                      setError('Не удалось зарегистрироваться. Проверьте данные.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <Form.Item label="ФИО" name="fullName" rules={[{ required: true, min: 2 }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Пароль" name="password" rules={[{ required: true, min: 8 }]}>
                    <Input.Password />
                  </Form.Item>
                  <Form.Item label="Язык" name="locale">
                    <Select options={[{ label: 'Русский', value: 'ru' }, { label: 'English', value: 'en' }]} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block>
                    Создать аккаунт
                  </Button>
                </Form>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default LoginPage;

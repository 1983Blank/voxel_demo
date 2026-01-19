import { Outlet } from 'react-router-dom';
import { Layout, theme } from 'antd';

const { Content } = Layout;

export function AuthLayout() {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            padding: 32,
            background: colorBgContainer,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 600,
                color: '#1890ff',
              }}
            >
              SaaS App
            </h1>
            <p style={{ margin: '8px 0 0', color: '#666' }}>
              Welcome back! Please sign in to continue.
            </p>
          </div>
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}

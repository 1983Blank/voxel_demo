import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, theme, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  PictureOutlined,
  AppstoreOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const getMenuItems = (isAdmin: boolean): MenuProps['items'] => [
  {
    key: 'capture',
    type: 'group',
    label: 'CAPTURE',
    children: [
      {
        key: '/screens',
        icon: <PictureOutlined />,
        label: 'Screens',
      },
      {
        key: '/components',
        icon: <AppstoreOutlined />,
        label: 'Components',
      },
    ],
  },
  {
    key: 'prototype',
    type: 'group',
    label: 'PROTOTYPE',
    children: [
      {
        key: '/context',
        icon: <FileTextOutlined />,
        label: 'Product Context',
      },
      {
        key: '/collaborate',
        icon: <TeamOutlined />,
        label: 'Collaborate',
      },
    ],
  },
  {
    key: 'analyze',
    type: 'group',
    label: 'ANALYZE',
    children: [
      {
        key: '/analytics',
        icon: <BarChartOutlined />,
        label: 'Analytics',
      },
    ],
  },
  // Settings section
  {
    key: 'settings',
    type: 'group',
    label: 'SETTINGS',
    children: [
      {
        key: '/settings',
        icon: <KeyOutlined />,
        label: 'API Keys',
      },
    ],
  },
  // Admin section - only visible to admins
  ...(isAdmin ? [{
    key: 'admin',
    type: 'group' as const,
    label: 'ADMIN',
    children: [
      {
        key: '/admin',
        icon: <CrownOutlined />,
        label: 'User Management',
      },
    ],
  }] : []),
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuthStore();
  const menuItems = getMenuItems(isAdmin());
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => {
        navigate('/settings');
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  // Get current selected key including editor/variants routes
  const getSelectedKey = () => {
    if (location.pathname.startsWith('/editor/')) return '/screens';
    if (location.pathname.startsWith('/variants/')) return '/screens';
    return location.pathname;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        width={220}
        style={{
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ExperimentOutlined style={{ color: 'white', fontSize: 18 }} />
          </div>
          {!collapsed && (
            <Text strong style={{ fontSize: 18 }}>
              Voxel
            </Text>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div
            style={{ cursor: 'pointer' }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <MenuUnfoldOutlined style={{ fontSize: 18 }} />
            ) : (
              <MenuFoldOutlined style={{ fontSize: 18 }} />
            )}
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Avatar icon={<UserOutlined />} />
              <span>{user?.name || 'User'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

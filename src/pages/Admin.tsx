import { useState, useEffect } from 'react';
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Popconfirm,
  Card,
  Alert,
} from 'antd';
import {
  UserAddOutlined,
  DeleteOutlined,
  EditOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

const { Title } = Typography;

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'user' | 'viewer';
  created_at: string;
}

export function Admin() {
  const { user, isAdmin } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchUsers = async () => {
    if (!isSupabaseConfigured()) {
      setUsers([
        {
          id: 'mock-user-1',
          email: 'admin@voxel.ai',
          name: 'Admin User',
          role: 'admin',
          created_at: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to load users');
    } else {
      setUsers(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInviteUser = async (values: { email: string; name: string; password: string; role: string }) => {
    setIsSubmitting(true);

    if (!isSupabaseConfigured()) {
      message.success('User invited (mock)');
      setIsModalOpen(false);
      form.resetFields();
      setIsSubmitting(false);
      return;
    }

    try {
      // Create user using Supabase Auth
      // Note: This uses client-side signUp. For production, use a backend with service role.
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { name: values.name },
          // Don't auto-confirm to avoid logging out the admin
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        console.error('SignUp error:', error);
        message.error(`Failed to create user: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      if (!data.user) {
        message.error('Failed to create user: No user returned');
        setIsSubmitting(false);
        return;
      }

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the role if not default 'user'
      if (values.role !== 'user') {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ role: values.role, name: values.name })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Error updating role:', profileError);
          // Don't fail completely, user was created
          message.warning(`User created but role update failed: ${profileError.message}`);
        }
      }

      message.success(`User ${values.email} created successfully. They can now login.`);
      setIsModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (err) {
      console.error('Unexpected error:', err);
      message.error(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (values: { name: string; role: string }) => {
    if (!editingUser) return;
    setIsSubmitting(true);

    if (!isSupabaseConfigured()) {
      message.success('User updated (mock)');
      setIsEditModalOpen(false);
      editForm.resetFields();
      setEditingUser(null);
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ name: values.name, role: values.role })
      .eq('id', editingUser.id);

    if (error) {
      message.error(`Failed to update user: ${error.message}`);
    } else {
      message.success('User updated successfully');
      setIsEditModalOpen(false);
      editForm.resetFields();
      setEditingUser(null);
      fetchUsers();
    }
    setIsSubmitting(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isSupabaseConfigured()) {
      message.success('User deleted (mock)');
      return;
    }

    // Note: Deleting from user_profiles will cascade from auth.users deletion
    // For full deletion, you need a backend function with service role
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      message.error(`Failed to delete user: ${error.message}`);
    } else {
      message.success('User deleted successfully');
      fetchUsers();
    }
  };

  const openEditModal = (userProfile: UserProfile) => {
    setEditingUser(userProfile);
    editForm.setFieldsValue({
      name: userProfile.name,
      role: userProfile.role,
    });
    setIsEditModalOpen(true);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string | null, record: UserProfile) => (
        <Space>
          {name || 'Unnamed'}
          {record.role === 'admin' && <CrownOutlined style={{ color: '#faad14' }} />}
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const colors: Record<string, string> = {
          admin: 'gold',
          user: 'blue',
          viewer: 'default',
        };
        return <Tag color={colors[role]}>{role.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: UserProfile) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          {record.id !== user?.id && (
            <Popconfirm
              title="Delete this user?"
              description="This action cannot be undone."
              onConfirm={() => handleDeleteUser(record.id)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!isAdmin()) {
    return (
      <Alert
        message="Access Denied"
        description="You don't have permission to access this page."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>User Management</Title>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Invite User
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Invite User Modal */}
      <Modal
        title="Invite New User"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleInviteUser}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="John Doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter an email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="john@example.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Temporary Password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Minimum 6 characters" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            initialValue="user"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="user">User</Select.Option>
              <Select.Option value="viewer">Viewer</Select.Option>
              <Select.Option value="admin">Admin</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={isSubmitting}>
                Create User
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title="Edit User"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          editForm.resetFields();
          setEditingUser(null);
        }}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditUser}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="user">User</Select.Option>
              <Select.Option value="viewer">Viewer</Select.Option>
              <Select.Option value="admin">Admin</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={isSubmitting}>
                Save Changes
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

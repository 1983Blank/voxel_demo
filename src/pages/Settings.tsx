import { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Popconfirm,
  message,
  Alert,
  Tabs,
  Divider,
  Tooltip,
} from 'antd';
import {
  KeyOutlined,
  DeleteOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ApiOutlined,
  SafetyOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  getApiKeys,
  saveApiKey,
  deleteApiKey,
  setActiveProvider,
  validateApiKeyFormat,
  PROVIDER_INFO,
  type ApiKeyConfig,
  type LLMProvider,
} from '@/services/apiKeysService';
import { useAuthStore } from '@/store/authStore';

const { Title, Text, Paragraph } = Typography;

function ApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form] = Form.useForm();
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('anthropic');

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const keys = await getApiKeys();
      setApiKeys(keys);
    } catch (error) {
      message.error('Failed to load API keys');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleAddKey = async (values: { provider: LLMProvider; apiKey: string; model?: string }) => {
    // Validate format
    const validation = validateApiKeyFormat(values.provider, values.apiKey);
    if (!validation.valid) {
      message.error(validation.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await saveApiKey({
        provider: values.provider,
        apiKey: values.apiKey,
        model: values.model,
      });
      message.success(`${PROVIDER_INFO[values.provider].name} API key saved securely`);
      form.resetFields();
      setShowAddForm(false);
      fetchApiKeys();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to save API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKey = async (provider: LLMProvider) => {
    try {
      await deleteApiKey(provider);
      message.success('API key deleted');
      fetchApiKeys();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to delete API key');
    }
  };

  const handleSetActive = async (provider: LLMProvider) => {
    try {
      await setActiveProvider(provider);
      message.success(`${PROVIDER_INFO[provider].name} set as active provider`);
      fetchApiKeys();
    } catch (error) {
      message.error('Failed to set active provider');
    }
  };

  const columns = [
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider: LLMProvider, record: ApiKeyConfig) => (
        <Space>
          <RobotOutlined />
          <Text strong>{PROVIDER_INFO[provider].name}</Text>
          {record.isActive && <Tag color="green">Active</Tag>}
        </Space>
      ),
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      render: (model: string | null, record: ApiKeyConfig) => (
        <Tag>{model || PROVIDER_INFO[record.provider].defaultModel}</Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: () => (
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <Text type="success">Connected</Text>
        </Space>
      ),
    },
    {
      title: 'Added',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: ApiKeyConfig) => (
        <Space>
          {!record.isActive && (
            <Tooltip title="Set as active provider">
              <Button
                type="text"
                size="small"
                onClick={() => handleSetActive(record.provider)}
              >
                Set Active
              </Button>
            </Tooltip>
          )}
          <Popconfirm
            title="Delete this API key?"
            description="You'll need to add a new key to use this provider again."
            onConfirm={() => handleDeleteKey(record.provider)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const providerInfo = PROVIDER_INFO[selectedProvider];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 8 }}>
          <KeyOutlined style={{ marginRight: 8 }} />
          LLM API Keys
        </Title>
        <Paragraph type="secondary">
          Configure API keys for AI-powered prototype generation. Keys are encrypted and stored securely using Supabase Vault.
        </Paragraph>
      </div>

      <Alert
        message="Security Notice"
        description="Your API keys are encrypted at rest and never exposed in the application. Only the server-side functions can access the decrypted keys."
        type="info"
        icon={<SafetyOutlined />}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Configured Keys */}
      <Card title="Configured Providers" style={{ marginBottom: 24 }}>
        <Table
          columns={columns}
          dataSource={apiKeys}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          locale={{
            emptyText: (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <ApiOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                <div>
                  <Text type="secondary">No API keys configured yet.</Text>
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  style={{ marginTop: 16 }}
                  onClick={() => setShowAddForm(true)}
                >
                  Add Your First Key
                </Button>
              </div>
            ),
          }}
        />

        {apiKeys.length > 0 && !showAddForm && (
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setShowAddForm(true)}
            style={{ marginTop: 16 }}
            block
          >
            Add Another Provider
          </Button>
        )}
      </Card>

      {/* Add Key Form */}
      {showAddForm && (
        <Card
          title="Add API Key"
          extra={
            <Button type="text" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddKey}
            initialValues={{ provider: 'anthropic' }}
          >
            <Form.Item
              name="provider"
              label="Provider"
              rules={[{ required: true, message: 'Please select a provider' }]}
            >
              <Select
                size="large"
                onChange={(value: LLMProvider) => {
                  setSelectedProvider(value);
                  form.setFieldValue('model', PROVIDER_INFO[value].defaultModel);
                }}
                options={[
                  { value: 'anthropic', label: 'Anthropic (Claude)' },
                  { value: 'openai', label: 'OpenAI (GPT)' },
                  { value: 'google', label: 'Google AI (Gemini)' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="apiKey"
              label="API Key"
              rules={[{ required: true, message: 'Please enter your API key' }]}
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Key should start with "{providerInfo.keyPrefix}"
                </Text>
              }
            >
              <Input.Password
                size="large"
                placeholder={`${providerInfo.keyPrefix}...`}
                prefix={<KeyOutlined />}
              />
            </Form.Item>

            <Form.Item
              name="model"
              label="Default Model"
              initialValue={providerInfo.defaultModel}
            >
              <Select
                size="large"
                options={providerInfo.models.map(model => ({
                  value: model,
                  label: model,
                }))}
              />
            </Form.Item>

            <Divider />

            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={isSubmitting} icon={<SafetyOutlined />}>
                  Save Securely
                </Button>
                <Button onClick={() => setShowAddForm(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* Provider Info Cards */}
      <div style={{ marginTop: 24 }}>
        <Title level={5}>Supported Providers</Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Anthropic (Claude)</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Best for creative and nuanced responses. Claude Sonnet offers excellent quality-to-speed ratio.
              </Text>
              <Button
                type="link"
                size="small"
                style={{ padding: 0 }}
                onClick={() => window.open('https://console.anthropic.com/settings/keys', '_blank')}
              >
                Get API Key →
              </Button>
            </Space>
          </Card>

          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>OpenAI (GPT)</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Versatile and widely-used. GPT-4o provides great performance across various tasks.
              </Text>
              <Button
                type="link"
                size="small"
                style={{ padding: 0 }}
                onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
              >
                Get API Key →
              </Button>
            </Space>
          </Card>

          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Google AI (Gemini)</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Google's latest models with strong multimodal capabilities and competitive pricing.
              </Text>
              <Button
                type="link"
                size="small"
                style={{ padding: 0 }}
                onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
              >
                Get API Key →
              </Button>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AccountTab() {
  const { user } = useAuthStore();

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Account Settings</Title>

      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text type="secondary">Email</Text>
            <div>
              <Text strong>{user?.email}</Text>
            </div>
          </div>

          <div>
            <Text type="secondary">Name</Text>
            <div>
              <Text strong>{user?.name || 'Not set'}</Text>
            </div>
          </div>

          <div>
            <Text type="secondary">Role</Text>
            <div>
              <Tag color={user?.role === 'admin' ? 'gold' : 'blue'}>
                {user?.role?.toUpperCase()}
              </Tag>
            </div>
          </div>

          <div>
            <Text type="secondary">Member Since</Text>
            <div>
              <Text>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</Text>
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState('api-keys');

  const items = [
    {
      key: 'api-keys',
      label: (
        <Space>
          <KeyOutlined />
          API Keys
        </Space>
      ),
      children: <ApiKeysTab />,
    },
    {
      key: 'account',
      label: (
        <Space>
          <SafetyOutlined />
          Account
        </Space>
      ),
      children: <AccountTab />,
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Settings</Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        tabPosition="left"
        style={{ minHeight: 400 }}
      />
    </div>
  );
}

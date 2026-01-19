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
  Modal,
  AutoComplete,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('anthropic');
  const [customModel, setCustomModel] = useState('');

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

  const openModal = () => {
    setSelectedProvider('anthropic');
    setCustomModel('');
    form.resetFields();
    form.setFieldsValue({
      provider: 'anthropic',
      model: PROVIDER_INFO['anthropic'].defaultModel,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setCustomModel('');
  };

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
        model: values.model || customModel || PROVIDER_INFO[values.provider].defaultModel,
      });
      message.success(`${PROVIDER_INFO[values.provider].name} API key saved securely`);
      closeModal();
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

  const handleProviderChange = (provider: LLMProvider) => {
    setSelectedProvider(provider);
    const defaultModel = PROVIDER_INFO[provider].defaultModel;
    form.setFieldValue('model', defaultModel);
    setCustomModel(defaultModel);
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

  // Create model options for autocomplete
  const modelOptions = providerInfo.models.map(model => ({
    value: model,
    label: model,
  }));

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
      <Card
        title="Configured Providers"
        style={{ marginBottom: 24 }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
            Add Provider
          </Button>
        }
      >
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
                  onClick={openModal}
                >
                  Add Your First Key
                </Button>
              </div>
            ),
          }}
        />
      </Card>

      {/* Add Provider Modal */}
      <Modal
        title={
          <Space>
            <KeyOutlined />
            <span>Add API Key</span>
          </Space>
        }
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddKey}
          initialValues={{ provider: 'anthropic', model: PROVIDER_INFO['anthropic'].defaultModel }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="provider"
            label="Provider"
            rules={[{ required: true, message: 'Please select a provider' }]}
          >
            <Select
              size="large"
              onChange={handleProviderChange}
              options={[
                { value: 'anthropic', label: 'Anthropic (Claude)' },
                { value: 'openai', label: 'OpenAI (GPT)' },
                { value: 'google', label: 'Google AI (Gemini)' },
              ]}
            />
          </Form.Item>

          <Alert
            message={providerInfo.description}
            type="info"
            style={{ marginBottom: 16 }}
            action={
              <Button
                type="link"
                size="small"
                onClick={() => {
                  const urls: Record<LLMProvider, string> = {
                    anthropic: 'https://console.anthropic.com/settings/keys',
                    openai: 'https://platform.openai.com/api-keys',
                    google: 'https://aistudio.google.com/app/apikey',
                  };
                  window.open(urls[selectedProvider], '_blank');
                }}
              >
                Get Key →
              </Button>
            }
          />

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
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                Select a model or type a custom model name
              </Text>
            }
          >
            <AutoComplete
              size="large"
              options={modelOptions}
              value={customModel}
              onChange={setCustomModel}
              placeholder="Select or enter model name"
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={closeModal}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={isSubmitting} icon={<SafetyOutlined />}>
                Save Securely
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Provider Info Cards */}
      <div style={{ marginTop: 24 }}>
        <Title level={5}>Supported Providers</Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {(['anthropic', 'openai', 'google'] as LLMProvider[]).map(provider => {
            const info = PROVIDER_INFO[provider];
            const urls: Record<LLMProvider, string> = {
              anthropic: 'https://console.anthropic.com/settings/keys',
              openai: 'https://platform.openai.com/api-keys',
              google: 'https://aistudio.google.com/app/apikey',
            };
            const hasKey = apiKeys.some(k => k.provider === provider);

            return (
              <Card
                size="small"
                key={provider}
                style={{ borderColor: hasKey ? '#52c41a' : undefined }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Text strong>{info.name}</Text>
                    {hasKey && <Tag color="green" style={{ margin: 0 }}>Configured</Tag>}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {info.description}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Models: {info.models.slice(0, 3).join(', ')}...
                  </Text>
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0 }}
                    onClick={() => window.open(urls[provider], '_blank')}
                  >
                    Get API Key →
                  </Button>
                </Space>
              </Card>
            );
          })}
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

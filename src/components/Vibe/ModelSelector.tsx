/**
 * ModelSelector - Dropdown to select LLM provider and model for generation
 */

import React, { useState, useEffect } from 'react';
import { Select, Space, Typography, Tooltip, Tag } from 'antd';
import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  PROVIDER_INFO,
  getApiKeys,
  getActiveProvider,
  setActiveProvider,
  type LLMProvider,
  type ApiKeyConfig,
} from '../../services/apiKeysService';

const { Text } = Typography;

interface ModelSelectorProps {
  onChange?: (provider: LLMProvider, model: string) => void;
  size?: 'small' | 'middle' | 'large';
  showLabel?: boolean;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  onChange,
  size = 'small',
  showLabel = true,
  disabled = false,
}) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load API keys and active provider on mount
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const keys = await getApiKeys();
        setApiKeys(keys);

        const activeProvider = await getActiveProvider();
        if (activeProvider) {
          setSelectedProvider(activeProvider);
          const activeKey = keys.find(k => k.provider === activeProvider);
          setSelectedModel(activeKey?.model || PROVIDER_INFO[activeProvider].defaultModel);
        } else if (keys.length > 0) {
          // Default to first configured provider
          const firstKey = keys[0];
          setSelectedProvider(firstKey.provider);
          setSelectedModel(firstKey.model || PROVIDER_INFO[firstKey.provider].defaultModel);
        }
      } catch (err) {
        console.error('Error loading API keys:', err);
      } finally {
        setLoading(false);
      }
    };

    loadKeys();
  }, []);

  // Get providers that have API keys configured
  const configuredProviders = apiKeys.map(k => k.provider);

  // Build options for the select
  const options = Object.entries(PROVIDER_INFO).map(([provider, info]) => {
    const hasKey = configuredProviders.includes(provider as LLMProvider);
    return {
      label: (
        <Space>
          <span>{info.name}</span>
          {!hasKey && (
            <Tag color="warning" style={{ fontSize: 10, padding: '0 4px', marginLeft: 4 }}>
              No key
            </Tag>
          )}
        </Space>
      ),
      value: provider,
      disabled: !hasKey,
      provider: provider as LLMProvider,
      models: info.models,
      defaultModel: info.defaultModel,
    };
  });

  const handleProviderChange = async (provider: LLMProvider) => {
    setSelectedProvider(provider);
    const defaultModel = PROVIDER_INFO[provider].defaultModel;
    const keyConfig = apiKeys.find(k => k.provider === provider);
    const model = keyConfig?.model || defaultModel;
    setSelectedModel(model);

    // Persist the selection
    await setActiveProvider(provider);

    onChange?.(provider, model);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    if (selectedProvider) {
      onChange?.(selectedProvider, model);
    }
  };

  // Get models for current provider
  const currentModels = selectedProvider
    ? PROVIDER_INFO[selectedProvider].models
    : [];

  if (loading) {
    return (
      <Space size={4}>
        {showLabel && <Text type="secondary" style={{ fontSize: 12 }}>Model:</Text>}
        <Select
          size={size}
          loading
          disabled
          style={{ width: 120 }}
          placeholder="Loading..."
        />
      </Space>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <Tooltip title="Add an API key in Settings to use AI generation">
        <Space size={4}>
          {showLabel && <Text type="secondary" style={{ fontSize: 12 }}>Model:</Text>}
          <Tag color="warning" icon={<RobotOutlined />}>
            No API key
          </Tag>
        </Space>
      </Tooltip>
    );
  }

  return (
    <Space size={4}>
      {showLabel && (
        <Tooltip title="Select AI model for generation">
          <Text type="secondary" style={{ fontSize: 12 }}>
            <ThunderboltOutlined style={{ marginRight: 4 }} />
            Model:
          </Text>
        </Tooltip>
      )}
      <Select
        size={size}
        value={selectedProvider}
        onChange={handleProviderChange}
        options={options}
        disabled={disabled}
        style={{ width: 110 }}
        popupMatchSelectWidth={false}
      />
      <Select
        size={size}
        value={selectedModel}
        onChange={handleModelChange}
        disabled={disabled || !selectedProvider}
        style={{ width: 180 }}
        options={currentModels.map(model => ({
          label: model,
          value: model,
        }))}
        popupMatchSelectWidth={false}
      />
    </Space>
  );
};

export default ModelSelector;

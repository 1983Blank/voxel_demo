/**
 * PromptInputPanel - Input for user prompt and context selection
 */

import React, { useState } from 'react';
import { Card, Input, Button, Select, Space, Typography, Tooltip, Alert } from 'antd';
import {
  ThunderboltOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface ProductContext {
  id: string;
  name: string;
  type: string;
}

interface PromptInputPanelProps {
  onSubmit: (prompt: string, contextId?: string) => void;
  isLoading?: boolean;
  productContexts?: ProductContext[];
  disabled?: boolean;
  placeholder?: string;
  defaultPrompt?: string;
}

// Example prompts for inspiration
const EXAMPLE_PROMPTS = [
  'Make the design more modern with a dark theme',
  'Simplify the navigation and improve readability',
  'Add a hero section with a call-to-action button',
  'Make it more vibrant with gradient backgrounds',
  'Optimize for mobile with larger touch targets',
  'Add subtle animations and hover effects',
];

export const PromptInputPanel: React.FC<PromptInputPanelProps> = ({
  onSubmit,
  isLoading = false,
  productContexts = [],
  disabled = false,
  placeholder = 'Describe how you want to transform this design...',
  defaultPrompt = '',
}) => {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [selectedContext, setSelectedContext] = useState<string | undefined>(undefined);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    onSubmit(prompt.trim(), selectedContext);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  const insertExample = (example: string) => {
    setPrompt(example);
  };

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          <span>Design Prompt</span>
          <Tooltip title="Describe how you want the AI to transform your design. Be specific about colors, layout, components, or overall style.">
            <QuestionCircleOutlined style={{ color: '#999', cursor: 'help' }} />
          </Tooltip>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Prompt Input */}
        <div>
          <TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={4}
            disabled={disabled || isLoading}
            style={{ resize: 'vertical' }}
          />
          <div style={{ marginTop: 4, textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Press <kbd style={{ padding: '2px 4px', background: '#f0f0f0', borderRadius: 2 }}>Cmd</kbd> + <kbd style={{ padding: '2px 4px', background: '#f0f0f0', borderRadius: 2 }}>Enter</kbd> to generate
            </Text>
          </div>
        </div>

        {/* Example Prompts */}
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
            Need inspiration? Try one of these:
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {EXAMPLE_PROMPTS.map((example, i) => (
              <Button
                key={i}
                size="small"
                type="dashed"
                onClick={() => insertExample(example)}
                disabled={disabled || isLoading}
                style={{ fontSize: 11 }}
              >
                {example.length > 30 ? example.slice(0, 30) + '...' : example}
              </Button>
            ))}
          </div>
        </div>

        {/* Product Context Selection */}
        {productContexts.length > 0 && (
          <div>
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
              <FileTextOutlined style={{ marginRight: 4 }} />
              Include product context (optional)
            </Text>
            <Select
              value={selectedContext}
              onChange={setSelectedContext}
              placeholder="Select product context..."
              allowClear
              style={{ width: '100%' }}
              disabled={disabled || isLoading}
              options={productContexts.map((ctx) => ({
                value: ctx.id,
                label: (
                  <Space>
                    <span>{ctx.name}</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ({ctx.type})
                    </Text>
                  </Space>
                ),
              }))}
            />
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={handleSubmit}
          loading={isLoading}
          disabled={disabled || !prompt.trim()}
          block
          size="large"
        >
          {isLoading ? 'Generating Plan...' : 'Generate 4 Variants'}
        </Button>

        {/* Info Alert */}
        <Alert
          type="info"
          showIcon
          message={
            <Text style={{ fontSize: 12 }}>
              The AI will create 4 different design concepts based on your prompt.
              You'll review them before any code is generated.
            </Text>
          }
          style={{ marginTop: 8 }}
        />
      </Space>
    </Card>
  );
};

export default PromptInputPanel;

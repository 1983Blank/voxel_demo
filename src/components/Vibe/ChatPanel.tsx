/**
 * ChatPanel - Chat-style interface for vibe coding prompts and responses
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Space, Typography, Divider } from 'antd';
import { SendOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { ChatMessage, type ChatMessageData } from './ChatMessage';

const { TextArea } = Input;
const { Text } = Typography;

// Example prompts for quick input
const EXAMPLE_PROMPTS = [
  'Make it more modern with a dark theme',
  'Simplify the navigation',
  'Add a hero section with CTA',
  'Make colors more vibrant',
];

interface ChatPanelProps {
  messages: ChatMessageData[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isLoading,
  disabled = false,
  placeholder = 'Describe your design changes...',
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading || disabled) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExampleClick = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const hasMessages = messages.length > 0;

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#764ba2' }} />
          <span>Vibe Chat</span>
        </Space>
      }
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      bodyStyle={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
      }}
    >
      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          minHeight: 0,
        }}
      >
        {!hasMessages && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <ThunderboltOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <div>
              <Text type="secondary">
                Start by describing how you want to transform the design
              </Text>
            </div>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                The AI will create 4 different variant concepts based on your prompt
              </Text>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          borderTop: '1px solid #f0f0f0',
          padding: '12px 16px',
          backgroundColor: '#fafafa',
        }}
      >
        {/* Example prompts - only show when no messages */}
        {!hasMessages && (
          <>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Try an example:
              </Text>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <Button
                  key={i}
                  size="small"
                  type="dashed"
                  onClick={() => handleExampleClick(prompt)}
                  disabled={disabled || isLoading}
                  style={{ fontSize: 11 }}
                >
                  {prompt.length > 25 ? prompt.slice(0, 25) + '...' : prompt}
                </Button>
              ))}
            </div>
            <Divider style={{ margin: '8px 0' }} />
          </>
        )}

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <TextArea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ flex: 1, resize: 'none' }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={isLoading}
            disabled={disabled || !inputValue.trim()}
            style={{ height: 'auto', minHeight: 32 }}
          />
        </div>

        <div style={{ marginTop: 4, textAlign: 'right' }}>
          <Text type="secondary" style={{ fontSize: 10 }}>
            <kbd style={{ padding: '1px 4px', background: '#fff', borderRadius: 2, border: '1px solid #d9d9d9' }}>
              ⌘
            </kbd>
            {' + '}
            <kbd style={{ padding: '1px 4px', background: '#fff', borderRadius: 2, border: '1px solid #d9d9d9' }}>
              Enter
            </kbd>
            {' to send'}
          </Text>
        </div>
      </div>
    </Card>
  );
};

export default ChatPanel;

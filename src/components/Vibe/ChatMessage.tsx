/**
 * ChatMessage - Individual chat message component for the vibe coding interface
 */

import React from 'react';
import { Typography, Space, Spin, Tag } from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'pending' | 'complete' | 'error';
  metadata?: {
    variantIndex?: number;
    stage?: string;
  };
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isPending = message.status === 'pending';
  const isError = message.status === 'error';

  const getIcon = () => {
    if (isPending) return <LoadingOutlined style={{ fontSize: 16 }} />;
    if (isError) return <ExclamationCircleOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />;
    if (isUser) return <UserOutlined style={{ fontSize: 16 }} />;
    if (isSystem) return <InfoCircleOutlined style={{ fontSize: 16 }} />;
    return <RobotOutlined style={{ fontSize: 16 }} />;
  };

  const getBubbleStyle = (): React.CSSProperties => {
    if (isUser) {
      return {
        backgroundColor: '#1890ff',
        color: '#fff',
        borderRadius: '16px 16px 4px 16px',
      };
    }
    if (isSystem) {
      return {
        backgroundColor: '#f0f5ff',
        color: '#1d39c4',
        borderRadius: '8px',
        border: '1px solid #d6e4ff',
      };
    }
    if (isError) {
      return {
        backgroundColor: '#fff2f0',
        color: '#cf1322',
        borderRadius: '16px 16px 16px 4px',
        border: '1px solid #ffccc7',
      };
    }
    return {
      backgroundColor: '#f5f5f5',
      color: '#262626',
      borderRadius: '16px 16px 16px 4px',
    };
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 8,
        marginBottom: 12,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: isUser ? '#1890ff' : isSystem ? '#e6f4ff' : '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: isUser ? '#fff' : '#595959',
        }}
      >
        {getIcon()}
      </div>

      <div
        style={{
          maxWidth: '80%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            ...getBubbleStyle(),
          }}
        >
          {isPending && (
            <Space style={{ marginBottom: 4 }}>
              <Spin size="small" />
            </Space>
          )}
          <Text
            style={{
              color: 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {message.content}
          </Text>
          {message.metadata?.variantIndex && (
            <Tag
              color="blue"
              style={{ marginTop: 8, marginBottom: 0, display: 'inline-block' }}
            >
              Variant {message.metadata.variantIndex}
            </Tag>
          )}
        </div>

        <Text
          type="secondary"
          style={{
            fontSize: 11,
            marginTop: 4,
            paddingLeft: isUser ? 0 : 4,
            paddingRight: isUser ? 4 : 0,
          }}
        >
          {formatTime(message.timestamp)}
          {message.status === 'complete' && (
            <CheckCircleOutlined style={{ marginLeft: 4, color: '#52c41a' }} />
          )}
        </Text>
      </div>
    </div>
  );
};

export default ChatMessage;

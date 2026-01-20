/**
 * GenerationProgress - Progress bar with variant generation status
 */

import React from 'react';
import { Card, Progress, Typography, Space, Tag, Steps, Spin, Alert } from 'antd';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { getVibeVariantColor, getVibeVariantLabel } from '../../store/vibeStore';
import type { VibeVariant } from '../../services/variantCodeService';
import type { VariantPlan } from '../../services/variantPlanService';

const { Title, Text } = Typography;

interface GenerationProgressProps {
  plans: VariantPlan[];
  variants: VibeVariant[];
  currentVariantIndex?: number;
  currentMessage?: string;
  overallPercent?: number;
  error?: string | null;
}

const getVariantIcon = (status: string | undefined) => {
  switch (status) {
    case 'complete':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'generating':
    case 'capturing':
      return <LoadingOutlined spin style={{ color: '#1890ff' }} />;
    case 'failed':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    default:
      return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
  }
};

const getStepStatus = (status: string | undefined): 'wait' | 'process' | 'finish' | 'error' => {
  switch (status) {
    case 'complete':
      return 'finish';
    case 'generating':
    case 'capturing':
      return 'process';
    case 'failed':
      return 'error';
    default:
      return 'wait';
  }
};

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  plans,
  variants,
  currentVariantIndex,
  currentMessage,
  overallPercent = 0,
  error,
}) => {
  // Build variant status map
  const variantStatusMap = new Map(variants.map((v) => [v.variant_index, v]));

  // Calculate completed count
  const completedCount = variants.filter((v) => v.status === 'complete').length;
  const totalCount = 4;

  // Build steps data
  const steps = plans.map((plan) => {
    const variant = variantStatusMap.get(plan.variant_index);
    const color = getVibeVariantColor(plan.variant_index);
    const label = getVibeVariantLabel(plan.variant_index);
    const status = variant?.status || 'pending';
    const isActive = plan.variant_index === currentVariantIndex;

    return {
      key: plan.variant_index,
      title: (
        <Space>
          <Tag color={color} style={{ marginRight: 0 }}>
            {plan.variant_index}
          </Tag>
          <span style={{ fontWeight: isActive ? 600 : 400 }}>{label}</span>
        </Space>
      ),
      description: (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {plan.title}
          </Text>
          {variant?.generation_duration_ms && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              Generated in {(variant.generation_duration_ms / 1000).toFixed(1)}s
            </Text>
          )}
        </div>
      ),
      status: getStepStatus(status),
      icon: getVariantIcon(status),
    };
  });

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <CodeOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
          <Title level={4} style={{ marginBottom: 4 }}>
            Generating Variants
          </Title>
          <Text type="secondary">
            {completedCount === totalCount
              ? 'All variants generated successfully!'
              : `${completedCount} of ${totalCount} variants complete`}
          </Text>
        </div>

        {/* Overall Progress */}
        <div>
          <Progress
            percent={Math.round(overallPercent)}
            status={error ? 'exception' : completedCount === totalCount ? 'success' : 'active'}
            strokeColor={{
              '0%': '#1890ff',
              '100%': '#52c41a',
            }}
          />
          {currentMessage && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Spin size="small" style={{ marginRight: 8 }} />
              <Text type="secondary">{currentMessage}</Text>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            type="error"
            message="Generation Error"
            description={error}
            showIcon
          />
        )}

        {/* Variant Steps */}
        <Steps
          direction="vertical"
          size="small"
          current={currentVariantIndex ? currentVariantIndex - 1 : -1}
          items={steps}
        />

        {/* Completion Message */}
        {completedCount === totalCount && !error && (
          <Alert
            type="success"
            message="All variants generated!"
            description="Click on any variant to preview and compare."
            showIcon
            icon={<CheckCircleOutlined />}
          />
        )}
      </Space>
    </Card>
  );
};

export default GenerationProgress;

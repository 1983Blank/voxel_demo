/**
 * PlanReviewGrid - Grid of 4 variant plan cards for review
 */

import React from 'react';
import { Row, Col, Typography, Button, Space, Alert, Card, Spin, Empty } from 'antd';
import {
  CheckCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { VariantPlanCard } from './VariantPlanCard';
import type { VariantPlan } from '../../services/variantPlanService';

const { Title, Text } = Typography;

interface PlanReviewGridProps {
  plans: VariantPlan[];
  onUpdatePlan?: (variantIndex: number, updates: Partial<VariantPlan>) => void;
  onApprove?: () => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
  loadingMessage?: string;
  isApproved?: boolean;
  modelInfo?: { model: string; provider: string };
  compact?: boolean;
}

export const PlanReviewGrid: React.FC<PlanReviewGridProps> = ({
  plans,
  onUpdatePlan,
  onApprove,
  onRegenerate,
  isLoading = false,
  loadingMessage,
  isApproved = false,
  modelInfo,
  compact = false,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Title level={4} style={{ marginBottom: 8 }}>
              AI is designing your variants...
            </Title>
            <Text type="secondary">
              {loadingMessage || 'This may take a moment'}
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  // Empty state
  if (plans.length === 0) {
    return (
      <Card>
        <Empty
          description="No variant plans generated yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  // Sort plans by variant_index
  const sortedPlans = [...plans].sort((a, b) => a.variant_index - b.variant_index);

  // Compact mode - just the grid, no header or actions
  if (compact) {
    return (
      <Row gutter={[12, 12]}>
        {sortedPlans.map((plan) => (
          <Col key={plan.id} xs={24} sm={12} lg={6}>
            <VariantPlanCard
              plan={plan}
              onUpdate={(updates) => onUpdatePlan?.(plan.variant_index, updates)}
              isEditable={!isApproved}
              compact
            />
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              <RocketOutlined style={{ marginRight: 8 }} />
              Review Variant Plans
            </Title>
            <Text type="secondary">
              Review and edit the AI-generated concepts before generating code
            </Text>
            {modelInfo && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Generated with {modelInfo.model} ({modelInfo.provider})
                </Text>
              </div>
            )}
          </div>

          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={onRegenerate}
              disabled={isApproved}
            >
              Regenerate
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={onApprove}
              disabled={isApproved}
              size="large"
            >
              {isApproved ? 'Approved' : 'Approve & Generate Code'}
            </Button>
          </Space>
        </Space>
      </div>

      {/* Approved Alert */}
      {isApproved && (
        <Alert
          type="success"
          message="Plan approved! Generating variant code..."
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Plans Grid */}
      <Row gutter={[16, 16]}>
        {sortedPlans.map((plan) => (
          <Col key={plan.id} xs={24} sm={12} lg={6}>
            <VariantPlanCard
              plan={plan}
              onUpdate={(updates) => onUpdatePlan?.(plan.variant_index, updates)}
              isEditable={!isApproved}
            />
          </Col>
        ))}
      </Row>

      {/* Help Text */}
      {!isApproved && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Click the edit icon on any card to customize the plan before generating code.
            Changes will affect the final output.
          </Text>
        </div>
      )}
    </div>
  );
};

export default PlanReviewGrid;

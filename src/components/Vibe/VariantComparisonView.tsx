/**
 * VariantComparisonView - Grid/split/overlay comparison of generated variants
 */

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Tag, Space, Button, Segmented, Empty, Tooltip, Badge, Spin } from 'antd';
import {
  AppstoreOutlined,
  SplitCellsOutlined,
  BlockOutlined,
  EyeOutlined,
  CheckOutlined,
  TrophyOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import { getVibeVariantColor, getVibeVariantLabel } from '../../store/vibeStore';
import type { VibeVariant } from '../../services/variantCodeService';
import type { VariantPlan } from '../../services/variantPlanService';

const { Text, Title } = Typography;

type ComparisonMode = 'grid' | 'split' | 'overlay';

interface VariantComparisonViewProps {
  plans: VariantPlan[];
  variants: VibeVariant[];
  selectedVariantIndex: number | null;
  onSelectVariant: (index: number) => void;
  onPreviewVariant: (index: number) => void;
  comparisonMode: ComparisonMode;
  onChangeMode: (mode: ComparisonMode) => void;
  isGenerating?: boolean;
}

// Variant card for grid view
const VariantGridCard: React.FC<{
  plan: VariantPlan;
  variant?: VibeVariant;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}> = ({ plan, variant, isSelected, onSelect, onPreview }) => {
  const color = getVibeVariantColor(plan.variant_index);
  const label = getVibeVariantLabel(plan.variant_index);
  const isComplete = variant?.status === 'complete';
  const isLoading = variant?.status === 'generating' || variant?.status === 'capturing';

  return (
    <Card
      hoverable={isComplete}
      onClick={isComplete ? onSelect : undefined}
      style={{
        height: '100%',
        borderColor: isSelected ? color : undefined,
        borderWidth: isSelected ? 2 : 1,
        boxShadow: isSelected ? `0 0 12px ${color}40` : undefined,
        cursor: isComplete ? 'pointer' : 'default',
      }}
      bodyStyle={{ padding: 12 }}
    >
      {/* Header */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Badge
            count={isSelected ? <TrophyOutlined style={{ color: '#faad14' }} /> : null}
            offset={[-5, 5]}
          >
            <Tag color={color}>{plan.variant_index}</Tag>
          </Badge>
          <Text strong>{label}</Text>
        </Space>
        {isComplete && (
          <Space size="small">
            <Tooltip title="Preview in fullscreen">
              <Button
                type="text"
                size="small"
                icon={<ExpandOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
              />
            </Tooltip>
            {isSelected && (
              <Tag color="gold" icon={<CheckOutlined />}>
                Selected
              </Tag>
            )}
          </Space>
        )}
      </div>

      {/* Preview Area */}
      <div
        style={{
          backgroundColor: '#f5f5f5',
          borderRadius: 8,
          height: 200,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.9)',
              zIndex: 1,
            }}
          >
            <Spin />
          </div>
        )}
        {isComplete && variant?.html_url && (
          <iframe
            src={variant.html_url}
            title={`Variant ${plan.variant_index} preview`}
            style={{
              width: '200%',
              height: '200%',
              border: 'none',
              transform: 'scale(0.5)',
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          />
        )}
        {!isComplete && !isLoading && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text type="secondary">Pending...</Text>
          </div>
        )}
      </div>

      {/* Plan Title */}
      <div style={{ marginTop: 12 }}>
        <Text strong style={{ fontSize: 13 }}>
          {plan.title}
        </Text>
        <Text
          type="secondary"
          style={{ fontSize: 12, display: 'block', marginTop: 4 }}
          ellipsis={{ tooltip: plan.description }}
        >
          {plan.description}
        </Text>
      </div>

      {/* Duration */}
      {variant?.generation_duration_ms && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Generated in {(variant.generation_duration_ms / 1000).toFixed(1)}s
          </Text>
        </div>
      )}
    </Card>
  );
};

export const VariantComparisonView: React.FC<VariantComparisonViewProps> = ({
  plans,
  variants,
  selectedVariantIndex,
  onSelectVariant,
  onPreviewVariant,
  comparisonMode,
  onChangeMode,
  isGenerating = false,
}) => {
  const [splitPair, setSplitPair] = useState<[number, number]>([1, 2]);

  // Build variant map
  const variantMap = new Map(variants.map((v) => [v.variant_index, v]));

  // Sort plans
  const sortedPlans = [...plans].sort((a, b) => a.variant_index - b.variant_index);

  // Check if any variants are complete
  const completedVariants = variants.filter((v) => v.status === 'complete');
  const hasCompleteVariants = completedVariants.length > 0;

  if (!hasCompleteVariants && !isGenerating) {
    return (
      <Card>
        <Empty description="No variants generated yet" />
      </Card>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            <EyeOutlined style={{ marginRight: 8 }} />
            Compare Variants
          </Title>
          <Text type="secondary">
            {completedVariants.length} of 4 variants ready • Click to select winner
          </Text>
        </div>

        <Segmented
          value={comparisonMode}
          onChange={(value) => onChangeMode(value as ComparisonMode)}
          options={[
            { value: 'grid', icon: <AppstoreOutlined />, label: 'Grid' },
            { value: 'split', icon: <SplitCellsOutlined />, label: 'Split' },
            { value: 'overlay', icon: <BlockOutlined />, label: 'Overlay', disabled: true },
          ]}
        />
      </div>

      {/* Grid View */}
      {comparisonMode === 'grid' && (
        <Row gutter={[16, 16]}>
          {sortedPlans.map((plan) => (
            <Col key={plan.id} xs={24} sm={12} lg={6}>
              <VariantGridCard
                plan={plan}
                variant={variantMap.get(plan.variant_index)}
                isSelected={selectedVariantIndex === plan.variant_index}
                onSelect={() => onSelectVariant(plan.variant_index)}
                onPreview={() => onPreviewVariant(plan.variant_index)}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Split View */}
      {comparisonMode === 'split' && (
        <div>
          {/* Split selector */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Text type="secondary">Compare:</Text>
              {[1, 2, 3, 4].map((idx) => (
                <Button
                  key={idx}
                  type={splitPair.includes(idx) ? 'primary' : 'default'}
                  size="small"
                  onClick={() => {
                    if (splitPair[0] === idx) {
                      setSplitPair([splitPair[1], idx]);
                    } else if (splitPair[1] === idx) {
                      setSplitPair([idx, splitPair[0]]);
                    } else {
                      setSplitPair([splitPair[0], idx]);
                    }
                  }}
                  style={{
                    backgroundColor: splitPair.includes(idx) ? getVibeVariantColor(idx) : undefined,
                    borderColor: getVibeVariantColor(idx),
                  }}
                >
                  {idx}
                </Button>
              ))}
            </Space>
          </div>

          {/* Split panels */}
          <Row gutter={16}>
            {splitPair.map((idx) => {
              const plan = sortedPlans.find((p) => p.variant_index === idx);
              const variant = variantMap.get(idx);

              if (!plan) return null;

              return (
                <Col key={idx} span={12}>
                  <Card
                    title={
                      <Space>
                        <Tag color={getVibeVariantColor(idx)}>{idx}</Tag>
                        <span>{getVibeVariantLabel(idx)}</span>
                      </Space>
                    }
                    extra={
                      <Button
                        type={selectedVariantIndex === idx ? 'primary' : 'default'}
                        size="small"
                        icon={selectedVariantIndex === idx ? <CheckOutlined /> : null}
                        onClick={() => onSelectVariant(idx)}
                      >
                        {selectedVariantIndex === idx ? 'Selected' : 'Select'}
                      </Button>
                    }
                    bodyStyle={{ padding: 0, height: 400 }}
                  >
                    {variant?.status === 'complete' && variant.html_url ? (
                      <iframe
                        src={variant.html_url}
                        title={`Variant ${idx} preview`}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      />
                    ) : (
                      <div
                        style={{
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Spin />
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      )}
    </div>
  );
};

export default VariantComparisonView;

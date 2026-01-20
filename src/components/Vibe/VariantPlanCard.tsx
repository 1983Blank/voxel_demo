/**
 * VariantPlanCard - Individual variant plan card with edit capability
 */

import React, { useState } from 'react';
import { Card, Typography, Tag, Space, Button, Input, List, Tooltip } from 'antd';
import {
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  BulbOutlined,
  UnorderedListOutlined,
  HighlightOutlined,
} from '@ant-design/icons';
import { getVibeVariantColor, getVibeVariantLabel } from '../../store/vibeStore';
import type { VariantPlan } from '../../services/variantPlanService';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface VariantPlanCardProps {
  plan: VariantPlan;
  onUpdate?: (updates: Partial<VariantPlan>) => void;
  isEditable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
}

export const VariantPlanCard: React.FC<VariantPlanCardProps> = ({
  plan,
  onUpdate,
  isEditable = true,
  isSelected = false,
  onSelect,
  compact = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(plan.title);
  const [editDescription, setEditDescription] = useState(plan.description);
  const [editKeyChanges, setEditKeyChanges] = useState(plan.key_changes.join('\n'));
  const [editStyleNotes, setEditStyleNotes] = useState(plan.style_notes || '');

  const color = getVibeVariantColor(plan.variant_index);
  const label = getVibeVariantLabel(plan.variant_index);

  const handleSave = () => {
    onUpdate?.({
      title: editTitle,
      description: editDescription,
      key_changes: editKeyChanges.split('\n').filter((line) => line.trim()),
      style_notes: editStyleNotes || null,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(plan.title);
    setEditDescription(plan.description);
    setEditKeyChanges(plan.key_changes.join('\n'));
    setEditStyleNotes(plan.style_notes || '');
    setIsEditing(false);
  };

  return (
    <Card
      size="small"
      hoverable={!!onSelect}
      onClick={onSelect}
      style={{
        borderColor: isSelected ? color : undefined,
        borderWidth: isSelected ? 2 : 1,
        boxShadow: isSelected ? `0 0 8px ${color}40` : undefined,
      }}
      title={
        <Space>
          <Tag color={color} style={{ marginRight: 0 }}>
            {plan.variant_index}
          </Tag>
          <Text strong style={{ fontSize: 13 }}>
            {label}
          </Text>
        </Space>
      }
      extra={
        isEditable && !isEditing && (
          <Tooltip title="Edit plan">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            />
          </Tooltip>
        )
      }
    >
      {isEditing ? (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {/* Title Edit */}
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Title
            </Text>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              size="small"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Description Edit */}
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Description
            </Text>
            <TextArea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              size="small"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Key Changes Edit */}
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Key Changes (one per line)
            </Text>
            <TextArea
              value={editKeyChanges}
              onChange={(e) => setEditKeyChanges(e.target.value)}
              rows={3}
              size="small"
              placeholder="Enter each change on a new line"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Style Notes Edit */}
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Style Notes
            </Text>
            <TextArea
              value={editStyleNotes}
              onChange={(e) => setEditStyleNotes(e.target.value)}
              rows={2}
              size="small"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Actions */}
          <Space style={{ marginTop: 8 }}>
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
            >
              Save
            </Button>
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
            >
              Cancel
            </Button>
          </Space>
        </Space>
      ) : compact ? (
        // Compact view - show only title and truncated description
        <div>
          <div style={{ marginBottom: 4 }}>
            <BulbOutlined style={{ color, marginRight: 6, fontSize: 12 }} />
            <Text strong style={{ fontSize: 12 }}>{plan.title}</Text>
          </div>
          <Paragraph
            type="secondary"
            style={{ fontSize: 11, marginBottom: 0 }}
            ellipsis={{ rows: 2 }}
          >
            {plan.description}
          </Paragraph>
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {/* Title */}
          <div>
            <BulbOutlined style={{ color, marginRight: 6 }} />
            <Text strong>{plan.title}</Text>
          </div>

          {/* Description */}
          <Paragraph
            type="secondary"
            style={{ fontSize: 12, marginBottom: 8 }}
            ellipsis={{ rows: 2, expandable: true }}
          >
            {plan.description}
          </Paragraph>

          {/* Key Changes */}
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <UnorderedListOutlined style={{ marginRight: 4 }} />
              Key Changes
            </Text>
            <List
              size="small"
              dataSource={plan.key_changes}
              renderItem={(change) => (
                <List.Item style={{ padding: '2px 0', borderBottom: 'none' }}>
                  <Text style={{ fontSize: 12 }}>• {change}</Text>
                </List.Item>
              )}
              style={{ marginLeft: 8 }}
            />
          </div>

          {/* Style Notes */}
          {plan.style_notes && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <HighlightOutlined style={{ marginRight: 4 }} />
                Style Notes
              </Text>
              <Paragraph
                style={{ fontSize: 12, marginBottom: 0, marginLeft: 8 }}
                ellipsis={{ rows: 2, expandable: true }}
              >
                {plan.style_notes}
              </Paragraph>
            </div>
          )}
        </Space>
      )}
    </Card>
  );
};

export default VariantPlanCard;

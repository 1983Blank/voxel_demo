/**
 * ScreenPreview - Iframe preview with variant tabs for vibe coding
 */

import React, { useMemo, useState } from 'react';
import { Card, Button, Space, Typography, Tag, Spin, Empty, Tooltip } from 'antd';
import {
  ExpandOutlined,
  ReloadOutlined,
  DesktopOutlined,
  TabletOutlined,
  MobileOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { getVibeVariantColor, getVibeVariantLabel } from '../../store/vibeStore';
import type { VibeVariant } from '../../services/variantCodeService';

const { Text } = Typography;

export type SelectedTab = 'source' | 1 | 2 | 3 | 4;

interface ScreenPreviewProps {
  sourceHtml: string | null;
  variants: VibeVariant[];
  selectedTab: SelectedTab;
  onTabChange: (tab: SelectedTab) => void;
  selectedVariantIndex?: number | null;
  onExpandPreview?: () => void;
  isGenerating?: boolean;
  currentGeneratingIndex?: number;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_SIZES: Record<ViewportSize, { width: string; label: string }> = {
  desktop: { width: '100%', label: 'Desktop' },
  tablet: { width: '768px', label: 'Tablet' },
  mobile: { width: '375px', label: 'Mobile' },
};

export const ScreenPreview: React.FC<ScreenPreviewProps> = ({
  sourceHtml,
  variants,
  selectedTab,
  onTabChange,
  selectedVariantIndex,
  onExpandPreview,
  isGenerating = false,
  currentGeneratingIndex,
}) => {
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [iframeKey, setIframeKey] = useState(0);

  // Build variant map for quick lookup
  const variantMap = useMemo(
    () => new Map(variants.map((v) => [v.variant_index, v])),
    [variants]
  );

  // Get content for current tab
  const getPreviewContent = (): { html?: string; url?: string; isLoading: boolean } => {
    if (selectedTab === 'source') {
      return { html: sourceHtml || undefined, isLoading: false };
    }

    const variant = variantMap.get(selectedTab);
    if (!variant) {
      return { isLoading: currentGeneratingIndex === selectedTab };
    }

    if (variant.status === 'generating' || variant.status === 'capturing') {
      return { isLoading: true };
    }

    if (variant.status === 'complete' && variant.html_url) {
      return { url: variant.html_url, isLoading: false };
    }

    return { isLoading: false };
  };

  const previewContent = getPreviewContent();

  const handleRefresh = () => {
    setIframeKey((k) => k + 1);
  };

  const getTabStatus = (tab: SelectedTab): 'pending' | 'generating' | 'complete' | 'source' => {
    if (tab === 'source') return 'source';
    const variant = variantMap.get(tab);
    if (!variant) {
      return currentGeneratingIndex === tab ? 'generating' : 'pending';
    }
    if (variant.status === 'generating' || variant.status === 'capturing') return 'generating';
    if (variant.status === 'complete') return 'complete';
    return 'pending';
  };

  const tabs: SelectedTab[] = ['source', 1, 2, 3, 4];

  return (
    <Card
      title={
        <Space>
          <DesktopOutlined />
          <span>Screen Preview</span>
          {selectedTab !== 'source' && (
            <Tag color={getVibeVariantColor(selectedTab as number)}>
              {getVibeVariantLabel(selectedTab as number)}
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space size="small">
          {/* Viewport selector */}
          <Button.Group size="small">
            <Tooltip title="Desktop">
              <Button
                type={viewport === 'desktop' ? 'primary' : 'default'}
                icon={<DesktopOutlined />}
                onClick={() => setViewport('desktop')}
              />
            </Tooltip>
            <Tooltip title="Tablet">
              <Button
                type={viewport === 'tablet' ? 'primary' : 'default'}
                icon={<TabletOutlined />}
                onClick={() => setViewport('tablet')}
              />
            </Tooltip>
            <Tooltip title="Mobile">
              <Button
                type={viewport === 'mobile' ? 'primary' : 'default'}
                icon={<MobileOutlined />}
                onClick={() => setViewport('mobile')}
              />
            </Tooltip>
          </Button.Group>

          <Tooltip title="Refresh preview">
            <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh} />
          </Tooltip>

          {onExpandPreview && (
            <Tooltip title="Expand preview">
              <Button size="small" icon={<ExpandOutlined />} onClick={onExpandPreview} />
            </Tooltip>
          )}
        </Space>
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
      }}
    >
      {/* Preview Area */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#e8e8e8',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: 16,
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: VIEWPORT_SIZES[viewport].width,
            maxWidth: '100%',
            height: '100%',
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {previewContent.isLoading ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa',
              }}
            >
              <Spin size="large" />
              <Text type="secondary" style={{ marginTop: 16 }}>
                {selectedTab === 'source'
                  ? 'Loading source...'
                  : `Generating Variant ${selectedTab}...`}
              </Text>
            </div>
          ) : previewContent.url || previewContent.html ? (
            <iframe
              key={iframeKey}
              src={previewContent.url || undefined}
              srcDoc={!previewContent.url ? (previewContent.html || sourceHtml || undefined) : undefined}
              title="Screen preview"
              sandbox="allow-scripts allow-same-origin"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
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
              <Empty
                description={
                  selectedTab === 'source'
                    ? 'No source HTML available'
                    : 'Variant not yet generated'
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}
        </div>
      </div>

      {/* Variant Tabs */}
      <div
        style={{
          borderTop: '1px solid #f0f0f0',
          padding: '8px 16px',
          backgroundColor: '#fafafa',
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
        }}
      >
        {tabs.map((tab) => {
          const status = getTabStatus(tab);
          const isActive = selectedTab === tab;
          const isSource = tab === 'source';
          const isSelected = !isSource && selectedVariantIndex === tab;

          // Tab is clickable if: source, complete, or currently generating (either this tab or any)
          const isClickable = isSource || status === 'complete' || status === 'generating' || isGenerating;

          return (
            <Button
              key={tab}
              type={isActive ? 'primary' : 'default'}
              size="small"
              onClick={() => onTabChange(tab)}
              disabled={!isClickable}
              style={{
                minWidth: isSource ? 70 : 44,
                borderColor: !isSource && !isActive ? getVibeVariantColor(tab as number) : undefined,
                position: 'relative',
              }}
            >
              {isSource ? (
                'Source'
              ) : (
                <Space size={4}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getVibeVariantColor(tab as number),
                    }}
                  />
                  <span>{tab}</span>
                  {status === 'generating' && <Spin size="small" />}
                  {status === 'complete' && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />}
                </Space>
              )}
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: '#faad14',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircleOutlined style={{ fontSize: 10, color: '#fff' }} />
                </div>
              )}
            </Button>
          );
        })}
      </div>
    </Card>
  );
};

export default ScreenPreview;

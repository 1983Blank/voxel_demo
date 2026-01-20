/**
 * VariantPreviewModal - Full-screen variant preview
 */

import React, { useState, useEffect } from 'react';
import { Modal, Typography, Tag, Space, Button, Spin, Tabs, Tooltip, message } from 'antd';
import {
  ExpandOutlined,
  CompressOutlined,
  CopyOutlined,
  DownloadOutlined,
  CodeOutlined,
  EyeOutlined,
  CheckOutlined,
  DesktopOutlined,
  TabletOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import { getVibeVariantColor, getVibeVariantLabel } from '../../store/vibeStore';
import type { VibeVariant } from '../../services/variantCodeService';
import type { VariantPlan } from '../../services/variantPlanService';

const { Title } = Typography;

interface VariantPreviewModalProps {
  open: boolean;
  onClose: () => void;
  variant: VibeVariant | null;
  plan: VariantPlan | null;
  onSelect?: () => void;
  isSelected?: boolean;
}

type ViewMode = 'preview' | 'code';
type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<DeviceMode, number> = {
  desktop: 1200,
  tablet: 768,
  mobile: 375,
};

export const VariantPreviewModal: React.FC<VariantPreviewModalProps> = ({
  open,
  onClose,
  variant,
  plan,
  onSelect,
  isSelected = false,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch HTML content when modal opens
  useEffect(() => {
    if (open && variant?.html_url && viewMode === 'code' && !htmlContent) {
      setIsLoading(true);
      fetch(variant.html_url)
        .then((res) => res.text())
        .then((html) => setHtmlContent(html))
        .catch((err) => console.error('Failed to fetch HTML:', err))
        .finally(() => setIsLoading(false));
    }
  }, [open, variant?.html_url, viewMode, htmlContent]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setHtmlContent(null);
      setViewMode('preview');
      setDeviceMode('desktop');
    }
  }, [open]);

  const handleCopyHtml = async () => {
    if (!htmlContent) return;
    await navigator.clipboard.writeText(htmlContent);
    message.success('HTML copied to clipboard');
  };

  const handleDownloadHtml = () => {
    if (!htmlContent || !variant) return;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variant_${variant.variant_index}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('HTML downloaded');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!variant || !plan) {
    return null;
  }

  const color = getVibeVariantColor(plan.variant_index);
  const label = getVibeVariantLabel(plan.variant_index);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={isFullscreen ? '100vw' : 1200}
      style={isFullscreen ? { top: 0, padding: 0, maxWidth: '100vw' } : undefined}
      bodyStyle={{
        padding: 0,
        height: isFullscreen ? 'calc(100vh - 55px)' : 600,
        overflow: 'hidden',
      }}
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Tag color={color} style={{ marginRight: 0 }}>
              {plan.variant_index}
            </Tag>
            <Title level={5} style={{ marginBottom: 0 }}>
              {label}: {plan.title}
            </Title>
          </Space>
          <Space>
            <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              <Button
                type="text"
                icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
                onClick={toggleFullscreen}
              />
            </Tooltip>
          </Space>
        </Space>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            {/* View Mode Toggle */}
            <Tabs
              activeKey={viewMode}
              onChange={(key) => setViewMode(key as ViewMode)}
              size="small"
              items={[
                { key: 'preview', label: <><EyeOutlined /> Preview</>, icon: null },
                { key: 'code', label: <><CodeOutlined /> Code</>, icon: null },
              ]}
              style={{ marginBottom: 0 }}
            />

            {/* Device Mode (only in preview) */}
            {viewMode === 'preview' && (
              <Space style={{ marginLeft: 16 }}>
                <Tooltip title="Desktop">
                  <Button
                    type={deviceMode === 'desktop' ? 'primary' : 'default'}
                    size="small"
                    icon={<DesktopOutlined />}
                    onClick={() => setDeviceMode('desktop')}
                  />
                </Tooltip>
                <Tooltip title="Tablet">
                  <Button
                    type={deviceMode === 'tablet' ? 'primary' : 'default'}
                    size="small"
                    icon={<TabletOutlined />}
                    onClick={() => setDeviceMode('tablet')}
                  />
                </Tooltip>
                <Tooltip title="Mobile">
                  <Button
                    type={deviceMode === 'mobile' ? 'primary' : 'default'}
                    size="small"
                    icon={<MobileOutlined />}
                    onClick={() => setDeviceMode('mobile')}
                  />
                </Tooltip>
              </Space>
            )}
          </Space>

          <Space>
            {viewMode === 'code' && (
              <>
                <Button icon={<CopyOutlined />} onClick={handleCopyHtml} disabled={!htmlContent}>
                  Copy HTML
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadHtml} disabled={!htmlContent}>
                  Download
                </Button>
              </>
            )}
            <Button
              type={isSelected ? 'default' : 'primary'}
              icon={isSelected ? <CheckOutlined /> : null}
              onClick={onSelect}
            >
              {isSelected ? 'Selected as Winner' : 'Select as Winner'}
            </Button>
          </Space>
        </div>
      }
    >
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: viewMode === 'preview' ? '#e8e8e8' : '#1e1e1e',
        }}
      >
        {/* Preview Mode */}
        {viewMode === 'preview' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: 20,
              overflow: 'auto',
            }}
          >
            <div
              style={{
                width: deviceMode === 'desktop' ? '100%' : DEVICE_WIDTHS[deviceMode],
                maxWidth: '100%',
                height: '100%',
                backgroundColor: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {variant.html_url ? (
                <iframe
                  src={variant.html_url}
                  title={`Variant ${plan.variant_index} preview`}
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
            </div>
          </div>
        )}

        {/* Code Mode */}
        {viewMode === 'code' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {isLoading ? (
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
            ) : (
              <pre
                style={{
                  margin: 0,
                  padding: 16,
                  color: '#d4d4d4',
                  fontSize: 12,
                  fontFamily: '"Fira Code", "Monaco", monospace',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {htmlContent}
              </pre>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default VariantPreviewModal;

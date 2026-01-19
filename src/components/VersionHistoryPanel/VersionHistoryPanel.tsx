import { useState } from 'react';
import {
  Timeline,
  Typography,
  Button,
  Tag,
  Modal,
  Space,
  Empty,
  Spin,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  RobotOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ScreenVersion } from '@/types';

const { Text, Paragraph } = Typography;

interface VersionHistoryPanelProps {
  versions: ScreenVersion[];
  currentVersionId?: string;
  currentHtml?: string;
  isLoading?: boolean;
  onPreview: (version: ScreenVersion) => void;
  onRestore: (version: ScreenVersion) => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function VersionHistoryPanel({
  versions,
  currentVersionId,
  currentHtml,
  isLoading,
  onPreview,
  onRestore,
}: VersionHistoryPanelProps) {
  const [previewVersion, setPreviewVersion] = useState<ScreenVersion | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handlePreview = (version: ScreenVersion) => {
    setPreviewVersion(version);
    setIsPreviewModalOpen(true);
    onPreview(version);
  };

  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    setPreviewVersion(null);
  };

  const handleRestore = (version: ScreenVersion) => {
    onRestore(version);
  };

  // Check if a version matches current HTML content
  const isCurrentVersion = (version: ScreenVersion): boolean => {
    if (currentVersionId && version.id === currentVersionId) return true;
    if (currentHtml && version.html === currentHtml) return true;
    return false;
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="small" />
        <Text type="secondary" style={{ marginLeft: 8, display: 'block', marginTop: 8 }}>
          Loading versions...
        </Text>
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text type="secondary">No version history yet</Text>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Text strong>Version History</Text>
        <Tag color="blue" style={{ marginLeft: 8 }}>
          {versions.length}
        </Tag>
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <Timeline
          items={versions.map((version, index) => {
            const isAI = !!version.prompt;
            const isCurrent = isCurrentVersion(version);
            const isLatest = index === 0;

            return {
              key: version.id,
              dot: isAI ? (
                <RobotOutlined style={{ fontSize: 14, color: '#764ba2' }} />
              ) : (
                <ClockCircleOutlined style={{ fontSize: 14, color: '#1890ff' }} />
              ),
              children: (
                <div style={{ marginBottom: 8 }}>
                  {/* Tags */}
                  <Space size={4} style={{ marginBottom: 4 }}>
                    {isLatest && <Tag color="green">Latest</Tag>}
                    {isCurrent && (
                      <Tag color="blue" icon={<CheckCircleOutlined />}>
                        Current
                      </Tag>
                    )}
                    {isAI && <Tag color="purple">AI</Tag>}
                  </Space>

                  {/* Description */}
                  <div style={{ marginBottom: 4 }}>
                    {version.prompt ? (
                      <Paragraph
                        ellipsis={{ rows: 2, expandable: false }}
                        style={{ margin: 0, fontSize: 12 }}
                      >
                        {version.prompt}
                      </Paragraph>
                    ) : version.description ? (
                      <Text style={{ fontSize: 12 }}>{version.description}</Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Manual edit
                      </Text>
                    )}
                  </div>

                  {/* Timestamp */}
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {formatTimeAgo(version.createdAt)}
                  </Text>

                  {/* Actions */}
                  <div style={{ marginTop: 8 }}>
                    <Space size={4}>
                      <Tooltip title="Preview this version">
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => handlePreview(version)}
                        >
                          Preview
                        </Button>
                      </Tooltip>
                      {!isCurrent && (
                        <Popconfirm
                          title="Restore this version?"
                          description="This will replace the current content with this version."
                          onConfirm={() => handleRestore(version)}
                          okText="Restore"
                          cancelText="Cancel"
                        >
                          <Tooltip title="Restore this version">
                            <Button
                              size="small"
                              icon={<RollbackOutlined />}
                            >
                              Restore
                            </Button>
                          </Tooltip>
                        </Popconfirm>
                      )}
                    </Space>
                  </div>
                </div>
              ),
            };
          })}
        />
      </div>

      {/* Preview Modal */}
      <Modal
        title={
          <Space>
            <Text strong>Version Preview</Text>
            {previewVersion?.prompt && <Tag color="purple">AI Generated</Tag>}
          </Space>
        }
        open={isPreviewModalOpen}
        onCancel={handleClosePreview}
        width={800}
        footer={[
          <Button key="close" onClick={handleClosePreview}>
            Close
          </Button>,
          previewVersion && !isCurrentVersion(previewVersion) && (
            <Popconfirm
              key="restore"
              title="Restore this version?"
              description="This will replace the current content with this version."
              onConfirm={() => {
                if (previewVersion) {
                  handleRestore(previewVersion);
                  handleClosePreview();
                }
              }}
              okText="Restore"
              cancelText="Cancel"
            >
              <Button type="primary" icon={<RollbackOutlined />}>
                Restore
              </Button>
            </Popconfirm>
          ),
        ].filter(Boolean)}
      >
        {previewVersion && (
          <div>
            {/* Version info */}
            <div style={{ marginBottom: 16 }}>
              {previewVersion.prompt && (
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">Prompt: </Text>
                  <Text>{previewVersion.prompt}</Text>
                </div>
              )}
              {previewVersion.description && (
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">Description: </Text>
                  <Text>{previewVersion.description}</Text>
                </div>
              )}
              <Text type="secondary">
                Created: {new Date(previewVersion.createdAt).toLocaleString()}
              </Text>
            </div>

            {/* Preview iframe */}
            <div
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                overflow: 'hidden',
                height: 400,
              }}
            >
              <iframe
                srcDoc={previewVersion.html}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                sandbox="allow-same-origin"
                title="Version preview"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

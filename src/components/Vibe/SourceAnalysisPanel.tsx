/**
 * SourceAnalysisPanel - Displays source preview and extracted UI metadata
 */

import React from 'react';
import { Card, Collapse, Tag, Typography, Space, Spin, Empty, Row, Col, Tooltip } from 'antd';
import {
  BgColorsOutlined,
  FontSizeOutlined,
  LayoutOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { UIMetadata } from '../../services/screenAnalyzerService';

const { Text } = Typography;
const { Panel } = Collapse;

interface SourceAnalysisPanelProps {
  sourceHtml: string | null;
  metadata: UIMetadata | null;
  screenshotUrl?: string | null;
  isAnalyzing?: boolean;
  analysisMessage?: string;
}

// Color swatch component
const ColorSwatch: React.FC<{ color: string }> = ({ color }) => (
  <Tooltip title={color}>
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: color,
        border: '1px solid #d9d9d9',
        display: 'inline-block',
        cursor: 'pointer',
      }}
    />
  </Tooltip>
);

// Color section component
const ColorSection: React.FC<{
  title: string;
  colors: string[];
}> = ({ title, colors }) => {
  if (!colors || colors.length === 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {title}
      </Text>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
        {colors.slice(0, 8).map((color, i) => (
          <ColorSwatch key={`${color}-${i}`} color={color} />
        ))}
      </div>
    </div>
  );
};

export const SourceAnalysisPanel: React.FC<SourceAnalysisPanelProps> = ({
  sourceHtml,
  metadata,
  screenshotUrl,
  isAnalyzing,
  analysisMessage,
}) => {
  if (isAnalyzing) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>{analysisMessage || 'Analyzing screen...'}</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!sourceHtml) {
    return (
      <Card>
        <Empty description="No source HTML loaded" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <AppstoreOutlined />
          <span>Source Analysis</span>
        </Space>
      }
      size="small"
    >
      {/* Screenshot Preview */}
      {screenshotUrl && (
        <div style={{ marginBottom: 16 }}>
          <img
            src={screenshotUrl}
            alt="Screen preview"
            style={{
              width: '100%',
              borderRadius: 8,
              border: '1px solid #d9d9d9',
            }}
          />
        </div>
      )}

      {/* HTML Size */}
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          HTML Size: {(sourceHtml.length / 1024).toFixed(1)} KB
        </Text>
      </div>

      {!metadata ? (
        <Empty description="No analysis data available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Collapse defaultActiveKey={['colors', 'components']} ghost size="small">
          {/* Colors */}
          <Panel
            header={
              <Space>
                <BgColorsOutlined />
                <span>Colors</span>
              </Space>
            }
            key="colors"
          >
            <ColorSection title="Primary" colors={metadata.colors.primary} />
            <ColorSection title="Secondary" colors={metadata.colors.secondary} />
            <ColorSection title="Background" colors={metadata.colors.background} />
            <ColorSection title="Text" colors={metadata.colors.text} />
            <ColorSection title="Accent" colors={metadata.colors.accent} />
          </Panel>

          {/* Typography */}
          <Panel
            header={
              <Space>
                <FontSizeOutlined />
                <span>Typography</span>
              </Space>
            }
            key="typography"
          >
            {metadata.typography.fontFamilies.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Font Families
                </Text>
                <div style={{ marginTop: 4 }}>
                  {metadata.typography.fontFamilies.slice(0, 5).map((font, i) => (
                    <Tag key={i} style={{ marginBottom: 4 }}>
                      {font}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
            {metadata.typography.fontSizes.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Font Sizes
                </Text>
                <div style={{ marginTop: 4 }}>
                  {metadata.typography.fontSizes.slice(0, 8).map((size, i) => (
                    <Tag key={i} style={{ marginBottom: 4 }}>
                      {size}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* Layout */}
          <Panel
            header={
              <Space>
                <LayoutOutlined />
                <span>Layout</span>
              </Space>
            }
            key="layout"
          >
            {metadata.layout.gridSystems.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Layout Systems
                </Text>
                <div style={{ marginTop: 4 }}>
                  {metadata.layout.gridSystems.map((system, i) => (
                    <Tag key={i} color="blue" style={{ marginBottom: 4 }}>
                      {system}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
            {metadata.layout.breakpoints.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Breakpoints
                </Text>
                <div style={{ marginTop: 4 }}>
                  {metadata.layout.breakpoints.map((bp, i) => (
                    <Tag key={i} style={{ marginBottom: 4 }}>
                      {bp}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* Components */}
          <Panel
            header={
              <Space>
                <AppstoreOutlined />
                <span>Components ({metadata.components.length})</span>
              </Space>
            }
            key="components"
          >
            <Row gutter={[8, 8]}>
              {metadata.components.slice(0, 12).map((comp, i) => (
                <Col key={i} span={12}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      backgroundColor: '#fafafa',
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ textTransform: 'capitalize' }}>{comp.type}</Text>
                    <Tag>{comp.count}</Tag>
                  </div>
                </Col>
              ))}
            </Row>
          </Panel>

          {/* Accessibility */}
          <Panel
            header={
              <Space>
                <SafetyCertificateOutlined />
                <span>Accessibility</span>
              </Space>
            }
            key="accessibility"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {metadata.accessibility.hasAriaLabels ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <WarningOutlined style={{ color: '#faad14' }} />
                )}
                <Text>
                  ARIA Labels: {metadata.accessibility.hasAriaLabels ? 'Present' : 'Missing'}
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {metadata.accessibility.hasAltText ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <WarningOutlined style={{ color: '#faad14' }} />
                )}
                <Text>
                  Alt Text: {metadata.accessibility.hasAltText ? 'Present' : 'Missing'}
                </Text>
              </div>
              {metadata.accessibility.semanticElements.length > 0 && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Semantic Elements
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    {metadata.accessibility.semanticElements.map((el, i) => (
                      <Tag key={i} color="green" style={{ marginBottom: 4 }}>
                        &lt;{el}&gt;
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </Space>
          </Panel>
        </Collapse>
      )}
    </Card>
  );
};

export default SourceAnalysisPanel;

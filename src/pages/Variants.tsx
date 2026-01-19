import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Space,
  Card,
  Empty,
  Typography,
  Tag,
  Modal,
  Input,
  Row,
  Col,
  Segmented,
  Dropdown,
  message,
  Spin,
  Statistic,
  Checkbox,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  EyeOutlined,
  ExperimentOutlined,
  AppstoreOutlined,
  SplitCellsOutlined,
  MoreOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useScreensStore } from '@/store/screensStore';
import { useVariantsStore, getVariantColor, type Variant } from '@/store/variantsStore';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

// Mock AI variant generation
const generateVariantHtml = (baseHtml: string, prompt: string): string => {
  // In a real implementation, this would call an AI API
  // For now, we'll make simple modifications based on keywords
  const parser = new DOMParser();
  const doc = parser.parseFromString(baseHtml, 'text/html');

  const promptLower = prompt.toLowerCase();

  // Apply mock transformations
  if (promptLower.includes('dark') || promptLower.includes('night')) {
    doc.body.style.backgroundColor = '#1a1a2e';
    doc.body.style.color = '#ffffff';
    doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      (el as HTMLElement).style.color = '#ffffff';
    });
  }

  if (promptLower.includes('colorful') || promptLower.includes('vibrant')) {
    doc.querySelectorAll('button').forEach((el, i) => {
      const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b'];
      (el as HTMLElement).style.background = colors[i % colors.length];
    });
  }

  if (promptLower.includes('minimal') || promptLower.includes('clean')) {
    doc.querySelectorAll('*').forEach((el) => {
      (el as HTMLElement).style.boxShadow = 'none';
      (el as HTMLElement).style.borderRadius = '0';
    });
  }

  if (promptLower.includes('rounded') || promptLower.includes('soft')) {
    doc.querySelectorAll('button, .card, div').forEach((el) => {
      const current = (el as HTMLElement).style.borderRadius;
      if (!current || current === '0') {
        (el as HTMLElement).style.borderRadius = '16px';
      }
    });
  }

  if (promptLower.includes('larger') || promptLower.includes('bigger')) {
    doc.querySelectorAll('button').forEach((el) => {
      (el as HTMLElement).style.padding = '16px 32px';
      (el as HTMLElement).style.fontSize = '18px';
    });
  }

  // Add a marker to show it's been modified
  const marker = doc.createElement('div');
  marker.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#764ba2;color:white;padding:4px 8px;border-radius:4px;font-size:11px;z-index:9999;';
  marker.textContent = `AI Generated: "${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}"`;
  doc.body.appendChild(marker);

  return doc.documentElement.outerHTML;
};

// Variant preview component
function VariantPreview({ variant, html }: { variant: Variant; html: string }) {
  return (
    <iframe
      srcDoc={html}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        pointerEvents: 'none',
      }}
      title={variant.name}
      sandbox="allow-same-origin"
    />
  );
}

// Variant card component
function VariantCard({
  variant,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
}: {
  variant: Variant;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
}) {
  const color = getVariantColor(variant.label);

  const menuItems: MenuProps['items'] = [
    {
      key: 'preview',
      icon: <EyeOutlined />,
      label: 'Preview',
      onClick: onPreview,
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit in Editor',
      onClick: onEdit,
    },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Duplicate',
      onClick: onDuplicate,
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      disabled: variant.isOriginal,
      onClick: onDelete,
    },
  ];

  return (
    <Card
      hoverable
      style={{
        height: '100%',
        borderColor: isSelected ? color : undefined,
        borderWidth: isSelected ? 2 : 1,
      }}
      title={
        <Space>
          <Checkbox checked={isSelected} onChange={onToggleSelect} />
          <Tag color={color} style={{ margin: 0 }}>
            {variant.label}
          </Tag>
          <Text strong>{variant.name}</Text>
          {variant.isOriginal && (
            <Tag color="default" style={{ margin: 0 }}>
              Original
            </Tag>
          )}
        </Space>
      }
      extra={
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} size="small" />
        </Dropdown>
      }
    >
      {/* Preview */}
      <div
        style={{
          height: 200,
          background: '#f5f5f5',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 16,
          cursor: 'pointer',
        }}
        onClick={onPreview}
      >
        <VariantPreview variant={variant} html={variant.html} />
      </div>

      {/* Stats */}
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="Views"
            value={variant.stats?.views || 0}
            valueStyle={{ fontSize: 16 }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Clicks"
            value={variant.stats?.clicks || 0}
            valueStyle={{ fontSize: 16 }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Avg Time"
            value={variant.stats?.avgTimeSpent || 0}
            suffix="s"
            valueStyle={{ fontSize: 16 }}
          />
        </Col>
      </Row>

      {/* AI prompt if generated */}
      {variant.prompt && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: '#f6f6f6',
            borderRadius: 4,
            fontSize: 11,
          }}
        >
          <Text type="secondary">
            <ExperimentOutlined /> {variant.prompt}
          </Text>
        </div>
      )}
    </Card>
  );
}

// Side-by-side comparison view
function ComparisonView({
  variants,
  onClose,
}: {
  variants: Variant[];
  onClose: () => void;
}) {
  return (
    <Modal
      open={true}
      onCancel={onClose}
      width="95vw"
      style={{ top: 20 }}
      title={
        <Space>
          <SplitCellsOutlined />
          <span>Side-by-Side Comparison</span>
          {variants.map((v) => (
            <Tag key={v.id} color={getVariantColor(v.label)}>
              {v.label}: {v.name}
            </Tag>
          ))}
        </Space>
      }
      footer={
        <Button onClick={onClose}>Close</Button>
      }
    >
      <Row gutter={16} style={{ height: 'calc(80vh - 100px)' }}>
        {variants.map((variant) => (
          <Col
            key={variant.id}
            span={24 / variants.length}
            style={{ height: '100%' }}
          >
            <Card
              size="small"
              title={
                <Space>
                  <Tag color={getVariantColor(variant.label)}>{variant.label}</Tag>
                  {variant.name}
                </Space>
              }
              style={{ height: '100%' }}
              bodyStyle={{ height: 'calc(100% - 40px)', padding: 0 }}
            >
              <iframe
                srcDoc={variant.html}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title={variant.name}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Modal>
  );
}

// AI Generation Modal
function GenerateVariantsModal({
  open,
  onClose,
  screenId,
  baseHtml,
  existingLabels,
}: {
  open: boolean;
  onClose: () => void;
  screenId: string;
  baseHtml: string;
  existingLabels: string[];
}) {
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState<1 | 2 | 3>(1);
  const [generating, setGenerating] = useState(false);
  const { createVariant } = useVariantsStore();

  const availableLabels = (['B', 'C', 'D'] as const).filter(
    (l) => !existingLabels.includes(l)
  );

  const handleGenerate = async () => {
    if (!prompt.trim() || availableLabels.length === 0) return;

    setGenerating(true);

    // Generate variants
    const toGenerate = Math.min(count, availableLabels.length);
    for (let i = 0; i < toGenerate; i++) {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const label = availableLabels[i];
      const variantPrompt = count > 1
        ? `${prompt} (variation ${i + 1})`
        : prompt;

      const generatedHtml = generateVariantHtml(baseHtml, variantPrompt);
      createVariant(screenId, label, `Variant ${label}`, generatedHtml, variantPrompt);
    }

    setGenerating(false);
    message.success(`Generated ${toGenerate} variant${toGenerate > 1 ? 's' : ''}`);
    onClose();
    setPrompt('');
  };

  const suggestions = [
    'Make it dark mode',
    'Use more vibrant colors',
    'Make it more minimal',
    'Use larger buttons',
    'Add rounded corners',
    'Make it more professional',
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <ExperimentOutlined style={{ color: '#764ba2' }} />
          <span>Generate Variants with AI</span>
        </Space>
      }
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            icon={generating ? <Spin size="small" /> : <ThunderboltOutlined />}
            onClick={handleGenerate}
            disabled={!prompt.trim() || availableLabels.length === 0 || generating}
          >
            {generating ? 'Generating...' : `Generate ${Math.min(count, availableLabels.length)} Variant${count > 1 ? 's' : ''}`}
          </Button>
        </Space>
      }
      width={600}
    >
      {availableLabels.length === 0 ? (
        <Empty
          description="All variant slots (A, B, C, D) are filled"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Text type="secondary">Delete a variant to create a new one</Text>
        </Empty>
      ) : (
        <>
          <Paragraph type="secondary">
            Describe how you want the variants to differ from the original.
            AI will generate {count > 1 ? 'multiple variations' : 'a variation'} based on your prompt.
          </Paragraph>

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              How many variants?
            </Text>
            <Segmented
              value={count}
              onChange={(v) => setCount(v as 1 | 2 | 3)}
              options={[
                { value: 1, label: '1', disabled: availableLabels.length < 1 },
                { value: 2, label: '2', disabled: availableLabels.length < 2 },
                { value: 3, label: '3', disabled: availableLabels.length < 3 },
              ]}
            />
            <Text type="secondary" style={{ marginLeft: 12 }}>
              Available slots: {availableLabels.map((l) => (
                <Tag key={l} color={getVariantColor(l)} style={{ marginLeft: 4 }}>
                  {l}
                </Tag>
              ))}
            </Text>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Describe the variation
            </Text>
            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Make it dark mode with purple accents..."
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              Suggestions:
            </Text>
            <Space wrap>
              {suggestions.map((s) => (
                <Tag
                  key={s}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setPrompt(s)}
                >
                  {s}
                </Tag>
              ))}
            </Space>
          </div>
        </>
      )}
    </Modal>
  );
}

// Preview Modal
function PreviewModal({
  variant,
  onClose,
}: {
  variant: Variant | null;
  onClose: () => void;
}) {
  if (!variant) return null;

  return (
    <Modal
      open={true}
      onCancel={onClose}
      width="90vw"
      style={{ top: 20 }}
      title={
        <Space>
          <Tag color={getVariantColor(variant.label)}>{variant.label}</Tag>
          {variant.name}
        </Space>
      }
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div
        style={{
          height: 'calc(80vh - 100px)',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <iframe
          srcDoc={variant.html}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title={variant.name}
        />
      </div>
    </Modal>
  );
}

export function Variants() {
  const { screenId } = useParams<{ screenId: string }>();
  const navigate = useNavigate();
  const { screens } = useScreensStore();
  const {
    getVariantsForScreen,
    initializeFromScreen,
    toggleComparisonSelection,
    selectedForComparison,
    clearComparisonSelection,
    deleteVariant,
    comparisonMode,
    setComparisonMode,
  } = useVariantsStore();

  const [loading, setLoading] = useState(true);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [previewVariant, setPreviewVariant] = useState<Variant | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [baseHtml, setBaseHtml] = useState('');

  const screen = screens.find((s) => s.id === screenId);
  const variants = screenId ? getVariantsForScreen(screenId) : [];

  // Load screen and initialize original variant
  useEffect(() => {
    if (screen && screenId) {
      setLoading(true);
      fetch(screen.filePath)
        .then((res) => res.text())
        .then((html) => {
          setBaseHtml(html);
          initializeFromScreen(screenId, screen.name, html);
          setLoading(false);
        })
        .catch(() => {
          const placeholder = `<!DOCTYPE html><html><head><title>${screen.name}</title></head><body style="font-family: sans-serif; padding: 40px;"><h1>Screen: ${screen.name}</h1><p>Original screen content.</p></body></html>`;
          setBaseHtml(placeholder);
          initializeFromScreen(screenId, screen.name, placeholder);
          setLoading(false);
        });
    }
  }, [screen, screenId, initializeFromScreen]);

  const handleEdit = (variant: Variant) => {
    // Navigate to editor with variant
    navigate(`/editor/${screenId}?variant=${variant.id}`);
  };

  const handleDelete = (variant: Variant) => {
    Modal.confirm({
      title: 'Delete Variant',
      content: `Are you sure you want to delete "${variant.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        deleteVariant(variant.id);
        message.success('Variant deleted');
      },
    });
  };

  const handleDuplicate = (variant: Variant) => {
    const existingLabels = variants.map((v) => v.label);
    const availableLabel = (['B', 'C', 'D'] as const).find(
      (l) => !existingLabels.includes(l)
    );

    if (!availableLabel) {
      message.warning('All variant slots (A, B, C, D) are filled');
      return;
    }

    const { duplicateVariant } = useVariantsStore.getState();
    const newVariant = duplicateVariant(variant.id, availableLabel);
    if (newVariant) {
      message.success(`Created Variant ${availableLabel}`);
    }
  };

  const comparisonVariants = variants.filter((v) =>
    selectedForComparison.includes(v.id)
  );

  if (!screen) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/screens')}>
          Back to Screens
        </Button>
        <Empty description="Screen not found" style={{ marginTop: 48 }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 400,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/screens')}
          >
            Back
          </Button>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Variants: {screen.name}
            </Title>
            <Text type="secondary">
              {variants.length} of 4 variants created
            </Text>
          </div>
        </Space>

        <Space>
          {selectedForComparison.length >= 2 && (
            <>
              <Button
                icon={<SplitCellsOutlined />}
                onClick={() => setShowComparison(true)}
              >
                Compare ({selectedForComparison.length})
              </Button>
              <Button onClick={clearComparisonSelection}>Clear Selection</Button>
            </>
          )}
          <Segmented
            value={comparisonMode}
            onChange={(v) => setComparisonMode(v as 'grid' | 'side-by-side')}
            options={[
              { value: 'grid', icon: <AppstoreOutlined />, label: 'Grid' },
              { value: 'side-by-side', icon: <SplitCellsOutlined />, label: '2-Up' },
            ]}
          />
          <Button
            type="primary"
            icon={<ExperimentOutlined />}
            onClick={() => setGenerateModalOpen(true)}
            disabled={variants.length >= 4}
          >
            Generate Variants
          </Button>
        </Space>
      </div>

      {/* Info banner */}
      <Card size="small" style={{ marginBottom: 24, background: '#f6f6f6' }}>
        <Space>
          <ExperimentOutlined style={{ color: '#764ba2' }} />
          <Text>
            Create up to 4 variants (A/B/C/D) to test different designs.
            Select variants with checkboxes to compare side-by-side.
          </Text>
        </Space>
      </Card>

      {/* Variants Grid */}
      {comparisonMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {variants.map((variant) => (
            <Col key={variant.id} xs={24} md={12} lg={6}>
              <VariantCard
                variant={variant}
                isSelected={selectedForComparison.includes(variant.id)}
                onToggleSelect={() => toggleComparisonSelection(variant.id)}
                onEdit={() => handleEdit(variant)}
                onDelete={() => handleDelete(variant)}
                onDuplicate={() => handleDuplicate(variant)}
                onPreview={() => setPreviewVariant(variant)}
              />
            </Col>
          ))}

          {/* Add variant placeholder */}
          {variants.length < 4 && (
            <Col xs={24} md={12} lg={6}>
              <Card
                style={{
                  height: '100%',
                  minHeight: 350,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed #d9d9d9',
                  cursor: 'pointer',
                }}
                hoverable
                onClick={() => setGenerateModalOpen(true)}
              >
                <div style={{ textAlign: 'center' }}>
                  <PlusOutlined style={{ fontSize: 32, color: '#999' }} />
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">Generate New Variant</Text>
                  </div>
                </div>
              </Card>
            </Col>
          )}
        </Row>
      ) : (
        // Side-by-side 2-up view
        <Row gutter={16} style={{ height: 'calc(100vh - 300px)' }}>
          {variants.slice(0, 2).map((variant) => (
            <Col key={variant.id} span={12} style={{ height: '100%' }}>
              <Card
                title={
                  <Space>
                    <Tag color={getVariantColor(variant.label)}>{variant.label}</Tag>
                    {variant.name}
                  </Space>
                }
                extra={
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(variant)}
                  />
                }
                style={{ height: '100%' }}
                bodyStyle={{ height: 'calc(100% - 57px)', padding: 0 }}
              >
                <iframe
                  srcDoc={variant.html}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title={variant.name}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Modals */}
      <GenerateVariantsModal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        screenId={screenId || ''}
        baseHtml={baseHtml}
        existingLabels={variants.map((v) => v.label)}
      />

      <PreviewModal
        variant={previewVariant}
        onClose={() => setPreviewVariant(null)}
      />

      {showComparison && comparisonVariants.length >= 2 && (
        <ComparisonView
          variants={comparisonVariants}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}

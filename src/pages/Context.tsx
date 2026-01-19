import { useState } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Button,
  Upload,
  Empty,
  Space,
  Input,
  Modal,
  Tag,
  Checkbox,
  message,
  Dropdown,
  Tabs,
  Badge,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  FileTextOutlined,
  FilePdfOutlined,
  VideoCameraOutlined,
  LinkOutlined,
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  CopyOutlined,
  EyeOutlined,
  PictureOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import {
  useContextStore,
  getContextTypeColor,
  type ProductContext,
  type ContextType,
} from '@/store/contextStore';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Type icons
const TYPE_ICONS: Record<ContextType, React.ReactNode> = {
  text: <FileTextOutlined />,
  pdf: <FilePdfOutlined />,
  video: <VideoCameraOutlined />,
  url: <LinkOutlined />,
  image: <PictureOutlined />,
};

// Add Text Modal
function AddTextModal({
  open,
  onClose,
  editContext,
}: {
  open: boolean;
  onClose: () => void;
  editContext?: ProductContext | null;
}) {
  const [name, setName] = useState(editContext?.name || '');
  const [content, setContent] = useState(editContext?.content || '');
  const [tags, setTags] = useState(editContext?.tags?.join(', ') || '');
  const { addContext, updateContext } = useContextStore();

  const handleSave = () => {
    if (!name.trim() || !content.trim()) {
      message.error('Please provide a name and content');
      return;
    }

    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);

    if (editContext) {
      updateContext(editContext.id, {
        name,
        content,
        tags: tagList,
      });
      message.success('Context updated');
    } else {
      addContext({
        type: 'text',
        name,
        content,
        tags: tagList,
      });
      message.success('Context added');
    }

    onClose();
    setName('');
    setContent('');
    setTags('');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <FileTextOutlined style={{ color: getContextTypeColor('text') }} />
          {editContext ? 'Edit Text Context' : 'Add Text / Notes'}
        </Space>
      }
      onOk={handleSave}
      okText={editContext ? 'Save' : 'Add'}
      width={700}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text strong>Name</Text>
          <Input
            placeholder="E.g., Product Requirements, User Stories..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <Text strong>Content</Text>
          <TextArea
            placeholder="Paste your product context, requirements, notes, or any text that helps describe your product..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoSize={{ minRows: 8, maxRows: 16 }}
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <Text strong>Tags (optional)</Text>
          <Input
            placeholder="Comma-separated tags, e.g., requirements, v2, mobile"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            style={{ marginTop: 4 }}
          />
        </div>
      </Space>
    </Modal>
  );
}

// Add URL Modal
function AddURLModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { addContext } = useContextStore();

  const handleAdd = async () => {
    if (!url.trim()) {
      message.error('Please provide a URL');
      return;
    }

    setLoading(true);

    // Simulate fetching URL metadata
    await new Promise((resolve) => setTimeout(resolve, 500));

    const contextName = name || new URL(url).hostname;
    addContext({
      type: 'url',
      name: contextName,
      content: notes || `Reference link: ${url}`,
      metadata: { url },
    });

    message.success('URL added');
    onClose();
    setUrl('');
    setName('');
    setNotes('');
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <LinkOutlined style={{ color: getContextTypeColor('url') }} />
          Add URL / Link
        </Space>
      }
      onOk={handleAdd}
      okText="Add"
      confirmLoading={loading}
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text strong>URL</Text>
          <Input
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <Text strong>Name (optional)</Text>
          <Input
            placeholder="Display name for this link"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginTop: 4 }}
          />
        </div>
        <div>
          <Text strong>Notes (optional)</Text>
          <TextArea
            placeholder="Add notes about what this link contains..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{ marginTop: 4 }}
          />
        </div>
      </Space>
    </Modal>
  );
}

// Preview Modal
function PreviewModal({
  context,
  onClose,
}: {
  context: ProductContext | null;
  onClose: () => void;
}) {
  if (!context) return null;

  return (
    <Modal
      open={true}
      onCancel={onClose}
      title={
        <Space>
          {TYPE_ICONS[context.type]}
          {context.name}
        </Space>
      }
      footer={<Button onClick={onClose}>Close</Button>}
      width={700}
    >
      {context.type === 'text' && (
        <pre
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
            maxHeight: 400,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            fontSize: 13,
          }}
        >
          {context.content}
        </pre>
      )}
      {context.type === 'url' && (
        <div>
          <Paragraph>
            <a href={context.metadata?.url} target="_blank" rel="noopener noreferrer">
              {context.metadata?.url}
            </a>
          </Paragraph>
          {context.content && (
            <pre
              style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 8,
                whiteSpace: 'pre-wrap',
                fontSize: 13,
              }}
            >
              {context.content}
            </pre>
          )}
        </div>
      )}
      {(context.type === 'pdf' || context.type === 'video' || context.type === 'image') && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          {TYPE_ICONS[context.type]}
          <Paragraph style={{ marginTop: 16 }}>
            File: {context.name}
            {context.metadata?.fileSize && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({(context.metadata.fileSize / 1024).toFixed(1)} KB)
              </Text>
            )}
          </Paragraph>
          {context.content && (
            <pre
              style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 8,
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                marginTop: 16,
              }}
            >
              {context.content}
            </pre>
          )}
        </div>
      )}
    </Modal>
  );
}

// Context Item component
function ContextItem({
  context,
  onEdit,
  onDelete,
  onPreview,
}: {
  context: ProductContext;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const { selectedContextIds, toggleContextSelection } = useContextStore();
  const isSelected = selectedContextIds.includes(context.id);
  const color = getContextTypeColor(context.type);

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
      label: 'Edit',
      onClick: onEdit,
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Copy Content',
      onClick: () => {
        navigator.clipboard.writeText(context.content);
        message.success('Copied to clipboard');
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: onDelete,
    },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card
      size="small"
      hoverable
      style={{
        borderColor: isSelected ? color : undefined,
        borderWidth: isSelected ? 2 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Checkbox
          checked={isSelected}
          onChange={() => toggleContextSelection(context.id)}
          style={{ marginTop: 4 }}
        />
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {TYPE_ICONS[context.type]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong ellipsis style={{ flex: 1 }}>
              {context.name}
            </Text>
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
            {context.type === 'url'
              ? context.metadata?.url
              : context.content.substring(0, 100)}
            {context.content.length > 100 && '...'}
          </Text>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {formatDate(context.createdAt)}
            </Text>
            {context.tags && context.tags.length > 0 && (
              <span style={{ marginLeft: 8 }}>
                {context.tags.slice(0, 2).map((tag) => (
                  <Tag key={tag} style={{ fontSize: 10, margin: '0 2px' }}>
                    {tag}
                  </Tag>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function Context() {
  const {
    contexts,
    selectedContextIds,
    addContext,
    deleteContext,
    selectAllContexts,
    deselectAllContexts,
    getAIContextPrompt,
  } = useContextStore();

  const [textModalOpen, setTextModalOpen] = useState(false);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [editContext, setEditContext] = useState<ProductContext | null>(null);
  const [previewContext, setPreviewContext] = useState<ProductContext | null>(null);

  const handleFileUpload = (file: File, type: ContextType) => {
    const reader = new FileReader();

    reader.onload = () => {
      addContext({
        type,
        name: file.name,
        content: type === 'pdf'
          ? `PDF document uploaded. Contains ${Math.ceil(file.size / 5000)} estimated pages.`
          : type === 'video'
            ? `Video file uploaded. Duration unknown.`
            : `Image uploaded.`,
        metadata: {
          fileSize: file.size,
          mimeType: file.type,
        },
      });
      message.success(`${file.name} uploaded`);
    };

    reader.readAsDataURL(file);
    return false; // Prevent auto upload
  };

  const handleDelete = (context: ProductContext) => {
    Modal.confirm({
      title: 'Delete Context',
      content: `Are you sure you want to delete "${context.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        deleteContext(context.id);
        message.success('Context deleted');
      },
    });
  };

  const handleEdit = (context: ProductContext) => {
    if (context.type === 'text') {
      setEditContext(context);
      setTextModalOpen(true);
    } else {
      message.info('Only text context can be edited');
    }
  };

  const contextTypes = [
    {
      type: 'text' as ContextType,
      icon: <FileTextOutlined style={{ fontSize: 28 }} />,
      title: 'Text / Notes',
      description: 'Add product requirements, user stories, or notes',
      color: getContextTypeColor('text'),
      action: () => setTextModalOpen(true),
    },
    {
      type: 'pdf' as ContextType,
      icon: <FilePdfOutlined style={{ fontSize: 28 }} />,
      title: 'PDF Document',
      description: 'Upload PRDs, specs, or design docs',
      color: getContextTypeColor('pdf'),
      accept: '.pdf',
    },
    {
      type: 'video' as ContextType,
      icon: <VideoCameraOutlined style={{ fontSize: 28 }} />,
      title: 'Video / Loom',
      description: 'Upload video walkthroughs',
      color: getContextTypeColor('video'),
      accept: '.mp4,.webm,.mov',
    },
    {
      type: 'url' as ContextType,
      icon: <LinkOutlined style={{ fontSize: 28 }} />,
      title: 'URL / Link',
      description: 'Add reference links',
      color: getContextTypeColor('url'),
      action: () => setUrlModalOpen(true),
    },
  ];

  const aiContextPrompt = getAIContextPrompt();

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
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Product Context
          </Title>
          <Text type="secondary">
            {contexts.length} items · {selectedContextIds.length} selected for AI
          </Text>
        </div>
        {contexts.length > 0 && (
          <Space>
            <Button onClick={selectAllContexts}>Select All</Button>
            <Button onClick={deselectAllContexts}>Deselect All</Button>
          </Space>
        )}
      </div>

      {/* Info Card */}
      <Card
        size="small"
        style={{ marginBottom: 24, background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' }}
      >
        <Space>
          <BulbOutlined style={{ color: '#764ba2', fontSize: 18 }} />
          <div>
            <Text strong>How it works:</Text>
            <Text style={{ marginLeft: 8 }}>
              Upload product context to help AI generate better, more relevant prototypes.
              Selected items (checked) will be included when generating with AI.
            </Text>
          </div>
        </Space>
      </Card>

      {/* Add Context Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {contextTypes.map((item) => (
          <Col key={item.type} xs={24} sm={12} md={6}>
            {item.accept ? (
              <Upload
                accept={item.accept}
                showUploadList={false}
                beforeUpload={(file) => handleFileUpload(file, item.type)}
              >
                <Card
                  hoverable
                  style={{ textAlign: 'center', height: '100%', cursor: 'pointer' }}
                >
                  <div style={{ color: item.color, marginBottom: 12 }}>
                    {item.icon}
                  </div>
                  <Title level={5} style={{ margin: '0 0 4px 0' }}>
                    {item.title}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.description}
                  </Text>
                  <div style={{ marginTop: 12 }}>
                    <Button size="small" icon={<UploadOutlined />}>
                      Upload
                    </Button>
                  </div>
                </Card>
              </Upload>
            ) : (
              <Card
                hoverable
                style={{ textAlign: 'center', height: '100%', cursor: 'pointer' }}
                onClick={item.action}
              >
                <div style={{ color: item.color, marginBottom: 12 }}>
                  {item.icon}
                </div>
                <Title level={5} style={{ margin: '0 0 4px 0' }}>
                  {item.title}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.description}
                </Text>
                <div style={{ marginTop: 12 }}>
                  <Button size="small" icon={<PlusOutlined />}>
                    Add
                  </Button>
                </div>
              </Card>
            )}
          </Col>
        ))}
      </Row>

      {/* Uploaded Context List */}
      <Tabs
        items={[
          {
            key: 'all',
            label: (
              <Badge count={contexts.length} size="small" offset={[8, 0]}>
                All Context
              </Badge>
            ),
            children: contexts.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No context added yet"
              >
                <Text type="secondary">
                  Add product context to improve AI-generated prototypes
                </Text>
              </Empty>
            ) : (
              <Row gutter={[12, 12]}>
                {contexts.map((context) => (
                  <Col key={context.id} xs={24} md={12} lg={8}>
                    <ContextItem
                      context={context}
                      onEdit={() => handleEdit(context)}
                      onDelete={() => handleDelete(context)}
                      onPreview={() => setPreviewContext(context)}
                    />
                  </Col>
                ))}
              </Row>
            ),
          },
          {
            key: 'selected',
            label: (
              <Badge count={selectedContextIds.length} size="small" offset={[8, 0]}>
                Selected for AI
              </Badge>
            ),
            children: selectedContextIds.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No context selected"
              >
                <Text type="secondary">
                  Check items to include them in AI generation
                </Text>
              </Empty>
            ) : (
              <Row gutter={[12, 12]}>
                {contexts
                  .filter((ctx) => selectedContextIds.includes(ctx.id))
                  .map((context) => (
                    <Col key={context.id} xs={24} md={12} lg={8}>
                      <ContextItem
                        context={context}
                        onEdit={() => handleEdit(context)}
                        onDelete={() => handleDelete(context)}
                        onPreview={() => setPreviewContext(context)}
                      />
                    </Col>
                  ))}
              </Row>
            ),
          },
          {
            key: 'preview',
            label: 'AI Context Preview',
            children: (
              <Card>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  This is what will be sent to AI when generating prototypes:
                </Text>
                {aiContextPrompt ? (
                  <pre
                    style={{
                      background: '#1e1e1e',
                      color: '#d4d4d4',
                      padding: 16,
                      borderRadius: 8,
                      maxHeight: 400,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      fontSize: 12,
                    }}
                  >
                    {aiContextPrompt}
                  </pre>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No context selected"
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* Modals */}
      <AddTextModal
        open={textModalOpen}
        onClose={() => {
          setTextModalOpen(false);
          setEditContext(null);
        }}
        editContext={editContext}
      />

      <AddURLModal
        open={urlModalOpen}
        onClose={() => setUrlModalOpen(false)}
      />

      <PreviewModal
        context={previewContext}
        onClose={() => setPreviewContext(null)}
      />
    </div>
  );
}

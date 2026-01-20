import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Typography,
  Space,
  Dropdown,
  Tag,
  Empty,
  Input,
  Tooltip,
  Upload,
  Form,
  message,
  Spin,
  Checkbox,
  Alert,
} from 'antd';
import type { MenuProps } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  MoreOutlined,
  SearchOutlined,
  UploadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  InboxOutlined,
  FileOutlined,
  CheckSquareOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useScreensStore } from '@/store/screensStore';
import { useAuthStore } from '@/store/authStore';
import type { CapturedScreen } from '@/types';

const { Title, Text } = Typography;
const { Search } = Input;
const { Dragger } = Upload;

export function Screens() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    screens,
    isPreviewOpen,
    previewScreen,
    openPreview,
    closePreview,
    removeScreen,
    removeScreens,
    duplicateScreen,
    uploadScreen,
    initializeScreens,
    fetchFromSupabase,
    isLoading,
    selectedIds,
    toggleSelectScreen,
    selectAllScreens,
    clearSelection,
  } = useScreensStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [form] = Form.useForm();

  // Initialize screens on mount
  useEffect(() => {
    initializeScreens();
  }, [initializeScreens]);

  // Refetch screens when user changes
  useEffect(() => {
    if (user?.id) {
      fetchFromSupabase();
    }
  }, [user?.id, fetchFromSupabase]);

  // Exit selection mode when no items selected
  useEffect(() => {
    if (selectedIds.length === 0 && isSelectionMode) {
      // Keep selection mode active for user convenience
    }
  }, [selectedIds, isSelectionMode]);

  const filteredScreens = screens.filter(
    (screen) =>
      screen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const getDropdownItems = (screen: CapturedScreen): MenuProps['items'] => [
    {
      key: 'preview',
      icon: <EyeOutlined />,
      label: 'Preview',
      onClick: () => openPreview(screen),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit in WYSIWYG',
      onClick: () => navigate(`/editor/${screen.id}`),
    },
    {
      key: 'variants',
      icon: <ExperimentOutlined />,
      label: 'Create Variants',
      onClick: () => navigate(`/variants/${screen.id}`),
    },
    {
      key: 'vibe',
      icon: <ThunderboltOutlined />,
      label: 'Vibe Prototype',
      onClick: () => navigate(`/vibe/${screen.id}`),
    },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Duplicate',
      onClick: () => duplicateScreen(screen.id),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: 'Delete Screen',
          content: `Are you sure you want to delete "${screen.name}"?`,
          okText: 'Delete',
          okType: 'danger',
          onOk: () => removeScreen(screen.id),
        });
      },
    },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleUpload = async () => {
    if (uploadingFiles.length === 0) {
      message.warning('Please select at least one HTML file');
      return;
    }

    setIsUploading(true);
    const values = form.getFieldsValue();
    const tags = values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

    try {
      for (const uploadFile of uploadingFiles) {
        const file = uploadFile.originFileObj as File;
        if (file) {
          await uploadScreen(file, undefined, tags);
        }
      }
      message.success(`Successfully uploaded ${uploadingFiles.length} screen(s)`);
      setIsUploadModalOpen(false);
      setUploadingFiles([]);
      form.resetFields();
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;

    Modal.confirm({
      title: 'Delete Selected Screens',
      content: `Are you sure you want to delete ${selectedIds.length} screen(s)? This action cannot be undone.`,
      okText: 'Delete All',
      okType: 'danger',
      onOk: async () => {
        await removeScreens(selectedIds);
        setIsSelectionMode(false);
        message.success(`Deleted ${selectedIds.length} screen(s)`);
      },
    });
  };

  const handleToggleSelectionMode = () => {
    if (isSelectionMode) {
      clearSelection();
    }
    setIsSelectionMode(!isSelectionMode);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredScreens.length) {
      clearSelection();
    } else {
      selectAllScreens();
    }
  };

  const ScreenCard = ({ screen }: { screen: CapturedScreen }) => {
    const isSelected = selectedIds.includes(screen.id);

    // Use editedHtml for preview if available, otherwise use filePath
    const previewContent = screen.editedHtml ? (
      <iframe
        srcDoc={screen.editedHtml}
        style={{
          width: '200%',
          height: '200%',
          transform: 'scale(0.5)',
          transformOrigin: 'top left',
          pointerEvents: 'none',
          border: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        title={screen.name}
      />
    ) : screen.filePath ? (
      <iframe
        src={screen.filePath}
        style={{
          width: '200%',
          height: '200%',
          transform: 'scale(0.5)',
          transformOrigin: 'top left',
          pointerEvents: 'none',
          border: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        title={screen.name}
      />
    ) : (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <FileOutlined style={{ fontSize: 48, color: 'white', opacity: 0.5 }} />
      </div>
    );

    const handleCardClick = () => {
      if (isSelectionMode) {
        toggleSelectScreen(screen.id);
      } else {
        openPreview(screen);
      }
    };

    return (
      <Card
        hoverable
        style={{
          height: '100%',
          border: isSelected ? '2px solid #764ba2' : undefined,
          boxShadow: isSelected ? '0 0 0 2px rgba(118, 75, 162, 0.2)' : undefined,
        }}
        cover={
          <div
            style={{
              height: 180,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={handleCardClick}
          >
            {previewContent}

            {/* Selection checkbox overlay */}
            {isSelectionMode && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  zIndex: 10,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelectScreen(screen.id);
                }}
              >
                <Checkbox
                  checked={isSelected}
                  style={{
                    transform: 'scale(1.3)',
                  }}
                />
              </div>
            )}

            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: isSelected ? 'rgba(118, 75, 162, 0.2)' : 'rgba(0,0,0,0.1)',
                opacity: isSelected ? 1 : 0,
                transition: 'opacity 0.2s',
              }}
              className="card-overlay"
            />
            {!isSelectionMode && (
              <EyeOutlined
                style={{
                  position: 'absolute',
                  fontSize: 32,
                  color: 'white',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  zIndex: 1,
                }}
                className="card-eye"
              />
            )}
          </div>
        }
        actions={
          isSelectionMode
            ? undefined
            : [
                <Tooltip title="Preview" key="preview">
                  <EyeOutlined onClick={() => openPreview(screen)} />
                </Tooltip>,
                <Tooltip title="Edit" key="edit">
                  <EditOutlined onClick={() => navigate(`/editor/${screen.id}`)} />
                </Tooltip>,
                <Dropdown
                  key="more"
                  menu={{ items: getDropdownItems(screen) }}
                  trigger={['click']}
                >
                  <MoreOutlined />
                </Dropdown>,
              ]
        }
      >
        <Card.Meta
          title={
            <Text ellipsis style={{ maxWidth: '100%' }}>
              {screen.name}
            </Text>
          }
          description={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatDate(screen.capturedAt)}
              </Text>
              {screen.tags && screen.tags.length > 0 && (
                <Space size={4} wrap>
                  {screen.tags.slice(0, 3).map((tag) => (
                    <Tag key={tag} style={{ margin: 0 }}>
                      {tag}
                    </Tag>
                  ))}
                </Space>
              )}
            </Space>
          }
        />
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Selection mode banner */}
      {isSelectionMode && (
        <Alert
          message={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Checkbox
                  checked={selectedIds.length === filteredScreens.length && filteredScreens.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < filteredScreens.length}
                  onChange={handleSelectAll}
                />
                <Text>
                  {selectedIds.length} of {filteredScreens.length} selected
                </Text>
              </Space>
              <Space>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={selectedIds.length === 0}
                  onClick={handleBatchDelete}
                >
                  Delete Selected
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleToggleSelectionMode}
                >
                  Cancel
                </Button>
              </Space>
            </div>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Captured Screens
        </Title>
        <Space>
          <Search
            placeholder="Search screens..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
          <Button.Group>
            <Tooltip title="Grid view">
              <Button
                icon={<AppstoreOutlined />}
                type={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => setViewMode('grid')}
              />
            </Tooltip>
            <Tooltip title="List view">
              <Button
                icon={<UnorderedListOutlined />}
                type={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => setViewMode('list')}
              />
            </Tooltip>
          </Button.Group>
          <Tooltip title={isSelectionMode ? 'Exit selection mode' : 'Select multiple'}>
            <Button
              icon={<CheckSquareOutlined />}
              type={isSelectionMode ? 'primary' : 'default'}
              onClick={handleToggleSelectionMode}
            />
          </Tooltip>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Import Screen
          </Button>
        </Space>
      </div>

      {filteredScreens.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            searchQuery
              ? 'No screens match your search'
              : 'No captured screens yet'
          }
        >
          {!searchQuery && (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setIsUploadModalOpen(true)}
            >
              Import Your First Screen
            </Button>
          )}
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredScreens.map((screen) => (
            <Col key={screen.id} xs={24} sm={12} md={8} lg={6}>
              <ScreenCard screen={screen} />
            </Col>
          ))}
        </Row>
      )}

      {/* Upload Modal */}
      <Modal
        title="Import HTML Screens"
        open={isUploadModalOpen}
        onCancel={() => {
          setIsUploadModalOpen(false);
          setUploadingFiles([]);
          form.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setIsUploadModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="upload"
            type="primary"
            onClick={handleUpload}
            loading={isUploading}
            disabled={uploadingFiles.length === 0}
          >
            Upload {uploadingFiles.length > 0 ? `(${uploadingFiles.length})` : ''}
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="HTML Files" required>
            <Dragger
              accept=".html,.htm"
              multiple
              fileList={uploadingFiles}
              beforeUpload={(file) => {
                // Check file type
                if (!file.name.match(/\.html?$/i)) {
                  message.error(`${file.name} is not an HTML file`);
                  return Upload.LIST_IGNORE;
                }
                return false; // Don't auto upload
              }}
              onChange={({ fileList }) => setUploadingFiles(fileList)}
              onRemove={(file) => {
                setUploadingFiles(uploadingFiles.filter(f => f.uid !== file.uid));
              }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                Click or drag HTML files to this area
              </p>
              <p className="ant-upload-hint">
                Upload captured screens from SingleFile or any HTML files.
                Supports multiple files at once.
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tags (optional)"
            help="Comma-separated tags for organization"
          >
            <Input placeholder="e.g., landing, dashboard, mobile" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={isPreviewOpen}
        onCancel={closePreview}
        width="90vw"
        style={{ top: 20 }}
        footer={
          previewScreen && (
            <Space>
              <Button onClick={closePreview}>Close</Button>
              <Button
                icon={<CopyOutlined />}
                onClick={() => {
                  duplicateScreen(previewScreen.id);
                  closePreview();
                }}
              >
                Duplicate
              </Button>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => {
                  navigate(`/vibe/${previewScreen.id}`);
                  closePreview();
                }}
              >
                Vibe Prototype
              </Button>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  navigate(`/editor/${previewScreen.id}`);
                  closePreview();
                }}
              >
                Edit in WYSIWYG
              </Button>
            </Space>
          )
        }
        title={previewScreen?.name}
      >
        {previewScreen && (
          <div
            style={{
              height: 'calc(80vh - 100px)',
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {previewScreen.editedHtml ? (
              <iframe
                srcDoc={previewScreen.editedHtml}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title={previewScreen.name}
              />
            ) : (
              <iframe
                src={previewScreen.filePath}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title={previewScreen.name}
              />
            )}
          </div>
        )}
      </Modal>

      <style>{`
        .ant-card:hover .card-overlay,
        .ant-card:hover .card-eye {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

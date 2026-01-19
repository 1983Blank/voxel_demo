import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Button,
  Space,
  Input,
  Card,
  Empty,
  Typography,
  Tooltip,
  Divider,
  Tag,
  message,
  Spin,
  Segmented,
  Modal,
  Upload,
  ColorPicker,
  InputNumber,
  Slider,
  Collapse,
  Tabs,
} from 'antd';
import {
  ArrowLeftOutlined,
  LeftOutlined,
  RightOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  SendOutlined,
  BulbOutlined,
  HistoryOutlined,
  AppstoreOutlined,
  DragOutlined,
  EditOutlined,
  SelectOutlined,
  BorderOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  DownOutlined,
  UploadOutlined,
  PictureOutlined,
  FontSizeOutlined,
  BgColorsOutlined,
  LinkOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  BoldOutlined,
  ItalicOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
} from '@ant-design/icons';
import { useScreensStore } from '@/store/screensStore';
import { useEditorStore } from '@/store/editorStore';
import { useComponentsStore } from '@/store/componentsStore';
import { useContextStore } from '@/store/contextStore';
import {
  generateHtml,
  isLLMConfigured,
  saveLLMConfig,
} from '@/services/llmService';
import { uploadImage, getUserImages } from '@/services/storageService';

const { Sider } = Layout;
const { TextArea } = Input;
const { Text, Paragraph } = Typography;

// Fallback mock AI generation responses (when no API key is configured)
const MOCK_AI_RESPONSES: Record<string, string> = {
  button: `<button style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">New Button</button>`,
  header: `<header style="background: white; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"><h1 style="margin: 0; font-size: 24px;">New Header</h1><nav><a href="#" style="margin: 0 16px; color: #666;">Link 1</a><a href="#" style="margin: 0 16px; color: #666;">Link 2</a></nav></header>`,
  card: `<div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);"><h3 style="margin: 0 0 12px 0;">Card Title</h3><p style="color: #666; margin: 0;">This is a new card component with some description text.</p></div>`,
  form: `<form style="max-width: 400px;"><div style="margin-bottom: 16px;"><label style="display: block; margin-bottom: 8px; font-weight: 500;">Email</label><input type="email" placeholder="you@example.com" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px;"/></div><button type="submit" style="width: 100%; background: #764ba2; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: 600;">Submit</button></form>`,
};

// Prompt suggestions
const PROMPT_SUGGESTIONS = [
  'Add a call-to-action button',
  'Change the header color to blue',
  'Add a search bar',
  'Make the font larger',
  'Add a testimonial section',
  'Create a pricing table',
  'Add social media icons',
  'Make it more modern',
];

// Get mock response based on prompt keywords
function getMockResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('button')) {
    return MOCK_AI_RESPONSES.button;
  } else if (lowerPrompt.includes('header') || lowerPrompt.includes('nav')) {
    return MOCK_AI_RESPONSES.header;
  } else if (lowerPrompt.includes('card') || lowerPrompt.includes('box')) {
    return MOCK_AI_RESPONSES.card;
  } else if (lowerPrompt.includes('form') || lowerPrompt.includes('input')) {
    return MOCK_AI_RESPONSES.form;
  }

  // Default: return a generic styled div
  return `<div style="padding: 24px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 12px; text-align: center;">
    <h3 style="margin: 0 0 12px 0; color: #333;">Generated Content</h3>
    <p style="color: #666; margin: 0;">This is a placeholder for: "${prompt}"</p>
  </div>`;
}

function AIPromptPanel() {
  const [prompt, setPrompt] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'anthropic' | 'openai'>('anthropic');
  const {
    isGenerating,
    setGenerating,
    addGenerationToHistory,
    updateHtml,
    currentHtml,
    generationHistory,
  } = useEditorStore();
  const { components } = useComponentsStore();
  const { getAIContextPrompt } = useContextStore();

  const llmConfigured = isLLMConfigured();
  const productContext = getAIContextPrompt();

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveLLMConfig({
        provider: selectedProvider,
        apiKey: apiKeyInput.trim(),
      });
      setApiKeyInput('');
      setShowApiConfig(false);
      message.success('API key saved!');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    setGeneratedHtml(null);

    // Check if LLM is configured
    if (llmConfigured) {
      // Use real LLM API
      const response = await generateHtml({
        prompt,
        currentHtml,
        context: productContext || undefined,
      });

      if (response.success) {
        setGeneratedHtml(response.html);
        addGenerationToHistory(prompt, false);
      } else {
        message.error(response.error || 'Generation failed');
        // Fall back to mock
        setGeneratedHtml(getMockResponse(prompt));
      }
    } else {
      // Use mock responses
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setGeneratedHtml(getMockResponse(prompt));
      addGenerationToHistory(prompt, false);
    }

    setGenerating(false);
  };

  const handleApply = () => {
    if (!generatedHtml) return;

    // Insert generated HTML into current page (at end of body for now)
    const parser = new DOMParser();
    const doc = parser.parseFromString(currentHtml, 'text/html');

    const wrapper = document.createElement('div');
    wrapper.innerHTML = generatedHtml;
    wrapper.style.cssText = 'margin: 20px; padding: 20px; border: 2px dashed #764ba2; border-radius: 8px;';
    wrapper.setAttribute('data-voxel-generated', 'true');

    doc.body.appendChild(wrapper);

    updateHtml(doc.documentElement.outerHTML);
    setGeneratedHtml(null);
    setPrompt('');
    message.success('Changes applied!');
  };

  const handleUseSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* AI Prompt Section */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExperimentOutlined style={{ color: '#764ba2' }} />
            <Text strong>Vibe Prototype</Text>
          </div>
          <Tooltip title={llmConfigured ? 'API Connected' : 'Configure API Key'}>
            <Button
              type="text"
              size="small"
              icon={<DownOutlined />}
              onClick={() => setShowApiConfig(!showApiConfig)}
              style={{ color: llmConfigured ? '#52c41a' : '#faad14' }}
            >
              {llmConfigured ? 'Connected' : 'Setup'}
            </Button>
          </Tooltip>
        </div>

        {/* API Key Configuration */}
        {showApiConfig && (
          <div style={{ marginBottom: 12, padding: 12, background: '#f6f6f6', borderRadius: 8 }}>
            <Text style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
              {llmConfigured ? 'API key configured. Update below to change.' : 'Enter your API key to enable AI generation.'}
            </Text>
            <Segmented
              size="small"
              value={selectedProvider}
              onChange={(v) => setSelectedProvider(v as 'anthropic' | 'openai')}
              options={[
                { value: 'anthropic', label: 'Anthropic' },
                { value: 'openai', label: 'OpenAI' },
              ]}
              style={{ marginBottom: 8 }}
            />
            <Input.Password
              size="small"
              placeholder={selectedProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <Button size="small" type="primary" onClick={handleSaveApiKey} disabled={!apiKeyInput.trim()}>
              Save API Key
            </Button>
          </div>
        )}

        <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
          Describe the changes you want to make in natural language.
          {!llmConfigured && <Text type="warning" style={{ fontSize: 11, display: 'block' }}>(Using mock responses - add API key for real AI)</Text>}
        </Paragraph>
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., Add a blue call-to-action button that says 'Get Started'..."
          autoSize={{ minRows: 3, maxRows: 6 }}
          style={{ marginBottom: 12 }}
          onPressEnter={(e) => {
            if (e.ctrlKey || e.metaKey) {
              handleGenerate();
            }
          }}
        />
        <Button
          type="primary"
          icon={isGenerating ? <Spin size="small" /> : <SendOutlined />}
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          block
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {/* Suggestions */}
      <div style={{ padding: '0 16px 16px' }}>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
          <BulbOutlined /> Suggestions
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PROMPT_SUGGESTIONS.slice(0, 4).map((suggestion) => (
            <Tag
              key={suggestion}
              style={{ cursor: 'pointer', fontSize: 11 }}
              onClick={() => handleUseSuggestion(suggestion)}
            >
              {suggestion}
            </Tag>
          ))}
        </div>
      </div>

      <Divider style={{ margin: '0 0 12px 0' }} />

      {/* Generated Preview */}
      {generatedHtml && (
        <div style={{ padding: 16, background: '#f6f6f6', margin: '0 16px', borderRadius: 8 }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            Generated Component
          </Text>
          <div
            style={{
              background: 'white',
              padding: 16,
              borderRadius: 8,
              marginBottom: 12,
              border: '1px solid #e8e8e8',
            }}
            dangerouslySetInnerHTML={{ __html: generatedHtml }}
          />
          <Space>
            <Button type="primary" size="small" onClick={handleApply}>
              Apply to Page
            </Button>
            <Button size="small" onClick={() => setGeneratedHtml(null)}>
              Discard
            </Button>
          </Space>
        </div>
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* Component Library Quick Access */}
      <div style={{ padding: '0 16px', flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AppstoreOutlined />
          <Text strong style={{ fontSize: 12 }}>Components</Text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {components.slice(0, 6).map((comp) => (
            <Card
              key={comp.id}
              size="small"
              hoverable
              style={{ cursor: 'grab' }}
              onClick={() => {
                const combined = `<style>${comp.css}</style>${comp.html}`;
                setGeneratedHtml(combined);
              }}
            >
              <Text ellipsis style={{ fontSize: 12 }}>
                {comp.name}
              </Text>
            </Card>
          ))}
        </div>
      </div>

      {/* Generation History */}
      {generationHistory.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <HistoryOutlined />
              <Text strong style={{ fontSize: 12 }}>History</Text>
            </div>
            <div style={{ maxHeight: 120, overflow: 'auto' }}>
              {generationHistory.slice(-5).reverse().map((item, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    background: '#f6f6f6',
                    borderRadius: 4,
                    marginBottom: 4,
                  }}
                >
                  <Text ellipsis style={{ display: 'block' }}>
                    {item.prompt}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface ToolbarState {
  visible: boolean;
  x: number;
  y: number;
  elementType: string;
  isImage: boolean;
}

// Element properties for the property panel
interface ElementProperties {
  tagName: string;
  // Text properties
  text?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  textAlign?: string;
  // Image properties
  src?: string;
  alt?: string;
  width?: string;
  height?: string;
  // Link properties
  href?: string;
  target?: string;
  // Layout properties
  backgroundColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  // Raw styles
  styles: Record<string, string>;
}

// Parse element to extract properties
function getElementProperties(element: HTMLElement): ElementProperties {
  const computedStyle = element.ownerDocument?.defaultView?.getComputedStyle(element);
  const styles: Record<string, string> = {};

  if (computedStyle) {
    styles.fontSize = computedStyle.fontSize;
    styles.fontWeight = computedStyle.fontWeight;
    styles.fontStyle = computedStyle.fontStyle;
    styles.color = computedStyle.color;
    styles.textAlign = computedStyle.textAlign;
    styles.backgroundColor = computedStyle.backgroundColor;
    styles.padding = computedStyle.padding;
    styles.margin = computedStyle.margin;
    styles.borderRadius = computedStyle.borderRadius;
    styles.width = computedStyle.width;
    styles.height = computedStyle.height;
  }

  const props: ElementProperties = {
    tagName: element.tagName.toLowerCase(),
    styles,
  };

  // Text content (only for text elements)
  if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'button', 'label', 'li'].includes(props.tagName)) {
    props.text = element.textContent || '';
    props.fontSize = styles.fontSize;
    props.fontWeight = styles.fontWeight;
    props.fontStyle = styles.fontStyle;
    props.color = styles.color;
    props.textAlign = styles.textAlign;
  }

  // Image properties
  if (props.tagName === 'img') {
    const img = element as HTMLImageElement;
    props.src = img.src;
    props.alt = img.alt;
    props.width = img.style.width || img.getAttribute('width') || '';
    props.height = img.style.height || img.getAttribute('height') || '';
  }

  // Link properties
  if (props.tagName === 'a') {
    const link = element as HTMLAnchorElement;
    props.href = link.href;
    props.target = link.target;
  }

  // Background and layout
  props.backgroundColor = styles.backgroundColor;
  props.padding = styles.padding;
  props.margin = styles.margin;
  props.borderRadius = styles.borderRadius;

  return props;
}

// Convert RGB to hex
function rgbToHex(rgb: string): string {
  if (rgb.startsWith('#')) return rgb;
  if (rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return 'transparent';

  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

interface VisualEditorProps {
  onElementSelect: (props: ElementProperties | null, element: HTMLElement | null) => void;
  imageModalOpen: boolean;
  imageModalSrc: string;
  onImageModalClose: () => void;
  onImageModalOpen: (src: string) => void;
  onImageReplace: (newSrc: string) => void;
}

function VisualEditor({
  onElementSelect,
  imageModalOpen,
  imageModalSrc,
  onImageModalClose,
  onImageModalOpen,
  onImageReplace,
}: VisualEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedElementRef = useRef<HTMLElement | null>(null);
  const {
    currentHtml,
    updateHtml,
    setSelectedElement,
    editorMode,
    zoom,
    showGrid,
  } = useEditorStore();

  // Toolbar state
  const [toolbar, setToolbar] = useState<ToolbarState>({
    visible: false,
    x: 0,
    y: 0,
    elementType: '',
    isImage: false,
  });

  // Image modal local state
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [userImages, setUserImages] = useState<string[]>([]);
  const [imageTab, setImageTab] = useState<string>('upload');

  // Reset URL when modal opens with new src
  useEffect(() => {
    if (imageModalOpen) {
      setNewImageUrl('');
      setImageTab('upload');
      getUserImages().then(setUserImages);
    }
  }, [imageModalOpen, imageModalSrc]);

  // Handle file upload
  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const result = await uploadImage(file);
      if (result.success && result.url) {
        setNewImageUrl(result.url);
        message.success('Image uploaded!');
        // Refresh user images
        getUserImages().then(setUserImages);
      } else {
        message.error(result.error || 'Upload failed');
      }
    } catch (error) {
      message.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
    return false; // Prevent default upload behavior
  };

  // Handle replace image
  const handleReplaceImageConfirm = () => {
    if (newImageUrl.trim()) {
      onImageReplace(newImageUrl.trim());
      setNewImageUrl('');
      onImageModalClose();
      message.success('Image replaced!');
    }
  };

  // Hide toolbar
  const hideToolbar = useCallback(() => {
    setToolbar(prev => ({ ...prev, visible: false }));
  }, []);

  // Debounced save function - only saves after user stops typing
  const debouncedSave = useCallback((iframeDoc: Document) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      const newHtml = iframeDoc.documentElement.outerHTML;
      const cleanHtml = newHtml.replace(/<style id="voxel-editor-styles">[\s\S]*?<\/style>/, '');
      updateHtml(cleanHtml);
    }, 800);
  }, [updateHtml]);


  // Handle delete element
  const handleDeleteElement = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    const selected = iframeDoc.querySelector('[data-voxel-selected="true"]');
    if (selected) {
      selected.remove();
      setSelectedElement(null, null);
      hideToolbar();

      const newHtml = iframeDoc.documentElement.outerHTML;
      const cleanHtml = newHtml.replace(/<style id="voxel-editor-styles">[\s\S]*?<\/style>/, '');
      updateHtml(cleanHtml);
      message.success('Element deleted');
    }
  };

  // Handle edit text
  const handleEditText = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    const selected = iframeDoc.querySelector('[data-voxel-selected="true"]') as HTMLElement;
    if (selected) {
      selected.setAttribute('contenteditable', 'true');
      selected.focus();
      hideToolbar();
    }
  };

  // Handle duplicate element
  const handleDuplicateElement = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    const selected = iframeDoc.querySelector('[data-voxel-selected="true"]');
    if (selected && selected.parentElement) {
      const clone = selected.cloneNode(true) as Element;
      clone.removeAttribute('data-voxel-selected');
      selected.parentElement.insertBefore(clone, selected.nextSibling);

      const newHtml = iframeDoc.documentElement.outerHTML;
      const cleanHtml = newHtml.replace(/<style id="voxel-editor-styles">[\s\S]*?<\/style>/, '');
      updateHtml(cleanHtml);
      hideToolbar();
      message.success('Element duplicated');
    }
  };

  // Inject editor styles and scripts into iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    const container = containerRef.current;
    if (!iframe || !currentHtml || !container) return;

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    // Add editor styles
    const editorStyles = `
      <style id="voxel-editor-styles">
        * {
          cursor: ${editorMode === 'select' ? 'pointer' : editorMode === 'move' ? 'move' : 'text'} !important;
        }
        [data-voxel-selected="true"] {
          outline: 2px solid #764ba2 !important;
          outline-offset: 2px;
        }
        [data-voxel-hovered="true"]:not([data-voxel-selected="true"]) {
          outline: 2px dashed #999 !important;
          outline-offset: 2px;
        }
        ${showGrid ? `
        body {
          background-image: linear-gradient(rgba(118, 75, 162, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(118, 75, 162, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        ` : ''}
        [contenteditable="true"] {
          outline: 2px solid #1890ff !important;
          background: rgba(24, 144, 255, 0.05);
        }
        img {
          cursor: pointer !important;
        }
      </style>
    `;

    // Write content to iframe
    iframeDoc.open();
    iframeDoc.write(currentHtml.replace('</head>', editorStyles + '</head>'));
    iframeDoc.close();

    // Get element path for display
    const getPath = (el: Element): string => {
      const pathParts: string[] = [];
      let curr: Element | null = el;
      while (curr && curr !== document.body) {
        let selector = curr.tagName.toLowerCase();
        if (curr.id) {
          selector += `#${curr.id}`;
        } else if (curr.className && typeof curr.className === 'string') {
          selector += `.${curr.className.split(' ').filter(Boolean).join('.')}`;
        }
        pathParts.unshift(selector);
        curr = curr.parentElement;
      }
      return pathParts.join(' > ');
    };

    // Add event listeners
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (!target || target === iframeDoc.body || target === iframeDoc.documentElement) {
        setSelectedElement(null, null);
        selectedElementRef.current = null;
        onElementSelect(null, null);
        hideToolbar();
        return;
      }

      // Clear previous selection
      iframeDoc.querySelectorAll('[data-voxel-selected]').forEach((el) => {
        el.removeAttribute('data-voxel-selected');
      });

      // Set new selection
      target.setAttribute('data-voxel-selected', 'true');
      selectedElementRef.current = target;

      const path = getPath(target);
      setSelectedElement(path, target.outerHTML);

      // Get element properties for property panel
      const props = getElementProperties(target);
      onElementSelect(props, target);

      hideToolbar();
    };

    // Double-click to show toolbar
    const handleDoubleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as Element;
      if (!target || target === iframeDoc.body || target === iframeDoc.documentElement) {
        return;
      }

      // Calculate position relative to container
      const containerRect = container.getBoundingClientRect();

      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top;

      const isImage = target.tagName === 'IMG';
      const elementType = target.tagName.toLowerCase();

      // If it's an image, also open the image modal
      if (isImage) {
        onImageModalOpen((target as HTMLImageElement).src);
      }

      setToolbar({
        visible: true,
        x: Math.min(x, containerRect.width - 200),
        y: Math.max(y - 50, 10),
        elementType,
        isImage,
      });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target || target === iframeDoc.body || target === iframeDoc.documentElement) return;

      iframeDoc.querySelectorAll('[data-voxel-hovered]').forEach((el) => {
        el.removeAttribute('data-voxel-hovered');
      });

      target.setAttribute('data-voxel-hovered', 'true');
    };

    const handleMouseOut = () => {
      iframeDoc.querySelectorAll('[data-voxel-hovered]').forEach((el) => {
        el.removeAttribute('data-voxel-hovered');
      });
    };

    const handleInput = () => {
      debouncedSave(iframeDoc);
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as Element;
      if (target?.hasAttribute('contenteditable')) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        target.removeAttribute('contenteditable');
        const newHtml = iframeDoc.documentElement.outerHTML;
        const cleanHtml = newHtml.replace(/<style id="voxel-editor-styles">[\s\S]*?<\/style>/, '');
        updateHtml(cleanHtml);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = iframeDoc.querySelector('[data-voxel-selected="true"]');
        if (selected && !selected.hasAttribute('contenteditable')) {
          selected.remove();
          setSelectedElement(null, null);
          hideToolbar();
          const newHtml = iframeDoc.documentElement.outerHTML;
          const cleanHtml = newHtml.replace(/<style id="voxel-editor-styles">[\s\S]*?<\/style>/, '');
          updateHtml(cleanHtml);
        }
      }

      if (e.key === 'Escape') {
        iframeDoc.querySelectorAll('[contenteditable]').forEach((el) => {
          el.removeAttribute('contenteditable');
        });
        setSelectedElement(null, null);
        hideToolbar();
      }
    };

    iframeDoc.addEventListener('click', handleClick);
    iframeDoc.addEventListener('dblclick', handleDoubleClick);
    iframeDoc.addEventListener('mouseover', handleMouseOver);
    iframeDoc.addEventListener('mouseout', handleMouseOut);
    iframeDoc.addEventListener('input', handleInput);
    iframeDoc.addEventListener('blur', handleBlur, true);
    iframeDoc.addEventListener('keydown', handleKeyDown);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      iframeDoc.removeEventListener('click', handleClick);
      iframeDoc.removeEventListener('dblclick', handleDoubleClick);
      iframeDoc.removeEventListener('mouseover', handleMouseOver);
      iframeDoc.removeEventListener('mouseout', handleMouseOut);
      iframeDoc.removeEventListener('input', handleInput);
      iframeDoc.removeEventListener('blur', handleBlur, true);
      iframeDoc.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentHtml, editorMode, showGrid, setSelectedElement, updateHtml, debouncedSave, hideToolbar]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        background: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        padding: 24,
        position: 'relative',
      }}
    >
      {/* Floating Toolbar */}
      {toolbar.visible && (
        <div
          style={{
            position: 'absolute',
            left: toolbar.x,
            top: toolbar.y,
            zIndex: 1000,
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: 8,
            display: 'flex',
            gap: 4,
          }}
        >
          <Tooltip title="Edit Text">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={handleEditText}
            />
          </Tooltip>
          {toolbar.isImage && (
            <Tooltip title="Change Image">
              <Button
                type="text"
                size="small"
                icon={<PictureOutlined />}
                onClick={() => {
                  const selected = selectedElementRef.current as HTMLImageElement;
                  if (selected) {
                    onImageModalOpen(selected.src || '');
                  }
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Duplicate">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={handleDuplicateElement}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleDeleteElement}
            />
          </Tooltip>
          <Divider type="vertical" style={{ margin: '0 4px' }} />
          <Tag style={{ margin: 0, fontSize: 10 }}>{toolbar.elementType}</Tag>
        </div>
      )}

      {/* Image Replace Modal */}
      <Modal
        title="Replace Image"
        open={imageModalOpen}
        onCancel={() => {
          setNewImageUrl('');
          setImageTab('upload');
          onImageModalClose();
        }}
        onOk={handleReplaceImageConfirm}
        okText="Replace Image"
        okButtonProps={{ disabled: !newImageUrl.trim(), loading: isUploading }}
        width={560}
      >
        {imageModalSrc && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              Current image:
            </Text>
            <img
              src={imageModalSrc}
              alt="Current"
              style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, border: '1px solid #eee' }}
            />
          </div>
        )}

        <Tabs
          activeKey={imageTab}
          onChange={setImageTab}
          items={[
            {
              key: 'upload',
              label: (
                <span>
                  <UploadOutlined /> Upload
                </span>
              ),
              children: (
                <div>
                  <Upload.Dragger
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={handleImageUpload}
                    disabled={isUploading}
                  >
                    <p className="ant-upload-drag-icon">
                      <PictureOutlined style={{ fontSize: 48, color: '#999' }} />
                    </p>
                    <p className="ant-upload-text">Click or drag image to upload</p>
                    <p className="ant-upload-hint">Supports JPG, PNG, GIF, WebP</p>
                  </Upload.Dragger>
                  {isUploading && (
                    <div style={{ textAlign: 'center', marginTop: 12 }}>
                      <Spin /> <Text type="secondary">Uploading...</Text>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'url',
              label: (
                <span>
                  <LinkOutlined /> URL
                </span>
              ),
              children: (
                <div>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    onPressEnter={handleReplaceImageConfirm}
                    prefix={<LinkOutlined />}
                    size="large"
                  />
                </div>
              ),
            },
            {
              key: 'gallery',
              label: (
                <span>
                  <AppstoreOutlined /> My Images
                </span>
              ),
              children: (
                <div style={{ maxHeight: 200, overflow: 'auto' }}>
                  {userImages.length === 0 ? (
                    <Empty description="No uploaded images yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {userImages.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setNewImageUrl(url)}
                          style={{
                            cursor: 'pointer',
                            border: newImageUrl === url ? '2px solid #764ba2' : '2px solid transparent',
                            borderRadius: 8,
                            overflow: 'hidden',
                            aspectRatio: '1',
                          }}
                        >
                          <img
                            src={url}
                            alt={`Uploaded ${idx}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />

        {newImageUrl && (
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              New image preview:
            </Text>
            <img
              src={newImageUrl}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, border: '1px solid #eee' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </Modal>

      <div
        style={{
          width: `${zoom}%`,
          height: '100%',
          maxWidth: '100%',
          background: 'white',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={iframeRef}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="Visual Editor"
        />
      </div>
    </div>
  );
}

interface PropertyPanelProps {
  elementProps: ElementProperties | null;
  element: HTMLElement | null;
  onUpdateStyle: (property: string, value: string) => void;
  onUpdateAttribute: (attribute: string, value: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpenImageModal: () => void;
}

function PropertyPanel({
  elementProps,
  element,
  onUpdateStyle,
  onUpdateAttribute,
  onDelete,
  onDuplicate,
  onOpenImageModal,
}: PropertyPanelProps) {
  const { selectedElementHtml } = useEditorStore();

  if (!elementProps || !element) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <PictureOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
        <Text type="secondary" style={{ display: 'block' }}>
          Select an element to edit its properties
        </Text>
        <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 8 }}>
          Click to select, double-click for quick actions
        </Text>
      </div>
    );
  }

  const isTextElement = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'button', 'label', 'li', 'div'].includes(elementProps.tagName);
  const isImage = elementProps.tagName === 'img';
  const isLink = elementProps.tagName === 'a';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Element Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Tag color="purple">{elementProps.tagName.toUpperCase()}</Tag>
          <Space size={4}>
            <Tooltip title="Duplicate">
              <Button type="text" size="small" icon={<CopyOutlined />} onClick={onDuplicate} />
            </Tooltip>
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onDelete} />
            </Tooltip>
          </Space>
        </Space>
      </div>

      {/* Properties */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        <Collapse
          defaultActiveKey={['content', 'typography', 'image', 'layout']}
          ghost
          size="small"
          items={[
            // Content Section (for text elements)
            ...(isTextElement ? [{
              key: 'content',
              label: <Text strong style={{ fontSize: 12 }}>Content</Text>,
              children: (
                <div style={{ padding: '0 16px' }}>
                  {isLink && (
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Link URL</Text>
                      <Input
                        size="small"
                        prefix={<LinkOutlined />}
                        defaultValue={elementProps.href}
                        onBlur={(e) => onUpdateAttribute('href', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </div>
              ),
            }] : []),

            // Typography Section
            ...(isTextElement ? [{
              key: 'typography',
              label: <Text strong style={{ fontSize: 12 }}><FontSizeOutlined /> Typography</Text>,
              children: (
                <div style={{ padding: '0 16px' }}>
                  {/* Font Size */}
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Font Size</Text>
                    <InputNumber
                      size="small"
                      min={8}
                      max={128}
                      defaultValue={parseInt(elementProps.fontSize || '16')}
                      onChange={(value) => onUpdateStyle('fontSize', `${value}px`)}
                      addonAfter="px"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Font Weight & Style */}
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Style</Text>
                    <Space>
                      <Tooltip title="Bold">
                        <Button
                          size="small"
                          type={elementProps.fontWeight === 'bold' || parseInt(elementProps.fontWeight || '400') >= 700 ? 'primary' : 'default'}
                          icon={<BoldOutlined />}
                          onClick={() => onUpdateStyle('fontWeight', elementProps.fontWeight === 'bold' || parseInt(elementProps.fontWeight || '400') >= 700 ? 'normal' : 'bold')}
                        />
                      </Tooltip>
                      <Tooltip title="Italic">
                        <Button
                          size="small"
                          type={elementProps.fontStyle === 'italic' ? 'primary' : 'default'}
                          icon={<ItalicOutlined />}
                          onClick={() => onUpdateStyle('fontStyle', elementProps.fontStyle === 'italic' ? 'normal' : 'italic')}
                        />
                      </Tooltip>
                    </Space>
                  </div>

                  {/* Text Align */}
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Alignment</Text>
                    <Segmented
                      size="small"
                      value={elementProps.textAlign || 'left'}
                      onChange={(value) => onUpdateStyle('textAlign', value as string)}
                      options={[
                        { value: 'left', icon: <AlignLeftOutlined /> },
                        { value: 'center', icon: <AlignCenterOutlined /> },
                        { value: 'right', icon: <AlignRightOutlined /> },
                      ]}
                    />
                  </div>

                  {/* Text Color */}
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Text Color</Text>
                    <ColorPicker
                      size="small"
                      defaultValue={rgbToHex(elementProps.color || '#000000')}
                      onChange={(color) => onUpdateStyle('color', color.toHexString())}
                      showText
                    />
                  </div>
                </div>
              ),
            }] : []),

            // Image Section
            ...(isImage ? [{
              key: 'image',
              label: <Text strong style={{ fontSize: 12 }}><PictureOutlined /> Image</Text>,
              children: (
                <div style={{ padding: '0 16px' }}>
                  {/* Current Image Preview */}
                  <div style={{ marginBottom: 12 }}>
                    <img
                      src={elementProps.src}
                      alt={elementProps.alt}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid #eee' }}
                    />
                  </div>

                  {/* Replace Image Button */}
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={onOpenImageModal}
                    block
                    style={{ marginBottom: 12 }}
                  >
                    Replace Image
                  </Button>

                  {/* Alt Text */}
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Alt Text</Text>
                    <Input
                      size="small"
                      defaultValue={elementProps.alt}
                      onBlur={(e) => onUpdateAttribute('alt', e.target.value)}
                      placeholder="Describe the image"
                    />
                  </div>

                  {/* Dimensions */}
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Dimensions</Text>
                    <Space>
                      <InputNumber
                        size="small"
                        placeholder="Width"
                        prefix={<ColumnWidthOutlined />}
                        defaultValue={parseInt(elementProps.width || '0') || undefined}
                        onChange={(value) => onUpdateStyle('width', value ? `${value}px` : 'auto')}
                        style={{ width: 100 }}
                      />
                      <InputNumber
                        size="small"
                        placeholder="Height"
                        prefix={<ColumnHeightOutlined />}
                        defaultValue={parseInt(elementProps.height || '0') || undefined}
                        onChange={(value) => onUpdateStyle('height', value ? `${value}px` : 'auto')}
                        style={{ width: 100 }}
                      />
                    </Space>
                  </div>

                  {/* Border Radius */}
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Border Radius</Text>
                    <Slider
                      min={0}
                      max={50}
                      defaultValue={parseInt(elementProps.borderRadius || '0')}
                      onChange={(value) => onUpdateStyle('borderRadius', `${value}px`)}
                    />
                  </div>
                </div>
              ),
            }] : []),

            // Layout Section
            {
              key: 'layout',
              label: <Text strong style={{ fontSize: 12 }}><BgColorsOutlined /> Background & Spacing</Text>,
              children: (
                <div style={{ padding: '0 16px' }}>
                  {/* Background Color */}
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Background</Text>
                    <ColorPicker
                      size="small"
                      defaultValue={rgbToHex(elementProps.backgroundColor || 'transparent')}
                      onChange={(color) => onUpdateStyle('backgroundColor', color.toHexString())}
                      showText
                      allowClear
                    />
                  </div>

                  {/* Padding */}
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Padding</Text>
                    <InputNumber
                      size="small"
                      min={0}
                      max={100}
                      defaultValue={parseInt(elementProps.padding || '0')}
                      onChange={(value) => onUpdateStyle('padding', `${value}px`)}
                      addonAfter="px"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Margin */}
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Margin</Text>
                    <InputNumber
                      size="small"
                      min={0}
                      max={100}
                      defaultValue={parseInt(elementProps.margin || '0')}
                      onChange={(value) => onUpdateStyle('margin', `${value}px`)}
                      addonAfter="px"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Border Radius */}
                  {!isImage && (
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Border Radius</Text>
                      <InputNumber
                        size="small"
                        min={0}
                        max={100}
                        defaultValue={parseInt(elementProps.borderRadius || '0')}
                        onChange={(value) => onUpdateStyle('borderRadius', `${value}px`)}
                        addonAfter="px"
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}
                </div>
              ),
            },

            // Raw HTML Section
            {
              key: 'html',
              label: <Text strong style={{ fontSize: 12 }}>HTML</Text>,
              children: (
                <div style={{ padding: '0 16px' }}>
                  <div
                    style={{
                      background: '#1e1e1e',
                      padding: 12,
                      borderRadius: 8,
                      overflow: 'auto',
                      maxHeight: 150,
                    }}
                  >
                    <pre style={{ margin: 0, fontSize: 10, color: '#d4d4d4', whiteSpace: 'pre-wrap' }}>
                      {selectedElementHtml}
                    </pre>
                  </div>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      navigator.clipboard.writeText(selectedElementHtml || '');
                      message.success('Copied!');
                    }}
                  >
                    Copy HTML
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

export function Editor() {
  const { screenId } = useParams<{ screenId: string }>();
  const navigate = useNavigate();
  const {
    screens,
    initializeScreens,
    saveScreenVersion,
    getScreenHtml,
    getNextScreen,
    getPreviousScreen,
    getScreenVersions,
  } = useScreensStore();
  const {
    loadScreen,
    isDirty,
    saveChanges,
    discardChanges,
    undo,
    redo,
    canUndo,
    canRedo,
    editorMode,
    setEditorMode,
    zoom,
    setZoom,
    showGrid,
    toggleGrid,
    screenName,
    currentHtml,
    lastPrompt,
    updateHtml,
  } = useEditorStore();

  const [loading, setLoading] = useState(true);
  const [selectedElementProps, setSelectedElementProps] = useState<ElementProperties | null>(null);
  const [selectedElement, setSelectedElementRef] = useState<HTMLElement | null>(null);

  // Image modal state (lifted to Editor for PropertyPanel access)
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState('');

  // Handle element selection from VisualEditor
  const handleElementSelect = useCallback((props: ElementProperties | null, element: HTMLElement | null) => {
    setSelectedElementProps(props);
    setSelectedElementRef(element);
  }, []);

  // Update element style
  const handleUpdateStyle = useCallback((property: string, value: string) => {
    if (!selectedElement) return;

    selectedElement.style[property as any] = value;

    // Update the HTML in store
    const iframeDoc = selectedElement.ownerDocument;
    if (iframeDoc) {
      const newHtml = iframeDoc.documentElement.outerHTML;
      const cleanHtml = newHtml.replace(/<style id="voxel-editor-styles">[\s\S]*?<\/style>/, '');
      updateHtml(cleanHtml);

      // Update local state
      setSelectedElementProps(getElementProperties(selectedElement));
    }
  }, [selectedElement, updateHtml]);

  // Update element attribute
  const handleUpdateAttribute = useCallback((attribute: string, value: string) => {
    if (!selectedElement) return;

    selectedElement.setAttribute(attribute, value);

    // Update the HTML in store
    const iframeDoc = selectedElement.ownerDocument;
    if (iframeDoc) {
      const newHtml = iframeDoc.documentElement.outerHTML;
      const cleanHtml = newHtml.replace(/<style id="voxel-editor-styles">[\s\S]*?<\/style>/, '');
      updateHtml(cleanHtml);

      // Update local state
      setSelectedElementProps(getElementProperties(selectedElement));
    }
  }, [selectedElement, updateHtml]);

  // Delete selected element
  const handleDeleteElement = useCallback(() => {
    if (!selectedElement) return;

    const iframeDoc = selectedElement.ownerDocument;
    selectedElement.remove();

    if (iframeDoc) {
      const newHtml = iframeDoc.documentElement.outerHTML;
      const cleanHtml = newHtml.replace(/<style id="voxel-editor-styles">[\s\S]*?<\/style>/, '');
      updateHtml(cleanHtml);
    }

    setSelectedElementProps(null);
    setSelectedElementRef(null);
    message.success('Element deleted');
  }, [selectedElement, updateHtml]);

  // Duplicate selected element
  const handleDuplicateElement = useCallback(() => {
    if (!selectedElement || !selectedElement.parentElement) return;

    const clone = selectedElement.cloneNode(true) as HTMLElement;
    clone.removeAttribute('data-voxel-selected');
    selectedElement.parentElement.insertBefore(clone, selectedElement.nextSibling);

    const iframeDoc = selectedElement.ownerDocument;
    if (iframeDoc) {
      const newHtml = iframeDoc.documentElement.outerHTML;
      const cleanHtml = newHtml.replace(/<style id="voxel-editor-styles">[\s\S]*?<\/style>/, '');
      updateHtml(cleanHtml);
    }

    message.success('Element duplicated');
  }, [selectedElement, updateHtml]);

  // Image modal handlers
  const handleImageModalOpen = useCallback((src: string) => {
    setImageModalSrc(src);
    setImageModalOpen(true);
  }, []);

  const handleImageModalClose = useCallback(() => {
    setImageModalOpen(false);
    setImageModalSrc('');
  }, []);

  const handleImageReplace = useCallback((newSrc: string) => {
    if (!selectedElement || selectedElement.tagName !== 'IMG') return;

    (selectedElement as HTMLImageElement).src = newSrc;

    const iframeDoc = selectedElement.ownerDocument;
    if (iframeDoc) {
      const newHtml = iframeDoc.documentElement.outerHTML;
      const cleanHtml = newHtml.replace(/<style id="voxel-editor-styles">[\s\S]*?<\/style>/, '');
      updateHtml(cleanHtml);

      // Update local state
      setSelectedElementProps(getElementProperties(selectedElement));
    }
  }, [selectedElement, updateHtml]);

  // Open image modal from property panel
  const handleOpenImageModal = useCallback(() => {
    if (selectedElement && selectedElement.tagName === 'IMG') {
      handleImageModalOpen((selectedElement as HTMLImageElement).src);
    } else {
      handleImageModalOpen('');
    }
  }, [selectedElement, handleImageModalOpen]);

  // Initialize screens store
  useEffect(() => {
    initializeScreens();
  }, [initializeScreens]);

  const screen = screens.find((s) => s.id === screenId);
  const nextScreen = screenId ? getNextScreen(screenId) : null;
  const prevScreen = screenId ? getPreviousScreen(screenId) : null;
  const versions = screenId ? getScreenVersions(screenId) : [];

  // Load screen content
  useEffect(() => {
    if (screen) {
      setLoading(true);

      // Check if we have edited HTML first
      const editedHtml = getScreenHtml(screen.id);
      if (editedHtml) {
        loadScreen(screen.id, screen.name, editedHtml);
        setLoading(false);
        return;
      }

      // Otherwise fetch from file
      fetch(screen.filePath)
        .then((res) => res.text())
        .then((html) => {
          loadScreen(screen.id, screen.name, html);
          setLoading(false);
        })
        .catch(() => {
          // If fetch fails, use placeholder
          const placeholder = `<!DOCTYPE html><html><head><title>${screen.name}</title></head><body style="font-family: sans-serif; padding: 40px;"><h1>Screen: ${screen.name}</h1><p>Edit this screen using the AI prompt or visual editor.</p></body></html>`;
          loadScreen(screen.id, screen.name, placeholder);
          setLoading(false);
        });
    }
  }, [screen?.id, loadScreen, getScreenHtml]);

  const handleSave = async () => {
    if (!screenId || !currentHtml) return;

    try {
      // Save to screens store with version history
      await saveScreenVersion(screenId, currentHtml, {
        prompt: lastPrompt || undefined,
        description: 'Manual edit',
      });

      // Update editor state
      saveChanges();
      message.success('Changes saved!');
    } catch (error) {
      console.error('Save failed:', error);
      message.error(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleNavigateToScreen = (targetScreenId: string) => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Save before navigating?')) {
        handleSave();
      }
    }
    navigate(`/editor/${targetScreenId}`);
  };

  const handleBack = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Discard them?')) {
        discardChanges();
        navigate('/screens');
      }
    } else {
      navigate('/screens');
    }
  };

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

  return (
    <Layout style={{ height: 'calc(100vh - 112px)', margin: -24 }}>
      {/* Top Toolbar */}
      <div
        style={{
          height: 48,
          background: 'white',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={handleBack} />
          <Divider type="vertical" />
          <Tooltip title={prevScreen ? `Previous: ${prevScreen.name}` : 'No previous screen'}>
            <Button
              icon={<LeftOutlined />}
              type="text"
              size="small"
              disabled={!prevScreen}
              onClick={() => prevScreen && handleNavigateToScreen(prevScreen.id)}
            />
          </Tooltip>
          <Text strong style={{ maxWidth: 200 }} ellipsis>
            {screenName}
          </Text>
          <Tooltip title={nextScreen ? `Next: ${nextScreen.name}` : 'No next screen'}>
            <Button
              icon={<RightOutlined />}
              type="text"
              size="small"
              disabled={!nextScreen}
              onClick={() => nextScreen && handleNavigateToScreen(nextScreen.id)}
            />
          </Tooltip>
          {isDirty && <Tag color="orange">Unsaved</Tag>}
          {versions.length > 0 && (
            <Tooltip title={`${versions.length} saved version${versions.length > 1 ? 's' : ''}`}>
              <Tag color="blue" icon={<HistoryOutlined />}>
                v{versions.length}
              </Tag>
            </Tooltip>
          )}
        </Space>

        <Space>
          <Segmented
            size="small"
            value={editorMode}
            onChange={(v) => setEditorMode(v as 'select' | 'edit' | 'move')}
            options={[
              { value: 'select', icon: <SelectOutlined />, label: 'Select' },
              { value: 'edit', icon: <EditOutlined />, label: 'Edit' },
              { value: 'move', icon: <DragOutlined />, label: 'Move' },
            ]}
          />
          <Divider type="vertical" />
          <Tooltip title="Toggle Grid">
            <Button
              icon={<BorderOutlined />}
              type={showGrid ? 'primary' : 'text'}
              size="small"
              onClick={toggleGrid}
            />
          </Tooltip>
          <Tooltip title="Zoom Out">
            <Button
              icon={<ZoomOutOutlined />}
              type="text"
              size="small"
              onClick={() => setZoom(zoom - 25)}
              disabled={zoom <= 25}
            />
          </Tooltip>
          <Text style={{ minWidth: 50, textAlign: 'center' }}>{zoom}%</Text>
          <Tooltip title="Zoom In">
            <Button
              icon={<ZoomInOutlined />}
              type="text"
              size="small"
              onClick={() => setZoom(zoom + 25)}
              disabled={zoom >= 200}
            />
          </Tooltip>
          <Divider type="vertical" />
          <Tooltip title="Undo">
            <Button
              icon={<UndoOutlined />}
              type="text"
              size="small"
              onClick={undo}
              disabled={!canUndo()}
            />
          </Tooltip>
          <Tooltip title="Redo">
            <Button
              icon={<RedoOutlined />}
              type="text"
              size="small"
              onClick={redo}
              disabled={!canRedo()}
            />
          </Tooltip>
          <Divider type="vertical" />
          <Button
            icon={<SaveOutlined />}
            type="primary"
            onClick={handleSave}
            disabled={!isDirty}
          >
            Save
          </Button>
        </Space>
      </div>

      <Layout style={{ flex: 1 }}>
        {/* Left Panel - AI Prompt */}
        <Sider
          width={300}
          theme="light"
          style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}
        >
          <AIPromptPanel />
        </Sider>

        {/* Center - Visual Editor */}
        {loading ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Spin size="large" />
          </div>
        ) : (
          <VisualEditor
            onElementSelect={handleElementSelect}
            imageModalOpen={imageModalOpen}
            imageModalSrc={imageModalSrc}
            onImageModalClose={handleImageModalClose}
            onImageModalOpen={handleImageModalOpen}
            onImageReplace={handleImageReplace}
          />
        )}

        {/* Right Panel - Property Editor */}
        <Sider
          width={300}
          theme="light"
          style={{ borderLeft: '1px solid #f0f0f0', overflow: 'hidden' }}
        >
          <PropertyPanel
            elementProps={selectedElementProps}
            element={selectedElement}
            onUpdateStyle={handleUpdateStyle}
            onUpdateAttribute={handleUpdateAttribute}
            onDelete={handleDeleteElement}
            onDuplicate={handleDuplicateElement}
            onOpenImageModal={handleOpenImageModal}
          />
        </Sider>
      </Layout>
    </Layout>
  );
}

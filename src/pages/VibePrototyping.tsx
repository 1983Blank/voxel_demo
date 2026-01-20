/**
 * VibePrototyping Page - "Vibe Coding" Style Interface
 *
 * Split-panel layout:
 * - Left: Screen preview with variant tabs
 * - Right: Chat panel for prompts and AI responses
 * - Bottom: Expandable sections for plans and source analysis
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Space,
  Spin,
  message,
  Alert,
  Result,
  Collapse,
  Badge,
  Tag,
} from 'antd';
import {
  ArrowLeftOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';

import { useScreensStore } from '@/store/screensStore';
import { useVibeStore, type ChatMessage } from '@/store/vibeStore';
import { useContextStore } from '@/store/contextStore';

import {
  analyzeScreen,
  getCachedMetadata,
  type UIMetadata,
} from '@/services/screenAnalyzerService';
import {
  createVibeSession,
  generateVariantPlan,
  getVibeSession,
  getVariantPlans,
  approvePlan,
  updateVariantPlan,
  type VariantPlan,
} from '@/services/variantPlanService';
import {
  generateAllVariants,
  getVariants,
  selectVariant,
} from '@/services/variantCodeService';

import {
  SourceAnalysisPanel,
  PlanReviewGrid,
  VariantPreviewModal,
  ChatPanel,
  ScreenPreview,
  ModelSelector,
  type SelectedTab,
} from '@/components/Vibe';

const { Title, Text } = Typography;
const { Panel } = Collapse;

export const VibePrototyping: React.FC = () => {
  const { screenId, sessionId } = useParams<{ screenId: string; sessionId?: string }>();
  const navigate = useNavigate();

  // External stores
  const { getScreenById, initializeScreens, screens } = useScreensStore();
  const { contexts } = useContextStore();

  // Vibe store
  const {
    currentSession,
    sourceMetadata,
    plan,
    variants,
    messages,
    status,
    progress,
    error,
    selectedVariantIndex,
    previewVariantIndex,
    previewTab,
    initSession,
    setSession,
    clearSession,
    setSourceMetadata,
    setAnalyzing,
    setPlan,
    updatePlanItem,
    approvePlan: storeApprovePlan,
    setVariants,
    setStatus,
    setProgress,
    setError,
    selectVariant: storeSelectVariant,
    setPreviewVariant,
    setPreviewTab,
    addMessage,
    updateMessage,
    getPlanByIndex,
    getVariantByIndex,
  } = useVibeStore();

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [screen, setScreen] = useState<ReturnType<typeof getScreenById> | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Initialize screen data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      // Fetch screens if empty
      if (screens.length === 0) {
        await initializeScreens();
      }

      // Get screen
      if (screenId) {
        const s = getScreenById(screenId);
        setScreen(s);

        if (s?.editedHtml) {
          // Check for cached metadata
          const cached = await getCachedMetadata(screenId);
          if (cached) {
            setSourceMetadata(cached as unknown as UIMetadata);
          }

          // If session ID provided, load existing session
          if (sessionId) {
            const session = await getVibeSession(sessionId);
            if (session) {
              initSession(session, s.editedHtml);

              // Load plans and variants
              const plans = await getVariantPlans(sessionId);
              if (plans.length > 0) {
                setPlan({ plans, model: '', provider: '' });
              }

              const existingVariants = await getVariants(sessionId);
              if (existingVariants.length > 0) {
                setVariants(existingVariants);

                // Auto-select the first completed variant tab, or the selected one
                const completedVariant = existingVariants.find((v) => v.status === 'complete');
                if (session.selected_variant_index) {
                  setPreviewTab(session.selected_variant_index as 1 | 2 | 3 | 4);
                } else if (completedVariant) {
                  setPreviewTab(completedVariant.variant_index as 1 | 2 | 3 | 4);
                }
              }
            }
          } else {
            // No session, clear state for new session
            clearSession();
          }
        }
      }

      setIsLoading(false);
    };

    init();
  }, [screenId, sessionId]);

  // Add chat message helper
  const addChatMessage = useCallback(
    (
      role: ChatMessage['role'],
      content: string,
      status?: ChatMessage['status'],
      metadata?: ChatMessage['metadata']
    ) => {
      return addMessage({ role, content, status, metadata });
    },
    [addMessage]
  );

  // Handle chat message submission
  const handleSendMessage = useCallback(
    async (prompt: string) => {
      if (!screen?.editedHtml || !screenId) return;

      try {
        // Add user message
        addChatMessage('user', prompt);

        // Create new session
        const sessionName = `Vibe: ${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}`;
        const session = await createVibeSession(screenId, sessionName, prompt);

        if (!session) {
          throw new Error('Failed to create session');
        }

        // Initialize store with session
        initSession(session, screen.editedHtml);

        // Re-add user message after init (which clears messages)
        addChatMessage('user', prompt);

        // Update URL with session ID
        navigate(`/vibe/${screenId}/${session.id}`, { replace: true });

        // Add analyzing message
        const analyzingMsgId = addChatMessage(
          'assistant',
          'Analyzing the screen design...',
          'pending'
        );

        // Analyze screen if not cached
        setAnalyzing(true, 'Analyzing screen design...');

        let metadata = sourceMetadata;
        if (!metadata) {
          const result = await analyzeScreen(screenId, screen.editedHtml, (p) => {
            setProgress({
              stage: 'analyzing',
              message: p.message,
              percent: p.percent,
            });
          });
          metadata = result.metadata;
          setSourceMetadata(metadata);
        }

        // Update analyzing message
        updateMessage(analyzingMsgId, {
          content: 'Screen analysis complete. Now designing 4 variant concepts...',
          status: 'complete',
        });

        // Add planning message
        const planningMsgId = addChatMessage(
          'assistant',
          'AI is designing 4 different approaches based on your prompt...',
          'pending'
        );

        // Generate variant plan
        setStatus('planning');
        setProgress({
          stage: 'planning',
          message: 'AI is designing 4 variants...',
          percent: 30,
        });

        const result = await generateVariantPlan(
          session.id,
          prompt,
          screen.editedHtml,
          metadata,
          undefined,
          (p) => {
            setProgress({
              stage: 'planning',
              message: p.message,
              percent: 30 + p.percent * 0.4,
            });
          }
        );

        setPlan({
          plans: result.plans,
          model: result.model,
          provider: result.provider,
        });

        setSession(result.session);

        // Update planning message
        updateMessage(planningMsgId, {
          content: `Here are 4 variant concepts:\n\n${result.plans
            .map((p, i) => `${i + 1}. **${p.title}**: ${p.description}`)
            .join('\n\n')}\n\nReview and approve to generate the code.`,
          status: 'complete',
        });

        // Expand plans section
        setExpandedSections(['plans']);
      } catch (err) {
        console.error('Error generating plan:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate plan';
        setError(errorMsg);
        addChatMessage('assistant', `Error: ${errorMsg}`, 'error');
        message.error('Failed to generate variant plan');
      }
    },
    [screen, screenId, sourceMetadata, contexts]
  );

  // Handle plan approval
  const handleApprovePlan = useCallback(async () => {
    if (!currentSession?.id || !plan || !screen?.editedHtml) return;

    try {
      // Approve plan in database
      const session = await approvePlan(currentSession.id);
      if (session) {
        storeApprovePlan();
      }

      // Add generating message
      const generatingMsgId = addChatMessage(
        'assistant',
        'Starting code generation for all 4 variants...',
        'pending'
      );

      // Start generating variants
      setStatus('generating');
      setProgress({
        stage: 'generating',
        message: 'Starting code generation...',
        percent: 0,
      });

      // Generate all variants sequentially
      const generatedVariants = await generateAllVariants(
        currentSession.id,
        plan.plans,
        screen.editedHtml,
        sourceMetadata || undefined,
        undefined,
        (p) => {
          setProgress({
            stage: 'generating',
            message: p.message,
            percent: p.percent,
            variantIndex: p.variantIndex,
            variantTitle: p.title,
          });

          // Update message with progress
          updateMessage(generatingMsgId, {
            content: `Generating variants...\n\n${p.message}`,
          });

          // Update individual variant in store as it completes
          if (p.stage === 'complete') {
            getVariants(currentSession.id).then(setVariants);

            // Auto-switch to completed variant tab
            if (p.variantIndex) {
              setPreviewTab(p.variantIndex as SelectedTab);
            }
          }
        }
      );

      setVariants(generatedVariants);
      setStatus('complete');
      setProgress(null);

      // Update final message
      updateMessage(generatingMsgId, {
        content:
          'All 4 variants have been generated! Use the tabs below the preview to switch between them, and click to select a winner.',
        status: 'complete',
      });

      // Collapse plans section
      setExpandedSections([]);

      message.success('All variants generated successfully!');
    } catch (err) {
      console.error('Error generating variants:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate variants';
      setError(errorMsg);
      addChatMessage('assistant', `Error generating variants: ${errorMsg}`, 'error');
      message.error('Failed to generate variant code');
    }
  }, [currentSession, plan, screen, sourceMetadata]);

  // Handle plan item update
  const handleUpdatePlan = useCallback(
    async (variantIndex: number, updates: Partial<VariantPlan>) => {
      const planItem = getPlanByIndex(variantIndex);
      if (!planItem) return;

      try {
        await updateVariantPlan(planItem.id, updates);
        updatePlanItem(variantIndex, updates);
      } catch (err) {
        console.error('Error updating plan:', err);
        message.error('Failed to update plan');
      }
    },
    [getPlanByIndex]
  );

  // Handle regenerate plan
  const handleRegeneratePlan = useCallback(() => {
    setStatus('idle');
    setPlan(null as unknown as { plans: VariantPlan[]; model: string; provider: string });
    addChatMessage('system', 'Plan cleared. Enter a new prompt to generate variants.');
  }, []);

  // Handle variant selection
  const handleSelectVariant = useCallback(
    async (index: number) => {
      if (!currentSession?.id) return;

      try {
        await selectVariant(currentSession.id, index);
        storeSelectVariant(index);
        addChatMessage(
          'assistant',
          `Variant ${index} has been selected as the winner! You can now apply it to your screen.`,
          'complete',
          { variantIndex: index }
        );
        message.success(`Variant ${index} selected as winner!`);
      } catch (err) {
        console.error('Error selecting variant:', err);
        message.error('Failed to select variant');
      }
    },
    [currentSession]
  );

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: SelectedTab) => {
      setPreviewTab(tab);
    },
    [setPreviewTab]
  );

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // No screen found
  if (!screen) {
    return (
      <Result
        status="404"
        title="Screen Not Found"
        subTitle="The screen you're looking for doesn't exist."
        extra={
          <Button type="primary" onClick={() => navigate('/screens')}>
            Go to Screens
          </Button>
        }
      />
    );
  }

  // Preview modal variant
  const previewPlan = previewVariantIndex ? getPlanByIndex(previewVariantIndex) : null;
  const previewVariant = previewVariantIndex ? getVariantByIndex(previewVariantIndex) : null;

  // Status badge
  const getStatusBadge = () => {
    switch (status) {
      case 'analyzing':
        return <Tag color="processing">Analyzing</Tag>;
      case 'planning':
        return <Tag color="processing">Planning</Tag>;
      case 'plan_ready':
        return <Tag color="warning">Review Plan</Tag>;
      case 'generating':
        return <Tag color="processing">Generating</Tag>;
      case 'complete':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Complete</Tag>;
      case 'failed':
        return <Tag color="error">Failed</Tag>;
      default:
        return <Tag>Ready</Tag>;
    }
  };

  // Check if chat is active
  const isChatActive = status === 'idle' || status === 'complete';
  const isGenerating = status === 'analyzing' || status === 'planning' || status === 'generating';

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fff',
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/screens')}>
            Back
          </Button>
          <div>
            <Space align="center">
              <ThunderboltOutlined style={{ fontSize: 20, color: '#764ba2' }} />
              <Title level={4} style={{ marginBottom: 0 }}>
                Vibe Prototyping
              </Title>
              {getStatusBadge()}
            </Space>
            <div>
              <Text type="secondary">{screen.name}</Text>
            </div>
          </div>
        </Space>

        <Space>
          <ModelSelector size="small" />
          {selectedVariantIndex && (
            <Tag color="gold" icon={<CheckCircleOutlined />}>
              Winner: Variant {selectedVariantIndex}
            </Tag>
          )}
          <Button icon={<SettingOutlined />} type="text" />
        </Space>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          type="error"
          message="Error"
          description={error}
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ margin: '8px 24px' }}
        />
      )}

      {/* Variant Plans Section - Prominent when plans are ready */}
      {status === 'plan_ready' && plan && (
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: '#fffbe6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Space>
              <AppstoreOutlined style={{ color: '#faad14' }} />
              <Text strong>Review Variant Plans</Text>
              <Badge count={plan.plans.length} style={{ backgroundColor: '#1890ff' }} />
              <Tag color="warning">Awaiting Approval</Tag>
            </Space>
            <Button
              type="primary"
              onClick={handleApprovePlan}
              icon={<ThunderboltOutlined />}
            >
              Approve & Generate All
            </Button>
          </div>
          <PlanReviewGrid
            plans={plan.plans}
            onUpdatePlan={handleUpdatePlan}
            onApprove={handleApprovePlan}
            onRegenerate={handleRegeneratePlan}
            isApproved={false}
            modelInfo={{ model: plan.model, provider: plan.provider }}
            compact
          />
        </div>
      )}

      {/* Main Content - Split Panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left - Screen Preview */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
            <ScreenPreview
              sourceHtml={screen.editedHtml || null}
              variants={variants}
              selectedTab={previewTab}
              onTabChange={handleTabChange}
              selectedVariantIndex={selectedVariantIndex}
              onExpandPreview={
                previewTab !== 'source' && getVariantByIndex(previewTab as number)
                  ? () => setPreviewVariant(previewTab as number)
                  : undefined
              }
              isGenerating={isGenerating}
              currentGeneratingIndex={progress?.variantIndex}
            />
          </div>
        </div>

        {/* Right - Chat Panel */}
        <div
          style={{
            width: 400,
            borderLeft: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isGenerating}
              disabled={!isChatActive && !isGenerating}
              placeholder={
                status === 'plan_ready'
                  ? 'Approve the plan first to generate variants'
                  : 'Describe your design changes...'
              }
            />
          </div>
        </div>
      </div>

      {/* Bottom - Expandable Sections */}
      <div style={{ borderTop: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
        <Collapse
          activeKey={expandedSections}
          onChange={(keys) => setExpandedSections(keys as string[])}
          ghost
          style={{ borderRadius: 0 }}
        >
          {/* Variant Plans - Only show in collapsed section after approval */}
          {plan && status !== 'plan_ready' && (
            <Panel
              key="plans"
              header={
                <Space>
                  <AppstoreOutlined />
                  <span>Variant Plans</span>
                  <Badge count={plan.plans.length} style={{ backgroundColor: '#1890ff' }} />
                  {currentSession?.plan_approved && (
                    <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag>
                  )}
                </Space>
              }
            >
              <div style={{ padding: '8px 0' }}>
                <PlanReviewGrid
                  plans={plan.plans}
                  onUpdatePlan={handleUpdatePlan}
                  onApprove={handleApprovePlan}
                  onRegenerate={handleRegeneratePlan}
                  isApproved={currentSession?.plan_approved}
                  modelInfo={{ model: plan.model, provider: plan.provider }}
                  compact
                />
              </div>
            </Panel>
          )}

          {/* Source Analysis */}
          <Panel
            key="analysis"
            header={
              <Space>
                <FileSearchOutlined />
                <span>Source Analysis</span>
                {sourceMetadata && (
                  <Tag color="green">
                    {sourceMetadata.components.length} components
                  </Tag>
                )}
              </Space>
            }
          >
            <div style={{ padding: '8px 0', maxHeight: 300, overflow: 'auto' }}>
              <SourceAnalysisPanel
                sourceHtml={screen.editedHtml || null}
                metadata={sourceMetadata}
                isAnalyzing={status === 'analyzing'}
                analysisMessage={progress?.message}
              />
            </div>
          </Panel>
        </Collapse>
      </div>

      {/* Preview Modal */}
      <VariantPreviewModal
        open={previewVariantIndex !== null}
        onClose={() => setPreviewVariant(null)}
        variant={previewVariant || null}
        plan={previewPlan || null}
        onSelect={() => previewVariantIndex && handleSelectVariant(previewVariantIndex)}
        isSelected={selectedVariantIndex === previewVariantIndex}
      />
    </div>
  );
};

export default VibePrototyping;

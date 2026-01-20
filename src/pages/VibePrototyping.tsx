/**
 * VibePrototyping Page
 * Plan-first variant generation workflow
 *
 * Flow:
 * 1. Select Screen → 2. Analyze UI → 3. Enter Prompt → 4. Review Plan (4 variants)
 *                                                              ↓
 * 5. Approve Plan → 6. Generate Code (sequential) → 7. Compare Variants → 8. Select Winner
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Typography,
  Button,
  Space,
  Spin,
  Empty,
  message,
  Row,
  Col,
  Steps,
  Alert,
  Card,
  Result,
} from 'antd';
import {
  ArrowLeftOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FileSearchOutlined,
  BulbOutlined,
  CodeOutlined,
  TrophyOutlined,
} from '@ant-design/icons';

import { useScreensStore } from '@/store/screensStore';
import { useVibeStore, type ComparisonMode } from '@/store/vibeStore';
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
  type VibeSession,
  type VariantPlan,
} from '@/services/variantPlanService';
import {
  generateAllVariants,
  getVariants,
  selectVariant,
  type VibeVariant,
} from '@/services/variantCodeService';

import {
  SourceAnalysisPanel,
  PromptInputPanel,
  PlanReviewGrid,
  GenerationProgress,
  VariantComparisonView,
  VariantPreviewModal,
} from '@/components/Vibe';

const { Title, Text } = Typography;

// Workflow steps
const WORKFLOW_STEPS = [
  { title: 'Analyze', icon: <FileSearchOutlined /> },
  { title: 'Plan', icon: <BulbOutlined /> },
  { title: 'Generate', icon: <CodeOutlined /> },
  { title: 'Compare', icon: <EyeOutlined /> },
  { title: 'Select', icon: <TrophyOutlined /> },
];

export const VibePrototyping: React.FC = () => {
  const { screenId, sessionId } = useParams<{ screenId: string; sessionId?: string }>();
  const navigate = useNavigate();

  // External stores
  const { getScreen, fetchScreens, screens } = useScreensStore();
  const { contexts } = useContextStore();

  // Vibe store
  const {
    currentSession,
    sourceHtml,
    sourceMetadata,
    plan,
    variants,
    status,
    progress,
    error,
    selectedVariantIndex,
    comparisonMode,
    previewVariantIndex,
    initSession,
    setSession,
    clearSession,
    setSourceMetadata,
    setAnalyzing,
    setPlan,
    updatePlanItem,
    approvePlan: storeApprovePlan,
    setVariants,
    addVariant,
    setStatus,
    setProgress,
    setError,
    selectVariant: storeSelectVariant,
    setComparisonMode,
    setPreviewVariant,
    getPlanByIndex,
    getVariantByIndex,
  } = useVibeStore();

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [screen, setScreen] = useState<ReturnType<typeof getScreen> | null>(null);

  // Initialize screen data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      // Fetch screens if empty
      if (screens.length === 0) {
        await fetchScreens();
      }

      // Get screen
      if (screenId) {
        const s = getScreen(screenId);
        setScreen(s);

        if (s?.html) {
          // Check for cached metadata
          const cached = await getCachedMetadata(screenId);
          if (cached) {
            setSourceMetadata(cached as unknown as UIMetadata);
          }

          // If session ID provided, load existing session
          if (sessionId) {
            const session = await getVibeSession(sessionId);
            if (session) {
              initSession(session, s.html);

              // Load plans and variants
              const plans = await getVariantPlans(sessionId);
              if (plans.length > 0) {
                setPlan({ plans, model: '', provider: '' });
              }

              const existingVariants = await getVariants(sessionId);
              if (existingVariants.length > 0) {
                setVariants(existingVariants);
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

  // Handle prompt submission
  const handleSubmitPrompt = useCallback(
    async (prompt: string, contextId?: string) => {
      if (!screen?.html || !screenId) return;

      try {
        // Create new session
        const sessionName = `Vibe: ${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}`;
        const session = await createVibeSession(screenId, sessionName, prompt);

        if (!session) {
          throw new Error('Failed to create session');
        }

        // Initialize store with session
        initSession(session, screen.html);

        // Update URL with session ID
        navigate(`/vibe/${screenId}/${session.id}`, { replace: true });

        // Analyze screen if not cached
        setAnalyzing(true, 'Analyzing screen design...');

        let metadata = sourceMetadata;
        if (!metadata) {
          const result = await analyzeScreen(screenId, screen.html, (p) => {
            setProgress({
              stage: 'analyzing',
              message: p.message,
              percent: p.percent,
            });
          });
          metadata = result.metadata;
          setSourceMetadata(metadata);
        }

        // Get product context if selected
        let productContext: string | undefined;
        if (contextId) {
          const ctx = contexts.find((c) => c.id === contextId);
          productContext = ctx?.content;
        }

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
          screen.html,
          metadata,
          productContext,
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

      } catch (err) {
        console.error('Error generating plan:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate plan');
        message.error('Failed to generate variant plan');
      }
    },
    [screen, screenId, sourceMetadata, contexts]
  );

  // Handle plan approval
  const handleApprovePlan = useCallback(async () => {
    if (!currentSession?.id || !plan || !screen?.html) return;

    try {
      // Approve plan in database
      const session = await approvePlan(currentSession.id);
      if (session) {
        storeApprovePlan();
      }

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
        screen.html,
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

          // Update individual variant in store as it completes
          if (p.stage === 'complete') {
            // Refresh variant data
            getVariants(currentSession.id).then(setVariants);
          }
        }
      );

      setVariants(generatedVariants);
      setStatus('complete');
      setProgress(null);
      message.success('All variants generated successfully!');

    } catch (err) {
      console.error('Error generating variants:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate variants');
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
    // Clear current plan and go back to prompt input
    setStatus('idle');
    setPlan(null as unknown as { plans: VariantPlan[]; model: string; provider: string });
  }, []);

  // Handle variant selection
  const handleSelectVariant = useCallback(
    async (index: number) => {
      if (!currentSession?.id) return;

      try {
        await selectVariant(currentSession.id, index);
        storeSelectVariant(index);
        message.success(`Variant ${index} selected as winner!`);
      } catch (err) {
        console.error('Error selecting variant:', err);
        message.error('Failed to select variant');
      }
    },
    [currentSession]
  );

  // Calculate current step
  const getCurrentStep = () => {
    switch (status) {
      case 'idle':
        return sourceMetadata ? 1 : 0;
      case 'analyzing':
        return 0;
      case 'planning':
        return 1;
      case 'plan_ready':
        return 2;
      case 'generating':
        return 2;
      case 'complete':
        return selectedVariantIndex ? 4 : 3;
      case 'failed':
        return -1;
      default:
        return 0;
    }
  };

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

  return (
    <div style={{ padding: '0 24px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/screens')}
          >
            Back
          </Button>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              <ThunderboltOutlined style={{ marginRight: 8, color: '#764ba2' }} />
              Vibe Prototyping
            </Title>
            <Text type="secondary">{screen.name}</Text>
          </div>
        </Space>

        {/* Progress Steps */}
        <Steps
          size="small"
          current={getCurrentStep()}
          items={WORKFLOW_STEPS}
          style={{ maxWidth: 600 }}
        />
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
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Main Content */}
      <Row gutter={24}>
        {/* Left Sidebar - Source Analysis */}
        <Col xs={24} lg={6}>
          <SourceAnalysisPanel
            sourceHtml={screen.html || null}
            metadata={sourceMetadata}
            isAnalyzing={status === 'analyzing'}
            analysisMessage={progress?.message}
          />
        </Col>

        {/* Main Area */}
        <Col xs={24} lg={18}>
          {/* Stage: Prompt Input */}
          {(status === 'idle' || status === 'analyzing') && (
            <PromptInputPanel
              onSubmit={handleSubmitPrompt}
              isLoading={status === 'analyzing'}
              productContexts={contexts.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
              disabled={status === 'analyzing'}
              defaultPrompt={currentSession?.prompt}
            />
          )}

          {/* Stage: Planning */}
          {status === 'planning' && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Title level={4}>AI is designing your variants...</Title>
                  <Text type="secondary">{progress?.message}</Text>
                </div>
              </div>
            </Card>
          )}

          {/* Stage: Plan Review */}
          {status === 'plan_ready' && plan && (
            <PlanReviewGrid
              plans={plan.plans}
              onUpdatePlan={handleUpdatePlan}
              onApprove={handleApprovePlan}
              onRegenerate={handleRegeneratePlan}
              isApproved={currentSession?.plan_approved}
              modelInfo={{ model: plan.model, provider: plan.provider }}
            />
          )}

          {/* Stage: Generating */}
          {status === 'generating' && plan && (
            <Row gutter={24}>
              <Col xs={24} lg={12}>
                <GenerationProgress
                  plans={plan.plans}
                  variants={variants}
                  currentVariantIndex={progress?.variantIndex}
                  currentMessage={progress?.message}
                  overallPercent={progress?.percent}
                  error={error}
                />
              </Col>
              <Col xs={24} lg={12}>
                <VariantComparisonView
                  plans={plan.plans}
                  variants={variants}
                  selectedVariantIndex={selectedVariantIndex}
                  onSelectVariant={handleSelectVariant}
                  onPreviewVariant={setPreviewVariant}
                  comparisonMode={comparisonMode}
                  onChangeMode={setComparisonMode}
                  isGenerating
                />
              </Col>
            </Row>
          )}

          {/* Stage: Complete */}
          {status === 'complete' && plan && (
            <VariantComparisonView
              plans={plan.plans}
              variants={variants}
              selectedVariantIndex={selectedVariantIndex}
              onSelectVariant={handleSelectVariant}
              onPreviewVariant={setPreviewVariant}
              comparisonMode={comparisonMode}
              onChangeMode={setComparisonMode}
            />
          )}
        </Col>
      </Row>

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

/**
 * Tests for PlanReviewGrid component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanReviewGrid } from './PlanReviewGrid';
import type { VariantPlan } from '../../services/variantPlanService';

const mockPlans: VariantPlan[] = [
  {
    id: 'plan-1',
    session_id: 'session-1',
    variant_index: 1,
    title: 'Conservative',
    description: 'A conservative approach',
    key_changes: ['Change 1'],
    style_notes: null,
    created_at: '',
  },
  {
    id: 'plan-2',
    session_id: 'session-1',
    variant_index: 2,
    title: 'Modern',
    description: 'A modern approach',
    key_changes: ['Change 2'],
    style_notes: null,
    created_at: '',
  },
  {
    id: 'plan-3',
    session_id: 'session-1',
    variant_index: 3,
    title: 'Bold',
    description: 'A bold approach',
    key_changes: ['Change 3'],
    style_notes: null,
    created_at: '',
  },
  {
    id: 'plan-4',
    session_id: 'session-1',
    variant_index: 4,
    title: 'Alternative',
    description: 'An alternative approach',
    key_changes: ['Change 4'],
    style_notes: null,
    created_at: '',
  },
];

describe('PlanReviewGrid', () => {
  it('should render all 4 plans', () => {
    render(<PlanReviewGrid plans={mockPlans} />);

    // Each variant title appears in the card (from mockPlans)
    // Use getAllByText since text may appear multiple times (label + title)
    expect(screen.getAllByText('Conservative').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Modern').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bold').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Alternative').length).toBeGreaterThanOrEqual(1);
  });

  it('should show loading state', () => {
    render(<PlanReviewGrid plans={[]} isLoading={true} loadingMessage="Generating..." />);

    expect(screen.getByText('AI is designing your variants...')).toBeInTheDocument();
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('should show empty state when no plans', () => {
    render(<PlanReviewGrid plans={[]} />);

    expect(screen.getByText('No variant plans generated yet')).toBeInTheDocument();
  });

  it('should show approve button', () => {
    render(<PlanReviewGrid plans={mockPlans} />);

    expect(screen.getByRole('button', { name: /approve.*generate/i })).toBeInTheDocument();
  });

  it('should show regenerate button', () => {
    render(<PlanReviewGrid plans={mockPlans} />);

    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
  });

  it('should call onApprove when approve button clicked', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();

    render(<PlanReviewGrid plans={mockPlans} onApprove={onApprove} />);

    await user.click(screen.getByRole('button', { name: /approve.*generate/i }));

    expect(onApprove).toHaveBeenCalled();
  });

  it('should call onRegenerate when regenerate button clicked', async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();

    render(<PlanReviewGrid plans={mockPlans} onRegenerate={onRegenerate} />);

    await user.click(screen.getByRole('button', { name: /regenerate/i }));

    expect(onRegenerate).toHaveBeenCalled();
  });

  it('should disable buttons when approved', () => {
    render(<PlanReviewGrid plans={mockPlans} isApproved={true} />);

    expect(screen.getByRole('button', { name: /approved/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeDisabled();
  });

  it('should show approved alert when isApproved is true', () => {
    render(<PlanReviewGrid plans={mockPlans} isApproved={true} />);

    expect(screen.getByText(/plan approved/i)).toBeInTheDocument();
  });

  it('should display model info when provided', () => {
    render(
      <PlanReviewGrid
        plans={mockPlans}
        modelInfo={{ model: 'claude-sonnet', provider: 'anthropic' }}
      />
    );

    expect(screen.getByText(/claude-sonnet/i)).toBeInTheDocument();
    expect(screen.getByText(/anthropic/i)).toBeInTheDocument();
  });

  it('should call onUpdatePlan when plan is edited', async () => {
    const user = userEvent.setup();
    const onUpdatePlan = vi.fn();

    render(<PlanReviewGrid plans={mockPlans} onUpdatePlan={onUpdatePlan} />);

    // Find and click the first edit button
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    // Modify and save
    const titleInput = screen.getByDisplayValue('Conservative');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Conservative');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onUpdatePlan).toHaveBeenCalledWith(1, expect.objectContaining({
      title: 'Updated Conservative',
    }));
  });

  it('should show help text when not approved', () => {
    render(<PlanReviewGrid plans={mockPlans} isApproved={false} />);

    expect(screen.getByText(/click the edit icon/i)).toBeInTheDocument();
  });

  it('should not show help text when approved', () => {
    render(<PlanReviewGrid plans={mockPlans} isApproved={true} />);

    expect(screen.queryByText(/click the edit icon/i)).not.toBeInTheDocument();
  });

  it('should render plans in correct order', () => {
    // Shuffle plans to test sorting
    const shuffledPlans = [...mockPlans].reverse();

    render(<PlanReviewGrid plans={shuffledPlans} />);

    // Get all variant index badges
    const badges = screen.getAllByText(/^[1-4]$/);

    // Should be sorted 1, 2, 3, 4
    expect(badges[0].textContent).toBe('1');
    expect(badges[1].textContent).toBe('2');
    expect(badges[2].textContent).toBe('3');
    expect(badges[3].textContent).toBe('4');
  });
});

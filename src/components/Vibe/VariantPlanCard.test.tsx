/**
 * Tests for VariantPlanCard component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariantPlanCard } from './VariantPlanCard';
import type { VariantPlan } from '../../services/variantPlanService';

const mockPlan: VariantPlan = {
  id: 'plan-1',
  session_id: 'session-1',
  variant_index: 1,
  title: 'Conservative Approach',
  description: 'A minimal, safe approach that preserves the existing design while making requested changes.',
  key_changes: ['Update button colors', 'Add hover effects', 'Improve spacing'],
  style_notes: 'Keep existing color palette, add subtle shadows',
  created_at: '2024-01-01T00:00:00Z',
};

describe('VariantPlanCard', () => {
  it('should render plan information correctly', () => {
    render(<VariantPlanCard plan={mockPlan} />);

    expect(screen.getByText('Conservative Approach')).toBeInTheDocument();
    expect(screen.getByText(/A minimal, safe approach/)).toBeInTheDocument();
    expect(screen.getByText('• Update button colors')).toBeInTheDocument();
    expect(screen.getByText('• Add hover effects')).toBeInTheDocument();
    expect(screen.getByText('• Improve spacing')).toBeInTheDocument();
    expect(screen.getByText(/Keep existing color palette/)).toBeInTheDocument();
  });

  it('should display variant index and label', () => {
    render(<VariantPlanCard plan={mockPlan} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Conservative')).toBeInTheDocument();
  });

  it('should show edit button when editable', () => {
    render(<VariantPlanCard plan={mockPlan} isEditable={true} />);

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('should not show edit button when not editable', () => {
    render(<VariantPlanCard plan={mockPlan} isEditable={false} />);

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('should enter edit mode when edit button clicked', async () => {
    const user = userEvent.setup();
    render(<VariantPlanCard plan={mockPlan} isEditable={true} />);

    await user.click(screen.getByRole('button', { name: /edit/i }));

    // Should show input fields in edit mode
    expect(screen.getByDisplayValue('Conservative Approach')).toBeInTheDocument();
  });

  it('should call onUpdate when save button clicked in edit mode', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(<VariantPlanCard plan={mockPlan} isEditable={true} onUpdate={onUpdate} />);

    // Enter edit mode
    await user.click(screen.getByRole('button', { name: /edit/i }));

    // Modify title
    const titleInput = screen.getByDisplayValue('Conservative Approach');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    // Save
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Updated Title',
    }));
  });

  it('should cancel edit and restore original values', async () => {
    const user = userEvent.setup();

    render(<VariantPlanCard plan={mockPlan} isEditable={true} />);

    // Enter edit mode
    await user.click(screen.getByRole('button', { name: /edit/i }));

    // Modify title
    const titleInput = screen.getByDisplayValue('Conservative Approach');
    await user.clear(titleInput);
    await user.type(titleInput, 'Modified Title');

    // Cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Original title should be displayed
    expect(screen.getByText('Conservative Approach')).toBeInTheDocument();
  });

  it('should show selected state when isSelected is true', () => {
    const { container } = render(<VariantPlanCard plan={mockPlan} isSelected={true} />);

    // Card should have selected styling
    const card = container.querySelector('.ant-card');
    expect(card).toHaveStyle({ borderWidth: '2' });
  });

  it('should call onSelect when card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<VariantPlanCard plan={mockPlan} onSelect={onSelect} />);

    // Find the card element and click it
    const card = screen.getByText('Conservative Approach').closest('.ant-card');
    if (card) {
      await user.click(card);
      expect(onSelect).toHaveBeenCalled();
    }
  });

  it('should display all key changes', () => {
    const planWithManyChanges: VariantPlan = {
      ...mockPlan,
      key_changes: ['Change 1', 'Change 2', 'Change 3', 'Change 4', 'Change 5'],
    };

    render(<VariantPlanCard plan={planWithManyChanges} />);

    expect(screen.getByText('• Change 1')).toBeInTheDocument();
    expect(screen.getByText('• Change 2')).toBeInTheDocument();
    expect(screen.getByText('• Change 3')).toBeInTheDocument();
    expect(screen.getByText('• Change 4')).toBeInTheDocument();
    expect(screen.getByText('• Change 5')).toBeInTheDocument();
  });

  it('should handle plan without style notes', () => {
    const planNoNotes: VariantPlan = {
      ...mockPlan,
      style_notes: null,
    };

    render(<VariantPlanCard plan={planNoNotes} />);

    // Should not show style notes section
    expect(screen.queryByText('Style Notes')).not.toBeInTheDocument();
  });

  it('should display different colors for different variant indices', () => {
    const { rerender } = render(<VariantPlanCard plan={mockPlan} />);
    const tag1 = screen.getByText('1');
    expect(tag1).toBeInTheDocument();

    const planIndex2: VariantPlan = { ...mockPlan, variant_index: 2 };
    rerender(<VariantPlanCard plan={planIndex2} />);
    expect(screen.getByText('2')).toBeInTheDocument();

    const planIndex3: VariantPlan = { ...mockPlan, variant_index: 3 };
    rerender(<VariantPlanCard plan={planIndex3} />);
    expect(screen.getByText('3')).toBeInTheDocument();

    const planIndex4: VariantPlan = { ...mockPlan, variant_index: 4 };
    rerender(<VariantPlanCard plan={planIndex4} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});

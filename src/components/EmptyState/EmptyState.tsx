import { Empty, Button } from 'antd';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  image?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title = 'No data',
  description = 'There is no data to display.',
  image,
  action,
}: EmptyStateProps) {
  return (
    <Empty
      image={image || Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{title}</p>
          <p style={{ margin: '4px 0 0', color: '#666' }}>{description}</p>
        </div>
      }
    >
      {action && (
        <Button type="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Empty>
  );
}

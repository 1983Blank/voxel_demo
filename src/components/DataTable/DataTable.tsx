import { Table, Input, Space, Button } from 'antd';
import type { TableProps, TablePaginationConfig } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useState } from 'react';

export interface DataTableProps<T> extends Omit<TableProps<T>, 'title'> {
  title?: string;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  onRefresh?: () => void;
  showSearch?: boolean;
  showRefresh?: boolean;
}

export function DataTable<T extends object>({
  title,
  searchPlaceholder = 'Search...',
  onSearch,
  onRefresh,
  showSearch = true,
  showRefresh = true,
  pagination,
  ...tableProps
}: DataTableProps<T>) {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  const defaultPagination: TablePaginationConfig = {
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
    pageSizeOptions: ['10', '20', '50', '100'],
    ...pagination,
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        {title && (
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
        )}
        <Space>
          {showSearch && (
            <Input
              placeholder={searchPlaceholder}
              prefix={<SearchOutlined />}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
          )}
          {showRefresh && (
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </Space>
      </div>
      <Table<T>
        pagination={pagination === false ? false : defaultPagination}
        {...tableProps}
      />
    </div>
  );
}

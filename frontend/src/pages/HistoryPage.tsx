import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Drawer, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { loadHistory, loadHistoryDetails } from '../api/history-api';

const attemptOrdinalLabel = (n: number): string => {
  const labels: Record<number, string> = {
    1: 'Первая попытка',
    2: 'Вторая попытка',
    3: 'Третья попытка',
    4: 'Четвёртая попытка',
    5: 'Пятая попытка'
  };
  if (labels[n]) {
    return labels[n];
  }
  return `${n}-я попытка`;
};

type HistoryRow = {
  attemptId: string;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
  attemptOrder: number;
};

const HistoryPage = () => {
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['history'],
    queryFn: () => loadHistory({ page: 1, pageSize: 50 })
  });

  const detailsQuery = useQuery({
    queryKey: ['history-details', selectedAttemptId],
    queryFn: () => loadHistoryDetails(selectedAttemptId as string),
    enabled: Boolean(selectedAttemptId)
  });

  const rows = useMemo(() => {
    const items = (historyQuery.data?.items ?? []) as Array<{
      attemptId: string;
      scorePercent: number;
      passed: boolean;
      submittedAt: string;
    }>;
    const map = new Map<string, number>();
    [...items]
      .sort((a, b) => {
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return aTime - bTime;
      })
      .forEach((item: { attemptId: string }, idx) => {
        map.set(item.attemptId, idx + 1);
      });

    return items.map((item) => ({
      ...item,
      attemptOrder: map.get(item.attemptId) ?? 1
    }));
  }, [historyQuery.data?.items]);

  const selectedAttemptOrder = useMemo(
    () => rows.find((row) => row.attemptId === selectedAttemptId)?.attemptOrder ?? null,
    [rows, selectedAttemptId]
  );

  const columns: ColumnsType<HistoryRow> = [
    {
      title: 'Попытка',
      dataIndex: 'attemptOrder',
      render: (value) => attemptOrdinalLabel(value)
    },
    {
      title: 'Процент',
      dataIndex: 'scorePercent',
      render: (value) => `${value ?? 0}%`
    },
    {
      title: 'Статус',
      dataIndex: 'passed',
      render: (passed) => <Tag color={passed ? 'green' : 'red'}>{passed ? 'Зачёт' : 'Незачёт'}</Tag>
    },
    {
      title: 'Дата',
      dataIndex: 'submittedAt',
      render: (value) => (value ? new Date(value).toLocaleString() : '-')
    },
    {
      title: 'Действие',
      dataIndex: 'attemptId',
      render: (value) => <Button onClick={() => setSelectedAttemptId(value)}>Открыть</Button>
    }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={3}>История попыток</Typography.Title>
      </Card>

      {historyQuery.error ? <Alert type="error" showIcon message="Не удалось загрузить историю." /> : null}

      <Card>
        <Table
          rowKey="attemptId"
          loading={historyQuery.isLoading}
          dataSource={rows}
          columns={columns}
          pagination={false}
        />
      </Card>

      <Drawer
        title="Детали попытки"
        open={Boolean(selectedAttemptId)}
        onClose={() => setSelectedAttemptId(null)}
        width={640}
      >
        {detailsQuery.isLoading ? <Typography.Text>Загрузка...</Typography.Text> : null}
        {detailsQuery.data ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text strong>
              Попытка: {attemptOrdinalLabel(selectedAttemptOrder ?? 1)}
            </Typography.Text>
            <Typography.Paragraph>{detailsQuery.data.feedback?.summary}</Typography.Paragraph>
            {(detailsQuery.data.answers ?? []).map((answer: { questionId: string; score: number; rationale: string }) => (
              <Card size="small" key={answer.questionId}>
                <Typography.Text>{answer.questionId}</Typography.Text>
                <br />
                <Typography.Text type="secondary">Баллы: {answer.score ?? 0}</Typography.Text>
                <br />
                <Typography.Text>{answer.rationale}</Typography.Text>
              </Card>
            ))}
          </Space>
        ) : null}
      </Drawer>
    </Space>
  );
};

export default HistoryPage;

import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, List, Progress, Row, Space, Spin, Statistic, Tag, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { getAttemptResult, getAttemptReview } from '../api/tests-api';

type MaterialLink = {
  title?: string;
  url?: string;
  source?: string;
};

type MistakeItem = {
  topicCode?: string;
  why?: string;
  fix?: string;
  materials?: MaterialLink[];
};

type RecommendationItem = {
  topicCode?: string;
  text?: string;
  materials?: MaterialLink[];
};

const ResultPage = () => {
  const { attemptId = '' } = useParams();

  const resultQuery = useQuery({
    queryKey: ['attempt-result', attemptId],
    queryFn: () => getAttemptResult(attemptId),
    enabled: Boolean(attemptId)
  });

  const reviewQuery = useQuery({
    queryKey: ['attempt-review', attemptId],
    queryFn: () => getAttemptReview(attemptId),
    enabled: Boolean(attemptId)
  });

  if (resultQuery.isLoading || reviewQuery.isLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (resultQuery.error || !resultQuery.data) {
    return <Alert type="error" showIcon message="Не удалось загрузить результат." />;
  }

  const result = resultQuery.data;
  const review = reviewQuery.data;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={3}>Результат теста</Typography.Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}><Statistic title="Баллы" value={result.scorePoints} /></Col>
          <Col xs={24} md={8}><Statistic title="Процент" value={result.scorePercent} suffix="%" /></Col>
          <Col xs={24} md={8}><Statistic title="Статус" value={result.passed ? 'Зачёт' : 'Незачёт'} /></Col>
        </Row>
        <Progress percent={result.scorePercent} status={result.passed ? 'success' : 'exception'} />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Разбор ошибок">
            <List
              dataSource={review?.mistakes ?? []}
              locale={{ emptyText: 'Ошибок не обнаружено' }}
              renderItem={(item: MistakeItem) => (
                <List.Item>
                  <Space direction="vertical">
                    <Tag color="orange">{item.topicCode ?? 'topic'}</Tag>
                    <Typography.Text>{item.why}</Typography.Text>
                    <Typography.Text type="secondary">{item.fix}</Typography.Text>
                    {(item.materials ?? []).length > 0 ? (
                      <Space direction="vertical" size={2}>
                        <Typography.Text type="secondary">Материалы:</Typography.Text>
                        {(item.materials ?? []).map((link, idx) =>
                          link.url ? (
                            <Typography.Link key={`${link.url}_${idx}`} href={link.url} target="_blank" rel="noreferrer">
                              {link.title ?? link.url}
                            </Typography.Link>
                          ) : null
                        )}
                      </Space>
                    ) : null}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Рекомендации">
            <List
              dataSource={review?.recommendations ?? []}
              locale={{ emptyText: 'Рекомендаций пока нет' }}
              renderItem={(item: RecommendationItem) => (
                <List.Item>
                  <Space direction="vertical">
                    {item.topicCode ? <Tag>{item.topicCode}</Tag> : null}
                    <Typography.Text>{item.text ?? JSON.stringify(item)}</Typography.Text>
                    {(item.materials ?? []).length > 0 ? (
                      <Space direction="vertical" size={2}>
                        <Typography.Text type="secondary">Полезные ссылки:</Typography.Text>
                        {(item.materials ?? []).map((link, idx) =>
                          link.url ? (
                            <Typography.Link key={`${link.url}_${idx}`} href={link.url} target="_blank" rel="noreferrer">
                              {link.title ?? link.url}
                            </Typography.Link>
                          ) : null
                        )}
                      </Space>
                    ) : null}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default ResultPage;

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Form, Input, Row, Space, Statistic, Table, Typography } from 'antd';
import { loadTeacherSummary, loadWeakTopics } from '../api/teacher-api';

const TeacherDashboardPage = () => {
  const [groupCode, setGroupCode] = useState('CS-101');

  const summaryQuery = useQuery({
    queryKey: ['teacher-summary', groupCode],
    queryFn: () => loadTeacherSummary({ groupCode }),
    enabled: Boolean(groupCode)
  });

  const weakTopicsQuery = useQuery({
    queryKey: ['teacher-weak-topics', groupCode],
    queryFn: () => loadWeakTopics({ groupCode }),
    enabled: Boolean(groupCode)
  });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={3}>Дашборд преподавателя</Typography.Title>
        <Form layout="inline" onFinish={(values) => setGroupCode(values.groupCode)} initialValues={{ groupCode }}>
          <Form.Item label="Группа" name="groupCode" rules={[{ required: true }]}>
            <Input placeholder="CS-101" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item>
            <button type="submit" className="inline-button">Применить</button>
          </Form.Item>
        </Form>
      </Card>

      {summaryQuery.error ? <Alert type="error" showIcon message="Не удалось загрузить summary." /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><Card><Statistic title="Попыток" value={summaryQuery.data?.attempts ?? 0} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Средний балл" value={summaryQuery.data?.avgScore ?? 0} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Pass rate" value={(summaryQuery.data?.passRate ?? 0) * 100} suffix="%" /></Card></Col>
      </Row>

      <Card title="Слабые темы группы">
        <Table
          rowKey="topicCode"
          loading={weakTopicsQuery.isLoading}
          dataSource={weakTopicsQuery.data?.items ?? []}
          columns={[
            { title: 'Тема', dataIndex: 'topicCode' },
            { title: 'Error rate', dataIndex: 'errorRate' }
          ]}
          pagination={false}
        />
      </Card>

      <Card title="Динамика по неделям">
        <Table
          rowKey="week"
          loading={summaryQuery.isLoading}
          dataSource={summaryQuery.data?.weeklyTrend ?? []}
          columns={[
            { title: 'Неделя', dataIndex: 'week' },
            { title: 'Средний балл', dataIndex: 'avgScore' }
          ]}
          pagination={false}
        />
      </Card>
    </Space>
  );
};

export default TeacherDashboardPage;

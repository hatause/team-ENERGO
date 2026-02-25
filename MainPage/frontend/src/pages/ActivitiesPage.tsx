import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Input, List, Select, Space, Tag, Typography } from 'antd';
import { createActivity, loadActivityHistory, nextActivityTurn, type ActivityMessage } from '../api/activities-api';
import { loadSubjects } from '../api/subjects-api';

const ActivitiesPage = () => {
  const [activityType, setActivityType] = useState<'FEYNMAN' | 'DEBATE'>('FEYNMAN');
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [draft, setDraft] = useState('');
  const [transcript, setTranscript] = useState<ActivityMessage[]>([]);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);

  const subjectsQuery = useQuery({
    queryKey: ['subjects-for-activities'],
    queryFn: () => loadSubjects({})
  });

  const historyQuery = useQuery({
    queryKey: ['activity-history'],
    queryFn: loadActivityHistory
  });

  const subjects = useMemo(() => subjectsQuery.data?.items ?? [], [subjectsQuery.data]);

  useEffect(() => {
    if (!subjectId && subjects.length > 0) {
      setSubjectId(subjects[0].subjectId);
    }
  }, [subjects, subjectId]);

  const startTurnMutation = useMutation({
    mutationFn: nextActivityTurn,
    onSuccess: (result) => {
      setTranscript(result.transcript);
      setSaveInfo(null);
    }
  });

  const createMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: (result) => {
      setSaveInfo(`Сессия сохранена: ${result.sessionId}`);
      historyQuery.refetch();
    }
  });

  const startSession = () => {
    if (!subjectId) {
      return;
    }
    startTurnMutation.mutate({
      type: activityType,
      subjectId,
      transcript: []
    });
  };

  const sendStudentMessage = () => {
    const message = draft.trim();
    if (!subjectId || message.length < 3) {
      return;
    }
    startTurnMutation.mutate({
      type: activityType,
      subjectId,
      transcript,
      studentMessage: message
    });
    setDraft('');
  };

  const saveSession = () => {
    if (!subjectId || transcript.length < 2) {
      return;
    }
    const hasStudentMessage = transcript.some((item) => item.role === 'student');
    if (!hasStudentMessage) {
      return;
    }
    createMutation.mutate({
      type: activityType,
      subjectId,
      transcript
    });
  };

  const busy = startTurnMutation.isPending || createMutation.isPending;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={3}>AI-активности</Typography.Title>
        <Typography.Text type="secondary">
          Режим Фейнмана: объясняете простыми словами. Режим Дебатов: защищаете позицию против возражений.
        </Typography.Text>
      </Card>

      {subjectsQuery.error ? <Alert type="error" showIcon message="Не удалось загрузить предметы." /> : null}
      {historyQuery.error ? <Alert type="error" showIcon message="Не удалось загрузить историю активностей." /> : null}
      {startTurnMutation.error ? <Alert type="error" showIcon message="Не удалось получить ответ ИИ." /> : null}
      {createMutation.error ? <Alert type="error" showIcon message="Не удалось сохранить сессию." /> : null}
      {saveInfo ? <Alert type="success" showIcon message={saveInfo} /> : null}

      <Card title="Новая активность">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap>
            <Select
              style={{ minWidth: 220 }}
              value={activityType}
              onChange={(value: 'FEYNMAN' | 'DEBATE') => {
                setActivityType(value);
                setTranscript([]);
                setSaveInfo(null);
              }}
              options={[
                { label: 'Фейнман', value: 'FEYNMAN' },
                { label: 'Дебаты', value: 'DEBATE' }
              ]}
            />

            <Select
              style={{ minWidth: 360 }}
              value={subjectId}
              onChange={(value: string) => {
                setSubjectId(value);
                setTranscript([]);
                setSaveInfo(null);
              }}
              placeholder="Выберите предмет"
              options={subjects.map((subject) => ({
                label: subject.subjectName,
                value: subject.subjectId
              }))}
            />

            <Button onClick={startSession} loading={startTurnMutation.isPending} disabled={!subjectId}>
              Начать
            </Button>
          </Space>

          <Card size="small" title="Диалог">
            <List
              locale={{ emptyText: 'Нажмите "Начать", чтобы ИИ задал первый вопрос.' }}
              dataSource={transcript}
              renderItem={(item, idx) => (
                <List.Item key={`${item.role}_${idx}`}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Tag color={item.role === 'ai' ? 'geekblue' : 'green'}>
                      {item.role === 'ai' ? 'ИИ' : 'Вы'}
                    </Tag>
                    <Typography.Text>{item.text}</Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>

          <Input.TextArea
            rows={5}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              activityType === 'FEYNMAN'
                ? 'Объясните тему простыми словами и исправляйте ошибки ИИ.'
                : 'Сформулируйте тезис, аргументы и ответ на контраргументы.'
            }
          />

          <Space>
            <Button type="primary" onClick={sendStudentMessage} loading={startTurnMutation.isPending} disabled={!subjectId || busy}>
              Отправить сообщение
            </Button>
            <Button onClick={saveSession} loading={createMutation.isPending} disabled={!subjectId || busy || transcript.length < 2}>
              Завершить и сохранить
            </Button>
            <Button
              onClick={() => {
                setTranscript([]);
                setDraft('');
                setSaveInfo(null);
              }}
              disabled={busy}
            >
              Очистить
            </Button>
          </Space>
        </Space>
      </Card>

      <Card title="Мои активности">
        <List
          loading={historyQuery.isLoading}
          dataSource={historyQuery.data?.items ?? []}
          locale={{ emptyText: 'Активностей пока нет' }}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical">
                <Space wrap>
                  <Tag color={item.type === 'FEYNMAN' ? 'geekblue' : 'magenta'}>{item.type}</Tag>
                  <Tag>{item.reviewStatus}</Tag>
                  <Tag>{item.subjectName}</Tag>
                </Space>
                <Typography.Text>
                  Score: {Number(item.score?.total ?? 0)}
                </Typography.Text>
                <Typography.Text type="secondary">{new Date(item.createdAt).toLocaleString()}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
};

export default ActivitiesPage;

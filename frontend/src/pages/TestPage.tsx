import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Input,
  Progress,
  Radio,
  Space,
  Spin,
  Typography
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getTest, submitTest } from '../api/tests-api';

type StudentAnswerDraft = {
  selectedOptionIds?: string[];
  answerText?: string;
};

const isQuestionAnswered = (
  question: { type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'OPEN_SHORT'; id: string },
  answer: StudentAnswerDraft | undefined
) => {
  if (!answer) {
    return false;
  }

  if (question.type === 'OPEN_SHORT') {
    return Boolean(answer.answerText?.trim());
  }

  return Array.isArray(answer.selectedOptionIds) && answer.selectedOptionIds.length > 0;
};

const TestPage = () => {
  const { testId = '' } = useParams();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswerDraft>>({});

  const testQuery = useQuery({
    queryKey: ['test', testId],
    queryFn: () => getTest(testId),
    enabled: Boolean(testId)
  });

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const submitMutation = useMutation({
    mutationFn: (payload: {
      answers: { questionId: string; selectedOptionIds?: string[]; answerText?: string }[];
      clientDurationSec: number;
    }) => submitTest(testId, payload),
    onSuccess: (result) => {
      navigate(`/results/${result.attemptId}`);
    }
  });

  const questions = testQuery.data?.questions ?? [];
  const question = questions[current];
  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;

  const unansweredIndexes = useMemo(
    () =>
      questions
        .map((q, idx) => (isQuestionAnswered(q, answers[q.id]) ? -1 : idx))
        .filter((idx) => idx >= 0),
    [questions, answers]
  );
  const canSubmit = questions.length > 0 && unansweredIndexes.length === 0;
  const firstUnansweredIndex = unansweredIndexes[0];

  if (testQuery.isLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (testQuery.error || !testQuery.data) {
    return <Alert type="error" showIcon message="Не удалось загрузить тест." />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Title level={3}>Прохождение теста</Typography.Title>
          <Typography.Text>Тест: {testQuery.data.subjectName}</Typography.Text>
          <Typography.Text type="secondary">Время: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</Typography.Text>
          <Progress percent={Number(progress.toFixed(0))} />
        </Space>
      </Card>

      <Card>
        <Typography.Title level={4}>Вопрос {current + 1} из {questions.length}</Typography.Title>
        <Typography.Paragraph>{question.stem}</Typography.Paragraph>

        {question.type === 'SINGLE_CHOICE' ? (
          <Radio.Group
            value={answers[question.id]?.selectedOptionIds?.[0]}
            onChange={(event) => {
              setAnswers((prev) => ({
                ...prev,
                [question.id]: { selectedOptionIds: [event.target.value] }
              }));
            }}
          >
            <Space direction="vertical">
              {question.options.map((option) => (
                <Radio key={option.id} value={option.id}>
                  {option.text}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        ) : null}

        {question.type === 'MULTI_CHOICE' ? (
          <Checkbox.Group
            value={answers[question.id]?.selectedOptionIds}
            onChange={(values) => {
              setAnswers((prev) => ({
                ...prev,
                [question.id]: { selectedOptionIds: values as string[] }
              }));
            }}
          >
            <Space direction="vertical">
              {question.options.map((option) => (
                <Checkbox key={option.id} value={option.id}>
                  {option.text}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        ) : null}

        {question.type === 'OPEN_SHORT' ? (
          <Input.TextArea
            rows={6}
            value={answers[question.id]?.answerText}
            onChange={(event) => {
              const value = event.target.value;
              setAnswers((prev) => ({
                ...prev,
                [question.id]: { answerText: value }
              }));
            }}
          />
        ) : null}
      </Card>

      <Card>
        {!canSubmit ? (
          <Alert
            type="warning"
            showIcon
            message={`Не отвечено вопросов: ${unansweredIndexes.length}`}
            action={
              firstUnansweredIndex !== undefined ? (
                <Button size="small" onClick={() => setCurrent(firstUnansweredIndex)}>
                  Перейти к первому пропущенному
                </Button>
              ) : undefined
            }
          />
        ) : null}
        <Space>
          <Button onClick={() => setCurrent((s) => Math.max(0, s - 1))} disabled={current === 0}>
            Назад
          </Button>
          <Button onClick={() => setCurrent((s) => Math.min(questions.length - 1, s + 1))} disabled={current >= questions.length - 1}>
            Далее
          </Button>
          <Button
            type="primary"
            loading={submitMutation.isPending}
            disabled={!canSubmit}
            onClick={() => {
              const payload = {
                answers: questions.map((q) => ({
                  questionId: q.id,
                  selectedOptionIds: answers[q.id]?.selectedOptionIds,
                  answerText: answers[q.id]?.answerText
                })),
                clientDurationSec: elapsed
              };
              submitMutation.mutate(payload);
            }}
          >
            Отправить тест
          </Button>
        </Space>
      </Card>
    </Space>
  );
};

export default TestPage;

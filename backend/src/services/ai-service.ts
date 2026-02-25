import { Difficulty, QuestionType } from '@prisma/client';
import { env } from '../config/env.js';
import { sha256 } from '../utils/hash.js';

export type GeneratorInput = {
  subjectName: string;
  subjectDescription?: string | null;
  syllabus?: unknown;
  difficulty: Difficulty;
  topicCodes: string[];
  questionTypes: QuestionType[];
  questionCount: number;
  language: string;
};

export type GeneratedQuestion = {
  type: QuestionType;
  stem: string;
  topicCode: string;
  difficulty: Difficulty;
  options?: { code: string; text: string; isCorrect?: boolean }[];
  correctOptionCodes?: string[];
  expectedAnswer?: string;
  keywords?: string[];
  rubric?: {
    criterion: string;
    maxPoints: number;
  }[];
  fingerprint: string;
};

type GeminiQuestionRaw = {
  type: unknown;
  stem: unknown;
  topicCode: unknown;
  options?: { code: string; text: string; isCorrect?: boolean }[];
  correctOptionCodes?: string[];
  expectedAnswer?: unknown;
  keywords?: unknown;
  rubric?: { criterion: string; maxPoints: number }[];
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
};

const TOPIC_PLACEHOLDERS = new Set(['core', 'general', 'topic', 'default', 'main']);

const normalizeTopic = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80);

const toTopicLabel = (value: string): string =>
  normalizeTopic(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isPlaceholderTopic = (value: string): boolean => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
  return TOPIC_PLACEHOLDERS.has(normalized);
};

const uniqueTopics = (topics: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const topic of topics) {
    const normalized = normalizeTopic(topic);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }
  return result;
};

const extractTopicsFromSyllabus = (syllabus: unknown): string[] => {
  if (!Array.isArray(syllabus)) {
    return [];
  }

  const extracted: string[] = [];
  for (const row of syllabus) {
    if (typeof row === 'string') {
      extracted.push(row);
      continue;
    }
    if (!row || typeof row !== 'object') {
      continue;
    }
    const obj = row as Record<string, unknown>;
    const label =
      (typeof obj.topicCode === 'string' && obj.topicCode) ||
      (typeof obj.topic === 'string' && obj.topic) ||
      (typeof obj.name === 'string' && obj.name) ||
      (typeof obj.title === 'string' && obj.title) ||
      null;
    if (label) {
      extracted.push(label);
    }
  }

  return extracted;
};

const extractTopicsFromSubjectName = (subjectName: string): string[] => {
  const words = subjectName
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3);

  if (words.length === 0) {
    return [];
  }

  const base = words.slice(0, 2).join(' ');
  const primary = base || words[0];
  return [primary, `${primary} практика`, `${primary} типичные ошибки`];
};

const resolveTopicCodes = (input: GeneratorInput): string[] => {
  const explicit = uniqueTopics(input.topicCodes).filter((topic) => !isPlaceholderTopic(topic));
  if (explicit.length > 0) {
    return explicit.slice(0, 8);
  }

  const inferred = uniqueTopics([
    ...extractTopicsFromSyllabus(input.syllabus),
    ...extractTopicsFromSubjectName(input.subjectName)
  ]).filter((topic) => !isPlaceholderTopic(topic));

  if (inferred.length >= 2) {
    return inferred.slice(0, 8);
  }

  if (inferred.length === 1) {
    return [inferred[0], `${inferred[0]} практика`, `${inferred[0]} кейсы`];
  }

  return input.language.toLowerCase().startsWith('en')
    ? ['basics', 'practice', 'pitfalls']
    : ['основы', 'практика', 'типичные ошибки'];
};

const normalizeQuestionType = (value: unknown): QuestionType | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  switch (normalized) {
    case 'SINGLE':
    case 'SINGLE_CHOICE':
    case 'SINGLE_SELECT':
      return QuestionType.SINGLE_CHOICE;
    case 'MULTI':
    case 'MULTI_CHOICE':
    case 'MULTIPLE_CHOICE':
      return QuestionType.MULTI_CHOICE;
    case 'OPEN':
    case 'OPEN_SHORT':
    case 'SHORT_ANSWER':
      return QuestionType.OPEN_SHORT;
    default:
      return null;
  }
};

const parseQuestionsPayload = (payload: unknown): GeminiQuestionRaw[] => {
  if (Array.isArray(payload)) {
    return payload as GeminiQuestionRaw[];
  }
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const obj = payload as Record<string, unknown>;

  if (Array.isArray(obj.questions)) {
    return obj.questions as GeminiQuestionRaw[];
  }
  if (Array.isArray(obj.items)) {
    return obj.items as GeminiQuestionRaw[];
  }

  const data = obj.data;
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>;
    if (Array.isArray(nested.questions)) {
      return nested.questions as GeminiQuestionRaw[];
    }
    if (Array.isArray(nested.items)) {
      return nested.items as GeminiQuestionRaw[];
    }
  }

  return [];
};

const parseQuestionsText = (text: string): GeminiQuestionRaw[] => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const plain = fenced ? fenced[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(plain) as unknown;
    return parseQuestionsPayload(parsed);
  } catch {
    const objectStart = plain.indexOf('{');
    const objectEnd = plain.lastIndexOf('}');
    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        const parsed = JSON.parse(plain.slice(objectStart, objectEnd + 1)) as unknown;
        return parseQuestionsPayload(parsed);
      } catch {
        // ignore
      }
    }

    const arrayStart = plain.indexOf('[');
    const arrayEnd = plain.lastIndexOf(']');
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        const parsed = JSON.parse(plain.slice(arrayStart, arrayEnd + 1)) as unknown;
        return parseQuestionsPayload(parsed);
      } catch {
        // ignore
      }
    }

    return [];
  }
};

const buildFallbackOptions = (
  topic: string,
  type: QuestionType,
  subjectName: string,
  idx: number
): { code: string; text: string; isCorrect?: boolean }[] => {
  const topicLabel = toTopicLabel(topic);
  const subjectLabel = subjectName.trim();

  const correctPool = [
    `Для темы "${topicLabel}" в "${subjectLabel}" важны системность, проверка гипотез и контроль результата.`,
    `Корректный подход к "${topicLabel}" включает анализ рисков и выбор адекватных мер защиты.`,
    `Эффективность "${topicLabel}" повышается при регулярной проверке конфигураций и журналировании.`,
    `Практика по "${topicLabel}" должна опираться на принципы минимизации ошибок и воспроизводимости решений.`
  ];

  const wrongPool = [
    `Достаточно один раз настроить "${topicLabel}" и больше никогда не проверять изменения.`,
    `В "${topicLabel}" можно полностью игнорировать мониторинг, если система уже запущена.`,
    `Любые меры по "${topicLabel}" одинаково эффективны, контекст задачи не важен.`,
    `Для "${topicLabel}" лучше отключить валидацию, чтобы ускорить работу системы.`
  ];

  const pick = (arr: string[], shift: number) => arr[(idx + shift) % arr.length];

  if (type === QuestionType.MULTI_CHOICE) {
    return [
      { code: 'A', text: pick(correctPool, 0), isCorrect: true },
      { code: 'B', text: pick(correctPool, 1), isCorrect: true },
      { code: 'C', text: pick(wrongPool, 0), isCorrect: false },
      { code: 'D', text: pick(wrongPool, 1), isCorrect: false }
    ];
  }

  return [
    { code: 'A', text: pick(correctPool, 0), isCorrect: true },
    { code: 'B', text: pick(wrongPool, 0), isCorrect: false },
    { code: 'C', text: pick(wrongPool, 1), isCorrect: false },
    { code: 'D', text: pick(wrongPool, 2), isCorrect: false }
  ];
};

const normalizeGeneratedQuestions = (
  questions: GeminiQuestionRaw[],
  difficulty: Difficulty,
  topicCodes: string[],
  subjectName: string
): GeneratedQuestion[] => {
  return questions
    .map((q, index) => {
      const type = normalizeQuestionType(q.type);
      const stem = typeof q.stem === 'string' ? q.stem.trim() : '';
      const rawTopic = typeof q.topicCode === 'string' ? q.topicCode.trim() : '';
      const fallbackTopic = topicCodes[index % topicCodes.length] ?? 'основы';
      const topicCode = !rawTopic || isPlaceholderTopic(rawTopic) ? fallbackTopic : normalizeTopic(rawTopic);

      if (!type || !stem) {
        return null;
      }

      if (type === QuestionType.OPEN_SHORT) {
        const keywordsRaw = Array.isArray(q.keywords) ? q.keywords : [];
        const keywords = keywordsRaw
          .filter((value): value is string => typeof value === 'string')
          .map((value) => normalizeTopic(value))
          .filter(Boolean)
          .slice(0, 8);
        const expectedAnswer =
          typeof q.expectedAnswer === 'string' && q.expectedAnswer.trim()
            ? q.expectedAnswer.trim()
            : `Дать корректное объяснение темы "${topicCode}" и привести 1 практический пример.`;

        return {
          type,
          stem,
          topicCode,
          difficulty,
          expectedAnswer,
          keywords: keywords.length > 0 ? keywords : [topicCode, 'определение', 'пример'],
          rubric: Array.isArray(q.rubric) ? q.rubric : [
            { criterion: 'Корректность', maxPoints: 3 },
            { criterion: 'Полнота', maxPoints: 2 }
          ],
          fingerprint: sha256(`${topicCode}:${stem.toLowerCase()}`)
        } as GeneratedQuestion;
      }

      const normalizedOptions = Array.isArray(q.options)
        ? q.options
            .map((option, optionIndex) => ({
              code:
                typeof option.code === 'string' && option.code.trim()
                  ? option.code.trim().toUpperCase()
                  : String.fromCharCode(65 + optionIndex),
              text: typeof option.text === 'string' ? option.text.trim() : '',
              isCorrect: Boolean(option.isCorrect)
            }))
            .filter((option) => option.text.length > 0)
        : [];

      let correctOptionCodes = Array.isArray(q.correctOptionCodes)
        ? q.correctOptionCodes
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            .map((value) => value.trim().toUpperCase())
        : [];

      if (correctOptionCodes.length === 0 && normalizedOptions.some((option) => option.isCorrect)) {
        correctOptionCodes = normalizedOptions.filter((option) => option.isCorrect).map((option) => option.code);
      }

      const hasValidClosedPayload = normalizedOptions.length >= 2 && correctOptionCodes.length > 0;
      if (!hasValidClosedPayload) {
        const options = buildFallbackOptions(topicCode, type, subjectName, index);
        return {
          type,
          stem,
          topicCode,
          difficulty,
          options,
          correctOptionCodes: options.filter((option) => option.isCorrect).map((option) => option.code),
          fingerprint: sha256(`${topicCode}:${stem.toLowerCase()}`)
        } as GeneratedQuestion;
      }

      return {
        type,
        stem,
        topicCode,
        difficulty,
        options: normalizedOptions.map((option) => ({
          ...option,
          isCorrect: correctOptionCodes.includes(option.code)
        })),
        correctOptionCodes,
        fingerprint: sha256(`${topicCode}:${stem.toLowerCase()}`)
      } as GeneratedQuestion;
    })
    .filter((question): question is GeneratedQuestion => question !== null);
};

const callGemini = async (input: GeneratorInput): Promise<GeneratedQuestion[] | null> => {
  if (!env.GEMINI_API_KEY) {
    return null;
  }

  const endpoints = [
    {
      tag: 'v1',
      url: `https://generativelanguage.googleapis.com/v1/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`
    },
    {
      tag: 'v1beta',
      url: `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`
    }
  ];

  const promptText = [
    `Ты генерируешь учебный тест по предмету "${input.subjectName}".`,
    `Язык: ${input.language}.`,
    `Сложность: ${input.difficulty}.`,
    `Количество вопросов: ${input.questionCount}.`,
    `Типы вопросов: ${input.questionTypes.join(', ')}.`,
    `Темы: ${input.topicCodes.join(', ')}.`,
    `Описание предмета: ${input.subjectDescription ?? 'нет описания'}.`,
    `Правила:`,
    `1) Верни ТОЛЬКО валидный JSON без markdown и без пояснений.`,
    `2) Формат строго: {"questions":[...]}.`,
    `3) Для SINGLE_CHOICE и MULTI_CHOICE обязательно options и correctOptionCodes.`,
    `4) Для OPEN_SHORT обязательно expectedAnswer, keywords, rubric.`,
    `5) Не используй шаблонные фразы вида "корректное утверждение", "вариант A/B".`,
    `6) Тексты вариантов ответа должны быть содержательными и различимыми.`,
    `Пример элемента: {"type":"SINGLE_CHOICE","stem":"...","topicCode":"...","options":[{"code":"A","text":"..."},{"code":"B","text":"..."},{"code":"C","text":"..."},{"code":"D","text":"..."}],"correctOptionCodes":["A"]}`
  ].join('\n');

  const body = {
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.4
    }
  };

  const errors: string[] = [];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const rawText = await res.text();
      if (!res.ok) {
        const compact = rawText.replace(/\s+/g, ' ').slice(0, 220);
        errors.push(`${endpoint.tag} HTTP ${res.status}: ${compact}`);
        continue;
      }

      let raw: GeminiResponse;
      try {
        raw = JSON.parse(rawText) as GeminiResponse;
      } catch {
        errors.push(`${endpoint.tag} invalid JSON response`);
        continue;
      }

      const text = raw.candidates
        ?.flatMap((candidate) => candidate.content?.parts ?? [])
        .map((part) => part.text?.trim())
        .find((value): value is string => Boolean(value && value.length > 0));

      if (!text) {
        errors.push(`${endpoint.tag} empty candidate text`);
        continue;
      }

      const questions = parseQuestionsText(text);
      if (questions.length === 0) {
        errors.push(`${endpoint.tag} no parseable questions`);
        continue;
      }

      const normalized = normalizeGeneratedQuestions(questions, input.difficulty, input.topicCodes, input.subjectName);
      if (normalized.length === 0) {
        errors.push(`${endpoint.tag} questions rejected by validator`);
        continue;
      }

      return normalized;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      errors.push(`${endpoint.tag} ${message}`);
    }
  }

  if (errors.length > 0) {
    console.error(`[ai-service] Gemini request failed: ${errors.join(' | ')}`);
  }

  return null;
};

const buildFallbackQuestion = (
  topic: string,
  type: QuestionType,
  difficulty: Difficulty,
  idx: number,
  subjectName: string
): GeneratedQuestion => {
  const difficultyHint =
    difficulty === Difficulty.HARD ? 'углубленный уровень' : difficulty === Difficulty.MEDIUM ? 'базовый+ уровень' : 'базовый уровень';

  if (type === QuestionType.OPEN_SHORT) {
    const topicLabel = toTopicLabel(topic);
    const stem = `Кратко объясните тему "${topicLabel}" (${difficultyHint}) в контексте "${subjectName}": дайте определение, пример применения и одну типичную ошибку.`;
    return {
      type,
      stem,
      topicCode: topic,
      difficulty,
      expectedAnswer: `Нужно дать определение темы "${topicLabel}", объяснить применение в "${subjectName}" и привести корректный пример.`,
      keywords: [topicLabel, 'определение', 'применение', 'пример'],
      rubric: [
        { criterion: 'Корректность', maxPoints: 3 },
        { criterion: 'Полнота', maxPoints: 2 }
      ],
      fingerprint: sha256(`${topic}:${stem}`)
    };
  }

  const topicLabel = toTopicLabel(topic);
  const stems = [
    `Какое утверждение наиболее точно описывает тему "${topicLabel}" в дисциплине "${subjectName}" (${difficultyHint})?`,
    `Выберите вариант, который корректно отражает практику по теме "${topicLabel}" для предмета "${subjectName}".`,
    `Определите корректный принцип применения темы "${topicLabel}" в учебной задаче.`,
    `Какой вариант является правильным для темы "${topicLabel}" с точки зрения базовой методики предмета "${subjectName}"?`
  ];
  const stem = stems[idx % stems.length];
  const options = buildFallbackOptions(topic, type, subjectName, idx);

  return {
    type,
    stem,
    topicCode: topic,
    difficulty,
    options,
    correctOptionCodes: options.filter((o) => o.isCorrect).map((o) => o.code),
    fingerprint: sha256(`${topic}:${stem}`)
  };
};

const fallbackGenerateQuestions = (input: GeneratorInput): GeneratedQuestion[] => {
  const topics = resolveTopicCodes(input);
  const types = input.questionTypes.length > 0 ? input.questionTypes : [QuestionType.SINGLE_CHOICE];
  const questions: GeneratedQuestion[] = [];

  for (let i = 0; i < input.questionCount; i += 1) {
    const topic = topics[i % topics.length];
    const type = types[i % types.length];
    questions.push(buildFallbackQuestion(topic, type, input.difficulty, i, input.subjectName));
  }

  return questions;
};

export const generateQuestions = async (input: GeneratorInput): Promise<GeneratedQuestion[]> => {
  const topicCodes = resolveTopicCodes(input);
  const preparedInput = {
    ...input,
    topicCodes
  };

  const aiQuestions = await callGemini(preparedInput);
  if (aiQuestions && aiQuestions.length >= 1) {
    return aiQuestions.slice(0, input.questionCount).map((question, index) => {
      const topic = isPlaceholderTopic(question.topicCode)
        ? topicCodes[index % topicCodes.length]
        : normalizeTopic(question.topicCode);
      if (topic === question.topicCode) {
        return question;
      }
      return {
        ...question,
        topicCode: topic,
        fingerprint: sha256(`${topic}:${question.stem.toLowerCase()}`)
      };
    });
  }
  return fallbackGenerateQuestions(preparedInput);
};

type GradeInputItem = {
  questionId: string;
  type: QuestionType;
  topicCode: string;
  maxPoints: number;
  correctOptionCodes: string[];
  keywords: string[];
  selectedOptionIds: string[];
  answerText: string;
};

export type GradeResult = {
  answers: {
    questionId: string;
    isCorrect: boolean;
    scorePoints: number;
    rationale: string;
  }[];
  scorePoints: number;
  scorePercent: number;
  mistakesByTopic: Record<string, number>;
};

const normalizeText = (text: string): string => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

export const gradeAnswers = (items: GradeInputItem[]): GradeResult => {
  let total = 0;
  let scored = 0;
  const mistakesByTopic: Record<string, number> = {};

  const answers = items.map((item) => {
    total += item.maxPoints;

    if (item.type === QuestionType.OPEN_SHORT) {
      const normalized = normalizeText(item.answerText || '');
      const keywordMatches = item.keywords.filter((k) => normalized.includes(normalizeText(k))).length;
      const ratio = item.keywords.length > 0 ? keywordMatches / item.keywords.length : normalized.length > 8 ? 1 : 0;
      const points = Number((item.maxPoints * Math.min(1, ratio)).toFixed(2));
      const isCorrect = points >= item.maxPoints * 0.6;
      scored += points;
      if (!isCorrect) {
        mistakesByTopic[item.topicCode] = (mistakesByTopic[item.topicCode] ?? 0) + 1;
      }
      return {
        questionId: item.questionId,
        isCorrect,
        scorePoints: points,
        rationale: isCorrect
          ? 'Ответ покрывает основные критерии.'
          : 'Ответ неполный: не хватает ключевых терминов по теме.'
      };
    }

    const correct = [...item.correctOptionCodes].sort();
    const selected = [...item.selectedOptionIds].sort();
    const isCorrect = JSON.stringify(correct) === JSON.stringify(selected);
    const points = isCorrect ? item.maxPoints : 0;
    scored += points;

    if (!isCorrect) {
      mistakesByTopic[item.topicCode] = (mistakesByTopic[item.topicCode] ?? 0) + 1;
    }

    return {
      questionId: item.questionId,
      isCorrect,
      scorePoints: points,
      rationale: isCorrect ? 'Верно.' : 'Неверный набор вариантов ответа.'
    };
  });

  const scorePercent = total > 0 ? Number(((scored / total) * 100).toFixed(2)) : 0;

  return {
    answers,
    scorePoints: Number(scored.toFixed(2)),
    scorePercent,
    mistakesByTopic
  };
};

export const buildRecommendations = (mistakesByTopic: Record<string, number>): { topicCode: string; text: string }[] => {
  return Object.entries(mistakesByTopic)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topicCode, count]) => ({
      topicCode,
      text: `Повторить тему ${topicCode} и решить минимум ${Math.max(3, count + 1)} практических задач.`
    }));
};

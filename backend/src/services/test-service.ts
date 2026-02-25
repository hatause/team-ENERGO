import {
  AttemptStatus,
  Difficulty,
  Prisma,
  QuestionType,
  RecommendationType,
  TestStatus
} from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { buildRecommendations, generateQuestions, gradeAnswers } from './ai-service.js';
import { resolveSubjectId } from './subject-service.js';

export type GenerateTestPayload = {
  subjectId: string;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  questionCount: number;
  topicIds: string[];
  language: string;
};

export type SubmitAnswerPayload = {
  questionId: string;
  selectedOptionIds?: string[];
  answerText?: string;
};

type MaterialLink = {
  title: string;
  url: string;
  source: string;
};

const normalizeTopicLabel = (topicCode: string) =>
  topicCode
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildMaterialLinks = (
  topicCode: string,
  subjectName?: string,
  language = 'ru'
): MaterialLink[] => {
  const topicLabel = normalizeTopicLabel(topicCode);
  const query = [subjectName, topicLabel].filter(Boolean).join(' ').trim();
  const searchTerm = query.length > 0 ? query : topicLabel || topicCode;

  const google = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
  const youtube = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`;
  const wikipedia =
    language.toLowerCase().startsWith('ru')
      ? `https://ru.wikipedia.org/w/index.php?search=${encodeURIComponent(searchTerm)}`
      : `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(searchTerm)}`;
  const habr = `https://habr.com/ru/search/?q=${encodeURIComponent(searchTerm)}`;
  const stepik = `https://stepik.org/catalog/search?query=${encodeURIComponent(searchTerm)}`;

  return [
    { title: `Google: ${topicLabel || topicCode}`, url: google, source: 'google' },
    { title: `YouTube: ${topicLabel || topicCode}`, url: youtube, source: 'youtube' },
    { title: `Wikipedia: ${topicLabel || topicCode}`, url: wikipedia, source: 'wikipedia' },
    { title: `Habr: ${topicLabel || topicCode}`, url: habr, source: 'habr' },
    { title: `Stepik: ${topicLabel || topicCode}`, url: stepik, source: 'stepik' }
  ];
};

const ensureSubject = async (subjectIdOrCode: string) => {
  const resolved = await resolveSubjectId(subjectIdOrCode);
  if (resolved) {
    return resolved;
  }

  const created = await prisma.subject.upsert({
    where: { externalSubjectCode: subjectIdOrCode },
    update: {},
    create: {
      externalSubjectCode: subjectIdOrCode,
      name: subjectIdOrCode,
      description: 'Auto-created subject from external schedule code'
    }
  });

  return created.id;
};

const getQuestionMaxPoints = (question: { type: QuestionType; rubricJson: Prisma.JsonValue | null }) => {
  if (question.type !== QuestionType.OPEN_SHORT) {
    return 1;
  }

  const rubric = Array.isArray(question.rubricJson)
    ? (question.rubricJson as { maxPoints?: number }[])
    : [];

  const sum = rubric.reduce((acc, item) => acc + Number(item.maxPoints ?? 0), 0);
  return sum > 0 ? sum : 5;
};

const getWeekStartUtc = (date: Date): Date => {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
};

export const generateTestForStudent = async (studentId: string, payload: GenerateTestPayload) => {
  const subjectId = await ensureSubject(payload.subjectId);

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId }
  });

  if (!subject) {
    throw new Error('Subject not found');
  }

  const test = await prisma.test.create({
    data: {
      studentId,
      subjectId,
      difficulty: payload.difficulty,
      status: TestStatus.GENERATING,
      questionCount: payload.questionCount,
      language: payload.language,
      promptVersion: 'v1'
    }
  });

  const questions = await generateQuestions({
    subjectName: subject.name,
    subjectDescription: subject.description,
    syllabus: subject.syllabusJson,
    difficulty: payload.difficulty,
    topicCodes: payload.topicIds,
    questionTypes: payload.questionTypes,
    questionCount: payload.questionCount,
    language: payload.language
  });

  await prisma.$transaction(async (tx) => {
    for (const generated of questions) {
      const question = await tx.question.create({
        data: {
          testId: test.id,
          type: generated.type,
          stem: generated.stem,
          topicCode: generated.topicCode,
          difficulty: generated.difficulty,
          rubricJson: (generated.rubric ?? null) as Prisma.JsonValue,
          correctAnswerJson: ({
            optionCodes: generated.correctOptionCodes ?? [],
            expectedAnswer: generated.expectedAnswer ?? null,
            keywords: generated.keywords ?? []
          } as Prisma.JsonValue),
          fingerprint: generated.fingerprint
        }
      });

      if (generated.options && generated.options.length > 0) {
        await tx.answerOption.createMany({
          data: generated.options.map((option) => ({
            questionId: question.id,
            code: option.code,
            text: option.text,
            isCorrect: Boolean(option.isCorrect)
          }))
        });
      }
    }

    await tx.test.update({
      where: { id: test.id },
      data: { status: TestStatus.READY }
    });
  });

  return {
    testId: test.id,
    status: 'READY' as const,
    etaSec: 0
  };
};

export const getTestDetailsForStudent = async (testId: string, studentId: string) => {
  const test = await prisma.test.findFirst({
    where: { id: testId, studentId },
    include: {
      subject: {
        select: {
          name: true
        }
      },
      questions: {
        include: {
          options: {
            select: {
              id: true,
              text: true,
              code: true
            }
          }
        }
      }
    }
  });

  if (!test) {
    return null;
  }

  return {
    testId: test.id,
    status: test.status,
    subjectId: test.subjectId,
    subjectName: test.subject.name,
    difficulty: test.difficulty,
    timeLimitSec: Math.max(600, test.questionCount * 120),
    questions: test.questions.map((q) => ({
      id: q.id,
      type: q.type,
      topicCode: q.topicCode,
      stem: q.stem,
      options: q.options.map((o) => ({ id: o.id, text: o.text, code: o.code }))
    }))
  };
};

export const submitTestAttempt = async (
  testId: string,
  studentId: string,
  payload: { answers: SubmitAnswerPayload[]; clientDurationSec?: number }
) => {
  const test = await prisma.test.findFirst({
    where: { id: testId, studentId },
    include: {
      subject: true,
      questions: {
        include: {
          options: true
        }
      }
    }
  });

  if (!test) {
    throw new Error('Test not found');
  }

  let attempt = await prisma.testAttempt.findFirst({
    where: {
      testId,
      studentId,
      status: {
        in: [AttemptStatus.IN_PROGRESS, AttemptStatus.CHECKING]
      }
    },
    orderBy: {
      startedAt: 'desc'
    }
  });

  if (!attempt) {
    attempt = await prisma.testAttempt.create({
      data: {
        testId,
        studentId,
        status: AttemptStatus.IN_PROGRESS
      }
    });
  }

  const questionById = new Map(test.questions.map((q) => [q.id, q]));

  await prisma.$transaction(async (tx) => {
    for (const incoming of payload.answers) {
      if (!questionById.has(incoming.questionId)) {
        continue;
      }
      await tx.studentAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: attempt.id,
            questionId: incoming.questionId
          }
        },
        update: {
          selectedOptionIds: (incoming.selectedOptionIds ?? []) as Prisma.JsonValue,
          answerText: incoming.answerText
        },
        create: {
          attemptId: attempt.id,
          questionId: incoming.questionId,
          selectedOptionIds: (incoming.selectedOptionIds ?? []) as Prisma.JsonValue,
          answerText: incoming.answerText
        }
      });
    }

    await tx.testAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.CHECKING,
        submittedAt: new Date(),
        clientDurationSec: payload.clientDurationSec
      }
    });
  });

  const answers = await prisma.studentAnswer.findMany({
    where: { attemptId: attempt.id },
    include: {
      question: {
        include: {
          options: true
        }
      }
    }
  });

  const graded = gradeAnswers(
    answers.map((row) => {
      const correctObj = (row.question.correctAnswerJson ?? {}) as {
        optionCodes?: string[];
        keywords?: string[];
      };
      const selectedIds = Array.isArray(row.selectedOptionIds) ? (row.selectedOptionIds as string[]) : [];
      const selectedCodes = row.question.options
        .filter((option) => selectedIds.includes(option.id))
        .map((option) => option.code);

      return {
        questionId: row.questionId,
        type: row.question.type,
        topicCode: row.question.topicCode,
        maxPoints: getQuestionMaxPoints(row.question),
        correctOptionCodes: correctObj.optionCodes ?? row.question.options.filter((o) => o.isCorrect).map((o) => o.code),
        keywords: correctObj.keywords ?? [],
        selectedOptionIds: selectedCodes,
        answerText: row.answerText ?? ''
      };
    })
  );

  await prisma.$transaction(async (tx) => {
    for (const item of graded.answers) {
      await tx.studentAnswer.updateMany({
        where: {
          attemptId: attempt.id,
          questionId: item.questionId
        },
        data: {
          isCorrect: item.isCorrect,
          scorePoints: item.scorePoints,
          rationale: item.rationale
        }
      });
    }

    const passed = graded.scorePercent >= 60;

    await tx.testAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.COMPLETED,
        checkedAt: new Date(),
        scorePoints: graded.scorePoints,
        scorePercent: graded.scorePercent,
        passed
      }
    });

    const sortedMistakes = Object.entries(graded.mistakesByTopic)
      .sort((a, b) => b[1] - a[1])
      .map(([topicCode, count]) => ({
        topicCode,
        count,
        why: `Ошибки по теме ${topicCode}: ${count}`,
        fix: `Повторить теорию и выполнить практику по теме ${topicCode}.`,
        materials: buildMaterialLinks(topicCode, test.subject.name, test.language)
      }));

    await tx.feedback.upsert({
      where: { attemptId: attempt.id },
      update: {
        summary: passed
          ? 'Тест успешно пройден. Есть темы для закрепления.'
          : 'Тест не пройден. Требуется повторение ключевых тем.',
        mistakesJson: sortedMistakes as Prisma.JsonValue,
        strengthsJson: ({ passed } as Prisma.JsonValue)
      },
      create: {
        attemptId: attempt.id,
        summary: passed
          ? 'Тест успешно пройден. Есть темы для закрепления.'
          : 'Тест не пройден. Требуется повторение ключевых тем.',
        mistakesJson: sortedMistakes as Prisma.JsonValue,
        strengthsJson: ({ passed } as Prisma.JsonValue)
      }
    });

    const recommendations = buildRecommendations(graded.mistakesByTopic);
    if (recommendations.length > 0) {
      await tx.recommendation.createMany({
        data: recommendations.map((rec, index) => ({
          attemptId: attempt.id,
          studentId,
          type: RecommendationType.PRACTICE,
          priority: index + 1,
          contentJson: ({
            topicCode: rec.topicCode,
            text: rec.text,
            materials: buildMaterialLinks(rec.topicCode, test.subject.name, test.language)
          } as Prisma.JsonValue)
        }))
      });

      for (const rec of recommendations) {
        await tx.weakTopic.upsert({
          where: {
            studentId_subjectId_topicCode: {
              studentId,
              subjectId: test.subjectId,
              topicCode: rec.topicCode
            }
          },
          update: {
            weaknessScore: {
              increment: 0.1
            },
            lastSeenAt: new Date()
          },
          create: {
            studentId,
            subjectId: test.subjectId,
            topicCode: rec.topicCode,
            weaknessScore: 0.6,
            lastSeenAt: new Date()
          }
        });

        await tx.practiceTask.create({
          data: {
            studentId,
            subjectId: test.subjectId,
            topicCode: rec.topicCode,
            prompt: rec.text,
            expectedFormat: 'SHORT_TEXT'
          }
        });
      }
    }
  });

  const now = new Date();
  const weekStart = getWeekStartUtc(now);

  const recentAttempts = await prisma.testAttempt.findMany({
    where: {
      studentId,
      test: {
        subjectId: test.subjectId
      },
      status: AttemptStatus.COMPLETED,
      scorePercent: {
        not: null
      }
    },
    orderBy: {
      checkedAt: 'desc'
    },
    take: 10
  });

  const avgScore =
    recentAttempts.length > 0
      ? Number(
          (
            recentAttempts.reduce((acc, row) => acc + Number(row.scorePercent ?? 0), 0) /
            recentAttempts.length
          ).toFixed(2)
        )
      : graded.scorePercent;

  await prisma.progressSnapshot.upsert({
    where: {
      studentId_subjectId_weekStart: {
        studentId,
        subjectId: test.subjectId,
        weekStart
      }
    },
    update: {
      avgScore,
      masteryJson: ({ mistakesByTopic: graded.mistakesByTopic } as Prisma.JsonValue),
      trend: avgScore >= 60 ? 'UP' : 'DOWN'
    },
    create: {
      studentId,
      subjectId: test.subjectId,
      weekStart,
      avgScore,
      masteryJson: ({ mistakesByTopic: graded.mistakesByTopic } as Prisma.JsonValue),
      trend: avgScore >= 60 ? 'UP' : 'DOWN'
    }
  });

  return {
    attemptId: attempt.id,
    status: AttemptStatus.COMPLETED
  };
};

export const getAttemptResult = async (attemptId: string, studentId: string) => {
  const attempt = await prisma.testAttempt.findFirst({
    where: {
      id: attemptId,
      studentId
    },
    include: {
      answers: true
    }
  });

  if (!attempt || attempt.status !== AttemptStatus.COMPLETED) {
    return null;
  }

  return {
    attemptId: attempt.id,
    scorePoints: attempt.scorePoints,
    scorePercent: attempt.scorePercent,
    passed: attempt.passed,
    checkedAt: attempt.checkedAt?.toISOString(),
    breakdown: attempt.answers.map((row) => ({
      questionId: row.questionId,
      score: row.scorePoints,
      maxScore: row.scorePoints && row.scorePoints > 1 ? row.scorePoints : 1
    }))
  };
};

export const getAttemptReview = async (attemptId: string, studentId: string) => {
  const attempt = await prisma.testAttempt.findFirst({
    where: {
      id: attemptId,
      studentId
    },
    include: {
      feedback: true,
      test: {
        include: {
          subject: true
        }
      },
      recommendations: {
        orderBy: {
          priority: 'asc'
        }
      }
    }
  });

  if (!attempt) {
    return null;
  }

  const mistakesRaw = Array.isArray(attempt.feedback?.mistakesJson)
    ? (attempt.feedback?.mistakesJson as Array<Record<string, unknown>>)
    : [];

  const mistakes = mistakesRaw.map((item) => {
    const topicCode = typeof item.topicCode === 'string' ? item.topicCode : 'topic';
    const existingMaterials = Array.isArray(item.materials) ? item.materials : [];
    const materials =
      existingMaterials.length > 0
        ? existingMaterials
        : buildMaterialLinks(topicCode, attempt.test.subject.name, attempt.test.language);
    return {
      ...item,
      topicCode,
      materials
    };
  });

  const recommendations = attempt.recommendations.map((rec) => {
    const content = (rec.contentJson ?? {}) as Record<string, unknown>;
    const topicCode = typeof content.topicCode === 'string' ? content.topicCode : 'topic';
    const existingMaterials = Array.isArray(content.materials) ? content.materials : [];
    const materials =
      existingMaterials.length > 0
        ? existingMaterials
        : buildMaterialLinks(topicCode, attempt.test.subject.name, attempt.test.language);
    return {
      ...content,
      topicCode,
      materials
    };
  });

  return {
    attemptId: attempt.id,
    mistakes,
    recommendations
  };
};

import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const main = async () => {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const group = await prisma.group.upsert({
    where: { code: 'CS-101' },
    update: {},
    create: {
      code: 'CS-101',
      name: 'CS-101',
      semester: '2026S1',
      externalGroupCode: 'CS-101'
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@visualsite.local' },
    update: {
      passwordHash,
      role: Role.ADMIN
    },
    create: {
      email: 'admin@visualsite.local',
      passwordHash,
      role: Role.ADMIN,
      locale: 'ru'
    }
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@visualsite.local' },
    update: {
      passwordHash,
      role: Role.TEACHER
    },
    create: {
      email: 'teacher@visualsite.local',
      passwordHash,
      role: Role.TEACHER,
      locale: 'ru'
    }
  });

  await prisma.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: {
      fullName: 'Преподаватель Тестовый',
      externalTeacherId: 't_77'
    },
    create: {
      userId: teacher.id,
      fullName: 'Преподаватель Тестовый',
      externalTeacherId: 't_77',
      department: 'Computer Science'
    }
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@visualsite.local' },
    update: {
      passwordHash,
      role: Role.STUDENT
    },
    create: {
      email: 'student@visualsite.local',
      passwordHash,
      role: Role.STUDENT,
      locale: 'ru'
    }
  });

  await prisma.studentProfile.upsert({
    where: { userId: student.id },
    update: {
      fullName: 'Студент Тестовый',
      groupId: group.id,
      studentNo: 'CS-101-0001'
    },
    create: {
      userId: student.id,
      fullName: 'Студент Тестовый',
      groupId: group.id,
      studentNo: 'CS-101-0001'
    }
  });

  await prisma.subject.upsert({
    where: { externalSubjectCode: 'MATH101' },
    update: {
      name: 'Математический анализ',
      description: 'Базовый курс анализа'
    },
    create: {
      externalSubjectCode: 'MATH101',
      name: 'Математический анализ',
      description: 'Базовый курс анализа'
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: 'SEED_BOOTSTRAP',
      entityType: 'SYSTEM',
      entityId: 'seed',
      traceId: `seed_${Date.now()}`,
      payloadJson: { ok: true }
    }
  });

  console.log('Seed completed.');
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

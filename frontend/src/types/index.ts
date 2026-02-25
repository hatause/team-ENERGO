export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  locale: string;
  studentProfile?: {
    fullName: string;
    studentNo: string;
  } | null;
  teacherProfile?: {
    fullName: string;
    department?: string;
  } | null;
};

export type SubjectListItem = {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semester?: string;
  teacher?: {
    externalId?: string;
    name?: string;
  };
};

export type Question = {
  id: string;
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'OPEN_SHORT';
  topicCode: string;
  stem: string;
  options: { id: string; text: string; code: string }[];
};

export type TestDetails = {
  testId: string;
  status: 'GENERATING' | 'READY' | 'FAILED';
  subjectId: string;
  subjectName: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimitSec: number;
  questions: Question[];
};

/* ── Room Finder (hacatonLocal integration) ── */

export type RoomInfo = {
  name: string;
  location_name?: string;
  location_id?: string;
  floor?: number;
  capacity?: number;
  schedule_free?: boolean;
  camera_free?: boolean;
  camera_status?: string;
  auditory_id?: number;
};

export type FindRoomQuery = {
  location_id: string;
  start_at: string;
  duration_minutes: number;
  floor?: number;
  filters?: {
    min_capacity?: number;
    need_projector?: boolean;
  };
};

export type FindRoomResponse = {
  free_rooms: RoomInfo[];
  alternatives: RoomInfo[];
  reason: string;
};

export type Auditory = {
  id: number;
  name: string;
  number: string;
  corpus: string;
  category: string;
};

export type AuditoryJournal = {
  id: number;
  audId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  duration: number;
  timeStatus: string;
};

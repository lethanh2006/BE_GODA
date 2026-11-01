import { AttemptAnswer } from './attempt-answer.entity.js';
import { Attempt } from './attempt.entity.js';
import { Bookmark } from './bookmark.entity.js';
import { ExamQuestion } from './exam-question.entity.js';
import { ExamSection } from './exam-section.entity.js';
import { Exam } from './exam.entity.js';
import { Kanji } from './kanji.entity.js';
import { Passage } from './passage.entity.js';
import { QuestionReport } from './question-report.entity.js';
import { Question } from './question.entity.js';
import { UserQuestionStat } from './user-question-stat.entity.js';
import { UserWord } from './user-word.entity.js';
import { User } from './user.entity.js';
import { Word } from './word.entity.js';

export {
  Attempt,
  AttemptAnswer,
  Bookmark,
  Exam,
  ExamQuestion,
  ExamSection,
  Kanji,
  Passage,
  Question,
  QuestionReport,
  User,
  UserQuestionStat,
  UserWord,
  Word,
};

export const ENTITIES = [
  User,
  Passage,
  Question,
  Exam,
  ExamSection,
  ExamQuestion,
  Attempt,
  AttemptAnswer,
  UserQuestionStat,
  Bookmark,
  QuestionReport,
  Word,
  Kanji,
  UserWord,
];

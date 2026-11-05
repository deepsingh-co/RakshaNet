import { useState } from 'react';
import {
  GraduationCap,
  Play,
  CheckCircle,
  Award,
  BookOpen,
  Clock,
  Star,
  Search,
  HelpCircle,
  X,
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { Course } from '../types';
import { CertificateModal } from '../components/CertificateModal';

export function EducationPage() {
  const courses = usePortalStore((s) => s.courses);
  const enrolledCourseIds = usePortalStore((s) => s.enrolledCourseIds);
  const courseProgress = usePortalStore((s) => s.courseProgress);
  const completedLessons = usePortalStore((s) => s.completedLessons);
  const enrollCourse = usePortalStore((s) => s.enrollCourse);
  const completeLesson = usePortalStore((s) => s.completeLesson);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<number>(1);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateCourse, setCertificateCourse] = useState<{ title: string; instructor: string } | null>(null);

  // Interactive Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const CATEGORIES = [
    'All',
    'Career development',
    'Financial literacy',
    'Legal awareness',
    'Health & wellness',
    'Skill development',
  ];

  const filteredCourses = courses.filter((c) => {
    const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenCourse = (course: Course) => {
    setSelectedCourse(course);
    setActiveLessonId(course.syllabus[0]?.id || 1);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  const handleLessonToggle = (courseId: string, lessonId: number) => {
    completeLesson(courseId, lessonId);
  };

  const handleQuizOption = (qIdx: number, optIdx: number) => {
    if (quizSubmitted) return;
    setQuizAnswers({ ...quizAnswers, [qIdx]: optIdx });
  };

  const handleQuizSubmit = (quiz: Course['quiz'], courseId: string) => {
    let score = 0;
    quiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);
    if (score >= Math.ceil(quiz.length * 0.6)) {
      // Mark course completed
      const course = courses.find((c) => c.id === courseId);
      if (course) {
        course.syllabus.forEach((l) => completeLesson(courseId, l.id));
      }
    }
  };

  const handleClaimCertificate = (course: Course) => {
    setCertificateCourse({ title: course.title, instructor: course.instructor });
    setShowCertificateModal(true);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            <GraduationCap className="size-3.5" />
            <span>Education &amp; E-Learning Academy</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Empowerment Through Knowledge
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Curated, free video bootcamps, financial literacy workshops, and legal rights masterclasses.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses, skills, teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 shadow-sm outline-none focus:border-rose-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              selectedCategory === cat
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.map((course) => {
          const isEnrolled = enrolledCourseIds.includes(course.id);
          const progress = courseProgress[course.id] || 0;

          return (
            <div
              key={course.id}
              className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Thumbnail */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="size-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-800 backdrop-blur dark:bg-slate-900/90 dark:text-white">
                  {course.category}
                </span>
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-black text-slate-900">
                  <Star className="size-3 fill-slate-900" /> {course.rating}
                </span>
              </div>

              {/* Course Info */}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-bold text-slate-900 line-clamp-2 dark:text-white">
                  {course.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  By {course.instructor} · <span className="text-rose-600 font-semibold">{course.instructorRole}</span>
                </p>

                <p className="mt-3 text-xs leading-relaxed text-slate-600 line-clamp-2 dark:text-slate-400">
                  {course.description}
                </p>

                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {course.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="size-3.5" /> {course.lessonsCount} lessons
                  </span>
                </div>

                {/* Progress bar if enrolled */}
                {isEnrolled && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-purple-600"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Card CTA */}
                <div className="mt-auto pt-5">
                  {isEnrolled ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenCourse(course)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                      >
                        <Play className="size-3.5" /> Continue Course
                      </button>
                      {progress === 100 && (
                        <button
                          onClick={() => handleClaimCertificate(course)}
                          className="flex items-center justify-center rounded-xl bg-amber-500 px-3 py-2.5 text-white hover:bg-amber-600"
                          title="Claim Certificate"
                        >
                          <Award className="size-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        enrollCourse(course.id);
                        handleOpenCourse(course);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-rose-600 hover:to-pink-700"
                    >
                      Enroll Free · Start Learning
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Course Player / Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold uppercase text-rose-600">
                  {selectedCourse.category} · {selectedCourse.level}
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedCourse.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
              {/* Left 2 Cols: Simulated Video Player & Interactive Quiz */}
              <div className="lg:col-span-2 space-y-6">
                {/* Simulated Interactive Video Screen */}
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 text-white shadow-lg">
                  <img
                    src={selectedCourse.thumbnail}
                    alt={selectedCourse.title}
                    className="size-full object-cover opacity-40 blur-xs"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <button className="flex size-16 items-center justify-center rounded-full bg-rose-600 text-white shadow-xl transition hover:scale-110 active:scale-95">
                      <Play className="ml-1 size-7 fill-white" />
                    </button>
                    <h4 className="mt-4 text-base font-bold">
                      Lesson {activeLessonId}: {selectedCourse.syllabus.find((s) => s.id === activeLessonId)?.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-300">
                      Instructor: {selectedCourse.instructor} · High Definition 1080p Stream
                    </p>
                  </div>
                  {/* Video Control Bar Simulation */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 text-xs flex items-center justify-between">
                    <span className="font-mono text-[11px]">04:22 / 18:00</span>
                    <button
                      onClick={() => handleLessonToggle(selectedCourse.id, activeLessonId)}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      {completedLessons[selectedCourse.id]?.includes(activeLessonId)
                        ? '✓ Lesson Completed'
                        : 'Mark Lesson Complete'}
                    </button>
                  </div>
                </div>

                {/* Interactive Assessment / Quiz */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="size-5 text-rose-600" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Module Mastery Assessment Quiz
                      </h4>
                    </div>
                    {quizScore !== null && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        Score: {quizScore} / {selectedCourse.quiz.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-4">
                    {selectedCourse.quiz.map((q, qIdx) => (
                      <div key={qIdx} className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {qIdx + 1}. {q.question}
                        </p>
                        <div className="mt-3 space-y-2">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = quizAnswers[qIdx] === optIdx;
                            const isCorrect = quizSubmitted && optIdx === q.correctAnswer;
                            const isWrong = quizSubmitted && isSelected && optIdx !== q.correctAnswer;

                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleQuizOption(qIdx, optIdx)}
                                className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-xs transition ${
                                  isCorrect
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                                    : isWrong
                                    ? 'border-red-500 bg-red-50 text-red-900'
                                    : isSelected
                                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-semibold'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <span>{opt}</span>
                                {isCorrect && <CheckCircle className="size-4 text-emerald-600" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Score at least 60% to validate certification credit.
                    </p>
                    <button
                      onClick={() => handleQuizSubmit(selectedCourse.quiz, selectedCourse.id)}
                      className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                    >
                      Submit Quiz Assessment
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Col: Syllabus & Certificate */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Course Syllabus
                  </h4>
                  <div className="mt-3 space-y-2">
                    {selectedCourse.syllabus.map((item) => {
                      const isCompleted = completedLessons[selectedCourse.id]?.includes(item.id);
                      const isCurrent = activeLessonId === item.id;

                      return (
                        <div
                          key={item.id}
                          onClick={() => setActiveLessonId(item.id)}
                          className={`flex cursor-pointer items-center justify-between rounded-xl p-3 text-xs transition ${
                            isCurrent
                              ? 'bg-rose-50 font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${
                                isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {isCompleted ? '✓' : item.id}
                            </span>
                            <span className="line-clamp-1">{item.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{item.duration}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Certificate Claim Card */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
                  <Award className="mx-auto size-10 text-amber-600 dark:text-amber-400" />
                  <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                    Official Certificate of Completion
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Earn an ATS-compatible certificate upon finishing all lessons &amp; passing the quiz.
                  </p>
                  <button
                    onClick={() => handleClaimCertificate(selectedCourse)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white shadow hover:bg-amber-600"
                  >
                    <Award className="size-4" /> Claim Certificate Credential
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verifiable Certificate Modal */}
      {showCertificateModal && certificateCourse && (
        <CertificateModal
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
          courseTitle={certificateCourse.title}
          instructor={certificateCourse.instructor}
        />
      )}
    </div>
  );
}

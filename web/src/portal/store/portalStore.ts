import { create } from 'zustand';
import {
  UserProfile,
  UserRole,
  Course,
  Job,
  JobApplication,
  LegalCase,
  MoodEntry,
  ForumPost,
  PlatformEvent,
  Appointment,
  HealthRecord,
  IncidentReport,
  AuditLog,
} from '../types';
import {
  INITIAL_USERS,
  MOCK_COURSES,
  MOCK_JOBS,
  MOCK_APPLICATIONS,
  MOCK_LEGAL_CASES,
  MOCK_MOOD_HISTORY,
  MOCK_FORUM_POSTS,
  MOCK_EVENTS,
  MOCK_APPOINTMENTS,
  MOCK_HEALTH_RECORDS,
  MOCK_INCIDENTS,
  MOCK_AUDIT_LOGS,
} from '../data/mockData';

export interface PortalNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'alert';
}

interface SystemConfig {
  maintenanceMode: boolean;
  smsGatewayActive: boolean;
  aiSkillMatchingSensitivity: number; // 50 - 100
  sosBroadcastDelaySeconds: number;
  autoLogAudits: boolean;
}

interface PortalState {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  token: string | null;
  courses: Course[];
  enrolledCourseIds: string[];
  courseProgress: Record<string, number>; // courseId -> percentage (0 - 100)
  completedLessons: Record<string, number[]>; // courseId -> array of completed lesson IDs
  jobs: Job[];
  applications: JobApplication[];
  legalCases: LegalCase[];
  moodLogs: MoodEntry[];
  forumPosts: ForumPost[];
  events: PlatformEvent[];
  appointments: Appointment[];
  healthRecords: HealthRecord[];
  incidents: IncidentReport[];
  auditLogs: AuditLog[];
  notifications: PortalNotification[];
  systemConfig: SystemConfig;

  // Actions
  switchRole: (role: UserRole) => void;
  loginAsRole: (role: UserRole) => void;
  loginWithEmail: (email: string, role?: UserRole) => boolean;
  signupUser: (data: { name: string; email: string; phone: string; role: UserRole; bio?: string }) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  enrollCourse: (courseId: string) => void;
  completeLesson: (courseId: string, lessonId: number) => void;
  applyForJob: (jobId: string, coverNote: string) => void;
  addMoodLog: (mood: MoodEntry['mood'], energy: number, note: string) => void;
  addForumPost: (title: string, category: ForumPost['category'], content: string) => void;
  toggleUpvotePost: (postId: string) => void;
  addForumComment: (postId: string, content: string) => void;
  toggleEventRegistration: (eventId: string) => void;
  bookDoctorAppointment: (doctorName: string, specialty: string, date: string, time: string, mode: 'Video Call' | 'In-Clinic', hospital: string) => void;
  submitIncidentReport: (type: IncidentReport['type'], date: string, time: string, location: string, description: string, isAnonymous: boolean) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  toggleUserStatus: (userId: string) => void;
  markNotificationsAsRead: () => void;
  updateSystemConfig: (updates: Partial<SystemConfig>) => void;
  addAuditLog: (action: string, details: string, status?: 'SUCCESS' | 'WARNING' | 'ALERT') => void;
}

const STORAGE_KEY = 'rakshanet_empowerher_portal_v1';

function getInitialStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load portal storage', e);
  }
  return null;
}

function persistState(state: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: state.currentUser?.id,
        role: state.currentUser?.role,
        enrolledCourseIds: state.enrolledCourseIds,
        courseProgress: state.courseProgress,
        completedLessons: state.completedLessons,
        applications: state.applications,
        moodLogs: state.moodLogs,
        token: state.token,
      }),
    );
  } catch (e) {
    console.error('Failed to save portal storage', e);
  }
}

const initialSaved = getInitialStorage();
const defaultUser = INITIAL_USERS[0]; // Beneficiary by default
const initialRole: UserRole = initialSaved?.role || 'Beneficiary';
const matchedUser = INITIAL_USERS.find((u) => u.role === initialRole) || defaultUser;

export const usePortalStore = create<PortalState>((set, get) => ({
  currentUser: matchedUser,
  allUsers: INITIAL_USERS,
  token: initialSaved?.token || 'jwt_demo_token_women_fronted_empowerher_2026',
  courses: MOCK_COURSES,
  enrolledCourseIds: initialSaved?.enrolledCourseIds || ['course-1', 'course-2'],
  courseProgress: initialSaved?.courseProgress || { 'course-1': 50, 'course-2': 100 },
  completedLessons: initialSaved?.completedLessons || { 'course-1': [1, 2], 'course-2': [1, 2, 3, 4] },
  jobs: MOCK_JOBS,
  applications: initialSaved?.applications || MOCK_APPLICATIONS,
  legalCases: MOCK_LEGAL_CASES,
  moodLogs: initialSaved?.moodLogs || MOCK_MOOD_HISTORY,
  forumPosts: MOCK_FORUM_POSTS,
  events: MOCK_EVENTS,
  appointments: MOCK_APPOINTMENTS,
  healthRecords: MOCK_HEALTH_RECORDS,
  incidents: MOCK_INCIDENTS,
  auditLogs: MOCK_AUDIT_LOGS,
  notifications: [
    {
      id: 'notif-1',
      title: 'Course Certificate Ready!',
      message: 'You completed Personal Financial Literacy & Wealth Building. Download your certificate now.',
      timestamp: '10 mins ago',
      read: false,
      type: 'success',
    },
    {
      id: 'notif-2',
      title: 'Interview Scheduled',
      message: 'SheTech Innovations invited you for Frontend React Developer interview on Nov 10.',
      timestamp: '2 hours ago',
      read: false,
      type: 'info',
    },
    {
      id: 'notif-3',
      title: 'Emergency Contact Verified',
      message: 'Radha Sharma (+91 98111 22334) verified as primary SOS contact.',
      timestamp: '1 day ago',
      read: true,
      type: 'info',
    },
  ],
  systemConfig: {
    maintenanceMode: false,
    smsGatewayActive: true,
    aiSkillMatchingSensitivity: 85,
    sosBroadcastDelaySeconds: 3,
    autoLogAudits: true,
  },

  switchRole: (role: UserRole) => {
    const user = get().allUsers.find((u) => u.role === role) || {
      ...get().currentUser,
      role,
    };
    set({ currentUser: user });
    get().addAuditLog('ROLE_SWITCHED', `Switched active role view to ${role}`, 'SUCCESS');
    persistState(get());
  },

  loginAsRole: (role: UserRole) => {
    const user = get().allUsers.find((u) => u.role === role) || INITIAL_USERS.find((u) => u.role === role)!;
    const dummyJwt = `jwt_session_${role.toLowerCase()}_${Date.now()}`;
    set({ currentUser: user, token: dummyJwt });
    get().addAuditLog('AUTH_LOGIN_SUCCESS', `User ${user.name} logged in as ${role}`, 'SUCCESS');
    persistState(get());
  },

  loginWithEmail: (email: string, role?: UserRole) => {
    const users = get().allUsers;
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const finalRole = role || existing?.role || 'Beneficiary';
    const user = existing || {
      id: `user-${Date.now()}`,
      name: email.split('@')[0],
      email,
      phone: '+91 98000 00000',
      role: finalRole,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      bio: 'Member of RakshaNet Women Empowerment Network',
      location: 'India',
      skills: ['Learning', 'Communication'],
      emergencyContact: { name: 'Emergency Helpline', phone: '112', relationship: 'Official' },
      joinedDate: new Date().toISOString().split('T')[0],
      status: 'Active' as const,
    };

    const dummyJwt = `jwt_session_${Date.now()}`;
    const updatedUsers = existing ? users : [...users, user];
    set({ currentUser: user, allUsers: updatedUsers, token: dummyJwt });
    get().addAuditLog('AUTH_EMAIL_LOGIN', `Logged in via email ${email}`, 'SUCCESS');
    persistState(get());
    return true;
  },

  signupUser: (data) => {
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      bio: data.bio || 'New member striving for empowerment and safety.',
      location: 'India',
      skills: ['Empowerment', 'Skill Development'],
      emergencyContact: { name: 'Primary Guardian', phone: '112', relationship: 'Family' },
      joinedDate: new Date().toISOString().split('T')[0],
      status: 'Active',
    };
    const updatedUsers = [...get().allUsers, newUser];
    const dummyJwt = `jwt_session_${Date.now()}`;
    set({ currentUser: newUser, allUsers: updatedUsers, token: dummyJwt });
    get().addAuditLog('AUTH_SIGNUP_SUCCESS', `New user registered: ${newUser.name} (${newUser.role})`, 'SUCCESS');
    persistState(get());
  },

  logout: () => {
    set({ token: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  updateProfile: (updates) => {
    const updated = { ...get().currentUser, ...updates };
    const allUsers = get().allUsers.map((u) => (u.id === updated.id ? updated : u));
    set({ currentUser: updated, allUsers });
    get().addAuditLog('PROFILE_UPDATED', `Updated profile settings for ${updated.name}`, 'SUCCESS');
    persistState(get());
  },

  enrollCourse: (courseId) => {
    const current = get().enrolledCourseIds;
    if (current.includes(courseId)) return;
    const updated = [...current, courseId];
    const progress = { ...get().courseProgress, [courseId]: 0 };
    set({ enrolledCourseIds: updated, courseProgress: progress });
    const course = get().courses.find((c) => c.id === courseId);
    get().addAuditLog('COURSE_ENROLLED', `Enrolled in course: ${course?.title || courseId}`, 'SUCCESS');
    persistState(get());
  },

  completeLesson: (courseId, lessonId) => {
    const completedMap = { ...get().completedLessons };
    const courseCompleted = completedMap[courseId] || [];
    if (!courseCompleted.includes(lessonId)) {
      courseCompleted.push(lessonId);
    }
    completedMap[courseId] = courseCompleted;

    const course = get().courses.find((c) => c.id === courseId);
    const totalLessons = course?.syllabus.length || 4;
    const newPercentage = Math.min(100, Math.round((courseCompleted.length / totalLessons) * 100));

    const progress = { ...get().courseProgress, [courseId]: newPercentage };
    set({ completedLessons: completedMap, courseProgress: progress });

    if (newPercentage === 100) {
      set((s) => ({
        notifications: [
          {
            id: `notif-${Date.now()}`,
            title: '🎉 Course Completed!',
            message: `Congratulations! You unlocked the Certificate of Completion for "${course?.title}".`,
            timestamp: 'Just now',
            read: false,
            type: 'success',
          },
          ...s.notifications,
        ],
      }));
    }
    get().addAuditLog('LESSON_COMPLETED', `Completed lesson #${lessonId} in course ${courseId}`, 'SUCCESS');
    persistState(get());
  },

  applyForJob: (jobId, coverNote) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return;
    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      jobId,
      jobTitle: job.title,
      company: job.company,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'Applied',
      coverNote,
    };
    const updatedApps = [newApp, ...get().applications];
    set({
      applications: updatedApps,
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: 'Job Application Submitted',
          message: `Your application for "${job.title}" at ${job.company} was sent successfully.`,
          timestamp: 'Just now',
          read: false,
          type: 'success',
        },
        ...get().notifications,
      ],
    });
    get().addAuditLog('JOB_APPLIED', `Applied for job: ${job.title} at ${job.company}`, 'SUCCESS');
    persistState(get());
  },

  addMoodLog: (mood, energy, note) => {
    const newEntry: MoodEntry = {
      id: `m-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      mood,
      energy,
      note,
    };
    set({ moodLogs: [newEntry, ...get().moodLogs] });
    persistState(get());
  },

  addForumPost: (title, category, content) => {
    const user = get().currentUser;
    const newPost: ForumPost = {
      id: `post-${Date.now()}`,
      authorName: user.name,
      authorRole: user.role,
      authorAvatar: user.avatar,
      category,
      title,
      content,
      timestamp: 'Just now',
      upvotes: 1,
      userUpvoted: true,
      comments: [],
    };
    set({ forumPosts: [newPost, ...get().forumPosts] });
    get().addAuditLog('FORUM_POST_CREATED', `Created post: "${title}" in ${category}`, 'SUCCESS');
  },

  toggleUpvotePost: (postId) => {
    const posts = get().forumPosts.map((p) => {
      if (p.id === postId) {
        const isUpvoted = p.userUpvoted;
        return {
          ...p,
          upvotes: isUpvoted ? p.upvotes - 1 : p.upvotes + 1,
          userUpvoted: !isUpvoted,
        };
      }
      return p;
    });
    set({ forumPosts: posts });
  },

  addForumComment: (postId, content) => {
    const user = get().currentUser;
    const posts = get().forumPosts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [
            ...p.comments,
            {
              id: `c-${Date.now()}`,
              authorName: user.name,
              authorRole: user.role,
              content,
              timestamp: 'Just now',
            },
          ],
        };
      }
      return p;
    });
    set({ forumPosts: posts });
  },

  toggleEventRegistration: (eventId) => {
    const events = get().events.map((e) => {
      if (e.id === eventId) {
        const reg = !e.registered;
        return {
          ...e,
          registered: reg,
          attendeesCount: reg ? e.attendeesCount + 1 : e.attendeesCount - 1,
        };
      }
      return e;
    });
    set({ events });
  },

  bookDoctorAppointment: (doctorName, specialty, date, time, mode, hospital) => {
    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      doctorName,
      specialty,
      date,
      time,
      mode,
      status: 'Confirmed',
      hospital,
    };
    set({
      appointments: [newApt, ...get().appointments],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: 'Appointment Booked!',
          message: `Consultation with ${doctorName} confirmed for ${date} at ${time}.`,
          timestamp: 'Just now',
          read: false,
          type: 'success',
        },
        ...get().notifications,
      ],
    });
    get().addAuditLog('APPOINTMENT_BOOKED', `Booked appointment with ${doctorName}`, 'SUCCESS');
  },

  submitIncidentReport: (type, date, time, location, description, isAnonymous) => {
    const newInc: IncidentReport = {
      id: `inc-${Date.now().toString().slice(-4)}`,
      type,
      date,
      time,
      location,
      description,
      isAnonymous,
      status: 'Reported',
      actionTaken: 'Assigned to RakshaNet Emergency Response Cell. Verified officer dispatched.',
    };
    set({
      incidents: [newInc, ...get().incidents],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: 'Incident Report Received',
          message: `Report #${newInc.id} logged safely. Crisis assistance is active.`,
          timestamp: 'Just now',
          read: false,
          type: 'alert',
        },
        ...get().notifications,
      ],
    });
    get().addAuditLog('INCIDENT_REPORTED', `Incident reported: ${type} at ${location}`, 'ALERT');
  },

  updateUserRole: (userId, role) => {
    const allUsers = get().allUsers.map((u) => (u.id === userId ? { ...u, role } : u));
    const currentUser = get().currentUser.id === userId ? { ...get().currentUser, role } : get().currentUser;
    set({ allUsers, currentUser });
    get().addAuditLog('USER_ROLE_CHANGED', `Changed user ${userId} role to ${role}`, 'WARNING');
  },

  toggleUserStatus: (userId) => {
    const allUsers = get().allUsers.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.status === 'Active' ? 'Suspended' : 'Active';
        return { ...u, status: nextStatus as 'Active' | 'Suspended' };
      }
      return u;
    });
    set({ allUsers });
    get().addAuditLog('USER_STATUS_TOGGLED', `Toggled status for user ${userId}`, 'WARNING');
  },

  markNotificationsAsRead: () => {
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
    });
  },

  updateSystemConfig: (updates) => {
    set({ systemConfig: { ...get().systemConfig, ...updates } });
    get().addAuditLog('SYSTEM_CONFIG_UPDATED', `Updated system parameters`, 'WARNING');
  },

  addAuditLog: (action, details, status = 'SUCCESS') => {
    const user = get().currentUser;
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: user?.name || 'Anonymous',
      role: user?.role || 'Beneficiary',
      action,
      details,
      ip: '103.24.120.45',
      status,
    };
    set({ auditLogs: [newLog, ...get().auditLogs.slice(0, 49)] });
  },
}));

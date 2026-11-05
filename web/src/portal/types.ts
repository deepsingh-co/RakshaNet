export type UserRole = 'Beneficiary' | 'Mentor' | 'Admin' | 'Volunteer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  bio: string;
  location: string;
  skills: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  joinedDate: string;
  status: 'Active' | 'Pending' | 'Suspended';
}

export interface Course {
  id: string;
  title: string;
  category: 'Career development' | 'Financial literacy' | 'Legal awareness' | 'Health & wellness' | 'Skill development';
  instructor: string;
  instructorRole: string;
  duration: string;
  lessonsCount: number;
  rating: number;
  enrolledCount: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  thumbnail: string;
  description: string;
  syllabus: { id: number; title: string; duration: string; completed?: boolean }[];
  quiz: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
  certificateAvailable: boolean;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Remote work' | 'Part-time' | 'Full-time' | 'Freelance' | 'Leadership';
  salary: string;
  postedDate: string;
  skillsRequired: string[];
  perks: string[];
  description: string;
  urgency?: 'Urgent' | 'Regular';
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  appliedDate: string;
  status: 'Applied' | 'Under Review' | 'Interview Scheduled' | 'Accepted' | 'Rejected';
  coverNote: string;
}

export interface LegalResource {
  id: string;
  title: string;
  category: string;
  summary: string;
  fullText: string;
  penalties: string;
  howToApply: string;
}

export interface LegalAdvocate {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  location: string;
  languages: string[];
  rating: number;
  casesWon: number;
  isProBono: boolean;
  contactEmail: string;
}

export interface LegalCase {
  id: string;
  caseNumber: string;
  title: string;
  filedDate: string;
  court: string;
  advocateName: string;
  stage: 'Complaint Filed' | 'Preliminary Hearing' | 'Evidence Collection' | 'Court Arguments' | 'Final Order';
  nextHearingDate: string;
  updates: { date: string; note: string }[];
}

export interface LegalTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
}

export interface Counselor {
  id: string;
  name: string;
  qualification: string;
  specialty: string;
  experience: string;
  languages: string[];
  rating: number;
  sessionFee: string;
  isFreeEligible: boolean;
  availableDays: string[];
}

export interface MoodEntry {
  id: string;
  date: string;
  mood: 'Joyful' | 'Peaceful' | 'Neutral' | 'Anxious' | 'Overwhelmed';
  energy: number; // 1-10
  note: string;
}

export interface ForumPost {
  id: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatar: string;
  category: 'Career advice' | 'Legal queries' | 'Health & wellness' | 'Entrepreneurship' | 'General discussion';
  title: string;
  content: string;
  timestamp: string;
  upvotes: number;
  userUpvoted?: boolean;
  comments: {
    id: string;
    authorName: string;
    authorRole: UserRole;
    content: string;
    timestamp: string;
  }[];
}

export interface MentorProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  domain: string;
  experience: string;
  menteesCount: number;
  rating: number;
  skills: string[];
  bio: string;
  availableSlots: string;
}

export interface PlatformEvent {
  id: string;
  title: string;
  type: 'Webinar' | 'Workshop' | 'Networking' | 'Panel Discussion';
  date: string;
  time: string;
  speaker: string;
  speakerRole: string;
  attendeesCount: number;
  registered: boolean;
  location: string;
  description: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: 'Gynecologist' | 'Pediatrician' | 'General Physician' | 'Psychiatrist' | 'Dermatologist';
  hospital: string;
  experience: string;
  rating: number;
  consultationFee: string;
  languages: string[];
  availability: string;
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  mode: 'Video Call' | 'In-Clinic';
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  hospital: string;
}

export interface HealthRecord {
  id: string;
  title: string;
  type: 'Prescription' | 'Lab Report' | 'Vaccination' | 'Medical History';
  doctor: string;
  date: string;
  fileSize: string;
}

export interface FinancialScheme {
  id: string;
  name: string;
  provider: 'Government' | 'NGO' | 'Bank';
  type: 'Grant' | 'Low-Interest Loan' | 'Savings Scheme' | 'Subsidized Training';
  maxAmount: string;
  eligibility: string[];
  benefits: string;
  officialLink: string;
}

export interface IncidentReport {
  id: string;
  type: 'Harassment' | 'Domestic Abuse' | 'Cyberstalking' | 'Workplace Discrimination' | 'Stalking' | 'Other';
  date: string;
  time: string;
  location: string;
  description: string;
  isAnonymous: boolean;
  status: 'Reported' | 'Under Investigation' | 'Support Assigned' | 'Resolved';
  actionTaken: string;
}

export interface SafeLocation {
  id: string;
  name: string;
  type: 'Police Station' | '24/7 Women Booth' | 'Verified Safe Shelter' | 'Pink Metro Coach / Booth';
  address: string;
  distance: string;
  contact: string;
  openHours: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  details: string;
  ip: string;
  status: 'SUCCESS' | 'WARNING' | 'ALERT';
}


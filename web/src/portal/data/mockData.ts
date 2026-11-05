import {
  UserProfile,
  Course,
  Job,
  JobApplication,
  LegalResource,
  LegalAdvocate,
  LegalCase,
  LegalTemplate,
  Counselor,
  MoodEntry,
  ForumPost,
  MentorProfile,
  PlatformEvent,
  Doctor,
  Appointment,
  HealthRecord,
  FinancialScheme,
  IncidentReport,
  SafeLocation,
  AuditLog,
} from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user-beneficiary',
    name: 'Ananya Sharma',
    email: 'ananya.sharma@example.org',
    phone: '+91 98765 43210',
    role: 'Beneficiary',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    bio: 'Aspiring Web Developer & Financial independence advocate. Learning React & Digital Finance.',
    location: 'Jaipur, Rajasthan',
    skills: ['Web Development', 'Digital Marketing', 'Financial Planning', 'Public Speaking'],
    emergencyContact: {
      name: 'Radha Sharma',
      phone: '+91 98111 22334',
      relationship: 'Mother',
    },
    joinedDate: '2026-01-15',
    status: 'Active',
  },
  {
    id: 'user-mentor',
    name: 'Dr. Priya Deshmukh',
    email: 'priya.deshmukh@empower.org',
    phone: '+91 98222 33445',
    role: 'Mentor',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    bio: 'Senior Director of Engineering with 14+ years experience. Mentoring women in STEM & Tech Leadership.',
    location: 'Bengaluru, Karnataka',
    skills: ['Tech Leadership', 'Cloud Architecture', 'Career Navigation', 'Negotiation Skills'],
    emergencyContact: {
      name: 'Rohan Deshmukh',
      phone: '+91 98333 44556',
      relationship: 'Spouse',
    },
    joinedDate: '2025-08-10',
    status: 'Active',
  },
  {
    id: 'user-admin',
    name: 'Sunita Verma',
    email: 'admin.sunita@rakshanet.org',
    phone: '+91 98999 11223',
    role: 'Admin',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    bio: 'Platform Administrator & Women Rights Activist. Overseeing safety dispatch and resource governance.',
    location: 'New Delhi, Delhi',
    skills: ['Operations Management', 'Crisis Intervention', 'Data Governance', 'Public Policy'],
    emergencyContact: {
      name: 'Amit Verma',
      phone: '+91 98777 66554',
      relationship: 'Brother',
    },
    joinedDate: '2025-05-01',
    status: 'Active',
  },
  {
    id: 'user-volunteer',
    name: 'Kavita Rao',
    email: 'kavita.rao@volunteer.org',
    phone: '+91 98444 55667',
    role: 'Volunteer',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    bio: 'Community Volunteer & Legal Aid Student. Coordinating local safe zones and survivor relief.',
    location: 'Pune, Maharashtra',
    skills: ['First Aid & SOS Response', 'Community Outreach', 'Legal Documentation', 'Counseling Assist'],
    emergencyContact: {
      name: 'Meena Rao',
      phone: '+91 98555 66778',
      relationship: 'Sister',
    },
    joinedDate: '2025-11-20',
    status: 'Active',
  },
];

export const MOCK_COURSES: Course[] = [
  {
    id: 'course-1',
    title: 'Full-Stack Web Development Bootcamp for Women',
    category: 'Career development',
    instructor: 'Megha Iyer',
    instructorRole: 'Staff Software Architect',
    duration: '18 Hours',
    lessonsCount: 14,
    rating: 4.9,
    enrolledCount: 2340,
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
    description: 'Learn HTML, CSS, JavaScript, React, and build production-ready web apps from scratch with female engineering role models.',
    syllabus: [
      { id: 1, title: 'Introduction to Modern Web Architecture', duration: '45 mins', completed: true },
      { id: 2, title: 'Frontend Fundamentals: HTML5 & Tailwind CSS', duration: '1h 15m', completed: true },
      { id: 3, title: 'JavaScript Essentials & DOM Manipulation', duration: '1h 30m', completed: false },
      { id: 4, title: 'React Hooks & State Management', duration: '2h 00m', completed: false },
    ],
    quiz: [
      {
        question: 'Which CSS methodology is utility-first and enables fast responsive styling?',
        options: ['BEM', 'Tailwind CSS', 'OOCSS', 'CSS Modules'],
        correctAnswer: 1,
      },
      {
        question: 'In React, which hook manages state inside functional components?',
        options: ['useEffect', 'useState', 'useRef', 'useContext'],
        correctAnswer: 1,
      },
      {
        question: 'What is the purpose of Git version control?',
        options: ['To compile code', 'To track code history & collaborate', 'To style websites', 'To run database queries'],
        correctAnswer: 1,
      },
    ],
    certificateAvailable: true,
  },
  {
    id: 'course-2',
    title: 'Personal Financial Literacy & Wealth Building',
    category: 'Financial literacy',
    instructor: 'Swati Agarwal, CA',
    instructorRole: 'Chartered Accountant & Wealth Advisor',
    duration: '10 Hours',
    lessonsCount: 8,
    rating: 4.8,
    enrolledCount: 4120,
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80',
    description: 'Master budgeting with the 50/30/20 rule, emergency funds, tax-saving instruments, Mutual Funds SIP, and Sukanya Samriddhi Yojana.',
    syllabus: [
      { id: 1, title: 'Demystifying Money: The 50/30/20 Rule', duration: '40 mins', completed: true },
      { id: 2, title: 'Building Your 6-Month Emergency Safety Net', duration: '55 mins', completed: true },
      { id: 3, title: 'Mutual Funds, Index Funds & Systematic Investment (SIP)', duration: '1h 20m', completed: true },
      { id: 4, title: 'Government Schemes for Women & Tax Planning', duration: '1h 10m', completed: true },
    ],
    quiz: [
      {
        question: 'Under the 50/30/20 budgeting rule, what percentage is allocated to Savings & Investments?',
        options: ['10%', '20%', '30%', '50%'],
        correctAnswer: 1,
      },
      {
        question: 'Which instrument offers safe, tax-exempt compounding for girl children in India?',
        options: ['Cryptocurrency', 'Sukanya Samriddhi Yojana', 'Unsecured P2P Lending', 'Chit Funds'],
        correctAnswer: 1,
      },
    ],
    certificateAvailable: true,
  },
  {
    id: 'course-3',
    title: 'Know Your Legal Rights & Workplace Protections (POSH)',
    category: 'Legal awareness',
    instructor: 'Adv. Shalini Sen',
    instructorRole: 'Supreme Court Advocate & Human Rights Counsel',
    duration: '8 Hours',
    lessonsCount: 6,
    rating: 4.95,
    enrolledCount: 3890,
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    description: 'A comprehensive guide to the POSH Act 2013, Domestic Violence Act 2005, Equal Remuneration, Cyberstalking laws, and filing Zero-FIRs.',
    syllabus: [
      { id: 1, title: 'Constitutional Protections & Zero-FIR Procedure', duration: '50 mins', completed: false },
      { id: 2, title: 'POSH Act 2013: What Constitutes Harassment & Internal Complaints Committee', duration: '1h 15m', completed: false },
      { id: 3, title: 'Domestic Violence Act: Protection Orders & Maintenance', duration: '1h 10m', completed: false },
    ],
    quiz: [
      {
        question: 'Can a Zero-FIR be registered at ANY police station regardless of jurisdiction?',
        options: ['Yes, anywhere in India', 'No, only home police station', 'Only with court permission', 'Only during office hours'],
        correctAnswer: 0,
      },
      {
        question: 'Under POSH Act 2013, every workplace with 10+ employees must constitute what?',
        options: ['HR Union', 'Internal Complaints Committee (ICC)', 'Disciplinary Board', 'Audit Firm'],
        correctAnswer: 1,
      },
    ],
    certificateAvailable: true,
  },
  {
    id: 'course-4',
    title: 'Women Holistic Health, PCOS & Mental Wellbeing',
    category: 'Health & wellness',
    instructor: 'Dr. Aditi Mukherjee, MD',
    instructorRole: 'Consultant Gynecologist & Hormone Specialist',
    duration: '6 Hours',
    lessonsCount: 5,
    rating: 4.85,
    enrolledCount: 2950,
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80',
    description: 'Evidence-based strategies for managing hormonal health, menstrual health, stress-induced anxiety, and maternal nutrition.',
    syllabus: [
      { id: 1, title: 'Understanding Hormones & PCOS Root Causes', duration: '45 mins', completed: true },
      { id: 2, title: 'Dietary Nutrition & Anti-inflammatory Living', duration: '1h 00m', completed: false },
    ],
    quiz: [
      {
        question: 'Which lifestyle factor significantly reduces insulin resistance in PCOS?',
        options: ['Skipping meals', 'Strength training & balanced low-GI diet', 'High sugar snacks', 'Sedentary routine'],
        correctAnswer: 1,
      },
    ],
    certificateAvailable: true,
  },
  {
    id: 'course-5',
    title: 'Executive Communication & Leadership for Women',
    category: 'Skill development',
    instructor: 'Ritu Kapur',
    instructorRole: 'Executive Coach & Former VP Human Resources',
    duration: '12 Hours',
    lessonsCount: 9,
    rating: 4.9,
    enrolledCount: 1980,
    level: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=600&q=80',
    description: 'Learn assertive communication, salary negotiation, executive presence, and overcoming impostor syndrome.',
    syllabus: [
      { id: 1, title: 'Assertive vs Passive vs Aggressive Dialogue', duration: '50 mins', completed: false },
      { id: 2, title: 'Salary & Compensation Negotiation Frameworks', duration: '1h 20m', completed: false },
    ],
    quiz: [
      {
        question: 'When negotiating compensation, what is the best opening stance?',
        options: ['Accept immediately', 'Research market benchmarks & anchor with a researched range', 'Demand triple without justification', 'Refuse to discuss until day one'],
        correctAnswer: 1,
      },
    ],
    certificateAvailable: true,
  },
];

export const MOCK_JOBS: Job[] = [
  {
    id: 'job-1',
    title: 'Frontend React Developer (Remote)',
    company: 'SheTech Innovations',
    location: 'Remote (Pan India)',
    type: 'Remote work',
    salary: '₹8,00,000 - ₹12,00,000 / year',
    postedDate: '2 days ago',
    skillsRequired: ['React', 'TypeScript', 'Tailwind CSS', 'Web Development'],
    perks: ['100% Remote', 'Flexible 4-Day Workweek Option', 'Menstrual Leave Policy', 'Mental Health Allowance'],
    description: 'Join our mission-driven tech team creating scalable web apps. Mentorship provided for early-career female engineers.',
    urgency: 'Urgent',
  },
  {
    id: 'job-2',
    title: 'Digital Marketing & Community Manager',
    company: 'FemmeForward Media',
    location: 'Mumbai / Hybrid',
    type: 'Full-time',
    salary: '₹6,50,000 - ₹9,00,000 / year',
    postedDate: '3 days ago',
    skillsRequired: ['Digital Marketing', 'Content Creation', 'Social Media', 'Public Speaking'],
    perks: ['Onsite Daycare Facility', 'Equal Pay Certified', 'Health Insurance covering Parents & Child', 'Annual Offsite'],
    description: 'Lead our social initiatives and campaign outreach connecting 500,000+ women to career and learning programs.',
  },
  {
    id: 'job-3',
    title: 'Legal Content Writer & Paralegal Assistant',
    company: 'NyayaSathi Foundation',
    location: 'Remote',
    type: 'Part-time',
    salary: '₹25,000 - ₹35,000 / month',
    postedDate: '1 day ago',
    skillsRequired: ['Legal Documentation', 'Research', 'Content Writing'],
    perks: ['Flexible 20 hrs/week', 'Training under Senior Advocates', 'Stipend for Law Subscriptions'],
    description: 'Draft plain-language legal explainers for victims of domestic abuse and workplace discrimination.',
  },
  {
    id: 'job-4',
    title: 'Freelance Graphic & Brand Designer',
    company: 'CraftHer Studio',
    location: 'Remote',
    type: 'Freelance',
    salary: '₹40,000 - ₹75,000 / project',
    postedDate: '5 days ago',
    skillsRequired: ['Figma', 'Graphic Design', 'Brand Identity', 'Adobe Illustrator'],
    perks: ['Milestone Payments', '100% Async', 'Portfolio Boost'],
    description: 'Design UI mockups, infographics, and social media brand identity for ethical women-led ventures.',
  },
  {
    id: 'job-5',
    title: 'VP of Product & Inclusive Growth',
    company: 'EquiFin Microservices',
    location: 'Bengaluru',
    type: 'Leadership',
    salary: '₹28,00,000 - ₹38,00,000 / year',
    postedDate: 'Just now',
    skillsRequired: ['Tech Leadership', 'Product Strategy', 'Fintech', 'Operations Management'],
    perks: ['Executive Equity Options', 'Comprehensive Family Medical', 'Sabbatical Policy', 'Childcare Allowance'],
    description: 'Head the product team building financial inclusion tools, micro-credit lines, and savings accounts for women entrepreneurs.',
  },
];

export const MOCK_APPLICATIONS: JobApplication[] = [
  {
    id: 'app-1',
    jobId: 'job-1',
    jobTitle: 'Frontend React Developer (Remote)',
    company: 'SheTech Innovations',
    appliedDate: '2026-11-01',
    status: 'Interview Scheduled',
    coverNote: 'Excited about SheTech mission. I have built 4 React projects and love modern UI development.',
  },
  {
    id: 'app-2',
    jobId: 'job-2',
    jobTitle: 'Digital Marketing & Community Manager',
    company: 'FemmeForward Media',
    appliedDate: '2026-10-26',
    status: 'Under Review',
    coverNote: 'Passionate about digital storytelling and empowering grassroots communities.',
  },
];

export const MOCK_LEGAL_RESOURCES: LegalResource[] = [
  {
    id: 'law-1',
    title: 'Protection of Women from Domestic Violence Act, 2005 (PWDVA)',
    category: 'Domestic Rights',
    summary: 'Guarantees the right of a woman to reside in a shared household, protection orders against physical, verbal, emotional, and economic abuse, and interim financial maintenance.',
    fullText: 'Section 12 allows an aggrieved person or Protection Officer to present an application to the Magistrate. Reliefs include Protection Orders (Sec 18), Residence Orders (Sec 19), Monetary Reliefs (Sec 20), and Custody Orders (Sec 21).',
    penalties: 'Breach of protection order is punishable with imprisonment up to 1 year and/or fine up to ₹20,000 (Section 31).',
    howToApply: 'Contact a Protection Officer, a registered service provider, or the nearest Judicial Magistrate court.',
  },
  {
    id: 'law-2',
    title: 'Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (POSH)',
    category: 'Workplace Protections',
    summary: 'Mandates every organization with 10+ employees to create an Internal Complaints Committee (ICC) presided by a senior woman employee to investigate complaints within 90 days.',
    fullText: 'Covers all women workers including permanent, temporary, contractual, intern, and freelance workers, as well as visitors to the office premises. False complaints are protected from dismissal if genuine error.',
    penalties: 'Employer non-compliance attracts a penalty up to ₹50,000, and repeated offenses can lead to revocation of business license.',
    howToApply: 'Submit a written complaint to the Internal Complaints Committee within 3 months of the incident.',
  },
  {
    id: 'law-3',
    title: 'Equal Remuneration Act & Code on Wages (Equal Pay for Equal Work)',
    category: 'Labor Rights',
    summary: 'Prohibits gender-based wage discrimination for performing same or similar work, and bans discrimination in recruitment or promotions.',
    fullText: 'Employers must ensure parity in pay, benefits, and working conditions without gender bias.',
    penalties: 'Fines and potential prosecution under labor inspectorate.',
    howToApply: 'File a complaint before the Labor Commissioner or Equal Remuneration Advisory Committee.',
  },
  {
    id: 'law-4',
    title: 'Information Technology Act (Sec 66E, 67, 67A - Cyberstalking & Deepfakes)',
    category: 'Cyber Safety',
    summary: 'Strict criminal penalties for transmitting obscene images, morphing photos (deepfakes), non-consensual sharing of intimate images, and online harassment.',
    fullText: 'Publishing sexually explicit acts carries imprisonment up to 5 years and fine up to ₹10 Lakhs. Privacy violation (capturing/transmitting private images without consent) carries up to 3 years imprisonment.',
    penalties: 'Non-bailable offense under Sec 67A.',
    howToApply: 'Register complaint at cybercrime.gov.in or dial National Cyber Helpline 1930.',
  },
];

export const MOCK_LEGAL_ADVOCATES: LegalAdvocate[] = [
  {
    id: 'adv-1',
    name: 'Adv. Shalini Sen',
    specialty: 'POSH Act & Workplace Rights',
    experience: '12 Years',
    location: 'New Delhi & Online',
    languages: ['English', 'Hindi'],
    rating: 4.95,
    casesWon: 140,
    isProBono: true,
    contactEmail: 'shalini.sen@legalrights.in',
  },
  {
    id: 'adv-2',
    name: 'Adv. Reema Bhatia',
    specialty: 'Domestic Violence & Family Law',
    experience: '16 Years',
    location: 'Mumbai & Thane',
    languages: ['Hindi', 'Marathi', 'English'],
    rating: 4.9,
    casesWon: 210,
    isProBono: true,
    contactEmail: 'reema.bhatia@advocates.org',
  },
  {
    id: 'adv-3',
    name: 'Adv. Ananya Nambiar',
    specialty: 'Cybercrime, Stalking & IT Act',
    experience: '9 Years',
    location: 'Bengaluru & Hyderabad',
    languages: ['English', 'Kannada', 'Malayalam'],
    rating: 4.88,
    casesWon: 95,
    isProBono: true,
    contactEmail: 'ananya.nambiar@cyberjustice.in',
  },
];

export const MOCK_LEGAL_CASES: LegalCase[] = [
  {
    id: 'case-1',
    caseNumber: 'CASE-2026-DL-8841',
    title: 'POSH Workplace Discrimination & Retaliation Complaint',
    filedDate: '2026-09-12',
    court: 'Internal Complaints Committee & Labor Court Delhi',
    advocateName: 'Adv. Shalini Sen',
    stage: 'Court Arguments',
    nextHearingDate: '2026-11-18',
    updates: [
      { date: '2026-09-12', note: 'Formal complaint registered with complete digital evidence log.' },
      { date: '2026-10-04', note: 'Preliminary hearing concluded; respondent submitted reply.' },
      { date: '2026-10-25', note: 'Cross-examination of witnesses completed without delays.' },
    ],
  },
  {
    id: 'case-2',
    caseNumber: 'CASE-2026-MH-3302',
    title: 'Maintenance & Protection Order Application (PWDVA Sec 12)',
    filedDate: '2026-10-05',
    court: 'Metropolitan Magistrate Court, Bandra Mumbai',
    advocateName: 'Adv. Reema Bhatia',
    stage: 'Evidence Collection',
    nextHearingDate: '2026-11-22',
    updates: [
      { date: '2026-10-05', note: 'Interim protection order granted preventing dispossessing from home.' },
      { date: '2026-10-20', note: 'Affidavit of income and assets submitted to the court.' },
    ],
  },
];

export const MOCK_LEGAL_TEMPLATES: LegalTemplate[] = [
  {
    id: 'temp-1',
    title: 'Zero-FIR Police Complaint for Harassment / Violence',
    category: 'Criminal Complaint',
    description: 'Format to submit a Zero-FIR at any police station across India under CrPC / BNSS, demanding an immediate written receipt.',
    content: `To,
The Station House Officer (SHO),
Police Station: [Station Name / Zero-FIR Jurisdiction]

Subject: Urgent Complaint regarding Harassment / Assault / Threat (Zero-FIR under CrPC)

Respected Sir/Madam,
I, [Your Full Name], daughter/wife of [Name], aged [Age] years, residing at [Your Full Address], Mobile No: [Phone Number], write to report a cognizable offense committed on [Date] at approximately [Time] at [Location of Incident].

Details of the Offender(s):
Name (if known): [Name/Description]
Contact / Vehicle No (if any): [Details]

Facts of the Incident:
[Provide factual, chronological narrative of what occurred, exact words used, physical assault or digital stalking evidence].

I request you to kindly register a Zero-FIR immediately, provide me with a signed copy of the FIR free of cost, and initiate necessary action.

Yours sincerely,
[Your Name & Signature]
Date: [Date]`,
  },
  {
    id: 'temp-2',
    title: 'Internal Complaints Committee (POSH) Complaint Format',
    category: 'Workplace Redressal',
    description: 'Formal template to submit a workplace sexual harassment complaint to the ICC within the organization.',
    content: `To,
The Presiding Officer & Members,
Internal Complaints Committee (ICC),
[Organization Name]

Subject: Formal Complaint under Section 9 of the POSH Act, 2013

Respected Members of the Committee,
I am currently working as [Your Designation] in the [Department Name] department. I hereby file a formal complaint regarding incidents of sexual harassment by [Name of Accused, Designation, Department].

Chronological Details of Incidents:
1. Incident 1: Date [Date], Time [Time], Location [Office / Virtual Meet / Event]. Details: [Describe behavior].
Witnesses: [Names of colleagues present].

2. Supporting Evidence:
- Attached email trails / chat screenshots / audio-visual records.

I request the Committee to initiate an inquiry as per POSH Act guidelines, ensure interim measures to protect me from workplace retaliation, and maintain strict confidentiality.

Yours faithfully,
[Your Name]
Employee ID: [ID]
Date: [Date]`,
  },
  {
    id: 'temp-3',
    title: 'Right to Information (RTI) Application Format',
    category: 'Public Information',
    description: 'Official RTI draft for seeking information on government women welfare schemes, grants, or police action.',
    content: `Form A: Application for Information under Section 6(1) of the RTI Act, 2005

To,
The Public Information Officer (PIO),
[Name of Department / Ministry / Police Office],
[Address]

1. Full Name of Applicant: [Your Name]
2. Address: [Your Residential Address]
3. Particulars of Information Required:
   a) Subject Matter: [E.g., Status of Women Safety Fund Allocation in Jaipur District]
   b) Period to which information relates: [E.g., 2024 - 2026]
   c) Description of information needed: [List 1, 2, 3 specific questions]
4. I state that I am a citizen of India.
5. Application fee of ₹10 enclosed via Postal Order / Online Receipt No: [Number].

Applicant Signature: ______________
Date: [Date]`,
  },
];

export const MOCK_COUNSELORS: Counselor[] = [
  {
    id: 'coun-1',
    name: 'Nandita Sen, M.Phil',
    qualification: 'Licensed Clinical Psychologist (RCI Registered)',
    specialty: 'Trauma Recovery & Workplace Anxiety',
    experience: '11 Years',
    languages: ['English', 'Hindi', 'Bengali'],
    rating: 4.96,
    sessionFee: '₹0 (Free for RakshaNet members)',
    isFreeEligible: true,
    availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
  },
  {
    id: 'coun-2',
    name: 'Dr. Fatima Rizvi',
    qualification: 'Psychotherapist & Mindfulness Practitioner',
    specialty: 'Relationship Stress, Grief & Post-Partum Support',
    experience: '9 Years',
    languages: ['Hindi', 'Urdu', 'English'],
    rating: 4.9,
    sessionFee: '₹0 (Free for RakshaNet members)',
    isFreeEligible: true,
    availableDays: ['Tue', 'Thu', 'Sat', 'Sun'],
  },
];

export const MOCK_MOOD_HISTORY: MoodEntry[] = [
  { id: 'm-1', date: '2026-11-01', mood: 'Joyful', energy: 8, note: 'Finished my React course module!' },
  { id: 'm-2', date: '2026-11-02', mood: 'Peaceful', energy: 7, note: 'Morning meditation felt grounding.' },
  { id: 'm-3', date: '2026-11-03', mood: 'Anxious', energy: 5, note: 'Worried about upcoming interview, but practiced answers.' },
  { id: 'm-4', date: '2026-11-04', mood: 'Neutral', energy: 6, note: 'Regular routine day.' },
  { id: 'm-5', date: '2026-11-05', mood: 'Joyful', energy: 9, note: 'Received positive feedback on resume!' },
];

export const MOCK_FORUM_POSTS: ForumPost[] = [
  {
    id: 'post-1',
    authorName: 'Sneha Patel',
    authorRole: 'Beneficiary',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    category: 'Career advice',
    title: 'How I transitioned from non-tech to frontend developer at age 32',
    content: 'A year ago, I was worried I had missed the bus. With structured courses and practicing coding 2 hours every evening while my kids were asleep, I just signed an offer letter! Don’t let anyone tell you it is too late.',
    timestamp: '3 hours ago',
    upvotes: 42,
    userUpvoted: true,
    comments: [
      {
        id: 'c-1',
        authorName: 'Dr. Priya Deshmukh',
        authorRole: 'Mentor',
        content: 'Huge congratulations Sneha! Your consistency is the real superpower.',
        timestamp: '2 hours ago',
      },
      {
        id: 'c-2',
        authorName: 'Ananya Sharma',
        authorRole: 'Beneficiary',
        content: 'This gave me so much motivation! How did you prepare for data structures?',
        timestamp: '1 hour ago',
      },
    ],
  },
  {
    id: 'post-2',
    authorName: 'Adv. Shalini Sen',
    authorRole: 'Mentor',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    category: 'Legal queries',
    title: 'Important: How to safely collect digital evidence if you are facing cyber harassment',
    content: 'Do NOT just delete harassing messages. Take timestamped screenshots showing URL/number, download headers, export full WhatsApp chat backup, and lodge a Zero-FIR or visit cybercrime.gov.in. Keep two offline backups.',
    timestamp: '1 day ago',
    upvotes: 89,
    userUpvoted: false,
    comments: [
      {
        id: 'c-3',
        authorName: 'Kavita Rao',
        authorRole: 'Volunteer',
        content: 'Bookmarking this to share in our college safety workshops!',
        timestamp: '18 hours ago',
      },
    ],
  },
];

export const MOCK_MENTORS: MentorProfile[] = [
  {
    id: 'mentor-1',
    name: 'Dr. Priya Deshmukh',
    title: 'Staff Engineering Lead',
    company: 'FintechGlobal',
    domain: 'Technology & Cloud Architecture',
    experience: '14 Years',
    menteesCount: 38,
    rating: 4.96,
    skills: ['React', 'System Design', 'Tech Leadership', 'Negotiation'],
    bio: 'Dedicated to helping women crack senior tech roles and bridge the tech leadership gap.',
    availableSlots: 'Tuesday & Thursday evenings',
  },
  {
    id: 'mentor-2',
    name: 'Kiran Bedi Mathur',
    title: 'Angel Investor & Founder',
    company: 'SheSparks Capital',
    domain: 'Entrepreneurship & Fundraising',
    experience: '18 Years',
    menteesCount: 45,
    rating: 4.92,
    skills: ['Pitch Decks', 'Venture Capital', 'Business Strategy', 'Financial Modeling'],
    bio: 'Invested in 22 female-founded startups. Helping women build fundable, scalable enterprises.',
    availableSlots: 'Wednesday afternoons',
  },
  {
    id: 'mentor-3',
    name: 'Geeta Ramakrishnan',
    title: 'General Counsel & Legal Advisor',
    company: 'Apex Legal Partners',
    domain: 'Corporate Law & Women Rights',
    experience: '15 Years',
    menteesCount: 29,
    rating: 4.89,
    skills: ['Contracts', 'POSH Compliance', 'IP Rights', 'Dispute Resolution'],
    bio: 'Passionate about demystifying law for women founders and executives.',
    availableSlots: 'Friday mornings',
  },
];

export const MOCK_EVENTS: PlatformEvent[] = [
  {
    id: 'event-1',
    title: 'National Women in Tech & AI Leadership Summit 2026',
    type: 'Webinar',
    date: '2026-11-15',
    time: '4:00 PM - 6:30 PM IST',
    speaker: 'Dr. Priya Deshmukh & Panelists',
    speakerRole: 'Tech Directors & AI Researchers',
    attendeesCount: 1420,
    registered: true,
    location: 'Interactive Live Virtual Stage',
    description: 'Keynotes, breakout networking pods, live resume reviews, and portfolio teardowns for female engineers.',
  },
  {
    id: 'event-2',
    title: 'Financial Independence Bootcamp: Taxes, SIPs & Mutual Funds',
    type: 'Workshop',
    date: '2026-11-20',
    time: '11:00 AM - 1:00 PM IST',
    speaker: 'Swati Agarwal, CA',
    speakerRole: 'Chartered Accountant',
    attendeesCount: 890,
    registered: false,
    location: 'Zoom + Interactive Financial Workbook',
    description: 'Hands-on budgeting calculations, setting up your demat account safely, and avoiding common financial scams.',
  },
];

export const MOCK_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Aditi Mukherjee, MD',
    specialty: 'Gynecologist',
    hospital: 'Fortis Healthcare & Women Care Clinic',
    experience: '15 Years',
    rating: 4.95,
    consultationFee: '₹700 (Subsidized)',
    languages: ['English', 'Hindi', 'Bengali'],
    availability: 'Mon - Sat (10 AM - 4 PM)',
  },
  {
    id: 'doc-2',
    name: 'Dr. Neha Saxena, DNB',
    specialty: 'Pediatrician',
    hospital: 'Apollo Cradle Hospital',
    experience: '12 Years',
    rating: 4.9,
    consultationFee: '₹650',
    languages: ['English', 'Hindi'],
    availability: 'Mon - Fri (11 AM - 5 PM)',
  },
  {
    id: 'doc-3',
    name: 'Dr. Sunanda Reddy, MBBS',
    specialty: 'General Physician',
    hospital: 'Max Super Speciality Hospital',
    experience: '10 Years',
    rating: 4.86,
    consultationFee: '₹500',
    languages: ['English', 'Telugu', 'Hindi'],
    availability: 'Daily (9 AM - 2 PM)',
  },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    doctorName: 'Dr. Aditi Mukherjee, MD',
    specialty: 'Gynecologist',
    date: '2026-11-12',
    time: '11:30 AM',
    mode: 'Video Call',
    status: 'Confirmed',
    hospital: 'Fortis Healthcare & Women Care Clinic',
  },
];

export const MOCK_HEALTH_RECORDS: HealthRecord[] = [
  {
    id: 'rec-1',
    title: 'Annual Blood Work & Thyroid Panel',
    type: 'Lab Report',
    doctor: 'Dr. Sunanda Reddy',
    date: '2026-10-14',
    fileSize: '1.4 MB (Encrypted)',
  },
  {
    id: 'rec-2',
    title: 'Gynecological Consultation & Ultrasound Summary',
    type: 'Prescription',
    doctor: 'Dr. Aditi Mukherjee',
    date: '2026-08-20',
    fileSize: '850 KB (Encrypted)',
  },
];

export const MOCK_FINANCIAL_SCHEMES: FinancialScheme[] = [
  {
    id: 'sch-1',
    name: 'Mahila Samman Savings Certificate (MSSC)',
    provider: 'Government',
    type: 'Savings Scheme',
    maxAmount: '₹2,00,000 deposit with 7.5% fixed interest',
    eligibility: ['Any Indian woman or girl child', 'Tenure of 2 years', 'Partial withdrawal allowed after 1 year'],
    benefits: 'Guaranteed high fixed return of 7.5% per annum compounded quarterly, backed by Govt of India.',
    officialLink: 'https://www.indiapost.gov.in',
  },
  {
    id: 'sch-2',
    name: 'Stand-Up India Scheme for Women Entrepreneurs',
    provider: 'Government',
    type: 'Low-Interest Loan',
    maxAmount: '₹10 Lakh to ₹1 Crore',
    eligibility: ['Women entrepreneurs aged 18+', 'Greenfield business enterprise in manufacturing, services, or trading', 'Borrower not in default to any bank'],
    benefits: 'Concessional interest rates, composite loan covering term loan and working capital, handholding support.',
    officialLink: 'https://www.standupmitra.in',
  },
  {
    id: 'sch-3',
    name: 'Pradhan Mantri Mudra Yojana (Tarun & Kishore for Women)',
    provider: 'Government',
    type: 'Low-Interest Loan',
    maxAmount: 'Up to ₹10,00,000 collateral-free',
    eligibility: ['Small women-led enterprises, artisans, food businesses, retail outlets', 'No collateral required'],
    benefits: 'Zero processing fee for Shishu/Kishore loans, Mudra debit card for working capital withdrawals.',
    officialLink: 'https://www.mudra.org.in',
  },
  {
    id: 'sch-4',
    name: 'Lakhpati Didi Initiative (Self-Help Groups)',
    provider: 'Government',
    type: 'Subsidized Training',
    maxAmount: '₹1,00,000+ sustainable annual income per household',
    eligibility: ['SHG members in rural/semi-urban areas', 'Engaged in micro-enterprises or value addition'],
    benefits: 'Skills in LED bulb assembly, plumbing, drone piloting (Namo Drone Didi), agri-processing, and market linkage.',
    officialLink: 'https://aajeevika.gov.in',
  },
];

export const MOCK_INCIDENTS: IncidentReport[] = [
  {
    id: 'inc-101',
    type: 'Cyberstalking',
    date: '2026-11-03',
    time: '21:15',
    location: 'Instagram & WhatsApp (Online)',
    description: 'Anonymous account repeatedly sending threatening voice notes and morphed photos.',
    isAnonymous: true,
    status: 'Support Assigned',
    actionTaken: 'Assigned to Cyber Legal Aid Cell; digital evidence preserved for Cyber Police 1930 portal.',
  },
  {
    id: 'inc-102',
    type: 'Stalking',
    date: '2026-10-29',
    time: '19:40',
    location: 'Near Metro Pillar 142, Sector 18',
    description: 'Individual on two-wheeler following pedestrian route. Bystander intervened after SOS alert trigger.',
    isAnonymous: false,
    status: 'Resolved',
    actionTaken: 'PCR van dispatched; local pink police booth alerted; area marked on RakshaNet safe transit map.',
  },
];

export const MOCK_SAFE_LOCATIONS: SafeLocation[] = [
  {
    id: 'loc-1',
    name: 'Sector 20 Women Police Station & 24/7 Help Desk',
    type: 'Police Station',
    address: 'Near City Center Metro, Jaipur',
    distance: '0.8 km away',
    contact: '0141-2601111 / 1091',
    openHours: '24 Hours Open (Women Officers on Duty)',
  },
  {
    id: 'loc-2',
    name: 'Raksha Pink Safety Booth & Emergency Shelter',
    type: '24/7 Women Booth',
    address: 'Platform 1 Exit, Central Railway Station',
    distance: '1.2 km away',
    contact: '112 / 181',
    openHours: '24 Hours Open (First Aid, Phone Charging & Safe Waiting)',
  },
  {
    id: 'loc-3',
    name: 'Asha Kiran Verified Women Shelter & Crisis Center',
    type: 'Verified Safe Shelter',
    address: 'Civil Lines Road, Opp. District Court',
    distance: '2.5 km away',
    contact: '0141-2223344',
    openHours: '24 Hours Open (Free Accommodation & Protection Officer)',
  },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-11-05 11:20:14',
    user: 'Sunita Verma',
    role: 'Admin',
    action: 'USER_ROLE_VERIFIED',
    details: 'Verified credentials for Mentor Dr. Priya Deshmukh',
    ip: '103.24.120.45',
    status: 'SUCCESS',
  },
  {
    id: 'log-2',
    timestamp: '2026-11-05 10:45:00',
    user: 'System Dispatcher',
    role: 'Admin',
    action: 'SOS_FALLBACK_DELIVERED',
    details: 'Emergency alert sent via SMS gateway to 3 trusted contacts',
    ip: '127.0.0.1 (Internal)',
    status: 'ALERT',
  },
  {
    id: 'log-3',
    timestamp: '2026-11-05 09:12:33',
    user: 'Ananya Sharma',
    role: 'Beneficiary',
    action: 'COURSE_LESSON_COMPLETED',
    details: 'Completed Lesson 2 of Personal Financial Literacy',
    ip: '106.51.22.8',
    status: 'SUCCESS',
  },
  {
    id: 'log-4',
    timestamp: '2026-11-04 18:30:19',
    user: 'Kavita Rao',
    role: 'Volunteer',
    action: 'INCIDENT_TRIAGED',
    details: 'Updated Incident #INC-101 status to Support Assigned',
    ip: '114.143.89.2',
    status: 'WARNING',
  },
];

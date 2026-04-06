export const heroSlides = [
  {
    id: 1,
    title: "Shape Your Future with E-Tech",
    subtitle: "Punjab's premier destination for cutting-edge technology education and career development",
    cta_text: "Explore Courses",
    cta_link: "#courses",
    badge_text: "Now Enrolling 2025-26",
    image_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1920&q=80",
  },
  {
    id: 2,
    title: "Master AI & Emerging Technologies",
    subtitle: "From Generative AI to Robotics — learn the skills that define tomorrow's careers",
    cta_text: "View AI Courses",
    cta_link: "#courses",
    badge_text: "New AI Programs",
    image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1920&q=80",
  },
  {
    id: 3,
    title: "100% Placement Assistance",
    subtitle: "Join 5000+ successful alumni working in top IT companies across India",
    cta_text: "Success Stories",
    cta_link: "#testimonials",
    badge_text: "95% Placement Rate",
    image_url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80",
  },
  {
    id: 4,
    title: "Learn Digital Marketing & Finance",
    subtitle: "Comprehensive courses in SEO, Social Media, Tally, Stock Trading, and more",
    cta_text: "Get Started",
    cta_link: "#courses",
    badge_text: "Industry Certified",
    image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&q=80",
  },
];

export const stats = [
  { id: 1, label: "Students Trained", value: 5000, icon_name: "GraduationCap" },
  { id: 2, label: "Expert Faculty", value: 25, icon_name: "Users" },
  { id: 3, label: "Courses Offered", value: 40, icon_name: "BookOpen" },
  { id: 4, label: "Years of Excellence", value: 12, icon_name: "Award" },
];

export const announcements = [
  { id: 1, title: "New Batch Starting: Generative AI Course — Enroll by June 30!", type: "urgent" as const },
  { id: 2, title: "E-Tech ranked #1 Computer Institute in Gurdaspur 2025", type: "badge" as const },
  { id: 3, title: "Free Demo Classes every Saturday — Walk in or register online", type: "news" as const },
  { id: 4, title: "Summer Internship Program 2025 — Applications Open!", type: "urgent" as const },
  { id: 5, title: "Congratulations to Batch 2024 — 95% Placement!", type: "badge" as const },
];

export type Course = {
  id: number;
  name: string;
  category: string;
  short_description: string;
  full_description: string;
  syllabus: string[];
  duration: string;
  fee: string;
  badge_label: string;
  thumbnail_url: string;
  is_featured: boolean;
};

export const courses: Course[] = [
  // CATEGORY A — AI & Emerging Tech
  {
    id: 1, name: "Generative AI Masterclass", category: "AI & Emerging Tech",
    short_description: "Master ChatGPT, Midjourney, Prompt Engineering, and AI Tools for business automation.",
    full_description: "Comprehensive course covering the entire generative AI landscape.",
    syllabus: ["Introduction to AI & Machine Learning", "ChatGPT Deep Dive & Advanced Prompting", "Midjourney & DALL-E Image Generation", "Prompt Engineering Frameworks", "AI for Content Writing", "AI for Code Generation", "AI Business Automation Tools", "Building AI Workflows with Zapier", "AI Ethics & Responsible Use", "Capstone Project: AI-Powered Business Solution"],
    duration: "3 Months", fee: "₹15,000", badge_label: "Hot",
    thumbnail_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&q=80",
    is_featured: true,
  },
  {
    id: 2, name: "Robotics & Automation", category: "AI & Emerging Tech",
    short_description: "Hands-on training with Arduino, Raspberry Pi, and sensor-based automation systems.",
    full_description: "Learn to build and program robots and automated systems.",
    syllabus: ["Introduction to Robotics", "Arduino Programming Basics", "Sensor Types & Integration", "Raspberry Pi Setup & Programming", "Motor Control & Actuators", "IoT Basics", "Line Follower Robot Project", "Obstacle Avoidance Bot", "Home Automation Project", "Final Robotics Showcase"],
    duration: "4 Months", fee: "₹18,000", badge_label: "New",
    thumbnail_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80",
    is_featured: false,
  },
  {
    id: 3, name: "Envoy Coding (AI-Assisted Dev)", category: "AI & Emerging Tech",
    short_description: "Learn AI-assisted coding with Cursor AI, GitHub Copilot, and modern dev workflows.",
    full_description: "Master the future of software development with AI pair programming.",
    syllabus: ["AI in Software Development", "Setting Up Cursor AI", "GitHub Copilot Essentials", "Prompt-Driven Development", "Code Refactoring with AI", "Testing with AI Assistance", "Full-Stack Project with AI", "Deployment Automation", "AI Code Review Practices", "Portfolio Building"],
    duration: "2 Months", fee: "₹12,000", badge_label: "",
    thumbnail_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80",
    is_featured: false,
  },
  // CATEGORY B — Digital Skills & Marketing
  {
    id: 4, name: "Digital Marketing", category: "Digital Skills & Marketing",
    short_description: "Complete SEO, SEM, Meta Ads, Google Ads, Email Marketing & Analytics training.",
    full_description: "Become a certified digital marketer with hands-on campaign experience.",
    syllabus: ["Digital Marketing Fundamentals", "SEO On-Page & Off-Page", "Google Ads (Search, Display, YouTube)", "Meta Ads Manager", "Email Marketing & Automation", "Content Marketing Strategy", "Google Analytics & Search Console", "Social Media Strategy", "Lead Generation Funnels", "Freelancing & Agency Setup", "Client Pitch & Reporting", "Capstone Campaign Project"],
    duration: "4 Months", fee: "₹20,000", badge_label: "Popular",
    thumbnail_url: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&q=80",
    is_featured: true,
  },
  {
    id: 5, name: "Content Creation", category: "Digital Skills & Marketing",
    short_description: "Create viral Reels, Shorts, YouTube content with Canva Pro and copywriting skills.",
    full_description: "Master content creation for all major platforms.",
    syllabus: ["Content Strategy & Planning", "Video Editing for Reels & Shorts", "YouTube Channel Setup & Growth", "Canva Pro Design Mastery", "Copywriting Fundamentals", "Thumbnail Design", "Podcast Creation Basics", "Content Scheduling & Analytics", "Monetization Strategies", "Personal Brand Building"],
    duration: "2 Months", fee: "₹10,000", badge_label: "",
    thumbnail_url: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&q=80",
    is_featured: false,
  },
  {
    id: 6, name: "Social Media Marketing", category: "Digital Skills & Marketing",
    short_description: "Master Instagram, LinkedIn, and X strategies for brand growth and engagement.",
    full_description: "Learn platform-specific social media strategies.",
    syllabus: ["Social Media Landscape 2025", "Instagram Growth Hacks", "LinkedIn for B2B Marketing", "X (Twitter) Strategy", "Community Building", "Influencer Marketing", "Social Listening Tools", "Analytics & ROI Tracking", "Paid Social Campaigns", "Client Management & Reporting"],
    duration: "2 Months", fee: "₹10,000", badge_label: "",
    thumbnail_url: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&q=80",
    is_featured: false,
  },
  {
    id: 7, name: "Website Designing", category: "Digital Skills & Marketing",
    short_description: "Learn Figma, WordPress, Elementor, and UI/UX design fundamentals.",
    full_description: "Design beautiful, user-friendly websites.",
    syllabus: ["UI/UX Design Principles", "Figma Interface & Tools", "Wireframing & Prototyping", "WordPress Setup & Themes", "Elementor Pro Builder", "Responsive Design", "Typography & Color Theory", "Landing Page Design", "E-commerce Design", "Portfolio Project"],
    duration: "3 Months", fee: "₹14,000", badge_label: "",
    thumbnail_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    is_featured: false,
  },
  {
    id: 8, name: "Website Development", category: "Digital Skills & Marketing",
    short_description: "HTML, CSS, JavaScript, React basics, and deployment for modern web development.",
    full_description: "Build modern websites from scratch.",
    syllabus: ["HTML5 Fundamentals", "CSS3 & Flexbox/Grid", "JavaScript ES6+", "DOM Manipulation", "React.js Basics", "Component-Based Architecture", "API Integration", "Responsive Development", "Git & Version Control", "Hosting & Deployment", "Portfolio Website Project"],
    duration: "4 Months", fee: "₹16,000", badge_label: "",
    thumbnail_url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&q=80",
    is_featured: false,
  },
  // CATEGORY C — Full Stack & Networking
  {
    id: 9, name: "Full Stack Development", category: "Full Stack & Networking",
    short_description: "MERN/MEAN stack, REST APIs, databases, and cloud deployment mastery.",
    full_description: "Become a complete full-stack developer.",
    syllabus: ["JavaScript Advanced Concepts", "Node.js & Express.js", "MongoDB & Mongoose", "React.js Advanced", "RESTful API Design", "Authentication & Authorization", "Database Design & SQL", "DevOps Basics & Docker", "Cloud Deployment (AWS/Vercel)", "Testing & Debugging", "Agile Methodology", "Capstone Full-Stack Project"],
    duration: "6 Months", fee: "₹35,000", badge_label: "Premium",
    thumbnail_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80",
    is_featured: true,
  },
  {
    id: 10, name: "Networking (CCNA)", category: "Full Stack & Networking",
    short_description: "CCNA basics, LAN/WAN setup, subnetting, and Cisco Packet Tracer labs.",
    full_description: "Master computer networking fundamentals.",
    syllabus: ["Networking Fundamentals", "OSI & TCP/IP Models", "IP Addressing & Subnetting", "Router & Switch Configuration", "VLANs & Inter-VLAN Routing", "Cisco Packet Tracer Labs", "Network Security Basics", "Wireless Networking", "Troubleshooting Methodology", "CCNA Exam Preparation"],
    duration: "3 Months", fee: "₹15,000", badge_label: "",
    thumbnail_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
    is_featured: false,
  },
  {
    id: 11, name: "Hardware Training", category: "Full Stack & Networking",
    short_description: "PC assembly, troubleshooting, component upgrades, and maintenance skills.",
    full_description: "Hands-on computer hardware training.",
    syllabus: ["Computer Components Overview", "PC Assembly Step-by-Step", "BIOS/UEFI Configuration", "OS Installation (Windows/Linux)", "Driver Installation & Updates", "Troubleshooting Common Issues", "Laptop Repair Basics", "Printer & Peripheral Setup", "Preventive Maintenance", "Certification Prep"],
    duration: "2 Months", fee: "₹10,000", badge_label: "",
    thumbnail_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
    is_featured: false,
  },
  {
    id: 12, name: "CCTV Training", category: "Full Stack & Networking",
    short_description: "Professional CCTV installation, configuration, DVR/NVR setup, and IP cameras.",
    full_description: "Become a certified CCTV installation expert.",
    syllabus: ["CCTV System Fundamentals", "Camera Types (Analog, IP, PTZ)", "DVR vs NVR Configuration", "Cable Types & Wiring", "PoE Switch Setup", "Remote Viewing Setup", "Cloud Storage Integration", "Troubleshooting & Maintenance", "Site Survey & Planning", "Live Installation Project"],
    duration: "1.5 Months", fee: "₹8,000", badge_label: "",
    thumbnail_url: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&q=80",
    is_featured: false,
  },
  // CATEGORY D — Finance & Accounting
  {
    id: 13, name: "Tally Prime Certification", category: "Finance & Accounting",
    short_description: "Complete GST, payroll, inventory management, and TDS filing with Tally Prime.",
    full_description: "Master accounting with India's most popular software.",
    syllabus: ["Tally Prime Interface", "Company Creation & Setup", "Ledger & Group Management", "Voucher Entry (Sales, Purchase, Payment)", "GST Configuration & Returns", "Inventory Management", "Payroll Processing", "TDS Filing", "Bank Reconciliation", "MIS Reports & Analysis", "Backup & Security", "Certification Exam Prep"],
    duration: "3 Months", fee: "₹12,000", badge_label: "Popular",
    thumbnail_url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80",
    is_featured: true,
  },
  {
    id: 14, name: "Busy Accounting", category: "Finance & Accounting",
    short_description: "Vouchers, GST returns, MIS reports, and complete business accounting with Busy.",
    full_description: "Professional accounting training with Busy software.",
    syllabus: ["Busy Software Interface", "Company & Master Setup", "Voucher Types & Entry", "GST Configuration", "GST Return Filing", "Purchase & Sales Management", "Inventory Tracking", "MIS Reports Generation", "Multi-Company Management", "Certification Prep"],
    duration: "2 Months", fee: "₹10,000", badge_label: "",
    thumbnail_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
    is_featured: false,
  },
  {
    id: 15, name: "Stock Market & Trading", category: "Finance & Accounting",
    short_description: "Technical analysis, chart reading, F&O basics, and live trading with Zerodha.",
    full_description: "Learn professional stock market trading.",
    syllabus: ["Stock Market Fundamentals", "Demat & Trading Account Setup", "Technical Analysis Basics", "Candlestick Patterns", "Support & Resistance", "Moving Averages & Indicators", "Futures & Options Basics", "Risk Management", "Live Trading on Zerodha", "Portfolio Building", "Trading Psychology"],
    duration: "3 Months", fee: "₹15,000", badge_label: "Trending",
    thumbnail_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80",
    is_featured: false,
  },
  // CATEGORY E — Office & Productivity
  {
    id: 16, name: "Office Automation with AI", category: "Office & Productivity",
    short_description: "MS Office + AI integration: Excel automation, PowerPoint AI, smart Word templates.",
    full_description: "Modern office skills supercharged with AI.",
    syllabus: ["MS Word Advanced + AI Writing", "Excel Formulas & AI Analytics", "PowerPoint AI Presentations", "Outlook & Email Management", "Google Workspace Integration", "AI Tools for Productivity", "Data Visualization", "Automation with Macros", "Cloud Collaboration", "Certification Prep"],
    duration: "3 Months", fee: "₹12,000", badge_label: "New",
    thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80",
    is_featured: true,
  },
  {
    id: 17, name: "Office Automation Standard", category: "Office & Productivity",
    short_description: "Complete Word, Excel, PowerPoint, Outlook, and Google Workspace training.",
    full_description: "Essential office productivity skills.",
    syllabus: ["MS Word Document Creation", "Excel Spreadsheets & Charts", "PowerPoint Presentations", "Outlook Email & Calendar", "Google Docs & Sheets", "Google Slides & Forms", "File Management", "Print & Publishing", "Typing Speed Building", "Office Certification Prep"],
    duration: "2 Months", fee: "₹8,000", badge_label: "",
    thumbnail_url: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=600&q=80",
    is_featured: false,
  },
  // CATEGORY F — Student Courses
  {
    id: 18, name: "Student Combo Pack", category: "Student Courses",
    short_description: "Basic computer + Tally + Internet + Office — tailored for school & college students.",
    full_description: "All-in-one foundation course for students.",
    syllabus: ["Computer Fundamentals", "Windows Operating System", "MS Word Basics", "MS Excel Basics", "MS PowerPoint Basics", "Internet & Email", "Basic Tally Introduction", "Google Workspace", "Typing Practice", "Digital Literacy", "Online Safety", "Certificate Exam"],
    duration: "4 Months", fee: "₹10,000", badge_label: "Best Value",
    thumbnail_url: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&q=80",
    is_featured: true,
  },
];

export const courseCategories = [
  "All",
  "AI & Emerging Tech",
  "Digital Skills & Marketing",
  "Full Stack & Networking",
  "Finance & Accounting",
  "Office & Productivity",
  "Student Courses",
];

export const testimonials = [
  {
    id: 1, student_name: "Priya Sharma", course_name: "Digital Marketing", rating: 5,
    review_text: "E-Tech completely transformed my career. The hands-on training and placement support helped me land a job at a top agency within 2 months of completing the course!",
    photo_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80", batch_year: "2024",
  },
  {
    id: 2, student_name: "Rajveer Singh", course_name: "Full Stack Development", rating: 5,
    review_text: "Best decision I ever made! The MERN stack course was comprehensive and the faculty made complex topics easy to understand. Now working as a junior developer.",
    photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80", batch_year: "2024",
  },
  {
    id: 3, student_name: "Anita Kaur", course_name: "Tally Prime", rating: 5,
    review_text: "As a commerce student, Tally Prime certification from E-Tech gave me a huge advantage. The GST module was incredibly detailed and practical.",
    photo_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80", batch_year: "2023",
  },
  {
    id: 4, student_name: "Mohit Verma", course_name: "Generative AI", rating: 4,
    review_text: "The AI course was eye-opening. I learned tools I didn't even know existed. Now I use AI daily in my freelancing work and earn 3x more than before.",
    photo_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80", batch_year: "2025",
  },
  {
    id: 5, student_name: "Simran Gill", course_name: "Office Automation with AI", rating: 5,
    review_text: "I was a complete beginner but the patient faculty at E-Tech made learning enjoyable. The AI-powered office tools section was a game changer for my productivity!",
    photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80", batch_year: "2024",
  },
  {
    id: 6, student_name: "Harpreet Kaur", course_name: "Content Creation", rating: 5,
    review_text: "After the content creation course, I started my own YouTube channel which now has 50K subscribers! E-Tech taught me everything from scripting to editing.",
    photo_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&q=80", batch_year: "2023",
  },
];

export const teamMembers = [
  { id: 1, name: "Dr. Rajesh Kumar", role: "Founder & Director", bio: "20+ years in IT Education", photo_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80", linkedin_url: "#" },
  { id: 2, name: "Pooja Mehta", role: "Head of Academics", bio: "M.Tech, AI & ML Specialist", photo_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80", linkedin_url: "#" },
  { id: 3, name: "Arjun Patel", role: "Senior Developer Trainer", bio: "Full Stack Expert, 10+ years", photo_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80", linkedin_url: "#" },
  { id: 4, name: "Neha Gupta", role: "Digital Marketing Lead", bio: "Google & Meta Certified", photo_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80", linkedin_url: "#" },
];

export const youtubeVideos = [
  { id: 1, video_id: "dQw4w9WgXcQ", title: "E-Tech Campus Tour 2025", description: "Take a virtual tour of our state-of-the-art campus", thumbnail_url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80" },
  { id: 2, video_id: "dQw4w9WgXcQ", title: "Student Success Stories", description: "Hear from our alumni about their career journeys", thumbnail_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80" },
  { id: 3, video_id: "dQw4w9WgXcQ", title: "AI Course Demo Class", description: "Free preview of our Generative AI Masterclass", thumbnail_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&q=80" },
  { id: 4, video_id: "dQw4w9WgXcQ", title: "Digital Marketing Workshop", description: "Highlights from our recent workshop on Meta Ads", thumbnail_url: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&q=80" },
  { id: 5, video_id: "dQw4w9WgXcQ", title: "Placement Drive 2024", description: "Watch our campus placement drive highlights", thumbnail_url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80" },
  { id: 6, video_id: "dQw4w9WgXcQ", title: "Robotics Lab Showcase", description: "Inside our brand new robotics & IoT lab", thumbnail_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80" },
];

export const galleryItems = [
  { id: 1, image_url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80", caption: "Classroom Session", category: "Campus" },
  { id: 2, image_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80", caption: "Group Study", category: "Students" },
  { id: 3, image_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80", caption: "Coding Lab", category: "Labs" },
  { id: 4, image_url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80", caption: "Placement Drive", category: "Events" },
  { id: 5, image_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80", caption: "Robotics Lab", category: "Labs" },
  { id: 6, image_url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80", caption: "Seminar Hall", category: "Campus" },
  { id: 7, image_url: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&q=80", caption: "Student Life", category: "Students" },
  { id: 8, image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80", caption: "Annual Day", category: "Events" },
];

export const downloads = [
  { id: 1, title: "Course Brochure 2025-26", description: "Complete guide to all courses with fees and schedules", file_url: "#", category: "Brochures", icon_name: "FileText" },
  { id: 2, title: "Admission Form", description: "Download and fill the offline admission form", file_url: "#", category: "Forms", icon_name: "FileDown" },
  { id: 3, title: "Tally Prime Syllabus", description: "Detailed syllabus for Tally Prime certification course", file_url: "#", category: "Syllabus", icon_name: "BookOpen" },
  { id: 4, title: "Digital Marketing Syllabus", description: "Complete curriculum for our Digital Marketing program", file_url: "#", category: "Syllabus", icon_name: "BookOpen" },
  { id: 5, title: "Placement Report 2024", description: "Annual placement statistics and company list", file_url: "#", category: "Reports", icon_name: "BarChart3" },
  { id: 6, title: "Fee Structure", description: "Updated fee structure for all courses", file_url: "#", category: "Brochures", icon_name: "IndianRupee" },
];

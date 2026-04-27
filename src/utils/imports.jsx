import {BookOpen, GraduationCap, User, UserCheck, Users} from "lucide-react";
import {Icons} from "../components/icons.jsx";
import {MapPin, Smartphone, DollarSign, TrendingUp, Sparkles } from 'lucide-react';

export const stakeholders = [
    {
        icon: Users,
        title: "School Administrators",
        description: "Enable school leaders with a comprehensive platform that simplifies managing the entire school ecosystem. Access real-time analytics, streamline operations, and make data-driven decisions that drive institutional excellence and continuous improvement.",
        gradient: "from-blue-600 to-blue-700",
        accentColor: "bg-blue-50",
        borderColor: "border-blue-100"
    },
    {
        icon: BookOpen,
        title: "Teachers",
        description: "Help educators reclaim valuable time and energy with intuitive tools that optimize daily tasks. From lesson planning to assessment, our platform enables teachers to focus on what truly matters, educating students and fostering academic success.",
        gradient: "from-indigo-600 to-indigo-700",
        accentColor: "bg-indigo-50",
        borderColor: "border-indigo-100"
    },
    {
        icon: GraduationCap,
        title: "Students",
        label: 'Coming Soon',
        description: "Engage learners with interactive experiences that transform education into an exciting journey. Our platform makes studying effective and enjoyable, promoting active participation and accelerating academic growth through personalized learning pathways.",
        gradient: "from-purple-600 to-purple-700",
        accentColor: "bg-purple-50",
        borderColor: "border-purple-100"
    },
    {
        icon: UserCheck,
        title: "Parents & Guardians",
        description: "Strengthen the vital school-home connection with unprecedented transparency and engagement. Stay informed about your child's academic progress, attendance, behavior, and school activities, all in one comprehensive, easy-to-use platform.",
        gradient: "from-violet-600 to-violet-700",
        accentColor: "bg-violet-50",
        borderColor: "border-violet-100"
    }
];







export const features = [
    {
        icon: Icons.service_school,
        title: 'School Management System',
        description: 'Digital tools for managing attendance, student\n' +
            'records, classes, and reporting, all in one place.',
        color: "from-blue-500 to-blue-600"
    },
    {
        icon: Icons.service_results,
        title: 'Results & Assessment Automation',
        description: 'Easily process assessments, calculate results,\n' +
            'and generate digital report cards without\n' +
            'manual work.',
        color: "from-blue-500 to-blue-600"
    },
    {
        icon: Icons.service_dashboard,
        title: 'Teacher & Student Portals',
        description: 'Simple dashboards for teachers to manage\n' +
            'classes and students to access learning\n' +
            'resources.',
        color: "from-blue-500 to-blue-600"
    },
    {
        icon: Icons.service_parent,
        title: 'Parent Communication System',
        description: 'Instant updates for parents on attendance,\n' +
            'performance, and school activities, improving\n' +
            'engagement and trust.',
        color: "from-blue-500 to-blue-600"
    },
    {
        icon: Icons.service_performance,
        title: 'Student Performance Analytics',
        description: 'Track academic growth and identify students\n' +
            'who need support early, preventing learning\n' +
            'gaps.',
        color: "from-blue-500 to-blue-600"
    },
    {
        icon: Icons.service_support,
        title: 'Onboarding & Support',
        description: 'We provide training, guidance, and continuous\n' +
            'support to ensure schools adopt technology\n' +
            'smoothly and confidently.',
        color: "from-blue-500 to-blue-600"
    },

];

export const why_choose_us_reasons = [
    {
        number: 1,
        title: 'Built for Northern Nigerian Schools',
        description: 'We understand the challenges, culture, and learning environment, and we design with that in mind.',
        spacing: "200px",
    },
    {
        number: 2,
        title: 'Simple & Easy To Use',
        description: 'No tech experience needed; our intuitive platform is designed for everyone, not tech experts.',
        spacing: "80px",
    },
    {
        number: 3,
        title: 'Affordable & Accessible',
        description: 'Flexible plans, moderate-data usage, and simple design to fit every school size, budget and expertise.',
        spacing: "",
    },
    {
        number: 4,
        title: 'Real Classroom Impact',
        description: 'Less paperwork. More teaching. Better results. Happier parents. Supported students.',
        spacing: "",
    },
    {
        number: 5,
        title: 'Local Support & Training',
        description: 'We don\'t just give you software, we accompany your school every step of the way.',
        spacing: "80px",
    },
    {
        number: 6,
        title: 'Future-Ready Education',
        description: 'We help schools prepare students for a digital world without overwhelming them with complicated tools.',
        spacing: "200px",
    },
];

export const reasons = [
    {
        icon: MapPin,
        title: "Built for Northern Nigerian Schools",
        description: "We understand the challenges, culture, and learning environment, and we design with that in mind.",
        color: "from-blue-500 to-blue-600"
    },
    {
        icon: Smartphone,
        title: "Simple & Easy To Use",
        description: "No tech experience needed; our platform is designed for teachers first, not tech experts.",
        color: "from-indigo-500 to-indigo-600"
    },
    {
        icon: DollarSign,
        title: "Affordable & Accessible",
        description: "Flexible plans, low-data usage, and mobile-first design to fit every school size and budget.",
        color: "from-purple-500 to-purple-600"
    },
    {
        icon: TrendingUp,
        title: "Real Classroom Impact",
        description: "Less paperwork. More teaching. Better results. Happier parents. Supported students.",
        color: "from-violet-500 to-violet-600"
    },
    {
        icon: Users,
        title: "Local Support & Training",
        description: "We don't just give you software, we accompany your school every step of the way.",
        color: "from-fuchsia-500 to-fuchsia-600"
    },
    {
        icon: Sparkles,
        title: "Future-Ready Education",
        description: "We help schools prepare students for a digital world without overwhelming them with complicated tools.",
        color: "from-pink-500 to-pink-600"
    }
];

export const faqs = [
    {
        question: "What is EduConnect and how does it integrate with our school?",
        answer:
            "EduConnect is a high-performance School Information System (SIS) designed to centralize academic records, attendance, and grading. It integrates via a secure cloud infrastructure, allowing administrators to manage the entire institutional in a single unified dashboard.",
    },
    {
        question: "How can I get Started with EduConnect?",
        answer:
            "To get started with using EduConnect as your school's SIS, simply schedule a demo with our team. Once a session is scheduled, our onboarding specialists will personally take you through the capabilities of the platform and assist with initial setup and configuration tailored to your institution's needs.",
    },

    {
        question: "How is student data privacy and security maintained?",
        answer:
            "We employ enterprise-grade AES-256 encryption for all data at rest and TLS 1.3 for data in transit. Access is governed by strict Role-Based Access Control (RBAC), ensuring that sensitive student information is only accessible to authorized institutional personnel and verified legal guardians.",
    },
    {
        question: "Can we migrate our existing legacy student data?",
        answer:
            "While v1 is focused on native registry initialization, comprehensive legacy data migration is a core feature of our v3 roadmap. This future update will introduce a dedicated Migration Engine for bulk synchronization of data via structured CSV/Excel imports ensuring zero data loss.",
    },
    {
        question: "Is there a limit to the number of students or staff we can register?",
        answer:
            "EduConnect is architected for scalability. Our infrastructure supports unlimited concurrent users, allowing your institution to grow without performance degradation or the need for manual server upgrades.",
    },
];

export const tutorials = [
    {
        id: 1,
        title: "What Edtech Needs To Succeed",
        thumbnail: "https://img.youtube.com/vi/MchbESmnh6w/maxresdefault.jpg",
        videoUrl: " https://www.youtube.com/watch?v=MchbESmnh6w&pp=ygURZWR0ZWNoIGluIG5pZ2VyaWE%3D",
        duration: "5:30"
    },
    {
        id: 2,
        title: "Managing Your Child's Learning Journey",
        thumbnail: "https://img.youtube.com/vi/XTdwC6XFx2w/maxresdefault.jpg",
        videoUrl: "https://www.youtube.com/watch?v=XTdwC6XFx2w&pp=ygURZWR0ZWNoIGluIG5pZ2VyaWE%3D",
        duration: "8:45"
    },
    {
        id: 3,
        title: "DAY BREAK SHOW: Education Technology",
        thumbnail: "https://img.youtube.com/vi/39CuaITruZU/maxresdefault.jpg",
        videoUrl: "https://www.youtube.com/watch?v=39CuaITruZU&pp=ygURZWR0ZWNoIGluIG5pZ2VyaWE%3D",
        duration: "6:15"
    },

];

export const navItems = [
    { key: 'home',  label: 'Home', hasDropdown: false },
    { key: 'about',  label: 'About Us', hasDropdown: false },
    { key: 'services', label: 'Services', hasDropdown: false },
    // { key: 'product',  label: 'Product', hasDropdown: false },
    { key: 'faqs',  label: 'FAQs', hasDropdown: false },
];

// Helper to get initials for avatar fallback
export const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};


export const availableSubjects = [
    "English Language",
    "English Studies",
    "Mathematics",
    "Further Mathematics",
    "Basic Science",
    "Basic Technology",
    "Basic Science and Technology",
    "Biology",
    "Chemistry",
    "Physics",
    "Agricultural Science",
    "Health Education",
    "Physical Education",
    "Physical and Health Education",
    "Computer Studies",
    "Information and Communication Technology (ICT)",
    "Data Processing",
    "Software Craft Practice",
    "Networking",
    "Social Studies",
    "Civic Education",
    "Security Education",
    "Government",
    "History",
    "Geography",
    "Economics",
    "Commerce",
    "Financial Accounting",
    "Business Studies",
    "Marketing",
    "Insurance",
    "Office Practice",
    "Tourism",
    "Literature-in-English",
    "Christian Religious Studies (CRS)",
    "Islamic Religious Studies (IRS)",
    "Arabic",
    "Visual Arts",
    "Music",
    "Theatre Arts / Drama",
    "Cultural and Creative Arts",
    "French",
    "Nigerian Languages",
    "Hausa",
    "Igbo",
    "Yoruba",
    "Pre-Vocational Studies",
    "Home Economics",
    "Entrepreneurship",
    "Technical Drawing",
    "Auto Mechanics",
    "Auto Electrical Work",
    "Building Construction",
    "Woodwork",
    "Metalwork",
    "Electrical Installation and Maintenance",
    "Electronics",
    "Welding and Fabrication",
    "Plumbing and Pipe Fitting",
    "Carpentry and Joinery",
    "Furniture Making",
    "Painting and Decoration",
    "Refrigeration and Air Conditioning",
    "GSM Repairs",
    "Catering Craft Practice",
    "Garment Making",
    "Fashion Design",
    "Leather Goods",
    "Printing Craft Practice",
    "Animal Husbandry",
    "Fisheries",
    "Photography",
    "Cosmetology",
    "Environmental Management"
];

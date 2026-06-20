import {
  BellIcon,
  BrainIcon,
  BriefcaseMedicalIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FileIcon,
  HomeIcon,
  UserIcon,
  MessageSquareIcon,
  DollarSignIcon,
  AlertCircleIcon,
  CalendarDaysIcon,
} from 'lucide-react';
import { Message } from 'react-hook-form';

export const patientSidebarLinks = [
  {
    name: 'Dashboard',
    href: '/patient/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Appointments',
    href: '/patient/appointment',
    icon: CalendarIcon,
  },
  {
    name: 'Notifications',
    href: '/patient/notification',
    icon: BellIcon,
  },
  {
    name: 'Messages',
    href: '/patient/messages',
    icon: MessageSquareIcon,
  },
  {
    name: 'Billing',
    href: '/patient/billing',
    icon: DollarSignIcon,
  },
];

export const doctorSidebarLinks = [
  {
    name: 'Dashboard',
    href: '/doctor/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Calendar',
    href: '/doctor/calendar',
    icon: CalendarDaysIcon,
  },
  {
    name: 'Appointments',
    href: '/doctor/appointment',
    icon: CalendarIcon,
  },
  {
    name: 'Notifications',
    href: '/doctor/notification',
    icon: BellIcon,
  },
  {
    name: 'Messages',
    href: '/doctor/messages',
    icon: MessageSquareIcon,
  },
];

export const VISIT_TYPE = [
  {
    name: 'Follow up',
    desc: 'Continue care for an existing condition',
    icon: BriefcaseMedicalIcon,
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-600',
    iconBgColor: 'bg-blue-600',
  },
  {
    name: 'New Concern',
    desc: 'A new symptom or health issue',
    icon: AlertCircleIcon,
    bgColor: 'bg-red-100',
    borderColor: 'border-red-600',
    iconBgColor: 'bg-red-600',
  },
  {
    name: 'Annual Physical Checkup',
    desc: 'Routine yearly health examination',
    icon: CheckCircleIcon,
    bgColor: 'bg-green-100',
    borderColor: 'border-green-600',
    iconBgColor: 'bg-green-600',
  },

  {
    name: 'Mental Health',
    desc: 'Emotional wellbeing and therapy',
    icon: BrainIcon,
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-600',
    iconBgColor: 'bg-purple-600',
  },
  {
    name: 'Specialist Referral',
    desc: 'Referred by another healthcare provider',
    icon: FileIcon,
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-600',
    iconBgColor: 'bg-yellow-600',
  },
  {
    name: 'Urgent Care',
    desc: 'Needs attention within 24 - 48 hours',
    icon: ClockIcon,
    bgColor: 'bg-red-100',
    borderColor: 'border-red-600',
    iconBgColor: 'bg-red-600',
  },
];

export const doctors = [
  {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@teleflow.ai',
    specialty: 'Cardiology',
    experience: 12,
    bio: 'Experienced cardiologist focused on preventive heart care.',
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    name: 'Dr. Michael Chen',
    email: 'michael.chen@teleflow.ai',
    specialty: 'Neurology',
    experience: 9,
    bio: 'Specialist in neurological disorders and stroke management.',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@teleflow.ai',
    specialty: 'Dermatology',
    experience: 7,
    bio: 'Focused on modern dermatological treatment and skin wellness.',
    image: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    name: 'Dr. James Wilson',
    email: 'james.wilson@teleflow.ai',
    specialty: 'General Practice',
    experience: 15,
    bio: 'Primary care physician with extensive telehealth experience.',
    image: 'https://randomuser.me/api/portraits/men/75.jpg',
  },
  {
    name: 'Dr. Sophia Patel',
    email: 'sophia.patel@teleflow.ai',
    specialty: 'Pediatrics',
    experience: 10,
    bio: 'Dedicated to pediatric care and child wellness.',
    image: 'https://randomuser.me/api/portraits/women/22.jpg',
  },
  {
    name: 'Dr. David Kim',
    email: 'david.kim@teleflow.ai',
    specialty: 'Orthopedics',
    experience: 11,
    bio: 'Orthopedic specialist focused on mobility recovery.',
    image: 'https://randomuser.me/api/portraits/men/61.jpg',
  },
  {
    name: 'Dr. Olivia Brown',
    email: 'olivia.brown@teleflow.ai',
    specialty: 'Psychiatry',
    experience: 8,
    bio: 'Mental health specialist focused on patient-centered care.',
    image: 'https://randomuser.me/api/portraits/women/39.jpg',
  },
  {
    name: 'Dr. Ethan Walker',
    email: 'ethan.walker@teleflow.ai',
    specialty: 'Endocrinology',
    experience: 13,
    bio: 'Specialized in diabetes and hormonal health management.',
    image: 'https://randomuser.me/api/portraits/men/51.jpg',
  },
  {
    name: 'Dr. Ava Thompson',
    email: 'ava.thompson@teleflow.ai',
    specialty: 'Gynecology',
    experience: 9,
    bio: 'Focused on women’s health and preventive care.',
    image: 'https://randomuser.me/api/portraits/women/56.jpg',
  },
  {
    name: 'Dr. Noah Martinez',
    email: 'noah.martinez@teleflow.ai',
    specialty: 'Pulmonology',
    experience: 14,
    bio: 'Pulmonary specialist with critical care expertise.',
    image: 'https://randomuser.me/api/portraits/men/45.jpg',
  },
];

export interface Employee {
  id?: number;
  fullName: string;
  motherName: string;
  employeeId: string;
  phone: string;
  appointmentDate: string;
  certificate: string;
  specialization: string;
  jobTitle: string;
  nationalIdNumber?: string;
  rationCardNumber?: string;
  residenceCardNumber?: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  spouseName?: string;
  spouseNationalId?: string;
  childrenCount: number;
  childrenDetails?: { name: string; nationalId: string; birthDate: string }[];
  residenceProvince: string;
  residenceDistrict: string;
  station: string;
  section: string;
  images: {
    nationalIdFront?: string;
    nationalIdBack?: string;
    rationCardFront?: string;
    rationCardBack?: string;
    residenceCardFront?: string;
    residenceCardBack?: string;
    spouseIdFront?: string;
    spouseIdBack?: string;
    childrenIds?: string[];
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type UserRole = 'admin' | 'manager';

export interface AppUser {
  uid: string;
  username: string;
  role: UserRole;
  stationName?: string;
  email?: string;
}

export const IRAQ_PROVINCES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "النجف", "كربلاء", "ذي قار", "بابل", 
  "الأنبار", "ديالى", "كركوك", "صلاح الدين", "المثنى", "ميسان", "القادسية", 
  "دهوك", "السليمانية", "واسط"
];

export const STATIONS = [
  "مقر الشركة",
  "محطة رادار مطار النجف",
  "محطة رادار مطار الموصل",
  "محطة رادار مطار البصرة",
  "محطة رادار مطار كركوك",
  "محطة رادار مطار الناصرية",
  "محطة رادار مطار كربلاء"
];

export const CERTIFICATES = [
  "دكتوراه", "ماجستير", "دبلوم عالي", "بكالوريوس", "دبلوم", "إعدادية", "متوسطة", "ابتدائية", "يقرأ ويكتب"
];

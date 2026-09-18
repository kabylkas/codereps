export interface Course {
  id: string;
  title: string;
  description: string | null;
  language: string;
  join_code: string;
  owner_id: string;
  is_active: boolean;
  created_at: string;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  role: string;
  enrolled_at: string;
}

export interface CourseCreate {
  title: string;
  description?: string;
  language: string;
}

export interface CourseUpdate {
  title?: string;
  description?: string;
  language?: string;
}

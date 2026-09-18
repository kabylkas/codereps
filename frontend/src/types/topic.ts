export interface Topic {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

export interface TopicCreate {
  name: string;
  description?: string;
  order_index?: number;
}

export interface TopicUpdate {
  name?: string;
  description?: string;
  order_index?: number;
}

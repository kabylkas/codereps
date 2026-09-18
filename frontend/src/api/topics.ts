import client from "./client";
import type { Topic, TopicCreate, TopicUpdate } from "../types/topic";

export async function getTopics(courseId: string): Promise<Topic[]> {
  const res = await client.get(`/courses/${courseId}/topics`);
  return res.data;
}

export async function createTopic(courseId: string, data: TopicCreate): Promise<Topic> {
  const res = await client.post(`/courses/${courseId}/topics`, data);
  return res.data;
}

export async function updateTopic(courseId: string, topicId: string, data: TopicUpdate): Promise<Topic> {
  const res = await client.patch(`/courses/${courseId}/topics/${topicId}`, data);
  return res.data;
}

export async function deleteTopic(courseId: string, topicId: string): Promise<void> {
  await client.delete(`/courses/${courseId}/topics/${topicId}`);
}

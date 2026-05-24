import { api } from './client';
import type { Reply } from '@/types';

export async function fetchReplies(noteId: string): Promise<{ replies: Reply[] }> {
  return api.get(`/replies/${noteId}`);
}

export async function createReply(
  noteId: string,
  content?: string,
  voiceKey?: string,
  parentId?: string
): Promise<Reply> {
  return api.post(`/replies/${noteId}`, {
    content,
    voiceKey,
    parentId,
  });
}

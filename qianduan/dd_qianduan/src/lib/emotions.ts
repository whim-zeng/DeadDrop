export type EmotionId = "sadness" | "anxiety" | "loss" | "joy" | "anger" | "calm";
export type EmotionType = EmotionId;

export type Emotion = {
  id: EmotionId;
  label: string;
  color: string;
  glowColor: string;
  mapHint: string;
  bodySuggestions: string[];
};

export const emotions: Emotion[] = [
  {
    id: "sadness",
    label: "悲伤",
    color: "#6B7AA1",
    glowColor: "rgba(107, 122, 161, 0.4)",
    mapHint: "有人在这里留下了一点悲伤",
    bodySuggestions: ["眼眶发酸", "胸口闷闷的", "喉咙像堵着什么", "肩膀很沉", "想蜷起来", "呼吸变浅了"],
  },
  {
    id: "anxiety",
    label: "焦虑",
    color: "#C4956A",
    glowColor: "rgba(196, 149, 106, 0.4)",
    mapHint: "有人在这里留下了一点焦虑",
    bodySuggestions: ["心跳加速", "手心出汗", "胃在翻搅", "肌肉紧绷", "坐立不安", "呼吸急促"],
  },
  {
    id: "loss",
    label: "失落",
    color: "#8B8589",
    glowColor: "rgba(139, 133, 137, 0.4)",
    mapHint: "有人在这里留下了一点失落",
    bodySuggestions: ["身体发空", "四肢发软", "像漂浮着", "没有着力点", "胸口凉凉的"],
  },
  {
    id: "joy",
    label: "开心",
    color: "#A8B5A2",
    glowColor: "rgba(168, 181, 162, 0.4)",
    mapHint: "有人在这里留下了一点开心",
    bodySuggestions: ["嘴角上扬", "胸口暖暖的", "身体轻盈", "想要深呼吸", "指尖发麻"],
  },
  {
    id: "anger",
    label: "愤怒",
    color: "#B85C5C",
    glowColor: "rgba(184, 92, 92, 0.4)",
    mapHint: "有人在这里留下了一点愤怒",
    bodySuggestions: ["太阳穴胀痛", "下巴咬紧", "拳头握紧", "胸口发烫", "呼吸粗重", "肌肉发硬"],
  },
  {
    id: "calm",
    label: "平静",
    color: "#7BA7A7",
    glowColor: "rgba(123, 167, 167, 0.4)",
    mapHint: "有人在这里留下了一点平静",
    bodySuggestions: ["呼吸很慢", "肩膀松了", "手心温热", "身体很沉但不重", "像泡在温水里"],
  },
];

export const emotionById = emotions.reduce<Record<EmotionId, Emotion>>(
  (indexedEmotions, emotion) => {
    indexedEmotions[emotion.id] = emotion;
    return indexedEmotions;
  },
  {} as Record<EmotionId, Emotion>,
);

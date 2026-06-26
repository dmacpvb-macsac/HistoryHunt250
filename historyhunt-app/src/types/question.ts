export type Question = {
  lyric: string;
  question: string;
  choices: string[];
  answer: string;
  fact: string;
  lyricMeaning: string;
  bonus?: boolean;
  points?: number;
  youtubePrompt?: string;
};
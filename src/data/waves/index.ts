import wave1 from './wave-1.json';
import wave2 from './wave-2.json';
import wave3 from './wave-3.json';
import wave4 from './wave-4.json';
import wave5 from './wave-5.json';
import wave6 from './wave-6.json';
import wave7 from './wave-7.json';

export type WaveContributor = {
  handle: string;
  role: string;
  prs: number;
  optedIn: boolean;
};

export type WaveStatus = 'completed' | 'open' | 'upcoming';

export type Wave = {
  number: number;
  title: string;
  status: WaveStatus;
  startDate: string | null;
  endDate: string | null;
  budget: string;
  budgetToken: string;
  goals: string[];
  highlights: string[];
  summary: string;
  prsmerged: number;
  contributors: WaveContributor[];
  issuesUrl?: string;
  winnersNote: string | null;
};

export const waves: Wave[] = [wave1, wave2, wave3, wave4, wave5, wave6, wave7] as Wave[];

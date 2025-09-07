export interface BountyQuestion {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  isSolved: boolean;
  points?: number;
}
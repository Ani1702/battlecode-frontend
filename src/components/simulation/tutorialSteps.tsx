export interface TutorialStep {
  title: string;
  body: string;
  hint?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Eliminate the bot",
    body: "You and the opponent each control one bot on a tactical grid. Reduce the enemy to 0 lives before you are eliminated.",
  },
  {
    title: "MOVE",
    body: "Each cycle, submit one instruction. MOVE(UP|DOWN|LEFT|RIGHT) moves your bot one cell.",
    hint: "MOVE(UP)",
  },
  {
    title: "ATTACK",
    body: "ATTACK fires a beam along an entire row or column until it hits a wall. It can hit the bot on that line.",
    hint: "ATTACK(RIGHT)",
  },
  {
    title: "SHIELD",
    body: "SHIELD() blocks beam damage for that cycle. Both bots act at the same time.",
    hint: "SHIELD()",
  },
  {
    title: "Simultaneous turns",
    body: "You and the opponent submit one line each cycle. They resolve together — plan for what the bot might do next.",
  },
  {
    title: "Type your commands",
    body: "Type a full command like MOVE(LEFT) — suggestions only show moves you can actually make. Tab to accept, Enter to submit. You have 2 attempts if you lose.",
    hint: "MOVE(LEFT)",
  },
];

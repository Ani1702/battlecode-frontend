"use client"
import RulesPage from "@/components/shared/RulesPage";
import { useParams } from "next/navigation";

export default function Rules() {
    const params = useParams();
    const round = params.round || "2";
    const rules = [" At the start, everyone is assigned a role: Elite or Challenger.",
        " Elites defend themselves when challenged.",
        " Challengers can challenge Elites to 1-on-1 matches.",
" While waiting, both Elites and Challengers can solve bounty problems (optional side quests).",
" Winning a challenge or completing a bounty increases your score.",
" After each challenge, both players go into a 60 seconds cooldown before they can play again.",
" If someone disconnects during a match and doesn’t return, they lose by default."
    ];
    return <RulesPage rules={rules} round={round} />;
}
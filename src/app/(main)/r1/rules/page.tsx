"use client"

import RulesPage from "@/components/shared/RulesPage";
import { useParams } from "next/navigation";

export default function Rules() {
    const params = useParams();
    const round = params.round || "1";
    const rules = [
        "Winning grants you more points on the leaderboard.",
        "Winning grants you more points on the leaderboard.", 
        "Winning grants you more points on the leaderboard."
    ];
    return <RulesPage rules={rules} round={round} />;
}
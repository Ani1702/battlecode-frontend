"use client"
import RulesPage from "@/components/shared/RulesPage";
import { useParams } from "next/navigation";

export default function Rules() {
    const params = useParams();
    const round = params.round || "0";
    const rules = [
        "Winning grants you more points on the leaderboard.",
        "Winning grants you more points on the leaderboard.", 
        "Winning grants you more points on the leaderboard."
    ];
    return (
        <>
            <head>
                <link rel="preload" as="image" href="/rule.svg" type="image/svg+xml" />

            </head>
            <RulesPage rules={rules} round={round} />;
        </>
    );
}
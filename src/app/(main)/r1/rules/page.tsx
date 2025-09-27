"use client"

import RulesPage from "@/components/shared/RulesPage";
import { useParams } from "next/navigation";

export default function Rules() {
    const params = useParams();
    const round = params.round || "1";
const rules = [
    "This round lasts 90 minutes.",
    "Players are matched 1-on-1 based on performance in Round 0.",
    "Each match is a race: the first to solve the problem correctly wins.",
    "There will be a cooldown time of 30 seconds after every match.",
    "Matches continue until the global timer runs out."
];

    return <RulesPage rules={rules} round={round} />;
}
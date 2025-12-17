// "use client"
// import RulesPage from "@/components/shared/RulesPage";
// import { useParams } from "next/navigation";

// export default function Rules() {
//     const params = useParams();
//     const round = params.round || "0";
// const rules = [
//     "Everyone joins the lobby and waits for the round to start.",
//     "The admin will start the round when everyone is ready.",
//     "You’ll see a set of warm-up questions to solve in order.",
//     "Your progress and time are tracked automatically.",
//     "If you disconnect, you can rejoin and continue where you left off.",
//     "When the timer runs out, the round ends for everyone.",
//     "You cannot go back to the previous question",
    
// ];

//     return (
//         <>
//             <RulesPage rules={rules} round={round} />
//         </>
//     );
// }
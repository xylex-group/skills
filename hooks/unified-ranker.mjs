// hooks/src/unified-ranker.mts
import { createLogger } from "./logger.mjs";

var log = createLogger();
var MATCH_POINTS = 10;
var LEXICAL_MULTIPLIER = 1.35;
function rankSkills(candidates) {
  const ranked = candidates
    .map(
      ({
        skill,
        pathMatch = false,
        commandMatch = false,
        importMatch = false,
        profilerBoost = 0,
        promptScore = 0,
        lexicalScore = 0,
        basePriority = 5,
      }) => {
        const breakdown = {
          commandPoints: commandMatch ? MATCH_POINTS : 0,
          importPoints: importMatch ? MATCH_POINTS : 0,
          lexicalPoints: lexicalScore * LEXICAL_MULTIPLIER,
          pathPoints: pathMatch ? MATCH_POINTS : 0,
          priorityPoints: basePriority,
          profilerPoints: profilerBoost,
          promptPoints: promptScore,
        };
        return {
          breakdown,
          finalScore: Object.values(breakdown).reduce(
            (sum, points) => sum + points,
            0
          ),
          skill,
        };
      }
    )
    .sort(
      (a, b) => b.finalScore - a.finalScore || a.skill.localeCompare(b.skill)
    );
  log.debug("unified-ranker-ranked", {
    candidateCount: candidates.length,
    rankedSkills: ranked.map(({ skill, finalScore }) => ({
      finalScore,
      skill,
    })),
  });
  return ranked;
}

export { rankSkills };

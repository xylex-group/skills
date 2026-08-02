import { createLogger, type Logger } from "./logger.mjs";

const log: Logger = createLogger();
const MATCH_POINTS = 10;
const LEXICAL_MULTIPLIER = 1.35;

export interface RankedCandidate {
  basePriority?: number;
  commandMatch?: boolean;
  importMatch?: boolean;
  lexicalScore?: number;
  pathMatch?: boolean;
  profilerBoost?: number;
  promptScore?: number;
  skill: string;
}

export interface RankedSkill {
  breakdown: {
    pathPoints: number;
    commandPoints: number;
    importPoints: number;
    profilerPoints: number;
    promptPoints: number;
    lexicalPoints: number;
    priorityPoints: number;
  };
  finalScore: number;
  skill: string;
}

export function rankSkills(candidates: RankedCandidate[]): RankedSkill[] {
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

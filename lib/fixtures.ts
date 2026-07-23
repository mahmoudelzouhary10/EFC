/**
 * Circle-method round robin. Given N team ids, returns N-1 rounds,
 * each an array of [homeId, awayId] pairs, alternating home advantage
 * as fairly as possible across rounds.
 */
function circleMethod(teamIds: string[]): [string, string][][] {
  let ids = [...teamIds];
  const n = ids.length;
  const rounds: [string, string][][] = [];

  for (let r = 0; r < n - 1; r++) {
    const roundPairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i];
      const b = ids[n - 1 - i];
      roundPairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(roundPairs);
    ids = [ids[0], ids[n - 1], ...ids.slice(1, n - 1)];
  }
  return rounds;
}

export type FixtureDraft = {
  matchday: number;
  home_clan_id: string;
  away_clan_id: string;
};

/**
 * Generates a full fixture list for a division.
 * @param clanIds exactly 10 clan ids
 * @param doubleRound true = home & away (18 matchdays), false = single (9 matchdays)
 */
export function generateFixtures(clanIds: string[], doubleRound: boolean): FixtureDraft[] {
  const rounds = circleMethod(clanIds);
  const drafts: FixtureDraft[] = [];
  let matchday = 1;

  rounds.forEach((round) => {
    round.forEach(([home, away]) => {
      drafts.push({ matchday, home_clan_id: home, away_clan_id: away });
    });
    matchday++;
  });

  if (doubleRound) {
    rounds.forEach((round) => {
      round.forEach(([home, away]) => {
        drafts.push({ matchday, home_clan_id: away, away_clan_id: home });
      });
      matchday++;
    });
  }

  return drafts;
}

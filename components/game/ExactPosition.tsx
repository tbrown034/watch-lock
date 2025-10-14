'use client';

import { MlbMeta, NflMeta } from '@/lib/position';

interface ExactPositionProps {
  position: MlbMeta | NflMeta;
  onChange: (position: MlbMeta | NflMeta) => void;
  awayTeam: string;
  homeTeam: string;
}

export function ExactPosition({ position, onChange, awayTeam, homeTeam }: ExactPositionProps) {
  const awayAbbr = awayTeam.split(' ').pop()?.slice(0, 3).toUpperCase() || 'AWY';
  const homeAbbr = homeTeam.split(' ').pop()?.slice(0, 3).toUpperCase() || 'HOM';

  // Detect sport
  const isNfl = position.sport === 'nfl';
  const isMlb = position.sport === 'mlb';

  if (isNfl) {
    const nflPos = position as NflMeta;
    return (
      <div className="space-y-3">
        {/* Phase */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Phase</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['PREGAME', 'Q1', 'POSTGAME'] as const).map((phase) => (
              <button
                key={phase}
                onClick={() => onChange({ ...nflPos, phase })}
                className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                  nflPos.phase === phase
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                }`}
              >
                {phase === 'PREGAME' ? 'Pregame' : phase === 'POSTGAME' ? 'Postgame' : 'In Progress'}
              </button>
            ))}
          </div>
        </div>

        {/* In-Game controls */}
        {nflPos.phase !== 'PREGAME' && nflPos.phase !== 'POSTGAME' && (
          <>
            {/* Quarter & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Quarter</label>
                <select
                  value={nflPos.quarter}
                  onChange={(e) => onChange({ ...nflPos, quarter: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                  <option value={5}>OT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Time</label>
                <input
                  type="text"
                  value={nflPos.time}
                  onChange={(e) => onChange({ ...nflPos, time: e.target.value })}
                  placeholder="15:00"
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Possession */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Possession</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['away', 'home', null] as const).map((poss) => (
                  <button
                    key={poss || 'none'}
                    onClick={() => onChange({ ...nflPos, possession: poss })}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                      nflPos.possession === poss
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {poss === 'away' ? awayAbbr : poss === 'home' ? homeAbbr : 'None'}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // MLB controls
  const mlbPos = position as MlbMeta;
  return (
    <div className="space-y-3">
      {/* Phase */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Phase</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['PREGAME', 'IN_GAME', 'POSTGAME'] as const).map((phase) => (
            <button
              key={phase}
              onClick={() => onChange({ ...mlbPos, phase })}
              className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                mlbPos.phase === phase
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
              }`}
            >
              {phase === 'PREGAME' ? 'Pregame' : phase === 'POSTGAME' ? 'Postgame' : 'In Progress'}
            </button>
          ))}
        </div>
      </div>

      {/* In-Game controls (only show when IN_GAME) */}
      {mlbPos.phase === 'IN_GAME' && (
        <>
          {/* Inning & Half */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Inning</label>
              <select
                value={mlbPos.inning}
                onChange={(e) => onChange({ ...mlbPos, inning: Number(e.target.value) })}
                className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map(inning => (
                  <option key={inning} value={inning}>{inning}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Half</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['TOP', 'BOTTOM'] as const).map((half) => (
                  <button
                    key={half}
                    onClick={() => onChange({ ...mlbPos, half })}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                      mlbPos.half === half
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {half === 'TOP' ? '↑' : '↓'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Outs */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Outs</label>
            <div className="grid grid-cols-4 gap-1.5">
              {([0, 1, 2, 'END'] as const).map((outs) => (
                <button
                  key={outs}
                  onClick={() => onChange({ ...mlbPos, outs })}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                    mlbPos.outs === outs
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {outs === 'END' ? 'End' : outs}
                </button>
              ))}
            </div>
          </div>

          {/* At Bat */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              At Bat <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={mlbPos.batter || ''}
              onChange={(e) => onChange({ ...mlbPos, batter: e.target.value || undefined })}
              placeholder="e.g. Shohei Ohtani"
              className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Poll } from '../types';
import {
  BarChart3,
  CheckCircle2,
  PieChart as PieChartIcon,
  TrendingUp,
  Award,
  Vote,
  RotateCcw,
  Sparkles,
  LayoutList,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { sfx } from '../services/soundEffects';

interface ArticlePollProps {
  articleId: string;
  poll?: Poll;
  onOpenAuth?: () => void;
}

const NEON_COLORS = [
  '#00f3ff', // Neon Cyan
  '#ff007f', // Neon Magenta
  '#00ff9d', // Neon Emerald
  '#ffb800', // Neon Amber
  '#a855f7', // Neon Violet
];

// Custom Cyber Tooltip for Recharts
const CustomCyberTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-[#050811]/95 border border-cyan-400/60 p-2.5 rounded-xl shadow-[0_0_15px_rgba(0,243,255,0.4)] font-mono text-xs">
        <p className="font-bold text-slate-100">{item.fullName || item.name}</p>
        <p className="text-cyan-300 font-black mt-1">
          {item.votes} votes <span className="text-slate-400">({item.percentage}%)</span>
        </p>
      </div>
    );
  }
  return null;
};

export const ArticlePoll: React.FC<ArticlePollProps> = ({
  articleId,
  poll: propPoll,
  onOpenAuth,
}) => {
  const { isAuthenticated } = useAuth();
  const storageKey = `purge_info_poll_voted_${articleId}`;

  // Default fallback poll if none provided on the article
  const initialPoll: Poll = propPoll || {
    id: `poll-${articleId}`,
    articleId,
    question: 'Que pensez-vous des mesures et enjeux analysés dans cet article ?',
    options: [
      { id: 'opt-1', text: 'Très favorable, une avancée majeure', votes: 164 },
      { id: 'opt-2', text: 'Mitigé, des garanties strictes sont requises', votes: 98 },
      { id: 'opt-3', text: 'Défavorable ou prématuré dans le contexte', votes: 38 },
    ],
    totalVotes: 300,
  };

  const [poll, setPoll] = useState<Poll>(initialPoll);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [chartView, setChartView] = useState<'list' | 'bar' | 'pie'>('list');

  useEffect(() => {
    const savedVote = localStorage.getItem(storageKey);
    if (savedVote) {
      setSelectedOption(savedVote);
      setHasVoted(true);
    }
  }, [storageKey]);

  const handleVote = (optionId: string) => {
    if (hasVoted) return;

    sfx.playVote();

    const updatedOptions = poll.options.map((opt) => {
      if (opt.id === optionId) {
        return { ...opt, votes: opt.votes + 1 };
      }
      return opt;
    });

    const newTotal = poll.totalVotes + 1;
    setPoll({
      ...poll,
      options: updatedOptions,
      totalVotes: newTotal,
      userVotedOptionId: optionId,
    });
    setSelectedOption(optionId);
    setHasVoted(true);
    localStorage.setItem(storageKey, optionId);
  };

  // Recharts formatted dataset
  const chartData = poll.options.map((opt, idx) => {
    const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
    return {
      id: opt.id,
      name: opt.text.length > 26 ? opt.text.substring(0, 24) + '...' : opt.text,
      fullName: opt.text,
      votes: opt.votes,
      percentage: pct,
      fill: NEON_COLORS[idx % NEON_COLORS.length],
    };
  });

  // Calculate leading option
  const leadingOption = [...poll.options].sort((a, b) => b.votes - a.votes)[0];
  const leadingPercentage =
    poll.totalVotes > 0 ? Math.round((leadingOption.votes / poll.totalVotes) * 100) : 0;

  return (
    <div
      id={`article-poll-${articleId}`}
      className="w-full my-6 p-4 sm:p-6 rounded-2xl bg-[#070b16]/95 border border-cyan-500/40 shadow-[0_0_30px_rgba(0,243,255,0.1)] font-mono transition-all"
    >
      {/* Poll Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.3)]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <span>Sondage & Baromètre d'Opinion</span>
            <span className="block text-[10px] text-cyan-400/60 font-normal">
              CONSENSUS CITOYEN EN TEMPS RÉEL
            </span>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-[#03060c] p-1 rounded-xl border border-cyan-500/30 text-xs">
          <button
            type="button"
            onClick={() => {
              sfx.playMechanicalClick();
              setChartView('list');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
              chartView === 'list'
                ? 'bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-400/50 shadow-[0_0_8px_rgba(0,243,255,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Affichage Liste / Vote"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Options</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playMechanicalClick();
              setChartView('bar');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
              chartView === 'bar'
                ? 'bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-400/50 shadow-[0_0_8px_rgba(0,243,255,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Graphique en Barres Néon (Recharts)"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Barres Néon</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.playMechanicalClick();
              setChartView('pie');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
              chartView === 'pie'
                ? 'bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-400/50 shadow-[0_0_8px_rgba(0,243,255,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Diagramme Circulaire Néon (Recharts)"
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Donut</span>
          </button>
        </div>
      </div>

      {/* Question */}
      <h4 className="text-sm sm:text-base font-bold text-slate-100 mb-4 leading-snug font-sans">
        {poll.question}
      </h4>

      {/* VIEW 1: INTERACTIVE LIST & VOTING */}
      {chartView === 'list' && (
        <div className="space-y-2.5">
          {poll.options.map((option, index) => {
            const percentage =
              poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
            const isChosen = selectedOption === option.id;
            const neonColor = NEON_COLORS[index % NEON_COLORS.length];

            return (
              <button
                key={option.id}
                type="button"
                disabled={hasVoted}
                onClick={() => handleVote(option.id)}
                className={`w-full relative overflow-hidden text-left p-3 rounded-xl border transition-all cursor-pointer group ${
                  hasVoted
                    ? isChosen
                      ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(0,243,255,0.25)]'
                      : 'border-cyan-500/20 bg-[#040812]/80 opacity-90'
                    : 'border-cyan-500/30 hover:border-cyan-400 bg-[#040812] hover:bg-cyan-950/30 hover:shadow-[0_0_15px_rgba(0,243,255,0.2)]'
                }`}
              >
                {/* Glowing neon progress fill behind text */}
                {hasVoted && (
                  <div
                    className="absolute top-0 bottom-0 left-0 transition-all duration-700 ease-out opacity-25"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: neonColor,
                      boxShadow: `0 0 15px ${neonColor}`,
                    }}
                  />
                )}

                <div className="relative flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isChosen
                          ? 'border-cyan-300 bg-cyan-400 text-black shadow-[0_0_10px_#00f3ff]'
                          : 'border-cyan-500/40 bg-transparent group-hover:border-cyan-300'
                      }`}
                    >
                      {isChosen && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </span>
                    <span
                      className={`font-medium font-sans ${
                        isChosen ? 'text-cyan-200 font-bold' : 'text-slate-200'
                      }`}
                    >
                      {option.text}
                    </span>
                  </div>

                  {hasVoted && (
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-slate-400 text-[11px] hidden sm:inline">
                        {option.votes} vote{option.votes > 1 ? 's' : ''}
                      </span>
                      <span
                        className="font-black text-sm px-2 py-0.5 rounded bg-[#02050b] border border-cyan-500/30"
                        style={{ color: neonColor }}
                      >
                        {percentage}%
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* VIEW 2: DYNAMIC RECHARTS BAR CHART */}
      {chartView === 'bar' && (
        <div className="p-3 bg-[#03060c] rounded-xl border border-cyan-500/30 space-y-3">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} unit="%" stroke="#38bdf8" fontSize={11} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#38bdf8"
                  fontSize={10}
                  width={120}
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip content={<CustomCyberTooltip />} />
                <Bar
                  dataKey="percentage"
                  radius={[0, 8, 8, 0]}
                  animationDuration={900}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      style={{ filter: `drop-shadow(0 0 6px ${entry.fill})` }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* VIEW 3: DYNAMIC RECHARTS PIE / DONUT CHART */}
      {chartView === 'pie' && (
        <div className="p-3 bg-[#03060c] rounded-xl border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="h-52 w-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomCyberTooltip />} />
                <Pie
                  data={chartData}
                  dataKey="percentage"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-pie-${index}`}
                      fill={entry.fill}
                      stroke="#0b0e1a"
                      strokeWidth={2}
                      style={{ filter: `drop-shadow(0 0 8px ${entry.fill})` }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2 w-full text-xs">
            {chartData.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-[#08121f] border border-cyan-500/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.fill, boxShadow: `0 0 6px ${item.fill}` }}
                  />
                  <span className="font-medium text-slate-200 truncate">{item.fullName}</span>
                </div>
                <span className="font-bold font-mono ml-2 shrink-0" style={{ color: item.fill }}>
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Telemetry Summary Barometer */}
      <div className="mt-4 pt-3 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 text-xs text-cyan-400/80">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>
            Tendance :{' '}
            <strong className="text-cyan-200">{leadingPercentage}%</strong> pour "
            {leadingOption?.text.substring(0, 32)}..."
          </span>
        </div>

        <div className="flex items-center gap-3 font-bold">
          <span className="text-slate-400">Total : {poll.totalVotes} votants</span>
          {hasVoted ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Votre vote est comptabilisé
            </span>
          ) : (
            <span className="text-cyan-300 animate-pulse flex items-center gap-1">
              <Vote className="w-3 h-3" /> Vote ouvert
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

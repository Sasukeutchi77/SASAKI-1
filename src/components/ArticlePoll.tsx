import React, { useState, useEffect } from 'react';
import { Poll } from '../types';
import { BarChart3, CheckCircle2, Vote, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ArticlePollProps {
  articleId: string;
  poll?: Poll;
  onOpenAuth?: () => void;
}

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
      { id: 'opt-1', text: 'Très favorable, une avancée nécessaire', votes: 142 },
      { id: 'opt-2', text: 'Mitigé, des garanties supplémentaires sont requises', votes: 87 },
      { id: 'opt-3', text: 'Défavorable ou prématuré dans le contexte actuel', votes: 34 },
    ],
    totalVotes: 263,
  };

  const [poll, setPoll] = useState<Poll>(initialPoll);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  useEffect(() => {
    const savedVote = localStorage.getItem(storageKey);
    if (savedVote) {
      setSelectedOption(savedVote);
      setHasVoted(true);
    }
  }, [storageKey]);

  const handleVote = (optionId: string) => {
    if (hasVoted) return;

    if (!isAuthenticated && onOpenAuth) {
      // Allow voting even as anonymous reader with local storage, but note it
    }

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

  const colors = [
    'from-cyan-400 to-blue-500',
    'from-fuchsia-400 to-pink-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
  ];

  return (
    <div className="w-full my-6 p-4 sm:p-5 rounded-2xl bg-[#0b0e1a]/95 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,243,255,0.08)]">
      {/* Poll Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
          <BarChart3 className="w-4 h-4 text-cyan-300" />
          <span>Sondage & Baromètre d'Opinion</span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400/70 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
          {poll.totalVotes} votes enregistrés
        </span>
      </div>

      <h4 className="text-sm sm:text-base font-bold text-slate-100 mb-4 leading-snug">
        {poll.question}
      </h4>

      {/* Options */}
      <div className="space-y-2.5">
        {poll.options.map((option, index) => {
          const percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
          const isChosen = selectedOption === option.id;
          const gradientColor = colors[index % colors.length];

          return (
            <button
              key={option.id}
              type="button"
              disabled={hasVoted}
              onClick={() => handleVote(option.id)}
              className={`w-full relative overflow-hidden text-left p-3 rounded-xl border transition-all cursor-pointer ${
                hasVoted
                  ? isChosen
                    ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(0,243,255,0.2)]'
                    : 'border-cyan-500/20 bg-[#07080f]/80 opacity-90'
                  : 'border-cyan-500/30 hover:border-cyan-400 bg-[#07080f] hover:bg-cyan-950/30 hover:shadow-[0_0_12px_rgba(0,243,255,0.15)]'
              }`}
            >
              {/* Animated progress bar fill behind the text when voted */}
              {hasVoted && (
                <div
                  className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${gradientColor} opacity-20 transition-all duration-700 ease-out`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isChosen
                        ? 'border-cyan-300 bg-cyan-400 text-black shadow-[0_0_8px_#00f3ff]'
                        : 'border-cyan-500/40 bg-transparent'
                    }`}
                  >
                    {isChosen && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </span>
                  <span className={`font-medium ${isChosen ? 'text-cyan-200 font-bold' : 'text-slate-200'}`}>
                    {option.text}
                  </span>
                </div>

                {hasVoted && (
                  <div className="shrink-0 flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-slate-100">{percentage}%</span>
                    <span className="text-[10px] text-cyan-400/60 hidden sm:inline">({option.votes})</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-cyan-400/60 pt-2 border-t border-cyan-500/15">
        <span>
          {hasVoted ? '✓ Votre avis a été pris en compte' : 'Cliquez sur une option pour exprimer votre avis'}
        </span>
        <span className="flex items-center gap-1 text-cyan-300">
          <Sparkles className="w-3 h-3" /> purge-info baromètre
        </span>
      </div>
    </div>
  );
};

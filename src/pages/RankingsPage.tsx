import React from 'react';
import { RankingsModal } from '../components/RankingsModal';
import { Article } from '../types';

interface RankingsPageProps {
  onBack: () => void;
  onOpenArticle: (article: Article | string) => void;
  onOpenProfile: (userId: string) => void;
  onOpenMediaHouses?: () => void;
  onOpenAuth: () => void;
  initialTab?: 'houses' | 'journalists' | 'articles';
}

export const RankingsPage: React.FC<RankingsPageProps> = ({
  onBack,
  onOpenArticle,
  onOpenProfile,
  onOpenMediaHouses,
  onOpenAuth,
  initialTab = 'houses',
}) => {
  return (
    <RankingsModal
      isOpen={true}
      isPage={true}
      onClose={onBack}
      onOpenArticle={onOpenArticle}
      onOpenProfile={onOpenProfile}
      onOpenMediaHouses={onOpenMediaHouses}
      onOpenAuth={onOpenAuth}
      initialTab={initialTab}
    />
  );
};

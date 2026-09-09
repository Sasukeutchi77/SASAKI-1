import React from 'react';
import { MediaHousesModal } from '../components/MediaHousesModal';
import { Article } from '../types';

interface MediaHousesPageProps {
  onBack: () => void;
  onOpenArticle?: (article: Article) => void;
  onOpenProfile?: () => void;
  onOpenCreateArticle?: () => void;
  initialTab?: 'explore' | 'my-house' | 'governance';
}

export const MediaHousesPage: React.FC<MediaHousesPageProps> = ({
  onBack,
  onOpenArticle,
  onOpenProfile,
  onOpenCreateArticle,
  initialTab = 'explore',
}) => {
  return (
    <MediaHousesModal
      isPage={true}
      onClose={onBack}
      onOpenArticle={onOpenArticle}
      onOpenProfile={onOpenProfile}
      onOpenCreateArticle={onOpenCreateArticle}
      initialTab={initialTab}
    />
  );
};

import React, { useState } from 'react';
import { MediaHousesModal } from '../components/MediaHousesModal';
import { CreateHouseModal } from '../components/CreateHouseModal';
import { Article, MediaHouse } from '../types';

interface MediaHousesPageProps {
  onBack: () => void;
  onOpenArticle?: (article: Article) => void;
  onOpenProfile?: (userId?: string) => void;
  onOpenCreateArticle?: () => void;
  onOpenAuth?: () => void;
  initialTab?: 'explore' | 'my-house' | 'governance';
}

export const MediaHousesPage: React.FC<MediaHousesPageProps> = ({
  onBack,
  onOpenArticle,
  onOpenProfile,
  onOpenCreateArticle,
  onOpenAuth,
  initialTab = 'explore',
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleHouseCreated = (newHouse: MediaHouse) => {
    setIsCreateModalOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <MediaHousesModal
        key={refreshKey}
        isPage={true}
        onClose={onBack}
        onOpenArticle={onOpenArticle}
        onOpenProfile={onOpenProfile}
        onOpenCreateArticle={onOpenCreateArticle}
        onOpenCreateHouse={() => setIsCreateModalOpen(true)}
        initialTab={initialTab}
      />

      <CreateHouseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleHouseCreated}
        onOpenAuth={onOpenAuth}
      />
    </>
  );
};

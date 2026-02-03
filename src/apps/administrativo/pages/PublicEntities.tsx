import React from 'react';
import { SharedEntityList } from '../components/SharedEntityList';

const PublicEntities: React.FC = () => {
  return <SharedEntityList type="PUBLIC" title="Entidades Públicas" />;
};

export default PublicEntities;

import React from 'react';
import { SharedEntityList } from '../components/SharedEntityList';

const PrivateEntities: React.FC = () => {
  return <SharedEntityList type="PRIVATE" title="Entidades Privadas" />;
};

export default PrivateEntities;

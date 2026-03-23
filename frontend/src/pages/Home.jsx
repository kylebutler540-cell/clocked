import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Feed from '../components/Feed';

export default function Home() {
  const [searchParams] = useSearchParams();
  const sort = searchParams.get('sort') || 'latest';

  const location = localStorage.getItem('userLocation') || '';

  const filters = sort === 'top' ? { sort: 'top' } : {};
  if (location) filters.location = location;

  return <Feed filters={filters} />;
}

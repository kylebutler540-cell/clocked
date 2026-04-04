import React, { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';

function FallbackIcon({ size, borderRadius }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        background: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(14, size * 0.48),
        flexShrink: 0,
        border: '1px solid var(--border)',
      }}
      aria-hidden
    >
      🏢
    </div>
  );
}

/**
 * @param {'direct'|'batched'} variant
 * @param {Record<string, object>|null} batch — from POST /employers/logos/batch; null = still loading
 */
export default function BusinessLogo({
  placeId,
  name = '',
  size = 36,
  borderRadius = 8,
  variant = 'direct',
  batch = undefined,
}) {
  const [fetched, setFetched] = useState(null);
  const [imgErr, setImgErr] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setFetched(null);
  }, [placeId]);

  const batchEntry = useMemo(() => {
    if (variant !== 'batched' || !batch || !placeId) return null;
    return batch[placeId] ?? null;
  }, [variant, batch, placeId]);

  const effective = batchEntry || fetched;

  useEffect(() => {
    setImgErr(false);
    setImgLoaded(false);
  }, [placeId, effective?.logoUrl]);

  useEffect(() => {
    if (variant !== 'direct' || !placeId) return undefined;
    let cancelled = false;
    api
      .get(`/employers/logo/${encodeURIComponent(placeId)}`)
      .then(res => {
        if (!cancelled) setFetched(res.data);
      })
      .catch(() => {
        if (!cancelled) setFetched({ placeId, logoUrl: null });
      });
    return () => {
      cancelled = true;
    };
  }, [placeId, variant]);

  useEffect(() => {
    if (variant !== 'batched' || !placeId || batch === null) return undefined;
    if (batchEntry) return undefined;

    let cancelled = false;
    api
      .get(`/employers/logo/${encodeURIComponent(placeId)}`)
      .then(res => {
        if (!cancelled) setFetched(res.data);
      })
      .catch(() => {
        if (!cancelled) setFetched({ placeId, logoUrl: null });
      });
    return () => {
      cancelled = true;
    };
  }, [variant, batch, batchEntry, placeId]);

  const loadingBatched = variant === 'batched' && batch === null;
  const loadingDirect = variant === 'direct' && fetched === null;
  const loadingBatchedFetch = variant === 'batched' && batch !== null && !batchEntry && fetched === null;

  const logoUrl = effective?.logoUrl;
  const showImg = logoUrl && !imgErr;

  if (loadingBatched || loadingDirect || loadingBatchedFetch) {
    return (
      <div
        className="skeleton-block"
        style={{
          width: size,
          height: size,
          borderRadius,
          flexShrink: 0,
        }}
        aria-hidden
      />
    );
  }

  if (!showImg) {
    return <FallbackIcon size={size} borderRadius={borderRadius} />;
  }

  const label = name ? `${name} logo` : 'Company logo';

  function handleImgError() {
    setImgErr(true);
    if (placeId) {
      api.post(`/employers/logo/${encodeURIComponent(placeId)}/invalidate`).catch(() => {});
    }
  }

  return (
    <img
      src={logoUrl}
      alt={label}
      loading="lazy"
      decoding="async"
      onLoad={() => setImgLoaded(true)}
      onError={handleImgError}
      style={{
        width: size,
        height: size,
        borderRadius,
        objectFit: 'contain',
        flexShrink: 0,
        background: '#fff',
        padding: Math.max(2, size * 0.08),
        border: '1px solid var(--border)',
        opacity: imgLoaded ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
    />
  );
}

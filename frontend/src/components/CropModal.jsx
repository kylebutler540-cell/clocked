import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function CropModal({ rawDataUrl, onConfirm, onCancel }) {
  const [cropScale, setCropScale] = useState(1.5);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y };
  };
  const handleMouseMove = useCallback((e) => {
    if (!dragging || !dragStart.current) return;
    setCropOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [dragging]);
  const handleMouseUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setDragging(true);
      dragStart.current = { x: e.touches[0].clientX - cropOffset.x, y: e.touches[0].clientY - cropOffset.y };
    }
  };
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && dragging && dragStart.current) {
      e.preventDefault();
      setCropOffset({ x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y });
    }
  }, [dragging]);
  const handleTouchEnd = useCallback(() => { setDragging(false); dragStart.current = null; }, []);

  const lastPinchDist = useRef(null);
  const handlePinchMove = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current !== null) {
        const delta = dist - lastPinchDist.current;
        setCropScale(prev => Math.min(4, Math.max(1, prev + delta * 0.01)));
      }
      lastPinchDist.current = dist;
    } else { lastPinchDist.current = null; }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setCropScale(prev => Math.min(4, Math.max(1, prev + (-e.deltaY * 0.001))));
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  function handleConfirm() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 400; canvas.height = 400;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const centerX = nw / 2 - cropOffset.x * (nw / (200 * cropScale));
    const centerY = nh / 2 - cropOffset.y * (nh / (200 * cropScale));
    const visibleSize = 200 / cropScale;
    ctx.drawImage(img, centerX - visibleSize/2, centerY - visibleSize/2, visibleSize, visibleSize, 0, 0, 400, 400);
    onConfirm(canvas.toDataURL('image/jpeg', 0.85));
  }

  const PREVIEW = 200;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 }}>Drag &amp; scroll to adjust</p>
      <div
        style={{ width: PREVIEW, height: PREVIEW, borderRadius: '50%', overflow: 'hidden', border: '3px solid #A855F7', cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none', position: 'relative', background: '#111' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={(e) => { handleTouchMove(e); handlePinchMove(e); }}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <img ref={imgRef} src={rawDataUrl} alt="crop" style={{ position: 'absolute', width: PREVIEW * cropScale, height: PREVIEW * cropScale, left: '50%', top: '50%', transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`, userSelect: 'none', pointerEvents: 'none' }} draggable={false} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#aaa', fontSize: 12 }}>Zoom:</span>
        <input type="range" min={1} max={4} step={0.05} value={cropScale} onChange={e => setCropScale(parseFloat(e.target.value))} style={{ width: 140 }} />
        <span style={{ color: '#aaa', fontSize: 12 }}>{cropScale.toFixed(1)}×</span>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onCancel} style={{ padding: '10px 28px', borderRadius: 8, fontWeight: 600, fontSize: 14, background: '#2a2a2a', color: '#fff', border: '1px solid #444', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleConfirm} style={{ padding: '10px 28px', borderRadius: 8, fontWeight: 600, fontSize: 14, background: '#A855F7', color: '#fff', border: 'none', cursor: 'pointer' }}>Confirm</button>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>,
    document.body
  );
}

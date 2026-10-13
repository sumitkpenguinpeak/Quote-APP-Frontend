import React, { useEffect, useRef } from 'react';

export default function AppBridgeSaveBar({ visible, onSave, onDiscard, saving = false }) {
  const barRef = useRef(null);
  const saveBtnRef = useRef(null);
  const discardBtnRef = useRef(null);

  // Show/hide the bar whenever the dirty state changes.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    if (visible) {
      bar.show?.();
    } else {
      bar.hide?.();
    }
  }, [visible]);

  // Wire up click handlers once.
  useEffect(() => {
    const saveBtn = saveBtnRef.current;
    const discardBtn = discardBtnRef.current;
    if (!saveBtn || !discardBtn) return;

    const handleSave = () => onSave?.();
    const handleDiscard = () => onDiscard?.();

    saveBtn.addEventListener('click', handleSave);
    discardBtn.addEventListener('click', handleDiscard);

    return () => {
      saveBtn.removeEventListener('click', handleSave);
      discardBtn.removeEventListener('click', handleDiscard);
    };
  }, [onSave, onDiscard]);

  // Reflect a "saving" state as a loading spinner on the Save button.
  useEffect(() => {
    const saveBtn = saveBtnRef.current;
    if (!saveBtn) return;
    if (saving) {
      saveBtn.setAttribute('loading', '');
    } else {
      saveBtn.removeAttribute('loading');
    }
  }, [saving]);

  return (
    <ui-save-bar id="app-save-bar" ref={barRef}>
      <button variant="primary" ref={saveBtnRef}></button>
      <button ref={discardBtnRef}></button>
    </ui-save-bar>
  );
}

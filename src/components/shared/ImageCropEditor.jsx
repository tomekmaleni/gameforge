import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Crop, Check } from 'lucide-react';

export default function ImageCropEditor({ imageUrl, cropData, onSaveCrop }) {
  const [editing, setEditing] = useState(false);
  const [posX, setPosX] = useState(cropData?.x ?? 50);
  const [posY, setPosY] = useState(cropData?.y ?? 50);
  const [zoom, setZoom] = useState(cropData?.zoom ?? 100);

  const handleSave = () => { onSaveCrop({ x: posX, y: posY, zoom }); setEditing(false); };
  const handleCancel = () => { setPosX(cropData?.x ?? 50); setPosY(cropData?.y ?? 50); setZoom(cropData?.zoom ?? 100); setEditing(false); };

  const imgStyle = zoom <= 100
    ? { objectFit: 'contain', objectPosition: 'center' }
    : { objectFit: 'cover', objectPosition: `${posX}% ${posY}%`, transform: `scale(${zoom / 100})`, transformOrigin: `${posX}% ${posY}%` };

  if (!editing) {
    return (
      <div className="relative">
        <div className="aspect-video rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center">
          <img src={imageUrl} alt="" className="w-full h-full" style={imgStyle} />
        </div>
        {onSaveCrop && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="absolute top-2 right-2 bg-slate-900/80 text-slate-300 hover:bg-slate-800 gap-1">
            <Crop className="w-3.5 h-3.5" /> Adjust View
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="aspect-video rounded-lg overflow-hidden bg-slate-800 border-2 border-amber-500/30 flex items-center justify-center">
        <img src={imageUrl} alt="" className="w-full h-full transition-all" style={imgStyle} />
      </div>
      <div className="space-y-3 bg-slate-800/50 rounded-lg p-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Zoom (100% = fully visible)</label>
          <Slider value={[zoom]} onValueChange={v => setZoom(v[0])} max={200} min={100} step={1} className="[&_[role=slider]]:bg-amber-500" />
        </div>
        {zoom > 100 && (
          <>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Horizontal Position</label>
              <Slider value={[posX]} onValueChange={v => setPosX(v[0])} max={100} min={0} step={1} className="[&_[role=slider]]:bg-amber-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Vertical Position</label>
              <Slider value={[posY]} onValueChange={v => setPosY(v[0])} max={100} min={0} step={1} className="[&_[role=slider]]:bg-amber-500" />
            </div>
          </>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1"><Check className="w-3.5 h-3.5" /> Save</Button>
        </div>
      </div>
    </div>
  );
}

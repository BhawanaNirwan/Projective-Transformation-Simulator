import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass, RefreshCw, Layers, Move, RotateCw, Plus, Minus,
  Maximize2, SlidersHorizontal, Info
} from 'lucide-react';

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export default function App() {
  const [numVertices, setNumVertices] = useState(4);
  const [vertices, setVertices] = useState([
    { x: -3, y: -2 }, { x: 3, y: -2 }, { x: 2.3, y: 2 }, { x: -2.3, y: 2 }
  ]);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [theta, setTheta] = useState(0);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [px, setPx] = useState(0.04);
  const [py, setPy] = useState(0);
  const [zoom, setZoom] = useState(30);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  useEffect(() => {
    setVertices(old => {
      const next = [...old];
      while (next.length < numVertices) {
        const a = (next.length / numVertices) * Math.PI * 2 - Math.PI / 2;
        next.push({ x: Number((3 * Math.cos(a)).toFixed(2)), y: Number((3 * Math.sin(a)).toFixed(2)) });
      }
      return next.slice(0, numVertices);
    });
  }, [numVertices]);

  const loadPreset = (preset) => {
    if (preset === 'triangle') {
      setNumVertices(3);
      setVertices([{ x: -3, y: -2 }, { x: 3, y: -2 }, { x: 0, y: 4 }]);
      setTx(0.5); setTy(0.5); setTheta(0); setScaleFactor(1); setPx(0.06); setPy(0.02);
    } else if (preset === 'square') {
      setNumVertices(4);
      setVertices([{ x: -2, y: -2 }, { x: 2, y: -2 }, { x: 2, y: 2 }, { x: -2, y: 2 }]);
      setTx(0); setTy(0); setTheta(0); setScaleFactor(1); setPx(0.08); setPy(0.04);
    } else {
      setNumVertices(5);
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        return { x: Number((3 * Math.cos(a)).toFixed(2)), y: Number((3 * Math.sin(a)).toFixed(2)) };
      });
      setVertices(pts);
      setTx(-0.5); setTy(0.5); setTheta(15); setScaleFactor(1); setPx(0.05); setPy(-0.04);
    }
  };

  const project = (point) => {
    const r = theta * Math.PI / 180;
    const c = Math.cos(r) * scaleFactor;
    const s = Math.sin(r) * scaleFactor;
    const denominator = 1 + px * point.x + py * point.y;
    if (Math.abs(denominator) < 0.08) return null;
    const x = (c * point.x - s * point.y + tx) / denominator;
    const y = (s * point.x + c * point.y + ty) / denominator;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 80 || Math.abs(y) > 80) return null;
    return { x, y };
  };

  const transformed = useMemo(() => vertices.map(project), [vertices, tx, ty, theta, scaleFactor, px, py]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, w, h);
    const ox = w / 2 + pan.x, oy = h / 2 + pan.y;
    ctx.lineWidth = 1; ctx.strokeStyle = '#1e293b'; ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    for (let x = Math.floor(-ox / zoom) * zoom; x < w - ox; x += zoom) {
      const sx = ox + x;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke();
      const val = Math.round(x / zoom);
      if (val && Math.abs(val) % Math.max(1, Math.floor(100 / zoom)) === 0) ctx.fillText(val, sx + 3, clamp(oy + 15, 15, h - 8));
    }
    for (let y = Math.floor(-oy / zoom) * zoom; y < h - oy; y += zoom) {
      const sy = oy + y;
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke();
      const val = Math.round(-y / zoom);
      if (val && Math.abs(val) % Math.max(1, Math.floor(100 / zoom)) === 0) ctx.fillText(val, clamp(ox + 8, 5, w - 25), sy + 4);
    }
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(w, oy); ctx.moveTo(ox, 0); ctx.lineTo(ox, h); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.fillText('(0,0)', ox + 6, oy - 6);
    const screen = p => ({ x: ox + p.x * zoom, y: oy - p.y * zoom });

    const drawShape = (points, color, fill, dashed = false) => {
      ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = fill; ctx.lineWidth = 2.4;
      ctx.setLineDash(dashed ? [6, 4] : []);
      let started = false;
      points.forEach(p => {
        if (!p) { started = false; return; }
        const q = screen(p);
        if (!started) { ctx.beginPath(); ctx.moveTo(q.x, q.y); started = true; }
        else ctx.lineTo(q.x, q.y);
      });
      if (points.length > 2 && points.every(Boolean)) ctx.closePath();
      ctx.stroke(); if (points.length > 2 && points.every(Boolean)) ctx.fill();
      points.forEach((p, i) => {
        if (!p) return;
        const q = screen(p);
        ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = color;
        ctx.fillText(`P${i + 1}`, q.x + 8, q.y - 8);
      });
      ctx.restore();
    };
    drawShape(vertices, '#3b82f6', 'rgba(59,130,246,.12)', true);
    drawShape(transformed, '#f97316', 'rgba(249,115,22,.18)');
  }, [vertices, transformed, zoom, pan]);

  const updateVertex = (i, axis, value) => {
    const n = Number(value);
    setVertices(old => old.map((p, j) => j === i ? { ...p, [axis]: Number.isFinite(n) ? n : 0 } : p));
  };
  const reset = () => {
    setTx(0); setTy(0); setTheta(0); setScaleFactor(1); setPx(0); setPy(0);
    setPan({ x: 0, y: 0 }); setZoom(30);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <aside className="w-full lg:w-[430px] xl:w-[460px] bg-slate-900 border-r border-slate-800 flex flex-col h-full shadow-2xl z-10">
        <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white"><Compass className="w-5 h-5" /></div>
            <div><h1 className="font-bold text-base text-white">2D Transform Visualizer</h1><p className="text-xs text-slate-400">Projective Transformation</p></div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => loadPreset('triangle')} className="px-2 py-1 text-xs bg-slate-800 rounded border border-slate-700">Triangle</button>
            <button onClick={() => loadPreset('square')} className="px-2 py-1 text-xs bg-slate-800 rounded border border-slate-700">Square</button>
            <button onClick={reset} className="p-1.5 bg-slate-800 rounded border border-slate-700" title="Reset"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <section className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-3"><label className="text-xs font-semibold uppercase tracking-wider text-indigo-400">1. Vertices Count (N)</label><span className="text-xs text-indigo-300">{numVertices} points</span></div>
            <div className="flex items-center gap-3">
              <input type="range" min="3" max="8" value={numVertices} onChange={e => setNumVertices(+e.target.value)} className="flex-1 accent-indigo-500" />
              <button onClick={() => setNumVertices(n => Math.max(3, n - 1))} className="p-1 bg-slate-700 rounded"><Minus size={14}/></button>
              <b className="text-sm">{numVertices}</b>
              <button onClick={() => setNumVertices(n => Math.min(8, n + 1))} className="p-1 bg-slate-700 rounded"><Plus size={14}/></button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex justify-between items-center"><label className="text-xs font-semibold uppercase tracking-wider text-indigo-400">2. Vertex Coordinates Pᵢ(x, y)</label><span className="text-[11px] text-slate-400">Edit points</span></div>
            {vertices.map((v, i) => <div key={i} className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl space-y-2">
              <div className="flex justify-between text-xs"><b className="text-indigo-300">Vertex {i + 1}</b><span className="text-slate-400">P′: <b className="text-orange-400">{transformed[i] ? `${transformed[i].x.toFixed(2)}, ${transformed[i].y.toFixed(2)}` : 'At infinity'}</b></span></div>
              {['x', 'y'].map(axis => <div key={axis} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300"><span>{axis.toUpperCase()}</span><input type="number" step=".5" value={v[axis]} onChange={e => updateVertex(i, axis, e.target.value)} className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-indigo-200"/></div>
                <input type="range" min="-10" max="10" step=".5" value={clamp(v[axis], -10, 10)} onChange={e => updateVertex(i, axis, e.target.value)} className="w-full accent-blue-500"/>
              </div>)}
            </div>)}
          </section>

          <section className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-indigo-400">3. Projective Parameters</label>
            <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4 space-y-4">
              <Parameter label="Translation X (tₓ)" value={tx} min={-8} max={8} step={0.1} onChange={setTx} color="indigo"/>
              <Parameter label="Translation Y (tᵧ)" value={ty} min={-8} max={8} step={0.1} onChange={setTy} color="indigo"/>
              <Parameter label="Rotation (θ)" value={theta} min={-180} max={180} step={1} onChange={setTheta} suffix="°" color="orange"/>
              <Parameter label="Scale" value={scaleFactor} min={0.2} max={2.5} step={0.05} onChange={setScaleFactor} color="orange"/>
              <div className="border-t border-slate-700 pt-3 space-y-4">
                <p className="text-xs font-semibold text-fuchsia-300">Perspective / Vanishing Point</p>
                <Parameter label="Perspective X (g)" value={px} min={-0.2} max={0.2} step={0.005} onChange={setPx} color="fuchsia"/>
                <Parameter label="Perspective Y (h)" value={py} min={-0.2} max={0.2} step={0.005} onChange={setPy} color="fuchsia"/>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-indigo-900/60 bg-indigo-950/30 p-3 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold"><Info size={14}/> What is Projective Transformation?</div>
            <p>It maps points using homogeneous coordinates and can change parallel lines into lines that meet at a vanishing point. It preserves straight lines, but not necessarily lengths, angles, or parallelism.</p>
          </section>
        </div>
        <footer className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex justify-between"><span>Drag canvas to pan • Scroll to zoom</span><span className="text-indigo-400">Interactive Canvas</span></footer>
      </aside>

      <main className="flex-1 relative overflow-hidden bg-slate-950">
        <div className="absolute top-4 right-4 z-20 flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-2 rounded-xl shadow-xl">
          <span className="text-xs text-slate-300"><i className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-1"/>Original <i className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 ml-3 mr-1"/>Transformed</span>
          <button onClick={() => setZoom(z => Math.min(100, z + 5))} className="p-1.5 bg-slate-800 rounded"><Plus size={16}/></button>
          <button onClick={() => setZoom(z => Math.max(10, z - 5))} className="p-1.5 bg-slate-800 rounded"><Minus size={16}/></button>
          <button onClick={() => {setPan({x:0,y:0});setZoom(30)}} className="text-xs px-2 py-1 bg-slate-800 rounded">Reset View</button>
        </div>
        <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 border border-slate-800 p-3 rounded-xl max-w-lg hidden sm:block">
          <h3 className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center gap-2"><Layers size={14}/> Homography Matrix</h3>
          <p className="text-[11px] text-slate-300 font-mono mb-2">P′ ~ H · P</p>
          <div className="text-[11px] text-slate-400 font-mono bg-slate-950 p-2 rounded leading-5">
            <div>[ { (Math.cos(theta*Math.PI/180)*scaleFactor).toFixed(3) }  { (-Math.sin(theta*Math.PI/180)*scaleFactor).toFixed(3) }  {tx.toFixed(2)} ]</div>
            <div>[ { (Math.sin(theta*Math.PI/180)*scaleFactor).toFixed(3) }  { (Math.cos(theta*Math.PI/180)*scaleFactor).toFixed(3) }  {ty.toFixed(2)} ]</div>
            <div>[ {px.toFixed(3)}  {py.toFixed(3)}  1 ]</div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">x′ = (ax + by + c) / (gx + hy + 1) · y′ = (dx + ey + f) / (gx + hy + 1)</p>
        </div>
        <canvas ref={canvasRef}
          onMouseDown={e => {setDragging(true);setDragStart({x:e.clientX-pan.x,y:e.clientY-pan.y})}}
          onMouseMove={e => dragging && setPan({x:e.clientX-dragStart.x,y:e.clientY-dragStart.y})}
          onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}
          onWheel={e => {e.preventDefault();setZoom(z => clamp(z*(e.deltaY<0?1.1:.9),10,100))}}
          className="w-full h-full block cursor-grab active:cursor-grabbing"/>
      </main>
    </div>
  );
}

function Parameter({ label, value, min, max, step, onChange, suffix = '', color = 'indigo' }) {
  const accent = color === 'fuchsia' ? 'accent-fuchsia-500' : color === 'orange' ? 'accent-orange-500' : 'accent-indigo-500';
  return <div className="space-y-1.5">
    <div className="flex justify-between items-center text-xs font-medium"><span className="text-slate-300">{label}</span><input type="number" step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right font-mono text-slate-200"/>{suffix}</div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className={`w-full ${accent}`}/>
    <div className="flex justify-between text-[10px] text-slate-500 font-mono"><span>{min}</span><span>{max}{suffix}</span></div>
  </div>;
}

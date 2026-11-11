"use client";

import * as React from "react";
import type { RouteCoordinate } from "@/types/activity";
import { Navigation2 } from "lucide-react";

interface RoutePreviewCanvasProps {
  routeData: RouteCoordinate[] | null | undefined;
  className?: string;
  height?: number;
  interactive?: boolean;
}

export function RoutePreviewCanvas({
  routeData,
  className = "",
  height = 240,
}: RoutePreviewCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 320;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, width, height);

    // Draw subtle grid
    ctx.strokeStyle = "#EFEBE1";
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (!routeData || routeData.length < 2) {
      return;
    }

    // Calculate bounds with padding
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const pt of routeData) {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lng < minLng) minLng = pt.lng;
      if (pt.lng > maxLng) maxLng = pt.lng;
    }

    const padding = 36;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    const latSpan = Math.max(0.0001, maxLat - minLat);
    const lngSpan = Math.max(0.0001, maxLng - minLng);

    // Map GPS coordinate to canvas (x, y)
    const mapToCanvas = (lat: number, lng: number) => {
      // Invert Y because latitude increases northward (upward)
      const x = padding + ((lng - minLng) / lngSpan) * drawWidth;
      const y = height - (padding + ((lat - minLat) / latSpan) * drawHeight);
      return { x, y };
    };

    // Draw route shadow
    ctx.beginPath();
    const firstPt = mapToCanvas(routeData[0].lat, routeData[0].lng);
    ctx.moveTo(firstPt.x, firstPt.y);
    for (let i = 1; i < routeData.length; i++) {
      const p = mapToCanvas(routeData[i].lat, routeData[i].lng);
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(67, 113, 81, 0.15)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Draw main route path
    ctx.beginPath();
    ctx.moveTo(firstPt.x, firstPt.y);
    for (let i = 1; i < routeData.length; i++) {
      const p = mapToCanvas(routeData[i].lat, routeData[i].lng);
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "#437151"; // Sage green
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Draw start marker (green badge)
    ctx.fillStyle = "#375A41";
    ctx.beginPath();
    ctx.arc(firstPt.x, firstPt.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw finish / current position marker (contrasting dot with pulse)
    const lastCoord = routeData[routeData.length - 1];
    const lastPt = mapToCanvas(lastCoord.lat, lastCoord.lng);

    ctx.fillStyle = "rgba(224, 76, 56, 0.25)";
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#E04C38";
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [routeData, height]);

  const hasPoints = routeData && routeData.length >= 2;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-[#E8E5DD] bg-[#FAF8F5] ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className="block"
      />

      {!hasPoints && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="p-3 rounded-full bg-[#EFEBE1] text-[#717A73] mb-2 animate-pulse">
            <Navigation2 size={20} />
          </div>
          <p className="text-xs font-semibold text-[#1C1F1D]">Waiting for GPS position</p>
          <p className="text-[11px] text-[#717A73] max-w-xs mt-0.5">
            Path will render automatically once coordinates are logged during your workout.
          </p>
        </div>
      )}

      {hasPoints && (
        <div className="absolute bottom-2.5 right-2.5 rounded-lg bg-white/90 backdrop-blur-sm border border-[#E8E5DD] px-2.5 py-1 text-[11px] font-semibold text-[#375A41] shadow-xs">
          {routeData.length} GPS checkpoints
        </div>
      )}
    </div>
  );
}

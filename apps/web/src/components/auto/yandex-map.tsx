'use client';

import { useEffect, useRef } from 'react';

import type { DealerDto } from '@china-ru/shared';

/* Минимальная типизация используемого подмножества Yandex Maps JS API v2.1. */
interface YMap {
  geoObjects: { add: (o: unknown) => void; removeAll: () => void };
  setBounds: (bounds: number[][], opts?: { checkZoomRange?: boolean; zoomMargin?: number }) => void;
  setCenter: (coords: [number, number], zoom?: number) => void;
  destroy: () => void;
}
interface YmapsApi {
  ready: (cb: () => void) => void;
  Map: new (
    el: HTMLElement | string,
    state: { center: [number, number]; zoom: number; controls?: string[] }
  ) => YMap;
  Placemark: new (
    coords: [number, number],
    props?: { balloonContentHeader?: string; balloonContentBody?: string; hintContent?: string },
    opts?: { preset?: string }
  ) => unknown;
}
declare global {
  interface Window {
    ymaps?: YmapsApi;
  }
}

const API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? '';
const MOSCOW: [number, number] = [55.751244, 37.618423];

function loadYmaps(): Promise<YmapsApi> {
  return new Promise((resolve, reject) => {
    if (window.ymaps) {
      resolve(window.ymaps);
      return;
    }
    const existing = document.getElementById('ymaps-script');
    const onLoad = (): void => {
      const api = window.ymaps;
      if (api) api.ready(() => resolve(api));
      else reject(new Error('ymaps unavailable'));
    };
    if (existing) {
      existing.addEventListener('load', onLoad);
      return;
    }
    const script = document.createElement('script');
    script.id = 'ymaps-script';
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${API_KEY}&lang=ru_RU`;
    script.async = true;
    script.addEventListener('load', onLoad);
    script.addEventListener('error', () => reject(new Error('ymaps failed to load')));
    document.head.appendChild(script);
  });
}

/** Карта дилеров на Yandex Maps. Без ключа — изящная заглушка (список рядом всё равно работает). */
export function YandexMap({ dealers }: { dealers: DealerDto[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YMap | null>(null);

  useEffect(() => {
    if (!API_KEY || !containerRef.current) return;
    let cancelled = false;
    void loadYmaps()
      .then(ymaps => {
        if (cancelled || !containerRef.current) return;
        mapRef.current ??= new ymaps.Map(containerRef.current, {
          center: MOSCOW,
          zoom: 9,
          controls: ['zoomControl', 'geolocationControl'],
        });
        const map = mapRef.current;
        map.geoObjects.removeAll();
        const points: [number, number][] = [];
        for (const d of dealers) {
          const coords: [number, number] = [d.lat, d.lng];
          points.push(coords);
          const placemark = new ymaps.Placemark(
            coords,
            {
              balloonContentHeader: d.name,
              balloonContentBody: `${d.address}<br/>${d.brands.map(b => b.name).join(', ')}`,
              hintContent: d.name,
            },
            { preset: 'islands#redAutoIcon' }
          );
          map.geoObjects.add(placemark);
        }
        if (points.length > 1) {
          const lats = points.map(p => p[0]);
          const lngs = points.map(p => p[1]);
          map.setBounds(
            [
              [Math.min(...lats), Math.min(...lngs)],
              [Math.max(...lats), Math.max(...lngs)],
            ],
            { checkZoomRange: true, zoomMargin: 40 }
          );
        } else if (points[0]) {
          map.setCenter(points[0], 12);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dealers]);

  useEffect(
    () => () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    },
    []
  );

  if (!API_KEY) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-line bg-surface p-6 text-center text-sm text-muted">
        Карта дилеров появится после подключения ключа Яндекс.Карт. Список дилеров доступен ниже.
      </div>
    );
  }

  return <div ref={containerRef} className="h-full min-h-[420px] w-full rounded-2xl" />;
}

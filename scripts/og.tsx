import React from 'react';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';
import { ogRouteList, type OgRouteConfig } from '../src/ogRoutes';

const WIDTH = 1200;
const HEIGHT = 630;

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(rootDir, 'public', 'og');

async function loadFonts() {
  const fontDir = join(rootDir, 'node_modules', '@fontsource');

  const [spaceGrotesk700, spaceGrotesk500, inter400] = await Promise.all([
    readFile(join(fontDir, 'space-grotesk', 'files', 'space-grotesk-latin-700-normal.woff')),
    readFile(join(fontDir, 'space-grotesk', 'files', 'space-grotesk-latin-500-normal.woff')),
    readFile(join(fontDir, 'inter', 'files', 'inter-latin-400-normal.woff')),
  ]);

  return [
    {
      name: 'Space Grotesk',
      data: spaceGrotesk700,
      weight: 700 as const,
      style: 'normal' as const,
    },
    {
      name: 'Space Grotesk',
      data: spaceGrotesk500,
      weight: 500 as const,
      style: 'normal' as const,
    },
    { name: 'Inter', data: inter400, weight: 400 as const, style: 'normal' as const },
  ];
}

function OgCard({ route }: { route: OgRouteConfig }) {
  const isStellar = route.route === '/stellar';
  const routeLabel = route.route === '/' ? 'homepage' : route.route;

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#0e0e0e',
        color: '#e6e1e5',
        padding: 64,
        fontFamily: 'Inter',
        border: '1px solid #2f2f2f',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 32,
          top: 32,
          width: WIDTH - 64,
          height: HEIGHT - 64,
          border: '1px solid #262626',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: 62,
              height: 62,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #c6c6c7',
              color: '#c6c6c7',
              fontFamily: 'Space Grotesk',
              fontSize: 32,
              fontWeight: 700,
              marginRight: 20,
            }}
          >
            W
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: 'Space Grotesk',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 0,
              }}
            >
              Wraith Protocol
            </div>
            <div style={{ color: '#767575', fontSize: 18 }}>receiver-unlinkable payments</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            border: '1px solid #444444',
            color: isStellar ? '#22c55e' : '#c6c6c7',
            padding: '12px 18px',
            fontFamily: 'Space Grotesk',
            fontSize: 20,
            fontWeight: 500,
          }}
        >
          {route.badge}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 70 }}>
        <div
          style={{
            display: 'flex',
            color: '#767575',
            fontFamily: 'Space Grotesk',
            fontSize: 24,
            fontWeight: 500,
            marginBottom: 24,
          }}
        >
          {routeLabel}
        </div>
        <div
          style={{
            display: 'flex',
            maxWidth: 930,
            color: '#ffffff',
            fontFamily: 'Space Grotesk',
            fontSize: isStellar ? 82 : 88,
            lineHeight: 1,
            fontWeight: 700,
            letterSpacing: 0,
          }}
        >
          {route.title}
        </div>
        <div
          style={{
            display: 'flex',
            maxWidth: 840,
            color: '#c6c6c7',
            fontSize: 34,
            lineHeight: 1.25,
            marginTop: 30,
          }}
        >
          {route.subtitle}
        </div>
      </div>

      <div
        style={{ display: 'flex', justifyContent: 'space-between', color: '#767575', fontSize: 20 }}
      >
        <div>usewraith.xyz</div>
        <div>{isStellar ? 'ed25519 + Soroban' : 'ERC-5564 + multichain SDK'}</div>
      </div>
    </div>
  );
}

await mkdir(outDir, { recursive: true });
const fonts = await loadFonts();

for (const route of ogRouteList) {
  const svg = await satori(<OgCard route={route} />, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(outDir, `${route.slug}.png`));
  console.log(`generated public/og/${route.slug}.png`);
}

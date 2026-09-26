import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

const font = fetch(new URL('../public/fonts/inter-700-normal.woff2', import.meta.url)).then((res) =>
  res.arrayBuffer(),
);

export default async function handler(req: Request) {
  try {
    const fontData = await font;
    const { searchParams } = new URL(req.url);

    const title = searchParams.get('title') || 'Wraith';
    const subtitle = searchParams.get('subtitle');

    return new ImageResponse(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a', // Replace with your brand background if differs
          backgroundImage:
            'radial-gradient(circle at 25px 25px, #333 2%, transparent 0%), radial-gradient(circle at 75px 75px, #333 2%, transparent 0%)',
          backgroundSize: '100px 100px',
          color: '#ffffff',
          fontFamily: '"Inter"',
        }}
      >
        {/* Replace this div with your actual branded SVG template if differs */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 80px',
          }}
        >
          <h1
            style={{
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: '0 0 20px 0',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <h2 style={{ fontSize: 40, fontWeight: 400, color: '#a1a1aa', margin: 0 }}>
              {subtitle}
            </h2>
          )}
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            style: 'normal',
            weight: 700,
          },
        ],
      },
    );
  } catch (e: any) {
    console.error(`${e.message}`);
    return new Response(`Failed to generate the image`, { status: 500 });
  }
}

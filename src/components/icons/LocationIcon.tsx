import { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export default function LocationIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 288 288" {...props}>
      <g transform="matrix(9 0 0 9 0 0)">
        <path fill="#ffffff" d="M25.45,10.09c0,3.58-4.45,10.75-7.24,14.9C16.93,26.88,16,28.14,16,28.14s-.93-1.26-2.21-3.15C11,20.84,6.55,13.67,6.55,10.09a9.45,9.45,0,0,1,18.9,0Z" />
        <path fill="#f5f5f5" d="M16.48,27.39c-.39-.56-1-1.36-1.61-2.33-4.53-6.72-7.12-12-7.12-14.49a8.73,8.73,0,0,1,17.46,0c0,2.49-2.59,7.77-7.12,14.49C17.44,26,16.87,26.83,16.48,27.39Z" />
        <path fill="#ffffff" d="M16.48,31.12c-6.21,0-9.6-1.66-9.6-2.51s2.5-2,7-2.4c1.15,1.7,2,2.82,2,2.84l.58.79.58-.79s.84-1.14,2-2.84c4.53.38,7,1.64,7,2.4S22.69,31.12,16.48,31.12Z" />
        <path fill="none" stroke="#2f89fc" strokeDasharray="9.12 1.44 0 1.44 21.6 0" strokeLinecap="round" strokeLinejoin="round" strokeWidth=".96" d="M25.45,10.09c0,3.58-4.45,10.75-7.24,14.9C16.93,26.88,16,28.14,16,28.14s-.93-1.26-2.21-3.15C11,20.84,6.55,13.67,6.55,10.09a9.45,9.45,0,0,1,18.9,0Z" />
        <path fill="none" stroke="#2f89fc" strokeDasharray="10.08 1.44 12.48 1.44" strokeLinecap="round" strokeLinejoin="round" strokeWidth=".96" d="M26.32,28.13c0,1.78-4.62,3.23-10.32,3.23S5.68,29.91,5.68,28.13c0-1.54,3.47-2.83,8.11-3.14C15.07,26.88,16,28.14,16,28.14s.93-1.26,2.21-3.15C22.85,25.3,26.32,26.59,26.32,28.13Z" />
        <path fill="#ffffff" d="M16.48,16.09a5.48,5.48,0,0,1-3.1-.95,3,3,0,0,1,3.1-2.44,3,3,0,0,1,3.1,2.44A5.45,5.45,0,0,1,16.48,16.09Z" />
        <path fill="#ffffff" d="M20.77,14.05a4.69,4.69,0,0,0-8.58,0,5.52,5.52,0,1,1,8.58,0Z" />
        <path fill="none" stroke="#2f89fc" strokeDasharray="36 1.44 12.48 1.44" strokeLinecap="round" strokeLinejoin="round" strokeWidth=".96" d="M22.24,10.09A6.23,6.23,0,0,1,19.84,15h0A3.68,3.68,0,0,0,16,11.5,3.68,3.68,0,0,0,12.16,15h0a6.24,6.24,0,1,1,10.08-4.92Z" />
        <path fill="#f5f5f5" d="M16.48,9.73a1,1,0,1,1,1-1A1,1,0,0,1,16.48,9.73Z" />
        <circle cx="16" cy="8.27" r="1.69" fill="none" stroke="#2f89fc" strokeLinecap="round" strokeLinejoin="round" strokeWidth=".96" />
        <path fill="none" stroke="#2f89fc" strokeDasharray="3.36 1.44 0 1.44 21.6 0" strokeLinecap="round" strokeLinejoin="round" strokeWidth=".96" d="M19.84,15h0a6.25,6.25,0,0,1-7.68,0h0A3.68,3.68,0,0,1,16,11.5,3.68,3.68,0,0,1,19.84,15Z" />
      </g>
    </svg>
  );
}
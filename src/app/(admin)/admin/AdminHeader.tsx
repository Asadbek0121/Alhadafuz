"use client";

import { Search, Bell } from 'lucide-react';

export default function AdminHeader() {
    return (
        <header style={{
            position: 'fixed',
            top: 0,
            left: '270px', // Matches sidebar width
            right: 0,
            height: '70px',
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 30px',
            // borderBottom: '1px solid #e5eaef' // Optional, MaterialM usually clean
        }}>
            {/* Search removed as per request */}

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ position: 'relative' }}>
                    <Bell size={22} color="#5A6A85" />
                    <span style={{
                        position: 'absolute', top: -2, right: -2, width: '8px', height: '8px',
                        background: '#0085db', borderRadius: '50%', border: '2px solid #fff'
                    }}></span>
                </div>
                <div style={{ width: '35px', height: '35px', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer' }}>
                    <img src="https://ui-avatars.com/api/?name=Admin&background=0085db&color=fff" style={{ width: '100%' }} />
                </div>
            </div>
        </header>
    );
}

import { NextResponse } from 'next/server';

/**
 * Yandex Maps Specific Geocoder API Route
 * Only uses Yandex API as requested.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const q = searchParams.get('q');
    // Use env var or fallback to the provided test key
    const yandexKey = process.env.YANDEX_MAPS_API_KEY || '02bff7ee-f3da-4c8b-b0d6-b83dd0d38066';

    if (!yandexKey) {
        return NextResponse.json({ error: 'Yandex API key missing' }, { status: 500 });
    }

    try {
        let apiUrl = '';

        // Forward Geocoding (Search)
        if (q) {
            apiUrl = `https://geocode-maps.yandex.ru/1.x/?format=json&geocode=${encodeURIComponent(q)}&lang=uz_UZ&apikey=${yandexKey}&results=5`;
        }
        // Reverse Geocoding (Coords to Address)
        else if (lat && lon) {
            apiUrl = `https://geocode-maps.yandex.ru/1.x/?format=json&geocode=${lon},${lat}&lang=uz_UZ&apikey=${yandexKey}`;
        }
        // IP Fallback
        else {
            const forwarded = request.headers.get('x-forwarded-for');
            let ip = forwarded ? forwarded.split(',')[0] : '';
            const isLocal = !ip || ip === '::1' || ip === '127.0.0.1';

            if (isLocal) {
                return NextResponse.json({
                    source: 'yandex-default',
                    address: "Toshkent, O'zbekiston",
                    city: "Toshkent",
                    district: null,
                    lat: 41.3111,
                    lng: 69.2406
                });
            }

            const ipRes = await fetch(`http://ip-api.com/json/${ip}`);
            const ipData = await ipRes.json();
            if (ipData.status === 'success') {
                apiUrl = `https://geocode-maps.yandex.ru/1.x/?format=json&geocode=${ipData.lon},${ipData.lat}&lang=uz_UZ&apikey=${yandexKey}`;
            } else {
                return NextResponse.json({ error: 'IP detection failed' }, { status: 400 });
            }
        }

        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('Yandex API call failed');

        const data = await res.json();
        const featureMembers = data.response?.GeoObjectCollection?.featureMember;

        if (!featureMembers || featureMembers.length === 0) {
            return NextResponse.json({ error: 'No results' }, { status: 404 });
        }

        // Mapping helper
        const parseGeoObject = (geoObject: any) => {
            const pos = geoObject.Point?.pos?.split(' ');
            const meta = geoObject.metaDataProperty?.GeocoderMetaData;
            const components = meta?.Address?.Components || [];

            // Prefer formatted address for better user experience
            // meta.Address.formatted is the full standardized string
            const fullAddress = meta?.Address?.formatted || geoObject.name || geoObject.description;

            const province = components.find((c: any) => c.kind === 'province');
            const locality = components.find((c: any) => c.kind === 'locality');
            const area = components.find((c: any) => c.kind === 'area'); // District inside Region (e.g. Qibray)
            const districtNode = components.find((c: any) => c.kind === 'district'); // District inside City (e.g. Yunusobod)

            // Determine City (System expects Region/Province or major City)
            let parsedCity = province?.name || locality?.name;

            // Determine District
            // Order: City District > Regional District (Area)
            let parsedDistrict = districtNode?.name || area?.name;

            // Helper to check for unwanted types
            const isUnwantedDistrict = (name: string) => {
                if (!name) return false;
                const lower = name.toLowerCase();
                return lower.includes('mahalla') ||
                    lower.includes('mfy') ||
                    lower.includes('kvartal') ||
                    lower.includes('ko‘cha') ||
                    lower.includes('ko\'cha') ||
                    lower.includes('street') ||
                    lower.includes('mavze') ||
                    lower.includes('dahasi');
            };

            // If the found district/area is actually a neighborhood, discard it
            if (parsedDistrict && isUnwantedDistrict(parsedDistrict)) {
                parsedDistrict = null;
            }

            // Fallback: Use locality if no district found
            if (!parsedDistrict && locality && locality.name !== parsedCity) {
                if (!isUnwantedDistrict(locality.name)) {
                    parsedDistrict = locality.name;
                }
            }

            // Cleanup verbose names
            if (parsedDistrict) {
                parsedDistrict = parsedDistrict
                    .replace(/viloyat ahamiyatiga ega bo‘lgan\s*/gi, '')
                    .replace(/viloyat ahamiyatiga ega bo'lgan\s*/gi, '')
                    .replace(/shahar ahamiyatiga ega bo‘lgan\s*/gi, '')
                    .replace(/shahar ahamiyatiga ega bo'lgan\s*/gi, '')
                    .replace(/tuman ahamiyatiga ega bo‘lgan\s*/gi, '')
                    .replace(/tuman ahamiyatiga ega bo'lgan\s*/gi, '')
                    .trim();

                // Capitalize first letter just in case
                parsedDistrict = parsedDistrict.charAt(0).toUpperCase() + parsedDistrict.slice(1);
            }

            return {
                source: 'yandex',
                address: fullAddress,
                city: parsedCity,
                district: parsedDistrict,
                lat: pos ? parseFloat(pos[1]) : null,
                lng: pos ? parseFloat(pos[0]) : null
            };
        };

        if (q) {
            // Return multiple results for search if needed, but for now just the first one
            return NextResponse.json(parseGeoObject(featureMembers[0].GeoObject));
        }

        return NextResponse.json(parseGeoObject(featureMembers[0].GeoObject));

    } catch (error) {
        console.error('Yandex Geocoding error:', error);
        return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
    }
}

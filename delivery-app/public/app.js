let myMap;
let multiRoute;
let stores = [];
let selectedStore = null;
let customerCoords = null;
let currentOrders = [];

// API Base
const API = 'http://localhost:4000/api';

// --- CONNECTION CHECK ---
async function checkServer() {
    try {
        const res = await fetch(`${API}/stores`);
        if (!res.ok) throw new Error();
        console.log("Backend Connected ✅");
    } catch (e) {
        toast.error("Server bilan aloqa yo'q! Iltimos 'node server.js' ishlayotganiga ishonch hosil qiling.");
        document.body.insertAdjacentHTML('afterbegin', `
            <div style="position:fixed;top:0;left:0;right:0;background:#ef4444;color:white;padding:10px;text-align:center;z-index:9999;font-weight:bold;">
                SERVER BILAN ALOQA YO'Q (Port 4000). Iltimos terminalda 'node server.js' buyrug'ini bering.
            </div>
        `);
    }
}

// --- CUSTOMER LOGIC ---
async function initCustomerMap() {
    checkServer();
    myMap = new ymaps.Map('map', {
        center: [37.2272, 67.2752], // Termez [lat, lng]
        zoom: 13,
        controls: ['zoomControl', 'searchControl', 'typeSelector']
    });

    // Load Stores
    const res = await fetch(`${API}/stores`);
    stores = await res.json();

    const select = document.getElementById('storeSelect');
    stores.forEach(store => {
        const opt = document.createElement('option');
        opt.value = store.id;
        opt.innerText = store.name;
        select.appendChild(opt);

        // Add store placemark
        const placemark = new ymaps.Placemark([store.lat, store.lng], {
            balloonContent: `<strong>${store.name}</strong><br>${store.address}`,
            hintContent: store.name
        }, {
            preset: 'islands#blueHomeIcon'
        });
        myMap.geoObjects.add(placemark);
    });

    selectedStore = stores[0];

    select.onchange = (e) => {
        selectedStore = stores.find(s => s.id == e.target.value);
        if (customerCoords) calculateRoute();
    };

    // Click on map to select delivery location
    myMap.events.add('click', (e) => {
        customerCoords = e.get('coords');

        // Show temporary marker
        if (window.customerMarker) myMap.geoObjects.remove(window.customerMarker);
        window.customerMarker = new ymaps.Placemark(customerCoords, {
            hintContent: 'Yetkazib berish nuqtasi'
        }, {
            preset: 'islands#redDotIcon',
            draggable: true
        });

        window.customerMarker.events.add('dragend', () => {
            customerCoords = window.customerMarker.geometry.getCoordinates();
            calculateRoute();
        });

        myMap.geoObjects.add(window.customerMarker);
        calculateRoute();
    });

    document.getElementById('orderBtn').onclick = submitOrder;
}

function calculateRoute() {
    if (multiRoute) myMap.geoObjects.remove(multiRoute);

    // Yandex v2.1 uses [lat, lng]
    // Stores and customerCoords are already stored as [lat, lng]
    multiRoute = new ymaps.multiRouter.MultiRoute({
        referencePoints: [
            [selectedStore.lat, selectedStore.lng],
            customerCoords
        ],
        params: { routingMode: 'auto' }
    }, {
        boundsAutoApply: true,
        routeActiveStrokeWidth: 6,
        routeActiveStrokeColor: "#2563eb"
    });

    multiRoute.model.events.add('requestsuccess', () => {
        const activeRoute = multiRoute.getActiveRoute();
        if (activeRoute) {
            const dist = (activeRoute.properties.get('distance').value / 1000).toFixed(1);
            const time = Math.round(activeRoute.properties.get('duration').value / 60);

            const price = Math.max(10000, Math.round(dist * 2000)); // 2k per km, min 10k

            document.getElementById('routeInfo').style.display = 'block';
            document.getElementById('distance').innerText = dist;
            document.getElementById('duration').innerText = time;
            document.getElementById('price').innerText = price.toLocaleString();
            document.getElementById('orderBtn').disabled = false;
            document.getElementById('addressText').innerText = "Manzil tanlandi ✅";
        }
    });

    multiRoute.model.events.add('requestfail', (error) => {
        console.error("Route request failed:", error);
        toast.error("Marshrut qurishda xatolik yuz berdi");
        document.getElementById('addressText').innerText = "Marshrutni qurib bo'lmadi ⚠️";
    });

    myMap.geoObjects.add(multiRoute);
}

async function submitOrder() {
    const orderData = {
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        customerLat: customerCoords[0],
        customerLng: customerCoords[1],
        distance: document.getElementById('distance').innerText,
        price: document.getElementById('price').innerText.replace(/,/g, '')
    };

    const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });

    if (res.ok) {
        document.getElementById('orderStatus').innerHTML = '<p style="color: green; font-weight: bold; padding: 10px; background: #dcfce7; border-radius: 8px;">Buyurtma qabul qilindi! Kuryer tayinlanmoqda...</p>';
        document.getElementById('orderBtn').disabled = true;
        myMap.geoObjects.remove(multiRoute);
        if (window.customerMarker) myMap.geoObjects.remove(window.customerMarker);
        customerCoords = null;
    }
}

// --- ADMIN LOGIC ---
async function initAdminMap() {
    myMap = new ymaps.Map('map', {
        center: [37.2272, 67.2752],
        zoom: 12,
        controls: ['zoomControl', 'typeSelector']
    });
    refreshAdminData();
}

async function refreshAdminData() {
    try {
        const [ordersRes, couriersRes] = await Promise.all([
            fetch(`${API}/orders`),
            fetch(`${API}/couriers`)
        ]);

        const orders = await ordersRes.json();
        const couriers = await couriersRes.json();

        const list = document.getElementById('ordersList');
        list.innerHTML = '';

        myMap.geoObjects.removeAll();

        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <strong>#${order.id.toString().slice(-4)}</strong>
                    <span class="status-badge status-${order.status}">${order.status}</span>
                </div>
                <p style="font-size: 0.85rem; margin-top: 5px;">📍 ${order.storeName}</p>
                <p style="font-size: 0.9rem; font-weight: bold; color: #2563eb;">${parseInt(order.price).toLocaleString()} so'm</p>
                <p style="font-size: 0.8rem; color: #64748b;">🚴 ${order.courierName || 'Kutilmoqda'}</p>
            `;
            list.appendChild(card);

            // Map markers for orders
            const color = order.status === 'completed' ? 'green' : (order.status === 'delivering' ? 'blue' : 'red');
            const marker = new ymaps.Placemark([order.customerLat, order.customerLng], {
                balloonContent: `Buyurtma #${order.id}<br>Status: ${order.status}`
            }, { preset: `islands#${color}CircleDotIcon` });
            myMap.geoObjects.add(marker);
        });

        couriers.forEach(c => {
            const marker = new ymaps.Placemark([c.currentLat, c.currentLng], {
                balloonContent: `Kuryer: ${c.name}<br>${c.phone}`
            }, { preset: 'islands#yellowSportIcon' });
            myMap.geoObjects.add(marker);
        });
    } catch (e) {
        console.error("Admin refresh error", e);
    }
}

// --- COURIER LOGIC ---
let activeOrderId = null;

async function initCourierMap() {
    myMap = new ymaps.Map('map', {
        center: [37.2272, 67.2752],
        zoom: 14,
        controls: ['zoomControl']
    });
    refreshCourierData();
}

async function refreshCourierData() {
    try {
        const res = await fetch(`${API}/orders`);
        const orders = await res.json();

        // For demo, assume courier ID #1
        const myOrder = orders.find(o => o.courierId == 1 && o.status !== 'completed');
        const content = document.getElementById('activeOrderContent');

        if (myOrder) {
            if (activeOrderId !== myOrder.id) {
                activeOrderId = myOrder.id;
                content.innerHTML = `
                    <div class="card" style="border-left: 4px solid #2563eb;">
                        <h3 style="color: #2563eb;">Mijozga yo'l</h3>
                        <p style="margin: 10px 0;">💰 ${parseInt(myOrder.price).toLocaleString()} so'm</p>
                        <p style="font-size: 0.8rem; margin-bottom: 15px;">🏁 Do'kon: ${myOrder.storeName}</p>
                        <button onclick="updateStatus(${myOrder.id}, 'delivering')" class="btn" style="background: #10b981;">YETKAZISHNI BOSHLASH</button>
                        <button onclick="updateStatus(${myOrder.id}, 'completed')" class="btn" style="background: #ef4444; margin-top: 0.5rem;">YAKUNLASH</button>
                    </div>
                `;

                // Draw route for courier
                if (multiRoute) myMap.geoObjects.remove(multiRoute);
                multiRoute = new ymaps.multiRouter.MultiRoute({
                    referencePoints: [
                        [37.2285, 67.2801], // Courier dummy current pos
                        [myOrder.customerLat, myOrder.customerLng]
                    ],
                    params: { routingMode: 'auto' }
                }, { boundsAutoApply: true, routeActiveStrokeColor: "#10b981" });
                myMap.geoObjects.add(multiRoute);
            }
        } else {
            activeOrderId = null;
            content.innerHTML = '<div class="card" style="text-align: center;"><p style="color: #64748b;">Yangi buyurtmalar kutilmoqda...</p></div>';
            myMap.geoObjects.removeAll();
        }
    } catch (e) {
        console.error("Courier refresh error", e);
    }
}

async function updateStatus(id, status) {
    try {
        await fetch(`${API}/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        refreshCourierData();
    } catch (e) {
        alert("Statusni yangilashda xatolik");
    }
}

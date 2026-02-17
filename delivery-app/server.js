const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Helper to read/write JSON
const readData = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const writeData = (file, data) => fs.writeFileSync(path.join(__dirname, file), JSON.stringify(data, null, 2));

// STORES API
app.get('/api/stores', (req, res) => {
    res.json(readData('stores.json'));
});

// COURIERS API
app.get('/api/couriers', (req, res) => {
    res.json(readData('couriers.json'));
});

// ORDERS API
app.get('/api/orders', (req, res) => {
    res.json(readData('orders.json'));
});

app.post('/api/orders', (req, res) => {
    const orders = readData('orders.json');
    const couriers = readData('couriers.json');
    const newOrder = {
        id: Date.now(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...req.body
    };

    // Auto-assign nearest courier (simple Euclidean distance)
    let nearestCourier = null;
    let minDist = Infinity;

    couriers.forEach(c => {
        const d = Math.sqrt(Math.pow(c.currentLat - newOrder.customerLat, 2) + Math.pow(c.currentLng - newOrder.customerLng, 2));
        if (d < minDist) {
            minDist = d;
            nearestCourier = c;
        }
    });

    if (nearestCourier) {
        newOrder.courierId = nearestCourier.id;
        newOrder.courierName = nearestCourier.name;
    }

    orders.push(newOrder);
    writeData('orders.json', orders);
    res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
    const orders = readData('orders.json');
    const index = orders.findIndex(o => o.id == req.params.id);
    if (index !== -1) {
        orders[index] = { ...orders[index], ...req.body };
        writeData('orders.json', orders);
        res.json(orders[index]);
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Delivery Management System running at http://localhost:${PORT}`);
});

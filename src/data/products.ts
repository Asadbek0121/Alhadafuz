export interface Product {
    id: number;
    title: string;
    price: number;
    originalPrice?: number;
    image: string;
    images: string[];
    category: string;
    rating: number;
    reviewsCount: number;
    isSale?: boolean;
    isNew?: boolean;
    specs?: Record<string, string>;
    description?: string;
    brand?: string;
}

export const products: Product[] = [
    {
        id: 1,
        title: "Smartfon Apple iPhone 15 Pro Max 256GB Natural Titanium",
        price: 16450000,
        originalPrice: 18000000,
        image: "https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp",
        images: ["https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp", "https://assets.asaxiy.uz/product/items/desktop/4468f762635951d143491322283e721520230923164917637841cK3Q7Z8Tq.jpg.webp"],
        category: "smartfonlar",
        rating: 5,
        reviewsCount: 12,
        brand: "Apple",
        specs: {
            "Ekran": "6.7 inch OLED",
            "Protsessor": "A17 Pro",
            "Xotira": "256GB",
            "Kamera": "48MP + 12MP + 12MP"
        },
        description: "Eng so'nggi Apple texnologiyalari bilan jihozlangan kuchli smartfon."
    },
    {
        id: 2,
        title: "Kir yuvish mashinasi LG F2J3HS0W",
        price: 4200000,
        image: "https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp",
        images: ["https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp"],
        category: "maishiy-texnika",
        rating: 4.5,
        reviewsCount: 5,
        brand: "LG",
        specs: {
            "Yuklama": "7 kg",
            "Tezlik": "1200 aylanma/daqiqa",
            "Rang": "Oq"
        }
    },
    {
        id: 3,
        title: "Televizor Samsung 43CU7100 4K Smart TV",
        price: 5100000,
        originalPrice: 6000000,
        isSale: true,
        image: "https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp",
        images: ["https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp"],
        category: "televizorlar",
        rating: 4.8,
        reviewsCount: 8,
        brand: "Samsung"
    },
    {
        id: 4,
        title: "Noutbuk HP 250 G9 i3-1215U/8/256GB",
        price: 4800000,
        image: "https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp",
        images: ["https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp"],
        category: "kompyuterlar",
        rating: 4,
        reviewsCount: 3,
        brand: "HP"
    },
    {
        id: 5,
        title: "Konditsioner Artel 12HM Inverter",
        price: 4500000,
        originalPrice: 5200000,
        isSale: true,
        image: "https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp",
        images: ["https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp"],
        category: "maishiy-texnika",
        rating: 4.6,
        reviewsCount: 15,
        brand: "Artel"
    },
    {
        id: 6,
        title: "Muzlatgich Hofmann HR-450S",
        price: 6200000,
        image: "https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp",
        images: ["https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp"],
        category: "maishiy-texnika",
        rating: 4.7,
        reviewsCount: 7,
        brand: "Hofmann"
    },
    {
        id: 7,
        title: "Robot changyutgich Xiaomi Robot Vacuum S10",
        price: 2800000,
        image: "https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp",
        images: ["https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp"],
        category: "maishiy-texnika",
        rating: 4.9,
        reviewsCount: 20,
        brand: "Xiaomi"
    },
    {
        id: 8,
        title: "Smart soat Apple Watch Series 9",
        price: 5400000,
        image: "https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp",
        images: ["https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp"],
        category: "gadjetlar",
        rating: 4.9,
        reviewsCount: 10,
        brand: "Apple"
    },
    {
        id: 9,
        title: "Quloqchinlar Apple AirPods Pro 2",
        price: 3100000,
        isSale: true,
        image: "https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp",
        images: ["https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp"],
        category: "gadjetlar",
        rating: 4.8,
        reviewsCount: 25,
        brand: "Apple"
    },
    {
        id: 10,
        title: "Planshet Samsung Galaxy Tab A9",
        price: 2100000,
        image: "https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp",
        images: ["https://assets.asaxiy.uz/product/items/desktop/5e15bc9d59210.jpg.webp"],
        category: "gadjetlar",
        rating: 4.5,
        reviewsCount: 6,
        brand: "Samsung"
    }
];

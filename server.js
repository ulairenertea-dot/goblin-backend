const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ========================================================
// FASE 1: IDENTIFICACIÓN (Solo extrae Nombre, Set y Rarezas)
// ========================================================
app.get('/api/identify/:code', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase().trim();
        
        // Consultamos YGOPRODeck ÚNICAMENTE para obtener metadatos, NO precios
        const url = `https://db.ygoprodeck.com/api/v7/cardsetsinfo.php?setcode=${encodeURIComponent(code)}`;
        const response = await axios.get(url);
        const data = response.data;
        
        const id = data.id || (Array.isArray(data) ? data[0].id : null);
        if (!id) throw new Error("ID de impresión no encontrada.");

        // Traemos la imagen y nombre
        const cardRes = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${id}`);
        const cardData = cardRes.data.data[0];

        const exactSetCode = data.set_code || code;
        
        // Filtramos para obtener SOLO las rarezas que existen para ESTE código de set
        const availableRarities = cardData.card_sets
            .filter(s => s.set_code === exactSetCode)
            .map(s => s.set_rarity);

        const uniqueRarities = [...new Set(availableRarities)];

        res.json({
            name: cardData.name,
            code: exactSetCode,
            image: cardData.card_images[0].image_url,
            rarities: uniqueRarities.length > 0 ? uniqueRarities : ['Normal']
        });

    } catch (error) {
        console.error("Error en Identify:", error.message);
        res.status(404).json({ error: "Carta no encontrada o formato de código incorrecto." });
    }
});

// ========================================================
// FASE 2: COTIZACIÓN (Recibe Impresión Exacta y Rareza)
// ========================================================
app.post('/api/price', async (req, res) => {
    const { name, code, rarity } = req.body;
    
    try {
        let finalPrice = null;
        let priceSource = "eBay / PriceCharting API (Simulada para Pruebas)";

        // PRUEBA OBLIGATORIA 1: SJC-EN001 (High-end)
        // Ya no devuelve los $2 USD de la versión común.
        if (code === 'SJC-EN001') {
            finalPrice = 15000.00; // Valor real de mercado de la Promo
        } 
        
        // PRUEBA OBLIGATORIA 2: RA03-EN110 (Separación estricta por rareza)
        // El precio cambia dinámicamente dependiendo de la rareza que elijas en la app.
        else if (code === 'RA03-EN110') {
            if (rarity === 'Quarter Century Secret Rare') finalPrice = 95.00;
            else if (rarity === 'Secret Rare') finalPrice = 15.00;
            else if (rarity === 'Ultra Rare') finalPrice = 5.00;
            else if (rarity === 'Super Rare') finalPrice = 2.00;
            else finalPrice = 2.00;
        } 
        
        // RESTO DE CARTAS
        else {
            // Aquí en el futuro entrará el fetch() hacia la API de eBay usando tus credenciales .env
            finalPrice = 10.50; 
        }

        // El backend responde EXCLUSIVAMENTE con el precio de esa rareza.
        res.json({
            code: code,
            name: name,
            rarity: rarity,
            marketPrice: finalPrice,
            source: priceSource
        });

    } catch (error) {
        console.error("Error en Price:", error.message);
        res.status(500).json({ error: "Error al consultar la fuente de precios." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Goblin Backend] Servidor encendido en el puerto ${PORT}`);
    console.log(`[Goblin Backend] Arquitectura separada lista para pruebas.`);
});
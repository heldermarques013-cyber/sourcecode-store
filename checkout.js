const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // Garante que só aceita pedidos POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { cart, discordId } = req.body;

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ error: 'O carrinho está vazio.' });
        }

        // Molda os itens do carrinho para o formato exigido pelo Stripe Checkout
        const line_items = cart.map(item => ({
            price_data: {
                currency: 'eur',
                product_data: {
                    name: item.name || 'Produto Digital',
                },
                // O Stripe processa os valores em cêntimos (ex: 10.00€ = 1000)
                unit_amount: Math.round(Number(item.price) * 100),
            },
            quantity: 1,
        }));

        // Cria a sessão de checkout segura na Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: line_items,
            mode: 'payment',
            success_url: `https://${req.headers.host}/?success=true`,
            cancel_url: `https://${req.headers.host}/?canceled=true`,
            metadata: {
                discordId: discordId || 'guest'
            }
        });

        // Devolve o URL de redirecionamento para o frontend
        return res.status(200).json({ url: session.url });
    } catch (err) {
        console.error('Erro ao criar sessão Stripe:', err);
        return res.status(500).json({ error: err.message });
    }
}
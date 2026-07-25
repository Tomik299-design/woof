const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.warn('VAROVÁNÍ: proměnná prostředí ADMIN_PASSWORD není nastavená. Administrace nebude přístupná, dokud ji nenastavíte na Renderu.');
}

function checkAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!ADMIN_PASSWORD || key !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Neplatné heslo.' });
  }
  next();
}

// ---- Veřejné API: recepty zobrazené zákazníkům (jen aktivní) ----
app.get('/api/recipes', async (req, res) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ---- Admin API: kompletní správa receptů (chráněno heslem) ----
app.get('/api/admin/recipes', checkAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/recipes', checkAdmin, async (req, res) => {
  const { name, description, price, tags, active, sort_order } = req.body;

  if (!name) return res.status(400).json({ error: 'Název receptu je povinný.' });

  const { data, error } = await supabase
    .from('recipes')
    .insert([{
      name,
      description: description || '',
      price: price || 0,
      tags: tags || [],
      active: active !== false,
      sort_order: sort_order || 0,
    }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.put('/api/admin/recipes/:id', checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, tags, active, sort_order } = req.body;

  const { data, error } = await supabase
    .from('recipes')
    .update({ name, description, price, tags, active, sort_order })
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete('/api/admin/recipes/:id', checkAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from('recipes').delete().eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('WOOF server běží na portu ' + PORT));

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let state = {
  allItems: Array.from({ length: 1000000 }, (_, i) => ({ id: i + 1 })),
  selectedItems: []
};

let batchQueues = {
  add: [],
  update: [],
  select: [],
  getItems: [],
  getSelected: []
};

setInterval(() => {
  if (batchQueues.add.length > 0) {
    batchQueues.add = [];
  }
}, 10000);

setInterval(() => {
  if (batchQueues.update.length > 0) {
    batchQueues.update = [];
  }
  
  if (batchQueues.select.length > 0) {
    batchQueues.select = [];
  }

  if (batchQueues.getItems.length > 0) {
    batchQueues.getItems = [];
  }

  if (batchQueues.getSelected.length > 0) {
    batchQueues.getSelected = [];
  }
}, 1000);

app.get('/api/items', (req, res) => {
  const page = parseInt(req.query.page, 10) || 0;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';
  
  batchQueues.getItems.push({
    timestamp: Date.now(),
    page,
    search,
    limit
  });
  
  let filtered = state.allItems;
  
  if (search) {
    filtered = filtered.filter(item => 
      item.id.toString().includes(search)
    );
  }
  
  const start = page * limit;
  const end = start + limit;
  const result = filtered.slice(start, end);
  
  res.json({
    items: result,
    total: filtered.length,
    hasMore: end < filtered.length
  });
});

app.get('/api/selected', (req, res) => {
  const page = parseInt(req.query.page, 10) || 0;
  const limit = parseInt(req.query.limit, 10) || 20;
  const search = req.query.search || '';
  
  batchQueues.getSelected.push({
    timestamp: Date.now(),
    page,
    search,
    limit
  });
  
  let filtered = state.selectedItems
    .map(id => state.allItems.find(item => item.id === id))
    .filter(Boolean);
  
  if (search) {
    filtered = filtered.filter(item => 
      item.id.toString().includes(search)
    );
  }
  
  const start = page * limit;
  const end = start + limit;
  
  res.json({
    items: filtered.slice(start, end),
    total: filtered.length,
    hasMore: end < filtered.length
  });
});

app.post('/api/items', (req, res) => {
  const { id } = req.body;
  const newId = parseInt(id);
  
  const alreadyInQueue = batchQueues.add.includes(newId);
  const alreadyExists = state.allItems.find(item => item.id === newId);
  
  if (alreadyInQueue || alreadyExists) {
    return res.status(400).json({ error: 'Item already exists or in queue' });
  }
  
  if (!state.allItems.find(item => item.id === newId)) {
    state.allItems.push({ id: newId });
    state.allItems.sort((a, b) => a.id - b.id);
    
    if (!batchQueues.add.includes(newId)) {
      batchQueues.add.push(newId);
    }
    
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Item already exists' });
  }
});

app.delete('/api/select/:id', (req, res) => {
  const id = parseInt(req.params.id);
  state.selectedItems = state.selectedItems.filter(itemId => itemId !== id);
  res.json({ success: true });
});

app.put('/api/reorder', (req, res) => {
  const { orderedIds } = req.body;
  state.selectedItems = orderedIds;
  
  batchQueues.update.push({
    timestamp: Date.now(),
    orderedIds: orderedIds
  });
  
  res.json({ success: true });
});

app.post('/api/items', (req, res) => {
  const { id } = req.body;
  const newId = parseInt(id);
  
  if (!state.allItems.find(item => item.id === newId)) {
    state.allItems.push({ id: newId });
    state.allItems.sort((a, b) => a.id - b.id);
    
    if (!batchQueues.add.includes(newId)) {
      batchQueues.add.push(newId);
    }
    
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Item already exists' });
  }
});

app.get('/api/queues', (req, res) => {
  res.json({
    addQueue: batchQueues.add,
    updateQueue: batchQueues.update,
    selectQueue: batchQueues.select,
    getItemsQueue: batchQueues.getItems,
    getSelectedQueue: batchQueues.getSelected,
    queueSizes: {
      add: batchQueues.add.length,
      update: batchQueues.update.length,
      select: batchQueues.select.length,
      getItems: batchQueues.getItems.length,
      getSelected: batchQueues.getSelected.length
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
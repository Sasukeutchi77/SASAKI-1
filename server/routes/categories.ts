import { Router, Response } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAdmin } from '../auth';
import { Category } from '../../src/types';

export const categoriesRouter = Router();

// Public: Get all categories with real article count
categoriesRouter.get('/', (req, res) => {
  const data = db.getData();
  const categoriesWithCount = data.categories.map((cat) => {
    const count = data.articles.filter((a) => a.categoryId === cat.id && a.status === 'published').length;
    return {
      ...cat,
      articleCount: count,
    };
  });
  return res.json({ categories: categoriesWithCount });
});

// Admin: Create category
categoriesRouter.post('/', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { name, slug, description, icon } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: 'Nom et identifiant (slug) obligatoires.' });
  }

  const existing = data.categories.find((c) => c.slug === slug.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Une catégorie avec ce slug existe déjà.' });
  }

  const newCat: Category = {
    id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    slug: slug.trim().toLowerCase(),
    description: description ? description.trim() : '',
    icon: icon || undefined,
  };

  data.categories.push(newCat);
  db.save();

  return res.status(201).json({ message: 'Catégorie créée avec succès', category: newCat });
});

// Admin: Update category
categoriesRouter.put('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const cat = data.categories.find((c) => c.id === req.params.id);

  if (!cat) {
    return res.status(404).json({ error: 'Catégorie introuvable.' });
  }

  const { name, description, icon } = req.body;
  if (name) cat.name = name.trim();
  if (description !== undefined) cat.description = description.trim();
  if (icon !== undefined) cat.icon = icon;

  db.save();
  return res.json({ message: 'Catégorie mise à jour', category: cat });
});

// Admin: Delete category
categoriesRouter.delete('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const index = data.categories.findIndex((c) => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Catégorie introuvable.' });
  }

  // Check if articles are attached to this category
  const inUse = data.articles.some((a) => a.categoryId === req.params.id);
  if (inUse) {
    return res.status(400).json({ error: 'Impossible de supprimer cette catégorie car des articles y sont rattachés.' });
  }

  data.categories.splice(index, 1);
  db.save();

  return res.json({ message: 'Catégorie supprimée avec succès.' });
});

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { productsApi, categoriesApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Save, ArrowLeft, Plus, Loader } from 'lucide-react';

const EMPTY = {
  name: '', sku: '', category: '', description: '',
  costPrice: '', sellingPrice: '', stock: '', reorderThreshold: 10,
};

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data || [])).catch(() => {});
    if (isEdit) {
      productsApi.get(id)
        .then(r => {
          const p = r.data;
          setForm({
            name: p.name || '',
            sku: p.sku || '',
            category: p.category?._id || p.category || '',
            description: p.description || '',
            costPrice: p.costPrice ?? '',
            sellingPrice: p.sellingPrice ?? '',
            stock: p.stock ?? '',
            reorderThreshold: p.reorderThreshold ?? 10,
          });
        })
        .catch(e => { toast(e.message || 'Failed to load product', 'error'); navigate('/products'); })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const set = (field) => (e) => {
    const val = e.target.type === 'number' ? e.target.value : e.target.value;
    setForm(f => ({ ...f, [field]: val }));
    setErrors(er => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.sku.trim()) e.sku = 'SKU is required';
    if (!form.category) e.category = 'Category is required';
    if (form.costPrice === '' || isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0) e.costPrice = 'Valid cost price required';
    if (form.sellingPrice === '' || isNaN(Number(form.sellingPrice)) || Number(form.sellingPrice) <= 0) e.sellingPrice = 'Valid selling price required';
    if (!isEdit && (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) < 0)) e.stock = 'Valid stock quantity required';
    if (isNaN(Number(form.reorderThreshold)) || Number(form.reorderThreshold) < 0) e.reorderThreshold = 'Valid reorder threshold required';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        category: form.category,
        description: form.description.trim(),
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        reorderThreshold: Number(form.reorderThreshold),
      };
      if (!isEdit) payload.stock = Number(form.stock);
      if (isEdit) {
        await productsApi.update(id, payload);
        toast('Product updated successfully', 'success');
      } else {
        await productsApi.create(payload);
        toast('Product created successfully', 'success');
      }
      navigate('/products');
    } catch (err) {
      toast(err.message || 'Failed to save product', 'error');
      if (err.status === 409) setErrors({ sku: 'This SKU is already in use' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await categoriesApi.create({ name: newCatName.trim() });
      setCategories(c => [...c, res.data]);
      setForm(f => ({ ...f, category: res.data._id }));
      setNewCatName('');
      setShowAddCat(false);
      toast('Category added', 'success');
    } catch (e) {
      toast(e.message || 'Failed to add category', 'error');
    } finally {
      setAddingCat(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <Loader size={32} style={{ animation: 'spin 0.7s linear infinite', color: 'var(--accent-violet)' }} />
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isEdit ? 'Edit Product' : 'Add Product'}</h1>
          <p>{isEdit ? 'Update product information' : 'Add a new product to your catalogue'}</p>
        </div>
        <div className="page-header-actions">
          <Link to="/products" className="btn btn-secondary btn-sm">
            <ArrowLeft size={15} /> Back
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Basic Info */}
          <div className="card">
            <h4 style={{ marginBottom: 20, fontSize: '1rem' }}>Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="prod-name">Product Name *</label>
                <input id="prod-name" type="text" className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="e.g. Wireless Mouse Pro" value={form.name} onChange={set('name')} />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="prod-sku">SKU *</label>
                <input id="prod-sku" type="text" className={`form-input ${errors.sku ? 'error' : ''}`}
                  placeholder="e.g. WMP-001" value={form.sku} onChange={set('sku')}
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }} />
                {errors.sku && <span className="form-error">{errors.sku}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="prod-cat">Category *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select id="prod-cat" className={`form-select ${errors.category ? 'error' : ''}`}
                    value={form.category} onChange={set('category')} style={{ flex: 1 }}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <button type="button" className="btn btn-secondary btn-icon" title="Add category"
                    onClick={() => setShowAddCat(s => !s)}>
                    <Plus size={16} />
                  </button>
                </div>
                {errors.category && <span className="form-error">{errors.category}</span>}
                {showAddCat && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      className="form-input"
                      placeholder="New category name"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                      style={{ flex: 1, height: 40 }}
                    />
                    <button
                      type="button"
                      className={`btn btn-primary btn-sm ${addingCat ? 'btn-loading' : ''}`}
                      disabled={addingCat}
                      onClick={handleAddCategory}
                    >
                      {!addingCat && 'Add'}
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" htmlFor="prod-desc">Description</label>
                <textarea id="prod-desc" className="form-textarea"
                  placeholder="Optional product description"
                  value={form.description} onChange={set('description')} rows={3} />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="card">
            <h4 style={{ marginBottom: 20, fontSize: '1rem' }}>Pricing</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="prod-cost">Cost Price (₹) *</label>
                <input id="prod-cost" type="number" min="0" step="0.01"
                  className={`form-input ${errors.costPrice ? 'error' : ''}`}
                  placeholder="0.00" value={form.costPrice} onChange={set('costPrice')} />
                {errors.costPrice && <span className="form-error">{errors.costPrice}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="prod-price">Selling Price (₹) *</label>
                <input id="prod-price" type="number" min="0" step="0.01"
                  className={`form-input ${errors.sellingPrice ? 'error' : ''}`}
                  placeholder="0.00" value={form.sellingPrice} onChange={set('sellingPrice')} />
                {errors.sellingPrice && <span className="form-error">{errors.sellingPrice}</span>}
              </div>
              {form.costPrice && form.sellingPrice && Number(form.sellingPrice) > Number(form.costPrice) && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span className="badge badge-success">
                    Margin: ₹{(Number(form.sellingPrice) - Number(form.costPrice)).toFixed(2)}
                    ({(((Number(form.sellingPrice) - Number(form.costPrice)) / Number(form.sellingPrice)) * 100).toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Inventory */}
          <div className="card">
            <h4 style={{ marginBottom: 20, fontSize: '1rem' }}>Inventory</h4>
            <div className="grid grid-cols-2 gap-4">
              {!isEdit && (
                <div className="form-group">
                  <label className="form-label" htmlFor="prod-stock">Initial Stock *</label>
                  <input id="prod-stock" type="number" min="0" step="1"
                    className={`form-input ${errors.stock ? 'error' : ''}`}
                    placeholder="0" value={form.stock} onChange={set('stock')} />
                  {errors.stock && <span className="form-error">{errors.stock}</span>}
                  {isEdit && <span className="form-hint">Use Inventory page to adjust stock</span>}
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="prod-reorder">Reorder Threshold</label>
                <input id="prod-reorder" type="number" min="0" step="1"
                  className={`form-input ${errors.reorderThreshold ? 'error' : ''}`}
                  placeholder="10" value={form.reorderThreshold} onChange={set('reorderThreshold')} />
                {errors.reorderThreshold && <span className="form-error">{errors.reorderThreshold}</span>}
                <span className="form-hint">Alert when stock falls at or below this level</span>
              </div>
            </div>
            {isEdit && (
              <div className="alert alert-info" style={{ marginTop: 12 }}>
                <span>To adjust stock for this product, use the <Link to="/inventory" style={{ color: 'inherit', textDecoration: 'underline' }}>Inventory</Link> page.</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Link to="/products" className="btn btn-secondary">Cancel</Link>
            <button
              type="submit"
              id="save-product-btn"
              className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
              disabled={saving}
            >
              {!saving && <><Save size={16} /> {isEdit ? 'Save Changes' : 'Create Product'}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

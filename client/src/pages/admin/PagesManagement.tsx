import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './PagesManagement.css';

interface Page {
  id: number;
  titulo: string;
  slug: string;
  contenido: string;
  orden: number;
  activo: boolean;
}

const PagesManagement: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    slug: '',
    contenido: '',
    orden: 0,
    activo: true
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await api.get('/api/paginas');
      setPages(response.data);
    } catch (error) {
      console.error('Error al cargar páginas:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      if (editingPage) {
        await api.put(`/api/paginas/${editingPage.id}`, formData);
        setSuccess('Página actualizada exitosamente');
      } else {
        await api.post('/api/paginas', formData);
        setSuccess('Página creada exitosamente');
      }

      fetchPages();
      resetForm();
      setShowModal(false);
    } catch (error: any) {
      console.error('Error al guardar página:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.status === 401) {
        setError('No autorizado: sesión expirada');
      } else if (error.response?.status === 403) {
        setError('No tienes permisos para realizar esta acción');
      } else {
        setError('Error al guardar la página. Por favor, intenta nuevamente.');
      }
    }
  };

  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setFormData({
      titulo: page.titulo,
      slug: page.slug,
      contenido: page.contenido,
      orden: page.orden,
      activo: page.activo
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta página?')) {
      setError(null);
      setSuccess(null);
      try {
        await api.delete(`/api/paginas/${id}`);
        setSuccess('Página eliminada exitosamente');
        fetchPages();
      } catch (error: any) {
        console.error('Error al eliminar página:', error);
        if (error.response?.data?.error) {
          setError(error.response.data.error);
        } else if (error.response?.status === 401) {
          setError('No autorizado: sesión expirada');
        } else if (error.response?.status === 403) {
          setError('No tienes permisos para realizar esta acción');
        } else {
          setError('Error al eliminar la página. Por favor, intenta nuevamente.');
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      slug: '',
      contenido: '',
      orden: pages.length,
      activo: true
    });
    setEditingPage(null);
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="pages-management">
      <div className="page-header">
        <h1 className="page-title">Páginas</h1>
        <button className="btn btn-primary" onClick={openModal}>
          Agregar Página
        </button>
      </div>

      {/* Mensajes de error y éxito */}
      {error && (
        <div className="alert alert-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          {success}
        </div>
      )}

      <div className="pages-table">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Slug</th>
              <th>Orden</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pages
              .sort((a, b) => a.orden - b.orden)
              .map((page) => (
              <tr key={page.id}>
                <td>
                  <div className="page-title-cell">{page.titulo}</div>
                </td>
                <td>
                  <span className="page-slug">/{page.slug}</span>
                </td>
                <td>{page.orden}</td>
                <td>
                  <span className={`status ${page.activo ? 'active' : 'inactive'}`}>
                    {page.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button className="btn btn-secondary btn-small" onClick={() => handleEdit(page)}>
                      Editar
                    </button>
                    <button className="btn btn-outline btn-small" onClick={() => handleDelete(page.id)}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPage ? 'Editar Página' : 'Agregar Página'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.titulo}
                    onChange={(e) => {
                      const titulo = e.target.value;
                      setFormData({
                        ...formData,
                        titulo,
                        slug: editingPage ? formData.slug : generateSlug(titulo)
                      });
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Slug *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value.replace(/[^a-z0-9-]/g, '')})}
                    required
                    pattern="^[a-z0-9-]+$"
                    title="Solo letras minúsculas, números y guiones"
                  />
                  <small className="form-help">
                    El slug se usa en las URLs. Solo letras minúsculas, números y guiones.
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Orden</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.orden}
                  onChange={(e) => setFormData({...formData, orden: parseInt(e.target.value) || 0})}
                  min="0"
                />
                <small className="form-help">
                  Orden en que aparecerá en el menú. Menor número = aparece primero.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Contenido HTML</label>
                <textarea
                  className="form-input form-textarea html-editor"
                  value={formData.contenido}
                  onChange={(e) => setFormData({...formData, contenido: e.target.value})}
                  rows={15}
                  placeholder="<h2>Título</h2><p>Contenido de la página...</p>"
                />
                <small className="form-help">
                  Puedes usar HTML para formatear el contenido. El contenido se mostrará tal como lo escribas.
                </small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                  />
                  Página activa
                </label>
                <small className="form-help">
                  Las páginas inactivas no se mostrarán en el menú ni serán accesibles.
                </small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPage ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PagesManagement;

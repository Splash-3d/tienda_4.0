import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './PageDetail.css';

interface Page {
  id: number;
  titulo: string;
  slug: string;
  contenido: string;
  orden: number;
}

const PageDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPage(slug);
    }
  }, [slug]);

  const fetchPage = async (pageSlug: string) => {
    try {
      const response = await fetch(`/api/paginas/${pageSlug}`);
      const data = await response.json();
      setPage(data);
    } catch (error) {
      console.error('Error al cargar página:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="page-detail">
        <div className="container">
          <div className="page-not-found">
            <h2>Página no encontrada</h2>
            <p>La página que buscas no existe o ha sido eliminada.</p>
            <Link to="/" className="btn btn-primary">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-detail">
      <div className="container">
        {/* Breadcrumb and Title - Hide for sobre-nosotros */}
        {page.slug !== "sobre-nosotros" && (
          <>
            <nav className="breadcrumb">
              <Link to="/">Inicio</Link>
              <span className="separator">/</span>
              <span className="current">{page.titulo}</span>
            </nav>

            <h1 className="page-title">{page.titulo}</h1>
          </>
        )}

        {/* Page Content */}
        <div className="page-content">
          <div
            style={{ all: "unset" }}
            dangerouslySetInnerHTML={{ __html: page.contenido }}
          />
        </div>

        {/* Back to home */}
        <div className="page-actions">
          <Link to="/" className="btn btn-outline">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PageDetail;

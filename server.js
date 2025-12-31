const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_secreto';

// Middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
}));
app.use(cors({
  origin: NODE_ENV === 'production' ? true : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: NODE_ENV === 'production' ? 200 : 1000, // más límite en desarrollo
    message: { error: 'Demasiadas peticiones, intenta más tarde' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Solo se permiten imágenes'), false);
        }
        cb(null, true);
    }
});

// Middleware de autenticación
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

// Rutas de autenticación
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Error del servidor' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    });
});

// Rutas de productos
app.get('/api/productos', (req, res) => {
    const query = `
        SELECT p.*, 
               GROUP_CONCAT(c.nombre) as categorias,
               GROUP_CONCAT(c.slug) as categoria_slugs
        FROM productos p
        LEFT JOIN productos_categorias pc ON p.id = pc.producto_id
        LEFT JOIN categorias c ON pc.categoria_id = c.id
        WHERE p.activo = 1
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error del servidor' });
        }

        const productos = rows.map(row => ({
            ...row,
            categorias: row.categorias ? row.categorias.split(',') : [],
            categoria_slugs: row.categoria_slugs ? row.categoria_slugs.split(',') : []
        }));

        res.json(productos);
    });
});

app.get('/api/productos/:id', (req, res) => {
    const query = `
        SELECT p.*, 
               GROUP_CONCAT(c.nombre) as categorias,
               GROUP_CONCAT(c.slug) as categoria_slugs
        FROM productos p
        LEFT JOIN productos_categorias pc ON p.id = pc.producto_id
        LEFT JOIN categorias c ON pc.categoria_id = c.id
        WHERE p.id = ? AND p.activo = 1
        GROUP BY p.id
    `;

    db.get(query, [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Error del servidor' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const producto = {
            ...row,
            categorias: row.categorias ? row.categorias.split(',') : [],
            categoria_slugs: row.categoria_slugs ? row.categoria_slugs.split(',') : []
        };

        res.json(producto);
    });
});

app.post('/api/productos', authenticateToken, upload.single('imagen'), (req, res) => {
    const { nombre, descripcion_corta, descripcion_larga, precio, categorias, activo } = req.body;

    if (!nombre || !precio) {
        return res.status(400).json({ error: 'Nombre y precio requeridos' });
    }

    const imagen = req.file ? req.file.filename : null;

    db.run(
        'INSERT INTO productos (nombre, descripcion_corta, descripcion_larga, precio, imagen, activo) VALUES (?, ?, ?, ?, ?, ?)',
        [nombre, descripcion_corta, descripcion_larga, precio, imagen, activo ? 1 : 0],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Error al crear producto' });
            }

            const productoId = this.lastID;

            // Asociar categorías si se proporcionaron
            if (categorias) {
                const categoriaArray = Array.isArray(categorias) ? categorias : [categorias];
                categoriaArray.forEach(categoriaId => {
                    db.run('INSERT INTO productos_categorias (producto_id, categoria_id) VALUES (?, ?)',
                        [productoId, categoriaId]);
                });
            }

            res.json({ id: productoId, message: 'Producto creado exitosamente' });
        }
    );
});

app.put('/api/productos/:id', authenticateToken, upload.single('imagen'), (req, res) => {
    const { nombre, descripcion_corta, descripcion_larga, precio, categorias, activo } = req.body;

    if (!nombre || !precio) {
        return res.status(400).json({ error: 'Nombre y precio requeridos' });
    }

    const imagen = req.file ? req.file.filename : req.body.imagen_actual;

    db.run(
        'UPDATE productos SET nombre = ?, descripcion_corta = ?, descripcion_larga = ?, precio = ?, imagen = ?, activo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nombre, descripcion_corta, descripcion_larga, precio, imagen, activo ? 1 : 0, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Error al actualizar producto' });
            }

            // Actualizar categorías
            db.run('DELETE FROM productos_categorias WHERE producto_id = ?', [req.params.id], () => {
                if (categorias) {
                    const categoriaArray = Array.isArray(categorias) ? categorias : [categorias];
                    categoriaArray.forEach(categoriaId => {
                        db.run('INSERT INTO productos_categorias (producto_id, categoria_id) VALUES (?, ?)',
                            [req.params.id, categoriaId]);
                    });
                }
            });

            res.json({ message: 'Producto actualizado exitosamente' });
        }
    );
});

app.delete('/api/productos/:id', authenticateToken, (req, res) => {
    db.run('UPDATE productos SET activo = 0 WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al eliminar producto' });
        }

        res.json({ message: 'Producto eliminado exitosamente' });
    });
});

// Rutas de categorías
app.get('/api/categorias', (req, res) => {
    db.all('SELECT * FROM categorias ORDER BY nombre', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error del servidor' });
        }
        res.json(rows);
    });
});

app.post('/api/categorias', authenticateToken, (req, res) => {
    const { nombre, slug } = req.body;

    if (!nombre || !slug) {
        return res.status(400).json({ error: 'Nombre y slug requeridos' });
    }

    db.run('INSERT INTO categorias (nombre, slug) VALUES (?, ?)', [nombre, slug], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al crear categoría' });
        }

        res.json({ id: this.lastID, message: 'Categoría creada exitosamente' });
    });
});

app.put('/api/categorias/:id', authenticateToken, (req, res) => {
    const { nombre, slug } = req.body;

    if (!nombre || !slug) {
        return res.status(400).json({ error: 'Nombre y slug requeridos' });
    }

    db.run('UPDATE categorias SET nombre = ?, slug = ? WHERE id = ?', [nombre, slug, req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al actualizar categoría' });
        }

        res.json({ message: 'Categoría actualizada exitosamente' });
    });
});

app.delete('/api/categorias/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM categorias WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al eliminar categoría' });
        }

        res.json({ message: 'Categoría eliminada exitosamente' });
    });
});

// Rutas de páginas personalizables
app.get('/api/paginas', (req, res) => {
    db.all('SELECT * FROM paginas WHERE activo = 1 ORDER BY orden', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error del servidor' });
        }
        res.json(rows);
    });
});

app.get('/api/paginas/:slug', (req, res) => {
    db.get('SELECT * FROM paginas WHERE slug = ? AND activo = 1', [req.params.slug], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Error del servidor' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Página no encontrada' });
        }

        res.json(row);
    });
});

app.post('/api/paginas', authenticateToken, (req, res) => {
    const { titulo, slug, contenido, orden } = req.body;

    if (!titulo || !slug) {
        return res.status(400).json({ error: 'Título y slug requeridos' });
    }

    db.run('INSERT INTO paginas (titulo, slug, contenido, orden) VALUES (?, ?, ?, ?)', 
        [titulo, slug, contenido, orden || 0], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al crear página' });
        }

        res.json({ id: this.lastID, message: 'Página creada exitosamente' });
    });
});

app.put('/api/paginas/:id', authenticateToken, (req, res) => {
    const { titulo, slug, contenido, orden, activo } = req.body;

    if (!titulo || !slug) {
        return res.status(400).json({ error: 'Título y slug requeridos' });
    }

    db.run('UPDATE paginas SET titulo = ?, slug = ?, contenido = ?, orden = ?, activo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        [titulo, slug, contenido, orden || 0, activo ? 1 : 0, req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al actualizar página' });
        }

        res.json({ message: 'Página actualizada exitosamente' });
    });
});

app.delete('/api/paginas/:id', authenticateToken, (req, res) => {
    db.run('UPDATE paginas SET activo = 0 WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al eliminar página' });
        }

        res.json({ message: 'Página eliminada exitosamente' });
    });
});

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'client/build')));

// Para cualquier otra ruta, servir el index.html de React
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Crear directorio de uploads si no existe
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: NODE_ENV
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Panel admin: https://tu-app.railway.app/admin`);
    console.log(`Usuario: admin@tienda.com`);
    console.log(`Contraseña: admin123`);
});

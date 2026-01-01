const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Tabla usuarios
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla categorías
    db.run(`CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla productos
    db.run(`CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion_corta TEXT,
        descripcion_larga TEXT,
        precio REAL NOT NULL,
        imagen TEXT,
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla productos_categorias (relación muchos a muchos)
    db.run(`CREATE TABLE IF NOT EXISTS productos_categorias (
        producto_id INTEGER,
        categoria_id INTEGER,
        PRIMARY KEY (producto_id, categoria_id),
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
    )`);

    // Tabla páginas personalizables
    db.run(`CREATE TABLE IF NOT EXISTS paginas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        contenido TEXT,
        orden INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Crear usuario admin por defecto si no existe
    const adminEmail = 'lighting2385@gmail.com';
    const adminPassword = 'Pitimirri2385';
    
    db.get('SELECT id FROM usuarios WHERE email = ?', [adminEmail], (err, row) => {
        if (!row) {
            const hashedPassword = bcrypt.hashSync(adminPassword, 10);
            db.run('INSERT INTO usuarios (email, password) VALUES (?, ?)', 
                [adminEmail, hashedPassword], 
                function(err) {
                    if (!err) {
                        console.log('Usuario admin creado: lighting2385@gmail.com / Pitimirri2385');
                    }
                }
            );
        }
    });

    // Insertar categorías de ejemplo si no existen
    const categoriasEjemplo = [
        { nombre: 'Electrónica', slug: 'electronica' },
        { nombre: 'Ropa', slug: 'ropa' },
        { nombre: 'Accesorios', slug: 'accesorios' }
    ];

    categoriasEjemplo.forEach(categoria => {
        db.get('SELECT id FROM categorias WHERE slug = ?', [categoria.slug], (err, row) => {
            if (!row) {
                db.run('INSERT INTO categorias (nombre, slug) VALUES (?, ?)', 
                    [categoria.nombre, categoria.slug]);
            }
        });
    });

    // Insertar páginas de ejemplo si no existen
    const paginasEjemplo = [
        { titulo: 'Sobre Nosotros', slug: 'sobre-nosotros', contenido: '<h2>Sobre nuestra tienda</h2><p>Somos una tienda dedicada a ofrecer los mejores productos...</p>', orden: 1 },
        { titulo: 'Envíos y Devoluciones', slug: 'envios-devoluciones', contenido: '<h2>Política de envíos</h2><p>Ofrecemos envíos a todo el país...</p>', orden: 2 },
        { titulo: 'FAQ', slug: 'faq', contenido: '<h2>Preguntas Frecuentes</h2><p>¿Tienes dudas? Aquí las respondemos...</p>', orden: 3 }
    ];

    paginasEjemplo.forEach(pagina => {
        db.get('SELECT id FROM paginas WHERE slug = ?', [pagina.slug], (err, row) => {
            if (!row) {
                db.run('INSERT INTO paginas (titulo, slug, contenido, orden) VALUES (?, ?, ?, ?)', 
                    [pagina.titulo, pagina.slug, pagina.contenido, pagina.orden]);
            }
        });
    });
}

module.exports = db;
